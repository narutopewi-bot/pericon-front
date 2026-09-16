"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { X, ArrowLeft, Bot, Users, Lock, Sparkles } from "lucide-react";

interface DuelmodeProps {
  onMode: (mode: string, credits: string) => void;
  duelToggle: () => void;
}

const Duelmode: React.FC<DuelmodeProps> = ({ onMode, duelToggle }) => {
  const [selectedValue, setSelectedValue] = React.useState<string>("1 vs 1");
  const [selectedCredits, setSelectedCredits] = React.useState<string>("100");

  const betOptions = [
    { value: "100", label: "100", badge: "Bronce" },
    { value: "150", label: "150", badge: "Plata" },
    { value: "200", label: "200", badge: "Oro" },
    { value: "500", label: "500", badge: "Élite" },
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-[#251408]/95 via-[#1a0e06]/98 to-[#100803] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative text-white">
      {/* Cabecera del Modal */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-lg shadow-md border border-blue-300/40">
            ⚔️
          </div>
          <div className="text-left">
            <h3 className={`text-base sm:text-lg text-white font-extrabold ${fonts.bowlbyOneSC.className} tracking-wide`}>
              CONFIGURAR DUELO
            </h3>
            <p className="text-[10px] sm:text-xs text-amber-300/80 font-medium">
              Elige tu modalidad y fichas de apuesta
            </p>
          </div>
        </div>
        <button
          onClick={duelToggle}
          className="w-8 h-8 rounded-full bg-black/50 hover:bg-red-600/80 border border-amber-500/30 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Selección de Modalidad */}
      <div className="mt-4 text-left">
        <label className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-2 flex items-center gap-1.5">
          <span>1. Modalidad de Juego</span>
        </label>
        
        <div className="grid grid-cols-2 gap-2.5">
          {/* Opción 1: Solitario */}
          <button
            type="button"
            onClick={() => setSelectedValue("Solitario")}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 relative border-2 ${
              selectedValue === "Solitario"
                ? "border-amber-400 bg-gradient-to-b from-amber-600/30 to-amber-950/60 shadow-lg shadow-amber-500/20"
                : "border-slate-800 bg-black/40 hover:border-slate-700 text-slate-400"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${
              selectedValue === "Solitario" ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300"
            }`}>
              🤖
            </div>
            <span className={`text-xs font-black tracking-wide ${selectedValue === "Solitario" ? "text-white" : "text-slate-300"}`}>
              SOLITARIO
            </span>
            <span className="text-[9px] text-amber-300/90 font-semibold">vs Computadora</span>
          </button>

          {/* Opción 2: 1 vs 1 */}
          <button
            type="button"
            onClick={() => setSelectedValue("1 vs 1")}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 relative border-2 ${
              selectedValue === "1 vs 1"
                ? "border-blue-400 bg-gradient-to-b from-blue-600/30 to-blue-950/60 shadow-lg shadow-blue-500/20"
                : "border-slate-800 bg-black/40 hover:border-slate-700 text-slate-400"
            }`}
          >
            <div className="absolute -top-2 right-2 bg-blue-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-300">
              EN VIVO
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${
              selectedValue === "1 vs 1" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"
            }`}>
              👥
            </div>
            <span className={`text-xs font-black tracking-wide ${selectedValue === "1 vs 1" ? "text-white" : "text-slate-300"}`}>
              1 CONTRA 1
            </span>
            <span className="text-[9px] text-blue-300/90 font-semibold">Multijugador</span>
          </button>

          {/* Opción 3: 2 vs 2 (Multijugador Salas) */}
          <button
            type="button"
            onClick={() => setSelectedValue("2 vs 2")}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 relative border-2 ${
              selectedValue === "2 vs 2"
                ? "border-purple-400 bg-gradient-to-b from-purple-600/30 to-purple-950/60 shadow-lg shadow-purple-500/20"
                : "border-slate-800 bg-black/40 hover:border-slate-700 text-slate-400"
            }`}
          >
            <div className="absolute -top-2 right-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-300">
              4 USUARIOS
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${
              selectedValue === "2 vs 2" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"
            }`}>
              🤝
            </div>
            <span className={`text-xs font-black tracking-wide ${selectedValue === "2 vs 2" ? "text-white" : "text-slate-300"}`}>
              2 CONTRA 2
            </span>
            <span className="text-[9px] text-purple-300/90 font-semibold">En Parejas (Aleatorio)</span>
          </button>

          {/* Opción 4: 2 vs 2 CPU (Práctica) */}
          <button
            type="button"
            onClick={() => setSelectedValue("2 vs 2 CPU")}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 relative border-2 ${
              selectedValue === "2 vs 2 CPU"
                ? "border-emerald-400 bg-gradient-to-b from-emerald-600/30 to-emerald-950/60 shadow-lg shadow-emerald-500/20"
                : "border-slate-800 bg-black/40 hover:border-slate-700 text-slate-400"
            }`}
          >
            <div className="absolute -top-2 right-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-300">
              PRÁCTICA IA
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${
              selectedValue === "2 vs 2 CPU" ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-300"
            }`}>
              🤖
            </div>
            <span className={`text-xs font-black tracking-wide ${selectedValue === "2 vs 2 CPU" ? "text-white" : "text-slate-300"}`}>
              2 VS 2 CPU
            </span>
            <span className="text-[9px] text-emerald-300/90 font-semibold">Tú + 3 Bots</span>
          </button>
        </div>
      </div>

      {/* 2. Selección de Apuesta */}
      <div className="mt-4 text-left">
        <label className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-2 flex items-center justify-between">
          <span>2. Ficha de Apuesta por Jugador</span>
          <span className="text-[10px] text-amber-300 font-normal">Ganador se lleva el 80%</span>
        </label>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {betOptions.map((bet) => {
            const isSelected = selectedCredits === bet.value;
            return (
              <button
                key={bet.value}
                type="button"
                onClick={() => setSelectedCredits(bet.value)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 border-2 ${
                  isSelected
                    ? "border-yellow-300 bg-gradient-to-tr from-amber-600 to-yellow-400 text-black shadow-lg shadow-yellow-500/30 scale-105"
                    : "border-amber-600/30 bg-black/40 text-amber-200 hover:border-amber-500/60"
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <span className="text-xs">🪙</span>
                  <span className={`text-sm sm:text-base font-black ${isSelected ? "text-black" : "text-amber-300"}`}>
                    {bet.value}
                  </span>
                </div>
                <span className={`text-[8px] font-extrabold uppercase tracking-wider ${
                  isSelected ? "text-amber-950" : "text-slate-400"
                }`}>
                  {bet.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón de Iniciar Partida */}
      <div className="mt-5">
        <Button
          type="button"
          onClick={() => onMode(selectedValue, selectedCredits)}
          className={`w-full py-4 h-auto rounded-2xl bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 hover:brightness-110 active:scale-95 text-black font-black text-sm sm:text-base uppercase tracking-wider border-2 border-green-200 shadow-xl shadow-green-500/25 transition flex items-center justify-center gap-2 ${fonts.bowlbyOneSC.className}`}
        >
          <Sparkles size={18} />
          <span>{selectedValue === "2 vs 2 CPU" ? "¡JUGAR 2 VS 2 VS COMPUTADORA!" : selectedValue === "2 vs 2" ? "¡BUSCAR PARTIDA 2 VS 2!" : `¡JUGAR ${selectedValue.toUpperCase()}!`}</span>
        </Button>
      </div>
    </div>
  );
};

export default Duelmode;
