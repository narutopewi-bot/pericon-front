"use client";

import React, { useEffect, useState } from "react";

interface TickerItem {
  id: string;
  type: string;
  text: string;
  timeAgo: string;
  icon: string;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { id: "fb_1", type: "payout", icon: "⚡", text: "Pago Móvil de 450 Bs. pagado con éxito a @carl*** (Banesco)", timeAgo: "hace 3 min" },
  { id: "fb_2", type: "win", icon: "🏆", text: "@tahur_99 ganó 380 monedas en Duelo 1v1", timeAgo: "hace 7 min" },
  { id: "fb_3", type: "payout", icon: "⚡", text: "Pago Móvil de 850 Bs. pagado con éxito a @tibi*** (Banco de Venezuela)", timeAgo: "hace 14 min" },
  { id: "fb_4", type: "challenge", icon: "🔥", text: "Nuevo reto de 200 monedas abierto en Sala Carora", timeAgo: "hace 19 min" },
  { id: "fb_5", type: "payout", icon: "⚡", text: "Pago Móvil de 1.200 Bs. pagado con éxito a @migu*** (Mercantil)", timeAgo: "hace 25 min" },
  { id: "fb_6", type: "notice", icon: "🏆", text: "Torneo Dominical de las 8:00 PM: 1.500 Bs. garantizados", timeAgo: "anuncio oficial" },
  { id: "fb_7", type: "win", icon: "🏆", text: "@gallo_giro ganó 600 monedas cantando Pericón limpio", timeAgo: "hace 31 min" },
];

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

    fetch(`${apiUrl}/api/feed/ticker`)
      .then((res) => {
        if (!res.ok) throw new Error("Ticker error");
        return res.json();
      })
      .then((data: TickerItem[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      })
      .catch(() => {
        // Fallback already in place
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIndex] || items[0];

  return (
    <div className="w-full max-w-full overflow-hidden bg-gradient-to-r from-black/95 via-neutral-900/90 to-black/95 border-b border-amber-500/30 px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-md z-40 relative select-none">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 overflow-hidden text-xs">
        {/* Badge en vivo */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-red-950/80 border border-red-500/40 px-1.5 sm:px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-red-300 tracking-wider">EN VIVO</span>
        </div>

        {/* Noticia rotativa */}
        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-1.5">
          <span className="text-xs sm:text-sm shrink-0">{current.icon}</span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate block min-w-0 flex-1">
            {current.text}
          </span>
          <span className="text-[10px] text-amber-400/80 shrink-0 hidden sm:inline-block">
            • {current.timeAgo}
          </span>
        </div>

        {/* Indicador de posición */}
        <div className="shrink-0 text-[10px] text-slate-500 font-mono hidden md:block">
          {currentIndex + 1}/{items.length}
        </div>
      </div>
    </div>
  );
}
