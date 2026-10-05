'use client';

import React, { useState } from 'react';
import { Gift, Sparkles, X, Check, Flame, Trophy, Crown, AlertCircle } from 'lucide-react';

interface DailyStreakRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onCoinsClaimed?: (newBalance: number) => void;
}

export default function DailyStreakRouletteModal({
  isOpen,
  onClose,
  currentUser,
  onCoinsClaimed,
}: DailyStreakRouletteModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const [showRoulette, setShowRoulette] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
  const streak = currentUser?.dailyStreak || 1;

  if (!isOpen) return null;

  const streakRewards = [
    { day: 1, coins: 30, label: "30 🪙" },
    { day: 2, coins: 40, label: "40 🪙" },
    { day: 3, coins: 50, label: "50 🪙" },
    { day: 4, coins: 65, label: "65 🪙" },
    { day: 5, coins: 80, label: "80 🪙" },
    { day: 6, coins: 100, label: "100 🪙" },
    { day: 7, coins: 150, label: "🎰 Ruleta", isSpecial: true },
  ];

  const handleClaim = async () => {
    if (!currentUser?.id) return;
    try {
      setClaiming(true);
      setErrorMsg('');

      const res = await fetch(`${apiUrl}/api/user/claim-daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Ya has reclamado tu recompensa de hoy.');
      } else {
        setClaimedReward(data.bonus);
        if (data.isRoulette) {
          setShowRoulette(true);
          triggerRouletteSpin(data.bonus);
        }
        if (onCoinsClaimed && data.coins !== undefined) {
          onCoinsClaimed(data.coins);
        }
      }
    } catch {
      setErrorMsg('Error de conexión al reclamar.');
    } finally {
      setClaiming(false);
    }
  };

  const triggerRouletteSpin = (bonus: number) => {
    setIsSpinning(true);
    // Giro de 5 a 8 vueltas completas
    const randomExtraDeg = Math.floor(Math.random() * 360) + 1800;
    setSpinDeg(randomExtraDeg);
    setTimeout(() => {
      setIsSpinning(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-[#1b140b] via-[#100b05] to-[#0a0703] p-5 sm:p-6 text-white shadow-[0_0_50px_rgba(245,158,11,0.35)]">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Flame size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-300 uppercase">
                Racha de Asistencia Diaria
              </h2>
              <p className="text-[11px] text-amber-200/60 font-semibold">
                ¡Premios crecientes de 30 a 100 + Ruleta del Chivo!
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-xl p-1.5 text-amber-200/60 hover:bg-amber-500/10 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* 7 Días de Racha Visual */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
          {streakRewards.map((r) => {
            const isToday = r.day === ((streak - 1) % 7 + 1);
            return (
              <div
                key={r.day}
                className={`relative flex flex-col items-center justify-center rounded-2xl p-2.5 border transition-all ${
                  isToday
                    ? 'border-yellow-400 bg-gradient-to-b from-amber-500/30 to-amber-950/60 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105'
                    : r.isSpecial
                    ? 'border-amber-500/50 bg-amber-950/30'
                    : 'border-white/10 bg-black/40'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-200/60 uppercase mb-1">
                  Día {r.day}
                </span>
                
                <span className="text-xs font-black text-white">
                  {r.label}
                </span>

                {isToday && (
                  <span className="absolute -top-1.5 right-1 h-3 w-3 rounded-full bg-emerald-400 border border-black animate-ping" />
                )}
              </div>
            );
          })}
        </div>

        {/* Ruleta del Chivo Animada (Visual para Día 7) */}
        {showRoulette && (
          <div className="my-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <div className="relative h-44 w-44 rounded-full border-4 border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6)] flex items-center justify-center overflow-hidden bg-slate-950">
              <div
                className="absolute inset-0 rounded-full transition-all duration-[4000ms] ease-out"
                style={{
                  transform: `rotate(${spinDeg}deg)`,
                  background: 'conic-gradient(#f59e0b 0deg 60deg, #10b981 60deg 120deg, #3b82f6 120deg 180deg, #8b5cf6 180deg 240deg, #ec4899 240deg 300deg, #eab308 300deg 360deg)'
                }}
              />
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 border-2 border-yellow-400 text-yellow-300 font-black text-xs shadow-inner">
                🐐 150+
              </div>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
            </div>
            <span className="mt-2 text-xs font-bold text-yellow-300 animate-pulse">
              {isSpinning ? "🎰 ¡Girando la Ruleta del Chivo!..." : "🏆 ¡Premio de Ruleta Acreditado!"}
            </span>
          </div>
        )}

        {/* Mensaje de Éxito o Error */}
        {claimedReward && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <Check size={16} /> ¡Has reclamado exitosamente +🪙 {claimedReward} monedas de cortesía!
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300 font-medium flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Botón Principal de Reclamo */}
        <button
          onClick={handleClaim}
          disabled={claiming || !!claimedReward}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 py-3 px-4 text-xs sm:text-sm font-black uppercase text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {claiming ? 'Reclamando...' : claimedReward ? '¡Recompensa Reclamada!' : 'Reclamar Bono Diario'}
        </button>

      </div>
    </div>
  );
}
