"use client";

import * as React from 'react';
import { Input } from "@/components/input";
import { Button } from "@/components/ui/button";
import GoogleButton from "@/components/google"
import FacebookButton from '@/components/facebook';
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

type FormMessageProps = {
  error?: FieldError;
};

const FormMessage: React.FC<FormMessageProps> = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-red-600 mt-0 text-xs">
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.message || "Error al registrar la cuenta.");
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
          <div className="flex justify-center mt-4">

            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                  <div className="bg-red-950/80 border border-red-500 text-red-200 text-xs px-3 py-2 rounded-lg text-center">
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
                          He leído y acepto los{" "}
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

                <div className="flex justify-center">
                  <Button type="submit"
                    disabled={loading}
                    className="xl:w-[230px] bg-gradient-to-tr rounded-xl from-yellow-950 to-yellow-700 pl-6 pr-6 text-white shadow-lg disabled:opacity-50 font-bold"
                  >{loading ? "Registrando..." : "Registrar"}</Button>
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

          <div className="flex justify-center mt-6">
            <div className="mx-2">
              <GoogleButton />
            </div>

            <div className="mx-2">
              <FacebookButton />
            </div>
          </div>

        </div>

      </div>
    </React.Fragment>
  );
}
