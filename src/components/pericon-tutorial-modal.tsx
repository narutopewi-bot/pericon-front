"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { playSynthSound, playVoiceAudio } from "@/lib/gameEffects";

interface PericonTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  animationStyle?: "float" | "breathe" | "static";
}

export default function PericonTutorialModal({
  isOpen,
  onClose,
  animationStyle = "float",
}: PericonTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [interactiveChoice, setInteractiveChoice] = useState<string | null>(null);
  const speechTimeoutRef = useRef<any>(null);

  const steps = [
    {
      stepNumber: 1,
      tag: "Regla Fundamental",
      title: "El Reparto y La Vida",
      dialogue:
        "¡Hola compadre! Soy el Chivo del Pericón. En cada mano recibes 3 cartas y se destapa una carta especial en el centro llamada 'La Vida'. ¡Cualquier carta del palo de La Vida es un triunfo y mata a cualquier otro palo!",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative border-2 border-amber-400 rounded-lg p-1 bg-amber-950/60 shadow-lg shadow-amber-500/20 transform -rotate-3 hover:scale-105 transition">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                👑 La Vida
              </span>
              <Image src="/cards/1_gold.png" width={65} height={90} alt="La Vida" className="rounded mt-1" />
            </div>
            <div className="text-amber-300 font-black text-xl">VS</div>
            <div className="flex gap-1">
              <div className="opacity-70 transform rotate-2">
                <Image src="/cards/12_cups.png" width={55} height={78} alt="Rey de Copas" className="rounded" />
              </div>
              <div className="opacity-70 transform -rotate-2">
                <Image src="/cards/7_swords.png" width={55} height={78} alt="Siete de Espadas" className="rounded" />
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-200 text-center font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
            ¡El 1 de Oro es <strong className="text-amber-400">Vida</strong>, por lo tanto le gana al Rey y a cualquier carta de otro palo!
          </p>
        </div>
      ),
    },
    {
      stepNumber: 2,
      tag: "Mecánica Principal",
      title: "Las 3 Bazas (Dos de Tres)",
      dialogue:
        "Cada mano se juega en 3 enfrentamientos o 'bazas'. ¡El primero que gane 2 de las 3 bazas se lleva la ronda! El jugador que gana una baza sale tirando en la siguiente. Si hay empate en la primera, el que gane la segunda baza se lo lleva todo.",
      visual: (
        <div className="w-full max-w-[280px] bg-black/40 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-emerald-300 font-bold">Baza 1: Ganaste tú</span>
            <span className="text-emerald-400 font-extrabold">✓ 1 - 0</span>
          </div>
          <div className="flex justify-between items-center bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-rose-300 font-bold">Baza 2: Ganó el rival</span>
            <span className="text-rose-400 font-extrabold">✗ 1 - 1</span>
          </div>
          <div className="flex justify-between items-center bg-amber-950/80 border border-amber-500 px-3 py-2 rounded-lg text-xs animate-pulse">
            <span className="text-amber-200 font-black">Baza 3: ¡Decisiva!</span>
            <span className="text-amber-400 font-black">⚔️ EL QUE GANE LLEVA LA RONDA</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 3,
      tag: "El Reto",
      title: "¡Pedir 3, 6 y 9 Piedras!",
      dialogue:
        "Por defecto, cada mano vale 1 sola piedra. Pero si tienes cartas bravas, pulsa 'Pedir' para subir la apuesta a 3 piedras. Si el rival acepta, solo él tiene derecho a revirar a 6 piedras. ¡Nadie puede aumentarse la apuesta a sí mismo!",
      visual: (
        <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
          <div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-black text-xs px-4 py-1.5 rounded-full shadow-lg border border-yellow-300 animate-bounce">
            🗣️ ¡DAME TRES!
          </div>
          <div className="flex gap-2 w-full justify-center">
            <button
              onClick={() => {
                setInteractiveChoice("acepto");
                playVoiceAudio("tutorial_reto_acepto", "¡Reto aceptado! El ganador se llevará tres piedras completas.");
                playSynthSound("win");
              }}
              className={`flex-1 text-xs py-2 px-3 rounded-xl font-bold transition border ${
                interactiveChoice === "acepto"
                  ? "bg-emerald-600 text-white border-emerald-300 shadow-md shadow-emerald-500/30"
                  : "bg-black/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950"
              }`}
            >
              ✓ ¡Acepto! (Juegan por 3)
            </button>
            <button
              onClick={() => {
                setInteractiveChoice("rechazo");
                playVoiceAudio("tutorial_reto_rechazo", "¡Cobarde! El retador se anota una piedra gratis sin jugar.");
                playSynthSound("reject");
              }}
              className={`flex-1 text-xs py-2 px-3 rounded-xl font-bold transition border ${
                interactiveChoice === "rechazo"
                  ? "bg-rose-600 text-white border-rose-300 shadow-md shadow-rose-500/30"
                  : "bg-black/40 text-rose-300 border-rose-500/40 hover:bg-rose-950"
              }`}
            >
              ✗ ¡No quiero! (Cede 1 pt)
            </button>
          </div>
          {interactiveChoice && (
            <p className="text-[11px] text-amber-200 text-center">
              {interactiveChoice === "acepto"
                ? "¡Reto aceptado! El ganador se llevará 3 piedras completas."
                : "¡Cobarde! El retador se anota 1 piedra gratis sin jugar."}
            </p>
          )}
        </div>
      ),
    },
    {
      stepNumber: 4,
      tag: "Jugada Maestra",
      title: "¡La Cogía! (+3 piedras directas)",
      dialogue:
        "¡Cuidado con esta trampa clásica! Si en una baza se cruzan el 10 de Oro y el As de Oro entre rivales —ya sea que mates el 10 con el As o que salgas con el As y obligues al contrario a soltar su 10 por pelado—, ¡se canta 'La Cogía'! Quien jugó el As de Oro se lleva 3 piedras automáticas.",
      visual: (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-[10px] text-rose-300 block mb-1">Rival sale con:</span>
              <div className="border border-rose-400/50 rounded-lg p-0.5 bg-black/40 shadow">
                <Image src="/cards/10_gold.png" width={60} height={85} alt="10 de Oro" className="rounded" />
              </div>
              <span className="text-[10px] text-amber-200 font-bold block mt-1">10 de Oro (Sota)</span>
            </div>
            <div className="text-amber-400 font-black text-2xl animate-pulse">⚡</div>
            <div className="text-center relative">
              <span className="text-[10px] text-emerald-300 block mb-1 font-bold">¡Tú lo matas con!</span>
              <div className="ring-2 ring-amber-400 rounded-lg p-0.5 bg-amber-950/60 shadow-lg shadow-amber-500/30">
                <Image src="/cards/1_gold.png" width={60} height={85} alt="As de Oro" className="rounded" />
              </div>
              <span className="text-[10px] text-amber-300 font-black block mt-1">As de Oro (1 de Oro)</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow border border-yellow-300 mt-1 animate-pulse">
            🔥 ¡LA COGÍA! (+3 piedras de premio)
          </div>
        </div>
      ),
    },
    {
      stepNumber: 5,
      tag: "Zona de Peligro",
      title: "La Tumba (-3 piedras si pierdes)",
      dialogue:
        "Cuando alcanzas 9 piedras (o vas perdiendo y caes en 8), entras en 'La Tumba'. Al recibir tus cartas, el juego te pregunta si deseas jugar. Si dices que no, cedes 1 piedra; pero si aceptas y pierdes las dos de tres, ¡te descuentan 3 piedras de castigo!",
      visual: (
        <div className="w-full max-w-[280px] bg-red-950/70 border-2 border-red-500/80 rounded-xl p-3 flex flex-col items-center gap-2 text-center shadow-lg shadow-red-900/40">
          <div className="flex items-center gap-2 text-red-400 font-black text-sm">
            <span>🪦</span>
            <span className="uppercase tracking-wider">¡ESTÁS EN TUMBA! (9 pts)</span>
          </div>
          <p className="text-xs text-red-200">
            ¿Deseas jugar esta ronda con tus cartas?
          </p>
          <div className="flex gap-2 w-full mt-1">
            <div className="flex-1 bg-red-900/60 border border-red-400/40 text-red-200 text-[11px] p-1.5 rounded font-medium">
              Aceptas y pierdes: <br /><strong className="text-red-300 font-bold">-3 piedras</strong>
            </div>
            <div className="flex-1 bg-amber-900/40 border border-amber-400/40 text-amber-200 text-[11px] p-1.5 rounded font-medium">
              Rechazas jugar: <br /><strong className="text-amber-300 font-bold">-1 piedra</strong>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 6,
      tag: "El Desenlace",
      title: "¡El Obligado y la Corona!",
      dialogue:
        "¡La batalla final! Cuando ambos jugadores alcanzan 9 o más puntos a la vez, se activa 'El Obligado'. No hay cantos ni apuestas: esa última mano define la partida completa. ¡El que gane las dos de tres se corona campeón!",
      visual: (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl animate-bounce">👑</div>
          <Image src="/brand.svg" width={180} height={50} alt="Pericón" className="h-auto" />
          <p className="text-xs text-amber-200 max-w-[260px] bg-black/50 border border-amber-500/40 p-2 rounded-lg">
            ¡Ya tienes todas las mañas para ser un maestro del Pericón! Recuerda cuidar La Vida, medir a tu rival y cantar en el momento justo.
          </p>
        </div>
      ),
    },
    {
      stepNumber: 7,
      tag: "Aviso Legal y Responsabilidad",
      title: "🔞 Juego Solo para Mayores de 18 Años",
      dialogue:
        "¡Aviso muy importante! En Pericón se disputan partidas con apuestas y dinero real. Por regulaciones legales y juego responsable, esta plataforma es de acceso exclusivo para mayores de 18 años. Juega con prudencia, cabeza fría y diviértete con responsabilidad.",
      visual: (
        <div className="w-full max-w-[290px] bg-gradient-to-b from-red-950/80 via-black/80 to-red-950/60 border-2 border-red-500/70 rounded-xl p-3 flex flex-col items-center gap-2 text-center shadow-lg shadow-red-900/40">
          <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-red-400 bg-red-600/30 text-red-300 font-black text-xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            +18
          </div>
          <div className="text-xs font-black text-red-300 uppercase tracking-wider">
            Juego Exclusivo para Mayores de 18 Años
          </div>
          <p className="text-[11px] text-amber-100/90 leading-relaxed">
            Plataforma con transacciones y apuestas en <strong className="text-amber-400 font-bold">dinero real</strong>. El registro y participación están estrictamente reservados a mayores de edad.
          </p>
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg px-3 py-1 text-[10px] text-red-200 font-semibold flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Juego Responsable • Dinero Real</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];

  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (tutorialAudioRef.current) {
      try {
        tutorialAudioRef.current.pause();
        tutorialAudioRef.current.currentTime = 0;
      } catch (_) {}
      tutorialAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    setIsSpeaking(false);
  };

  const fallbackSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("es") || v.lang.toLowerCase().includes("spa")
      );
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);

      const approxDurationMs = Math.max(3000, (text.split(" ").length / 2.5) * 1000);
      speechTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, approxDurationMs);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string, stepNumber: number = current.stepNumber) => {
    if (typeof window === "undefined") return;
    stopAllAudio();

    // Pasos 1 al 6: voz real de estudio del Chivo de Carora
    if (stepNumber >= 1 && stepNumber <= 6) {
      try {
        const audio = new Audio(`/audio/tutorial_paso_${stepNumber}.mp3`);
        tutorialAudioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
        };
        audio.onended = () => {
          setIsSpeaking(false);
          tutorialAudioRef.current = null;
        };
        audio.onerror = () => {
          fallbackSpeech(text);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            fallbackSpeech(text);
          });
        }
        return;
      } catch (e) {
        fallbackSpeech(text);
        return;
      }
    }

    // Paso 7 (Aviso legal +18) u otros textos
    fallbackSpeech(text);
  };

  // Efecto para hablar automáticamente al cambiar de paso si autoVoice está activo
  useEffect(() => {
    if (!isOpen) {
      stopAllAudio();
      return;
    }

    if (autoVoice) {
      const timer = setTimeout(() => {
        speakText(current.dialogue, current.stepNumber);
      }, 400);
      return () => {
        clearTimeout(timer);
        stopAllAudio();
      };
    } else {
      stopAllAudio();
    }
  }, [currentStep, isOpen, autoVoice]);

  const toggleSpeak = () => {
    if (isSpeaking) {
      stopAllAudio();
    } else {
      speakText(current.dialogue, current.stepNumber);
    }
  };

  const handleNext = () => {
    stopAllAudio();
    setInteractiveChoice(null);
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      playSynthSound("canto");
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    stopAllAudio();
    setInteractiveChoice(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      playSynthSound("canto");
    }
  };

  const handleFinish = () => {
    stopAllAudio();
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      localStorage.setItem("pericon_tutorial_seen", "true");
    }
    onClose();
  };

  if (!isOpen) return null;

  const animClass =
    animationStyle === "breathe"
      ? "chivo-breathe"
      : animationStyle === "static"
      ? "chivo-static"
      : "chivo-float";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 overflow-y-auto">
      {/* Estilos para la animación sutil del Chivo */}
      <style jsx>{`
        @keyframes chivoFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3.5px);
          }
        }
        @keyframes chivoBreathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.025);
          }
        }
        .chivo-float {
          animation: chivoFloat 3.5s ease-in-out infinite;
        }
        .chivo-breathe {
          animation: chivoBreathe 3.5s ease-in-out infinite;
        }
        .chivo-static {
          transform: none;
        }
      `}</style>

      <div className="relative w-full max-w-md bg-gradient-to-b from-[#2a1708] via-[#1a0f05] to-[#0d0702] border-2 border-amber-500/60 rounded-3xl p-5 text-white shadow-2xl shadow-amber-600/30 flex flex-col items-center">
        
        {/* Cabecera con Logo, Modo Voz y Cerrar */}
        <div className="flex justify-between items-center w-full mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-widest">
              Paso {current.stepNumber} de {steps.length}
            </span>
            <span className="text-[11px] text-amber-400 font-semibold">{current.tag}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoVoice(!autoVoice)}
              title={autoVoice ? "Voz automática activada" : "Voz automática desactivada"}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition font-bold ${
                autoVoice
                  ? "bg-amber-500/30 text-amber-300 border-amber-400"
                  : "bg-white/5 text-white/40 border-white/20"
              }`}
            >
              {autoVoice ? "🔊 Voz ON" : "🔇 Voz OFF"}
            </button>
            <button
              onClick={handleFinish}
              title="Saltar tutorial"
              className="text-white/60 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sección de la Mascota: El Chivo con Diálogo */}
        <div className="flex items-center gap-3 w-full my-3">
          
          {/* Contenedor del Chivo (Animación suave y sutil) */}
          <div className="relative flex-shrink-0 flex flex-col items-center">
            <div
              onClick={toggleSpeak}
              title="Toca para escuchar"
              className={`w-20 h-20 xl:w-22 xl:h-22 relative cursor-pointer filter drop-shadow-md ${animClass} hover:opacity-95 transition`}
            >
              <Image src="/goat.svg" fill alt="El Chivo del Pericón" className="object-contain" priority />
            </div>

            {/* Botón de voz simple y sobrio */}
            <button
              onClick={toggleSpeak}
              className={`mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition ${
                isSpeaking
                  ? "bg-amber-500 text-black border-amber-400"
                  : "bg-black/50 text-amber-300/90 border-amber-500/30 hover:bg-black/80"
              }`}
            >
              {isSpeaking ? "⏹️ Detener" : "🔊 Escuchar"}
            </button>
          </div>

          {/* Globo de Diálogo Cómic Elegante */}
          <div
            className={`relative flex-1 bg-black/40 border rounded-2xl p-3.5 backdrop-blur-md shadow-lg text-amber-100 text-xs leading-relaxed transition-all duration-300 ${
              isSpeaking
                ? "border-amber-400/80 bg-amber-950/20"
                : "border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-amber-300 font-bold tracking-wide">
                El Chivo del Pericón
              </span>
              {isSpeaking && (
                <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-2 py-0.2 rounded-full border border-amber-400/20">
                  Narrando
                </span>
              )}
            </div>
            <p className={`${fonts.almarai.className} font-medium text-amber-50/95`}>{current.dialogue}</p>
          </div>
        </div>

        {/* Título del Paso */}
        <h3 className={`${fonts.bowlbyOneSC.className} text-base xl:text-lg text-amber-300 text-center mt-1 mb-2`}>
          {current.title}
        </h3>

        {/* Demostración Visual / Interactiva */}
        <div className="w-full min-h-[140px] flex items-center justify-center bg-black/30 border border-amber-500/20 rounded-2xl p-3 my-1">
          {current.visual}
        </div>

        {/* Paginador de bolitas */}
        <div className="flex items-center gap-1.5 my-3">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStep(idx);
                setInteractiveChoice(null);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep ? "w-6 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Botones de Navegación */}
        <div className="flex items-center justify-between w-full gap-3 mt-1">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            ← Anterior
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className={`${fonts.bowlbyOneSC.className} flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-600/30 hover:shadow-amber-500/50 transition transform hover:scale-[1.02] active:scale-95`}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className={`${fonts.bowlbyOneSC.className} flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition transform hover:scale-[1.02] active:scale-95 animate-pulse`}
            >
              ¡Entendido, soy mayor de 18 y quiero jugar! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
