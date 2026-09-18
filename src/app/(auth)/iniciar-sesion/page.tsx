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

const FormSchema = z.object({
  email: z.string().min(1, {
    message: "Se requiere un correo o nombre de usuario",
  }),
  password: z.string().min(1, {
    message: "Se requiere una contraseña",
  }),
});

export default function SignIn() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { setError, handleSubmit, formState } = form;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setServerError(null);
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.message || "Error al iniciar sesión. Verifica tus credenciales.");
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
          <div>
            <Image
              src="/carora.svg"
              width={230}
              height={230}
              alt=""
              className="w-[230px] h-[230px]"
            />
          </div>

          <div className="flex justify-center mt-3 bg-black/75 backdrop-blur-md border border-amber-500/40 rounded-3xl p-6 shadow-2xl shadow-black/80 w-full max-w-[340px] mx-auto">

            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                {serverError && (
                  <div className="bg-red-950/80 border border-red-500 text-red-200 text-xs px-3 py-2 rounded-lg text-center">
                    {serverError}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Correo o usuario" autoComplete="off" {...field} />
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
                        <Input placeholder="Contraseña" type="password" password={true} className="mt-[-10px]" {...field} />
                      </FormControl>
                      <FormMessage error={formState.errors.password} />
                    </FormItem>
                  )}
                />
                <div className="flex justify-center pt-2">
                  <Button type="submit"
                    disabled={loading}
                    className="w-full bg-black/90 hover:bg-black text-amber-400 hover:text-amber-300 font-black shadow-2xl shadow-black/90 border-2 border-amber-400 rounded-2xl py-3.5 text-base tracking-wider disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all"
                  >{loading ? "INGRESANDO..." : "INGRESAR"}</Button>
                </div>
              </form>
            </Form>

          </div>
          <div className="mt-3 flex flex-col justify-center text-white text-center">
            <div>
              <Link href="/recuperar-clave" className="text-amber-200/80 hover:text-white text-xs underline" >
                ¿Olvidaste la contraseña?
              </Link>
            </div>

            <div className="mt-2 text-xs text-slate-300">¿No tienes una cuenta? <Link href="/registro" className="text-amber-400 font-bold underline hover:text-amber-300">Regístrate</Link></div>
          </div>

        </div>

      </div>
    </React.Fragment>
  );
}
