"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/store";
import { setGamePlayer } from "@/store/slices/gameplayerSlice";
import Swal from "sweetalert2";
import { getDeviceFingerprint } from "@/lib/fingerprint";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleButtonProps {
  onLoading?: (isLoading: boolean) => void;
}

export default function GoogleButton({ onLoading }: GoogleButtonProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  );

  useEffect(() => {
    // 1. Cargar siempre el SDK oficial de Google Identity Services
    if (typeof window !== "undefined" && !window.google) {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }

    // 2. Si no vino en variables de compilación del frontend, consultar al backend si hay GOOGLE_CLIENT_ID configurado en Railway
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      fetch(`${apiUrl}/api/auth/google-config`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.clientId && typeof d.clientId === "string" && d.clientId.trim().length > 10) {
            setResolvedClientId(d.clientId.trim());
          }
        })
        .catch(() => {});
    }
  }, []);

  const sendGoogleAuth = async (payload: {
    credential?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    picture?: string;
  }) => {
    setLoading(true);
    if (onLoading) onLoading(true);
    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      const response = await fetch(`${apiUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          deviceFingerprint,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "Aviso de Autenticación",
          text: result.message || "No se pudo autenticar con Google.",
          confirmButtonColor: "#b45309",
        });
      } else {
        dispatch(
          setGamePlayer({
            id: result.id?.toString(),
            name: result.username,
            email: result.email,
            coins: result.coins,
            wins: result.wins ?? 0,
            losses: result.losses ?? 0,
            level: result.level || "Novato",
            avatarUrl: result.avatarUrl || "",
            active: true,
          })
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("pericon_user", JSON.stringify(result));
        }
        router.push("/desk");
      }
    } catch (err) {
      console.error("Error al conectar con el servidor:", err);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor de Pericón.",
        confirmButtonColor: "#b45309",
      });
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    if (loading) return;

    const clientId = resolvedClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    // 1. Flujo Oficial OAuth2 Popup de Google (Selector de Cuentas Real de Google, no bloqueado por el navegador)
    if (clientId && window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          prompt: "select_account",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              await sendGoogleAuth({ accessToken: tokenResponse.access_token });
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (e) {
        console.warn("Fallo initTokenClient, intentando OneTap fallback:", e);
      }
    }

    // 2. Respaldo Google ID Token si oauth2 no estuviera listo pero accounts.id sí
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (response?.credential) {
            await sendGoogleAuth({ credential: response.credential });
          }
        },
      });
      window.google.accounts.id.prompt();
      return;
    }

    // 3. Si aún no se ha configurado GOOGLE_CLIENT_ID en el servidor: registro rápido de cuenta nueva (protegido contra cuentas existentes)
    const { value: formValues } = await Swal.fire({
      title: "Registro Rápido con Gmail",
      html: `
        <div style="text-align: left; font-size: 13px; color: #555; margin-bottom: 12px;">
          Ingresa tu nombre y correo para crear una cuenta nueva (si ya tienes cuenta registrada, inicia sesión con tu contraseña):
        </div>
        <input id="swal-google-name" class="swal2-input" placeholder="Nombre o Apodo" style="margin-top: 5px; font-size: 14px;" />
        <input id="swal-google-email" type="email" class="swal2-input" placeholder="tucorreo@gmail.com" style="margin-top: 5px; font-size: 14px;" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Crear Cuenta",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#b45309",
      preConfirm: () => {
        const nameInput = document.getElementById("swal-google-name") as HTMLInputElement;
        const emailInput = document.getElementById("swal-google-email") as HTMLInputElement;
        const name = nameInput?.value?.trim();
        const email = emailInput?.value?.trim();

        if (!email || !email.includes("@")) {
          Swal.showValidationMessage("Ingresa un correo electrónico válido");
          return false;
        }
        return { name: name || email.split("@")[0], email };
      },
    });

    if (formValues) {
      await sendGoogleAuth(formValues);
    }
  };

  return (
    <div
      onClick={handleGoogleClick}
      title="Registrarse / Iniciar sesión con Google"
      className="hover:cursor-pointer transition duration-300 p-2 rounded-full hover:bg-white/10 flex items-center justify-center"
    >
      <Image
        src="/google.svg"
        alt="Google"
        width={40}
        height={40}
        className={`transition duration-300 ${loading ? "opacity-40 animate-pulse" : "brightness-90 hover:brightness-100 scale-100 hover:scale-110"}`}
      />
    </div>
  );
}
