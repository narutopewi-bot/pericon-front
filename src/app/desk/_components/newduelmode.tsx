import * as React from "react";
import { Button } from "@/components/ui/button"
import Image from "next/image"
import * as fonts from "@/components/fonts"
import SelectDuel02 from "./SelectDuel02"
import SelectBet from "./SelectBet"
import { ArrowLeft } from "lucide-react"

import { useSignalRContext } from '@/lib/signalrcontext';
import 'sweetalert2/src/sweetalert2.scss'

interface Players {
  id: string;  
  name: string;
}

const NewDuelmode = ({ onMode, duelToggle, }: any) => {

  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState("Solitario");
  const [selectedCredits, setSelectedCredits] = React.useState("100");

  const onSelectChange = (value: string) => {
    setSelectedValue(value);
    console.log("selected", value);
  };

  const onSelectCredits = (value: string) => {
    setSelectedCredits(value);
    console.log("selected", value);
  };

  const handleToggleOptions = (isOpen: boolean) => {
    setIsOptionsOpen(isOpen);
  };


  // Duel Options
  // const options = ["Solitario","1 vs 1", "2 vs 2", "3 vs 3"];
  // const filteredOptions = options.filter(option => option !== selectedValue);

  // Credit Options: Filtramos para que el crédito seleccionado no aparezca en las opciones desplegables
  
  // Esto ha de cambiarse a futuro

  const creditOptions = ["100", "150", "200", "500"];
  const filteredCreditOptions = creditOptions.filter(option => option !== selectedCredits);

  const [player, setPlayer] = React.useState<Players[]>([]);
  const [listplayer, setListplayer] = React.useState<Players[]>([]);
  const [selectedplayer, setSelectedplayer] = React.useState<string>('');
  const connection = useSignalRContext(); 
  const hasConnected = React.useRef(false);  
  
    React.useEffect(() => {
    const cargarPersonas = async () => {
      if (connection && !hasConnected.current) {
        console.log("Cargando el componente NewDuel");
        try {
          await connection.invoke("GetListPlayers");
          hasConnected.current = true;
        } catch (error) {
          console.error("Error al iniciar el juego.", error);
        }
      }
    };
    cargarPersonas();
  }, []);

  React.useEffect(() => {
      if (!connection) return;
      connection.on('RetListPlayers', (modelo: Players[]) => {
      //  const justNames = modelo.map(d => d.name);
        setListplayer(modelo);
        console.log(modelo);
        setPlayer(modelo);
      });
      return () => {
        connection.off('RetListPlayers');
      };
  }, [connection]);   

  return (

    <React.Fragment>
      <div className="py-4 px-6 flex-initial text-large font-semibold flex flex-col gap-1">
        <div className="relative ml-[100px]">
          <Button
            size="icon"
            className="bg-red-500 rounded-[12px]"
            onClick={duelToggle}>
            <ArrowLeft size="2x" className="text-white" />
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center w-full relative">
          <div>
            <Image src="/duel.svg" alt="coin" width={120} height={120} className="mt-[-100px]" />
          </div>
          <div className={`bg-[#d2bf58] w-[200px] mt-[-18px] h-[80px] 
              flex flex-col items-center justify-center p-4 z-20 relative
              ${isOptionsOpen ? "rounded-t-[12px]" : "rounded-[12px]"}`}>
            <div className={`text-[#a7753a] mt-2 ${fonts.bowlbyOneSC.className} text-shadow text-[18px]`}>
              Jugador
            </div>
            <div className="my-1 w-full" />
            <div className={`text-[#a7753a] ${fonts.bowlbyOneSC.className}`}>
              <SelectDuel02
                value={selectedplayer}
                options={listplayer}
                updateValue={onSelectChange}
                onToggleOptions={handleToggleOptions}
                className="z-20 bg-transparent capitalize"
              />
            </div>
          </div>

        </div>
      </div>

      <div className={`flex flex-row items-center justify-center gap-3 px-6 py-2`}>
        <p className={`${fonts.angkor.className} text-[16px] capitalize`}>
          Apuesta
        </p>

        <div className="mt-[-3px]">
          <SelectBet
            value={selectedCredits}
            options={filteredCreditOptions}
            updateValue={onSelectCredits}
            className="z-20 bg-[#9d6727]"
          />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="relative flex flex-row gap-2 px-6 py-4 justify-center">
          <Button
            onClick={() => onMode(selectedValue, selectedCredits)}
            className={`
            ${fonts.bowlbyOneSC.className} 
            bg-[#68b22f] hover:bg-[#68b22f] uppercase text-white text-[30px]
            border-2 border-[#A7753A]
            px-8 py-7
          `}>
            Invitar
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
}

export default NewDuelmode;
