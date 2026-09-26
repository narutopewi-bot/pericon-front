'use client';

import React, { useState } from 'react';
import { Swords, RefreshCw, LogOut, Check, HeartCrack, Share2, Crown, ShieldAlert } from 'lucide-react';

export interface DefeatShowcaseModalProps {
  isOpen: boolean;
  winnerName: string;
  winnerAvatar?: string;
  winnerStones: number;
  loserName: string;
  loserAvatar?: string;
  loserStones: number;
  stakeCoins?: number;
  newBalance?: number;
  is2v2?: boolean;
  isFriendlyRoom?: boolean;
  endReason?: string;
  onRequestRevancha: () => void;
  onExitLobby: () => void;
}

export default function DefeatShowcaseModal({
  isOpen,
  winnerName,
  winnerAvatar,
  winnerStones,
  loserName,
  loserAvatar,
  loserStones,
  stakeCoins = 10,
  newBalance,
  is2v2 = false,
  isFriendlyRoom = false,
  endReason,
  onRequestRevancha,
  onExitLobby,
}: DefeatShowcaseModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const potTotal = stakeCoins * (is2v2 ? 4 : 2);
  const displayWinner = winnerName && winnerName !== 'nulo' ? winnerName : 'Rival';
  const displayLoser = loserName && loserName !== 'nulo' ? loserName : 'Tú';

  const shareText = `🎴 ¡Buena partida @${displayWinner}! Te llevaste esta mano en El Pericón (${winnerStones} a ${loserStones} piedras), ¡pero exijo REVANCHA inmediata! ⚔️\n\n¿Tienes el valor de volver a enfrentarme? ¡Acepta el duelo ahora en https://pericon.lat !`;

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-[390px] sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl border-2 border-red-500/70 bg-gradient-to-b from-[#2a0e0a] via-[#1a0806] to-[#0c0403] p-4 sm:p-5 text-center text-white shadow-[0_0_50px_rgba(239,68,68,0.35)] animate-in zoom-in-95 duration-300">
        
        {/* Resplandor áurico carmesí en el fondo */}
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-red-600/20 blur-3xl" />

        {/* 1. Ícono y Encabezado de Partida Finalizada */}
        <div className="relative z-10 flex flex-col items-center mb-2">
          <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-amber-900 shadow-[0_0_25px_rgba(225,29,72,0.5)] border-2 border-red-300">
            <HeartCrack className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse" />
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-black uppercase tracking-wider text-rose-300 drop-shadow-[0_2px_8px_rgba(225,29,72,0.7)]">
            Partida Finalizada
          </h1>
          <p className="text-[11px] sm:text-xs font-bold text-red-300/80 uppercase tracking-wide">
            {endReason === "TiempoAgotado" || endReason === "TiempoAgotadoRival" 
              ? "⏳ Tiempo de turno agotado"
              : endReason === "Rendicion" 
                ? "🏳️ Abandono de partida" 
                : "💔 Tu rival se llevó la victoria esta vez"}
          </p>
        </div>

        {/* 2. Abanico de Cartas Originales de El Pericón */}
        <div className="relative z-10 my-2 flex flex-col items-center">
          <div className="flex items-center justify-center -space-x-3.5 sm:-space-x-4 h-20 sm:h-24">
            
            {/* 4 de Basto */}
            <div 
              className="relative w-12 sm:w-14 rounded-lg overflow-hidden shadow-xl border border-white/20 transform -rotate-12 translate-y-0.5 opacity-85 hover:scale-105 transition-all duration-200"
              title="4 de Basto"
            >
              <img 
                src="/cards/4_clubs.png" 
                alt="4 de Basto" 
                className="w-full h-auto object-cover" 
              />
            </div>

            {/* El Perico (11 de Basto) - Centro */}
            <div 
              className="relative z-10 w-14 sm:w-16 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(244,63,94,0.5)] border-2 border-rose-400 transform -translate-y-1.5 hover:scale-110 transition-all duration-200"
              title="El Perico (11 de Basto)"
            >
              <div className="absolute top-0.5 right-0.5 bg-red-600 text-[8px] font-black text-white px-1 rounded-sm shadow">
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
              className="relative w-12 sm:w-14 rounded-lg overflow-hidden shadow-xl border border-white/20 transform rotate-12 translate-y-0.5 opacity-85 hover:scale-105 transition-all duration-200"
              title="5 de Oro"
            >
              <img 
                src="/cards/5_gold.png" 
                alt="5 de Oro" 
                className="w-full h-auto object-cover" 
              />
            </div>
          </div>

          {/* Nombres Oficiales */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
            <span className="text-slate-400">4 de Basto</span>
            <span className="text-rose-300 font-extrabold drop-shadow">El Perico (11♣)</span>
            <span className="text-slate-400">5 de Oro</span>
          </div>
        </div>

        {/* 3. Duelo Frente a Frente */}
        <div className="relative z-10 my-2 rounded-xl border border-red-500/30 bg-black/60 p-2 sm:p-2.5 text-left">
          <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-300 text-center mb-1.5 flex items-center justify-center gap-1">
            <Swords className="h-3 w-3 text-red-400" />
            <span>Resultado del Duelo {is2v2 ? '(2 vs 2)' : '(1 vs 1)'}</span>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            
            {/* Ganador (Rival) */}
            <div className="flex-1 flex flex-col items-center p-1.5 rounded-lg bg-gradient-to-br from-emerald-950/40 to-green-900/30 border border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <div className="relative mb-0.5">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border-2 border-yellow-400 bg-slate-800 flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                  {winnerAvatar ? (
                    <img src={winnerAvatar} alt={displayWinner} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm">🤠</span>
                  )}
                </div>
                <Crown className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-yellow-300 drop-shadow" />
              </div>
              <span className="max-w-[95px] truncate text-[11px] sm:text-xs font-black text-white">
                {displayWinner}
              </span>
              <span className="mt-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-emerald-300 border border-emerald-400/40 uppercase">
                ¡Victoria!
              </span>
              <span className="mt-0.5 text-[10px] sm:text-[11px] font-black text-yellow-400">
                🪨 {winnerStones} Piedras
              </span>
            </div>

            {/* Separador VS */}
            <div className="flex flex-col items-center px-0.5">
              <span className="text-sm font-black text-rose-400 drop-shadow">VS</span>
            </div>

            {/* Perdedor (Jugador) */}
            <div className="flex-1 flex flex-col items-center p-1.5 rounded-lg bg-gradient-to-br from-red-950/40 to-rose-900/30 border border-red-500/40">
              <div className="mb-0.5">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-rose-500/50 bg-slate-800 flex items-center justify-center">
                  {loserAvatar ? (
                    <img src={loserAvatar} alt={displayLoser} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm">👤</span>
                  )}
                </div>
              </div>
              <span className="max-w-[95px] truncate text-[11px] sm:text-xs font-bold text-slate-200">
                {displayLoser}
              </span>
              <span className="mt-0.5 rounded-md bg-rose-500/20 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-rose-300 border border-rose-400/30 uppercase">
                Derrotado
              </span>
              <span className="mt-0.5 text-[10px] sm:text-[11px] font-bold text-slate-400">
                🪨 {loserStones} Piedras
              </span>
            </div>

          </div>
        </div>

        {/* 4. Resumen de Saldo y Descuento */}
        <div className="relative z-10 mb-2.5 rounded-xl border border-red-500/30 bg-black/60 p-2 sm:p-2.5 text-[11px] sm:text-xs text-slate-300">
          <div className="flex justify-between items-center mb-0.5">
            <span>🪙 {isFriendlyRoom ? 'Tarifa de sala abonada:' : 'Monedas descontadas:'}</span>
            <span className="font-extrabold text-red-400">-{stakeCoins} monedas</span>
          </div>
          <div className="flex justify-between items-center mb-0.5">
            <span>💰 Pozo total disputado:</span>
            <span className="font-bold text-slate-300">{potTotal} monedas</span>
          </div>
          {newBalance !== undefined && (
            <>
              <div className="my-1 h-px bg-white/10" />
              <div className="flex justify-between items-center text-xs sm:text-sm font-black text-amber-300">
                <span>👛 Tu nuevo saldo:</span>
                <span className="drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">{newBalance} Monedas</span>
              </div>
            </>
          )}
        </div>

        {/* 5. Botones de Acción */}
        <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2">
          
          {/* Botón Pedir Revancha */}
          <button
            onClick={onRequestRevancha}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_15px_rgba(217,119,6,0.4)] active:scale-95 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>¡Exigir Revancha Inmediata!</span>
          </button>

          {/* Botón Retar por WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#2ae772] hover:to-[#20b859] py-2 px-3 text-[11px] sm:text-xs font-black uppercase tracking-wider text-white shadow-[0_3px_10px_rgba(37,211,102,0.35)] active:scale-95 transition-all duration-200"
          >
            <span className="text-base">📱</span>
            <span>Retar a Revancha en WhatsApp</span>
          </button>

          {/* Fila Copiar Enlace y Salir */}
          <div className="grid grid-cols-2 gap-2 mt-0.5">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-300 border border-white/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-300">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3 w-3 text-slate-400" />
                  <span>Copiar Reto</span>
                </>
              )}
            </button>

            <button
              onClick={onExitLobby}
              className="flex items-center justify-center gap-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-300 border border-slate-700 transition-colors"
            >
              <LogOut className="h-3 w-3 text-slate-400" />
              <span>Volver al Menú</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
