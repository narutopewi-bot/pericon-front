"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { ArrowLeft, Scale, ShieldCheck, Cpu, AlertTriangle, FileText, Volume2 } from "lucide-react";
import { playVoiceAudio } from "@/lib/gameEffects";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#120803] text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-500/30">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-xs sm:text-sm font-bold bg-black/40 border border-amber-500/30 rounded-xl px-3.5 py-2 transition"
          >
            <ArrowLeft size={16} />
            <span>Volver al Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/brand.svg" width={110} height={35} alt="Pericón" priority className="h-7 w-auto" />
          </div>
        </div>

        {/* Tarjeta Principal */}
        <div className="bg-gradient-to-b from-[#241308] via-[#170d05] to-[#0d0602] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-left text-sm sm:text-base leading-relaxed text-slate-300">
          
          <div className="text-center pb-4 border-b border-amber-500/20">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black shadow-lg mb-3">
              <Scale size={28} className="stroke-[2.5]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black text-white ${fonts.bowlbyOneSC.className} tracking-wide`}>
              TÉRMINOS, CONDICIONES Y AVISO LEGAL
            </h1>
            <p className="text-xs text-amber-300/80 mt-1">
              Plataforma Recreativa Pericón Online • Vigencia 2026
            </p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-xs tracking-wider uppercase">
                Exclusivo para Mayores de 18 Años (18+)
              </span>
              <p className="text-amber-200 text-xs sm:text-sm font-medium">
                Al registrar una cuenta o usar este software, el usuario declara bajo juramento ser mayor de dieciocho (18) años y acepta de manera libre, consciente, informada y vinculante todos los términos y descargos de responsabilidad civil, penal y comercial detallados en este documento.
              </p>
            </div>
          </div>

          {/* 1. Mayores de 18 Años */}
          <section className="space-y-3 p-4 rounded-2xl bg-red-950/20 border border-red-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-red-400 flex items-center gap-2">
                🔞 1. Restricción Absoluta de Mayoría de Edad (+18)
              </h2>
              <button
                type="button"
                onClick={() => playVoiceAudio('mas_18')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs transition active:scale-95 shadow w-fit"
                title="Escuchar locución oficial del Chivo de Carora (+18)"
              >
                <Volume2 size={15} />
                <span>Escuchar Aviso del Chivo (+18)</span>
              </button>
            </div>
            <p className="text-slate-200 font-medium">
              Pericón Online está diseñado, operado y destinado **exclusivamente para personas mayores de dieciocho (18) años de edad**.
            </p>
            <p>
              Queda estrictamente prohibido el acceso, descarga, registro, creación de monedero o participación de menores de edad. Cualquier cuenta sospechosa de pertenecer a un menor será suspendida preventivamente. Si no se acredita la mayoría de edad mediante documento oficial, la cuenta será clausurada definitivamente sin compensación alguna.
            </p>
          </section>

          {/* 2. IA */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
              <Cpu size={20} /> 2. Declaración de Uso de Inteligencia Artificial y Algoritmos
            </h2>
            <p>
              El usuario reconoce y consiente expresamente que el software Pericón Online ha sido concebido, programado y funciona mediante la asistencia de <strong>modelos avanzados de Inteligencia Artificial (IA)</strong>, redes neuronales y heurísticas de optimización computacional.
            </p>
            <p>
              En la modalidad <strong>Solitario (vs Computadora)</strong>, el sistema opera con un motor algorítmico probabilístico calibrado para sostener un margen matemático de retorno (<em>House Edge</em>) diseñado para garantizar la viabilidad y rentabilidad del sistema. El usuario comprende que la computadora ajusta dinámicamente sus decisiones tácticas y la distribución de probabilidades, por lo que <strong>no se garantiza un juego puramente aleatorio ni victorias seguras</strong>.
            </p>
          </section>

          {/* 3. Árbitro */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
              <ShieldCheck size={20} /> 3. Calidad de Árbitro Tecnológico y Comisión (20%)
            </h2>
            <p>
              El titular y los administradores de Pericón Online actúan exclusivamente en condición de <strong>árbitros y facilitadores de la infraestructura de comunicaciones</strong> que permite a los usuarios disputar partidas reglamentarias del juego tradicional de cartas.
            </p>
            <p>
              En contraprestación por el servicio de mediación, mantenimiento tecnológico y soporte, la plataforma retiene una comisión fija e innegociable equivalente al <strong>veinte por ciento (20%)</strong> sobre el pozo total apostado en cada partida, distribuyéndose el ochenta por ciento (80%) restante en favor del jugador vencedor.
            </p>
          </section>

          {/* 4. Monedero */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
              <FileText size={20} /> 4. Monedas del Juego, Pagos y Prevención de Fraude
            </h2>
            <p>
              Las monedas virtuales en cuenta son fichas de entretenimiento. Todas las operaciones de carga y retiro son revisadas por el equipo de administración.
            </p>
            <p>
              La presentación de comprobantes de pago falsos, adulterados o duplicados constituirá causal de expulsión inmediata, bloqueo irrevocable del perfil y anulación de cualquier saldo acumulado, reservándose la administración las acciones legales pertinentes.
            </p>
          </section>

          {/* 5. Conectividad */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
              <AlertTriangle size={20} /> 5. Exclusión de Responsabilidad por Desconexiones
            </h2>
            <p>
              El usuario es el único responsable de contar con una conexión a internet estable. Si durante una partida el usuario pierde conexión, sufre cortes de energía o excede los treinta (30) segundos reglamentarios de turno, el servidor otorgará la victoria a la contraparte sin derecho a compensación o reclamo de monedas.
            </p>
          </section>

          {/* 6. Exoneración */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
              <Scale size={20} /> 6. Renuncia a Demandas y Blindaje Jurídico
            </h2>
            <p>
              El usuario exonera de forma perpetua, incondicional e irrevocable a los propietarios, administradores, árbitros y programadores de Pericón Online de cualquier responsabilidad civil, mercantil o de cualquier otra índole por pérdidas económicas, decisiones de juego o eventuales fallos de software.
            </p>
            <p className="text-xs text-slate-400">
              La aceptación expresa mediante casilla de verificación al registrarse constituye prueba plena de consentimiento bajo las leyes internacionales de comercio electrónico y contratación digital.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
