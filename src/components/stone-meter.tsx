import React from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";

interface StonesProps {
  stoneone: number;
  stonetwo: number;
  isTumbaOne?: boolean;
  isTumbaTwo?: boolean;
}

const Stone: React.FC<StonesProps> = ({ stoneone, stonetwo, isTumbaOne, isTumbaTwo }: StonesProps) => {
  const stoneString = stoneone.toString() + "-" + stonetwo.toString();
  const isObligado = (isTumbaOne || stoneone >= 9) && (isTumbaTwo || stonetwo >= 9);
  const someoneInTumba = (isTumbaOne || stoneone >= 9) || (isTumbaTwo || stonetwo >= 9);

  return (
    <React.Fragment>
      <div className="flex items-center relative mr-4 gap-2">
        {isObligado ? (
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse uppercase tracking-wider">
            ¡OBLIGADO!
          </span>
        ) : someoneInTumba ? (
          <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded animate-bounce uppercase tracking-wider">
            ¡EN TUMBA!
          </span>
        ) : null}
        <div className="flex justify-between items-center relative">
          <div className="mr-[-2px] z-10">
            <Button size="icon" className="bg-yellow-700 w-[34px] h-[36px] mt-[2px] rounded-tl-[5px] rounded-bl-[5px]">
              <img src="/stone.svg" className="text-red-900" alt="stone" />
            </Button>
          </div>
          <div className="max-w-[115px] relative z-0">
            <Input readOnly value={stoneString} className="bg-yellow-700 h-[36px] font-bold text-white border-none outline-none rounded-tr-[5px] rounded-br-[5px] max-w-[60px] text-center" />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Stone;
