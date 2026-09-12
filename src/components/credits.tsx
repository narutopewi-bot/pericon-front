import React from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";

interface CreditProps {
  credits: number;
}

const Credit: React.FC<CreditProps> = ({ credits }: CreditProps) => {
  const creditString = credits.toString();
  return (
    <React.Fragment>
      <div className="flex justify-between items-center relative mr-4">
        <div className="mr-[-2px] z-10">
          <Button size="icon" className="bg-yellow-700 w-[34px] h-[36px] mt-[5px] rounded-tl-[13px] rounded-bl-[13px]">
            <img src="/coin.png" className="text-red-900" />
          </Button>
        </div>
        <div className="max-w-[115px] relative z-0">
          <Input value={creditString} className="bg-yellow-700 h-[36px] border-none outline-none rounded-tr-[13px] rounded-br-[13px] max-w-[60px]" />
        </div>
      </div>
    </React.Fragment>
  );
};

export default Credit;
