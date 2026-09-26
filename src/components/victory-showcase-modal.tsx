'use client';

import React, { useState } from 'react';
import { Trophy, Share2, RefreshCw, LogOut, Check, Sparkles, Swords, Crown } from 'lucide-react';

export interface VictoryShowcaseModalProps {
  isOpen: boolean;
  winnerName: string;
  winnerAvatar?: string;
  winnerStones: number;
  loserName: string;
  loserAvatar?: string;
  loserStones: number;
  stakeCoins?: number;
  is2v2?: boolean;
  isFriendlyRoom?: boolean;
  onRequestRevancha: () => void;
  onExitLobby: () => void;
}

export default function VictoryShowcaseModal({
  isOpen,
  winnerName,
  winnerAvatar,
  winnerStones,
  loserName,
  loserAvatar,
  loserStones,
  stakeCoins = 10,
  is2v2 = false,
  isFriendlyRoom = false,
  onRequestRevancha,
  onExitLobby,
}: VictoryShowcaseModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const potTotal = stakeCoins * (is2v2 ? 4 : 2);
  const houseFee = Math.round(potTotal * 0.20);
  const netEarnings = potTotal - houseFee;

  const displayWinner = winnerName && winnerName !== 'nulo' ? winnerName : 'Tú';
  const displayLoser = loserName && loserName !== 'nulo' ? loserName : 'Rival';

  const shareText = isFriendlyRoom
    ? `🎴 ¡Acabo de coronarme CAMPEÓN en El Pericón! 🏆\n\nLe gané una partida épica en sala privada a @${displayLoser} (${winnerStones} piedras a ${loserStones}). ¡El rey de la mesa!\n\n¿Tienes el nivel para desafiarme? ¡Rétame ahora en https://pericon.lat !`
    : `🎴 ¡Acabo de coronarme CAMPEÓN en El Pericón! 🏆\n\nLe gané una partida épica a @${displayLoser} (${winnerStones} piedras a ${loserStones}) y me llevé el pozo de monedas 🪙.\n\n¿Tienes el nivel para desafiarme en la mesa? ¡Rétame ahora en https://pericon.lat !`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md sm:max-w-lg overflow-hidden rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-[#1b2e21] via-[#0e1a12] to-[#070d09] p-5 sm:p-6 text-center text-white shadow-[0_0_60px_rgba(245,158,11,0.35)] animate-in zoom-in-95 duration-300">
        
        {/* Resplandor áurico dorado en el fondo */}
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />

        {/* 1. Trofeo y Encabezado Triunfal */}
        <div className="relative z-10 flex flex-col items-center mb-3">
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(250,204,21,0.6)] border-2 border-yellow-200 animate-bounce duration-1000">
            <Trophy className="h-9 w-9 sm:h-11 sm:w-11 text-slate-950" />
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-200 animate-spin" />
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-wider text-yellow-300 drop-shadow-[0_2px_10px_rgba(234,179,8,0.7)]">
            ¡Victoria Épica!
          </h1>
          <p className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wide">
            👑 ¡Eres el Campeón de la Mesa!
          </p>
        </div>

        {/* 2. Abanico de Cartas Originales de El Pericón */}
        <div className="relative z-10 my-3 flex flex-col items-center">
          <div className="flex items-center justify-center -space-x-4 sm:-space-x-5 h-28 sm:h-32">
            
            {/* 4 de Basto */}
            <div 
              className="relative w-16 sm:w-20 rounded-xl overflow-hidden shadow-2xl border border-white/30 transform -rotate-12 translate-y-1 hover:scale-110 hover:-translate-y-2 hover:z-20 transition-all duration-200 cursor-pointer"
              title="4 de Basto"
            >
              <img 
                src="/cards/4_clubs.png" 
                alt="4 de Basto" 
                className="w-full h-auto object-cover" 
              />
            </div>

            {/* El Perico (11 de Basto) - Centro Destacado */}
            <div 
              className="relative z-10 w-20 sm:w-24 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(250,204,21,0.7)] border-2 border-yellow-300 transform -translate-y-2 hover:scale-115 hover:-translate-y-4 hover:z-30 transition-all duration-200 cursor-pointer"
              title="El Perico (11 de Basto)"
            >
              <div className="absolute top-1 right-1 bg-amber-500 text-[9px] font-black text-black px-1 rounded-sm shadow">
                ★
              </div>
              <img 
                src="/cards/11_clubs.png" 
                alt="El Perico (11 de Basto)" 
                className="w-full h-auto object-cover" 
              />
            </div>

            {/* 5 de Oro */}
            <div 
              className="relative w-16 sm:w-20 rounded-xl overflow-hidden shadow-2xl border border-white/30 transform rotate-12 translate-y-1 hover:scale-110 hover:-translate-y-2 hover:z-20 transition-all duration-200 cursor-pointer"
              title="5 de Oro"
            >
              <img 
                src="/cards/5_gold.png" 
                alt="5 de Oro" 
                className="w-full h-auto object-cover" 
              />
            </div>
          </div>

          {/* Nombres Oficiales de las Cartas */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <span className="text-slate-300">4 de Basto</span>
            <span className="text-yellow-300 font-extrabold drop-shadow">El Perico (11♣)</span>
            <span className="text-slate-300">5 de Oro</span>
          </div>
        </div>

        {/* 3. Duelo Frente a Frente (Quién contra Quién) */}
        <div className="relative z-10 my-3 rounded-2xl border border-amber-500/30 bg-black/55 p-3 sm:p-4 text-left">
          <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300 text-center mb-2.5 flex items-center justify-center gap-1.5">
            <Swords className="h-3.5 w-3.5 text-amber-400" />
            <span>Duelo {is2v2 ? 'en Parejas (2 vs 2)' : 'Mano a Mano (1 vs 1)'}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            
            {/* Ganador */}
            <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-gradient-to-br from-emerald-900/30 to-green-950/40 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <div className="relative mb-1">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-yellow-400 bg-slate-800 flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                  {winnerAvatar ? (
                    <img src={winnerAvatar} alt={displayWinner} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">🤠</span>
                  )}
                </div>
                <Crown className="absolute -top-2 -right-2 h-4 w-4 text-yellow-300 drop-shadow" />
              </div>
              <span className="max-w-[110px] truncate text-xs sm:text-sm font-black text-white">
                {displayWinner}
              </span>
              <span className="mt-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-300 border border-emerald-400/40 uppercase">
                ¡Victoria!
              </span>
              <span className="mt-1 text-xs font-black text-yellow-400">
                🪨 {winnerStones} Piedras
              </span>
            </div>

            {/* Separador VS */}
            <div className="flex flex-col items-center px-1">
              <span className="text-lg font-black text-amber-400 drop-shadow">VS</span>
            </div>

            {/* Perdedor */}
            <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-gradient-to-br from-red-950/20 to-red-900/20 border border-red-500/30 opacity-90">
              <div className="mb-1">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-slate-600 bg-slate-800 flex items-center justify-center">
                  {loserAvatar ? (
                    <img src={loserAvatar} alt={displayLoser} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">👤</span>
                  )}
                </div>
              </div>
              <span className="max-w-[110px] truncate text-xs sm:text-sm font-bold text-slate-200">
                @{displayLoser}
              </span>
              <span className="mt-1 rounded-md bg-red-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-red-300 border border-red-400/30 uppercase">
                Derrotado
              </span>
              <span className="mt-1 text-xs font-bold text-slate-400">
                🪨 {loserStones} Piedras
              </span>
            </div>

          </div>
        </div>

        {/* 4. Resumen de Pozo y Monedas Ganadas */}
        <div className="relative z-10 mb-4 rounded-xl border border-amber-500/30 bg-black/50 p-2.5 sm:p-3 text-xs text-slate-300">
          {isFriendlyRoom ? (
            <>
              <div className="flex justify-between items-center mb-1">
                <span>🪙 Tarifa por jugador:</span>
                <span className="font-extrabold text-amber-300">{stakeCoins} monedas</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span>🏛️ Recaudación de Sala (100% Casa):</span>
                <span className="font-extrabold text-amber-400">🪙 {potTotal} monedas</span>
              </div>
              <div className="my-1.5 h-px bg-white/10" />
              <div className="flex justify-between items-center text-sm font-black text-emerald-400">
                <span>👑 Victoria en Sala Privada:</span>
                <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">¡Honor y Gloria en la Mesa!</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-1">
                <span>🪙 Apuesta por jugador:</span>
                <span className="font-extrabold text-amber-300">{stakeCoins} monedas</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span>💰 Pozo total disputado:</span>
                <span className="font-extrabold text-amber-400">{potTotal} monedas</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span>🏛️ Comisión de casa (20%):</span>
                <span className="font-extrabold text-orange-400">-{houseFee} monedas</span>
              </div>
              <div className="my-1.5 h-px bg-white/10" />
              <div className="flex justify-between items-center text-sm font-black text-emerald-400">
                <span>🏆 Premio neto acreditado:</span>
                <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+{netEarnings} Monedas</span>
              </div>
            </>
          )}
        </div>

        {/* 5. Botones de Acción */}
        <div className="relative z-10 flex flex-col gap-2.5">
          
          {/* Botón WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#2ae772] hover:to-[#20b859] p-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(37,211,102,0.45)] hover:shadow-[0_8px_25px_rgba(37,211,102,0.6)] active:scale-95 transition-all duration-200"
          >
            <span className="text-xl">📱</span>
            <span>Presumir Victoria en WhatsApp</span>
          </button>

          {/* Botón Copiar Enlace rápido */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 py-1.5 text-[11px] font-bold text-slate-300 border border-white/10 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">¡Mensaje copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Copiar texto de victoria para compartir</span>
              </>
            )}
          </button>

          {/* Fila de Revancha y Salir */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onRequestRevancha}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md active:scale-95 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Pedir Revancha</span>
            </button>

            <button
              onClick={onExitLobby}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 py-3 text-xs sm:text-sm font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir al Lobby</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
