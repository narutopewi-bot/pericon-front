import React from "react";

interface StonesProps {
  stoneone: number;
  stonetwo: number;
  isTumbaOne?: boolean;
  isTumbaTwo?: boolean;
}

const Stone: React.FC<StonesProps> = ({ stoneone, stonetwo, isTumbaOne, isTumbaTwo }: StonesProps) => {
  const isObligado = (isTumbaOne || stoneone >= 9) && (isTumbaTwo || stonetwo >= 9);
  const someoneInTumba = (isTumbaOne || stoneone >= 9) || (isTumbaTwo || stonetwo >= 9);

  return (
    <div className="flex flex-col items-center justify-center shrink-0 select-none">
      {/* Alerta de Estado: Tumba u Obligado */}
      {isObligado ? (
        <span className="mb-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.7)] border border-red-300">
          ¡OBLIGADO!
        </span>
      ) : someoneInTumba ? (
        <span className="mb-0.5 bg-amber-500 text-black text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.7)] border border-yellow-200">
          ¡EN TUMBA!
        </span>
      ) : null}

      {/* Marcador Principal de Piedras */}
      <div 
        className="flex items-center bg-gradient-to-r from-stone-950/95 via-[#231508] to-stone-950/95 border-2 border-amber-500/70 rounded-2xl px-2.5 sm:px-3.5 py-1 shadow-[0_0_16px_rgba(245,158,11,0.3)] backdrop-blur-md"
        title={`Marcador: Tú ${stoneone} piedras vs Rival ${stonetwo} piedras`}
      >
        {/* Mis Piedras */}
        <div className="flex flex-col items-center min-w-[20px]">
          <span className="text-sm sm:text-base font-black text-amber-300 leading-none drop-shadow">
            {stoneone}
          </span>
          <span className="text-[7.5px] sm:text-[8px] font-black text-amber-400/80 uppercase tracking-tighter leading-none mt-0.5">
            Tú
          </span>
        </div>

        {/* Separador e Ícono de Piedra */}
        <div className="flex items-center gap-1 mx-2 sm:mx-2.5">
          <span className="text-base sm:text-lg filter drop-shadow">🪨</span>
          <span className="text-amber-500/60 font-black text-xs sm:text-sm">:</span>
        </div>

        {/* Piedras del Rival */}
        <div className="flex flex-col items-center min-w-[20px]">
          <span className="text-sm sm:text-base font-black text-slate-200 leading-none drop-shadow">
            {stonetwo}
          </span>
          <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mt-0.5">
            Rival
          </span>
        </div>
      </div>
    </div>
  );
};

export default Stone;
