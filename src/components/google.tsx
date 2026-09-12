"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/store";
import { setGamePlayer } from "@/store/slices/gameplayerSlice";
import Swal from "sweetalert2";

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

  useEffect(() => {
    // Cargar SDK oficial de Google Identity Services si hay Client ID configurado
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const sendGoogleAuth = async (payload: { credential?: string; email?: string; name?: string; picture?: string }) => {
    setLoading(true);
    if (onLoading) onLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";
      const response = await fetch(`${apiUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "Error de autenticación",
          text: result.message || "No se pudo autenticar con Google.",
          confirmButtonColor: "#b45309",
        });
      } else {
        dispatch(
          setGamePlayer({
            id: result.id.toString(),
            name: result.username,
            email: result.email,
            coins: result.coins,
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

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Si ya existe un Google Client ID real configurado y el SDK está cargado
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

    // Modal de prueba rápido para desarrollo mientras se tramita el Google Client ID
    const { value: formValues } = await Swal.fire({
      title: "Registrarse con Google",
      html: `
        <div style="text-align: left; font-size: 13px; color: #666; margin-bottom: 12px;">
          Ingresa tus datos para registrarte o iniciar sesión con Google:
        </div>
        <input id="swal-google-name" class="swal2-input" placeholder="Nombre completo" style="margin-top: 5px; font-size: 14px;" />
        <input id="swal-google-email" type="email" class="swal2-input" placeholder="correo@gmail.com" style="margin-top: 5px; font-size: 14px;" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Continuar con Google",
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
