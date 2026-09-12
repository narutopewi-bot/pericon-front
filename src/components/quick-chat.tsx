"use client";

import React, { useState } from "react";
import { playChatPopSound } from "@/lib/soundEffects";

export const LLANERO_QUICK_PHRASES = [
  "¡Buenas cartas, compadre!",
  "¡Te tengo en la mira!",
  "¡No me peles esa baza!",
  "¡Abre los ojos, compañero!",
  "¡Se te cayó la tumba!",
  "¡Eso es suerte de novato!",
  "¡Bien jugao!",
  "¡A llorar pal valle!",
];

interface QuickChatProps {
  onSendPhrase: (phrase: string) => void;
  className?: string;
}

export function QuickChatButton({ onSendPhrase, className = "" }: QuickChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (phrase: string) => {
    playChatPopSound();
    onSendPhrase(phrase);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 sm:p-2.5 rounded-2xl bg-black/60 hover:bg-black/90 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10 active:scale-95 transition-all flex items-center gap-1.5"
        title="Mensajes rápidos llaneros"
      >
        <span className="text-base sm:text-lg leading-none">💬</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">
          Frases
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-full mb-2 right-0 w-64 sm:w-72 bg-[#1b0f06] border-2 border-amber-500/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 border-b border-amber-500/30 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                🤠 Frases Llaneras
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-amber-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
              {LLANERO_QUICK_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(phrase)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-100 hover:text-amber-950 hover:bg-gradient-to-r hover:from-amber-400 hover:to-yellow-400 rounded-xl transition-all duration-150 flex items-center gap-2"
                >
                  <span className="text-amber-400 text-xs">⚡</span>
                  <span className="truncate">{phrase}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface QuickChatBubbleProps {
  phrase: string;
  senderName: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function QuickChatBubble({
  phrase,
  senderName,
  className = "",
}: QuickChatBubbleProps) {
  return (
    <div
      className={`z-50 animate-in zoom-in-90 fade-in slide-in-from-bottom-2 duration-200 pointer-events-none ${className}`}
    >
      <div className="relative bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-600 text-amber-950 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-2xl shadow-2xl border-2 border-white/80 max-w-[220px] text-center drop-shadow-xl">
        <div className="text-[9px] uppercase tracking-wider text-amber-950/70 font-extrabold -mb-0.5 truncate">
          {senderName}
        </div>
        <div className="leading-snug drop-shadow-sm">{phrase}</div>
        {/* Triangulito de la burbuja */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-amber-600"></div>
      </div>
    </div>
  );
}
