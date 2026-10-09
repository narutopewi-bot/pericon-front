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
  initialSeconds = 30,
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

  // Cuenta regresiva del tiempo de gracia por reconexión (30s)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const displayRival = rivalName && rivalName !== 'nulo' ? rivalName : 'Tu rival';
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / initialSeconds) * 100));
  const isGracePeriodActive = secondsRemaining > 0;

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
            {reason === 'disconnect' ? 'Rival sin Internet' : 'Tiempo de Turno Agotado'}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-amber-300/80 mt-1 max-w-xs">
            {reason === 'disconnect' ? (
              <>
                <span className="font-bold text-white">@{displayRival}</span> se quedó sin conexión a internet. Se le han otorgado <span className="text-amber-400 font-extrabold">30 segundos de gracia</span> para reconectarse.
              </>
            ) : initialSeconds === 0 ? (
              <>
                <span className="font-bold text-white">@{displayRival}</span> agotó su tiempo de turno de juego. Puedes reclamar la victoria por inactividad.
              </>
            ) : (
              <>
                <span className="font-bold text-white">@{displayRival}</span> agotó sus 30s de turno. Se le conceden <span className="text-amber-400 font-extrabold">30 segundos de gracia</span> por posible fallo de red.
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
                {isGracePeriodActive ? "Esperando reconexión..." : "Tiempo de gracia expirado"}
              </span>
            </div>
          </div>

          {/* Barra de Progreso y Tiempo */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1">
                <Hourglass className={`h-3.5 w-3.5 text-amber-400 ${isGracePeriodActive ? 'animate-spin duration-3000' : ''}`} />
                Tiempo de gracia por reconexión:
              </span>
              <span className={`font-mono font-black text-sm ${isGracePeriodActive ? 'text-amber-300' : 'text-emerald-400'}`}>
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-white/10">
              <div 
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  isGracePeriodActive 
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {isGracePeriodActive 
                ? "El botón para reclamar la victoria se activará al cumplirse el minuto completo."
                : initialSeconds === 0
                ? "¡El bot no respondió a tiempo! Ya puedes reclamar la victoria."
                : "¡El minuto de espera concluyó! Ya puedes reclamar la victoria por abandono."}
            </p>
          </div>
        </div>

        {/* 3. Botones de Acción */}
        <div className="relative z-10 flex flex-col gap-2.5 mt-4">
          
          {/* Botón Principal: Bloqueado durante gracia, Habilitado al minuto (0s) */}
          {isGracePeriodActive ? (
            <button
              disabled={true}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-slate-800/80 p-3.5 text-sm sm:text-base font-bold text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-80 transition-all duration-200"
            >
              <Hourglass className="h-5 w-5 text-amber-400 animate-spin" />
              <span>⏳ Esperando reconexión ({secondsRemaining}s)</span>
            </button>
          ) : (
            <button
              onClick={onClaimVictory}
              disabled={isClaiming}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 p-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.6)] active:scale-95 disabled:opacity-50 transition-all duration-200 animate-bounce-subtle"
            >
              <Trophy className="h-5 w-5 text-yellow-300" />
              <span>{isClaiming ? "Reclamando victoria..." : "🏆 Reclamar Victoria Ahora"}</span>
            </button>
          )}

          {/* Información de Cortesía */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300/70 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {initialSeconds === 0 
                ? "Regulación autoritativa de turno contra bots virtuales" 
                : "Tolerancia justa anti-microcortes de conexión (60s total)"}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
