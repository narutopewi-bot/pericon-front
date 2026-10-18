"use client";

import React, { useState, useEffect } from "react";
import * as fonts from "@/components/fonts";

interface LeaderboardUser {
  id: number;
  username: string;
  wins: number;
  losses: number;
  coins: number;
  level: string;
  avatarUrl?: string;
  winRate: number;
}

interface DailyUser {
  rank: number;
  id: number;
  username: string;
  dailyWins: number;
  totalWins: number;
  coins: number;
  level: string;
  prizeCoins: number;
}

interface YesterdayWinner {
  rank: number;
  username: string;
  prizeCoins: number;
  winsCount: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "alltime">("daily");
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [dailyPlayers, setDailyPlayers] = useState<DailyUser[]>([]);
  const [yesterdayWinners, setYesterdayWinners] = useState<YesterdayWinner[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    if (activeTab === "daily") {
      fetch(`${apiUrl}/api/user/daily-leaderboard`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setDailyPlayers(data.players || []);
            setYesterdayWinners(data.yesterdayWinners || []);
            setSecondsRemaining(data.secondsRemaining || 0);
          }
        })
        .catch((err) => console.error("Error fetching daily leaderboard:", err))
        .finally(() => setLoading(false));
    } else {
      fetch(`${apiUrl}/api/user/leaderboard`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setPlayers(data))
        .catch((err) => console.error("Error fetching leaderboard:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, activeTab, apiUrl]);

  // Reloj de cuenta regresiva en vivo
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  if (!isOpen) return null;

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}h : ${minutes
      .toString()
      .padStart(2, "0")}m : ${seconds.toString().padStart(2, "0")}s`;
  };

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-[#1b1008] to-[#0c0704] border-2 border-amber-500/60 rounded-3xl p-4 md:p-6 max-w-lg w-full text-white shadow-2xl relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className={`${fonts.bowlbyOneSC.className} text-base md:text-lg text-amber-300 leading-tight`}>
                Ranking de Gallos
              </h2>
              <p className="text-[11px] text-amber-200/70">
                {activeTab === "daily" ? "Premios diarios en efectivo para el Top 3" : "Los 10 mejores jugadores históricos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#24140a] hover:bg-[#331c0e] flex items-center justify-center text-amber-300 font-bold border border-amber-500/30 transition active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-2xl border border-amber-500/30 my-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`py-2 px-3 rounded-xl text-xs font-black tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === "daily"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>🔥</span>
            <span>DIARIO (PREMIOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alltime")}
            className={`py-2 px-3 rounded-xl text-xs font-black tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === "alltime"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>⭐</span>
            <span>HISTÓRICO</span>
          </button>
        </div>

        {/* Pestaña: Ranking Diario */}
        {activeTab === "daily" && (
          <div className="space-y-2.5">
            {/* Cronómetro y Tarjeta de Premios */}
            <div className="bg-gradient-to-r from-amber-950/40 via-black/60 to-amber-950/40 border border-amber-500/40 rounded-2xl p-3 text-center shadow-lg">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                  <span>⏳</span> CIERRE DE HOY (11:59 PM VET):
                </span>
                <span className="font-mono text-xs font-black text-amber-400 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {formatCountdown(secondsRemaining)}
                </span>
              </div>

              {/* Podio de Premios */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <div className="bg-gradient-to-b from-amber-500/20 to-black/60 border border-amber-400/80 rounded-xl p-2 text-center">
                  <span className="text-sm block">🥇 1º Lugar</span>
                  <span className="text-base font-black text-amber-300 block">🪙 500</span>
                  <span className="text-[9px] text-amber-200/70 block">50% del Pozo</span>
                </div>
                <div className="bg-gradient-to-b from-slate-500/20 to-black/60 border border-slate-400/60 rounded-xl p-2 text-center">
                  <span className="text-sm block">🥈 2º Lugar</span>
                  <span className="text-base font-black text-slate-200 block">🪙 300</span>
                  <span className="text-[9px] text-slate-400 block">30% del Pozo</span>
                </div>
                <div className="bg-gradient-to-b from-amber-900/30 to-black/60 border border-amber-700/60 rounded-xl p-2 text-center">
                  <span className="text-sm block">🥉 3º Lugar</span>
                  <span className="text-base font-black text-amber-500 block">🪙 200</span>
                  <span className="text-[9px] text-amber-400/70 block">20% del Pozo</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                <span>🛡️ Mínimo 5 victorias para calificar</span>
                <span className="text-emerald-400 font-bold">🚫 Solo Humanos (Cero Bots)</span>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Jugadores */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 mt-1">
          {loading ? (
            <div className="text-center py-10 text-amber-300/60 text-xs">Cargando clasificación...</div>
          ) : activeTab === "daily" ? (
            dailyPlayers.length === 0 ? (
              <div className="text-center py-8 bg-black/40 border border-slate-800 rounded-2xl p-4">
                <span className="text-3xl block mb-1">🤠</span>
                <p className="text-xs font-bold text-amber-300">¡El podio de hoy está completamente abierto!</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Juega duelos hoy y sé el primero en reclamar las 500 monedas de premio.
                </p>
              </div>
            ) : (
              dailyPlayers.map((p, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500/25 to-amber-950/50 border-amber-400 shadow-md shadow-amber-500/10"
                        : idx === 1
                        ? "bg-[#20150d] border-slate-400/40"
                        : idx === 2
                        ? "bg-[#20150d] border-amber-700/40"
                        : "bg-[#1f1107] border-amber-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-base font-black ${isTop3 ? "text-xl" : "text-amber-300/60 text-xs font-mono w-5"}`}>
                        {getMedal(idx)}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {p.username}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold">
                            {p.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200/70">
                          <strong className="text-green-400 font-extrabold">{p.dailyWins} Victorias Hoy</strong>
                          {p.dailyWins >= 5 ? (
                            <span className="ml-2 text-[9px] bg-emerald-950 border border-emerald-500/50 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                              ✓ Calificado al Premio
                            </span>
                          ) : (
                            <span className="ml-2 text-[9px] text-slate-400">
                              (Faltan {5 - p.dailyWins} para calificar)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isTop3 && p.prizeCoins > 0 && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full block mb-0.5">
                          Premio: +{p.prizeCoins} Bs
                        </span>
                      )}
                      <span className="text-[11px] text-amber-300 font-bold block">
                        🪙 {p.coins.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : players.length === 0 ? (
            <div className="text-center py-10 text-amber-200/40 text-xs">Aún no hay partidas registradas.</div>
          ) : (
            players.map((p, idx) => {
              const isTop3 = idx < 3;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    idx === 0
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-950/40 border-amber-400 shadow-md shadow-amber-500/10"
                      : idx === 1
                      ? "bg-[#20150d] border-slate-400/40"
                      : idx === 2
                      ? "bg-[#20150d] border-amber-700/40"
                      : "bg-[#1f1107] border-amber-500/20 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-black ${isTop3 ? "text-xl" : "text-amber-300/60 text-xs font-mono w-5"}`}>
                      {getMedal(idx)}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {p.username}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold">
                          {p.level}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-200/60">
                        <span className="text-green-400 font-bold">{p.wins}V</span> - <span className="text-red-400 font-bold">{p.losses}D</span> ({p.winRate}%)
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-black text-amber-300 text-xs md:text-sm">
                    🪙 {p.coins.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-amber-500/30 text-center">
          <p className="text-[11px] text-amber-200/70">
            {activeTab === "daily"
              ? "⚡ Los premios se acreditan automáticamente a la medianoche en la billetera de los ganadores."
              : "¡Gana partidas en 1 vs 1 y 2 vs 2 para subir puestos en el ranking histórico!"}
          </p>
        </div>
      </div>
    </div>
  );
}
