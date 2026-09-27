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

const VENEZUELAN_BANKS = [
  "0102 - Banco de Venezuela",
  "0105 - Banco Mercantil",
  "0108 - Banco Provincial (BBVA)",
  "0134 - Banesco",
  "0191 - Banco Nacional de Crédito (BNC)",
  "0172 - Bancamiga",
  "0114 - Bancaribe",
  "0115 - Banco Exterior",
  "0163 - Banco del Tesoro",
  "0175 - Banco Bicentenario",
  "0128 - Banco Caroní",
  "0151 - BFC Banco Fondo Común",
  "0174 - Banplus",
  "0177 - BANFANB",
  "0171 - Banco Activo",
  "0169 - Mi Banco",
  "0137 - Banco Sofitasa",
  "0138 - Banco Plaza",
  "0166 - Banco Agrícola de Venezuela"
];

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
    email: z
      .string({
        required_error: "Se requiere un correo",
      })
      .email({
        message: "El correo no es válido",
      }),
    phone: z
      .string({
        required_error: "Se requiere un número de WhatsApp / Pago Móvil",
      })
      .min(10, {
        message: "Ingresa tu número de Pago Móvil (11 dígitos, ej: 04121234567)",
      })
      .max(12, { message: "Número de teléfono inválido" }),
    cedulaType: z.enum(["V", "E"], {
      required_error: "Selecciona tipo de cédula",
    }),
    cedulaNumber: z
      .string()
      .min(6, { message: "La cédula debe tener al menos 6 dígitos" })
      .max(9, { message: "La cédula no debe exceder 9 dígitos" })
      .regex(/^\d+$/, { message: "Ingresa solo números sin puntos" }),
    bankName: z.string().min(2, {
      message: "Debes seleccionar tu banco para Pago Móvil",
    }),
    birthDate: z.string().min(1, { message: "La fecha de nacimiento es requerida" }).refine((val) => {
      if (!val) return false;
      const bDate = new Date(val);
      if (isNaN(bDate.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - bDate.getFullYear();
      const m = today.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
        age--;
      }
      return age >= 18;
    }, {
      message: "Debes tener al menos 18 años cumplidos para jugar",
    }),
    password: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres",
    }),
    password_confirmation: z.string().min(6, {
      message: "Confirma la contraseña",
    }),
    terms: z.boolean().refine((val) => val === true, {
      message: "Debes aceptar los Términos y Condiciones para registrarte",
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

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      cedulaType: "V",
      cedulaNumber: "",
      bankName: "",
      birthDate: "",
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
      const fullCedula = `${data.cedulaType}-${data.cedulaNumber.trim()}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          phoneNumber: data.phone,
          cedula: fullCedula,
          bankName: data.bankName,
          birthDate: data.birthDate,
          deviceFingerprint: deviceFingerprint,
          password: data.password,
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
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Correo electrónico" autoComplete="off" {...field} />
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
                          placeholder="Teléfono Pago Móvil / WhatsApp (ej: 04121234567)"
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

                {/* Fecha de Nacimiento (Mayor de 18 años) */}
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-[11px] font-bold text-amber-300 block text-left mb-0.5">
                        🎂 Fecha de Nacimiento (+18 obligatorio):
                      </label>
                      <FormControl>
                        <Input
                          type="date"
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                          className="bg-black/60 text-white border-amber-500/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage error={formState.errors.birthDate} />
                    </FormItem>
                  )}
                />

                {/* Cédula de Identidad */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-300 block text-left">
                    🪪 Cédula de Identidad (Para cobros y retiros):
                  </label>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="cedulaType"
                      render={({ field }) => (
                        <FormItem className="w-20">
                          <FormControl>
                            <select
                              {...field}
                              className="w-full h-10 px-2 rounded-xl bg-black/60 border border-amber-500/40 text-amber-200 text-xs font-bold focus:outline-none focus:border-amber-400"
                            >
                              <option value="V">V-</option>
                              <option value="E">E-</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cedulaNumber"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Número de cédula (ej. 26554121)"
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage error={formState.errors.cedulaNumber} />
                </div>

                {/* Banco de Pago Móvil */}
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-[11px] font-bold text-amber-300 block text-left mb-0.5">
                        🏦 Banco para Pago Móvil / Retiros:
                      </label>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 px-3 rounded-xl bg-black/60 border border-amber-500/40 text-amber-100 text-xs font-medium focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Selecciona tu Banco --</option>
                          {VENEZUELAN_BANKS.map((bank) => (
                            <option key={bank} value={bank} className="bg-slate-900 text-white">
                              {bank}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage error={formState.errors.bankName} />
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
