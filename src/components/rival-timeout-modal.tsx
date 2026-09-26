'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Clock, Trophy, AlertTriangle, ShieldCheck, Hourglass } from 'lucide-react';

export interface RivalTimeoutModalProps {
  isOpen: boolean;
  rivalName: string;
  rivalAvatar?: string;
  reason: 'timeout' | 'disconnect';
  initialSeconds?: number;
  onClaimVictory: () => void;
  onWait?: () => void;
  isClaiming?: boolean;
}

export default function RivalTimeoutModal({
  isOpen,
  rivalName,
  rivalAvatar,
  reason,
  initialSeconds = 25,
  onClaimVictory,
  onWait,
  isClaiming = false,
}: RivalTimeoutModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isWaitingMode, setIsWaitingMode] = useState(false);

  // Reiniciar contador cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(initialSeconds);
      setIsWaitingMode(false);
    }
  }, [isOpen, initialSeconds]);

  // Cuenta regresiva del tiempo de gracia por reconexión
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Si el tiempo de gracia se agota sin que el rival responda, reclamar la victoria automáticamente
          onClaimVictory();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClaimVictory]);

  if (!isOpen) return null;

  const displayRival = rivalName && rivalName !== 'nulo' ? rivalName : 'Tu rival';
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / initialSeconds) * 100));

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-[#221308] via-[#160c05] to-[#0a0502] p-5 sm:p-6 text-center text-white shadow-[0_0_50px_rgba(245,158,11,0.35)] animate-in zoom-in-95 duration-200">
        
        {/* Resplandor ámbar decorativo */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />

        {/* 1. Ícono de Estado (Desconexión o Tiempo Agotado) */}
        <div className="relative z-10 flex flex-col items-center mb-3">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-amber-300 animate-pulse">
            {reason === 'disconnect' ? (
              <WifiOff className="h-8 w-8 text-white" />
            ) : (
              <Clock className="h-8 w-8 text-white" />
            )}
          </div>

          <h2 className="mt-3 text-xl sm:text-2xl font-black uppercase tracking-wide text-amber-200 drop-shadow">
            {reason === 'disconnect' ? 'Rival Desconectado' : 'Tiempo del Rival Agotado'}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-amber-300/80 mt-1 max-w-xs">
            {reason === 'disconnect' ? (
              <>
                <span className="font-bold text-white">@{displayRival}</span> perdió su conexión a internet o cerró la partida.
              </>
            ) : (
              <>
                <span className="font-bold text-white">@{displayRival}</span> no lanzó cartas durante sus 30 segundos de turno.
              </>
            )}
          </p>
        </div>

        {/* 2. Tarjeta del Rival & Contador de Gracia */}
        <div className="relative z-10 my-3 rounded-2xl border border-amber-500/30 bg-black/60 p-3 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-amber-400/60 bg-slate-800 flex items-center justify-center">
              {rivalAvatar ? (
                <img src={rivalAvatar} alt={displayRival} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg">🤠</span>
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block truncate max-w-[170px]">
                @{displayRival}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Esperando señal...
              </span>
            </div>
          </div>

          {/* Barra de Progreso y Tiempo */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1">
                <Hourglass className="h-3.5 w-3.5 text-amber-400 animate-spin duration-3000" />
                Tiempo de espera por reconexión:
              </span>
              <span className="text-amber-300 font-mono font-black text-sm">
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Al llegar a 0s, se te otorgará la victoria por abandono automáticamente.
            </p>
          </div>
        </div>

        {/* 3. Botones de Acción */}
        <div className="relative z-10 flex flex-col gap-2.5 mt-4">
          
          {/* Botón Principal: Reclamar Victoria Ahora */}
          <button
            onClick={onClaimVictory}
            disabled={isClaiming}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 p-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.6)] active:scale-95 disabled:opacity-50 transition-all duration-200"
          >
            <Trophy className="h-5 w-5 text-yellow-300" />
            <span>{isClaiming ? "Reclamando victoria..." : "🏆 Reclamar Victoria Ahora"}</span>
          </button>

          {/* Botón Secundario: Esperar los segundos de gracia */}
          <button
            onClick={() => {
              setIsWaitingMode(true);
              onWait?.();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 py-2.5 text-xs font-bold text-amber-200/90 border border-amber-500/30 transition-colors"
          >
            <Clock className="h-4 w-4 text-amber-400" />
            <span>{isWaitingMode ? `Esperando reconexión (${secondsRemaining}s)...` : `Dar tiempo de reconexión (${secondsRemaining}s)`}</span>
          </button>

        </div>

      </div>
    </div>
  );
}
