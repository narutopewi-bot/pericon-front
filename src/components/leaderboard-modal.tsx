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

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch(`${apiUrl}/api/user/leaderboard`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPlayers(data))
      .catch((err) => console.error("Error fetching leaderboard:", err))
      .finally(() => setLoading(false));
  }, [isOpen, apiUrl]);

  if (!isOpen) return null;

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-5 md:p-6 max-w-lg w-full text-white shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className={`${fonts.bowlbyOneSC.className} text-base md:text-lg text-amber-300 leading-tight`}>
                Ranking de Campeones
              </h2>
              <p className="text-[11px] text-amber-200/60">Los 10 mejores jugadores de El Pericón</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#24140a] hover:bg-[#331c0e] flex items-center justify-center text-amber-300 font-bold border border-amber-500/30"
          >
            ✕
          </button>
        </div>

        {/* Lista de Jugadores */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 mt-2">
          {loading ? (
            <div className="text-center py-10 text-amber-300/60 text-xs">Cargando clasificación...</div>
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
        <div className="pt-3 border-t border-amber-500/30 text-center">
          <p className="text-[11px] text-amber-200/60">
            ¡Gana partidas en 1 vs 1 y 2 vs 2 para subir puestos en el ranking semanal!
          </p>
        </div>
      </div>
    </div>
  );
}
