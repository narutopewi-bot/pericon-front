import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";

interface TimerProps {
  start: number; // Tiempo inicial
  isRunning: boolean; // Control para iniciar/detener
  onComplete?: () => void; // Método para reinicio
}

const Timer: React.FC<TimerProps> = ({ start, isRunning, onComplete }: TimerProps) => {

  const [timeLeft, setTimeLeft] = useState(start);

  useEffect(() => {
    setTimeLeft(start); // Reiniciar al cambiar `start`
  }, [start]);

  useEffect(() => {
    if (!isRunning) return; // Detiene si `isRunning` es falso
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isRunning, onComplete]);


 /* useEffect(() => {
    if (!isRunning) return;
    if (timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      
    }
  }, [timeLeft, isRunning]); */

  return (
    <React.Fragment>
      <div className="flex justify-between items-center relative ml-4 mt-[-5px]">
        <div className="ml-1">
          <Button size="icon" className="bg-yellow-700 w-[34px] h-[36px] mt-[2px] rounded-tl-[5px] rounded-bl-[5px]">
            <img src="/clock.svg" className="text-red-900" />
          </Button>
        </div>
        <div className="max-w-[115px] relative z-0">
          <Input value={`${"00:" + timeLeft.toString().padStart(2,"0")}`} className="bg-yellow-700 pl-[3px] h-[36px] border-none outline-none rounded-tr-[5px] rounded-br-[5px] max-w-[60px]" />
        </div>
      </div>
    </React.Fragment>
  );
};

export default Timer;
