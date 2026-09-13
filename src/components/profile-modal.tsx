"use client";

import React from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { getPlayerLevelInfo } from "@/lib/levelHelper";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearGamePlayer } from "@/store/slices/gameplayerSlice";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    email: string;
    coins: number;
    wins?: number;
    losses?: number;
    avatarUrl?: string;
  };
}

export default function ProfileModal({ isOpen, onClose, player }: ProfileModalProps) {
  const router = useRouter();
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const levelInfo = getPlayerLevelInfo(wins);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pericon_user");
    }
    dispatch(clearGamePlayer());
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#2b180a] via-[#1a0f05] to-[#0d0702] border-2 border-amber-500/60 rounded-3xl p-6 text-white shadow-2xl shadow-amber-600/30 flex flex-col items-center">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs transition"
          title="Cerrar perfil"
        >
          ✕
        </button>

        {/* Cabecera del Perfil */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-amber-400 p-1 bg-black/50 overflow-hidden shadow-lg shadow-amber-500/30 flex items-center justify-center text-3xl font-black text-amber-300">
              {player.avatarUrl && player.avatarUrl.length > 5 ? (
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span>{player.name ? player.name.slice(0, 2).toUpperCase() : "PJ"}</span>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 text-2xl filter drop-shadow">
              {levelInfo.badge}
            </span>
          </div>

          <h2 className={`${fonts.bowlbyOneSC.className} text-xl text-amber-300 tracking-wide mt-1`}>
            {player.name || "Jugador"}
          </h2>
          <span className="text-xs text-amber-200/60">{player.email || "periquero@juego.com"}</span>
        </div>

        {/* Tarjeta de Nivel y Rango */}
        <div
          className={`w-full ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} rounded-2xl p-4 flex flex-col gap-2.5 mb-4 shadow-inner`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelInfo.badge}</span>
              <div>
                <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider block">
                  Rango de Jugador
                </span>
                <span className={`text-base font-black ${levelInfo.badgeTextColor}`}>
                  Nivel {levelInfo.level}
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold bg-black/50 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-full">
              {wins} {wins === 1 ? "Victoria" : "Victorias"}
            </span>
          </div>

          {/* Barra de progreso hacia el siguiente nivel */}
          <div className="w-full mt-1">
            <div className="flex justify-between text-[11px] text-amber-200/90 mb-1 font-semibold">
              <span>
                {levelInfo.level === "Experto"
                  ? "¡Nivel Máximo!"
                  : `${wins} / ${levelInfo.maxWins} victorias`}
              </span>
              <span>{levelInfo.progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-amber-500/30 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              ></div>
            </div>
          </div>

          <p className="text-[11px] text-amber-100/80 leading-snug mt-0.5">
            {levelInfo.winsToNext <= 0 ? (
              <span>👑 {levelInfo.description}</span>
            ) : (
              <span>
                🎯 Te faltan{" "}
                <strong className="text-amber-300 font-bold">{levelInfo.winsToNext} victorias</strong>{" "}
                para alcanzar el rango{" "}
                <strong className="text-white">
                  {levelInfo.nextRankTitle}
                </strong>
                .
              </span>
            )}
          </p>
        </div>

        {/* Cuadrícula de Estadísticas */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-4">
          <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-emerald-400 font-extrabold text-lg">🏆 {wins}</span>
            <span className="text-[10px] text-emerald-200/80 uppercase font-bold mt-0.5">
              Victorias
            </span>
          </div>

          <div className="bg-black/40 border border-rose-500/30 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-rose-400 font-extrabold text-lg">⚔️ {losses}</span>
            <span className="text-[10px] text-rose-200/80 uppercase font-bold mt-0.5">
              Derrotas
            </span>
          </div>

          <div className="bg-black/40 border border-amber-500/30 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-amber-300 font-extrabold text-lg">🎮 {totalMatches}</span>
            <span className="text-[10px] text-amber-200/80 uppercase font-bold mt-0.5">
              Partidas Totales
            </span>
          </div>

          <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-yellow-300 font-extrabold text-lg">{winRate}%</span>
            <span className="text-[10px] text-yellow-200/80 uppercase font-bold mt-0.5">
              Efectividad
            </span>
          </div>
        </div>

        {/* Monedero Resumen */}
        <div className="w-full bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative">
              <Image src="/coin.png" fill alt="Monedas" className="object-contain" />
            </div>
            <div>
              <span className="text-[10px] text-amber-300/80 font-bold uppercase block">
                Saldo Disponible
              </span>
              <span className="text-sm font-black text-amber-200">
                {player.coins.toLocaleString()} Monedas
              </span>
            </div>
          </div>
          <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md font-bold border border-amber-500/30">
            Monedero Activo
          </span>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition"
          >
            Aceptar
          </button>
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 font-bold text-xs rounded-xl transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
