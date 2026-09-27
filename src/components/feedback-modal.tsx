"use client";

import React, { useState } from "react";
import * as fonts from "@/components/fonts";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: {
    id?: string | number;
    name?: string;
    email?: string;
  };
}

const CATEGORIES = [
  { id: "Sugerencia", label: "💡 Sugerencia para agregar", desc: "¿Qué función o carta te gustaría ver?" },
  { id: "Experiencia", label: "🏆 Mi experiencia de juego", desc: "¿Cómo te ha ido jugando y apostando?" },
  { id: "Reglas", label: "🃏 Reglas y Jugabilidad", desc: "Comentarios sobre las manos o cantes" },
  { id: "Recargas", label: "💰 Recargas y Retiros", desc: "Opinión sobre pagos y cobros en Bs." },
  { id: "General", label: "💬 Felicitaciones / General", desc: "Tu opinión libre sobre la plataforma" },
];

const RATING_EMOJIS = ["", "😡 Necesita mejorar", "😕 Regular", "🙂 Bueno", "😄 ¡Muy bueno!", "🤩 ¡Excelente juego!"];

export default function FeedbackModal({ isOpen, onClose, player }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>("Sugerencia");
  const [message, setMessage] = useState<string>("");
  const [canPublish, setCanPublish] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Por favor escribe tu opinión o sugerencia antes de enviar.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: player?.id ? parseInt(player.id.toString(), 10) : null,
          username: player?.name || "Jugador",
          rating,
          category,
          message: message.trim(),
          canPublish,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.message || "No se pudo enviar tu opinión. Inténtalo de nuevo.");
      }
    } catch (err) {
      console.error("Error al enviar feedback:", err);
      setErrorMsg("Ocurrió un error de conexión al enviar tus comentarios.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setMessage("");
    setRating(5);
    setCategory("Sugerencia");
    setErrorMsg("");
    onClose();
  };

  const whatsappMessage = encodeURIComponent(
    `¡Hola Administrador de El Pericón! 🤠 Me gustaría compartir una sugerencia para el juego: ${message ? `"${message}"` : ""}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-all">
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decoración superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600"></div>

        {/* Botón Cerrar */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 rounded-full w-8 h-8 flex items-center justify-center transition"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Encabezado */}
            <div className="text-center pt-2">
              <span className="inline-block p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xl mb-2 shadow-inner">
                ⭐💬
              </span>
              <h2 className={`${fonts.bowlbyOneSC.className} text-xl sm:text-2xl text-amber-400 tracking-wide`}>
                ¿Qué tal te ha parecido el juego?
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-sm mx-auto">
                Tu opinión es el motor de <strong>El Pericón</strong>. Cuéntanos tu experiencia o qué te gustaría agregar.
              </p>
            </div>

            {/* Selector de Estrellas */}
            <div className="bg-stone-900/80 border border-amber-500/20 rounded-2xl p-3 text-center">
              <div className="flex justify-center items-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl sm:text-4xl transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${star} estrellas`}
                  >
                    <span className={(hoverRating || rating) >= star ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-stone-600"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-300">
                {RATING_EMOJIS[hoverRating || rating]}
              </p>
            </div>

            {/* Categoría / Motivo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                ¿Sobre qué deseas opinar?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition flex flex-col justify-center ${
                      category === cat.id
                        ? "bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-500/10"
                        : "bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[10px] text-stone-500 font-normal">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caja de Texto */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Tu Mensaje o Sugerencia:
                </label>
                <span className="text-[10px] text-stone-500">{message.length}/1000</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Escribe aquí con total confianza: ¿qué te ha gustado?, ¿qué regla o función quisieras agregar?, ¿cómo sentiste las partidas?..."
                className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-500 rounded-xl p-3 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition resize-none"
              />
            </div>

            {/* Checkbox Testimonio Público */}
            <label className="flex items-start gap-2.5 cursor-pointer bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/80 hover:border-stone-700 transition">
              <input
                type="checkbox"
                checked={canPublish}
                onChange={(e) => setCanPublish(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 focus:ring-offset-stone-900 bg-stone-950 border-stone-700 cursor-pointer"
              />
              <span className="text-xs text-stone-300 leading-snug">
                Autorizo a compartir mi reseña como testimonio público en la página principal para motivar a otros jugadores.
              </span>
            </label>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Botón de Enviar */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Enviando tu opinión...</span>
                  </>
                ) : (
                  <>
                    <span>📤 Enviar mi Opinión</span>
                  </>
                )}
              </button>

              {/* Botón WhatsApp opcional */}
              <a
                href={`https://api.whatsapp.com/send?phone=584140000000&text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs text-emerald-400 hover:text-emerald-300 py-1 transition flex items-center justify-center gap-1.5"
              >
                <span>💬 ¿Prefieres chatear en privado? Enviar sugerencia por WhatsApp</span>
              </a>
            </div>
          </form>
        ) : (
          /* Estado de Éxito */
          <div className="text-center py-6 px-2 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30 animate-bounce">
              🤠
            </div>
            <div>
              <h3 className={`${fonts.bowlbyOneSC.className} text-xl sm:text-2xl text-amber-300 font-bold`}>
                ¡Muchísimas Gracias!
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 mt-2 max-w-sm mx-auto leading-relaxed">
                Tu opinión y sugerencias han sido recibidas por la administración. Cada idea nos ayuda a hacer de <strong>El Pericón</strong> el juego de cartas llanero número uno.
              </p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="mt-2 py-2.5 px-6 rounded-xl font-semibold text-xs sm:text-sm bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 transition shadow"
            >
              Cerrar y seguir jugando
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
