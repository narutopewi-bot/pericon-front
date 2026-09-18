import * as React from "react";
import Duelmode from "./duelmode"; 
import { useAppSelector, RootState } from "@/store/store";
import MatchSingle from "./match-single";
import { useRouter } from "next/navigation";
import { useSignalRContext } from "@/lib/signalrcontext";
import { Trozo } from "@/lib/library";

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
  username: string;
  avatar: string;
  bet: number;
}

const Duel = ({ open, duelToggle, }: any) => {
  const router = useRouter();
  const user = useAppSelector((state: RootState) => state.gameplayer);
  const connection = useSignalRContext();

  const [duelMode, setDuelMode] = React.useState<{ mode: string; credits: string } | null>(null);
  const [onQueue, setOnQueue] = React.useState(false);
  const [queueCount, setQueueCount] = React.useState<number>(1);
  const [errors, setErrors] = React.useState<{ credits: string; queue: string; playing: string } | null>(null);

  const onDuelmode = (mode: string, credits: string) => {
    setDuelMode({ mode, credits });
    onSubmit({ mode, credits });
  }

  React.useEffect(() => {
    if (!connection) return;

    connection.on("MatchmakingStatus", (status: any) => {
      console.log("Estado de matchmaking recibido:", status);
      if (status?.count !== undefined) {
        setQueueCount(status.count);
      }
    });

    connection.on("MatchFound", (modelo: any) => {
      console.log("¡MatchFound 1vs1 recibido desde el servidor!", modelo);
      const idplay : number = modelo.game;
      const player_1 : string = Trozo(modelo.content, 0);
      const player_2 : string = Trozo(modelo.content, 2);
      const nplayer_1 : string = Trozo(modelo.content, 1);
      const nplayer_2 : string = Trozo(modelo.content, 3);
      const turnplay : boolean = Trozo(modelo.content, 4) === "1";
      const partial = { 
        id: idplay, 
        userone: player_1, 
        nameone: nplayer_1, 
        usertwo: player_2, 
        nametwo: nplayer_2, 
        coins: duelMode?.credits ? parseInt(duelMode.credits) : 100, 
        turn: "01", 
        flag: turnplay 
      };
      const serialized = encodeURIComponent(JSON.stringify(partial));
      router.push(`/game/999?datos=${serialized}`);
    });

    connection.on("MatchFound2v2", (modelo: any) => {
      console.log("¡MatchFound2v2 recibido desde el servidor!", modelo);
      const parts = modelo.content.split(' ');
      const gameId = parts[0];
      const betVal = parts[1] || '100';
      const matchRoomKey = parts[parts.length - 1] || `match-${gameId}`;
      router.push(`/game2v2/${matchRoomKey}?bet=${betVal}&match=auto`);
    });

    return () => {
      connection.off("MatchmakingStatus");
      connection.off("MatchFound");
      connection.off("MatchFound2v2");
    };
  }, [connection, duelMode, router]);

  function validateCredits(credits: string): boolean {
    const amount = parseFloat(credits);
    return !isNaN(amount) && amount > 0;
  }

  async function onSubmit({ mode, credits }: { mode: string; credits: string }) {
    if (user.name?.startsWith("Invitado_") || user.id?.startsWith("guest_")) {
      alert("El modo invitado únicamente puede participar en partidas amistosas (Crear o Unirse a Sala). Por favor regístrate para jugar duelos.");
      return;
    }

    const bet = parseInt(credits);

    if (!validateCredits(credits)) {
      console.error("Invalid bet amount");
      return;
    }

    if (mode === "Solitario") {
      router.push(`/solitaire/999?bet=${bet}`);
      return;
    }

    // Tanto 1 vs 1 como 2 vs 2 entran en cola de emparejamiento automático
    if ((mode === "1 vs 1" || mode === "2 vs 2") && connection) {
      try {
        console.log(`Uniéndose al matchmaking para ${mode} con apuesta ${bet}...`);
        setOnQueue(true);
        setQueueCount(1);
        await connection.invoke("JoinMatchmaking", mode, bet, user?.name || "", user?.id || "", user?.avatarUrl || "");
      } catch (err) {
        console.error("Error al unirse al matchmaking:", err);
      }
    }
  }

  const onDismiss = async () => {
    if (connection && onQueue) {
      try {
        await connection.invoke("CancelMatchmaking");
      } catch (err) {
        console.error("Error al cancelar matchmaking:", err);
      }
    }

    // Remove room from state
    duelToggle();
    setDuelMode(null);
    setOnQueue(false);
    setQueueCount(1);
  }

  return (
    <React.Fragment>
      <div className={`
        fixed inset-0 z-50 flex justify-center items-center transition-colors p-3
        ${open ? "visible bg-black/80 backdrop-blur-md" : "invisible pointer-events-none"}
      `}>
        <div className={`
          text-white transition-all
          flex flex-col relative z-50 w-full box-border outline-none 
          max-w-md
          ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}
          ${!duelMode ? "bg-transparent" : "bg-gradient-to-b from-[#241308]/95 to-[#120904]/98 border-2 border-amber-500/50 shadow-2xl rounded-3xl p-2"}
        `}>
          {/*Choose duel mode and bets*/}
          {!duelMode && (
            <Duelmode onMode={onDuelmode} duelToggle={duelToggle} />
          )}

          {/*1 vs 1 o 2 vs 2 en búsqueda*/}
          {duelMode && (
            <MatchSingle player={user} onDismiss={onDismiss} mode={duelMode.mode} queueCount={queueCount} />
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

export default Duel;
