"use client";

import React from "react";
import * as fonts from "@/components/fonts";
import { X, ShieldCheck, Cpu, Scale, AlertTriangle, FileText } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#241308] via-[#170d05] to-[#0d0602] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 text-white shadow-2xl shadow-amber-600/30 flex flex-col">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black shadow-lg">
              <Scale size={22} className="stroke-[2.5]" />
            </div>
            <div className="text-left">
              <h2 className={`text-base sm:text-xl font-extrabold text-white ${fonts.bowlbyOneSC.className} tracking-wide`}>
                TÉRMINOS Y CONDICIONES
              </h2>
              <p className="text-[10px] sm:text-xs text-amber-300/80 font-medium">
                Reglamento Legal, Política de IA y Descargo de Responsabilidad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-red-600/80 border border-amber-500/30 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido Legal Desplazable */}
        <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-4 text-xs sm:text-sm text-slate-300 text-left leading-relaxed">
          
          {/* Advertencia Importante */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-start gap-2.5">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-red-600/80 text-white font-black text-[10px] tracking-wider uppercase">
                Exclusivo para Mayores de 18 Años (18+)
              </span>
              <p className="text-amber-200 text-xs font-semibold">
                Al registrar una cuenta, acceder o participar en cualquiera de las modalidades de juego de <strong>Pericón Online</strong>, declaras de forma jurada tener al menos 18 años de edad y aceptas sin reservas todos los puntos estipulados a continuación.
              </p>
            </div>
          </div>

          {/* Sección 1: Requisito de Edad */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-red-950/20 border border-red-500/30">
            <h3 className="text-red-400 font-extrabold text-sm flex items-center gap-1.5">
              🔞 1. Restricción Estricta de Mayoría de Edad (+18 Años)
            </h3>
            <p className="text-slate-200 font-medium">
              El acceso, registro, uso de la plataforma y participación en cualquier partida con apuestas y saldo virtual está <strong>terminantemente prohibido para menores de dieciocho (18) años</strong>.
            </p>
            <p>
              El usuario garantiza y certifica bajo su exclusiva responsabilidad civil y legal que posee plena capacidad jurídica y la mayoría de edad requerida en su país de residencia. La administración se reserva el derecho de auditar cuentas, exigir prueba fehaciente de identidad (documento de identidad / pasaporte) y <strong>clausurar de manera inmediata e irreversible cualquier cuenta creada por o para un menor de edad</strong>, anulando cualquier saldo o beneficio sin derecho a reembolso.
            </p>
          </div>

          {/* Sección 2: Uso de Inteligencia Artificial */}
          <div className="space-y-1.5">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5 text-amber-400">
              <Cpu size={16} /> 2. Declaración de Uso de Inteligencia Artificial (IA) y Algoritmos
            </h3>
            <p>
              El usuario reconoce y acepta de manera expresa que la plataforma, su código fuente, sus interfaces, el motor de arbitraje y los módulos de juego automatizados han sido desarrollados, entrenados y operan en parte mediante <strong>modelos de Inteligencia Artificial (IA)</strong> y algoritmos de optimización matemática.
            </p>
            <p>
              En el modo individual (<strong>Solitario</strong>), el usuario compite directamente contra un agente de software dotado de IA que opera bajo parámetros de probabilidad y márgenes de retorno matemático (<em>House Edge</em>). El usuario comprende y acepta que el sistema <strong>no garantiza resultados aleatorios planos ni victorias aseguradas</strong>, reservándose la plataforma el derecho de calibrar la dificultad y el balance probabilístico para la sostenibilidad económica del servicio.
            </p>
          </div>

          {/* Sección 3: Rol del Administrador y Comisión de Árbitro */}
          <div className="space-y-1.5">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5 text-amber-400">
              <ShieldCheck size={16} /> 3. Arbitraje Tecnológico y Comisión por Servicio (20%)
            </h3>
            <p>
              La administración de la plataforma actúa única y exclusivamente como <strong>árbitro tecnológico y proveedor de la infraestructura digital</strong> para permitir el juego entre usuarios o contra el sistema.
            </p>
            <p>
              Por la prestación de este servicio, mantenimiento de servidores y resolución automatizada de partidas, el sistema descuenta automáticamente un <strong>veinte por ciento (20%)</strong> sobre el pozo acumulado de apuestas en cada partida concluida, entregando el ochenta por ciento (80%) restante al ganador legítimo.
            </p>
          </div>

          {/* Sección 4: Monedero Virtual, Recargas y Retiros */}
          <div className="space-y-1.5">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5 text-amber-400">
              <FileText size={16} /> 4. Monedas Virtuales, Saldo y Transacciones
            </h3>
            <p>
              Las monedas virtuales adquiridas en la plataforma son instrumentos de uso recreativo. Toda solicitud de recarga o retiro de fondos está sujeta a auditoría y verificación manual del comprobante bancario por parte del equipo administrativo.
            </p>
            <p>
              Cualquier intento de falsificación de comprobantes, manipulación informática, colusión entre jugadores o abuso de errores del sistema facultará a la administración para <strong>bloquear definitivamente la cuenta infractora y anular los saldos asociados</strong> sin derecho a indemnización.
            </p>
          </div>

          {/* Sección 5: Desconexiones y Fallas Técnicas */}
          <div className="space-y-1.5">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5 text-amber-400">
              <AlertTriangle size={16} /> 5. Desconexiones, Latencia y Abandono
            </h3>
            <p>
              Las partidas se disputan en tiempo real. La plataforma <strong>no asume responsabilidad alguna por fallas de conexión a internet, fluctuaciones de red móvil, cortes de energía eléctrica o defectos del dispositivo del usuario</strong>.
            </p>
            <p>
              Si un jugador se desconecta o deja agotar los treinta (30) segundos reglamentarios de su turno, el sistema declarará la ronda perdida o el abandono automático de la partida, transfiriendo las monedas al rival sin posibilidad de reclamo o reembolso.
            </p>
          </div>

          {/* Sección 6: Exoneración de Responsabilidad Legal */}
          <div className="space-y-1.5">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5 text-amber-400">
              <Scale size={16} /> 6. Exoneración Total de Responsabilidad e Indemnidad
            </h3>
            <p>
              El usuario declara que participa voluntariamente, bajo su propio criterio y riesgo financiero. Al aceptar estos términos, <strong>renuncia de forma irrevocable a interponer cualquier demanda, querella, reclamo judicial, administrativo o penal</strong> en contra del creador, operador, dueño, administradores o programadores del software.
            </p>
            <p>
              Esta aceptación electrónica constituye un contrato válido y vinculante entre las partes con plena fuerza probatoria en el ámbito legal y digital.
            </p>
          </div>

        </div>

        {/* Pie del Modal con Botón de Aceptación */}
        <div className="pt-3 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Versión legal vigente • Actualizado Septiembre 2026
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (onAccept) onAccept();
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
            >
              Entendido y Acepto
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
