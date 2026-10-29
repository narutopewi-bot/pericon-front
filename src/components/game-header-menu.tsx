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
  onOpenLeaderboard?: () => void;
  onOpenFeedback?: () => void;
}

export default function GameHeaderMenu({
  player,
  onOpenProfile,
  onOpenWallet,
  onOpenTutorial,
  onOpenLeaderboard,
  onOpenFeedback,
}: GameHeaderMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const wins = player.wins ?? 0;
  const levelInfo = getPlayerLevelInfo(wins);
  const isGuardian = (player.name || "").trim().toLowerCase() === "guardian";

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pericon_user");
    }
    dispatch(clearGamePlayer());
    router.push("/");
  };

  const handleOpenAdmin = () => {
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("guardian_session_auth", "true");
      sessionStorage.setItem("guardian_admin_token", "Guardian_SecKey_2026_Pericon$AdminToken!X9#Venezuela");
    }
    router.push("/admin");
  };

  return (
    <header className="w-full max-w-[100vw] bg-black/75 backdrop-blur-md border-b border-amber-500/40 px-2 sm:px-4 py-1 sm:py-2 z-40 relative select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {/* Brand / Logo & Inicio */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => router.push("/")}
            className="flex items-center hover:opacity-90 active:scale-95 transition"
            title="Volver al Inicio"
          >
            <Image
              src="/brand.svg"
              width={80}
              height={25}
              alt="Pericón"
              priority
              className="h-5 sm:h-7 w-auto"
            />
          </button>
        </div>

        {/* Ficha de Jugador con Nivel, Monedero, Acceso Directo Admin & Menú 3 Puntos */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Tarjeta del Jugador (Clickeable -> Abre Perfil) */}
          <button
            onClick={onOpenProfile}
            title="Ver mi perfil y nivel"
            className="flex items-center gap-1 sm:gap-1.5 bg-[#2a1708]/90 hover:bg-[#3d220c] border border-amber-500/50 rounded-full py-0.5 px-1.5 sm:py-1 sm:px-2.5 transition shadow-sm group active:scale-95"
          >
            <div className="relative w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-amber-400 overflow-hidden bg-black/40 flex items-center justify-center text-[10px] sm:text-xs font-black text-amber-300 shrink-0">
              <img
                src={player.avatarUrl && player.avatarUrl.length > 5 ? player.avatarUrl : "/avatar.png"}
                alt={player.name || "Jugador"}
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <div className="flex flex-col items-start text-left leading-tight">
              <span className="text-[10px] sm:text-xs font-bold text-amber-100 group-hover:text-amber-300 transition max-w-[45px] xs:max-w-[70px] sm:max-w-[120px] truncate">
                {player.name || "Jugador"}
              </span>
              <span className={`text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 ${levelInfo.badgeTextColor}`}>
                <span>{levelInfo.badge}</span>
                <span className="hidden sm:inline">Nivel {levelInfo.level}</span>
                <span className="sm:hidden">Nv.{levelInfo.level}</span>
              </span>
            </div>
          </button>

          {/* Monedero / Wallet Widget (Clickeable -> Abre Monedero) */}
          <button
            onClick={onOpenWallet}
            title="Abrir Monedero y Recargas"
            className="flex items-center gap-1 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 hover:from-amber-900 hover:to-yellow-900 border border-amber-400/60 rounded-full py-0.5 px-1.5 sm:py-1 sm:px-2.5 transition shadow-sm group active:scale-95"
          >
            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 relative group-hover:rotate-12 transition transform shrink-0">
              <Image src="/coin.png" fill alt="Moneda" className="object-contain" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-amber-200">
              {player.coins.toLocaleString()}
            </span>
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 text-black font-extrabold text-[8px] sm:text-[10px] rounded-full flex items-center justify-center group-hover:scale-110 transition ml-0.5">
              +
            </span>
          </button>

          {/* Botón directo de Administrador para Guardian (Visible en pantallas medianas hacia arriba) */}
          {isGuardian && (
            <button
              onClick={handleOpenAdmin}
              title="Panel de Administrador (Guardian)"
              className="hidden sm:flex items-center gap-1 bg-gradient-to-r from-yellow-500/25 to-amber-500/25 hover:from-yellow-500/40 hover:to-amber-500/40 text-yellow-300 border border-yellow-400/60 rounded-full py-0.5 px-2 text-xs font-black transition shadow-sm active:scale-95"
            >
              <span>🛡️</span>
              <span>Admin</span>
            </button>
          )}

          {/* Botón Ranking Top 10 (Visible en desktop/tablet) */}
          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              title="Top 10 Mejores Jugadores"
              className="hidden md:flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/50 rounded-full py-1 px-2.5 text-xs font-bold transition shadow-sm"
            >
              <span>🏆</span>
              <span>Ranking</span>
            </button>
          )}

          {/* Botón de Menú de Tres Puntos (⋮) - SIEMPRE VISIBLE EN MÓVIL Y ESCRITORIO */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/90 border border-amber-500/60 hover:border-amber-400 text-amber-300 active:scale-95 transition shadow shrink-0"
            title="Opciones y Menú del juego"
            aria-label="Menú de tres puntos"
          >
            <span className="text-base sm:text-lg font-black leading-none">⋮</span>
            {isGuardian && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-black animate-pulse"
                title="Acceso Administrador"
              />
            )}
          </button>
        </div>
      </div>

      {/* Menú Desplegable / Dropdown con Fondo Clickeable */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full right-2 sm:right-4 mt-1.5 w-60 bg-[#1a0f05] border-2 border-amber-500/70 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 text-white animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-amber-500/20 mb-1 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider block">
                  Menú del Juego
                </span>
                <span className="text-xs font-bold text-amber-100 truncate block">
                  {player.name || "Jugador"}
                </span>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/40 bg-black/40 ${levelInfo.badgeTextColor}`}>
                {levelInfo.badge} Nv.{levelInfo.level}
              </span>
            </div>

            {/* Acceso Directo de Administrador - PRIORITARIO SI ES GUARDIAN */}
            {isGuardian ? (
              <button
                onClick={handleOpenAdmin}
                className="w-full text-left px-3 py-2 text-xs rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 hover:from-amber-500/45 hover:to-yellow-500/35 text-yellow-300 border border-yellow-400/80 flex items-center justify-between font-black transition shadow-md active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🛡️</span>
                  <span>Panel de Administrador</span>
                </div>
                <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black uppercase">
                  Acceder
                </span>
              </button>
            ) : (
              <button
                onClick={handleOpenAdmin}
                className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-yellow-500/20 text-yellow-300 flex items-center gap-2 font-bold transition"
              >
                <span>🔒</span>
                <span>Panel de Administrador</span>
              </button>
            )}

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
              <span>Monedero y Recargas</span>
            </button>

            {onOpenLeaderboard && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenLeaderboard();
                }}
                className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-yellow-500/20 text-yellow-300 flex items-center gap-2 font-bold transition"
              >
                <span>🏆</span>
                <span>Ranking Top 10 Jugadores</span>
              </button>
            )}

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

            {onOpenFeedback && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenFeedback();
                }}
                className="w-full text-left px-3 py-2 text-xs rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 flex items-center gap-2 font-bold transition border border-amber-500/30"
              >
                <span>⭐</span>
                <span>¿Qué tal el juego? / Tu Opinión</span>
              </button>
            )}

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
        </>
      )}
    </header>
  );
}
