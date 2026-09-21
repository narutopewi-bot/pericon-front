"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as fonts from "@/components/fonts";
import { Button } from "@/components/ui/button";
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
                coins: u.coins ?? 1000,
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
          alt="Mascota oficial de El Pericón - Chivo de Carora"
          className="w-[200px] h-[200px] xl:w-[320px] xl:h-[220px]"
          priority
        />
        <h1 className="sr-only">El Pericón - Juego de Cartas Venezolano Tradicional en Vivo</h1>
        <Image
          src="/brand.svg"
          alt="El Pericón - Juego de Naipes"
          width={130}
          height={130}
          className="w-[200px] xl:w-[260px] h-auto"
          priority
        />

        <div className="pt-2 flex flex-col items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-300 uppercase bg-black/60 border border-amber-500/40 px-3 py-0.5 rounded-full shadow backdrop-blur-sm">
            🌵 Carora • Estado Lara
          </span>
          <h2 className={`${fonts.angkor.className} text-white font-bowly text-[16px] xl:text-[19px] leading-[22px] w-[330px] text-center drop-shadow-md`}>
            ¡El legendario juego de naipes de la tierra del chivo y el cocuy!
          </h2>
        </div>

        {/* User Session Info / Action Buttons con Alta Presencia */}
        <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-[320px] bg-black/75 backdrop-blur-md border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl shadow-black/80">
          {isLoggedIn ? (
            <>
              <div className="bg-[#18131e]/90 border border-amber-500/50 rounded-2xl px-4 py-2.5 text-center text-white w-full shadow-inner">
                <p className="text-[10px] sm:text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <span>🤠</span>
                  <span>Sesión iniciada</span>
                </p>
                <p className={`${fonts.bowlbyOneSC.className} text-xl text-white font-black tracking-wide mt-0.5`}>{player.name}</p>
                <p className="text-xs text-amber-300 font-extrabold mt-0.5">🪙 {player.coins.toLocaleString()} monedas</p>
              </div>

              <Button
                type="button"
                onClick={() => router.push("/desk")}
                className={`${fonts.bowlbyOneSC.className} z-30 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 py-3.5 text-slate-950 font-black shadow-xl shadow-amber-500/30 rounded-2xl text-base border-2 border-yellow-100 hover:scale-[1.02] active:scale-95 transition-all`}>
                <span className="flex items-center justify-center gap-2">
                  <span>JUGAR AHORA</span>
                  <span>➜</span>
                </span>
              </Button>

              <button
                onClick={handleLogout}
                className="text-xs text-amber-300/80 hover:text-white underline cursor-pointer transition">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              {/* Botón Principal Iniciar Sesión: Negro & Oro */}
              <Button
                type="button"
                onClick={() => router.push("/iniciar-sesion")}
                className={`${fonts.bowlbyOneSC.className} z-30 w-full bg-black/90 hover:bg-black py-3.5 text-amber-400 hover:text-amber-300 font-black shadow-2xl shadow-black/90 rounded-2xl text-sm sm:text-base border-2 border-amber-400 tracking-wider hover:scale-[1.02] active:scale-95 transition-all`}>
                INICIAR SESIÓN
              </Button>

              {/* Botón Crear Cuenta Nueva: Negro & Plata */}
              <Button
                type="button"
                onClick={() => router.push("/registro")}
                className="w-full bg-black/85 hover:bg-black border-2 border-slate-300 hover:border-white text-white py-3 rounded-2xl text-sm font-extrabold shadow-xl shadow-black/90 tracking-wide hover:scale-[1.02] active:scale-95 transition-all">
                Crear Cuenta Nueva
              </Button>

              <button
                onClick={handleGuestPlay}
                className="w-full py-2.5 px-3 mt-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs text-white font-bold transition flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95">
                <span>🎲</span>
                <span>Jugar como Invitado (Solo Amistoso)</span>
              </button>
            </>
          )}
        </div>

        <div>
          <p className={`${fonts.angkor.className} text-white text-center mt-8 md:mt-6 text-[18px]`}>
            Redes sociales
          </p>

          <div className="flex justify-center mt-4">
            <a
              href="https://www.instagram.com/pericon.lat"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-4 md:mx-6 hover:cursor-pointer z-10 flex flex-col items-center group transition-transform hover:scale-110 active:scale-95"
              title="Síguenos en Instagram @pericon.lat (Gana 300 monedas)">
              <Image width={40} height={40} src="/instagram.svg" alt="Instagram @pericon.lat" className="drop-shadow-[0_2px_10px_rgba(225,48,108,0.5)]" />
              <span className="text-[10px] text-amber-300 font-bold mt-1 group-hover:text-yellow-200">@pericon.lat</span>
            </a>

            <div className="mx-4 md:mx-6 hover:cursor-pointer z-10">
              <Image width={40} height={40} src="/facebook.svg" alt="Facebook" />
            </div>

            <div className="mx-4 md:mx-6 hover:cursor-pointer z-10">
              <Image width={40} height={40} src="/telegram.svg" alt="Telegram" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-amber-300/70 font-semibold">
            <Link href="/tutorial-preview" className="hover:text-amber-200 underline transition-colors">
              ¿Cómo jugar El Pericón?
            </Link>
            <span>•</span>
            <Link href="/terminos" className="hover:text-amber-200 underline transition-colors">
              Términos y Condiciones
            </Link>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
