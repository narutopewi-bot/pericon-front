'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useMediaQuery } from '@/components/use-media-query';
import { RootState, useAppSelector, useAppDispatch } from '@/store/store';
import { setGamePlayer } from '@/store/slices/gameplayerSlice';
import { playCoinWinSound } from '@/lib/soundEffects';

import { useSignalRContext } from '@/lib/signalrcontext';
import { Porcion, Baraja, isTrumpCard } from "@/lib/library";

import Image from 'next/image'
import Timer from '@/components/timer'
import Stone from '@/components/stone-meter'
import Link from 'next/link'

import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss'
import styles from './page.module.css';
import { vibrateDevice, speakPhrase, playSynthSound, playVoiceAudio, preloadVoiceAudios, playCardSound, playSwooshSound } from '@/lib/gameEffects';
import { GameAnnouncement, AnnouncementData, AnnouncementType } from '@/components/game-announcement';


// Types
interface Card {
  id: number
  position: number
  suit: string
  number: number
  image: string
}

interface Oponent {
  username: string
  avatar: string
}

interface GameCard {
  image: any
}

interface Message {
  game: number
  order: number
  content: string
}

export default function Duel() {

  // Router
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  // Get roomName from the URL
  const { roomName } = useParams();
  const gameplayer = useAppSelector((state: RootState) => state.gameplayer);
  const betAmount = parseInt(searchParams?.get('bet') || '50', 10);

  // Game state
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [showOverlay, setShowOverlay] = React.useState(false)
  const [textOverlay, setTextOverlay] = React.useState('Sample text overlay')
  const [ctaTextOverlay, setCtaTextOverlay] = React.useState('CTA')
  const [ctaLinkOverlay, setCtaLinkOverlay] = React.useState('/')
  const [imageOverlay, setImageOverlay] = React.useState('')

  const [playerturn, setPlayerturn] = React.useState<boolean>(true)
  const [roundturn, setRoundturn] = React.useState<boolean>(true)  

  const [pointsown, setPointsown] = React.useState<number>(0)
  const [pointsopp, setPointsopp] = React.useState<number>(0)  
  const [partown, setPartown] = React.useState<number>(0)
  const [partopp, setPartopp] = React.useState<number>(0)  
  const [pointOne, setPointOne] = React.useState<number>(0)
  const [pointTwo, setPointTwo] = React.useState<number>(0) 

  const pointsownRef = React.useRef<number>(0);
  const pointsoppRef = React.useRef<number>(0);
  const partownRef = React.useRef<number>(0);
  const partoppRef = React.useRef<number>(0);
  const pointOneRef = React.useRef<number>(0);
  const pointTwoRef = React.useRef<number>(0);

  const [currentStake, setCurrentStake] = React.useState<number>(1);
  const currentStakeRef = React.useRef<number>(1);
  const [lastStakeAskedBy, setLastStakeAskedBy] = React.useState<'player' | 'opp' | null>(null);
  const lastStakeAskedByRef = React.useRef<'player' | 'opp' | null>(null);
  const aiCardsRef = React.useRef<Card[]>([]);
  const hasAiAskedThisHand = React.useRef<boolean>(false);

  useEffect(() => { pointsownRef.current = pointsown; }, [pointsown]);
  useEffect(() => { pointsoppRef.current = pointsopp; }, [pointsopp]);
  useEffect(() => { partownRef.current = partown; }, [partown]);
  useEffect(() => { partoppRef.current = partopp; }, [partopp]);
  useEffect(() => { pointOneRef.current = pointOne; }, [pointOne]);
  useEffect(() => { pointTwoRef.current = pointTwo; }, [pointTwo]);
  useEffect(() => { currentStakeRef.current = currentStake; }, [currentStake]);
  useEffect(() => { lastStakeAskedByRef.current = lastStakeAskedBy; }, [lastStakeAskedBy]);

  const updatePointsAndTumba = (newOwn: number, newOpp: number) => {
    const oldOwn = pointsownRef.current;
    const oldOpp = pointsoppRef.current;

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

    pointsownRef.current = newOwn;
    setPointsown(newOwn);
    pointsoppRef.current = newOpp;
    setPointsopp(newOpp);
  };

  interface PedirChallengeData {
    challengerName: string;
    targetStake: number;
    rejectReward: number;
    canDoblar: boolean;
    timeLeft: number;
  }
  const [pedirChallenge, setPedirChallenge] = useState<PedirChallengeData | null>(null);

  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const announcementTimer = React.useRef<any>(null);

  const triggerAnnouncement = (data: AnnouncementData, durationMs: number = 2500) => {
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    setAnnouncement(data);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(null);
    }, durationMs);
  };

  const [selectedCard, setSelectedCard] = React.useState<GameCard | null>(null)
  const [waitingOpponent, setWaitingOpponent] = React.useState(true)
  const isProcessingRef = React.useRef<boolean>(false);
  const [isProcessingMove, setIsProcessingMove] = React.useState<boolean>(false);
  const [isRoundEnding, setIsRoundEnding] = React.useState<boolean>(false);
  const isRoundEndingRef = React.useRef<boolean>(false);

  // Players
  const user = useAppSelector((state: RootState) => state.gameplayer)
  const [oponent, setOponent] = React.useState<Oponent>({
    username: '',
    avatar: '',
  })

  // Cards
  const [tableCards, setTableCards] = React.useState<Card[]>([])
  const [playerCards, setPlayerCards] = React.useState<Card[]>([])
  const [oponentCards, setOponentCards] = React.useState<number>(3)
  const [cpEight, setCpEight] = React.useState<Card>({
      id: -1, position: -1, suit: "", number: -1, image: ""
  });
  const cpEightRef = React.useRef<Card>({
      id: -1, position: -1, suit: "", number: -1, image: ""
  });

  const [isDealing, setIsDealing] = useState(false);
  const [isReturningToDeck, setIsReturningToDeck] = useState(false);
  const [trickWinner, setTrickWinner] = useState<'player' | 'opp' | null>(null);
  const [tumbaCountdown, setTumbaCountdown] = useState<number | null>(null);
  const tumbaCountdownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(30);
  const hasTimedOut = React.useRef<boolean>(false);

  const [timerKey, setTimerKey] = useState(0);


  const [isTimerRunning, setIsTimerRunning] = useState(false);

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

  const [idGame, setIdGame] = React.useState<number>(0);
  const idGameRef = React.useRef<number>(0);

  // Start of the Game on solitaire mode

  useEffect(() => {
    preloadVoiceAudios();
    if (gameplayer.name?.startsWith("Invitado_") || gameplayer.id?.startsWith("guest_")) {
      Swal.fire({
        title: "SOLO PARTIDAS AMISTOSAS",
        text: "El modo invitado solo puede participar en salas amistosas (Crear o Unirse a Sala). Regístrate para jugar duelos por monedas.",
        icon: "warning",
        confirmButtonColor: "#d97706"
      }).then(() => {
        router.push("/desk");
      });
      return;
    }
    setOponent({ username: 'Pericon', avatar: '/avatar.png' })
  }, [gameplayer, router])

  // Initialize Game parameters

  const execRound = async(modelo: Message, bandera: boolean) => {
      console.log(modelo);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
      setPlayed(modelo);
      setIdGame(modelo.game);
      idGameRef.current = modelo.game;
      setPointOne(0);
      setPointTwo(0);
      pointOneRef.current = 0;
      pointTwoRef.current = 0;
      if (bandera == false) {
        let bandi : boolean = (playerturn == true) ? false : true;
        setPlayerturn(bandi);
      }
      const cpOne : Card = Baraja(Porcion(modelo.content,0),0);
      const cpTwo : Card = Baraja(Porcion(modelo.content,1),1);
      const cpThree : Card = Baraja(Porcion(modelo.content,2),2);
      const cpFour : Card = Baraja(Porcion(modelo.content,3),0);
      const cpFive : Card = Baraja(Porcion(modelo.content,4),1);
      const cpSix : Card = Baraja(Porcion(modelo.content,5),2);
      const cpSeven : Card = Baraja(Porcion(modelo.content,6),0);
      const nmZero : number = Porcion(modelo.content,7);
      setPlayerCards([cpOne, cpTwo, cpThree]);
      setCurrentStake(1);
      currentStakeRef.current = 1;
      setLastStakeAskedBy(null);
      lastStakeAskedByRef.current = null;
      hasAiAskedThisHand.current = false;
      aiCardsRef.current = [cpFour, cpFive, cpSix];

      setIsDealing(true);
      playCardSound();
      setOponentCards(3);
      setTableCards([cpSeven]);
      setCpEight(cpSeven);
      cpEightRef.current = cpSeven;

      setTimeout(() => {
        setIsDealing(false);
      }, 1200);

      // Regla de La Tumba: Si el jugador está en Tumba y no es obligado, pausar 10 segundos antes de preguntar
      const playerInTumba = (pointsownRef.current >= 9 || (partownRef.current === 1 && pointsownRef.current === 8));
      const oppInTumba = (pointsoppRef.current >= 9 || (partoppRef.current === 1 && pointsoppRef.current === 8));
      const isObligado = playerInTumba && oppInTumba;

      if (playerInTumba && !isObligado) {
        // Bloquear jugadas mientras transcurre la pausa de 10 segundos
        isProcessingRef.current = true;
        setIsProcessingMove(true);

        setTimeout(() => {
          setIsDealing(false);
        }, 1200);

        triggerAnnouncement({
          type: 'tumba',
          title: '¡ESTÁS EN TUMBA!',
          subtitle: 'Analiza tus 3 cartas y La Vida. Tienes 10 segundos.',
          badge: 'TUMBA: 10 SEGUNDOS'
        }, 3500);
        playVoiceAudio('estas_en_tumba', "¡Estás en tumba! Analiza tus cartas y la vida.");
        vibrateDevice('tumba');
        playSynthSound('tumba');

        // Iniciar contador regresivo de 10 segundos
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

            // Una vez concluidos los 10 segundos, mostrar el modal de decisión (3 segundos con auto-ingreso)
            let tumbaSolTimerInterval: any;
            Swal.fire({
              title: "¿Deseas jugar esta ronda en TUMBA?",
              html: `
                <p style="font-size: 13px; color: #fde68a; margin-bottom: 8px;">
                  Si aceptas y pierdes, se te restarán 3 piedras. Si rechazas, se te resta 1 piedra y se le suma al contrario.
                </p>
                <div style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; padding: 6px; font-size: 12px; color: #fca5a5; font-weight: bold;">
                  Auto-ingreso a la mano en: <strong id="tumba-swal-timer-sol" style="color: #ef4444; font-size: 14px;">3</strong>s
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
                const timerEl = document.getElementById("tumba-swal-timer-sol");
                tumbaSolTimerInterval = setInterval(() => {
                  if (timerEl) {
                    const left = Math.ceil((Swal.getTimerLeft() || 0) / 1000);
                    timerEl.textContent = left.toString();
                  }
                }, 100);
              },
              willClose: () => {
                if (tumbaSolTimerInterval) clearInterval(tumbaSolTimerInterval);
              }
            }).then((result) => {
              const autoAcceptedByTimer = result.dismiss === Swal.DismissReason.timer;
              if (result.isConfirmed || autoAcceptedByTimer) {
                // El jugador acepta jugar (o auto-ingresa al agotarse los 3s)
                triggerAnnouncement({
                  type: 'tumba',
                  title: '¡A JUGAR EN TUMBA!',
                  subtitle: autoAcceptedByTimer ? 'Auto-ingreso a la mano por tiempo' : (nmZero === 99 ? 'Te toca salir a ti' : 'El rival sale primero'),
                  badge: 'MANO DE TUMBA'
                }, 2000);

                if (nmZero === 99) {
                  setRoundturn(true);
                  setIsRoundEnding(false);
                  isRoundEndingRef.current = false;
                  isProcessingRef.current = false;
                  setIsProcessingMove(false);
                } else {
                  setRoundturn(false);
                  // La IA lanza su carta pausadamente tras aceptar
                  setTimeout(() => {
                    setOponentCards(2);
                    aiCardsRef.current = aiCardsRef.current.filter(c => c.id !== nmZero);
                    playCardSound();
                    if (nmZero == cpFour.id) setTableCards([cpSeven, cpFour]);
                    if (nmZero == cpFive.id) setTableCards([cpSeven, cpFive]);
                    if (nmZero == cpSix.id) setTableCards([cpSeven, cpSix]);
                    setIsRoundEnding(false);
                    isRoundEndingRef.current = false;
                    isProcessingRef.current = false;
                    setIsProcessingMove(false);
                  }, 800);
                }
              } else {
                // El jugador decide pasar la ronda
                isProcessingRef.current = false;
                setIsProcessingMove(false);
                const newOwn = Math.max(0, pointsownRef.current - 1);
                const newOpp = pointsoppRef.current + 1;
                updatePointsAndTumba(newOwn, newOpp);
                playVoiceAudio('pasaste_en_tumba', "Pasaste en Tumba. Menos una piedra.");
                vibrateDevice('reject');
                playSynthSound('reject');
                Swal.fire(AlertMessage("Pasaste en Tumba (-1 piedra para ti, +1 para el rival)").firstMessage).then(() => {
                  shuffleCards();
                });
              }
            });
          }
        }, 1000);

      } else {
        // Flujo normal o de obligado/rival en tumba
        if (nmZero == 99) {
          setRoundturn(true);
          setTimeout(() => {
            setIsDealing(false);
            setIsRoundEnding(false);
            isRoundEndingRef.current = false;
            isProcessingRef.current = false;
            setIsProcessingMove(false);
          }, 1200);
        } else {
          setRoundturn(false);
          // Espera a que termine la repartición para que la IA lance su carta pausadamente (jugador permanece bloqueado)
          isProcessingRef.current = true;
          setIsProcessingMove(true);
          setTimeout(() => {
            setOponentCards(2);
            aiCardsRef.current = aiCardsRef.current.filter(c => c.id !== nmZero);
            playCardSound();
            if (nmZero == cpFour.id) setTableCards([cpSeven, cpFour]);
            if (nmZero == cpFive.id) setTableCards([cpSeven, cpFive]);
            if (nmZero == cpSix.id) setTableCards([cpSeven, cpSix]);
            setIsDealing(false);
            setIsRoundEnding(false);
            isRoundEndingRef.current = false;
            isProcessingRef.current = false;
            setIsProcessingMove(false);
          }, 1300);
        }

        if (isObligado) {
          triggerAnnouncement({
            type: 'tumba',
            title: '¡ESTADO OBLIGADO!',
            subtitle: '¡Mano definitiva! El que gane 2 de 3 bazas gana el juego',
            badge: 'ÚLTIMA MANO'
          }, 3500);
          playVoiceAudio('obligado', "¡Obligado! Quien gane esta mano, gana la partida.");
          vibrateDevice('tumba');
          playSynthSound('tumba');
        } else if (oppInTumba) {
          triggerAnnouncement({
            type: 'tumba',
            title: '¡PERICÓN ESTÁ TUMBANDO!',
            subtitle: 'El oponente busca cerrar la partida',
            badge: 'Tumba activa'
          }, 3200);
          playVoiceAudio('estas_en_tumba', "¡Los rivales están en tumba!");
          vibrateDevice('tumba');
          playSynthSound('tumba');
        }
      }
  };

  const AlertMessage = (_title:string) => ({
    firstMessage: {
      title: _title,
      showConfirmButton: false,
      timer: 2000,
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

  // Respuesta de Inicio de Juego
  useEffect(() => {
    if (!connection) return;
    connection.on('InitiatedGameSol', (modelo: Message) => {
      console.log("Recibido InitiatedGameSol:", modelo);
      execRound(modelo, true);
    });
    return () => {
      connection.off('InitiatedGameSol');
    };
  }, [connection]);

  // Respuesta de cambio de Mano
  useEffect(() => {
    if (!connection) return;
    connection.on('ChangedTurnSol', (modelo: Message) => {
      console.log("Recibido ChangedTurnSol:", modelo);
      execRound(modelo, false);
    });
    return () => {
      connection.off('ChangedTurnSol');
    };
  }, [connection]);

  // Inicio del Juego, con repartición de cartas colocando el usuario como Mano
  useEffect(() => {
    if (!connection) return;
    if (hasConnected.current) return;

    const runStart = async () => {
      try {
        console.log("Invocando InitGameSol al servidor...");
        await connection.invoke("InitGameSol");
        hasConnected.current = true;
      } catch (error) {
        console.error("Error al iniciar el juego:", error);
      }
    };
    runStart();
  }, [connection]);

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
      cpZero = oponentCards - 1;
      cp01 = pointOneRef.current;
      cp02 = pointTwoRef.current;
      console.log("Valor de order: " + modelo.order);         
      console.log("Valor de cpThree: " + cpThree);      
      if (cpThree == 1) {
        cp01 = cp01 + 1; 
        pointOneRef.current = cp01;
        setPointOne(cp01); 
      } else {
        cp02 = cp02 + 1; 
        pointTwoRef.current = cp02;
        setPointTwo(cp02);
      }
      if (modelo.game) {
        idGameRef.current = modelo.game;
        setIdGame(modelo.game);
      }

      let remainingCount = 2;
      setPlayerCards(prevCards => {
        const next = prevCards.filter(card => card.id != cpOne.id);
        remainingCount = next.length;
        return next;
      });
      // El oponente tiene exactamente la misma cantidad de cartas restantes en mano tras la baza
      setOponentCards(remainingCount);
      aiCardsRef.current = aiCardsRef.current.filter(card => card.id !== cpTwo.id);
  
      const currentLife = cpEightRef.current.id !== -1 ? cpEightRef.current : cpEight;
      if (modelo.order == 102) {
        setTableCards([currentLife, cpOne, cpTwo]);
      } else {
        setTableCards([currentLife, cpTwo, cpOne]);
      } 

      // Verificación de La Cogía (puntos se aplican pero alertas se demoran tras la pausa)
      // No aplica si se está tumbando (cualquiera de los dos está en Tumba)
      const isTumba = (pointsownRef.current >= 9 || (partownRef.current === 1 && pointsownRef.current === 8)) ||
                      (pointsoppRef.current >= 9 || (partoppRef.current === 1 && pointsoppRef.current === 8));
      const hasTenGold = (cpOne.id === 7 || cpTwo.id === 7);
      const hasOneGold = (cpOne.id === 0 || cpTwo.id === 0);
      const isCogiaBonus = (!isTumba && hasTenGold && hasOneGold) ? Porcion(modelo.content, 4) : 0;
      if (isCogiaBonus === 1) {
        updatePointsAndTumba(pointsownRef.current + 3, pointsoppRef.current);
      } else if (isCogiaBonus === 2) {
        updatePointsAndTumba(pointsownRef.current, pointsoppRef.current + 3);
      }

      if (cp01 < 2 && cp02 < 2) {
        if (cpThree != 1) xcad = "Pierdes. La ronda va: ";
          else xcad = "Ganas. La ronda va: ";
        xcad = xcad + cp01.toString() + " a " + cp02.toString();

        const winner = cpThree == 1 ? 'player' : 'opp';
        setTrickWinner(winner);

        // 1. PAUSA GENEROSA DE 2.4 SEGUNDOS: CERO POPUPS NI MODALES. LAS CARTAS SE VEN CLARAMENTE EN LA MESA.
        setTimeout(() => {
          setIsReturningToDeck(true);
          playSwooshSound();

          // 2. AHORA SÍ: MIENTRAS REGRESAN AL MAZO Y LA MESA SE LIMPIA, SE MUESTRA EL MENSAJE
          setTimeout(() => {
            setIsReturningToDeck(false);
            setTrickWinner(null);
            setTableCards([currentLife]);

            if (isCogiaBonus === 1) {
              playVoiceAudio('la_cogia_propia', "¡La Cogía! Mataron el diez con el As de oro.");
              vibrateDevice('winMatch');
              playSynthSound('win');
              triggerAnnouncement({
                type: 'la_cogia',
                title: '¡LA COGÍA!',
                subtitle: '¡Cobraste La Cogía con el As de Oro!',
                badge: '+3 piedras automáticas'
              }, 2500);
            } else if (isCogiaBonus === 2) {
              playVoiceAudio('la_cogia_rival', "¡La Cogía para los rivales!");
              vibrateDevice('reject');
              playSynthSound('reject');
              triggerAnnouncement({
                type: 'la_cogia',
                title: '¡LA COGÍA PARA LA MÁQUINA!',
                subtitle: 'La máquina cobró La Cogía con el As de Oro',
                badge: '+3 piedras para el rival'
              }, 2500);
            }

            // Continuación de la mano (siguiente baza intermedia)
            if (cpThree != 1) {
              setRoundturn(false);
              aiCardsRef.current = aiCardsRef.current.filter(c => c.id !== cpFour.id);

              // 1. Limpiar mesa dejando solo la carta de La Vida
              setTableCards([currentLife]);
              // Jugador bloqueado mientras Pericón prepara y lanza su carta
              isProcessingRef.current = true;
              setIsProcessingMove(true);

              // 2. Tras 800ms, Pericón lanza su carta a la mesa de forma visible y garantizada
              setTimeout(() => {
                playCardSound();
                // Al colocar la carta en mesa, Pericón tiene una carta menos en mano
                setOponentCards(Math.max(0, remainingCount - 1));
                setTableCards([currentLife, cpFour]);
                // Desbloquear al jugador para que pueda responder lanzando su carta
                isProcessingRef.current = false;
                setIsProcessingMove(false);
                setTimeLeft(30);
                hasTimedOut.current = false;

                // Si Pericón tiene derecho y decide pedir
                const isTumba = (pointsownRef.current >= 9 || (partownRef.current === 1 && pointsownRef.current === 8)) ||
                                (pointsoppRef.current >= 9 || (partoppRef.current === 1 && pointsoppRef.current === 8));
                const nextAiStake = currentStakeRef.current === 1 ? 3 : (currentStakeRef.current === 3 ? 6 : 9);
                if (currentStakeRef.current < 9 && lastStakeAskedByRef.current !== 'opp' && !isTumba) {
                  if (evaluateAiAcceptance(nextAiStake) && Math.random() < 0.40) {
                    setTimeout(() => {
                      triggerAiPedir();
                    }, 800);
                  }
                }
              }, 800);
            } else {
              setRoundturn(true);
              setOponentCards(remainingCount);
              setTableCards([currentLife]);
              // Como ganó el jugador, le toca salir a él
              isProcessingRef.current = false;
              setIsProcessingMove(false);
              setTimeLeft(30);
              hasTimedOut.current = false;
            }
          }, 850);
        }, 2400);
      } else {
        const handWinner = (cp01 == 2) ? 'player' : 'opp';
        setTrickWinner(handWinner);

        // BLOQUEO INMEDIATO DE CARTAS: Evita que el usuario lance cartas antes del reparto
        setIsRoundEnding(true);
        isRoundEndingRef.current = true;
        isProcessingRef.current = true;
        setIsProcessingMove(true);

        // 1. PAUSA GENEROSA DE 2.4 SEGUNDOS: CERO POPUPS NI MODALES. SE VEN LAS CARTAS PERFECTAMENTE.
        setTimeout(() => {
          setIsReturningToDeck(true);
          playSwooshSound();

          // 2. AHORA QUE REGRESAN AL MAZO, SE MUESTRA EL MENSAJE DE QUIÉN GANÓ LA RONDA
          setTimeout(() => {
            setIsReturningToDeck(false);
            setTrickWinner(null);
            setTableCards([]);
            setPlayerCards([]); // Limpiar mano anterior: nada que tocar en pantalla

            // Fin de la mano (uno de los dos ganó 2 bazas)
            const playerWonHand = (cp01 == 2);
            
            // Verificar estados de Tumba: si hubo Cogía en esta mano, solo se acumulan piedras y la Tumba se jugará en la siguiente mano
            const playerInTumba = (pointsownRef.current >= 9 || (partownRef.current === 1 && pointsownRef.current === 8)) && (isCogiaBonus !== 1);
            const oppInTumba = (pointsoppRef.current >= 9 || (partoppRef.current === 1 && pointsoppRef.current === 8)) && (isCogiaBonus !== 2);
            const isObligado = playerInTumba && oppInTumba;

            if (isObligado) {
              if (playerWonHand) {
                playVoiceAudio('ganaste_en_obligado', "¡Ganaste la partida en obligado!");
                vibrateDevice('winMatch');
                playSynthSound('win');
                Swal.fire(AlertMessage("¡GANASTE LA PARTIDA EN OBLIGADO!").firstMessage).then(() => endGame(1));
              } else {
                playVoiceAudio('derrota_partida', "Partida terminada. Los rivales se llevaron la victoria.");
                vibrateDevice('reject');
                playSynthSound('reject');
                Swal.fire(AlertMessage("¡LA MÁQUINA GANA EN OBLIGADO!").firstMessage).then(() => endGame(2));
              }
              return;
            }

            if (playerInTumba) {
              if (playerWonHand) {
                playVoiceAudio('tumba_completada', "¡Ganaste la partida! Tumba completada.");
                vibrateDevice('winMatch');
                playSynthSound('win');
                Swal.fire(AlertMessage("¡GANASTE LA PARTIDA! (Tumba completada)").firstMessage).then(() => endGame(1));
                return;
              } else {
                updatePointsAndTumba(Math.max(0, pointsownRef.current - 3), pointsoppRef.current + 3);
                playVoiceAudio('caiste_en_tumba', "¡Caíste en Tumba! Menos tres piedras.");
                vibrateDevice('reject');
                playSynthSound('reject');
                xcad = "Perdiste en Tumba (-3 piedras para ti, +3 para el rival)";
              }
            } else if (oppInTumba) {
              if (!playerWonHand) {
                playVoiceAudio('derrota_partida', "Partida terminada. Los rivales se llevaron la victoria.");
                vibrateDevice('reject');
                playSynthSound('reject');
                Swal.fire(AlertMessage("¡LA MÁQUINA GANA LA PARTIDA! (Tumba completada)").firstMessage).then(() => endGame(2));
                return;
              } else {
                updatePointsAndTumba(pointsownRef.current + 3, Math.max(0, pointsoppRef.current - 3));
                playVoiceAudio('rivales_cayeron_tumba', "¡Los rivales cayeron en Tumba! Más tres piedras.");
                vibrateDevice('winRound');
                playSynthSound('win');
                xcad = "¡El rival cayó en Tumba! (+3 piedras para ti, -3 para él)";
              }
            } else {
              const stakePoints = currentStakeRef.current;
              if (playerWonHand) {
                updatePointsAndTumba(pointsownRef.current + stakePoints, pointsoppRef.current);
                if (stakePoints > 1) {
                  playVoiceAudio('ganaron_la_mano', "¡Ganaron la mano! Sumamos piedras.");
                } else {
                  playVoiceAudio('ganaste_la_ronda', "¡Ganaste la ronda!");
                }
                vibrateDevice('winRound');
                playSynthSound('win');
                triggerAnnouncement({
                  type: 'win_round',
                  title: '¡GANASTE LA RONDA!',
                  subtitle: stakePoints > 1 ? `Te llevas ${stakePoints} piedras` : 'Sumas 1 piedra a tu cuenta',
                  badge: `Marcador: ${pointsownRef.current} - ${pointsoppRef.current}`
                }, 2500);
                xcad = stakePoints > 1 ? `¡Ganaste la mano! (+${stakePoints} piedras)` : "¡Punto para ti!";
              } else {
                updatePointsAndTumba(pointsownRef.current, pointsoppRef.current + stakePoints);
                playVoiceAudio('punto_para_rivales', "Punto para los rivales.");
                vibrateDevice('reject');
                playSynthSound('reject');
                triggerAnnouncement({
                  type: 'opp_win_round',
                  title: 'PERICÓN GANA LA RONDA',
                  subtitle: stakePoints > 1 ? `El rival suma ${stakePoints} piedras` : 'El rival suma 1 piedra',
                  badge: `Marcador: ${pointsownRef.current} - ${pointsoppRef.current}`
                }, 2500);
                xcad = stakePoints > 1 ? `Pericón gana la mano (+${stakePoints} piedras)` : "Punto para tu oponente";
              }
            }

            const alertTwo = AlertMessage(xcad);
            setTimeout(() => {
              Swal.fire(alertTwo.firstMessage).then(() => {
                // Permanece bloqueado hasta que el servidor reparta la nueva mano
                delay(500).then(() => {
                  shuffleCards();
                });
              });
            }, 1800);
          }, 850);
        }, 4000);
      }

    });
    return () => {
      connection.off('ProcessedGameMove');
    };
  }, [connection]);

  // Failsafe de seguridad 1: Si la carta del rival ya está en mesa y toca responder,
  // garantizar que el jugador quede desbloqueado para responder
  useEffect(() => {
    if (!roundturn && tableCards.length === 2 && (isProcessingMove || isProcessingRef.current)) {
      const failsafe = setTimeout(() => {
        console.warn("Failsafe activado: Desbloqueando jugador para responder.");
        isProcessingRef.current = false;
        setIsProcessingMove(false);
      }, 500);
      return () => clearTimeout(failsafe);
    }
  }, [roundturn, tableCards, isProcessingMove]);

  // Failsafe de seguridad 2 (Anti-bloqueo total): Si es turno de Pericón y no ha colocado carta en mesa tras 2.2s,
  // colocar automáticamente su carta en la mesa y desbloquear al jugador
  useEffect(() => {
    if (!roundturn && tableCards.length <= 1 && (isProcessingMove || isProcessingRef.current) && !isDealing && !isReturningToDeck && !isRoundEnding && tumbaCountdown === null) {
      const emergencyTimer = setTimeout(() => {
        console.warn("Emergency failsafe: Pericón tardó en colocar carta, forzando jugada en mesa.");
        const nextAiCard = aiCardsRef.current[0];
        const currentLife = cpEightRef.current.id !== -1 ? cpEightRef.current : cpEight;
        if (nextAiCard) {
          aiCardsRef.current = aiCardsRef.current.filter(c => c.id !== nextAiCard.id);
          setOponentCards(prev => Math.max(0, prev - 1));
          setTableCards([currentLife, nextAiCard]);
          playCardSound();
        }
        isProcessingRef.current = false;
        setIsProcessingMove(false);
        setTimeLeft(30);
      }, 2200);
      return () => clearTimeout(emergencyTimer);
    }
  }, [roundturn, tableCards, isProcessingMove, isDealing, isReturningToDeck, isRoundEnding, tumbaCountdown]);

  // Failsafe de seguridad 3 (Anti-bloqueo cuando el jugador es mano): Si es turno del jugador de salir y la mesa está limpia,
  // asegurar que no quede en estado de procesamiento y pueda lanzar su carta
  useEffect(() => {
    if (roundturn && tableCards.length <= 1 && (isProcessingMove || isProcessingRef.current) && !isDealing && !isReturningToDeck && !isRoundEnding && tumbaCountdown === null) {
      const failsafeTimer = setTimeout(() => {
        console.warn("Failsafe activado: Desbloqueando jugador para salir con su carta.");
        isProcessingRef.current = false;
        setIsProcessingMove(false);
      }, 700);
      return () => clearTimeout(failsafeTimer);
    }
  }, [roundturn, tableCards, isProcessingMove, isDealing, isReturningToDeck, isRoundEnding, tumbaCountdown]);

  

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Determinar si hay Tumba activa para deshabilitar Pedir
  const isTumbaActive = (pointsown >= 9 || (partown === 1 && pointsown === 8)) ||
                        (pointsopp >= 9 || (partopp === 1 && pointsopp === 8));

  // Inteligencia de Pericón (IA) para Cantos (Pedir 3, 6, 9)
  const evaluateAiAcceptance = (targetStake: number): boolean => {
    const trumpCard = cpEightRef.current.id !== -1 ? cpEightRef.current : cpEight;
    let strongTrumpsCount = 0;
    const lifeSuit = Math.floor(trumpCard.id / 10);

    for (const c of aiCardsRef.current) {
      if (c.id === 38 || c.id === 7 || c.id === 0) {
        // 11 Basto, 10 Oro, 1 Oro
        strongTrumpsCount += 2;
      } else {
        const cSuit = Math.floor(c.id / 10);
        if (cSuit === lifeSuit) {
          const face = c.id % 10;
          if (face === 2) strongTrumpsCount += 2; // 3 de vida
          else if (face === 1) strongTrumpsCount += 1.5; // 2 de vida
          else strongTrumpsCount += 1; // triunfo común
        }
      }
    }

    if (targetStake === 3) {
      return strongTrumpsCount >= 2 || Math.random() < 0.45;
    } else if (targetStake === 6) {
      return strongTrumpsCount >= 3 || Math.random() < 0.35;
    } else if (targetStake === 9) {
      return strongTrumpsCount >= 4 || Math.random() < 0.25;
    }
    return false;
  };

  const handlePlayerPedir = () => {
    if (playerCards.length === 0) return;
    const curr = currentStakeRef.current;
    if (curr >= 9) return;
    // Un jugador no puede aumentarse a sí mismo: solo puede pedir si no fue el último en pedir
    if (lastStakeAskedByRef.current === 'player') return;

    const nextStake = curr === 1 ? 3 : (curr === 3 ? 6 : 9);
    const rejectReward = curr;

    setLastStakeAskedBy('player');
    lastStakeAskedByRef.current = 'player';

    const phrase = nextStake === 3 ? "¡Dame tres!" : nextStake === 6 ? "¡Quiero seis!" : "¡Van nueve!";
    const audioKey = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';
    const annType: AnnouncementType = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';

    // Feedback inmediato para el jugador
    playVoiceAudio(audioKey, phrase);
    vibrateDevice('pedir');
    playSynthSound('canto');
    triggerAnnouncement({
      type: annType,
      title: (phrase || '').toUpperCase(),
      subtitle: `Retando al oponente por ${nextStake} piedras`
    }, 2000);

    const aiAccepts = evaluateAiAcceptance(nextStake);

    if (aiAccepts) {
      setCurrentStake(nextStake);
      currentStakeRef.current = nextStake;

      setTimeout(() => {
        playVoiceAudio('acepto', "¡Acepto!");
        vibrateDevice('accept');
        playSynthSound('accept');
        triggerAnnouncement({
          type: 'acepto',
          title: '¡PERICÓN ACEPTÓ!',
          subtitle: `Mano en juego por ${nextStake} piedras. El rival tiene el derecho a revirar.`,
          badge: `Apuesta: ${nextStake} piedras`
        }, 2200);

        Swal.fire({
          title: "¡Pericón ACEPTÓ!",
          text: `Esta mano se juega ahora por ${nextStake} piedras. El rival tiene el derecho a revirar.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          color: "#ffffff",
          background: "#9d6727",
          backdrop: true,
          customClass: {
            title: styles.customtitle,
            popup: styles.custompopup
          }
        }).then(() => {
          if (!roundturn && tableCards.length === 2) {
            isProcessingRef.current = false;
            setIsProcessingMove(false);
          }
        });
      }, 1600);
    } else {
      // Pericón rechaza: el jugador se lleva las piedras previas y la mano finaliza
      setTimeout(() => {
        playVoiceAudio('no_quiero', "¡No quiero!");
        vibrateDevice('reject');
        playSynthSound('reject');
        triggerAnnouncement({
          type: 'no_quiero',
          title: '¡NO QUIERO!',
          subtitle: `Pericón rechazó. ¡Ganas ${rejectReward} ${rejectReward === 1 ? 'piedra' : 'piedras'}!`,
          badge: `+${rejectReward} piedras inmediatas`
        }, 2500);

        Swal.fire({
          title: "¡Pericón NO quiso!",
          text: `Pericón rechazó tu pedido de ${nextStake} piedras. Ganas ${rejectReward} ${rejectReward === 1 ? "piedra" : "piedras"} inmediatamente.`,
          icon: "info",
          timer: 2500,
          showConfirmButton: false,
          color: "#ffffff",
          background: "#9d6727",
          backdrop: true,
          customClass: {
            title: styles.customtitle,
            popup: styles.custompopup
          }
        }).then(() => {
          updatePointsAndTumba(pointsownRef.current + rejectReward, pointsoppRef.current);
          delay(800).then(() => {
            shuffleCards();
          });
        });
      }, 1600);
    }
  };

  const handleAnswerAiPedir = (action: 'accept' | 'deny' | 'doblar') => {
    if (!pedirChallenge) return;
    const nextStake = pedirChallenge.targetStake;
    const rejectReward = pedirChallenge.rejectReward;
    setPedirChallenge(null);

    if (action === 'accept') {
      setCurrentStake(nextStake);
      currentStakeRef.current = nextStake;
      playVoiceAudio('acepto', "¡Acepto!");
      vibrateDevice('accept');
      playSynthSound('accept');
      triggerAnnouncement({
        type: 'acepto',
        title: '¡ACEPTASTE EL RETO!',
        subtitle: `La mano se juega por ${nextStake} piedras. Tienes el derecho a revirar.`,
        badge: 'Tienes el quiero'
      }, 2200);
      if (!roundturn && tableCards.length === 2) {
        isProcessingRef.current = false;
        setIsProcessingMove(false);
      }
    } else if (action === 'deny') {
      updatePointsAndTumba(pointsownRef.current, pointsoppRef.current + rejectReward);
      playVoiceAudio('no_quiero', "¡No quiero!");
      vibrateDevice('reject');
      playSynthSound('reject');
      triggerAnnouncement({
        type: 'no_quiero',
        title: '¡NO QUIERES!',
        subtitle: `Pericón gana ${rejectReward} ${rejectReward === 1 ? 'piedra' : 'piedras'}`
      }, 2000);
      setTimeout(() => {
        shuffleCards();
      }, 1200);
    } else if (action === 'doblar') {
      const newStake = nextStake === 3 ? 6 : 9;
      setCurrentStake(newStake);
      currentStakeRef.current = newStake;
      setLastStakeAskedBy('player');
      lastStakeAskedByRef.current = 'player';
      const phrase = newStake === 6 ? "¡Quiero seis!" : "¡Van nueve!";
      const audioKey = newStake === 6 ? 'quiero_seis' : 'van_nueve';
      playVoiceAudio(audioKey, phrase);
      vibrateDevice('pedir');
      playSynthSound('canto');
      triggerAnnouncement({
        type: newStake === 6 ? 'quiero_seis' : 'van_nueve',
        title: (phrase || '').toUpperCase(),
        subtitle: `Reviraste a Pericón por ${newStake} piedras`
      }, 2000);

      const aiAccepts = evaluateAiAcceptance(newStake);
      if (aiAccepts) {
        setTimeout(() => {
          playVoiceAudio('acepto', "¡Acepto!");
          vibrateDevice('accept');
          playSynthSound('accept');
          triggerAnnouncement({
            type: 'acepto',
            title: '¡PERICÓN ACEPTÓ EL REVIRE!',
            subtitle: `Mano en juego por ${newStake} piedras`,
            badge: 'Revire aceptado'
          }, 2000);
        }, 1600);
      } else {
        setTimeout(() => {
          playVoiceAudio('no_quiero', "¡No quiero!");
          vibrateDevice('reject');
          playSynthSound('reject');
          triggerAnnouncement({
            type: 'no_quiero',
            title: '¡PERICÓN NO QUIERE!',
            subtitle: `¡Ganas ${nextStake} piedras inmediatamente!`,
            badge: `+${nextStake} piedras`
          }, 2500);
          updatePointsAndTumba(pointsownRef.current + nextStake, pointsoppRef.current);
          setTimeout(() => {
            shuffleCards();
          }, 1500);
        }, 1600);
      }
    }
  };

  // Cuenta regresiva para responder al Pedir de Pericón (12 segundos)
  useEffect(() => {
    if (!pedirChallenge) return;

    const interval = setInterval(() => {
      setPedirChallenge(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          handleAnswerAiPedir('accept');
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pedirChallenge]);

  const triggerAiPedir = () => {
    const isTumba = (pointsownRef.current >= 9 || (partownRef.current === 1 && pointsownRef.current === 8)) ||
                    (pointsoppRef.current >= 9 || (partoppRef.current === 1 && pointsoppRef.current === 8));
    const curr = currentStakeRef.current;
    if (curr >= 9 || isTumba || lastStakeAskedByRef.current === 'opp' || playerCards.length === 0) return;

    const nextStake = curr === 1 ? 3 : (curr === 3 ? 6 : 9);
    const rejectReward = curr;

    setLastStakeAskedBy('opp');
    lastStakeAskedByRef.current = 'opp';

    const audioKey = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';
    const phrase = nextStake === 3 ? "¡Dame tres!" : nextStake === 6 ? "¡Quiero seis!" : "¡Van nueve!";
    const annType: AnnouncementType = nextStake === 3 ? 'dame_tres' : nextStake === 6 ? 'quiero_seis' : 'van_nueve';

    playVoiceAudio(audioKey, phrase);
    vibrateDevice('pedir');
    playSynthSound('canto');

    try { Swal.close(); } catch (_) {}

    setPedirChallenge({
      challengerName: "Pericón",
      targetStake: nextStake,
      rejectReward,
      canDoblar: nextStake < 9,
      timeLeft: 12
    });
  };

  // Managing Card Selection

  const handleCardClick = async (card: Card) => {
    if (!connection || isProcessingRef.current || isRoundEndingRef.current || isDealing || tumbaCountdown !== null) return;
    if (!roundturn && tableCards.length <= 1) return;

    // Regla del Pelao: Si el rival salió con triunfo y el jugador tiene triunfos, es obligatorio lanzar triunfo
    const currentLifeId = (tableCards.length > 0 && tableCards[0]?.id !== undefined && tableCards[0].id !== -1)
      ? tableCards[0].id
      : (cpEightRef.current?.id ?? -1);

    const isOpponentLead = (!roundturn && tableCards.length === 2);
    const oppLeadCard = isOpponentLead ? tableCards[1] : null;
    const isLeadTrump = oppLeadCard ? isTrumpCard(oppLeadCard.id, currentLifeId) : false;
    const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
    const isFirstBaza = playerCards.length === 3;
    const hasCincoDeOro = playerCards.some(c => c.id === 4);
    const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
    const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;

    if (isOpponentLead && isLeadTrump && playerHasTrump && !canDenyCinco && !isTrumpCard(card.id, currentLifeId)) {
      playVoiceAudio('regla_del_pelao', "¡Regla del Pelao! Debes lanzar un triunfo.");
      vibrateDevice('reject');
      playSynthSound('reject');
      triggerAnnouncement({
        type: 'pelao',
        title: '¡REGLA DEL PELAO!',
        subtitle: 'Salieron con triunfo: Estás obligado a lanzar un triunfo.',
        badge: 'PELAO OBLIGATORIO'
      }, 2500);
      return;
    }

    playCardSound();
    setTimeLeft(30);
    hasTimedOut.current = false;
    isProcessingRef.current = true;
    setIsProcessingMove(true);
    setSelectedCard(card);

    const numGame : number = idGameRef.current || played?.game || 0;
    const numCard : string = card.id.toString();
    const numOrder : number = (roundturn == true) ? 101 : 103;
    const dato : Message = { game: numGame, order: numOrder, content: numCard };
    try {
      console.log("Enviando objeto al servidor:", dato);
      await connection.invoke("ProcessGameMove", dato);
    } catch (error) {
      console.error("Error al enviar objeto al servidor:", error);
      isProcessingRef.current = false;
      setIsProcessingMove(false);
    };

    // Failsafe de seguridad: si tras 3.5s no se procesó la jugada, desbloquear para evitar juego pegado
    setTimeout(() => {
      if (isProcessingRef.current && !isRoundEndingRef.current && !isReturningToDeck) {
        console.warn("[Failsafe] Timeout esperando respuesta de jugada. Desbloqueando.");
        isProcessingRef.current = false;
        setIsProcessingMove(false);
      }
    }, 3500);
  };

  const shuffleCards = async () => {
    if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
    setTumbaCountdown(null);
    // Mantiene el bloqueo activo hasta que ChangedTurnSol reparta la nueva mano
    setCurrentStake(1);
    currentStakeRef.current = 1;
    setLastStakeAskedBy(null);
    lastStakeAskedByRef.current = null;
    hasAiAskedThisHand.current = false;
    if (connection) {
      const numberGame : number = idGameRef.current || played?.game || 0;
      const numberCard : string = "";
      const dato : Message = { game: numberGame, order: 105, content: numberCard };
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log("Enviando objeto al servidor:", dato);
        await connection.invoke("ChangeTurnSol", dato);
      } catch (error) {
        console.error("Error al enviar objeto al servidor:", error);
        isProcessingRef.current = false;
        setIsProcessingMove(false);
        setIsRoundEnding(false);
        isRoundEndingRef.current = false;
      };
    };
  };

  const endGame = async (x: number) => {
    const isWinner = x === 1;
    const coinsChange = isWinner ? betAmount : -betAmount;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
    let currentUserId = gameplayer?.id ? parseInt(gameplayer.id.toString(), 10) : 0;
    let storedUser: any = null;
    if (typeof window !== 'undefined') {
      try {
        const storedStr = localStorage.getItem("pericon_user");
        if (storedStr) {
          storedUser = JSON.parse(storedStr);
          if ((!currentUserId || isNaN(currentUserId)) && storedUser.id) {
            currentUserId = parseInt(storedUser.id.toString(), 10);
          }
        }
      } catch {}
    }

    const currentCoins = gameplayer?.coins ?? storedUser?.coins ?? 1000;
    const estimatedNewCoins = Math.max(0, currentCoins + coinsChange);

    // Actualizar Redux
    dispatch(setGamePlayer({
      ...gameplayer,
      coins: estimatedNewCoins,
      wins: isWinner ? (gameplayer?.wins || 0) + 1 : (gameplayer?.wins || 0),
      losses: !isWinner ? (gameplayer?.losses || 0) + 1 : (gameplayer?.losses || 0)
    }));

    // Registrar en base de datos PostgreSQL (Supabase)
    if (currentUserId > 0) {
      fetch(`${apiUrl}/api/user/record-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          won: isWinner,
          coinsChange: coinsChange
        })
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof window !== 'undefined' && storedUser) {
          storedUser.coins = data.coins;
          storedUser.wins = data.wins;
          storedUser.losses = data.losses;
          localStorage.setItem("pericon_user", JSON.stringify(storedUser));
        }
      })
      .catch(e => console.error("Error al registrar partida solitario:", e));
    } else if (typeof window !== 'undefined' && storedUser) {
      storedUser.coins = estimatedNewCoins;
      if (isWinner) storedUser.wins = (storedUser.wins || 0) + 1;
      else storedUser.losses = (storedUser.losses || 0) + 1;
      localStorage.setItem("pericon_user", JSON.stringify(storedUser));
    }

    if (isWinner) {
      playCoinWinSound();
      playVoiceAudio('victoria_partida', "¡Felicidades, ganaste la partida!");
      Swal.fire({
        title: '🏆 ¡VICTORIA CONTRA LA MÁQUINA!',
        html: `
          <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
            <p style="margin-bottom: 12px; font-weight: bold; color: #4ade80; font-size: 15px; text-align: center;">
              ¡Derrotaste a la computadora!
            </p>
            <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(250,204,21,0.25);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🪙 Recompensa ganada:</span>
                <span style="font-weight: bold; color: #4ade80;">+${betAmount} monedas</span>
              </div>
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span style="font-weight: bold; color: #fff;">👛 Tu nuevo saldo:</span>
                <span style="font-weight: 900; color: #fde047;">${estimatedNewCoins} monedas</span>
              </div>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Volver al Menú',
        confirmButtonColor: '#22c55e',
        background: '#1a0e06',
        color: '#fff',
      }).then(() => {
        router.push("/desk");
      });
    } else {
      playVoiceAudio('derrota_partida', "Partida terminada. La máquina se llevó la victoria.");
      Swal.fire({
        title: '💔 PARTIDA PERDIDA',
        html: `
          <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
            <p style="margin-bottom: 12px; font-weight: bold; color: #f87171; font-size: 15px; text-align: center;">
              La máquina ganó esta partida.
            </p>
            <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(239,68,68,0.3);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🪙 Monedas descontadas:</span>
                <span style="font-weight: bold; color: #f87171;">-${betAmount} monedas</span>
              </div>
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span style="font-weight: bold; color: #fff;">👛 Tu nuevo saldo:</span>
                <span style="font-weight: 900; color: #fde047;">${estimatedNewCoins} monedas</span>
              </div>
            </div>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'Volver al Menú',
        confirmButtonColor: '#d97706',
        background: '#1a0e06',
        color: '#fff',
      }).then(() => {
        router.push("/desk");
      });
    }
  };

  useEffect(() => {
    return () => {
      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
    };
  }, []);

  // Determinar si la regla del Pelao está activa para la interfaz
  const currentLifeId = (tableCards.length > 0 && tableCards[0]?.id !== undefined && tableCards[0].id !== -1)
    ? tableCards[0].id
    : (cpEightRef.current?.id ?? -1);
  const isOpponentLead = (!roundturn && tableCards.length === 2);
  const oppLeadCard = isOpponentLead ? tableCards[1] : null;
  const isLeadTrump = oppLeadCard ? isTrumpCard(oppLeadCard.id, currentLifeId) : false;
  const playerHasTrump = playerCards.some(c => isTrumpCard(c.id, currentLifeId));
  const isFirstBaza = playerCards.length === 3;
  const hasCincoDeOro = playerCards.some(c => c.id === 4);
  const trumpsCount = playerCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
  const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;
  const isPelaoActive = isOpponentLead && isLeadTrump && playerHasTrump;
  const isCardBlockingActive = isPelaoActive && !canDenyCinco;

  const isUserTurn = !isProcessingMove && !isRoundEnding && !isDealing && tumbaCountdown === null && (
    (tableCards.length <= 1 && roundturn) ||
    (tableCards.length === 2 && !roundturn)
  );

  const handleTimeoutForfeit = () => {
    if (hasTimedOut.current) return;
    hasTimedOut.current = true;
    console.log("[Solitaire Timeout] Se agotaron los 30s del turno.");
    playVoiceAudio('tiempo_agotado', "¡Tiempo agotado!");
    vibrateDevice('reject');
    playSynthSound('reject');
    triggerAnnouncement({
      type: 'opp_win_round',
      title: '¡TIEMPO AGOTADO!',
      subtitle: 'Carta jugada automáticamente por límite de tiempo',
      badge: '30 SEGUNDOS'
    }, 2200);

    // Seleccionar automáticamente una carta legal para no congelar la partida
    const playableCard = playerCards.find(c => {
      const isTrump = isTrumpCard(c.id, currentLifeId);
      return !isCardBlockingActive || isTrump;
    }) || playerCards[0];

    if (playableCard) {
      handleCardClick(playableCard);
    }
  };

  const handleSurrenderClick = () => {
    Swal.fire({
      title: '¿Abandonar la partida?',
      text: 'Si te sales ahora, perderás la partida contra Pericón.',
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
    }).then((result) => {
      if (result.isConfirmed) {
        router.push("/desk");
      }
    });
  };

  // Cuenta regresiva de 30 segundos por turno
  useEffect(() => {
    if (isDealing || isReturningToDeck || isRoundEnding || tumbaCountdown !== null) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isUserTurn && !hasTimedOut.current) {
            handleTimeoutForfeit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isUserTurn, isDealing, isReturningToDeck, isRoundEnding, tumbaCountdown, playerCards]);

  useEffect(() => {
    setTimeLeft(30);
    hasTimedOut.current = false;
  }, [isUserTurn]);

  return (
    <main className='grid h-screen overflow-auto space-y-0'>
      {/* Banner de Anuncios Centrales Animados */}
      <GameAnnouncement announcement={announcement} />

      {/* Modal interactivo de Reto 3-6-9 (Pedir) para Móvil y Desktop */}
      {pedirChallenge && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-amber-950 via-stone-900 to-black border-2 border-yellow-400 rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.7)] text-center relative overflow-hidden">
            {/* Ícono de Espadas animado */}
            <div className="text-4xl mb-2 animate-bounce">⚔️</div>

            <h2 className="text-xl sm:text-2xl font-black text-yellow-300 uppercase tracking-wide drop-shadow">
              ¡{(pedirChallenge?.challengerName || 'Computadora').toUpperCase()} PIDE POR {pedirChallenge.targetStake}!
            </h2>

            <p className="text-stone-200 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
              ¿Aceptas jugar esta mano por <span className="font-extrabold text-yellow-400 text-sm sm:text-base">{pedirChallenge.targetStake} piedras</span>?
            </p>

            {/* Barra regresiva de tiempo */}
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
                onClick={() => handleAnswerAiPedir('accept')}
                className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 active:scale-95 text-white font-black py-3 px-4 rounded-2xl text-base sm:text-lg shadow-lg border border-emerald-400 flex items-center justify-center gap-2 cursor-pointer transition-transform"
              >
                <span className="text-xl">✅</span>
                <span>¡Sí, Acepto!</span>
              </button>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleAnswerAiPedir('deny')}
                  className="flex-1 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-95 text-white font-black py-2.5 px-3 rounded-2xl text-sm sm:text-base shadow-lg border border-rose-400 flex items-center justify-center gap-1.5 cursor-pointer transition-transform"
                >
                  <span>❌</span>
                  <span>No Quiero</span>
                </button>

                {pedirChallenge.canDoblar && (
                  <button
                    onClick={() => handleAnswerAiPedir('doblar')}
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
            {/* Temporizador con indicador de turno */}
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border backdrop-blur-md shadow-lg transition-all ${
              isUserTurn 
                ? (timeLeft <= 10 
                    ? 'bg-red-950/90 border-red-500/80 ring-2 ring-red-500 animate-pulse' 
                    : 'bg-emerald-950/85 border-emerald-500/60 ring-1 ring-emerald-400/40')
                : 'bg-stone-900/80 border-amber-900/40 opacity-90'
            }`}>
              <span className='text-sm sm:text-lg'>{timeLeft <= 10 && isUserTurn ? '⚠️' : '⏱️'}</span>
              <div className='flex flex-col text-left'>
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  isUserTurn ? (timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400') : 'text-amber-400/70'
                }`}>
                  {isUserTurn ? 'Tu turno' : 'Turno Pericón'}
                </span>
                <span className={`text-xs sm:text-base font-extrabold font-mono leading-none ${
                  isUserTurn ? (timeLeft <= 10 ? 'text-red-300' : 'text-emerald-200') : 'text-stone-300'
                }`}>
                  00:{timeLeft.toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Marcador de Piedras */}
            <div className='flex justify-center'>
              <Stone 
                stoneone={pointsown} 
                stonetwo={pointsopp} 
                isTumbaOne={pointsown >= 9 || (partown === 1 && pointsown === 8)} 
                isTumbaTwo={pointsopp >= 9 || (partopp === 1 && pointsopp === 8)} 
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
                    !isUserTurn 
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
                        @{oponent.username}
                      </div>
                    </div>
                    {!isUserTurn && (
                      <div className='mt-0.5 bg-yellow-400 text-black font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-pulse'>
                        ⭐ Turno Pericón
                      </div>
                    )}
                  </div>

                  <div className='flex flex-row ml-2 sm:ml-3'>
                    {Array.from({ length: oponentCards }, (_, index) => (
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
                        const isOpponentCard = (index === 0 && !roundturn) || (index === 1 && roundturn);
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
                {isPelaoActive && (
                  <div className='flex justify-center mb-2 animate-bounce-subtle'>
                    {canDenyCinco ? (
                      <div className='flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-4 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 border-yellow-200'>
                        <span className='text-sm sm:text-base'>👑</span>
                        <span>REGLA DEL 5 DE ORO: ¡Puedes negarlo y tirar otra carta, o jugarlo si prefieres!</span>
                      </div>
                    ) : (
                      <div className='flex items-center gap-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black px-4 py-1 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 border-amber-300'>
                        <span className='text-sm sm:text-base'>⚡</span>
                        <span>REGLA DEL PELAO: ¡Salieron con triunfo, debes lanzar triunfo!</span>
                      </div>
                    )}
                  </div>
                )}

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

                {/* Player */}
                <div className='flex justify-center mb-2 sm:mb-4'>
                  <div className={`flex flex-col items-center rounded-2xl p-1 sm:p-1.5 transition-all duration-300 ${
                    isUserTurn 
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
                        @{gameplayer?.name || 'Jugador'}
                      </div>
                    </div>
                    {isUserTurn && (
                      <div className='mt-0.5 bg-yellow-400 text-black font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-pulse'>
                        ⭐ Tu Turno
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-row ml-2 sm:ml-3 relative z-20 ${isProcessingMove || isDealing || isRoundEnding || tumbaCountdown !== null ? 'pointer-events-none opacity-60 cursor-not-allowed' : ''}`}>
                    {playerCards &&
                      playerCards.map((card, index) => {
                        const isTrump = isTrumpCard(card.id, currentLifeId);
                        const isBlockedByPelao = isCardBlockingActive && !isTrump;

                        return (
                          <div
                            key={card.id}
                            style={{
                              animationDelay: `${index * 150}ms`,
                              transitionDelay: `${index * 40}ms`
                            }}
                            className={`
                              ${playerCardStyle(index)} cursor-pointer duration-300 touch-card relative
                              ${selectedCard?.image === card.image ? 'opacity-50 scale-95' : ''}
                              ${isDealing ? 'animate-in fade-in slide-in-from-bottom-12 zoom-in-75 duration-700' : ''}
                              ${isBlockedByPelao ? 'opacity-30 grayscale filter pointer-events-none cursor-not-allowed scale-95' : ''}
                              ${isPelaoActive && isTrump ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-emerald-950 shadow-xl shadow-amber-400/50 scale-105' : ''}
                              ${!isBlockedByPelao ? 'active:scale-110 active:-translate-y-5 sm:hover:-translate-y-4 sm:hover:scale-105 hover:shadow-2xl transition-all' : ''}
                            `}
                            onClick={() => {
                              if (!isProcessingMove && !isDealing && !isRoundEnding && tumbaCountdown === null) {
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
                      })}
                  </div>
                </div>



                {/* Botón de Pedir y Marcador de Apuesta (Ubicado en el lateral en móviles para no colisionar con las cartas) */}
                {!isTumbaActive && (
                  <div className='fixed right-2 top-[52%] -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-6 sm:right-6 z-30 flex flex-col items-end gap-1.5'>
                    {currentStake > 1 && (
                      <div className='flex flex-col items-end gap-1'>
                        <span className='bg-amber-600 text-white font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md border border-amber-300 animate-pulse'>
                          En juego: {currentStake} piedras
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow border ${
                          lastStakeAskedBy === 'player'
                            ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                            : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                        }`}>
                          {lastStakeAskedBy === 'player' ? '🔒 Rival tiene el quiero' : '⚡ Tienes el quiero (revire)'}
                        </span>
                      </div>
                    )}
                    <button
                      disabled={currentStake >= 9 || playerCards.length === 0 || lastStakeAskedBy === 'player'}
                      className={`${
                        currentStake >= 9 || playerCards.length === 0 || lastStakeAskedBy === 'player'
                          ? 'bg-stone-900/90 text-stone-400 cursor-not-allowed opacity-75 border-stone-700 py-1.5 sm:py-2.5 px-3 sm:px-6 text-xs sm:text-sm'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold shadow-xl hover:shadow-yellow-500/50 scale-100 hover:scale-105 active:scale-95 border-yellow-300 py-1.5 sm:py-2.5 px-3.5 sm:px-6 text-xs sm:text-sm'
                      } rounded-full border-2 transition-all duration-150 flex items-center gap-1.5`}
                      onClick={handlePlayerPedir}
                    >
                      <span className='uppercase tracking-wider font-black'>
                        {currentStake >= 9
                          ? 'Máximo (9)'
                          : lastStakeAskedBy === 'player'
                            ? 'Rival tiene el quiero'
                            : currentStake === 1
                              ? 'Pedir (3)'
                              : currentStake === 3
                                ? 'Pedir (6)'
                                : 'Pedir (9)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
