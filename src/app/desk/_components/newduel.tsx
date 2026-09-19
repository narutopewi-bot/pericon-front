import * as React from "react";
import NewDuelmode from "./newduelmode";
import { useAppSelector, RootState } from "@/store/store";
import MatchSingle from "./match-single";
import { Router } from "next/router";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from '../page.module.css';
import { useSignalRContext } from '@/lib/signalrcontext';
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';
import { Trozo } from "@/lib/library";
import { Console } from "console";

interface DataDuel {
  id: number;
  userone: string;
  nameone: string;
  usertwo: string;
  nametwo: string;
  coins: number;
  turn: string;
  flag: boolean;
}

interface DuelMode {
  mode: string;
  credits: string;
}

interface Errors {
  credits: string;
  queue: string;
  playing: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  coins: number;
  active: boolean;
}

interface Message {
  game: number
  order: number
  content: string
}

const NewDuel = ({ open, duelToggle, onFinish, }: any) => {
  const router = useRouter();
  const user = useAppSelector((state: RootState) => state.gameplayer);
/*  const [dataDD, setDataDD] = React.useState<DataDuel | null>(null); */

  const [newduelMode, setNewduelMode] = React.useState<{ mode: string; credits: string } | null>(null);
  const [onQueue, setOnQueue] = React.useState(false);
  const [errors, setErrors] = React.useState<{ credits: string; queue: string; playing: string } | null>(null);

  const onDuelmode = (mode: string, credits: string) => {
    setNewduelMode({ mode, credits });
    onSubmit({ mode, credits });
  }

  function validateCredits(credits: string): boolean {
    const amount = parseFloat(credits);
    return !isNaN(amount) && amount > 0;
  }

  const connection = useSignalRContext();
  const hasConnected = React.useRef(false);

  const AlertMessage = (_title:string) => ({
    firstMessage: {
      title: _title,
      showConfirmButton: false,
      timer: 1500,
      color: "#ffffff",
      background: "#9d6727",
      allowEscapeKey: false, 
      backdrop: true,
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      },
    },
    questionMessage: {
      title: _title,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Si',
      cancelButtonText: 'No',
      reverseButtons: true,
      customClass: {
        confirmButton: 'swal2-aceptar',
        cancelButton: 'swal2-rechazar',
      },
      timer: 5000,
    //  timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
    //  didOpen: () => {
    //    Swal.showLoading(null);
    //  },
      willClose: () => {
      // Simula "cancelado" si no se hace clic antes del cierre
        if (!Swal.getTimerLeft()) {
          console.log('Tiempo agotado: acción cancelada');
        // Acción alternativa si se considera cancelado
        }
      }
    }
  });  

  async function onSubmit({ mode, credits }: { mode: string; credits: string }) {
    const opponent = mode;
    const bet = parseFloat(credits);
    if (opponent.length == 0) {
      return;
    };
    const playerop : string = opponent;
    const dato : Message = { game: 0, order: 91, content: playerop };  
    if (connection) {
      try {
        console.log("Enviando objeto al servidor:", dato);
        await connection.invoke("AskInvitePlayer",dato);
        const xcad : string = "Enviando Invitación";
        const alertOne = AlertMessage(xcad);
        Swal.fire(alertOne.firstMessage);   
        duelToggle(); // oculta el modal
        onFinish?.();                     
      } catch (error) {
        console.error("Error al enviar objeto al servidor:", error);
      };    
    };  
  };

  useEffect(() => {
    if (open) {
      setNewduelMode(null);     // muestra el selector de modo
      setOnQueue(false);        // limpia cola
      setErrors(null);          // limpia errores si existen
    }
  }, [open]);

  useEffect(() => {
      if (!connection) return;
      connection.on('InvitedGame', (modelo: UserData) => {
        console.log(modelo);        
        const xcad : string = modelo.name + " quiere jugar contigo un 1 vs 1. Aceptas?";
        const alertOne = AlertMessage(xcad);
        Swal.fire(alertOne.questionMessage).then(async (result) => {
          let xnum : number = 0;
          if (result.isConfirmed) {
            xnum = 95;
            console.log('Aceptado');
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            xnum = 96;
            console.log('Rechazado por el usuario');
          } else if (result.dismiss === Swal.DismissReason.timer) {
            xnum = 96;
            console.log('Rechazado automáticamente por tiempo');
          };
          const datico : Message = { game: 0, order: xnum, content: modelo.id };
          console.log("Enviando objeto al servidor:", datico);
          await connection.invoke("AnswerInvitePlayer",datico);
        });           
      });
      return () => {
        connection.off('InvitedGame');
      };
  }, [connection]);

  useEffect(() => {
      if (!connection) return;
      connection.on('InviteGame', async (modelo: Message) => {
 //       const xcad : string = "Respuesta: " + modelo.order;
        if (modelo.order == 97) 
        {
          const datico : Message = { game: 0, order: 90, content: modelo.content };
          await connection.invoke("SetGame1vs1",datico);
        }
 //       const alertOne = AlertMessage(xcad);
 //       Swal.fire(alertOne.firstMessage);  
       // if (modelo.game == )           
      });
      return () => {
        connection.off('InviteGame');
      };
  }, [connection]);

  useEffect(() => {
      if (!connection) return;
      connection.on('ReadyToGame1vs1', (modelo: Message) => {
        const xcad : string = "Juego en Proceso...";
        console.log("ReadyToGame1vs1. Objeto recibido: ", modelo);
        const alertOne = AlertMessage(xcad);
        Swal.fire(alertOne.firstMessage);  
        const idplay : number = modelo.game;
        const parts = typeof modelo.content === 'string' && modelo.content.includes('|')
          ? modelo.content.split('|')
          : modelo.content.split(' ');
        const player_1 : string = parts[0];
        const nplayer_1 : string = parts[1];
        const player_2 : string = parts[2];
        const nplayer_2 : string = parts[3];
        const turnplay : boolean = parts[4] === "1";
        const partial : DataDuel = { id: idplay, userone : player_1, nameone: nplayer_1, usertwo : player_2, nametwo: nplayer_2, coins: 10, turn: "01", flag : turnplay };
        const serialized = encodeURIComponent(JSON.stringify(partial));
        console.log("Datos a Enviar: ", partial);
        router.push(`/game/999?datos=${serialized}`);
      });
      return () => {
        connection.off('ReadyToGame1vs1');
      };
  }, [connection]);

  const onDismiss = async () => {
    const userdata = {
      id: user.id,
      username: "", // user.username
      avatar: "", // user.avatar,
      bet: newduelMode?.credits ? parseFloat(newduelMode.credits) : 0,
      room: newduelMode?.mode,
    }

    if (newduelMode?.mode) {
      console.log("removing ", userdata.id);
    }

    // Remove room from state
    duelToggle();
    setNewduelMode(null);
    setOnQueue(false);
  }

  return (
    <React.Fragment>
      <div className={`fixed inset-0 flex justify-center items-center transition-colors
        ${open ? "visible bg-black/40" : "invisible"}`}>
        <div className={`text-white transition-all flex flex-col relative z-50 w-full box-border outline-none 
          mx-1 my-1 sm:mx-6 sm:my-16 max-w-md rounded-large 
          ${open ? "scale-100 opacity-100" : "scale-125 opacity-0"}
          ${!newduelMode ? "bg-[transparent]" : "bg-[#9d6727] shadow-small rounded-xl"}`}>
          {/*Choose duel mode and bets*/}
          {!newduelMode && (
            <NewDuelmode onMode={onDuelmode} duelToggle={duelToggle} />
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

export default NewDuel;