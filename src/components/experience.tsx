import React from "react";
import { Progress } from "@/components/ui/progress";

interface ExpProps {
  name: string;
  experience: number;
  level: string;
}

const Exp: React.FC<ExpProps> = ({ name, experience, level }: ExpProps) => {
  return (
    <div className="flex flex-col items-center mt-[-5px] ml-10">
      <div className="relative flex flex-col items-center">
        <div className="absolute top-0 flex items-center justify-center w-full h-full">
          <span className="text-white font-bold z-10"> {name}</span>
        </div>
        <Progress value={experience} className="w-[120px] h-[40px] rounded-[12px] border-none" />
      </div>
    </div>
  );
};

export default Exp;

