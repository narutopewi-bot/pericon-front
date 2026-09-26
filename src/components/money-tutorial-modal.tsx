"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface MoneyTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "recharge" | "withdraw" | "responsible" | "flyers";
}

export default function MoneyTutorialModal({
  isOpen,
  onClose,
  initialTab = "recharge",
}: MoneyTutorialModalProps) {
  const [activeTab, setActiveTab] = useState<"recharge" | "withdraw" | "responsible" | "flyers">(initialTab);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedFlyer, setSelectedFlyer] = useState<string | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentStep(0);
    } else {
      stopSpeech();
    }
  }, [isOpen, initialTab]);

  const rechargeSteps = [
    {
      title: "1. Consulta los Datos Oficiales de Pago Móvil",
      icon: "📱",
      badge: "Paso 1",
      desc: "Entra a tu Billetera y pulsa en la pestaña 'Recarga'. Allí verás los datos bancarios oficiales del Pericón (Banco BNC / BDV, Cédula y Teléfono). Copia los datos con un solo toque.",
      highlight: "Tasa oficial: 1 Moneda = 1 Bolívar (Bs.)",
      actionText: "Copiar datos y abrir tu app de banco",
    },
    {
      title: "2. Realiza tu Pago Móvil desde tu Banco",
      icon: "🏦",
      badge: "Paso 2",
      desc: "Abre la aplicación de tu banco venezolano (Banesco, Banco de Venezuela, Mercantil, BNC, Provincial, etc.) y transfiere el monto que desees recargar (mínimo 800 Bs.). Guarda el número de referencia bancaria o capture de pantalla.",
      highlight: "Seguridad garantizada: Solo transfiere a los datos oficiales de la plataforma.",
      actionText: "Anota los últimos 4 dígitos o referencia completa",
    },
    {
      title: "3. Reporta el Pago en la Billetera",
      icon: "📝",
      badge: "Paso 3",
      desc: "Regresa a El Pericón, escribe el monto en Bolívares que transferiste, coloca el número de referencia y adjunta la foto o captura del comprobante. Pulsa el botón 'Reportar Pago Móvil'.",
      highlight: "Tu reporte se registra al instante con fecha y hora exacta.",
      actionText: "Listo para verificación de soporte",
    },
    {
      title: "4. ¡Monedas Acreditadas a tu Cuenta!",
      icon: "🎉",
      badge: "Paso 4",
      desc: "El equipo de administración valida la transacción y tus monedas se suman automáticamente a tu saldo. ¡Ya puedes entrar a las mesas de 1 vs 1 o 2 vs 2 a disputar partidas con dinero real!",
      highlight: "Tiempo promedio de acreditación: de 2 a 10 minutos.",
      actionText: "¡A jugar y ganar en las mesas!",
    },
  ];

  const withdrawSteps = [
    {
      title: "1. Ve a la Pestaña 'Retiro' en tu Billetera",
      icon: "💸",
      badge: "Paso 1",
      desc: "Cuando hayas acumulado ganancias jugando partidas, abre tu Billetera y selecciona la pestaña 'Retiro'. Podrás ver tu saldo disponible para cobrar.",
      highlight: "Monto mínimo de retiro: 1.500 monedas (1.500 Bs.)",
      actionText: "1 Moneda de ganancia = 1 Bolívar a tu cuenta",
    },
    {
      title: "2. Selecciona tu Banco e Ingresa tus Datos",
      icon: "🏛️",
      badge: "Paso 2",
      desc: "Selecciona el banco venezolano donde deseas recibir tu dinero (Banesco, Mercantil, Venezuela, BNC, Bancamiga, etc.). Escribe tu número de teléfono de Pago Móvil y tu Cédula de Identidad.",
      highlight: "Asegúrate de que los datos bancarios pertenezcan al titular.",
      actionText: "Verifica que el teléfono y cédula sean correctos",
    },
    {
      title: "3. Coloca el Monto de Monedas y Envía la Solicitud",
      icon: "📤",
      badge: "Paso 3",
      desc: "Escribe la cantidad de monedas que deseas retirar y presiona 'Solicitar Retiro de Bolívares'. El saldo se congelará temporalmente mientras el árbitro procesa tu transferencia.",
      highlight: "Tu solicitud entra en cola de pago prioritaria.",
      actionText: "Solicitud registrada con éxito",
    },
    {
      title: "4. Recibe tus Bolívares por Pago Móvil",
      icon: "📲",
      badge: "Paso 4",
      desc: "La administración efectúa el Pago Móvil directamente a tu cuenta bancaria y adjunta el número de referencia en tu historial. ¡Revisa tu banco y disfruta de tus ganancias bien jugadas!",
      highlight: "Rápido, seguro y transparente sin comisiones ocultas.",
      actionText: "¡Dinero real directo a tu cuenta bancaria!",
    },
  ];

  const speechTexts = {
    recharge:
      "Para recargar monedas en El Pericón: Paso uno: Entra a tu billetera y copia los datos oficiales de Pago Móvil. La tasa es de un bolívar por cada moneda. Paso dos: Desde la app de tu banco, haz la transferencia por el monto que quieras, con un mínimo de ochocientos bolívares, y guarda el número de referencia o captura. Paso tres: Vuelve al juego, coloca el monto, el número de referencia y adjunta el comprobante. Paso cuatro: El equipo valida el pago y tus monedas se acreditan en pocos minutos para jugar.",
    withdraw:
      "Para retirar tu dinero en El Pericón: Paso uno: Abre tu billetera y ve a la pestaña Retiro. El monto mínimo de retiro es de mil quinientos bolívares. Paso dos: Selecciona tu banco venezolano e ingresa tu teléfono de Pago Móvil y tu cédula de identidad. Paso tres: Escribe la cantidad de monedas a retirar y envía la solicitud. Paso cuatro: La administración te transfiere los bolívares directamente a tu cuenta por Pago Móvil rápido y seguro.",
    responsible:
      "Aviso muy importante de juego responsable y dinero real: En El Pericón se juegan partidas con dinero real. Recuerda que puedes ganar dinero, pero también puedes perderlo si tu rival juega mejor o tiene mejores cartas. Esta plataforma es exclusiva para mayores de dieciocho años. Juega con cabeza fría, establece tus límites y diviértete con responsabilidad.",
    flyers:
      "Aquí tienes los flyers promocionales oficiales de El Pericón para compartir en tus redes sociales, estados de WhatsApp e historias de Instagram. Muestran cómo recargar y retirar con Pago Móvil y el aviso de juego con dinero real para mayores de edad.",
  };

  const fallbackSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((v) => v.lang.startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const speakCurrentTab = () => {
    if (typeof window === "undefined") return;
    stopSpeech();

    if (activeTab === "responsible") {
      try {
        const audio = new Audio("/audio/mas_18.mp3");
        studioAudioRef.current = audio;
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          studioAudioRef.current = null;
        };
        audio.onerror = () => {
          fallbackSpeech(speechTexts.responsible);
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            fallbackSpeech(speechTexts.responsible);
          });
        }
        return;
      } catch (_) {
        fallbackSpeech(speechTexts.responsible);
        return;
      }
    }

    fallbackSpeech(speechTexts[activeTab]);
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined") {
      if (studioAudioRef.current) {
        try {
          studioAudioRef.current.pause();
          studioAudioRef.current.currentTime = 0;
        } catch (_) {}
        studioAudioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#1c1007] via-[#140b05] to-[#0c0603] border-2 border-amber-500/60 rounded-3xl shadow-[0_0_50px_rgba(217,119,6,0.35)] overflow-hidden text-white">
        
        {/* Header con Mascota y Botón Cerrar */}
        <div className="relative px-5 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-amber-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-400 p-1 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-2xl">🐐</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>Centro de Ayuda: Dinero y Billetera</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  OFICIAL
                </span>
              </h2>
              <p className="text-[11px] text-amber-200/70">
                Todo sobre recargas, retiros a Pago Móvil y juego responsable
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center text-sm font-black transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Barra de pestañas */}
        <div className="px-4 pt-3 pb-1 border-b border-amber-500/15 bg-black/40">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <button
              onClick={() => {
                setActiveTab("recharge");
                setCurrentStep(0);
                stopSpeech();
              }}
              className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "recharge"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50 border border-emerald-400"
                  : "bg-white/5 text-emerald-300/70 hover:bg-white/10 border border-white/5"
              }`}
            >
              <span>💳</span>
              <span>¿Cómo Recargar?</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("withdraw");
                setCurrentStep(0);
                stopSpeech();
              }}
              className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "withdraw"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-900/50 border border-blue-400"
                  : "bg-white/5 text-blue-300/70 hover:bg-white/10 border border-white/5"
              }`}
            >
              <span>💸</span>
              <span>¿Cómo Retirar?</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("responsible");
                stopSpeech();
              }}
              className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "responsible"
                  ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/50 border border-red-400"
                  : "bg-white/5 text-red-300/70 hover:bg-white/10 border border-white/5"
              }`}
            >
              <span>🔞</span>
              <span>Dinero Real (+18)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("flyers");
                stopSpeech();
              }}
              className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "flyers"
                  ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-neutral-950 font-black shadow-lg shadow-amber-900/50 border border-amber-300"
                  : "bg-white/5 text-amber-300/70 hover:bg-white/10 border border-white/5"
              }`}
            >
              <span>🖼️</span>
              <span>Flyers Oficiales</span>
            </button>
          </div>
        </div>

        {/* Controles de Voz Interactiva */}
        <div className="px-5 py-2 bg-black/60 border-b border-amber-500/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <span className="text-base animate-pulse">🔊</span>
            <span className="text-[11px] font-semibold text-amber-200/80">
              {isSpeaking ? "Narrando explicación..." : "Escuchar audio explicativo"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={speakCurrentTab}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow"
            >
              <span>{isSpeaking ? "🔄 Repetir" : "▶️ Escuchar"}</span>
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeech}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
              >
                ⏹️ Detener
              </button>
            )}
          </div>
        </div>

        {/* Contenido Principal con Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: ¿CÓMO RECARGAR? */}
          {activeTab === "recharge" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-emerald-300">
                    Guía Paso a Paso: Recarga de Monedas con Pago Móvil
                  </h3>
                  <p className="text-[11px] text-emerald-100/70">
                    Acredita saldo en segundos de forma 100% segura y automática
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold block">TASA FIJA</span>
                  <span className="text-xs font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    1 Moneda = 1 Bs.
                  </span>
                </div>
              </div>

              {/* Selector de Pasos */}
              <div className="grid grid-cols-4 gap-1.5">
                {rechargeSteps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`p-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center gap-1 ${
                      currentStep === idx
                        ? "bg-emerald-600/30 border-emerald-400 shadow-md shadow-emerald-900/40 scale-102"
                        : "bg-black/40 border-emerald-500/20 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="text-[10px] font-bold text-emerald-200">{s.badge}</span>
                  </button>
                ))}
              </div>

              {/* Detalle del Paso Seleccionado */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-black/80 to-emerald-950/30 border-2 border-emerald-500/40 shadow-lg space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center font-black text-sm">
                    {currentStep + 1}
                  </span>
                  <h4 className="text-sm font-black text-emerald-300">
                    {rechargeSteps[currentStep].title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {rechargeSteps[currentStep].desc}
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-200">
                  <span>💡</span>
                  <span>{rechargeSteps[currentStep].highlight}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-30 cursor-pointer"
                  >
                    ← Paso Anterior
                  </button>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Paso {currentStep + 1} de {rechargeSteps.length}
                  </span>
                  <button
                    disabled={currentStep === rechargeSteps.length - 1}
                    onClick={() => setCurrentStep((prev) => Math.min(rechargeSteps.length - 1, prev + 1))}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-30 cursor-pointer shadow"
                  >
                    Siguiente Paso →
                  </button>
                </div>
              </div>

              {/* Bancos Aceptados */}
              <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/20 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏛️</span> Bancos venezolanos admitidos para Pago Móvil:
                </span>
                <p className="text-[11px] text-amber-100/70">
                  Banco de Venezuela (BDV), BNC, Banesco, Mercantil, Provincial (BBVA), Bancamiga, Bancaribe, BFC, Banplus, Banco Bicentenario y todos los bancos del sistema interbancario nacional.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ¿CÓMO RETIRAR? */}
          {activeTab === "withdraw" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-blue-300">
                    Guía Paso a Paso: Retiro de Ganancias a tu Cuenta
                  </h3>
                  <p className="text-[11px] text-blue-100/70">
                    Cobra tus bolívares directamente por Pago Móvil sin complicaciones
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-400 font-bold block">MÍNIMO</span>
                  <span className="text-xs font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    1.500 Bs.
                  </span>
                </div>
              </div>

              {/* Selector de Pasos */}
              <div className="grid grid-cols-4 gap-1.5">
                {withdrawSteps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`p-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center gap-1 ${
                      currentStep === idx
                        ? "bg-blue-600/30 border-blue-400 shadow-md shadow-blue-900/40 scale-102"
                        : "bg-black/40 border-blue-500/20 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="text-[10px] font-bold text-blue-200">{s.badge}</span>
                  </button>
                ))}
              </div>

              {/* Detalle del Paso Seleccionado */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-black/80 to-blue-950/30 border-2 border-blue-500/40 shadow-lg space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400 text-blue-300 flex items-center justify-center font-black text-sm">
                    {currentStep + 1}
                  </span>
                  <h4 className="text-sm font-black text-blue-300">
                    {withdrawSteps[currentStep].title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {withdrawSteps[currentStep].desc}
                </p>
                <div className="p-2.5 rounded-xl bg-blue-900/30 border border-blue-500/30 flex items-center gap-2 text-[11px] text-blue-200">
                  <span>💡</span>
                  <span>{withdrawSteps[currentStep].highlight}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-30 cursor-pointer"
                  >
                    ← Paso Anterior
                  </button>
                  <span className="text-[11px] text-blue-400 font-bold">
                    Paso {currentStep + 1} de {withdrawSteps.length}
                  </span>
                  <button
                    disabled={currentStep === withdrawSteps.length - 1}
                    onClick={() => setCurrentStep((prev) => Math.min(withdrawSteps.length - 1, prev + 1))}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-30 cursor-pointer shadow"
                  >
                    Siguiente Paso →
                  </button>
                </div>
              </div>

              {/* Reglas de Retiro */}
              <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/20 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Tiempos de Entrega y Verificación:
                </span>
                <p className="text-[11px] text-amber-100/70">
                  Los retiros son procesados por el equipo de árbitros durante las 24 horas del día. Una vez aprobado, el Pago Móvil se refleja de inmediato en tu cuenta bancaria y queda registrado en tu historial de la plataforma.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: DINERO REAL Y JUEGO RESPONSABLE (+18) */}
          {activeTab === "responsible" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/70 via-black/80 to-red-950/50 border-2 border-red-500/60 shadow-xl flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-600/30 border-2 border-red-400 flex items-center justify-center text-2xl font-black text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  +18
                </div>
                <div>
                  <h3 className="text-base font-black text-red-300 uppercase tracking-wider">
                    Plataforma de Apuestas y Dinero Real
                  </h3>
                  <p className="text-xs text-amber-200/90 font-medium mt-1">
                    Acceso estrictamente reservado a mayores de edad
                  </p>
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                  <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 flex flex-col gap-1">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                      <span>💰</span> Puedes Ganar Dinero Real:
                    </span>
                    <p className="text-[11px] text-amber-100/80">
                      Tus habilidades con el Pericón, medir La Vida, cantar en el momento justo y dominar las 3 bazas te permitirán ganar las apuestas de la mesa y acumular bolívares en tu saldo.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 flex flex-col gap-1">
                    <span className="text-xs font-black text-red-300 flex items-center gap-1">
                      <span>⚠️</span> Puedes Perder Dinero Real:
                    </span>
                    <p className="text-[11px] text-red-100/80">
                      Al igual que en cualquier juego de cartas y azar, si tu oponente tiene mejor juego o cometes un error de cálculo, perderás las monedas apostadas.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-[11px] text-red-200 text-left w-full space-y-1.5">
                  <span className="font-extrabold text-red-300 block">🛡️ Principios de Juego Responsable:</span>
                  <ul className="list-disc list-inside space-y-1 text-red-100/90 text-[11px]">
                    <li>Nunca apuestes dinero destinado a necesidades básicas familiares.</li>
                    <li>Establece un presupuesto diario o semanal y respétalo sin excepciones.</li>
                    <li>Juega con mente despejada y no intentes recuperar pérdidas apostando impulsivamente.</li>
                    <li>El Pericón es entretenimiento competitivo: la diversión siempre debe ser lo primero.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FLYERS PROMOCIONALES OFICIALES */}
          {activeTab === "flyers" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-amber-300">
                    Flyers Oficiales de El Pericón
                  </h3>
                  <p className="text-[11px] text-amber-100/70">
                    Diseñados para compartir en WhatsApp, Instagram, Facebook y estados
                  </p>
                </div>
                <span className="text-xs bg-amber-500 text-neutral-950 font-black px-2.5 py-1 rounded-lg">
                  HD 4K
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Flyer 1 */}
                <div className="bg-black/60 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
                  <div
                    onClick={() => setSelectedFlyer("/flyer_recargas_retiros.jpg")}
                    className="relative aspect-[3/4] w-full rounded-xl overflow-hidden cursor-pointer group border border-amber-500/40"
                  >
                    <Image
                      src="/flyer_recargas_retiros.jpg"
                      alt="Flyer Recargas y Retiros"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-amber-500 text-black font-black text-xs px-3 py-1.5 rounded-xl shadow-lg">
                        🔍 Ver en Grande
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300">
                      Flyer 1: Recarga y Retira con Pago Móvil
                    </h4>
                    <p className="text-[10px] text-amber-100/70">
                      Explica el uso de Pago Móvil, monedas de oro y rapidez de cobro.
                    </p>
                  </div>
                  <a
                    href="/flyer_recargas_retiros.jpg"
                    download="Flyer_El_Pericon_Pago_Movil.jpg"
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black text-xs rounded-xl text-center shadow hover:brightness-110 transition cursor-pointer"
                  >
                    📥 Descargar Flyer 1
                  </a>
                </div>

                {/* Flyer 2 */}
                <div className="bg-black/60 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
                  <div
                    onClick={() => setSelectedFlyer("/flyer_apuestas_responsable.jpg")}
                    className="relative aspect-[3/4] w-full rounded-xl overflow-hidden cursor-pointer group border border-red-500/40"
                  >
                    <Image
                      src="/flyer_apuestas_responsable.jpg"
                      alt="Flyer Apuestas y Juego Responsable"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-red-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg">
                        🔍 Ver en Grande
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-300">
                      Flyer 2: Dinero Real y Juego Responsable +18
                    </h4>
                    <p className="text-[10px] text-amber-100/70">
                      Informa que se juega con dinero real y destaca el juego responsable.
                    </p>
                  </div>
                  <a
                    href="/flyer_apuestas_responsable.jpg"
                    download="Flyer_El_Pericon_Dinero_Real.jpg"
                    className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs rounded-xl text-center shadow hover:brightness-110 transition cursor-pointer"
                  >
                    📥 Descargar Flyer 2
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal de Imagen Ampliada (Lightbox) */}
        {selectedFlyer && (
          <div
            onClick={() => setSelectedFlyer(null)}
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-lg w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400">
              <Image src={selectedFlyer} alt="Flyer Ampliado" fill className="object-contain" />
              <button
                onClick={() => setSelectedFlyer(null)}
                className="absolute top-3 right-3 bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border border-white/30"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-amber-500/20 bg-black/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-amber-200/60 font-medium">
            El Pericón • Plataforma Criolla de Naipes Venezolanos
          </span>
          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer shadow"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
