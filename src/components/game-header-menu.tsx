"use client";

import React, { useState } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { getPlayerLevelInfo } from "@/lib/levelHelper";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearGamePlayer } from "@/store/slices/gameplayerSlice";

interface GameHeaderMenuProps {
  player: {
    id: string;
    name: string;
    email: string;
    coins: number;
    wins?: number;
    losses?: number;
    avatarUrl?: string;
  };
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenTutorial: () => void;
}

export default function GameHeaderMenu({
  player,
  onOpenProfile,
  onOpenWallet,
  onOpenTutorial,
}: GameHeaderMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const wins = player.wins ?? 0;
  const levelInfo = getPlayerLevelInfo(wins);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pericon_user");
    }
    dispatch(clearGamePlayer());
    router.push("/");
  };

  return (
    <header className="w-full bg-black/60 backdrop-blur-md border-b border-amber-500/30 px-3 py-2 z-40 relative">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand / Logo & Inicio */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 hover:opacity-90 transition"
            title="Volver al Inicio"
          >
            <Image src="/brand.svg" width={110} height={35} alt="Pericón" priority className="h-7 w-auto" />
          </button>
        </div>

        {/* Ficha de Jugador con Nivel & Monedero */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tarjeta del Jugador (Clickeable -> Abre Perfil) */}
          <button
            onClick={onOpenProfile}
            title="Ver mi perfil y nivel"
            className="flex items-center gap-2 bg-[#2a1708]/90 hover:bg-[#3d220c] border border-amber-500/50 rounded-full py-1 px-2.5 transition shadow-sm group"
          >
            <div className="relative w-7 h-7 rounded-full border border-amber-400 overflow-hidden bg-black/40 flex items-center justify-center text-xs font-black text-amber-300">
              {player.avatarUrl && player.avatarUrl.length > 5 ? (
                <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{player.name ? player.name.slice(0, 2).toUpperCase() : "PJ"}</span>
              )}
            </div>

            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-bold text-amber-100 group-hover:text-amber-300 transition max-w-[90px] sm:max-w-[130px] truncate">
                {player.name || "Jugador"}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 ${levelInfo.badgeTextColor}`}>
                <span>{levelInfo.badge}</span>
                <span>Nivel {levelInfo.level}</span>
              </span>
            </div>
          </button>

          {/* Monedero / Wallet Widget (Clickeable -> Abre Monedero) */}
          <button
            onClick={onOpenWallet}
            title="Abrir Monedero y Recargas"
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 hover:from-amber-900 hover:to-yellow-900 border border-amber-400/60 rounded-full py-1 px-2.5 transition shadow-sm group"
          >
            <div className="w-5 h-5 relative group-hover:rotate-12 transition transform">
              <Image src="/coin.png" fill alt="Moneda" className="object-contain" />
            </div>
            <span className="text-xs font-black text-amber-200">
              {player.coins.toLocaleString()}
            </span>
            <span className="w-4 h-4 bg-amber-500 text-black font-extrabold text-[10px] rounded-full flex items-center justify-center group-hover:scale-110 transition ml-0.5">
              +
            </span>
          </button>

          {/* Botón Tutorial de la Cabrita (Siempre disponible) */}
          <button
            onClick={onOpenTutorial}
            title="¿Cómo jugar? Tutorial con la Cabrita"
            className="hidden sm:flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-full py-1 px-2.5 text-xs font-bold transition"
          >
            <span>🐐</span>
            <span className="hidden md:inline">¿Cómo Jugar?</span>
          </button>

          {/* Botón de Menú Hamburguesa para Móvil y Opciones */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300 hover:bg-black/70 transition"
            title="Menú del juego"
          >
            <span className="text-base leading-none">☰</span>
          </button>
        </div>
      </div>

      {/* Menú Desplegable / Dropdown */}
      {menuOpen && (
        <div className="absolute top-full right-3 mt-2 w-56 bg-[#1a0f05] border-2 border-amber-500/60 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-amber-500/20 mb-1">
            <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider block">
              Menú Principal
            </span>
            <span className="text-xs font-bold text-amber-100 truncate block">
              {player.name || "Jugador"} ({levelInfo.level})
            </span>
          </div>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenProfile();
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-amber-500/20 text-amber-200 flex items-center gap-2 font-medium transition"
          >
            <span>👤</span>
            <span>Mi Perfil y Estadísticas</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenWallet();
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-amber-500/20 text-amber-200 flex items-center gap-2 font-medium transition"
          >
            <span>🪙</span>
            <span>Monedero y Bono Diario</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenTutorial();
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-amber-500/20 text-amber-200 flex items-center gap-2 font-medium transition"
          >
            <span>🐐</span>
            <span>Tutorial de Reglas (La Cabrita)</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              router.push("/admin");
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-yellow-500/20 text-yellow-300 flex items-center gap-2 font-bold transition"
          >
            <span>🔒</span>
            <span>Panel de Administrador</span>
          </button>

          <div className="border-t border-amber-500/20 my-1"></div>

          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 font-medium transition"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
