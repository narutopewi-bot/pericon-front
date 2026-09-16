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
import { KeyRound, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";

type FormMessageProps = {
  error?: FieldError;
};

const FormMessage: React.FC<FormMessageProps> = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-red-500 mt-1 text-xs font-semibold">
      {error.message}
    </p>
  );
};

const FormSchema = z.object({
  identifier: z.string().min(3, {
    message: "Ingresa tu usuario o correo electrónico",
  }),
  phoneNumber: z.string().min(10, {
    message: "Ingresa tu WhatsApp registrado (mínimo 10 dígitos)",
  }),
  newPassword: z.string().min(6, {
    message: "La nueva contraseña debe tener al menos 6 caracteres",
  }),
  confirmPassword: z.string().min(6, {
    message: "Confirma tu nueva contraseña",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function RecuperarClave() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      identifier: "",
      phoneNumber: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit, formState } = form;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setServerError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: data.identifier,
          phoneNumber: data.phoneNumber,
          newPassword: data.newPassword,
        }),
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(resData?.message || "No se pudo restablecer la contraseña. Verifica tus datos.");
        setLoading(false);
        return;
      }

      setSuccessMessage(resData?.message || "¡Contraseña restablecida exitosamente!");
      form.reset();
      setLoading(false);

      setTimeout(() => {
        router.push("/iniciar-sesion");
      }, 3500);

    } catch (err: any) {
      setServerError("Error de conexión al servidor. Inténtalo nuevamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#140a04] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#25150a] via-[#1a0e07] to-[#100804] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-900/40 text-center relative overflow-hidden">
        
        {/* Adorno visual */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image src="/brand.svg" width={160} height={45} alt="El Pericón" priority className="h-9 w-auto" />
        </div>

        {/* Encabezado */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black shadow-lg">
            <KeyRound size={20} className="stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide">
            Recuperar Contraseña
          </h1>
        </div>

        <p className="text-xs text-amber-200/80 mb-6">
          Verifica tu cuenta con tu WhatsApp registrado para asignar una nueva clave.
        </p>

        {/* Mensaje de Éxito */}
        {successMessage ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl space-y-3 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-emerald-300 font-extrabold text-sm">
              ¡Contraseña Actualizada!
            </h3>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {successMessage}
            </p>
            <p className="text-[11px] text-slate-400">
              Redirigiendo a Iniciar Sesión en unos segundos...
            </p>
            <Link
              href="/iniciar-sesion"
              className="inline-block w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition active:scale-95"
            >
              Ir a Iniciar Sesión Ahora
            </Link>
          </div>
        ) : (
          /* Formulario */
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-left">
              
              {serverError && (
                <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs font-medium text-center">
                  ⚠️ {serverError}
                </div>
              )}

              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs text-amber-200/90 font-bold ml-1">Usuario o Correo Electrónico</label>
                    <FormControl>
                      <Input placeholder="Ej: pepito2026 o correo@gmail.com" {...field} />
                    </FormControl>
                    <FormMessage error={formState.errors.identifier} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs text-amber-200/90 font-bold ml-1">WhatsApp Registrado</label>
                    <FormControl>
                      <Input placeholder="Ej: 04121234567 o +58412..." {...field} />
                    </FormControl>
                    <FormMessage error={formState.errors.phoneNumber} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs text-amber-200/90 font-bold ml-1">Nueva Contraseña</label>
                    <FormControl>
                      <Input placeholder="Mínimo 6 caracteres" type="password" password={true} {...field} />
                    </FormControl>
                    <FormMessage error={formState.errors.newPassword} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs text-amber-200/90 font-bold ml-1">Confirmar Nueva Contraseña</label>
                    <FormControl>
                      <Input placeholder="Repite la nueva contraseña" type="password" password={true} {...field} />
                    </FormControl>
                    <FormMessage error={formState.errors.confirmPassword} />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black py-3.5 rounded-2xl text-sm tracking-wider shadow-lg shadow-amber-600/30 disabled:opacity-50 transition-all active:scale-95"
                >
                  {loading ? "VERIFICANDO..." : "CAMBIAR CONTRASEÑA"}
                </Button>
              </div>

            </form>
          </Form>
        )}

        {/* Separador y Opciones Secundarias */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-col items-center gap-3">
          
          <Link
            href="/iniciar-sesion"
            className="inline-flex items-center gap-1.5 text-xs text-amber-300/80 hover:text-white transition font-medium"
          >
            <ArrowLeft size={14} /> Volver a Iniciar Sesión
          </Link>

          {/* Ayuda de Soporte por WhatsApp con el Administrador */}
          <div className="w-full mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center">
            <p className="text-[11px] text-slate-300 mb-2">
              ¿No recuerdas tu correo o perdiste acceso a tu teléfono?
            </p>
            <a
              href="https://wa.me/584126749114?text=Hola%20Administrador,%20olvid%C3%A9%20mis%20datos%20de%20acceso%20a%20El%20Peric%C3%B3n%20y%20necesito%20asistencia%20para%20restablecer%20mi%20clave."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs transition"
            >
              <MessageCircle size={15} /> Contactar Soporte Administrador
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
