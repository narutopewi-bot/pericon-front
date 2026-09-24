'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMediaQuery } from '@/components/use-media-query';
import { RootState, useAppSelector } from '@/store/store';
import { useParams } from 'next/navigation';

import { useSignalRContext } from '@/lib/signalrcontext';
import { Porcion, Trozo, Baraja, isTrumpCard } from "@/lib/library";

import Image from 'next/image';
import Timer from '@/components/timer';
import Stone from '@/components/stone-meter';
import Link from 'next/link';

import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';
import { playCardSound, playSwooshSound, vibrateDevice, playSynthSound, speakPhrase, playVoiceAudio } from '@/lib/gameEffects';
import { playCardDealSound, playCardDropSound, playCoinWinSound, playCantoSound } from '@/lib/soundEffects';
import GameTurnTimer from '@/components/game-turn-timer';
import { GameAnnouncement, AnnouncementData, AnnouncementType } from '@/components/game-announcement';
import { reportAppError } from '@/lib/errorLogger';
import styles from './page.module.css';


// Types
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

interface Card {
  id: number;
  position: number;
  suit: string;
  number: number;
  image: string;
}

interface Oponent {
  username: string;
  avatar: string;
}

interface GameCard {
  image: any;
}

interface Message {
  game: number
  order: number
  content: string
};

export default function Duel1vs1() {

  const searchParams = useSearchParams();
  const router = useRouter();
  const gameplayer = useAppSelector((state: RootState) => state.gameplayer);

  const datos = useRef<DataDuel>({
    id: 0, userone: "", nameone: "", usertwo: "", nametwo: "", coins: 10, turn: "", flag: false
  });

  // Get roomName from the URL (a cambiar)
  const { roomName } = useParams()

  // Game state
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const [showOverlay, setShowOverlay] = React.useState(false)
  const [textOverlay, setTextOverlay] = React.useState('Sample text overlay')
  const [ctaTextOverlay, setCtaTextOverlay] = React.useState('CTA')
  const [ctaLinkOverlay, setCtaLinkOverlay] = React.useState('/')
  const [imageOverlay, setImageOverlay] = React.useState('')

  const playerturn = React.useRef<string>("") // Si eres jugador 1 o 2
  const changeturn = React.useRef<boolean>(true) // Quien lleva el turno intercalado
  const roundturn = React.useRef<boolean>(true) // quien lleva el turno de inicio en ronda
  const switchturn = React.useRef<boolean>(true); // quien lleva el turno de enviar carta 

  const playerown = React.useRef<string>("");
  const playeropp = React.useRef<string>("");
  const pointOne = React.useRef<number>(0);
  const pointTwo = React.useRef<number>(0);

  const pointsown = React.useRef<number>(0);
  const pointsopp = React.useRef<number>(0);
  const [visiblePoints, setVisiblePoints] = useState({ own: 0, opp: 0 });

  // Estados para Pedir (3, 6, 9) y Anuncios visuales
  const [currentStake, setCurrentStake] = useState<number>(1);
  const currentStakeRef = useRef<number>(1);
  const [lastStakeAskedBy, setLastStakeAskedBy] = useState<'player' | 'opp' | null>(null);
  const lastStakeAskedByRef = useRef<'player' | 'opp' | null>(null);

  interface PedirChallengeData {
    challengerName: string;
    targetStake: number;
    rejectReward: number;
    canDoblar: boolean;
    timeLeft: number;
  }
  const [pedirChallenge, setPedirChallenge] = useState<PedirChallengeData | null>(null);

  useEffect(() => { currentStakeRef.current = currentStake; }, [currentStake]);
  useEffect(() => { lastStakeAskedByRef.current = lastStakeAskedBy; }, [lastStakeAskedBy]);

  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const announcementTimer = useRef<any>(null);

  const triggerAnnouncement = (data: AnnouncementData, durationMs: number = 2500) => {
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    setAnnouncement(data);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(null);
    }, durationMs);
  };

  const [stateown, setStateown] = React.useState<boolean>(true);

  const [partown, setPartown] = React.useState<number>(0);
  const [partopp, setPartopp] = React.useState<number>(0);
  const partownRef = React.useRef<number>(0);
  const partoppRef = React.useRef<number>(0);
  useEffect(() => { partownRef.current = partown; }, [partown]);
  useEffect(() => { partoppRef.current = partopp; }, [partopp]);

  const updatePointsAndTumba = (newOwn: number, newOpp: number) => {
    const oldOwn = pointsown.current;
    const oldOpp = pointsopp.current;

    // Regla de "Tumba de para atrás" (en 8 piedras):
    // Solo se activa de manera decreciente cuando un jugador tiene 9 o más y cae a 8 puntos.
    // Si baja a 7 o menos, se desactiva por completo.
    // Si sube desde 7 a 8 puntos, NO se activa tumba de para atrás.
    if (oldOwn >= 9 && newOwn === 8) {
      partownRef.current = 1;
      setPartown(1);
    } else if (newOwn !== 8) {
      partownRef.current = 0;
      setPartown(0);
    }

    if (oldOpp >= 9 && newOpp === 8) {
      partoppRef.current = 1;
      setPartopp(1);
    } else if (newOpp !== 8) {
      partoppRef.current = 0;
      setPartopp(0);
    }

    pointsown.current = newOwn;
    pointsopp.current = newOpp;
    setVisiblePoints({ own: newOwn, opp: newOpp });
  };

  const [tumbaCountdown, setTumbaCountdown] = useState<number | null>(null);
  const tumbaCountdownTimerRef = useRef<any>(null);
  const [isWaitingOppTumba, setIsWaitingOppTumba] = useState<boolean>(false);
  const [isProcessingMove, setIsProcessingMove] = useState<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  // Estado de Tumba activo (en cualquiera de los dos jugadores)
  const isTumbaActive = (visiblePoints.own >= 9 || (partownRef.current === 1 && visiblePoints.own === 8)) ||
                        (visiblePoints.opp >= 9 || (partoppRef.current === 1 && visiblePoints.opp === 8));

  const [selectedCard, setSelectedCard] = React.useState<GameCard>()
  //  const [waitingOpponent, setWaitingOpponent] = React.useState(true)

  // Players
  const user = useAppSelector((state: RootState) => state.gameplayer)
  const [oponent, setOponent] = React.useState<Oponent>({
    username: '',
    avatar: '',
  })

  // Cards
  const [tableCards, setTableCards] = React.useState<Card[]>([])
  const [playerCards, setPlayerCards] = React.useState<Card[]>([])
  const oponentCards = React.useRef<number>(3)

  /*const [cpEight, setCpEight] = React.useState<Card>({
      id: -1, position: -1, suit: "", number: -1, image: ""
  }); */

  const cpEightRef = useRef<Card>({ id: -1, position: -1, suit: "", number: -1, image: "" });
  const cpownRef = useRef<Card>({ id: -1, position: -1, suit: "", number: -1, image: "" });
  const cpoppRef = useRef<Card>({ id: -1, position: -1, suit: "", number: -1, image: "" });

  // Efecto visual
  const [secondEffect, setSecondEffect] = useState(false);
  const [paramFlag, setParamFlag] = useState<boolean>(true);
  const [paramCards, setParamCards] = useState<Card[]>([]);
  const [numCard, setNumCard] = React.useState<number>(0);
  const [thirdEffect, setThirdEffect] = useState(false);
  const [cardEffect, setCardEffect] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [isReturningToDeck, setIsReturningToDeck] = useState(false);
  const [trickWinner, setTrickWinner] = useState<'player' | 'opp' | null>(null);

  // Temporizador de 30s por turno y estado de rendición
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const hasTimedOut = useRef<boolean>(false);

  // Perro guardián (Watchdog) para transiciones de mano en 1 vs 1
  const [isWaitingHandChange1v1, setIsWaitingHandChange1v1] = useState<boolean>(false);
  const isWaitingHandChange1v1Ref = useRef<boolean>(false);
  useEffect(() => { isWaitingHandChange1v1Ref.current = isWaitingHandChange1v1; }, [isWaitingHandChange1v1]);
  const handWatchdogTimerRef = useRef<any>(null);

  // Captura global de excepciones y telemetría automática hacia Railway
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      reportAppError({
        source: 'Game1v1',
        errorMessage: `Uncaught: ${event.message} en ${event.filename}:${event.lineno}`,
        roomName: typeof roomName === 'string' ? roomName : undefined,
        username: user?.name,
        userId: user?.id,
        stackTrace: event.error?.stack
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportAppError({
        source: 'Game1v1',
        errorMessage: `Unhandled Promise: ${event.reason?.message || event.reason}`,
        roomName: typeof roomName === 'string' ? roomName : undefined,
        username: user?.name,
        userId: user?.id,
        stackTrace: event.reason?.stack
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [roomName, user]);

  // El botón de Pedir solo debe habilitarse cuando sea tu turno, tengas cartas, no estés en Tumba,
  // la apuesta no haya llegado a 9 y no hayas pedido tú previamente sin que el rival revire.
  const canPedir = isMyTurn &&
                   !isTumbaActive &&
                   lastStakeAskedBy !== 'player' &&
                   currentStake < 9 &&
                   playerCards.length > 0 &&
                   !isDealing &&
                   !isReturningToDeck &&
                   !isProcessingMove &&
                   !isWaitingOppTumba &&
                   tumbaCountdown === null &&
                   pedirChallenge === null;



  const handleTurnTimeout1v1 = () => {
    if (!switchturn.current || isProcessingMove || isDealing || playerCards.length === 0) return;
    let chosen = playerCards[0];
    const currentLifeId = cpEightRef.current?.id ?? -1;
    const isOppLead = roundturn.current === false && switchturn.current === true;
    const isOppTrump = isOppLead && (cpoppRef.current?.id !== undefined && cpoppRef.current.id !== -1)
      ? isTrumpCard(cpoppRef.current.id, currentLifeId)
      : false;
    const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
    const isFirstBaza = playerCards.length === 3;
    const hasCincoDeOro = playerCards.some(c => c.id === 4);
    const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
    const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;

    if (isOppTrump && playerHasTrump && !canDenyCinco) {
      const trump = playerCards.find(c => isTrumpCard(c.id, currentLifeId));
      if (trump) chosen = trump;
    }

    handleCardClick(chosen);
  };

  const handleTimeoutForfeit = async () => {
    if (hasTimedOut.current) return;
    hasTimedOut.current = true;
    console.log("[Timeout] Se agotaron los 30s del turno.");
    try {
      if (connection) {
        await connection.invoke("TimeoutRound1vs1", {
          game: idGame.current,
          order: 88,
          content: playerown.current
        });
      }
    } catch (error) {
      console.error("Error al notificar tiempo agotado:", error);
    }
  };

  const handleSurrenderClick = () => {
    Swal.fire({
      title: '¿Abandonar la partida?',
      text: 'Si te sales ahora, perderás la partida y tu rival se ganará automáticamente todo lo apostado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Sí, salir y rendirme',
      cancelButtonText: 'Seguir jugando',
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (connection) {
          try {
            await connection.invoke("SurrenderGame1vs1", {
              game: idGame.current,
              order: 99,
              content: playerown.current
            });
          } catch (error) {
            console.error("Error al enviar rendición:", error);
          }
        }
        router.push("/desk");
      }
    });
  };

  const handleAnswerPedir = async (action: 'accept' | 'deny' | 'doblar') => {
    if (!pedirChallenge || !connection) return;
    const targetStake = pedirChallenge.targetStake;
    let charTurn = "";
    if (action === 'accept') {
      charTurn = targetStake === 3 ? "2" : (targetStake === 6 ? "5" : "8");
    } else if (action === 'deny') {
      charTurn = targetStake === 3 ? "3" : (targetStake === 6 ? "6" : "9");
    } else if (action === 'doblar') {
      charTurn = targetStake === 3 ? "4" : "7";
      const nextStake = targetStake === 3 ? 6 : 9;
      setCurrentStake(nextStake);
      currentStakeRef.current = nextStake;
      setLastStakeAskedBy('player');
      lastStakeAskedByRef.current = 'player';
    }

    setPedirChallenge(null);

    const dataTurn = playerown.current + " " + playeropp.current + " " + (!roundturn.current == true ? "1 " : "0 ");
    const dato = { game: idGame.current, order: 0, content: dataTurn + charTurn };
    try {
      console.log("Enviando respuesta Answer369Game:", dato);
      await connection.invoke("Answer369Game", dato);
    } catch (err) {
      console.error("Error al enviar Answer369Game:", err);
    }
  };

  // Cuenta regresiva de 30 segundos por turno (se pausa durante análisis y decisión de Tumba)
  useEffect(() => {
    if (isDealing || isReturningToDeck || !hasConnected.current || isWaitingOppTumba || tumbaCountdown !== null || pedirChallenge !== null) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isMyTurn && !hasTimedOut.current && !isWaitingOppTumba && tumbaCountdown === null) {
            handleTimeoutForfeit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, isDealing, isReturningToDeck, isWaitingOppTumba, tumbaCountdown, pedirChallenge]);

  // Cuenta regresiva para responder al Pedir (12 segundos)
  useEffect(() => {
    if (!pedirChallenge) return;

    const interval = setInterval(() => {
      setPedirChallenge(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          handleAnswerPedir('accept');
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pedirChallenge]);

  const [visibleCard, setVisibleCard] = React.useState<boolean[]>([true, true, true])

  // Styles for cards
  const playerCardStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'transform rotate-[-10deg] mt-[-4px] hover:mt-[-8px]'
      case 1:
        return 'transform rotate-[-0deg] mx-[10px] mt-[-10px] hover:mt-[-14px] '
      case 2:
        return 'transform rotate-[10deg] mt-[-4px] hover:mt-[-8px]'
      default:
        return ''
    }
  }

  const oponentCardStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'transform rotate-[-10deg] mt-[-4px]'
      case 1:
        return 'transform rotate-[-0deg] mx-[10px] mt-[-10px]'
      case 2:
        return 'transform rotate-[10deg] mt-[-4px]'
      default:
        return ''
    }
  }

  /// Variables to be used by server .NET Core (signalR)

  const connection = useSignalRContext();
  const hasConnected = React.useRef(false);
  const [played, setPlayed] = React.useState<Message>({
    game: 0, order: 0, content: ''
  });

  // Number of Game (set by server)

  const idGame = React.useRef<number>(0);

  // Start of the Game on solitaire mode

  useEffect(() => {
    setOponent({ username: 'Pericon', avatar: '/avatar.png' })
  }, [])

  const AlertMessage = (_title: string, _time: number) => ({
    firstMessage: {
      title: _title,
      showConfirmButton: false,
      timer: _time,
      color: "#ffffff",
      background: "#9d6727",
      allowEscapeKey: false,
      backdrop: true,
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      },
    }
  });

  const AskingQuestion = (_title: string) => ({
    firstMessage: {
      title: _title,
      showConfirmButton: false,
      timer: 4000,
      color: "#ffffff",
      background: "#9d6727",
      allowEscapeKey: false,
      backdrop: true,
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      },
    }
  });

  const Ask369Question = (_title: string) => ({
    firstMessage: {
      title: _title,
      showConfirmButton: true,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Sí',
      denyButtonText: 'No',
      cancelButtonText: 'Doblo',
      timer: 4000,
      color: "#ffffff",
      background: "#9d6727",
      allowEscapeKey: false,
      allowOutsideClick: false,
      timerProgressBar: true,      
      backdrop: true,
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      },
    },
    secondMessage: {
      title: _title,
      showConfirmButton: false,
      timer: 4000,
      color: "#ffffff",
      background: "#9d6727",
      allowEscapeKey: false,
      backdrop: true,
      customClass: {
        title: styles.customtitle,
        popup: styles.custompopup
      },
    }
  });


  //
  // Inicio del Juego, con repartición de cartas colocando el usuario como Mano
  //

  useEffect(() => {
    const runStart = async () => {
      const deserialized = searchParams.get('datos');
      if (connection && !hasConnected.current && deserialized) {
        try {
          const obj = JSON.parse(decodeURIComponent(deserialized));
          datos.current = obj;
          const turny: string = obj.flag == true ? "1" : "0";
          playerturn.current = turny;
          changeturn.current = false;
          roundturn.current = false;
          switchturn.current = false;
          setIsMyTurn(false);
          setTimeLeft(30);
          hasTimedOut.current = false;
          console.log("runStart. Playerturn: ", playerturn.current);
          setStateown(obj.flag);
          idGame.current = obj.id;

          // Asignar el connectionId vivo si está disponible
          if (connection.connectionId) {
            playerown.current = connection.connectionId;
          } else {
            playerown.current = obj.flag == true ? obj.userone : obj.usertwo;
          }
          playeropp.current = obj.flag == true ? obj.usertwo : obj.userone;

          const myName = obj.flag == true ? obj.nameone : obj.nametwo;
          if (myName) {
            try {
              await connection.invoke("IdentifyPlayer", myName, gameplayer.email || "", gameplayer.coins || 0);
            } catch (e) {
              console.error("Error al identificar jugador en juego:", e);
            }
          }

          const juego: number = obj.id;
          await connection.invoke("GetInitHand", juego, obj.flag);
          hasConnected.current = true;
        } catch (error: any) {
          console.error("Error al iniciar el juego 1vs1:", error);
          reportAppError({
            source: 'Game1v1',
            errorMessage: `Error en runStart 1vs1: ${error?.message || error}`,
            roomName: typeof roomName === 'string' ? roomName : undefined,
            username: user?.name,
            userId: user?.id,
            stackTrace: error?.stack
          });
        }
      }
    };
    runStart();
  }, [searchParams, connection]);

  useEffect(() => {
    if (!connection) return;

    // Manejo de reconexión transparente de SignalR en 1 vs 1
    const handleReconnected = async (newConnectionId?: string) => {
      console.log("[SignalR 1v1] Reconexión exitosa. Nuevo ID:", newConnectionId);
      if (newConnectionId) playerown.current = newConnectionId;
      if (connection && idGame.current > 0) {
        try {
          await connection.invoke("RejoinGame1vs1", idGame.current, datos.current.flag);
        } catch (err: any) {
          console.error("Error en RejoinGame1vs1 tras reconexión:", err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (connection && idGame.current > 0) {
          connection.invoke("RejoinGame1vs1", idGame.current, datos.current.flag).catch(() => {});
        }
      }
    };

    connection.onreconnected(handleReconnected);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    connection.on('OpponentConnectionUpdated', (data: any) => {
      console.log("[OpponentConnectionUpdated] Socket del rival actualizado:", data);
      if (data?.newConnectionId) {
        playeropp.current = data.newConnectionId;
      }
    });

    connection.on('OpponentReconnected1vs1', (data: any) => {
      console.log("[OpponentReconnected1vs1] El rival reconectó:", data);
      if (data?.opponentConnectionId) {
        playeropp.current = data.opponentConnectionId;
      }
    });

    connection.on('setInitHand', (modelo: Message) => {
      setIsWaitingHandChange1v1(false);
      if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
      playCardDealSound();
      execHand(modelo, false);
    });

    connection.on('setChangeHand', (modelo: Message) => {
      setIsWaitingHandChange1v1(false);
      if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
      execHand(modelo, true);
    });

    connection.on('GameHandUpdated1vs1', (data: any) => {
      console.log("[GameHandUpdated1vs1] Respaldo grupal de mano recibido:", data);
      setIsWaitingHandChange1v1(false);
      if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
      if (playerCards.length === 0 && data?.handCards) {
        const isPlayerOne = (datos.current.flag === true);
        const isMyTurn = isPlayerOne ? (data.handStarter === 1) : (data.handStarter === 2);
        const sentence: Message = {
          game: data.game,
          order: 87,
          content: `${data.handCards}-${isMyTurn ? "1" : "0"}-${data.pointsOne}-${data.pointsTwo}`
        };
        execHand(sentence, true);
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      connection.off('OpponentConnectionUpdated');
      connection.off('OpponentReconnected1vs1');
      connection.off('setInitHand');
      connection.off('setChangeHand');
      connection.off('GameHandUpdated1vs1');
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on('TumbaPassedNotice', (data: any) => {
      console.log("[TumbaPassedNotice] Recibido:", data);
      setIsWaitingOppTumba(false);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
      setTumbaCountdown(null);
      try { Swal.close(); } catch (_) {}

      const p1 = parseInt(data.pointsOne);
      const p2 = parseInt(data.pointsTwo);
      if (!isNaN(p1) && !isNaN(p2)) {
        if (datos.current.flag) {
          updatePointsAndTumba(p1, p2);
        } else {
          updatePointsAndTumba(p2, p1);
        }
      }

      if (data.passedByMe) {
        playVoiceAudio('pasaste_en_tumba', "Pasaste en Tumba. Menos una piedra.");
      } else {
        playVoiceAudio('rivales_pasaron_tumba', "¡Los rivales pasaron en Tumba! Más una piedra.");
      }
      triggerAnnouncement({
        type: 'tumba',
        title: data.passedByMe ? 'PASASTE EN TUMBA' : '¡EL RIVAL PASÓ EN TUMBA!',
        subtitle: data.message,
        badge: data.passedByMe ? '-1 PIEDRA' : '+1 PIEDRA'
      }, 3000);
    });

    connection.on('TumbaAcceptedNotice', (data: any) => {
      console.log("[TumbaAcceptedNotice] Recibido:", data);
      setIsWaitingOppTumba(false);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
      setTimeLeft(30);
      hasTimedOut.current = false;
      triggerAnnouncement({
        type: 'tumba',
        title: '¡RIVAL ACEPTÓ JUGAR!',
        subtitle: 'La mano de Tumba está en juego. ¡A jugar!',
        badge: 'MANO EN JUEGO'
      }, 2500);
      playVoiceAudio('mano_tumba_aceptada', "¡Aceptaron jugar la mano de Tumba!");
    });

    return () => {
      connection.off('TumbaPassedNotice');
      connection.off('TumbaAcceptedNotice');
    };
  }, [connection]);


  const execHand = async (modelo: Message, bandera: boolean) => {
    console.log("Modelo: ", modelo);
    setIsWaitingHandChange1v1(false);
    if (handWatchdogTimerRef.current) {
      clearTimeout(handWatchdogTimerRef.current);
      handWatchdogTimerRef.current = null;
    }
    isProcessingRef.current = false;
    setIsProcessingMove(false);
    setIsWaitingOppTumba(false);
    if (tumbaCountdownTimerRef.current) {
      clearInterval(tumbaCountdownTimerRef.current);
      tumbaCountdownTimerRef.current = null;
    }
    setTumbaCountdown(null);

    setPlayed(modelo);
    idGame.current = modelo.game; 
    pointOne.current = 0; 
    pointTwo.current = 0;
    const cpOne: Card = Baraja(Porcion(modelo.content, 0), 0);
    const cpTwo: Card = Baraja(Porcion(modelo.content, 1), 1);
    const cpThree: Card = Baraja(Porcion(modelo.content, 2), 2);
    const cpFour: Card = Baraja(Porcion(modelo.content, 3), 0);
    const cpFive: Card = Baraja(Porcion(modelo.content, 4), 1);
    const cpSix: Card = Baraja(Porcion(modelo.content, 5), 2);
    const cpSeven: Card = Baraja(Porcion(modelo.content, 6), 0);
    const turno: boolean = (Porcion(modelo.content, 7) == 1 ? true : false);
    const p1Raw = Porcion(modelo.content, 8);
    const p2Raw = Porcion(modelo.content, 9);
    if (!isNaN(p1Raw) && !isNaN(p2Raw)) {
      if (datos.current.flag == true) {
        updatePointsAndTumba(p1Raw, p2Raw);
      } else {
        updatePointsAndTumba(p2Raw, p1Raw);
      }
    }

    setIsDealing(true);
    playCardSound();
    setTimeout(() => {
      setIsDealing(false);
    }, 1200);


    // 1. Asignación de cartas según la identidad del jugador (Player 1 o Player 2):
    const isPlayerOne = (datos.current.flag === true);
    const myHandCards = isPlayerOne
      ? [cpOne, cpTwo, cpThree]
      : [cpFour, cpFive, cpSix];
    setPlayerCards(myHandCards);

    // 2. Asignación del turno de salida de la ronda según 'turno':
    if (turno === true) {
      changeturn.current = true;
      roundturn.current = true;
      switchturn.current = true;
      setIsMyTurn(true);
    } else {
      changeturn.current = false;
      roundturn.current = false;
      switchturn.current = false;
      setIsMyTurn(false);
    }
    setTimeLeft(30);
    hasTimedOut.current = false;
    cpownRef.current = { id: -1, position: -1, suit: "", number: -1, image: "" };
    cpoppRef.current = { id: -1, position: -1, suit: "", number: -1, image: "" };
    setCurrentStake(1);
    currentStakeRef.current = 1;
    setLastStakeAskedBy(null);
    lastStakeAskedByRef.current = null;
    oponentCards.current = 3;
    pointOne.current = 0;
    pointTwo.current = 0;
    setTableCards([cpSeven]);
    cpEightRef.current = cpSeven;

    // Reglas oficiales de La Tumba y Obligado
    const playerInTumba = (pointsown.current >= 9 || (partownRef.current === 1 && pointsown.current === 8));
    const oppInTumba = (pointsopp.current >= 9 || (partoppRef.current === 1 && pointsopp.current === 8));
    const isObligado = playerInTumba && oppInTumba;

    if (isObligado) {
      setIsWaitingOppTumba(false);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
      triggerAnnouncement({
        type: 'tumba',
        title: '¡ESTADO OBLIGADO!',
        subtitle: '¡Mano definitiva! Quien gane 2 de 3 bazas gana el juego',
        badge: 'ÚLTIMA MANO'
      }, 3500);
      playVoiceAudio('obligado', "¡Obligado! Quien gane esta mano, gana la partida.");
      vibrateDevice('tumba');
      playSynthSound('tumba');
    } else if (playerInTumba) {
      setIsWaitingOppTumba(false);
      isProcessingRef.current = true;
      setIsProcessingMove(true);

      triggerAnnouncement({
        type: 'tumba',
        title: '¡ESTÁS EN TUMBA!',
        subtitle: 'Analiza tus 3 cartas y La Vida. Tienes 10 segundos.',
        badge: 'TUMBA: 10 SEGUNDOS'
      }, 3500);
      playVoiceAudio('estas_en_tumba', "¡Estás en tumba! Analiza tus cartas y la vida.");
      vibrateDevice('tumba');
      playSynthSound('tumba');

      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
      let count = 10;
      setTumbaCountdown(count);

      tumbaCountdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setTumbaCountdown(count);
        } else {
          if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
          setTumbaCountdown(null);

          let tumbaTimerInterval: any;
          Swal.fire({
            title: "¿Deseas jugar esta ronda en TUMBA?",
            html: `
              <p style="font-size: 13px; color: #fde68a; margin-bottom: 8px;">
                Si aceptas y pierdes, se te restarán 3 piedras. Si rechazas, se te resta 1 piedra y se le suma al contrario.
              </p>
              <div style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; padding: 6px; font-size: 12px; color: #fca5a5; font-weight: bold;">
                Auto-ingreso a la mano en: <strong id="tumba-swal-timer" style="color: #ef4444; font-size: 14px;">3</strong>s
              </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, acepto jugar",
            cancelButtonText: "No, paso esta mano",
            confirmButtonColor: "#22c55e",
            cancelButtonColor: "#ef4444",
            allowOutsideClick: false,
            allowEscapeKey: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: () => {
              const timerEl = document.getElementById("tumba-swal-timer");
              tumbaTimerInterval = setInterval(() => {
                if (timerEl) {
                  const left = Math.ceil((Swal.getTimerLeft() || 0) / 1000);
                  timerEl.textContent = left.toString();
                }
              }, 100);
            },
            willClose: () => {
              if (tumbaTimerInterval) clearInterval(tumbaTimerInterval);
            },
            customClass: {
              title: styles.customtitle,
              popup: styles.custompopup
            }
          }).then(async (result) => {
            const autoAcceptedByTimer = result.dismiss === Swal.DismissReason.timer;
            if (result.isConfirmed || autoAcceptedByTimer) {
              triggerAnnouncement({
                type: 'tumba',
                title: '¡A JUGAR EN TUMBA!',
                subtitle: autoAcceptedByTimer ? 'Auto-ingreso a la mano por tiempo' : (turno ? 'Te toca salir a ti' : 'El rival sale primero'),
                badge: 'MANO DE TUMBA'
              }, 2000);
              isProcessingRef.current = false;
              setIsProcessingMove(false);
              setTimeLeft(30);
              hasTimedOut.current = false;
              if (connection) {
                try {
                  await connection.invoke("AcceptTumba1vs1", {
                    game: idGame.current,
                    order: 88,
                    content: playerown.current
                  });
                } catch (e) {
                  console.error("Error al enviar AcceptTumba1vs1:", e);
                }
              }
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              isProcessingRef.current = false;
              setIsProcessingMove(false);
              setIsWaitingOppTumba(false);
              playVoiceAudio('pasaste_en_tumba', "Pasaste en Tumba. Menos una piedra.");
              vibrateDevice('reject');
              playSynthSound('reject');
              if (connection) {
                try {
                  await connection.invoke("PassTumba1vs1", {
                    game: idGame.current,
                    order: 89,
                    content: playerown.current
                  });
                } catch (e) {
                  console.error("Error al enviar PassTumba1vs1:", e);
                }
              }
            }
          });
        }
      }, 1000);
    } else if (oppInTumba) {
      triggerAnnouncement({
        type: 'tumba',
        title: '¡EL RIVAL ESTÁ EN TUMBA!',
        subtitle: 'Tu contrincante está analizando sus cartas (10s)...',
        badge: 'Rival en Tumba'
      }, 3500);
      playVoiceAudio('estas_en_tumba', "¡Los rivales están en tumba!");
      vibrateDevice('tumba');
      playSynthSound('tumba');
      setIsWaitingOppTumba(true);
      setTimeLeft(30);
      hasTimedOut.current = false;

      // Watchdog de seguridad: máximo 15 segundos esperando la decisión de Tumba del rival
      setTimeout(() => {
        setIsWaitingOppTumba(prev => {
          if (prev) {
            console.warn("[Watchdog Tumba 1v1] Tiempo de espera del rival agotado (15s). Desbloqueando mesa...");
            setTimeLeft(30);
            hasTimedOut.current = false;
            isProcessingRef.current = false;
            setIsProcessingMove(false);
            return false;
          }
          return false;
        });
      }, 15000);
    } else {
      setIsWaitingOppTumba(false);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
    }
  };


  const handleCardClick = async (cardZero: Card) => {
    if (!connection || isDealing || isReturningToDeck || isProcessingMove || isProcessingRef.current || isWaitingOppTumba || tumbaCountdown !== null) return;
    if (connection) {
      playCardDropSound();
      playCardSound();
      setSelectedCard(cardZero);

      //      let numGame : number = played?.game; 
      let dato: Message = { game: 0, order: 0, content: "" };
      let numOrder: number = 0;
      let strMessage: string = ""; //card.id.toString();
      let flagTurn: string = (!roundturn.current == true ? " 1" : " 0");
      cpownRef.current = cardZero;
      if (connection?.connectionId) {
        playerown.current = connection.connectionId;
      }
      if (roundturn.current == true && switchturn.current == true) {
        numOrder = 82;
        strMessage = playerown.current + " " + playeropp.current + " " + cardZero.id.toString() + flagTurn;
        dato = { game: idGame.current, order: numOrder, content: strMessage };
        setTableCards([cpEightRef.current, cpownRef.current]);
        switchturn.current = false;
        setIsMyTurn(false);
        setTimeLeft(30);
        hasTimedOut.current = false;
      } else if (roundturn.current == false && switchturn.current == true) {
        // Regla del Pelao: Si el rival salió con triunfo y tenemos triunfos, obligatorio tirar triunfo (salvo excepción del 5 de Oro en 1ra baza)
        const currentLifeId = cpEightRef.current?.id ?? -1;
        const isOppTrump = (cpoppRef.current?.id !== undefined && cpoppRef.current.id !== -1)
          ? isTrumpCard(cpoppRef.current.id, currentLifeId)
          : false;
        const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
        const isFirstBaza = playerCards.length === 3;
        const hasCincoDeOro = playerCards.some(c => c.id === 4);
        const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
        const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;

        if (isOppTrump && playerHasTrump && !canDenyCinco && !isTrumpCard(cardZero.id, currentLifeId)) {
          playVoiceAudio('regla_del_pelao', "¡Regla del Pelao! Debes lanzar un triunfo.");
          vibrateDevice('reject');
          playSynthSound('reject');
          Swal.fire({
            title: "¡REGLA DEL PELAO!",
            text: "Salieron con un triunfo. ¡Estás obligado a lanzar un triunfo de tu mano!",
            icon: "warning",
            confirmButtonText: "Entendido",
            confirmButtonColor: "#f59e0b"
          });
          return;
        }

        numOrder = 83;
        strMessage = playeropp.current + " " + cpoppRef.current.id.toString() + " ";
        strMessage += playerown.current + " " + cardZero.id.toString() + " " + cpEightRef.current.id.toString() + flagTurn;
        setTableCards([cpEightRef.current, cpoppRef.current, cpownRef.current]);
        dato = { game: idGame.current, order: numOrder, content: strMessage };
        switchturn.current = false;
        setIsMyTurn(false);
        setTimeLeft(30);
        hasTimedOut.current = false;
      }

      if (numOrder === 0) {
        console.warn("handleCardClick: Not player's turn to play (numOrder is 0)");
        return;
      }

      setPlayerCards(prevCards => prevCards.filter(card => card.id != cardZero.id));
      console.log("handleCardClick: roundturn a final:", roundturn.current);
      try {
        console.log("Enviando objeto al servidor:", dato);
        await connection.invoke("RequestCard1vs1", dato);
      } catch (error: any) {
        console.error("Error al enviar objeto al servidor:", error);
        reportAppError({
          source: 'Game1v1',
          errorMessage: `Error al enviar carta (orden ${numOrder}): ${error?.message || error}`,
          roomName: typeof roomName === 'string' ? roomName : undefined,
          username: user?.name,
          userId: user?.id,
          extraData: { dato }
        });
      };
    };
  };

  const handlePedirClick = async () => {
    if (!connection) return;
    if (playerCards.length === 0) return;
    const curr = currentStakeRef.current;
    if (curr >= 9) return;

    // Si hay Tumba activa en algún jugador, Pedir no aplica (ni para 9 ni para tumba de para atrás en 8)
    const isTumba = (visiblePoints.own >= 9 || (partownRef.current === 1 && visiblePoints.own === 8)) ||
                    (visiblePoints.opp >= 9 || (partoppRef.current === 1 && visiblePoints.opp === 8));
    if (isTumba) {
      playVoiceAudio('en_tumba_no_se_pide', "En tumba no se puede pedir.");
      vibrateDevice('reject');
      Swal.fire({
        title: "¡ESTADO DE TUMBA!",
        text: "En Tumba no está permitido pedir.",
        icon: "warning",
        confirmButtonColor: "#d97706"
      });
      return;
    }

    // Regla de alternancia: Si ya pediste tú, no puedes pedir otra vez hasta que el rival revire y sea aceptado
    if (lastStakeAskedByRef.current === 'player') {
      Swal.fire({
        title: "Turno del Rival",
        text: "Ya pediste en esta mano. Tu rival es quien tiene el derecho a pedir.",
        icon: "info",
        confirmButtonColor: "#d97706"
      });
      return;
    }

    const nextStake = curr === 1 ? 3 : (curr === 3 ? 6 : 9);
    const numOrder = nextStake === 3 ? 70 : (nextStake === 6 ? 71 : 72);

    setLastStakeAskedBy('player');
    lastStakeAskedByRef.current = 'player';

    const phrase = nextStake === 3 ? "¡Dame tres!" : nextStake === 6 ? "¡Quiero seis!" : "¡Van nueve!";
    const audioKey = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';
    const annType: AnnouncementType = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';

    // Feedback audiovisual inmediato
    playVoiceAudio(audioKey, phrase);
    vibrateDevice('pedir');
    playSynthSound('canto');
    playCantoSound();
    triggerAnnouncement({
      type: annType,
      title: phrase.toUpperCase(),
      subtitle: `Retando al rival por ${nextStake} piedras`
    }, 2500);

    let dataTurn: string = playerown.current + " " + playeropp.current + " " + (!roundturn.current == true ? " 1" : " 0");
    let dato: Message = { game: idGame.current, order: numOrder, content: dataTurn };
    try {
      console.log("Enviando Pedir al servidor:", dato);
      await connection.invoke("Ask369Game", dato);
    } catch (error) {
      console.error("Error al enviar Pedir:", error);
    }
  };

  useEffect(() => {
    if (!connection) return;
    connection.on('Asked369Game', (modelo: Message) => {
      console.log("[Asked369Game] Recibido:", modelo);
      const targetStake = modelo.content === "1" ? 3 : (modelo.content === "4" ? 6 : 9);
      const rejectReward = targetStake === 3 ? 1 : (targetStake === 6 ? 3 : 6);

      setLastStakeAskedBy('opp');
      lastStakeAskedByRef.current = 'opp';
      setCurrentStake(targetStake);
      currentStakeRef.current = targetStake;

      const phrase = targetStake === 3 ? "¡Dame tres!" : targetStake === 6 ? "¡Quiero seis!" : "¡Van nueve!";
      const audioKey = targetStake === 3 ? 'dame_tres' : targetStake === 6 ? 'quiero_seis' : 'van_nueve';
      const annType: AnnouncementType = targetStake === 3 ? 'dame_tres' : targetStake === 6 ? 'quiero_seis' : 'van_nueve';

      playVoiceAudio(audioKey, phrase);
      vibrateDevice('pedir');
      playSynthSound('canto');
      const rivalName = datos.current.flag ? datos.current.nametwo : datos.current.nameone;
      const canDoblar = targetStake < 9;

      try { Swal.close(); } catch (_) {}

      setPedirChallenge({
        challengerName: rivalName || "Tu rival",
        targetStake,
        rejectReward,
        canDoblar,
        timeLeft: 12
      });
    });

    return () => {
      connection.off('Asked369Game');
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on('Answered369Game', (modelo: Message) => {
      console.log("Answered369Game (Retador):", modelo);
      const parts = modelo.content.split(" ");
      const choice = parts[0];
      const p1 = parts[1] ? parseInt(parts[1]) : null;
      const p2 = parts[2] ? parseInt(parts[2]) : null;

      if (p1 !== null && p2 !== null && !isNaN(p1) && !isNaN(p2)) {
        if (datos.current.flag) {
          updatePointsAndTumba(p1, p2);
        } else {
          updatePointsAndTumba(p2, p1);
        }
      }

      if (choice === "2" || choice === "5" || choice === "8") {
        // El rival aceptó
        const newStake = choice === "2" ? 3 : (choice === "5" ? 6 : 9);
        setCurrentStake(newStake);
        currentStakeRef.current = newStake;
        setLastStakeAskedBy('player');
        lastStakeAskedByRef.current = 'player';
        setPedirChallenge(null);

        playVoiceAudio('acepto', "¡Acepto!");
        playSynthSound('accept');
        vibrateDevice('accept');
        triggerAnnouncement({
          type: 'acepto',
          title: '¡EL RIVAL ACEPTÓ!',
          subtitle: `Mano en juego por ${newStake} piedras. El rival tiene el derecho a revirar.`,
          badge: `Apuesta: ${newStake} piedras`
        }, 2500);
      } else if (choice === "3" || choice === "6" || choice === "9") {
        // El rival rechazó: ¡ganamos la ronda inmediatamente!
        const reward = choice === "3" ? 1 : (choice === "6" ? 3 : 6);
        setPedirChallenge(null);
        playVoiceAudio('no_quiero', "¡No quiero!");
        playSynthSound('win');
        vibrateDevice('winRound');
        triggerAnnouncement({
          type: 'win_round',
          title: '¡EL RIVAL NO QUIERE!',
          subtitle: `¡Ganas ${reward} piedra(s) inmediatamente!`,
          badge: `+${reward} piedras`
        }, 3000);

        setTableCards(prev => [cpEightRef.current]);
        setPlayerCards([]);

        setIsWaitingHandChange1v1(true);
        if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
        handWatchdogTimerRef.current = setTimeout(async () => {
          if (playerCards.length === 0 && connection) {
            console.warn("[Watchdog 1v1] Espera de nueva mano tras rechazo agotada. Solicitando...");
            try {
              await connection.invoke("RequestNewHand1vs1", idGame.current);
            } catch (e) {
              console.error("Error en Watchdog RequestNewHand1vs1:", e);
            }
          }
        }, 5500);

        setTimeout(async () => {
          const dato = { game: idGame.current, order: 87, content: "" };
          try {
            await connection.invoke("ChangeGame1vs1", dato);
          } catch (err) {
            console.error("Error al cambiar juego tras rechazo:", err);
          }
        }, 2200);
      }
    });

    return () => {
      connection.off('Answered369Game');
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on('EndAsk369Round', (modelo: Message) => {
      console.log("EndAsk369Round (Respondedor):", modelo);
      const parts = modelo.content.split(" ");
      const choice = parts[0];
      const p1 = parts[1] ? parseInt(parts[1]) : null;
      const p2 = parts[2] ? parseInt(parts[2]) : null;

      if (p1 !== null && p2 !== null && !isNaN(p1) && !isNaN(p2)) {
        if (datos.current.flag) {
          updatePointsAndTumba(p1, p2);
        } else {
          updatePointsAndTumba(p2, p1);
        }
      }

      if (choice === "2" || choice === "5" || choice === "8") {
        // Aceptaste
        const newStake = choice === "2" ? 3 : (choice === "5" ? 6 : 9);
        setCurrentStake(newStake);
        currentStakeRef.current = newStake;
        setLastStakeAskedBy('opp');
        lastStakeAskedByRef.current = 'opp';
        setPedirChallenge(null);

        playVoiceAudio('acepto', "¡Acepto!");
        playSynthSound('accept');
        vibrateDevice('accept');
        triggerAnnouncement({
          type: 'acepto',
          title: '¡ACEPTASTE EL RETO!',
          subtitle: `Mano en juego por ${newStake} piedras. Tienes derecho a revirar.`,
          badge: `Apuesta: ${newStake} piedras`
        }, 2500);
      } else if (choice === "3" || choice === "6" || choice === "9") {
        // Rechazaste
        const reward = choice === "3" ? 1 : (choice === "6" ? 3 : 6);
        setPedirChallenge(null);
        playVoiceAudio('no_quiero', "¡No quiero!");
        playSynthSound('reject');
        vibrateDevice('reject');
        triggerAnnouncement({
          type: 'no_quiero',
          title: '¡NO QUIERO!',
          subtitle: `Rechazaste el pedido. Tu rival se lleva ${reward} piedra(s).`,
          badge: `Ronda finalizada`
        }, 2500);

        setTableCards(prev => [cpEightRef.current]);
        setPlayerCards([]);

        setIsWaitingHandChange1v1(true);
        if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
        handWatchdogTimerRef.current = setTimeout(async () => {
          if (playerCards.length === 0 && connection) {
            console.warn("[Watchdog 1v1] Espera de nueva mano en EndAsk369Round agotada. Solicitando...");
            try {
              await connection.invoke("RequestNewHand1vs1", idGame.current);
            } catch (e) {
              console.error("Error en Watchdog RequestNewHand1vs1:", e);
            }
          }
        }, 5500);
      }
    });

    return () => {
      connection.off('EndAsk369Round');
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on('ResponseCard1vs1', (modelo: Message) => {
      console.log("ResponseCard1vs1: ", modelo);
      oponentCards.current = oponentCards.current - 1;
      if (modelo.order == 84) {
        const cardZero: Card = Baraja(parseInt(Trozo(modelo.content, 2)), 0);
        const turnZero: boolean = (Trozo(modelo.content, 3) == "1" ? false : true);
        playCardSound();
        switchturn.current = true;
        setIsMyTurn(true);
        setTimeLeft(30);
        hasTimedOut.current = false;
        cpoppRef.current = cardZero;
        setTableCards(prev => [cpEightRef.current, cpoppRef.current]);
        isProcessingRef.current = false;
        setIsProcessingMove(false);
        setIsWaitingOppTumba(false);
        console.log("Orden 84: playerturn: ", playerturn.current, " roundturn: ", roundturn.current);
      } else {
        const cardZero: Card = Baraja(parseInt(Trozo(modelo.content, 1)), 0);
        const Razon: string = Trozo(modelo.content, 3);
        const Orden: string = Trozo(modelo.content, 4);
        isProcessingRef.current = true;
        setIsProcessingMove(true);
        playCardSound();
        setTableCards([cpEightRef.current, cpownRef.current, cardZero]);
        let xcad: string = "";
        const winner = Razon == "1" ? 'player' : 'opp';
        setTrickWinner(winner);

        // Verificar si ocurrió La Cogía (10 de oro vs 1 de oro en cualquier sentido)
        const isCogiaInTrick = (cpownRef.current.id === 7 && cardZero.id === 0) || (cpownRef.current.id === 0 && cardZero.id === 7);
        if (isCogiaInTrick) {
          const playerDidCogia = (cpownRef.current.id === 0);
          if (playerDidCogia) {
            playVoiceAudio('la_cogia_propia', "¡La Cogía! Mataron el diez con el As de oro.");
            vibrateDevice('winMatch');
            playSynthSound('win');
            triggerAnnouncement({
              type: 'la_cogia',
              title: '¡LA COGÍA!',
              subtitle: '¡Cobraste La Cogía con el As de Oro!',
              badge: '+3 piedras automáticas'
            }, 2600);
          } else {
            playVoiceAudio('la_cogia_rival', "¡La Cogía para los rivales!");
            vibrateDevice('reject');
            playSynthSound('reject');
            triggerAnnouncement({
              type: 'la_cogia',
              title: '¡LA COGÍA PARA EL RIVAL!',
              subtitle: 'El rival cobró La Cogía con el As de Oro',
              badge: '+3 piedras para el rival'
            }, 2600);
          }
        }

        // PAUSA AMPLIADA: 4.0 SEGUNDOS EN BAZA FINAL (O 2.6s EN BAZAS INTERMEDIAS) PARA APRECIAR LA CARTA GANADORA/PERDEDORA
        const isHandOrGameEnding = (Orden == "2" || Orden == "3" || Orden == "4" || Orden == "5");
        const trickPauseMs = isHandOrGameEnding ? 4000 : 2600;

        setTimeout(() => {
          setIsReturningToDeck(true);
          playSwooshSound();

          setTimeout(() => {
            setIsReturningToDeck(false);
            setTrickWinner(null);

            // Sincronizar puntos desde el servidor
            const poneStr: string = Trozo(modelo.content, 7);
            const ptwoStr: string = Trozo(modelo.content, 8);
            if (poneStr && ptwoStr) {
              const sP1 = parseInt(poneStr);
              const sP2 = parseInt(ptwoStr);
              if (!isNaN(sP1) && !isNaN(sP2)) {
                if (datos.current.flag == true) {
                  updatePointsAndTumba(sP1, sP2);
                } else {
                  updatePointsAndTumba(sP2, sP1);
                }
              }
            }

            const stakePts = currentStakeRef.current;
            const rivalName = datos.current.flag ? datos.current.nametwo : datos.current.nameone;

            if (Razon == "1") {
              if (Orden == "1") {
                pointOne.current = pointOne.current + 1;
                roundturn.current = true;
                switchturn.current = true;
                setIsMyTurn(true);
                setTimeLeft(30);
                hasTimedOut.current = false;
                setTableCards(prev => [cpEightRef.current]);
                isProcessingRef.current = false;
                setIsProcessingMove(false);
              } else if (Orden == "3") {
                pointOne.current = 0;
                pointTwo.current = 0;
                switchturn.current = false;
                setIsMyTurn(false);
                setTimeLeft(30);
                hasTimedOut.current = false;
                setPlayerCards([]);

                const oppWasInTumba = (pointsopp.current >= 9 || (partoppRef.current === 1 && pointsopp.current === 8));
                if (oppWasInTumba) {
                  playVoiceAudio('rivales_cayeron_tumba', "¡Los rivales cayeron en Tumba! Más tres piedras.");
                  vibrateDevice('winRound');
                  playSynthSound('win');
                  triggerAnnouncement({
                    type: 'win_round',
                    title: '¡EL RIVAL CAYÓ EN TUMBA!',
                    subtitle: '+3 piedras para ti, -3 para él',
                    badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                  }, 2600);
                } else {
                  if (stakePts > 1) {
                    playVoiceAudio('ganaron_la_mano', "¡Ganaron la mano! Sumamos piedras.");
                  } else {
                    playVoiceAudio('ganaste_la_ronda', "¡Ganaste la ronda!");
                  }
                  vibrateDevice('winRound');
                  playSynthSound('win');
                  triggerAnnouncement({
                    type: 'win_round',
                    title: '¡GANASTE LA RONDA!',
                    subtitle: stakePts > 1 ? `Te llevas ${stakePts} piedras` : 'Sumas 1 piedra a tu cuenta',
                    badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                  }, 2600);
                }

                setIsWaitingHandChange1v1(true);
                if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
                handWatchdogTimerRef.current = setTimeout(async () => {
                  if (playerCards.length === 0 && connection) {
                    console.warn("[Watchdog 1v1] Tiempo de espera agotado. Solicitando nueva mano autoritativa...");
                    try {
                      await connection.invoke("RequestNewHand1vs1", idGame.current);
                    } catch (e) {
                      console.error("Error en Watchdog RequestNewHand1vs1:", e);
                    }
                  }
                }, 5500);

                setTimeout(async () => {
                  setTableCards(prev => [cpEightRef.current]);
                  const dato = { game: idGame.current, order: 87, content: "" };
                  try {
                    console.log("Enviando objeto al servidor:", dato);
                    await connection.invoke("ChangeGame1vs1", dato);
                  } catch (error) {
                    console.error("Error al enviar objeto al servidor:", error);
                  };
                }, 2600);
              } else if (Orden == "5") {
                switchturn.current = false;
                setIsMyTurn(false);
                // Mantener las cartas sobre el tapete para que el jugador vea claramente la jugada final
                setTableCards([cpEightRef.current, cpownRef.current, cardZero]);
                playVoiceAudio('tumba_completada', "¡Ganaste la partida! Tumba completada.");
                vibrateDevice('winMatch');
                playSynthSound('win');
                triggerAnnouncement({
                  type: 'win_round',
                  title: '¡CAMPEÓN DEL JUEGO!',
                  subtitle: '¡Tumba completada! Has ganado la partida.',
                  badge: 'VICTORIA'
                }, 4000);
                setTimeout(() => {
                  playVoiceAudio('victoria_partida', "¡Felicidades, ganaste la partida!");
                  Swal.fire({
                    title: "¡GANASTE EL JUEGO!",
                    text: "¡Felicidades, completaste la tumba y eres el vencedor de la partida!",
                    icon: "success",
                    confirmButtonText: "Ir al Lobby",
                    confirmButtonColor: "#d97706"
                  }).then(() => router.push("/desk"));
                }, 3500);
              }
            } else {
              if (Orden == "0") {
                pointTwo.current = pointTwo.current + 1;
                roundturn.current = false;
                switchturn.current = false;
                setIsMyTurn(false);
                setTimeLeft(30);
                hasTimedOut.current = false;
                setTableCards(prev => [cpEightRef.current]);
                isProcessingRef.current = false;
                setIsProcessingMove(false);
              } else if (Orden == "2") {
                pointOne.current = 0;
                pointTwo.current = 0;
                switchturn.current = false;
                setIsMyTurn(false);
                setTimeLeft(30);
                hasTimedOut.current = false;
                setPlayerCards([]);

                setIsWaitingHandChange1v1(true);
                if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
                handWatchdogTimerRef.current = setTimeout(async () => {
                  if (playerCards.length === 0 && connection) {
                    console.warn("[Watchdog 1v1] Espera de nueva mano agotada en rival. Solicitando...");
                    try {
                      await connection.invoke("RequestNewHand1vs1", idGame.current);
                    } catch (e) {
                      console.error("Error en Watchdog RequestNewHand1vs1:", e);
                    }
                  }
                }, 5500);

                const playerWasInTumba = (pointsown.current >= 9 || (partownRef.current === 1 && pointsown.current === 8));
                if (playerWasInTumba) {
                  playVoiceAudio('caiste_en_tumba', "¡Caíste en Tumba! Menos tres piedras.");
                  vibrateDevice('reject');
                  playSynthSound('reject');
                  triggerAnnouncement({
                    type: 'opp_win_round',
                    title: 'PERDISTE EN TUMBA',
                    subtitle: '-3 piedras para ti, +3 para el rival',
                    badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                  }, 2600);
                } else {
                  playVoiceAudio('punto_para_rivales', "Punto para los rivales.");
                  vibrateDevice('reject');
                  playSynthSound('reject');
                  triggerAnnouncement({
                    type: 'opp_win_round',
                    title: `${rivalName.toUpperCase()} GANA LA RONDA`,
                    subtitle: stakePts > 1 ? `El rival suma ${stakePts} piedras` : 'El rival suma 1 piedra',
                    badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                  }, 2600);
                }
              } else if (Orden == "4") {
                switchturn.current = false;
                setIsMyTurn(false);
                // Mantener las cartas sobre el tapete para que el jugador vea claramente la jugada final
                setTableCards([cpEightRef.current, cpownRef.current, cardZero]);
                playVoiceAudio('derrota_partida', "Partida terminada. Los rivales se llevaron la victoria.");
                vibrateDevice('reject');
                playSynthSound('reject');
                triggerAnnouncement({
                  type: 'opp_win_round',
                  title: 'JUEGO TERMINADO',
                  subtitle: 'Tu rival ha completado la tumba.',
                  badge: 'DERROTA'
                }, 4000);
                setTimeout(() => {
                  Swal.fire({
                    title: "JUEGO TERMINADO",
                    text: "Tu rival ha ganado la partida.",
                    icon: "error",
                    confirmButtonText: "Ir al Lobby",
                    confirmButtonColor: "#d97706"
                  }).then(() => router.push("/desk"));
                }, 3500);
              }
            }
          }, 850);
        }, trickPauseMs);
      }


    });
    return () => {
      connection.off('ResponseCard1vs1');
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on('ReasonRound1vs1', (modelo: string) => {
      console.log("ReasonRound1vs1", modelo);
      isProcessingRef.current = true;
      setIsProcessingMove(true);
      let xcad: string = "";
      const Razon: string = Trozo(modelo, 0);
      const Orden: string = Trozo(modelo, 1);
      console.log("Razon: ", Razon, " playerturn: ", playerturn.current, " roundturn: ", roundturn.current);
      const winner = Razon == "0" ? 'player' : 'opp';
      setTrickWinner(winner);

      // Verificar si ocurrió La Cogía (10 de oro vs 1 de oro en cualquier sentido)
      const isCogiaInTrick = (cpownRef.current.id === 7 && cpoppRef.current.id === 0) || (cpownRef.current.id === 0 && cpoppRef.current.id === 7);
      if (isCogiaInTrick) {
        const playerDidCogia = (cpownRef.current.id === 0);
        if (playerDidCogia) {
          playVoiceAudio('la_cogia_propia', "¡La Cogía! Mataron el diez con el As de oro.");
          vibrateDevice('winMatch');
          playSynthSound('win');
          triggerAnnouncement({
            type: 'la_cogia',
            title: '¡LA COGÍA!',
            subtitle: '¡Cobraste La Cogía con el As de Oro!',
            badge: '+3 piedras automáticas'
          }, 2600);
        } else {
          playVoiceAudio('la_cogia_rival', "¡La Cogía para los rivales!");
          vibrateDevice('reject');
          playSynthSound('reject');
          triggerAnnouncement({
            type: 'la_cogia',
            title: '¡LA COGÍA PARA EL RIVAL!',
            subtitle: 'El rival cobró La Cogía con el As de Oro',
            badge: '+3 piedras para el rival'
          }, 2600);
        }
      }

      // PAUSA AMPLIADA: 4.0 SEGUNDOS EN BAZA FINAL (O 2.6s EN BAZAS INTERMEDIAS) PARA APRECIAR LA CARTA GANADORA/PERDEDORA
      const isHandOrGameEnding = (Orden == "2" || Orden == "3" || Orden == "4" || Orden == "5");
      const trickPauseMs = isHandOrGameEnding ? 4000 : 2600;

      setTimeout(() => {
        setIsReturningToDeck(true);
        playSwooshSound();

        setTimeout(() => {
          setIsReturningToDeck(false);
          setTrickWinner(null);

          // Sincronizar puntos desde el servidor
          const poneStr: string = Trozo(modelo, 4);
          const ptwoStr: string = Trozo(modelo, 5);
          if (poneStr && ptwoStr) {
            const sP1 = parseInt(poneStr);
            const sP2 = parseInt(ptwoStr);
            if (!isNaN(sP1) && !isNaN(sP2)) {
              if (datos.current.flag == true) {
                updatePointsAndTumba(sP1, sP2);
              } else {
                updatePointsAndTumba(sP2, sP1);
              }
            }
          }

          const stakePts = currentStakeRef.current;
          const rivalName = datos.current.flag ? datos.current.nametwo : datos.current.nameone;

          if (Razon == "0") {
            if (Orden == "0") {
              pointOne.current = pointOne.current + 1;
              roundturn.current = true;
              switchturn.current = true;
              setIsMyTurn(true);
              setTimeLeft(30);
              hasTimedOut.current = false;
              setTableCards(prev => [cpEightRef.current]);
              isProcessingRef.current = false;
              setIsProcessingMove(false);
            } else if (Orden == "2") {
              pointOne.current = 0;
              pointTwo.current = 0;
              switchturn.current = false;
              setIsMyTurn(false);
              setTimeLeft(30);
              hasTimedOut.current = false;
              setPlayerCards([]);

              const oppWasInTumba = (pointsopp.current >= 9 || (partoppRef.current === 1 && pointsopp.current === 8));
              if (oppWasInTumba) {
                playVoiceAudio('rivales_cayeron_tumba', "¡Los rivales cayeron en Tumba! Más tres piedras.");
                vibrateDevice('winRound');
                playSynthSound('win');
                triggerAnnouncement({
                  type: 'win_round',
                  title: '¡EL RIVAL CAYÓ EN TUMBA!',
                  subtitle: '+3 piedras para ti, -3 para él',
                  badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                }, 2600);
              } else {
                if (stakePts > 1) {
                  playVoiceAudio('ganaron_la_mano', "¡Ganaron la mano! Sumamos piedras.");
                } else {
                  playVoiceAudio('ganaste_la_ronda', "¡Ganaste la ronda!");
                }
                vibrateDevice('winRound');
                playSynthSound('win');
                triggerAnnouncement({
                  type: 'win_round',
                  title: '¡GANASTE LA RONDA!',
                  subtitle: stakePts > 1 ? `Te llevas ${stakePts} piedras` : 'Sumas 1 piedra a tu cuenta',
                  badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                }, 2600);
              }

              setIsWaitingHandChange1v1(true);
              if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
              handWatchdogTimerRef.current = setTimeout(async () => {
                if (playerCards.length === 0 && connection) {
                  console.warn("[Watchdog 1v1] Tiempo de espera agotado tras ronda. Solicitando nueva mano...");
                  try {
                    await connection.invoke("RequestNewHand1vs1", idGame.current);
                  } catch (e) {
                    console.error("Error en Watchdog RequestNewHand1vs1:", e);
                  }
                }
              }, 5500);

              setTimeout(async () => {
                setTableCards(prev => [cpEightRef.current]);
                const dato = { game: idGame.current, order: 87, content: "" };
                try {
                  console.log("Enviando objeto al servidor tras ronda:", dato);
                  await connection.invoke("ChangeGame1vs1", dato);
                } catch (error) {
                  console.error("Error al enviar objeto al servidor:", error);
                };
              }, 2600);
            } else if (Orden == "4") {
              switchturn.current = false;
              setIsMyTurn(false);
              // Mantener las cartas sobre el tapete
              setTableCards([cpEightRef.current, cpoppRef.current, cpownRef.current]);
              playVoiceAudio('tumba_completada', "¡Ganaste la partida! Tumba completada.");
              vibrateDevice('winMatch');
              playSynthSound('win');
              triggerAnnouncement({
                type: 'win_round',
                title: '¡CAMPEÓN DEL JUEGO!',
                subtitle: '¡Tumba completada! Has ganado la partida.',
                badge: 'VICTORIA'
              }, 4000);
              setTimeout(() => {
                playVoiceAudio('victoria_partida', "¡Felicidades, ganaste la partida!");
                Swal.fire({
                  title: "¡GANASTE EL JUEGO!",
                  text: "¡Felicidades, completaste la tumba y eres el vencedor de la partida!",
                  icon: "success",
                  confirmButtonText: "Ir al Lobby",
                  confirmButtonColor: "#d97706"
                }).then(() => router.push("/desk"));
              }, 3500);
            }
          } else {
            if (Orden == "1") {
              pointTwo.current = pointTwo.current + 1;
              roundturn.current = false;
              switchturn.current = false;
              setIsMyTurn(false);
              setTimeLeft(30);
              hasTimedOut.current = false;
              setTableCards(prev => [cpEightRef.current]);
              isProcessingRef.current = false;
              setIsProcessingMove(false);
            } else if (Orden == "3") {
              pointOne.current = 0;
              pointTwo.current = 0;
              switchturn.current = false;
              setIsMyTurn(false);
              setTimeLeft(30);
              hasTimedOut.current = false;
              setPlayerCards([]);

              setIsWaitingHandChange1v1(true);
              if (handWatchdogTimerRef.current) clearTimeout(handWatchdogTimerRef.current);
              handWatchdogTimerRef.current = setTimeout(async () => {
                if (playerCards.length === 0 && connection) {
                  console.warn("[Watchdog 1v1] Espera de nueva mano agotada en rival tras ronda. Solicitando...");
                  try {
                    await connection.invoke("RequestNewHand1vs1", idGame.current);
                  } catch (e) {
                    console.error("Error en Watchdog RequestNewHand1vs1:", e);
                  }
                }
              }, 5500);

              const playerWasInTumba = (pointsown.current >= 9 || (partownRef.current === 1 && pointsown.current === 8));
              if (playerWasInTumba) {
                playVoiceAudio('caiste_en_tumba', "¡Caíste en Tumba! Menos tres piedras.");
                vibrateDevice('reject');
                playSynthSound('reject');
                triggerAnnouncement({
                  type: 'opp_win_round',
                  title: 'PERDISTE EN TUMBA',
                  subtitle: '-3 piedras para ti, +3 para el rival',
                  badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                }, 2600);
              } else {
                playVoiceAudio('punto_para_rivales', "Punto para los rivales.");
                vibrateDevice('reject');
                playSynthSound('reject');
                triggerAnnouncement({
                  type: 'opp_win_round',
                  title: `${rivalName.toUpperCase()} GANA LA RONDA`,
                  subtitle: stakePts > 1 ? `El rival suma ${stakePts} piedras` : 'El rival suma 1 piedra',
                  badge: `Marcador: ${pointsown.current} - ${pointsopp.current}`
                }, 2600);
              }
            } else if (Orden == "5") {
              switchturn.current = false;
              setIsMyTurn(false);
              // Mantener las cartas sobre el tapete
              setTableCards([cpEightRef.current, cpoppRef.current, cpownRef.current]);
              playVoiceAudio('derrota_partida', "Partida terminada. Los rivales se llevaron la victoria.");
              vibrateDevice('reject');
              playSynthSound('reject');
              triggerAnnouncement({
                type: 'opp_win_round',
                title: 'JUEGO TERMINADO',
                subtitle: 'Tu rival ha completado la tumba.',
                badge: 'DERROTA'
              }, 4000);
              setTimeout(() => {
                Swal.fire({
                  title: "JUEGO TERMINADO",
                  text: "Tu rival ha ganado la partida.",
                  icon: "error",
                  confirmButtonText: "Ir al Lobby",
                  confirmButtonColor: "#d97706"
                }).then(() => router.push("/desk"));
              }, 3500);
            }
          }
        }, 850);
      }, trickPauseMs);
    });
    return () => {
      connection.off('ReasonRound1vs1');
    };
  }, [connection]);

  // Centinela de seguridad para 1 vs 1: si la mesa tiene cartas de baza (>= 3 cartas con la vida) por más de 6.5s
  useEffect(() => {
    if (tableCards.length >= 3 && !isReturningToDeck) {
      const centinela = setTimeout(() => {
        console.warn("[Centinela 1vs1] Limpieza de seguridad activada tras tiempo de espera");
        setIsReturningToDeck(false);
        setTrickWinner(null);
        setTableCards([cpEightRef.current]);
      }, 6500);
      return () => clearTimeout(centinela);
    }
  }, [tableCards, isReturningToDeck]);

  // Respuesta de Inicio de Juego

  useEffect(() => {
    if (!connection) return;
    connection.on('InitiatedGameSol', (modelo: Message) => {
      //    execRound(modelo,true);
    });
    return () => {
      connection.off('InitiatedGameSol');
    };
  }, [connection]);

  // Respuesta de cambio de Mano

  useEffect(() => {
    if (!connection) return;
    connection.on('ChangedTurnSol', (modelo: Message) => {
      //   execRound(modelo,false);
    });
    return () => {
      connection.off('ChangedTurnSol');
    };
  }, [connection]);

  // Listener para tiempo agotado en 1 vs 1 (30 segundos por turno)
  useEffect(() => {
    if (!connection) return;
    connection.on('RoundTimeoutNotice', (data: any) => {
      console.log("[RoundTimeoutNotice] Notificación recibida:", data);
      hasTimedOut.current = false;
      setTimeLeft(30);
      setIsMyTurn(false);

      if (data.pointsOne !== undefined && data.pointsTwo !== undefined) {
        const sP1 = parseInt(data.pointsOne);
        const sP2 = parseInt(data.pointsTwo);
        if (!isNaN(sP1) && !isNaN(sP2)) {
          if (datos.current.flag == true) {
            updatePointsAndTumba(sP1, sP2);
          } else {
            updatePointsAndTumba(sP2, sP1);
          }
        }
      }

      setTableCards(prev => [cpEightRef.current]);
      setPlayerCards([]);

      Swal.fire({
        title: data.won ? '¡RONDA GANADA POR TIEMPO!' : '¡TIEMPO AGOTADO!',
        text: data.message,
        icon: data.won ? 'success' : 'warning',
        timer: 4500,
        timerProgressBar: true,
        confirmButtonColor: '#d97706',
        confirmButtonText: 'Continuar',
        customClass: {
          title: styles.customtitle,
          popup: styles.custompopup
        }
      }).then(async () => {
        if (!data.gameOver && data.won) {
          const dato = { game: idGame.current, order: 87, content: "" };
          try {
            await connection.invoke("ChangeGame1vs1", dato);
          } catch (err) {
            console.error("Error al cambiar juego tras timeout:", err);
          }
        } else if (data.gameOver) {
          playVoiceAudio(data.won ? 'victoria_partida' : 'derrota_partida', data.won ? '¡Felicidades, ganaste la partida!' : 'Has perdido la partida.');
          Swal.fire({
            title: data.won ? '¡VICTORIA DEL JUEGO!' : 'JUEGO TERMINADO',
            text: data.won ? '¡Felicidades, ganaste la partida!' : 'Has perdido la partida.',
            icon: data.won ? 'success' : 'error',
            confirmButtonColor: '#d97706',
            confirmButtonText: 'Ir al Lobby',
            customClass: {
              title: styles.customtitle,
              popup: styles.custompopup
            }
          }).then(() => {
            router.push("/desk");
          });
        }
      });
    });

    return () => {
      connection.off('RoundTimeoutNotice');
    };
  }, [connection]);

  // Listener cuando el oponente se rinde / sale de la partida
  useEffect(() => {
    if (!connection) return;
    connection.on('OpponentSurrendered', (data: any) => {
      console.log("[OpponentSurrendered] Rival se rindió:", data);
      playVoiceAudio('victoria_partida', "¡Felicidades, ganaste la partida!");
      playSynthSound?.('win');
      Swal.fire({
        title: '¡VICTORIA POR RETIRADA!',
        text: data.message || 'Tu contrincante se ha retirado de la partida. ¡Has ganado todo lo apostado!',
        icon: 'success',
        confirmButtonText: 'Cobrar y Salir',
        confirmButtonColor: '#16a34a',
        allowOutsideClick: false,
        customClass: {
          title: styles.customtitle,
          popup: styles.custompopup
        }
      }).then(() => {
        router.push("/desk");
      });
    });

    return () => {
      connection.off('OpponentSurrendered');
    };
  }, [connection]);

  // Listener cuando el usuario actual se rinde
  useEffect(() => {
    if (!connection) return;
    connection.on('YouSurrendered', (data: any) => {
      console.log("[YouSurrendered] Confirmación de rendición:", data);
      router.push("/desk");
    });

    return () => {
      connection.off('YouSurrendered');
    };
  }, [connection]);

  // Listener para la liquidación de apuestas (Premio 80%, Comisión 20% del árbitro)
  useEffect(() => {
    if (!connection) return;

    connection.on('MatchFinishedPayout', (data: any) => {
      console.log("[MatchFinishedPayout] Resumen de liquidación de monedas:", data);

      // Actualizar inmediatamente el saldo en localStorage del usuario
      try {
        const stored = localStorage.getItem("pericon_user");
        if (stored) {
          const userObj = JSON.parse(stored);
          if (data.newBalance !== undefined && data.newBalance !== null) {
            userObj.coins = data.newBalance;
            localStorage.setItem("pericon_user", JSON.stringify(userObj));
          }
        }
      } catch (e) {
        console.error("Error al actualizar saldo en localStorage:", e);
      }

      const title = data.isWinner ? "🏆 ¡VICTORIA CONFIRMADA!" : "💔 PARTIDA FINALIZADA";
      if (data.isWinner) {
        playCoinWinSound();
      }
      const htmlContent = `
        <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
          <p style="margin-bottom: 12px; font-weight: bold; color: ${data.isWinner ? '#4ade80' : '#f87171'}; font-size: 14px; text-align: center;">
            ${data.message}
          </p>
          <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(250,204,21,0.25);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #cbd5e1;">🪙 Apuesta individual:</span>
              <span style="font-weight: bold; color: #facc15;">${data.bet} monedas</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #cbd5e1;">💰 Pozo total en juego:</span>
              <span style="font-weight: bold; color: #facc15;">${data.totalPot} monedas</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #cbd5e1;">🏛️ Comisión árbitro (20%):</span>
              <span style="font-weight: bold; color: #fb923c;">-${data.houseCommission} monedas</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #cbd5e1;">🏆 Premio al ganador (80%):</span>
              <span style="font-weight: bold; color: #4ade80;">+${data.winnerPrize} monedas</span>
            </div>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 8px 0;" />
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span style="font-weight: bold; color: #fff;">👛 Tu nuevo saldo:</span>
              <span style="font-weight: 900; color: #fde047;">${data.newBalance} monedas</span>
            </div>
          </div>
        </div>
      `;

      Swal.fire({
        title: title,
        html: htmlContent,
        icon: data.isWinner ? 'success' : 'info',
        confirmButtonText: 'Continuar al Lobby',
        confirmButtonColor: data.isWinner ? '#16a34a' : '#4b5563',
        allowOutsideClick: false,
        customClass: {
          title: styles.customtitle,
          popup: styles.custompopup
        }
      }).then(() => {
        router.push("/desk");
      });
    });

    return () => {
      connection.off('MatchFinishedPayout');
    };
  }, [connection, router]);

  useEffect(() => {
    if (cardEffect) {
      const clock = setTimeout(() => {
        const cdSix: Card = paramCards[0];
        const cdTen: number = numCard;
        oponentCards.current = cdTen;
        if (paramFlag == true) {
          setTableCards([cdSix]);
        } else {
          const cdSeven: Card = paramCards[1];
          setTableCards([cdSix, cdSeven]);
        }
      }, 1000); // Espera 2 segundos antes de ejecutarse
      return () => {
        clearTimeout(clock);
        setCardEffect(false);
      }
    };
  }, [cardEffect]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const shuffleCards = async () => {
    if (connection) {
      const numberGame: number = played?.game;
      const numberCard: string = "";
      const dato: Message = { game: numberGame, order: 105, content: numberCard };
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Enviando objeto al servidor:", dato);
        await connection.invoke("ChangeTurnSol", dato);
      } catch (error) {
        console.error("Error al enviar objeto al servidor:", error);
      };
    };
  };

  const endGame = async (x: number) => {
    // if (x == 9) setMessage("GANASTE EL JUEGO!!!");
    // else setMessage("PERDISTE EL JUEGO!!!");
    delay(1500);
    router.push("/desk");
  };

  return (
    <main className='grid h-screen overflow-auto space-y-0'>
      <GameAnnouncement announcement={announcement} />

      {/* Modal interactivo de Reto 3-6-9 (Pedir) para Móvil y Desktop */}
      {pedirChallenge && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-amber-950 via-stone-900 to-black border-2 border-yellow-400 rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.7)] text-center relative overflow-hidden">
            {/* Ícono de Espadas animado */}
            <div className="text-4xl mb-2 animate-bounce">⚔️</div>

            <h2 className="text-xl sm:text-2xl font-black text-yellow-300 uppercase tracking-wide drop-shadow">
              ¡{pedirChallenge.challengerName.toUpperCase()} PIDE POR {pedirChallenge.targetStake}!
            </h2>

            <p className="text-stone-200 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
              ¿Aceptas jugar esta mano por <span className="font-extrabold text-yellow-400 text-sm sm:text-base">{pedirChallenge.targetStake} piedras</span>?
              <br />
              <span className="text-amber-200/80 text-[11px] block mt-1">
                Si rechazas, tu rival se lleva {pedirChallenge.rejectReward} piedra(s) de inmediato.
              </span>
            </p>

            {/* Barra de progreso de tiempo */}
            <div className="w-full bg-stone-800 rounded-full h-2.5 my-4 overflow-hidden border border-yellow-500/40">
              <div 
                className="bg-yellow-400 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(pedirChallenge.timeLeft / 12) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-amber-300 font-extrabold uppercase tracking-wider mb-4">
              ⏱️ Tiempo para responder: {pedirChallenge.timeLeft}s
            </div>

            {/* Botones de acción táctiles y grandes para celular */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => handleAnswerPedir('accept')}
                className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 active:scale-95 text-white font-black py-3 px-4 rounded-2xl text-base sm:text-lg shadow-lg border border-emerald-400 flex items-center justify-center gap-2 cursor-pointer transition-transform"
              >
                <span className="text-xl">✅</span>
                <span>¡Sí, Acepto!</span>
              </button>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleAnswerPedir('deny')}
                  className="flex-1 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-95 text-white font-black py-2.5 px-3 rounded-2xl text-sm sm:text-base shadow-lg border border-rose-400 flex items-center justify-center gap-1.5 cursor-pointer transition-transform"
                >
                  <span>❌</span>
                  <span>No Quiero</span>
                </button>

                {pedirChallenge.canDoblar && (
                  <button
                    onClick={() => handleAnswerPedir('doblar')}
                    className="flex-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 active:scale-95 text-black font-black py-2.5 px-3 rounded-2xl text-sm sm:text-base shadow-lg border border-yellow-300 flex items-center justify-center gap-1.5 cursor-pointer transition-transform"
                  >
                    <span>⚡</span>
                    <span>Doblo a {pedirChallenge.targetStake === 3 ? 6 : 9}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className='bg-goat absolute inset-0 z-0'></div>
      <div className='flex flex-col h-screen relative'>
        {/* UI content */}
        <div className='relative z-10'>
          <div className='flex justify-between items-center w-full max-w-4xl mx-auto pt-2 pb-1 px-3 sm:px-6'>
            {/* Temporizador 30s con indicador de turno */}
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border backdrop-blur-md shadow-lg transition-all ${
              isMyTurn 
                ? (timeLeft <= 10 
                    ? 'bg-red-950/85 border-red-500 ring-2 ring-red-500/50 animate-pulse' 
                    : 'bg-emerald-950/85 border-emerald-500/60 ring-1 ring-emerald-400/40') 
                : 'bg-stone-900/80 border-amber-900/40 opacity-90'
            }`}>
              <span className='text-sm sm:text-lg'>⏱️</span>
              <div className='flex flex-col text-left'>
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  isMyTurn ? (timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400') : 'text-amber-400/70'
                }`}>
                  {isMyTurn ? 'Tu turno' : 'Turno rival'}
                </span>
                <span className={`text-xs sm:text-base font-extrabold font-mono leading-none ${
                  isMyTurn ? (timeLeft <= 10 ? 'text-red-300' : 'text-emerald-200') : 'text-stone-300'
                }`}>
                  00:{timeLeft.toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Marcador de Piedras */}
            <div className='flex justify-center'>
              <Stone
                stoneone={visiblePoints.own}
                stonetwo={visiblePoints.opp}
                isTumbaOne={visiblePoints.own >= 9 || (partown === 1 && visiblePoints.own === 8)}
                isTumbaTwo={visiblePoints.opp >= 9 || (partopp === 1 && visiblePoints.opp === 8)}
              />
            </div>

            {/* Botón Salir (Abandonar y rendirse) */}
            <button
              onClick={handleSurrenderClick}
              className='bg-red-700/90 hover:bg-red-600 active:scale-95 text-white text-xs sm:text-sm font-bold py-1.5 px-2.5 sm:px-4 rounded-xl border border-red-500/50 shadow-lg flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer'
              title='Abandonar partida'
            >
              <span>🚪</span>
              <span className='hidden sm:inline font-black uppercase tracking-wider text-[11px] sm:text-xs'>Salir</span>
            </button>
          </div>
          {/* Dynamic content */}
          <div className='flex items-center justify-center h-full'>
            <div className='relative'>
              {showOverlay && (
                <div className='fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 flex-col'>
                  <div className='text-white text-2xl'>{textOverlay}</div>
                  {
                    imageOverlay &&
                    <Image src={imageOverlay} alt='overlay' width={300} height={300}
                      className={`w-10/12 max-w-xl h-auto`} />
                  }
                  {ctaLinkOverlay && ctaTextOverlay && (
                    <Link
                      href={ctaLinkOverlay}
                      className={`text-black bg-yellow my-4 px-6 py-2 text-lg 
                        opacity-100 hover:opacity-80 scale-100 hover:scale-95
                        duration-150 rounded-xl font-bold`} >
                      {ctaTextOverlay}
                    </Link>
                  )}
                </div>
              )}
              {/* Área de la Mesa */}
              <div
                className='flex justify-center items-center w-full fixed top-[130px] left-0'
                style={{ height: 'calc(100vh - 220px)' }}>
                <div
                  className={`${isDesktop ? 'bg-table' : 'bg-tablev'} w-full h-full`} />
              </div>

              {/* Contenido sobre la Mesa */}
              <div
                className='z-10 relative text-white flex flex-col justify-between h-full'
                style={{ height: 'calc(100vh - 160px)' }}
              >
                {/* Oponente */}
                <div className='flex justify-center'>
                  <div className={`flex flex-col items-center rounded-2xl p-1 sm:p-1.5 transition-all duration-300 ${
                    !isMyTurn 
                      ? 'glow-gold-life border-2 border-yellow-400 bg-yellow-950/70 shadow-ground scale-105' 
                      : 'border-2 border-transparent'
                  }`}>
                    <div className='mt-[-25px] sm:mt-[-35px]'>
                      <div className='relative w-[85px] sm:w-[100px] h-[80px] sm:h-[90px] mt-6 flex justify-center items-center'>
                        <div className='absolute inset-0 bg-white z-0 w-[70px] sm:w-[82px] h-[75px] sm:h-[90px] ml-[8px] sm:ml-[10px]' />
                        <Image
                          src={oponent.avatar} alt='avatar' width={70} height={70}
                          className='absolute z-10 w-[60px] h-[60px] sm:w-[70px] sm:h-[70px]' />
                        <div className='absolute z-20'>
                          <Image
                            src='/overlay.png' alt='overlay' width={120} height={120} />
                        </div>
                      </div>
                      <div className='text-center text-white font-bold text-xs sm:text-sm truncate max-w-[100px]'>
                        @{datos.current.flag == true ? datos.current.nametwo : datos.current.nameone}
                        {/*  @{oponent.username} */}
                      </div>
                    </div>
                    {!isMyTurn && (
                      <div className='mt-0.5 bg-yellow-400 text-black font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-pulse'>
                        ⭐ Turno Rival
                      </div>
                    )}
                  </div>

                  <div className='flex flex-row ml-2 sm:ml-3'>
                    {Array.from({ length: oponentCards.current }, (_, index) => (
                      <div
                        key={index}
                        style={{
                          animationDelay: `${index * 150}ms`
                        }}
                        className={`
                          ${oponentCardStyle(index)}
                          ${isDealing ? 'animate-in fade-in slide-in-from-top-12 zoom-in-75 duration-700' : ''}
                          transition-all duration-500
                        `}
                      >
                        <Image
                          src='/card_back.png' alt={`Carta ${index + 1}`}
                          width={68} height={96}
                          className='w-[44px] h-[64px] sm:w-[62px] sm:h-[88px] rounded shadow-md object-contain'
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elemento Central: Mazo, La Vida y Zona de Cartas Jugadas (Optimizado Celular) */}
                <div className='flex justify-center w-full px-1'>
                  <div className='flex flex-row items-center gap-1.5 sm:gap-4 bg-black/40 backdrop-blur-md px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-amber-900/50 shadow-2xl max-w-[98vw]'>
                    {/* Mazo */}
                    <div className='text-center text-white relative flex flex-col items-center'>
                      <div className='relative shadow-ground rounded-lg overflow-hidden border border-amber-800/60 bg-amber-950/40 p-0.5 hover:scale-105 transition-transform'>
                        <Image
                          src='/card_back.png' width={68} height={96} alt='Mazo'
                          className='w-[44px] h-[64px] sm:w-[62px] sm:h-[88px] rounded shadow-sm object-contain'
                        />
                      </div>
                      <span className='text-[9px] sm:text-[10px] text-amber-300/80 font-bold block mt-0.5 tracking-wider uppercase'>Mazo</span>
                    </div>  

                    {/* La Vida (si existe en tableCards[0]) */}
                    {tableCards && tableCards.length > 0 && tableCards[0] && (
                      <div className='relative flex flex-col items-center animate-in fade-in zoom-in-75 duration-500'>
                        <div className='relative rounded-lg p-0.5 glow-gold-life border-2 border-yellow-400 bg-yellow-950/60 shadow-ground'>
                          <Image
                            src={tableCards[0]?.image && typeof tableCards[0].image === 'string' && tableCards[0].image.startsWith('/') ? tableCards[0].image : '/card_back.png'}
                            alt='Vida'
                            width={68}
                            height={96}
                            className='w-[44px] h-[64px] sm:w-[62px] sm:h-[88px] rounded object-contain'
                          />
                        </div>
                        <span className='text-[9px] sm:text-[10px] text-amber-300 font-extrabold block mt-0.5 tracking-wider uppercase drop-shadow'>Vida</span>
                      </div>
                    )}

                    {/* Línea divisoria sutil */}
                    <div className='h-14 sm:h-16 w-px bg-amber-500/20 mx-0.5 sm:mx-1'></div>

                    {/* Cartas lanzadas en la mesa (Máximo 2 cartas enfrentadas con pausa para apreciar) */}
                    <div className='flex flex-row gap-2 sm:gap-3 items-center min-w-[130px] sm:min-w-[170px] justify-center min-h-[85px] sm:min-h-[105px]'>
                      {tableCards && tableCards.slice(1).map((card: any, index: any) => {
                        const isOpponentCard = (index === 0 && !roundturn.current) || (index === 1 && roundturn.current);
                        return (
                          <div
                            key={`${card.id}-${index}`}
                            className={`
                              relative flex flex-col items-center
                              ${isReturningToDeck 
                                ? 'card-glide-to-deck' 
                                : isOpponentCard 
                                  ? 'card-glide-in-opp' 
                                  : 'card-glide-in-player'
                              }
                            `}
                          >
                            <div className={`
                              rounded-lg shadow-ground border overflow-hidden hover:scale-105 transition-all
                              ${trickWinner 
                                ? ((trickWinner === 'player' && !isOpponentCard) || (trickWinner === 'opp' && isOpponentCard)
                                    ? 'border-amber-400 ring-2 ring-amber-400/80' 
                                    : 'border-stone-700 opacity-80')
                                : 'border-black/50'
                              }
                            `}>
                              <Image
                                src={card?.image && typeof card.image === 'string' && card.image.startsWith('/') ? card.image : '/card_back.png'}
                                alt='Carta en mesa'
                                width={72}
                                height={102}
                                className='w-[48px] h-[70px] sm:w-[66px] sm:h-[94px] rounded object-contain'
                              />
                            </div>
                            
                            <div className='flex flex-col items-center mt-1'>
                              <span className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full shadow ${
                                isOpponentCard ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              }`}>
                                {isOpponentCard ? 'Rival' : 'Tú'}
                              </span>
                              {trickWinner && (
                                <span className={`text-[8px] sm:text-[9px] font-extrabold mt-0.5 px-1 rounded shadow animate-pulse ${
                                  (trickWinner === 'player' && !isOpponentCard) || (trickWinner === 'opp' && isOpponentCard)
                                    ? 'bg-amber-400 text-black'
                                    : 'bg-black/60 text-stone-400'
                                }`}>
                                  {(trickWinner === 'player' && !isOpponentCard) || (trickWinner === 'opp' && isOpponentCard)
                                    ? '⭐ Ganó'
                                    : '❌ Perdió'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(!tableCards || tableCards.length <= 1) && (
                        <span className='text-[11px] sm:text-xs text-amber-200/40 italic px-2 select-none'>
                          Mesa limpia
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Indicador de Regla del Pelao / Negar 5 de Oro */}
                {(() => {
                  const currentLifeId = cpEightRef.current?.id ?? -1;
                  const isOppLead = roundturn.current === false && switchturn.current === true;
                  const isOppTrump = isOppLead && (cpoppRef.current?.id !== undefined && cpoppRef.current.id !== -1)
                    ? isTrumpCard(cpoppRef.current.id, currentLifeId)
                    : false;
                  const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
                  const isFirstBaza = playerCards.length === 3;
                  const hasCincoDeOro = playerCards.some(c => c.id === 4);
                  const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
                  const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;
                  const isPelaoActive = isOppTrump && playerHasTrump;

                  if (!isPelaoActive) return null;

                  if (canDenyCinco) {
                    return (
                      <div className='flex justify-center mb-2 animate-bounce-subtle'>
                        <div className='flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-4 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 border-yellow-200'>
                          <span className='text-sm sm:text-base'>👑</span>
                          <span>REGLA DEL 5 DE ORO: ¡Puedes negarlo y tirar otra carta, o jugarlo si prefieres!</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className='flex justify-center mb-2 animate-bounce-subtle'>
                      <div className='flex items-center gap-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black px-4 py-1 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 border-amber-300'>
                        <span className='text-sm sm:text-base'>⚡</span>
                        <span>REGLA DEL PELAO: ¡Salieron con triunfo, debes lanzar triunfo!</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Contador de tiempo para decisión de Tumba */}
                {tumbaCountdown !== null && (
                  <div className='flex justify-center mb-3 animate-pulse'>
                    <div className='flex flex-col sm:flex-row items-center gap-2 bg-gradient-to-r from-stone-900 via-black to-stone-900 border-2 border-yellow-400 text-yellow-300 px-5 py-2 rounded-2xl shadow-2xl'>
                      <div className='flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide'>
                        <span className='text-lg sm:text-xl'>⏳</span>
                        <span>ANALIZA TUS CARTAS Y LA VIDA</span>
                      </div>
                      <div className='bg-yellow-400 text-black font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full shadow'>
                        Decisión en: {tumbaCountdown}s
                      </div>
                    </div>
                  </div>
                )}

                {/* Aviso cuando el rival está decidiendo en Tumba */}
                {isWaitingOppTumba && (
                  <div className='flex justify-center mb-3 animate-pulse'>
                    <div className='flex flex-col sm:flex-row items-center gap-2 bg-gradient-to-r from-stone-900 via-black to-stone-900 border-2 border-amber-500 text-amber-300 px-5 py-2 rounded-2xl shadow-2xl'>
                      <div className='flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide'>
                        <span className='text-lg sm:text-xl'>⏳</span>
                        <span>EL RIVAL ESTÁ EN TUMBA</span>
                      </div>
                      <div className='bg-amber-500 text-black font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full shadow'>
                        Esperando su decisión...
                      </div>
                    </div>
                  </div>
                )}

                {/* Player */}
                <div className='flex justify-center mb-2 sm:mb-4'>
                  <div className={`flex flex-col items-center rounded-2xl p-1 sm:p-1.5 transition-all duration-300 ${
                    isMyTurn && !isProcessingMove && tumbaCountdown === null && !isWaitingOppTumba
                      ? 'glow-gold-life border-2 border-yellow-400 bg-yellow-950/70 shadow-ground scale-105' 
                      : 'border-2 border-transparent'
                  }`}>
                    <div className=''>
                      <div className='relative w-[85px] sm:w-[100px] h-[80px] sm:h-[90px] flex justify-center items-center'>
                        <div className='absolute inset-0 bg-white z-0 w-[70px] sm:w-[82px] h-[75px] sm:h-[90px] ml-[8px] sm:ml-[10px]' />
                        <img
                          src={gameplayer?.avatarUrl && gameplayer.avatarUrl.length > 5 ? gameplayer.avatarUrl : '/avatar.png'}
                          alt='avatar'
                          className='absolute z-10 w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] object-cover rounded-full'
                        />
                        <div className='absolute z-20'>
                          <Image
                            src='/overlay.png' alt='overlay' width={120} height={120} />
                        </div>
                      </div>
                      <div className='text-center text-white font-bold text-xs sm:text-sm truncate max-w-[100px]'>
                        @{datos.current.flag == false ? datos.current.nametwo : datos.current.nameone}
                        {/* @{user.name} */}
                      </div>
                    </div>
                    {isMyTurn && !isProcessingMove && tumbaCountdown === null && !isWaitingOppTumba && (
                      <div className='mt-0.5 bg-yellow-400 text-black font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-pulse'>
                        ⭐ Tu Turno
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-row ml-2 sm:ml-3 relative z-20 ${isProcessingMove || isDealing || isReturningToDeck || tumbaCountdown !== null || isWaitingOppTumba ? 'pointer-events-none opacity-60 cursor-not-allowed' : ''}`}>
                    {playerCards && (() => {
                      const currentLifeId = cpEightRef.current?.id ?? -1;
                      const isOppLead = roundturn.current === false && switchturn.current === true;
                      const isOppTrump = isOppLead && (cpoppRef.current?.id !== undefined && cpoppRef.current.id !== -1)
                        ? isTrumpCard(cpoppRef.current.id, currentLifeId)
                        : false;
                      const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
                      const isFirstBaza = playerCards.length === 3;
                      const hasCincoDeOro = playerCards.some(c => c.id === 4);
                      const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
                      const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;
                      const isPelaoActive = isOppTrump && playerHasTrump && !canDenyCinco;

                      return playerCards.map((card, index) => {
                        const isTrump = isTrumpCard(card.id, currentLifeId);
                        const isBlockedByPelao = isPelaoActive && !isTrump;

                        return (
                          <div
                            key={card.id}
                            style={{
                              animationDelay: `${index * 150}ms`,
                              transitionDelay: `${index * 40}ms`
                            }}
                            className={`
                              ${playerCardStyle(index)} cursor-pointer duration-300 touch-card relative
                              ${selectedCard?.image === card.image && `opacity-50 scale-95`}
                              ${isDealing ? 'animate-in fade-in slide-in-from-bottom-12 zoom-in-75 duration-700' : ''}
                              ${isBlockedByPelao ? 'opacity-30 grayscale filter pointer-events-none cursor-not-allowed scale-95' : ''}
                              ${isPelaoActive && isTrump ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-emerald-950 shadow-xl shadow-amber-400/50 scale-105' : ''}
                              ${!isBlockedByPelao ? 'active:scale-110 active:-translate-y-5 sm:hover:-translate-y-4 sm:hover:scale-105 hover:shadow-2xl transition-all' : ''}
                            `}
                            onClick={() => {
                              if (switchturn.current && !isProcessingMove && !isDealing && tumbaCountdown === null && !isWaitingOppTumba) {
                                handleCardClick(card);
                              }
                            }}
                          >
                            {isPelaoActive && isTrump && (
                              <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow border border-amber-200 uppercase tracking-tighter whitespace-nowrap z-30 animate-pulse'>
                                Triunfo
                              </div>
                            )}
                            <Image
                              src={card?.image && typeof card.image === 'string' && card.image.startsWith('/') ? card.image : '/card_back.png'}
                              width={72}
                              height={102}
                              alt={`Carta ${index + 1}`}
                              className='w-[50px] h-[74px] sm:w-[68px] sm:h-[98px] rounded shadow-md object-contain'
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>



                {/* Botones de Acción y Temporizador */}
                <div className='fixed right-2 top-[52%] -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-6 sm:right-6 z-30 flex flex-col sm:flex-row items-end gap-1.5'>
                  {/* Temporizador de 30s con Auto-juego */}
                  <GameTurnTimer
                    isMyTurn={switchturn.current && !isProcessingMove && !isDealing && playerCards.length > 0 && tumbaCountdown === null && !isWaitingOppTumba}
                    onTimeout={handleTurnTimeout1v1}
                    maxSeconds={30}
                  />

                  <button
                    className='bg-amber-600 hover:bg-amber-500 text-black font-extrabold py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-full shadow-lg transition-transform duration-150 scale-100 hover:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm border border-amber-400/40'
                    onClick={() => {
                      // Tumbar
                    }}
                    disabled={!isTumbaActive}
                  >Tumbar</button>
                  <button
                    className='bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-full shadow-lg transition-transform duration-150 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm border border-yellow-300/40'
                    onClick={handlePedirClick}
                    disabled={!canPedir}
                    title={
                      isTumbaActive
                        ? 'No se puede pedir en Tumba'
                        : (lastStakeAskedBy === 'player' ? 'Esperando que el rival responda o revire' : (!isMyTurn ? 'Solo puedes pedir en tu turno' : 'Pedir aumento de piedras'))
                    }
                  >
                    {currentStake >= 9 
                      ? 'Límite 9' 
                      : (lastStakeAskedBy === 'player' 
                          ? 'Esperando rival...' 
                          : (currentStake === 1 ? 'Pedir 3' : (currentStake === 3 ? 'Pedir 6' : 'Pedir 9'))
                        )
                    }
                  </button>
                </div>
                {/* className='bg-yellow-700 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-tl-[5px] rounded-bl-[5px] shadow-lg transition-transform duration-150 scale-100 hover:scale-95' */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/*
  useEffect(() => {
    if (!connection) return;
    let cpThree : number = 0;
    let cpZero : number = 0;
    let cp01 : number = 0;
    let cp02 : number = 0;
    let xcad : string = "";    
    connection.on('ProcessedGameMove', (modelo: Message) => {
      console.log(modelo);
      const cpOne : Card = Baraja(Porcion(modelo.content,0),0);
      const cpTwo : Card = Baraja(Porcion(modelo.content,1),1);
      cpThree = Porcion(modelo.content,2);
      const cpFour : Card = Baraja(Porcion(modelo.content,3),0);
      const cpFive : Card = Baraja(Porcion(modelo.content,4),1);   
      cpZero = oponentCards.current - 1;
      cp01 = pointOne;
      cp02 = pointTwo;
      console.log("Valor de order: " + modelo.order);         
      console.log("Valor de cpThree: " + cpThree);      
      if (cpThree == 1) {
        cp01 = cp01 + 1; setPointOne(cp01); 
      } else {
        cp02 = cp02 + 1; setPointTwo(cp02);
      }
      if (modelo.order == 102) oponentCards.current = cpZero;
      setPlayerCards(prevCards => prevCards.filter(card => card.id != cpOne.id)); 
  
      if (modelo.order == 102) {
        setTableCards([cpEight, cpOne, cpTwo]);
      } else {
        setTableCards([cpEight, cpTwo, cpOne]);
      } 

      if (cp01 < 2 && cp02 < 2) {
        if (cpThree != 1) xcad = "Pierdes. La ronda va: ";
          else xcad = "Ganas. La ronda va: ";
        xcad = xcad + cp01.toString() + " a " + cp02.toString();

        const alertOne = AlertMessage(xcad,1);
        Swal.fire(alertOne.firstMessage).then(() => {
          if (cpThree != 1) {
           // setRoundturn(false);
            if (modelo.order == 102) setNumCard(cpZero - 1);
               else setNumCard(cpZero);
            setParamFlag(false);
            setParamCards([cpEight, cpFour]);
            setCardEffect(true);
          } else {
           // setRoundturn(true);
            if (modelo.order == 104) setNumCard(cpZero + 1);
              else setNumCard(cpZero);
            setParamFlag(true);
            setParamCards([cpEight]);            
            setCardEffect(true);
          }
        });
      } else {
        if (cp01 == 2) {
          setPointsown(pointsown + 1);
          xcad = "Punto para tí!";
        } else {
          setPointsopp(pointsopp + 1);
          xcad = "Punto para tu oponente";
        }
        const alertTwo = AlertMessage(xcad,1);
        Swal.fire(alertTwo.firstMessage).then(() => {
          if (((pointsown + 1) != 10) && ((pointsopp + 1) != 10)) {
            delay(1500);
            shuffleCards();
          }
          else endGame(pointsown);          
        });
      }
    });
    return () => {
      connection.off('ProcessedGameMove');
    };
  }, [connection, playerCards, pointOne, pointTwo, , cardEffect, numCard, paramCards, paramFlag]);
*/

  /*  useEffect(() => {
      if (!connection) return;
      connection.on('ResponseCard1vs1', (modelo: Message) => {
        console.log(modelo);
        oponentCards.current = oponentCards.current - 1;
        if (modelo.order == 84) {
          const cardZero : Card = Baraja(parseInt(Trozo(modelo.content,2)),0);
          const turnZero : boolean = (Trozo(modelo.content,3) == "1" ? true : false);
          roundturn.current = !roundturn.current;        
       //   roundturn.current = turnZero;
          cpoppRef.current = cardZero;
          setTableCards(prev => [cpEightRef.current, cpoppRef.current]);
        } else {
          const cardZero : Card = Baraja(parseInt(Trozo(modelo.content,1)),0);
          const Razon : string = Trozo(modelo.content,3);
          setTableCards([cpEightRef.current, cpownRef.current, cardZero]);
          let xcad : string = "";
          console.log("Razon: ",Razon," playerturn: ",playerturn);
          if (Razon == playerturn.current) {
            pointOne.current = pointOne.current + 1;
            xcad = "Ganaste la Ronda! Puntuación: " + pointOne.current.toString();
            xcad += "-" + pointTwo.current.toString();
            if (roundturn.current == false) roundturn.current = true;
          } else {
            pointTwo.current = pointTwo.current + 1;
            xcad = "Perdiste la Ronda! Puntuación: " + pointOne.current.toString();
            xcad += "-" + pointTwo.current.toString();
            if (roundturn.current == true) roundturn.current = false;
          }        
          if (pointOne.current < 2 && pointTwo.current < 2) {
            const alertOne = AlertMessage(xcad,4000);
            Swal.fire(alertOne.firstMessage).then( () => {
              setTableCards(prev => [cpEightRef.current]);      
            });               
          } else {
            if (pointOne.current == 2)  {
              xcad = "Ganaste la Ronda y Ganas Punto!";
              pointsown.current += 1;
            } else {
              xcad = "Perdiste la Ronda: " + datos.current.nametwo + " gana Punto!";
              pointsopp.current += 1;
            }
            const alertTwo = AlertMessage(xcad,4000);
            Swal.fire(alertTwo.firstMessage);
          };
        }
      });
      return () => {
        connection.off('ResponseCard1vs1');
      };
    }, [connection]); */

  /*
    useEffect(() => {
      if (!connection) return;
      connection.on('ReasonRound1vs1', (Razon: string) => {
        console.log(Razon);
        let resp : boolean = (Razon == "01" ? true : false);
        let xcad : string = "";
        if (Razon == playerturn.current) {
          pointTwo.current = pointTwo.current + 1;
          xcad = "Ganaste la Ronda! Puntuación: " + pointTwo.current.toString();
          xcad += "-" + pointOne.current.toString();
          if (roundturn.current == false) roundturn.current = true;
        } else {
          pointOne.current = pointOne.current + 1;
          xcad = "Perdiste la Ronda! Puntuación: " + pointTwo.current.toString();
          xcad += "-" + pointOne.current.toString();
          if (roundturn.current == true) roundturn.current = false;
        }        
        if (pointOne.current < 2 && pointTwo.current < 2) {
          const alertOne = AlertMessage(xcad,4000);
          Swal.fire(alertOne.firstMessage).then( () => {
            setTableCards(prev => [cpEightRef.current]);      
          });               
        } else {
          if (pointTwo.current == 2) {
            xcad = "Ganaste la Ronda y Ganas Punto!";
            pointsown.current += 1;
          } else {
            xcad = "Perdiste la Ronda: " + datos.current.nameone + " gana Punto!";
            pointsopp.current += 1;
          } 
          const alertTwo = AlertMessage(xcad,4000);
          Swal.fire(alertTwo.firstMessage);
        };
      });
      return () => {
        connection.off('ReasonRound1vs1');
      };
    }, [connection]); */
