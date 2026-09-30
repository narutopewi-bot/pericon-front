'use client';

import { useEffect } from 'react';

export default function SolitaireErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Solitaire ErrorBoundary] Excepción en Solitario:', error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 bg-[#120803] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1c0f07] to-[#120803] border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full text-white text-center shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl font-bold mx-auto border border-amber-500/40">
          🤖
        </div>

        <div>
          <h2 className="text-lg font-black text-amber-300 uppercase tracking-wide">
            Partida Contra el Bot
          </h2>
          <p className="text-xs text-amber-200/70 mt-1.5 leading-relaxed">
            Se produjo un salto temporal de datos en el cliente. Tu saldo y tu mesa están protegidos en el servidor.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-95"
          >
            🔄 Continuar Partida con el Bot
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/desk';
              }
            }}
            className="w-full py-2.5 bg-black/50 hover:bg-black/70 text-amber-200/60 rounded-xl text-xs font-bold border border-amber-500/20 transition"
          >
            Volver al Menú
          </button>
        </div>
      </div>
    </div>
  );
}
