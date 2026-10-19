"use client";

import * as React from 'react';
import { Input } from "@/components/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldError } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/store"
import { setGamePlayer } from "@/store/slices/gameplayerSlice"
import TermsModal from "@/components/terms-modal";
import { playVoiceAudio } from "@/lib/gameEffects";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import Swal from "sweetalert2";

type FormMessageProps = {
  error?: FieldError;
};

const FormMessage: React.FC<FormMessageProps> = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-red-500 mt-0.5 text-[11px] font-semibold text-left">
      {error.message}
    </p>
  );
};

const FormSchema = z
  .object({
    username: z.string().min(3, {
      message: "El usuario debe tener al menos 3 caracteres",
    }),
    phone: z
      .string({
        required_error: "Se requiere un número de WhatsApp",
      })
      .min(10, {
        message: "Ingresa tu número de WhatsApp (11 dígitos, ej: 04121234567)",
      })
      .max(12, { message: "Número de teléfono inválido" }),
    email: z
      .string({
        required_error: "Se requiere un correo",
      })
      .email({
        message: "El correo no es válido",
      }),
    password: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres",
    }),
    password_confirmation: z.string().min(6, {
      message: "Confirma la contraseña",
    }),
    terms: z.boolean().refine((val) => val === true, {
      message: "Debes declarar ser mayor de 18 años y aceptar los Términos",
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmation"],
  });

export default function SignUp() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [termsModalOpen, setTermsModalOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("promo") || params.get("codigo") || params.get("ref");
      if (p) {
        setPromoCode(p.trim().toUpperCase());
      }
    }
  }, []);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      phone: "",
      email: "",
      password: "",
      password_confirmation: "",
      terms: false,
    },
  });

  const { setError, handleSubmit, formState } = form;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setServerError(null);
    setLoading(true);
    try {
      // 1. Obtener la huella digital física del dispositivo
      const deviceFingerprint = await getDeviceFingerprint();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username.trim(),
          email: data.email.trim(),
          phoneNumber: data.phone.trim(),
          deviceFingerprint: deviceFingerprint,
          password: data.password,
          promoCode: promoCode || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.message || "Error al registrar la cuenta.");
      } else {
        dispatch(
          setGamePlayer({
            id: result.id?.toString(),
            name: result.username,
            email: result.email,
            coins: result.coins,
            wins: 0,
            losses: 0,
            level: result.level || "Peón de Casona",
            avatarUrl: result.avatarUrl || "",
            active: true,
          })
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("pericon_user", JSON.stringify(result));
        }

        if (result.coins === 0 || result.isDeviceAlreadyUsed) {
          await Swal.fire({
            title: '¡CUENTA CREADA CON ÉXITO!',
            html: `
              <div style="text-align: center; font-size: 14px; padding: 4px 0;">
                <p style="color: #cbd5e1; margin-bottom: 8px;">
                  Bienvenido, <strong>${result.username}</strong>. Tu cuenta ha sido registrada correctamente.
                </p>
                <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 12px; color: #fde68a; font-size: 13px; text-align: left; line-height: 1.4;">
                  📱 <strong>Dispositivo compartido detectado:</strong><br>
                  Para garantizar el juego limpio y prevenir multi-cuentas de bonos, tu cuenta inicia con <strong>0 monedas</strong>.
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
                  ¡Puedes jugar el <strong>Modo Demo</strong> gratis, recibir transferencias de monedas o recargar en el cajero para entrar a las mesas de juego!
                </p>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido, ir al Lobby',
            confirmButtonColor: '#f59e0b',
            background: '#15091e',
            color: '#fff',
            customClass: {
              popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl'
            }
          });
        }

        router.push("/desk");
      }
    } catch (error) {
      console.error("An error occurred:", error);
      setServerError("No se pudo conectar con el servidor de Pericón.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <React.Fragment>
      <div className="flex flex-col items-center">
        <Link href="/">
          <Image
            src="./logo.svg"
            width={301}
            height={76}
            alt="Logo"
            className="mt-2 w-[301px] h-[76px] xl:mt-8"
          />
        </Link>

        <div className="flex flex-col justify-center h-full mb-2">
          <div className="flex justify-center mt-3 bg-black/75 backdrop-blur-md border border-amber-500/40 rounded-3xl p-6 shadow-2xl shadow-black/80 w-full max-w-[380px] mx-auto">

            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 w-full">
                {promoCode && (
                  <div className="p-3 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border border-amber-400 rounded-2xl flex items-center gap-2.5 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    <span className="text-2xl animate-bounce">🎁</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">¡CUPÓN DEL FLYER!</span>
                        <span className="bg-amber-400 text-neutral-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">{promoCode}</span>
                      </div>
                      <p className="text-[10px] text-amber-100 font-medium leading-tight mt-0.5">
                        Recibirás tus 300 monedas + <strong className="text-amber-300">+100 MONEDAS DE REGALO</strong> al completar tu registro.
                      </p>
                    </div>
                  </div>
                )}
                {serverError && (
                  <div className="bg-red-950/80 border border-red-500 text-red-200 text-xs px-3 py-2 rounded-lg text-center font-bold">
                    {serverError}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Nombre de usuario" type="text" {...field} />
                      </FormControl>
                      <FormMessage error={formState.errors.username} />
                    </FormItem>
                  )}
                />
                {/* Correo Electrónico */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Correo electrónico personal" type="email" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage error={formState.errors.email} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="WhatsApp / Teléfono (ej: 04121234567)"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage error={formState.errors.phone} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Contraseña (mínimo 6 caracteres)" type="password" password={true}  {...field} />
                      </FormControl>
                      <FormMessage error={formState.errors.password} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Confirmar contraseña" type="password" password={true}  {...field} />
                      </FormControl>
                      <FormMessage error={formState.errors.password_confirmation} />
                    </FormItem>
                  )}
                />

                {/* Casilla de Aceptación de Términos y Condiciones */}
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="flex items-start gap-2.5 text-left bg-black/40 border border-slate-700/60 p-2.5 rounded-xl">
                        <input
                          type="checkbox"
                          id="terms-checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-0.5 w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-400 bg-slate-900 accent-amber-500 cursor-pointer flex-shrink-0"
                        />
                        <label htmlFor="terms-checkbox" className="text-xs text-slate-300 leading-snug cursor-pointer select-none">
                          <strong className="text-red-400 font-bold">Declaro ser mayor de 18 años</strong>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              playVoiceAudio('mas_18');
                            }}
                            className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded-full transition active:scale-95 shadow"
                            title="Escuchar advertencia oficial de El Chivo (+18)"
                          >
                            <span>🔊</span>
                            <span>Escuchar aviso (+18)</span>
                          </button>{" "}
                          y acepto los{" "}
                          <button
                            type="button"
                            onClick={() => setTermsModalOpen(true)}
                            className="text-amber-400 font-bold underline hover:text-amber-300 transition-colors inline"
                          >
                            Términos y Condiciones
                          </button>
                          , el uso de IA y el reglamento del sistema.
                        </label>
                      </div>
                      <FormMessage error={formState.errors.terms} />
                    </FormItem>
                  )}
                />

                <div className="flex justify-center pt-2">
                  <Button type="submit"
                    disabled={loading}
                    className="w-full bg-black/90 hover:bg-black text-amber-400 hover:text-amber-300 font-black shadow-2xl shadow-black/90 border-2 border-amber-400 rounded-2xl py-3.5 text-base tracking-wider disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all"
                  >{loading ? "REGISTRANDO..." : "REGISTRAR"}</Button>
                </div>
              </form>
            </Form>

          </div>

          {/* Modal de Términos y Condiciones */}
          <TermsModal
            isOpen={termsModalOpen}
            onClose={() => setTermsModalOpen(false)}
            onAccept={() => {
              form.setValue("terms", true, { shouldValidate: true });
            }}
          />

          <div className="text-white text-center mt-4 ml-[0px] text-[16px]">
            ¿Ya tienes una cuenta?
            <div>
              <Link href="/iniciar-sesion" className="text-white underline">Inicia sesión</Link>
            </div>
          </div>

        </div>

      </div>
    </React.Fragment>
  );
}
