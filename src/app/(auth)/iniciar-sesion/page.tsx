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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
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

          <div className="flex justify-center mt-4">

            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <div className="flex justify-center">
                  <Button type="submit"
                    disabled={loading}
                    className="xl:w-[230px] bg-gradient-to-tr rounded-xl from-yellow-950 to-yellow-700 pl-6 pr-6 text-white shadow-lg disabled:opacity-50"
                  >{loading ? "Ingresando..." : "Ingresar"}</Button>
                </div>
              </form>
            </Form>

          </div>
          <div className="mt-4 flex flex-col justify-center text-white text-center">
            <div>
              <Link href="/recuperar-clave" className="text-white underline" >
                ¿Olvidaste la contraseña?
              </Link>
            </div>

            <div className="mt-4 ml-[-11px]">¿No tienes una cuenta? <Link href="/registro" className="text-white underline">Regístrate</Link></div>
          </div>

          <div className="flex justify-center py-2">
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
