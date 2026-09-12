"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as fonts from "@/components/fonts";
import { Button } from "@/components/ui/button";
import GoogleButton from "@/components/google";
import { useAppDispatch, useAppSelector, RootState } from "@/store/store";
import { setGamePlayer, clearGamePlayer } from "@/store/slices/gameplayerSlice";

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const player = useAppSelector((state: RootState) => state.gameplayer);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pericon_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u && u.username) {
            dispatch(
              setGamePlayer({
                id: u.id?.toString() || "1",
                name: u.username,
                email: u.email || "",
                coins: u.coins ?? 100,
                active: true,
              })
            );
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [dispatch]);

  const isLoggedIn = mounted && !!player.name && player.name !== "nulo" && player.name !== "";

  const handleLogout = () => {
    dispatch(clearGamePlayer());
    if (typeof window !== "undefined") {
      localStorage.removeItem("pericon_user");
    }
  };

  const handleGuestPlay = () => {
    const guestName = `Invitado_${Math.floor(1000 + Math.random() * 9000)}`;
    dispatch(
      setGamePlayer({
        id: "guest_" + Date.now(),
        name: guestName,
        email: "invitado@pericon.com",
        coins: 50,
        active: true,
      })
    );
    router.push("/desk");
  };

  return (
    <React.Fragment>
      <div className="absolute inset-6 bg-diablo mix-blend-soft-light opacity-20 z-[-1]"></div>

      <div className="flex flex-col items-center justify-center pb-2 relative z-10">
        <Image
          src="/goat.svg"
          width={230}
          height={230}
          alt=""
          className="w-[200px] h-[200px] xl:w-[320px] xl:h-[220px]"
        />
        <Image
          src="/brand.svg"
          alt=""
          width={130}
          height={130}
          className="w-[200px] xl:w-[260px] h-auto"
        />

        <div className="pt-2">
          <p className={`${fonts.angkor.className} text-white font-bowly text-[18px] xl:text-[20px] leading-[22px] w-[320px] text-center`}>
            ¡Es hora de poner las cartas sobre la mesa!
          </p>
        </div>

        {/* User Session Info / Action Buttons */}
        <div className="pt-4 flex flex-col items-center gap-3 w-full max-w-[280px]">
          {isLoggedIn ? (
            <>
              <div className="bg-black/40 border border-amber-500/40 rounded-xl px-4 py-2 text-center text-white w-full backdrop-blur-sm shadow-md">
                <p className="text-xs text-amber-300 font-medium uppercase tracking-wider">Sesión iniciada</p>
                <p className={`${fonts.bowlbyOneSC.className} text-lg text-white font-bold`}>{player.name}</p>
                <p className="text-xs text-amber-200 mt-0.5">🪙 {player.coins} monedas</p>
              </div>

              <Button
                type="button"
                onClick={() => router.push("/desk")}
                className={`${fonts.bowlbyOneSC.className} z-30 w-full bg-gradient-to-tr from-yellow-950 to-yellow-700 py-3 text-white shadow-lg rounded-xl text-base hover:brightness-110 transition`}>
                <span className="animate-blink">Jugar Ahora</span>
              </Button>

              <button
                onClick={handleLogout}
                className="text-xs text-amber-300/80 hover:text-white underline cursor-pointer transition mt-1">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => router.push("/iniciar-sesion")}
                className={`${fonts.bowlbyOneSC.className} z-30 w-full bg-gradient-to-tr from-yellow-950 to-yellow-700 py-3 text-white shadow-lg rounded-xl text-sm hover:brightness-110 transition`}>
                Iniciar Sesión
              </Button>

              <Button
                type="button"
                onClick={() => router.push("/registro")}
                className="w-full bg-black/40 border border-amber-600/60 hover:bg-black/60 text-amber-200 py-2.5 rounded-xl text-sm font-semibold transition shadow">
                Crear Cuenta Nueva
              </Button>

              <div className="flex items-center gap-2 my-0.5 w-full justify-center">
                <span className="h-px bg-white/20 flex-1"></span>
                <span className="text-[11px] text-amber-200/60 uppercase">o con</span>
                <span className="h-px bg-white/20 flex-1"></span>
              </div>

              <div className="flex justify-center -my-1">
                <GoogleButton />
              </div>

              <button
                onClick={handleGuestPlay}
                className="text-xs text-white/70 hover:text-white underline cursor-pointer transition mt-0.5">
                Jugar como Invitado
              </button>
            </>
          )}
        </div>

        <div>
          <p className={`${fonts.angkor.className} text-white text-center mt-8 md:mt-6 text-[18px]`}>
            Redes sociales
          </p>

          <div className="flex justify-center mt-4">
            <div className="mx-4 md:mx-6 hover:cursor-pointer z-10">
              <Image width={40} height={40} src="/instagram.svg" alt="Instagram" />
            </div>

            <div className="mx-4 md:mx-6 hover:cursor-pointer z-10">
              <Image width={40} height={40} src="/facebook.svg" alt="Facebook" />
            </div>

            <div className="mx-4 md:mx-6 hover:cursor-pointer z-10">
              <Image width={40} height={40} src="/telegram.svg" alt="Telegram" />
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
