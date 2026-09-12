"use client";

import React, { useState } from "react";
import PericonTutorialModal from "@/components/pericon-tutorial-modal";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { useRouter } from "next/navigation";

export default function TutorialPreviewPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [animStyle, setAnimStyle] = useState<"float" | "breathe" | "static">("float");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#120803] flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-diablo mix-blend-soft-light opacity-30"></div>

      <div className="z-10 flex flex-col items-center gap-4 text-center max-w-md">
        <Image src="/brand.svg" width={220} height={70} alt="Pericón" priority />
        <h1 className={`${fonts.bowlbyOneSC.className} text-xl text-amber-400 mt-2`}>
          Vista Previa del Tutorial
        </h1>
        <p className="text-xs text-amber-200/80">
          Animación sutil de la Cabrita sin ondas de micrófono ni movimientos bruscos al hablar.
        </p>

        {/* Selector de Ejemplo / Estilo de animación */}
        <div className="w-full bg-black/60 border border-amber-500/40 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
          <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">
            Elige el estilo de animación sutil:
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              onClick={() => setAnimStyle("float")}
              className={`py-1.5 px-2 rounded-lg font-bold transition border ${
                animStyle === "float"
                  ? "bg-amber-500 text-black border-amber-300 shadow"
                  : "bg-white/5 text-amber-200/80 border-white/10 hover:bg-white/10"
              }`}
            >
              1. Flotación Suave
            </button>
            <button
              onClick={() => setAnimStyle("breathe")}
              className={`py-1.5 px-2 rounded-lg font-bold transition border ${
                animStyle === "breathe"
                  ? "bg-amber-500 text-black border-amber-300 shadow"
                  : "bg-white/5 text-amber-200/80 border-white/10 hover:bg-white/10"
              }`}
            >
              2. Respiración Leve
            </button>
            <button
              onClick={() => setAnimStyle("static")}
              className={`py-1.5 px-2 rounded-lg font-bold transition border ${
                animStyle === "static"
                  ? "bg-amber-500 text-black border-amber-300 shadow"
                  : "bg-white/5 text-amber-200/80 border-white/10 hover:bg-white/10"
              }`}
            >
              3. Fijo / Estático
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setIsOpen(true)}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold rounded-xl shadow-lg hover:brightness-110 transition text-xs"
          >
            Abrir Tutorial 🐐
          </button>
          <button
            onClick={() => router.push("/desk")}
            className="px-4 py-2 bg-black/50 border border-amber-500/40 text-amber-300 rounded-xl hover:bg-black/80 transition text-xs"
          >
            Ir a la Mesa →
          </button>
        </div>
      </div>

      <PericonTutorialModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        animationStyle={animStyle}
      />
    </div>
  );
}
