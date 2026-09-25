"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as fonts from "@/components/fonts";
import { X, Sparkles } from "lucide-react";
import Image from "next/image";

interface MatchSingleProps {
  player: any;
  onDismiss: () => void;
  mode?: string;
  queueCount?: number;
}

const MatchSingle: React.FC<MatchSingleProps> = ({ player, onDismiss, mode = "1 vs 1", queueCount = 1 }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}s`;
  };

  const playerName = (player?.name || player?.username || "Jugador").toString();
  const initials = (playerName ? playerName.slice(0, 2) : "JG").toUpperCase();
  const playerLevel = player?.level || "Novato";
  const is2v2 = mode === "2 vs 2";

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-[#241308]/95 via-[#180d05]/98 to-[#0f0703] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative text-white flex flex-col items-center text-center">
      {/* Badge Superior de Modo */}
      <div className={`inline-flex items-center gap-1.5 border rounded-full py-1 px-3 mb-2 shadow ${
        is2v2 ? "bg-purple-600/30 border-purple-400/50 text-purple-200" : "bg-blue-600/30 border-blue-400/50 text-blue-200"
      }`}>
        <span className={`w-2 h-2 rounded-full animate-ping ${is2v2 ? "bg-purple-400" : "bg-blue-400"}`}></span>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
          {is2v2 ? "DUELO 2 VS 2 • 4 JUGADORES" : "DUELO 1 VS 1 • MULTIJUGADOR"}
        </span>
      </div>

      {/* Título */}
      <h2 className={`text-base sm:text-lg text-white font-extrabold ${fonts.bowlbyOneSC.className} tracking-wide`}>
        {is2v2 ? "BUSCANDO 4 JUGADORES" : "BUSCANDO CONTRINCANTE"}
      </h2>
      <p className="text-[10px] sm:text-xs text-slate-300 font-medium mt-0.5">
        {is2v2
          ? `Esperando jugadores con tu apuesta (${Math.max(1, queueCount)} de 4 listos)...`
          : "Buscando un rival de tu nivel para la partida..."}
      </p>

      {/* Contador de tiempo en cola y jugadores */}
      <div className="mt-2 flex items-center gap-2 text-[11px] sm:text-xs font-black text-amber-400 bg-black/60 border border-amber-500/40 px-3 py-1 rounded-full shadow-inner">
        <span>⏱️ {formatTime(seconds)}</span>
        {is2v2 && (
          <span className="text-purple-300 border-l border-amber-500/40 pl-2">
            👥 {Math.max(1, queueCount)}/4 Conectados
          </span>
        )}
      </div>

      {/* Sección Cara a Cara (VS) */}
      <div className="w-full flex items-center justify-between my-5 px-2">
        {/* Jugador Local */}
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-1 shadow-xl border-2 border-yellow-300 flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
              {player?.avatarUrl && player.avatarUrl.length > 5 ? (
                <img
                  src={player.avatarUrl}
                  alt={playerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl sm:text-2xl font-black text-amber-300">
                  {initials}
                </span>
              )}
            </div>
            {/* Indicador de conexión activo */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-[8px] font-black text-black">
              ✓
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-white mt-1.5 max-w-[90px] truncate">
            {playerName}
          </span>
          <span className="text-[8.5px] font-extrabold text-amber-400 uppercase tracking-tight">
            {playerLevel}
          </span>
        </div>

        {/* Emblema Central VS */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 flex items-center justify-center shadow-lg border-2 border-amber-300/70 animate-pulse">
            <span className={`text-xs sm:text-sm font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${fonts.bowlbyOneSC.className}`}>
              VS
            </span>
          </div>
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Duelo
          </span>
        </div>

        {/* Oponente en Búsqueda (Radar) */}
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/60 border-2 border-dashed border-blue-400/60 flex items-center justify-center shadow-inner overflow-hidden">
            {/* Onda expansiva de radar */}
            <div className="absolute inset-1 rounded-xl bg-blue-500/20 animate-ping"></div>
            <span className="text-2xl sm:text-3xl z-10 animate-bounce">
              ❓
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-blue-300 mt-1.5 animate-pulse">
            Buscando...
          </span>
          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">
            Rival
          </span>
        </div>
      </div>

      {/* Botón Cancelar Búsqueda (Limpio y Ergonómico) */}
      <div className="w-full mt-2">
        <Button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 h-auto rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider border border-red-400/50 shadow-lg flex items-center justify-center gap-2 transition"
        >
          <X size={16} />
          <span>Cancelar Búsqueda</span>
        </Button>
      </div>
    </div>
  );
};

export default MatchSingle;
