"use client";

import React, { useEffect, useState, useRef } from "react";
import { playTimerAlertSound, playTimerTickSound } from "@/lib/soundEffects";

interface GameTurnTimerProps {
  isMyTurn: boolean;
  onTimeout: () => void;
  maxSeconds?: number;
  className?: string;
}

export default function GameTurnTimer({
  isMyTurn,
  onTimeout,
  maxSeconds = 30,
  className = "",
}: GameTurnTimerProps) {
  const [seconds, setSeconds] = useState<number>(maxSeconds);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset timer whenever it becomes my turn
  useEffect(() => {
    if (isMyTurn) {
      setSeconds(maxSeconds);
    }
  }, [isMyTurn, maxSeconds]);

  useEffect(() => {
    if (!isMyTurn) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Trigger auto-play on timeout
          setTimeout(() => {
            onTimeoutRef.current();
          }, 0);
          return 0;
        }

        const nextSec = prev - 1;
        // Sound cues
        if (nextSec <= 5 && nextSec > 0) {
          playTimerAlertSound();
        } else if (nextSec % 5 === 0) {
          playTimerTickSound();
        }

        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn]);

  if (!isMyTurn) return null;

  const percentage = (seconds / maxSeconds) * 100;
  const isUrgent = seconds <= 7;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border shadow-lg transition-all animate-in fade-in duration-200 ${
        isUrgent
          ? "bg-red-950/80 border-red-500 text-red-200 shadow-red-500/30 animate-pulse"
          : "bg-black/70 border-amber-500/50 text-amber-200 shadow-amber-500/20"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-white/20"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={isUrgent ? "text-red-400" : "text-amber-400"}
            strokeDasharray={`${percentage}, 100`}
            strokeWidth="4"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
      </div>

      <span className="text-[11px] font-black tracking-wider">
        ⏳ {seconds}s
      </span>

      <span className="text-[10px] uppercase font-bold tracking-tight text-white/80 hidden sm:inline">
        {isUrgent ? "¡Tira ya!" : "Tu Turno"}
      </span>
    </div>
  );
}
