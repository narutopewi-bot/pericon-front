'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RootState, useAppSelector, useAppDispatch } from '@/store/store';
import { setGamePlayer } from '@/store/slices/gameplayerSlice';
import { useSignalRContext } from '@/lib/signalrcontext';
import { Baraja } from '@/lib/library';
import Stone from '@/components/stone-meter';
import { GameAnnouncement, AnnouncementData } from '@/components/game-announcement';
import { playCardSound, playSwooshSound, vibrateDevice, playSynthSound, speakPhrase } from '@/lib/gameEffects';
import * as fonts from '@/components/fonts';
import { Copy, Check, Share2, Users, Clock, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';
import styles from './page.module.css';

interface Card {
  id: number;
  position: number;
  suit: string;
  number: number;
  image: string;
}

interface PlayedCard {
  playerIndex: number;
  card: Card;
}

interface SeatInfo {
  seatIndex: number;
  connectionId: string;
  name: string;
  team: number;
  role: string;
  isReady: boolean;
}

interface RoomState {
  roomName: string;
  bet: number;
  seats: SeatInfo[];
  isFull: boolean;
  gameStarted: boolean;
}

// Función oficial para jerarquía de cartas en Pericón
const evaluatePericonCard = (cardId: number, lifeCardId: number): number => {
  if (cardId < 0) return -1;
  switch (cardId) {
    case 4: return 30;  // 5 de Oros (Perico)
    case 33: return 29; // 4 de Bastos (Perica)
    case 38: return 27; // 11 de Bastos
    case 0: return 26;  // 1 de Oros
    case 7: return 25;  // 10 de Oros
  }
  const lifeSuit = Math.floor(lifeCardId / 10);
  const cardSuit = Math.floor(cardId / 10);
  const faceNum = (cardId % 10);
  const faceVal = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][faceNum];

  if (cardSuit === lifeSuit) {
    if (faceVal === 3) return 28;
    if (faceVal === 2) return 24;
    return 11 + faceVal; // 12 a 23
  }
  return 0; // Carta común
};

const doesCandidateBeatBest = (
  currentBestId: number,
  candidateId: number,
  leadCardId: number,
  lifeCardId: number
): boolean => {
  const powerBest = evaluatePericonCard(currentBestId, lifeCardId);
  const powerCandidate = evaluatePericonCard(candidateId, lifeCardId);

  const bestIsTriumph = powerBest >= 11;
  const candidateIsTriumph = powerCandidate >= 11;

  if (candidateIsTriumph && !bestIsTriumph) return true;
  if (!candidateIsTriumph && bestIsTriumph) return false;
  if (candidateIsTriumph && bestIsTriumph) return powerCandidate > powerBest;

  // Cartas comunes
  const suitLead = Math.floor(leadCardId / 10);
  const suitBest = Math.floor(currentBestId / 10);
  const suitCandidate = Math.floor(candidateId / 10);

  if (suitCandidate !== suitLead) return false;
  if (suitBest !== suitLead && suitCandidate === suitLead) return true;

  const faceBest = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][currentBestId % 10];
  const faceCandidate = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][candidateId % 10];
  return faceCandidate > faceBest;
};

export default function GameTwoVsTwo() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.gameplayer);
  const connection = useSignalRContext();

  const rawRoomName = Array.isArray(params?.roomName) ? params.roomName[0] : (params?.roomName as string || 'sala-pericon');
  const roomName = decodeURIComponent(rawRoomName);

  const initialBet = parseInt(searchParams.get('bet') || '100', 10);
  const [betAmount, setBetAmount] = useState<number>(initialBet);

  // Estado de Sala Multijugador (4 personas reales)
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [mySeatIndex, setMySeatIndex] = useState<number>(-1);
  const mySeatIndexRef = useRef<number>(-1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Jugadores en la mesa (Asientos 0, 1, 2, 3)
  const [players, setPlayers] = useState([
    { name: 'Anfitrión (Tú)', team: 1, role: 'Anfitrión' },
    { name: 'Esperando Rival 1...', team: 2, role: 'Rival 1' },
    { name: 'Esperando Compañero...', team: 1, role: 'Compañero' },
    { name: 'Esperando Rival 2...', team: 2, role: 'Rival 2' },
  ]);

  // Cartas en mano del jugador local
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [partnerCardCount, setPartnerCardCount] = useState<number>(3);
  const [rival1CardCount, setRival1CardCount] = useState<number>(3);
  const [rival2CardCount, setRival2CardCount] = useState<number>(3);

  // La Vida y Mesa Central
  const [lifeCard, setLifeCard] = useState<Card>({ id: -1, position: -1, suit: '', number: -1, image: '' });
  const [playedCards, setPlayedCards] = useState<PlayedCard[]>([]);
  const playedCardsRef = useRef<PlayedCard[]>([]);

  // Puntuación de Piedras (Equipo 1 vs Equipo 2)
  const [pointsTeam1, setPointsTeam1] = useState<number>(0);
  const [pointsTeam2, setPointsTeam2] = useState<number>(0);
  const pointsTeam1Ref = useRef<number>(0);
  const pointsTeam2Ref = useRef<number>(0);

  // Bazas ganadas en la mano actual (0 a 3)
  const [tricksTeam1, setTricksTeam1] = useState<number>(0);
  const [tricksTeam2, setTricksTeam2] = useState<number>(0);
  const tricksTeam1Ref = useRef<number>(0);
  const tricksTeam2Ref = useRef<number>(0);

  // Turnos y flujo
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const currentTurnRef = useRef<number>(0);
  const leadPlayerRef = useRef<number>(0);
  const handStarterRef = useRef<number>(0);

  // Estados visuales
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [isCleaningTable, setIsCleaningTable] = useState<boolean>(false);
  const [isProcessingMove, setIsProcessingMove] = useState<boolean>(false);
  const isProcessingMoveRef = useRef<boolean>(false);

  // Cantes y Apuestas (1, 3, 6, 9)
  const [currentStake, setCurrentStake] = useState<number>(1);
  const currentStakeRef = useRef<number>(1);
  const lastStakeAskedByRef = useRef<'team1' | 'team2' | null>(null);

  // Tumba
  const [isTumbaDeParaAtrasT1, setIsTumbaDeParaAtrasT1] = useState<boolean>(false);
  const [isTumbaDeParaAtrasT2, setIsTumbaDeParaAtrasT2] = useState<boolean>(false);
  const isTumbaDeParaAtrasT1Ref = useRef<boolean>(false);
  const isTumbaDeParaAtrasT2Ref = useRef<boolean>(false);

  // Anuncios y resultados de baza
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const announcementTimer = useRef<any>(null);

  const [trickResult, setTrickResult] = useState<{
    winningPlayer: number;
    winningCardId: number;
    winningTeam: number;
    winnerName: string;
    leadCardNumber: number;
    message: string;
  } | null>(null);

  const triggerAnnouncement = (data: AnnouncementData, durationMs: number = 2200) => {
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    setAnnouncement(data);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(null);
    }, durationMs);
  };

  const updatePoints = (newT1: number, newT2: number) => {
    const oldT1 = pointsTeam1Ref.current;
    const oldT2 = pointsTeam2Ref.current;
    pointsTeam1Ref.current = newT1;
    pointsTeam2Ref.current = newT2;

    if (oldT1 >= 9 && newT1 === 8) {
      isTumbaDeParaAtrasT1Ref.current = true;
      setIsTumbaDeParaAtrasT1(true);
    } else if (newT1 !== 8) {
      isTumbaDeParaAtrasT1Ref.current = false;
      setIsTumbaDeParaAtrasT1(false);
    }

    if (oldT2 >= 9 && newT2 === 8) {
      isTumbaDeParaAtrasT2Ref.current = true;
      setIsTumbaDeParaAtrasT2(true);
    } else if (newT2 !== 8) {
      isTumbaDeParaAtrasT2Ref.current = false;
      setIsTumbaDeParaAtrasT2(false);
    }

    setPointsTeam1(newT1);
    setPointsTeam2(newT2);
  };

  // Función para descomprimir las cartas de InitHand
  const parseHandCards = (initHand: string, seatIdx: number) => {
    const parts = initHand.split('-');
    if (parts.length < 13) return { hand: [], life: Baraja(0, 0) };

    const startIdx = seatIdx * 3;
    const hand = [
      Baraja(parseInt(parts[startIdx], 10), 0),
      Baraja(parseInt(parts[startIdx + 1], 10), 1),
      Baraja(parseInt(parts[startIdx + 2], 10), 2),
    ];
    const life = Baraja(parseInt(parts[12], 10), 0);
    return { hand, life };
  };

  // 1. CONEXIÓN A SIGNALR Y REGISTRO EN SALA
  useEffect(() => {
    if (!connection) return;

    const myName = user?.name && user.name !== 'nulo' ? user.name : 'Jugador';

    const joinRoom = async () => {
      try {
        await connection.invoke('JoinRoom2v2', roomName, myName, betAmount);
      } catch (err) {
        console.error('Error al invocar JoinRoom2v2:', err);
      }
    };

    joinRoom();

    // Evento: Actualización de estado de la sala (quién entra, quién sale)
    connection.on('RoomUpdate2v2', (data: RoomState) => {
      console.log('[RoomUpdate2v2 recibido]', data);
      setRoomState(data);
      if (data.bet) setBetAmount(data.bet);

      // Determinar mi propio asiento
      const mySeat = data.seats.find(s => s.connectionId === connection.connectionId || s.name === myName);
      if (mySeat) {
        setMySeatIndex(mySeat.seatIndex);
        mySeatIndexRef.current = mySeat.seatIndex;
      }

      // Actualizar información visible de los 4 asientos
      setPlayers(prev => {
        const next = [...prev];
        data.seats.forEach(s => {
          if (s.seatIndex >= 0 && s.seatIndex < 4) {
            next[s.seatIndex] = {
              name: s.name,
              team: s.team,
              role: s.role
            };
          }
        });
        return next;
      });
    });

    // Evento: Partida iniciada cuando se completan los 4 jugadores
    connection.on('GameStarted2v2', (data: any) => {
      console.log('[GameStarted2v2 recibido]', data);
      setRoomState(prev => prev ? { ...prev, gameStarted: true } : null);
      handleGameStarted(data);
    });

    // Evento: Nueva mano repartida
    connection.on('NewHandDealt2v2', (data: any) => {
      console.log('[NewHandDealt2v2 recibido]', data);
      handleNewHandDealt(data);
    });

    // Evento: Un jugador lanzó una carta
    connection.on('CardPlayed2v2', (data: { seatIndex: number; cardId: number }) => {
      console.log('[CardPlayed2v2 recibido]', data);
      handleRemoteCardPlayed(data.seatIndex, data.cardId);
    });

    // Eventos de Pedir (3, 6, 9)
    connection.on('StakeAsked2v2', (data: { seatIndex: number; nextStake: number }) => {
      handleRemoteStakeAsked(data.seatIndex, data.nextStake);
    });

    connection.on('StakeAnswered2v2', (data: { seatIndex: number; accepted: boolean }) => {
      handleRemoteStakeAnswered(data.seatIndex, data.accepted);
    });

    return () => {
      connection.off('RoomUpdate2v2');
      connection.off('GameStarted2v2');
      connection.off('NewHandDealt2v2');
      connection.off('CardPlayed2v2');
      connection.off('StakeAsked2v2');
      connection.off('StakeAnswered2v2');
      connection.invoke('LeaveRoom2v2', roomName).catch(() => {});
    };
  }, [connection, roomName, user]);

  // Manejar el inicio formal de la partida
  const handleGameStarted = (data: any) => {
    setIsDealing(true);
    playCardSound();
    playedCardsRef.current = [];
    setPlayedCards([]);
    setTrickResult(null);
    setTricksTeam1(0);
    setTricksTeam2(0);
    tricksTeam1Ref.current = 0;
    tricksTeam2Ref.current = 0;
    setCurrentStake(1);
    currentStakeRef.current = 1;
    lastStakeAskedByRef.current = null;

    const myIdx = mySeatIndexRef.current >= 0 ? mySeatIndexRef.current : 0;
    const { hand, life } = parseHandCards(data.initHand, myIdx);

    setMyCards(hand);
    setLifeCard(life);
    setPartnerCardCount(3);
    setRival1CardCount(3);
    setRival2CardCount(3);

    const starter = data.starterPlayer ?? 0;
    leadPlayerRef.current = starter;
    setCurrentTurn(starter);
    currentTurnRef.current = starter;

    setTimeout(() => {
      setIsDealing(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);

      const starterName = players[starter]?.name || 'Jugador';
      triggerAnnouncement({
        type: 'dame_tres',
        title: '¡PARTIDA 2 VS 2 INICIADA!',
        subtitle: `Sale jugando: ${starterName}`,
        badge: 'MANO POR 1 PIEDRA'
      }, 2500);
    }, 1200);
  };

  // Manejar el reparto de una nueva mano
  const handleNewHandDealt = (data: any) => {
    setIsDealing(true);
    playCardSound();
    playedCardsRef.current = [];
    setPlayedCards([]);
    setTrickResult(null);
    setTricksTeam1(0);
    setTricksTeam2(0);
    tricksTeam1Ref.current = 0;
    tricksTeam2Ref.current = 0;
    setCurrentStake(1);
    currentStakeRef.current = 1;
    lastStakeAskedByRef.current = null;

    const myIdx = mySeatIndexRef.current >= 0 ? mySeatIndexRef.current : 0;
    const { hand, life } = parseHandCards(data.initHand, myIdx);

    setMyCards(hand);
    setLifeCard(life);
    setPartnerCardCount(3);
    setRival1CardCount(3);
    setRival2CardCount(3);

    const starter = data.starterPlayer ?? 0;
    handStarterRef.current = starter;
    leadPlayerRef.current = starter;
    setCurrentTurn(starter);
    currentTurnRef.current = starter;

    setTimeout(() => {
      setIsDealing(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);

      const starterName = players[starter]?.name || 'Jugador';
      triggerAnnouncement({
        type: 'dame_tres',
        title: '¡NUEVA MANO!',
        subtitle: `Sale jugando: ${starterName}`,
        badge: 'MANO POR 1 PIEDRA'
      }, 2200);
    }, 1200);
  };

  // Lanzar carta del jugador humano local
  const handlePlayMyCard = (card: Card) => {
    if (currentTurnRef.current !== mySeatIndexRef.current || isProcessingMoveRef.current || isCleaningTable) return;

    isProcessingMoveRef.current = true;
    setIsProcessingMove(true);

    if (connection) {
      connection.invoke('PlayCard2v2', roomName, mySeatIndexRef.current, card.id).catch((err) => {
        console.error('Error al enviar carta:', err);
        isProcessingMoveRef.current = false;
        setIsProcessingMove(false);
      });
    }
  };

  // Procesar carta recibida desde SignalR (para ti y para los otros 3 jugadores)
  const handleRemoteCardPlayed = (seatIndex: number, cardId: number) => {
    const card = Baraja(cardId, 0);
    playCardSound();

    if (seatIndex === mySeatIndexRef.current) {
      vibrateDevice('pedir');
      setMyCards(prev => prev.filter(c => c.id !== cardId));
    } else if (seatIndex === 1) {
      setRival1CardCount(prev => Math.max(0, prev - 1));
    } else if (seatIndex === 2) {
      setPartnerCardCount(prev => Math.max(0, prev - 1));
    } else if (seatIndex === 3) {
      setRival2CardCount(prev => Math.max(0, prev - 1));
    }

    playedCardsRef.current = [...playedCardsRef.current, { playerIndex: seatIndex, card }];
    setPlayedCards([...playedCardsRef.current]);

    if (playedCardsRef.current.length < 4) {
      const nextTurn = (seatIndex + 1) % 4;
      setCurrentTurn(nextTurn);
      currentTurnRef.current = nextTurn;
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);

      if (nextTurn === mySeatIndexRef.current) {
        triggerAnnouncement({
          type: 'dame_tres',
          title: '¡TU TURNO!',
          subtitle: 'Elige una carta para jugar',
          badge: 'ES TU TURNO'
        }, 1200);
      }
    } else {
      // Se completaron las 4 cartas en la mesa: EVALUAR BAZA
      finishTrick(playedCardsRef.current);
    }
  };

  // Evaluar baza completa de 4 cartas
  const finishTrick = (fourCards: PlayedCard[]) => {
    isProcessingMoveRef.current = true;
    setIsProcessingMove(true);

    const leadCardId = fourCards[0].card.id;
    let winningItem = fourCards[0];

    for (let i = 1; i < fourCards.length; i++) {
      const bestId = winningItem.card.id;
      const candId = fourCards[i].card.id;
      if (doesCandidateBeatBest(bestId, candId, leadCardId, lifeCard.id)) {
        winningItem = fourCards[i];
      }
    }

    const winningPlayer = winningItem.playerIndex;
    const winningTeam = (winningPlayer === 0 || winningPlayer === 2) ? 1 : 2;

    const newTricksT1 = winningTeam === 1 ? tricksTeam1Ref.current + 1 : tricksTeam1Ref.current;
    const newTricksT2 = winningTeam === 2 ? tricksTeam2Ref.current + 1 : tricksTeam2Ref.current;

    setTricksTeam1(newTricksT1);
    setTricksTeam2(newTricksT2);
    tricksTeam1Ref.current = newTricksT1;
    tricksTeam2Ref.current = newTricksT2;

    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    const isMyTeamWinner = winningTeam === myTeam;

    const roundText = isMyTeamWinner
      ? `Ganas. La ronda va: ${newTricksT1} a ${newTricksT2}`
      : `Pierdes. La ronda va: ${newTricksT1} a ${newTricksT2}`;

    setTrickResult({
      winningPlayer,
      winningCardId: winningItem.card.id,
      winningTeam,
      winnerName: players[winningPlayer].name,
      leadCardNumber: winningItem.card.number,
      message: `${roundText} • Ganó ${players[winningPlayer].name} (${players[winningPlayer].role}) con el ${winningItem.card.number}`
    });

    if (isMyTeamWinner) {
      vibrateDevice('winMatch');
      playSynthSound('win');
    }

    // Pausa de 3.8 segundos para apreciar las 4 cartas y el ganador
    setTimeout(() => {
      setIsCleaningTable(true);
      playSwooshSound();

      setTimeout(() => {
        playedCardsRef.current = [];
        setPlayedCards([]);
        setTrickResult(null);
        setIsCleaningTable(false);

        // Si se definieron 2 bazas ganadas o concluyeron las 3 bazas
        if (newTricksT1 >= 2 || newTricksT2 >= 2 || (newTricksT1 + newTricksT2 >= 3)) {
          resolveHandWinner(newTricksT1, newTricksT2);
        } else {
          // El ganador de la baza anterior abre la siguiente
          leadPlayerRef.current = winningPlayer;
          setCurrentTurn(winningPlayer);
          currentTurnRef.current = winningPlayer;
          isProcessingMoveRef.current = false;
          setIsProcessingMove(false);

          if (winningPlayer === mySeatIndexRef.current) {
            triggerAnnouncement({
              type: 'dame_tres',
              title: '¡GANASTE LA BAZA!',
              subtitle: 'Sales jugando la siguiente baza',
              badge: 'TU TURNO'
            }, 1500);
          }
        }
      }, 700);
    }, 3800);
  };

  // Resolver la mano y acumular piedras
  const resolveHandWinner = (t1Tricks: number, t2Tricks: number) => {
    const handWinningTeam = t1Tricks > t2Tricks ? 1 : 2;
    const addedStones = currentStakeRef.current;

    const newPointsT1 = handWinningTeam === 1 ? pointsTeam1Ref.current + addedStones : pointsTeam1Ref.current;
    const newPointsT2 = handWinningTeam === 2 ? pointsTeam2Ref.current + addedStones : pointsTeam2Ref.current;

    updatePoints(newPointsT1, newPointsT2);

    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    if (handWinningTeam === myTeam) {
      triggerAnnouncement({
        type: 'win_round',
        title: '¡MANO GANADA!',
        subtitle: `Tu equipo suma +${addedStones} piedra(s)`,
        badge: `MARCADOR: ${newPointsT1} a ${newPointsT2}`
      }, 3000);
      speakPhrase(`¡Ganan la mano! Suman ${addedStones} piedras.`);
    } else {
      triggerAnnouncement({
        type: 'opp_win_round',
        title: 'MANO PERDIDA',
        subtitle: `Los rivales suman +${addedStones} piedra(s)`,
        badge: `MARCADOR: ${newPointsT1} a ${newPointsT2}`
      }, 3000);
    }

    if (newPointsT1 >= 10 || newPointsT2 >= 10) {
      const isPlayerTeamWinner = myTeam === 1 ? newPointsT1 >= 10 : newPointsT2 >= 10;
      handleGameOver(isPlayerTeamWinner);
    } else {
      // Si soy el anfitrión (Asiento 0), solicito repartir la nueva mano rotando el turno
      if (mySeatIndexRef.current === 0 && connection) {
        setTimeout(() => {
          const nextStarter = (handStarterRef.current + 1) % 4;
          connection.invoke('DealNewHand2v2', roomName, nextStarter).catch(err => {
            console.error('Error al repartir nueva mano:', err);
          });
        }, 3000);
      }
    }
  };

  // Fin de la partida
  const handleGameOver = (isPlayerTeamWinner: boolean) => {
    const totalPot = betAmount * 4;
    const houseCommission = Math.floor(totalPot * 0.20);
    const teamPrize = totalPot - houseCommission;
    const myShare = Math.floor(teamPrize / 2);

    if (isPlayerTeamWinner) {
      vibrateDevice('winMatch');
      playSynthSound('win');
      speakPhrase('¡Felicidades! Tu equipo ha ganado la partida de dos contra dos.');

      const newCoins = (user?.coins || 100) + (myShare - betAmount);
      dispatch(setGamePlayer({ ...user, coins: newCoins }));

      Swal.fire({
        title: '¡VICTORIA EN EQUIPO! 🏆',
        html: `
          <div style="font-size: 14px; text-align: center; color: #cbd5e1;">
            <p style="color: #fde047; font-weight: bold; font-size: 18px; margin-bottom: 8px;">¡Tu equipo dominó la mesa!</p>
            <p>Puntos de tu equipo: <strong>${(mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? pointsTeam1Ref.current : pointsTeam2Ref.current}</strong></p>
            <p>Puntos rivales: <strong>${(mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? pointsTeam2Ref.current : pointsTeam1Ref.current}</strong></p>
            <div style="background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 12px; padding: 10px; margin-top: 12px; color: #86efac;">
              🪙 ¡Has ganado <strong>+${myShare} monedas</strong>! (Tu compañero recibió su parte igual).
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Volver al Menú',
        confirmButtonColor: '#22c55e',
        background: '#1a0e06',
        color: '#fff',
      }).then(() => {
        router.push('/desk');
      });
    } else {
      speakPhrase('Partida terminada. Los rivales se llevaron la victoria.');
      const newCoins = Math.max(0, (user?.coins || 100) - betAmount);
      dispatch(setGamePlayer({ ...user, coins: newCoins }));

      Swal.fire({
        title: 'PARTIDA PERDIDA 💔',
        html: `
          <div style="font-size: 14px; text-align: center; color: #cbd5e1;">
            <p style="color: #f87171; font-weight: bold;">Los rivales alcanzaron los 10 puntos.</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'Volver al Menú',
        confirmButtonColor: '#d97706',
        background: '#1a0e06',
        color: '#fff',
      }).then(() => {
        router.push('/desk');
      });
    }
  };

  // Mecánica de PEDIR (3, 6, 9) sincronizada en vivo
  const handlePedirClick = () => {
    if (isProcessingMoveRef.current || isCleaningTable) return;
    const current = currentStakeRef.current;
    const nextStake = current === 1 ? 3 : (current === 3 ? 6 : 9);

    if (current >= 9) return;

    Swal.fire({
      title: `¿Pedir ${nextStake} piedras?`,
      text: `Elevarás la apuesta de la mano de ${current} a ${nextStake} piedras para ambos equipos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `¡Quiero ${nextStake}!`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#64748b',
      background: '#1a0e06',
      color: '#fff',
    }).then((result) => {
      if (result.isConfirmed && connection) {
        connection.invoke('PedirStake2v2', roomName, mySeatIndexRef.current, nextStake).catch(err => {
          console.error('Error al pedir cante:', err);
        });
      }
    });
  };

  const handleRemoteStakeAsked = (askerSeat: number, nextStake: number) => {
    const askerTeam = (askerSeat === 0 || askerSeat === 2) ? 1 : 2;
    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    const askerName = players[askerSeat]?.name || 'Un jugador';

    if (askerTeam === myTeam) {
      triggerAnnouncement({
        type: nextStake === 3 ? 'dame_tres' : (nextStake === 6 ? 'quiero_seis' : 'van_nueve'),
        title: `¡TU EQUIPO PIDE ${nextStake}!`,
        subtitle: 'Esperando respuesta de los rivales...',
        badge: `CANTE POR ${nextStake}`
      }, 2200);
    } else {
      // Los rivales pidieron: Mostrar modal interactivo para responder
      playSynthSound('canto');
      Swal.fire({
        title: `¡${askerName} PIDE ${nextStake}!`,
        text: `El equipo rival propone jugar por ${nextStake} piedras. ¿Aceptan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '¡QUIERO! (Aceptar)',
        cancelButtonText: 'NO QUIERO (Rechazar)',
        confirmButtonColor: '#22c55e',
        cancelButtonColor: '#ef4444',
        background: '#1a0e06',
        color: '#fff',
      }).then((res) => {
        if (connection) {
          connection.invoke('AnswerStake2v2', roomName, mySeatIndexRef.current, res.isConfirmed).catch(console.error);
        }
      });
    }
  };

  const handleRemoteStakeAnswered = (responderSeat: number, accepted: boolean) => {
    const current = currentStakeRef.current;
    const nextStake = current === 1 ? 3 : (current === 3 ? 6 : 9);

    if (accepted) {
      setCurrentStake(nextStake);
      currentStakeRef.current = nextStake;
      triggerAnnouncement({
        type: 'win_round',
        title: '¡ACEPTADO!',
        subtitle: `Ahora se juega por ${nextStake} piedras`,
        badge: `APUESTA: ${nextStake} PIEDRAS`
      }, 2500);
      speakPhrase(`¡Dijeron quiero! Jugamos por ${nextStake} piedras.`);
    } else {
      triggerAnnouncement({
        type: 'win_round',
        title: '¡DIJERON NO QUIERO!',
        subtitle: 'Mano ganada automáticamente',
        badge: 'MANO GANADA'
      }, 2500);
      speakPhrase('¡No quisieron! Mano ganada.');
    }
  };

  // Copiar link de la sala
  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡Link de la Sala copiado!',
        text: 'Envíalo a tus compañeros para que se unan a tu mesa.',
        showConfirmButton: false,
        timer: 3000,
        background: '#1a0e06',
        color: '#fff'
      });
    });
  };

  // Compartir directamente por WhatsApp
  const handleShareWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = `¡Únete a mi mesa de Pericón 2 vs 2!\nEntra aquí para jugar conmigo: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isMatchmaking = roomName.startsWith('match-') || searchParams.get('match') === 'auto';
  const isGameRunning = roomState?.gameStarted === true;
  const connectedCount = roomState?.seats?.length || 0;

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#140a04] via-[#0b0502] to-[#040201] text-white flex flex-col relative overflow-hidden select-none">
      
      {/* 1. BARRA SUPERIOR (HEADER GAMER) */}
      <header className="w-full bg-black/80 backdrop-blur-md border-b border-amber-500/30 px-3 py-2 sm:px-6 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-2">
          <Link href="/desk" className="flex items-center gap-1 hover:opacity-80 transition">
            <Image src="/logo.svg" alt="Pericón" width={110} height={32} className="w-20 sm:w-28 object-contain" />
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest bg-purple-900/60 border border-purple-500/50 text-purple-200 px-2 py-0.5 rounded-md">
            {isMatchmaking ? 'DUELO 2 VS 2' : 'SALA PRIVADA'}
          </span>
          <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
            {roomName}
          </span>
        </div>

        {/* Marcador de Piedras Central */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Stone
            stoneone={pointsTeam1}
            stonetwo={pointsTeam2}
            isTumbaOne={pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8)}
            isTumbaTwo={pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8)}
          />
        </div>

        {/* Pote, Compartir y Salir */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isMatchmaking && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="bg-purple-950/80 hover:bg-purple-800 border border-purple-500/50 text-purple-200 px-2.5 py-1 rounded-xl flex items-center gap-1 text-xs font-bold transition active:scale-95 shadow"
              title="Copiar Link de la Sala"
            >
              {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">Invitar</span>
            </button>
          )}

          <div className="bg-amber-950/70 border border-amber-500/50 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow">
            <span className="text-xs">🪙</span>
            <span className="text-xs sm:text-sm font-black text-amber-300">{betAmount * 4}</span>
          </div>

          <button
            onClick={() => {
              Swal.fire({
                title: '¿Abandonar sala 2 vs 2?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, Salir',
                cancelButtonText: 'Seguir',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#22c55e',
                background: '#1a0e06',
                color: '#fff'
              }).then((res) => {
                if (res.isConfirmed) router.push('/desk');
              });
            }}
            className="w-8 h-8 rounded-xl bg-red-950/80 hover:bg-red-700 border border-red-500/40 flex items-center justify-center text-white text-xs font-bold transition active:scale-95"
            title="Salir"
          >
            🚪
          </button>
        </div>
      </header>

      {/* 2. LOBBY DE ESPERA (OVERLAY CUANDO HAY MENOS DE 4 JUGADORES) */}
      {/* 2. LOBBY DE ESPERA (OVERLAY CUANDO HAY MENOS DE 4 JUGADORES) */}
      {!isGameRunning && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          {isMatchmaking ? (
            /* Overlay de Carga para Duelo Matchmaking Automático */
            <div className="w-full max-w-md bg-gradient-to-b from-[#221208] via-[#180c05] to-[#0d0602] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto text-3xl shadow-lg border border-blue-300/40 mb-4 animate-pulse">
                ⚔️
              </div>
              <h2 className={`text-xl sm:text-2xl font-black text-white ${fonts.bowlbyOneSC.className} tracking-wide`}>
                PARTIDA EMPAREJADA
              </h2>
              <p className="text-xs text-amber-300/80 font-semibold mt-1">
                4 Jugadores encontrados • Conectando a la mesa
              </p>

              <div className="my-6 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-300 font-bold">
                  Sincronizando jugadores ({connectedCount}/4)...
                </span>
                <span className="text-[10px] text-slate-500">
                  Apuesta: 🪙 {betAmount} por jugador • Mesa {roomName}
                </span>
              </div>

              <button
                onClick={() => router.push('/desk')}
                className="text-xs text-red-400 hover:text-red-300 font-bold underline transition"
              >
                Cancelar y volver al escritorio
              </button>
            </div>
          ) : (
            /* Lobby de Espera para Sala Privada con Amigos */
            <div className="w-full max-w-lg bg-gradient-to-b from-[#221208] via-[#180c05] to-[#0d0602] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl text-center">
              
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto text-2xl shadow-lg border border-purple-300/40 mb-3">
                👑
              </div>

              <h2 className={`text-xl sm:text-2xl font-black text-white ${fonts.bowlbyOneSC.className} tracking-wide`}>
                SALA PRIVADA 2 VS 2
              </h2>
              <p className="text-xs text-amber-300/80 font-semibold mt-1">
                Mesa privada con amigos • Invita a 3 compañeros
              </p>

              {/* Código de Sala y Apuesta */}
              <div className="flex items-center justify-center gap-3 my-4">
                <div className="bg-black/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">CÓDIGO DE SALA</span>
                  <span className="text-sm sm:text-base font-black text-amber-400 font-mono">{roomName}</span>
                </div>
                <div className="bg-black/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">APUESTA POR JUGADOR</span>
                  <span className="text-sm sm:text-base font-black text-green-400">🪙 {betAmount}</span>
                </div>
              </div>

              {/* Cuadro de Compartir Link */}
              <div className="bg-black/70 border border-amber-500/30 rounded-2xl p-3 my-3">
                <span className="text-[11px] font-black uppercase text-amber-300 block text-left mb-1.5">
                  🔗 Comparte este link con tus compañeros para jugar:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 bg-black/60 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl outline-none font-mono select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 shadow shrink-0"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow"
                  >
                    <Share2 size={14} />
                    <span>Compartir por WhatsApp a tus amigos</span>
                  </button>
                </div>
              </div>

              {/* Estado de los 4 Asientos en la Mesa */}
              <div className="my-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
                  <span>Jugadores en la mesa:</span>
                  <span className="text-amber-400 font-extrabold">{connectedCount} de 4 Conectados</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((seatIdx) => {
                    const seat = roomState?.seats?.find(s => s.seatIndex === seatIdx);
                    const isTeam1 = seatIdx === 0 || seatIdx === 2;
                    const isMe = seatIdx === mySeatIndex;

                    return (
                      <div
                        key={seatIdx}
                        className={`p-2.5 rounded-2xl border flex items-center gap-2 text-left transition ${
                          seat
                            ? (isTeam1 ? 'bg-blue-950/60 border-blue-500/50 text-blue-100' : 'bg-red-950/60 border-red-500/50 text-red-100')
                            : 'bg-black/40 border-dashed border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          seat
                            ? (isTeam1 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white')
                            : 'bg-slate-800 text-slate-600'
                        }`}>
                          {seat ? (isTeam1 ? '🛡️' : '⚔️') : '⏳'}
                        </div>
                        <div className="truncate flex-1 leading-tight">
                          <span className="text-xs font-extrabold block truncate">
                            {seat ? `${seat.name} ${isMe ? '(Tú)' : ''}` : `Esperando ${seatIdx === 1 ? 'Rival 1' : (seatIdx === 2 ? 'Compañero' : 'Rival 2')}...`}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold block">
                            {isTeam1 ? 'Equipo 1 (Azul)' : 'Equipo 2 (Rojo)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mensaje de espera o botón de inicio */}
              <div className="mt-4">
                {connectedCount >= 4 ? (
                  <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-black text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2">
                    <Sparkles size={16} className="text-yellow-400" />
                    <span>¡4 jugadores conectados! La partida comenzará automáticamente...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-300/80 font-bold py-2">
                    <Clock size={14} className="animate-spin" />
                    <span>Esperando a que se unan {4 - connectedCount} jugador(es) más...</span>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 3. TABLERO DE JUEGO (MESA EN CRUZ 2 VS 2) */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between p-2 sm:p-4 relative">
        
        {/* ARRIBA: PUESTO 2 - COMPAÑERO (EQUIPO 1 - AZUL) */}
        <div className="w-full flex flex-col items-center justify-center relative z-10">
          <div className="bg-gradient-to-r from-blue-950/90 to-sky-950/90 border-2 border-blue-400/60 px-3 py-1 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black border border-blue-200">
              🤝
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-blue-100 block leading-tight">{players[2].name}</span>
              <span className="text-[8px] text-blue-300 uppercase font-black">Compañero (Azul)</span>
            </div>
            {currentTurn === 2 && (
              <span className="text-[9px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full shadow">
                TURNO
              </span>
            )}
          </div>

          {/* Cartas ocultas del Compañero */}
          <div className="flex items-center -space-x-4 mt-1">
            {Array.from({ length: partnerCardCount }).map((_, i) => (
              <div key={i} className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border border-blue-400/40 shadow">
                <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* FILA MEDIA: RIVAL 1 (IZQ), TAPETE CENTRAL (4 CARTAS), RIVAL 2 (DER) */}
        <div className="w-full flex items-center justify-between relative my-auto">
          
          {/* IZQUIERDA: PUESTO 1 - RIVAL 1 (EQUIPO 2 - ROJO) */}
          <div className="flex flex-col items-center justify-center z-10 w-20 sm:w-28">
            <div className="bg-gradient-to-b from-red-950/90 to-rose-950/90 border-2 border-red-500/60 p-1.5 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-red-500/20 w-full">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold border border-red-200">
                ⚔️
              </div>
              <span className="text-[11px] font-bold text-red-100 mt-1 truncate w-full">{players[1].name}</span>
              <span className="text-[8px] text-red-300 font-black uppercase">Rival 1</span>
              {currentTurn === 1 && (
                <span className="text-[8px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 rounded-full mt-1">
                  TURNO
                </span>
              )}
            </div>

            {/* Cartas ocultas de Rival 1 */}
            <div className="flex flex-col -space-y-6 mt-1.5">
              {Array.from({ length: rival1CardCount }).map((_, i) => (
                <div key={i} className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border border-red-500/40 shadow">
                  <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* TAPETE VERDE CENTRAL: 4 CARTAS EN MESA BIEN DISTRIBUIDAS */}
          <div className="flex-1 mx-1 sm:mx-4 min-h-[260px] sm:min-h-[300px] rounded-3xl bg-gradient-to-b from-[#1b4332] via-[#2d6a4f] to-[#1b4332] border-4 border-amber-600/60 shadow-2xl shadow-green-950/60 flex flex-col items-center justify-between p-2.5 sm:p-4 relative overflow-hidden">
            
            {/* Resplandor ambiental de tapete */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-black/30 pointer-events-none" />

            {/* Cabecera del Tapete: La Vida y Marcador de Bazas */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-amber-500/40 px-2.5 py-1 rounded-2xl shadow-lg">
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 block">LA VIDA</span>
                  <span className="text-[8px] text-slate-300 font-semibold">Triunfo</span>
                </div>
                {lifeCard.id >= 0 && (
                  <div className="w-8 h-12 sm:w-9 sm:h-13 rounded-md overflow-hidden border border-amber-400 shadow transform rotate-3">
                    <img src={lifeCard.image} alt="Vida" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="bg-black/70 backdrop-blur-sm border border-amber-500/40 px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-amber-300 shadow flex items-center gap-1.5">
                <span>Bazas:</span>
                <span className="text-blue-300 font-black">{tricksTeam1}</span>
                <span>a</span>
                <span className="text-red-300 font-black">{tricksTeam2}</span>
              </div>
            </div>

            {/* LAS 4 CARTAS DE LA BAZA EN FILA CLARA (SIN TAPARSE) */}
            <div className="w-full flex items-center justify-center gap-2 sm:gap-4 my-auto z-10 px-1">
              {[0, 1, 2, 3].map((pIdx) => {
                const playedItem = playedCards.find((p) => p.playerIndex === pIdx);
                const playerInfo = players[pIdx];
                const isTeam1 = pIdx === 0 || pIdx === 2;
                const isWinner = trickResult?.winningPlayer === pIdx;

                return (
                  <div key={pIdx} className="flex flex-col items-center transition-all duration-300">
                    {/* Ranura de la Carta */}
                    <div className={`w-[52px] h-[78px] sm:w-[68px] sm:h-[98px] rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all duration-300 ${
                      playedItem
                        ? (isWinner
                            ? 'border-yellow-400 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-500/50 scale-105 bg-white z-20'
                            : 'border-slate-300 bg-white shadow-md')
                        : (currentTurn === pIdx
                            ? (isTeam1 ? 'border-blue-400/80 bg-blue-950/40 border-dashed' : 'border-red-400/80 bg-red-950/40 border-dashed')
                            : 'border-emerald-800/50 bg-emerald-950/30 border-dashed')
                    }`}>
                      {playedItem ? (
                        <img src={playedItem.card.image} alt="Carta jugada" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] sm:text-[9px] text-emerald-300/50 font-bold text-center px-0.5">
                          {currentTurn === pIdx ? 'Jugando...' : '—'}
                        </span>
                      )}
                    </div>

                    {/* Identificación del Jugador debajo de su carta */}
                    <div className="flex flex-col items-center mt-1">
                      <span className={`text-[8px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full shadow ${
                        isTeam1
                          ? 'bg-blue-950/90 text-blue-200 border border-blue-400/50'
                          : 'bg-red-950/90 text-red-200 border border-red-400/50'
                      }`}>
                        {playerInfo.role}
                      </span>

                      {/* Insignia de Resultado de la Baza */}
                      {trickResult && playedItem && (
                        <span className={`text-[8px] sm:text-[9px] font-black mt-0.5 px-1.5 py-0.5 rounded shadow ${
                          isWinner
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black ring-2 ring-yellow-200'
                            : 'bg-black/60 text-stone-400'
                        }`}>
                          {isWinner ? '⭐ Ganó' : '❌'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BANNER DEL RESULTADO DE LA BAZA Y ESTADO DE LA RONDA */}
            <div className="w-full z-10 mt-1">
              {trickResult ? (
                <div className="w-full bg-black/90 border-2 border-amber-400 rounded-2xl py-1.5 px-3 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                  <span className={`text-xs sm:text-sm font-black tracking-wide ${
                    trickResult.winningTeam === 1 ? 'text-green-300' : 'text-rose-300'
                  }`}>
                    {trickResult.message}
                  </span>
                </div>
              ) : (
                <div className="w-full bg-black/50 border border-amber-500/20 rounded-xl py-1 px-2 text-center text-emerald-200/70 text-[10px] sm:text-xs">
                  <span>Mano por <strong>{currentStake}</strong> piedra(s) • Turno: <strong className="text-amber-300">{players[currentTurn]?.name}</strong></span>
                </div>
              )}
            </div>

          </div>

          {/* DERECHA: PUESTO 3 - RIVAL 2 (EQUIPO 2 - ROJO) */}
          <div className="flex flex-col items-center justify-center z-10 w-20 sm:w-28">
            <div className="bg-gradient-to-b from-red-950/90 to-rose-950/90 border-2 border-red-500/60 p-1.5 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-red-500/20 w-full">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold border border-red-200">
                ⚔️
              </div>
              <span className="text-[11px] font-bold text-red-100 mt-1 truncate w-full">{players[3].name}</span>
              <span className="text-[8px] text-red-300 font-black uppercase">Rival 2</span>
              {currentTurn === 3 && (
                <span className="text-[8px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 rounded-full mt-1">
                  TURNO
                </span>
              )}
            </div>

            {/* Cartas ocultas de Rival 2 */}
            <div className="flex flex-col -space-y-6 mt-1.5">
              {Array.from({ length: rival2CardCount }).map((_, i) => (
                <div key={i} className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border border-red-500/40 shadow">
                  <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ABAJO: PUESTO 0 - TÚ (EQUIPO 1 - AZUL) Y CONTROLES */}
        <div className="w-full flex flex-col items-center justify-center relative z-20">
          
          {/* Banner de Turno */}
          <div className="mb-1">
            {currentTurn === mySeatIndex ? (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs sm:text-sm px-4 py-1 rounded-full shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-300">
                👉 ¡ES TU TURNO DE TIRAR CARTA!
              </span>
            ) : (
              <span className="bg-black/60 border border-slate-700 text-slate-300 font-bold text-[11px] sm:text-xs px-3 py-0.5 rounded-full">
                Turno de: <strong className="text-amber-300">{players[currentTurn]?.name || 'Jugador'}</strong>
              </span>
            )}
          </div>

          {/* Tus Cartas en Abanico Interactivo (SIN PARPADEO) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 my-1">
            {myCards.map((card, index) => {
              const isTurn = currentTurn === mySeatIndex && !isProcessingMove && !isCleaningTable;
              let rotClass = index === 0 ? 'rotate-[-6deg]' : (index === 1 ? 'rotate-0' : 'rotate-[6deg]');

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!isTurn}
                  onClick={() => handlePlayMyCard(card)}
                  className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl overflow-hidden border-2 transition-all duration-200 transform ${rotClass} ${
                    isTurn
                      ? 'border-amber-400 hover:-translate-y-3 hover:scale-105 active:scale-95 shadow-2xl shadow-amber-500/30 ring-2 ring-yellow-400/60 cursor-pointer'
                      : 'border-slate-600 opacity-80 cursor-not-allowed'
                  }`}
                  title={isTurn ? 'Toca para jugar esta carta' : 'Espera tu turno'}
                >
                  <img src={card.image} alt={`Carta ${card.number}`} className="w-full h-full object-contain bg-white" />
                </button>
              );
            })}
          </div>

          {/* Barra de Acciones del Jugador */}
          <div className="w-full max-w-md flex items-center justify-between gap-2 mt-1 px-2">
            
            {/* Identidad del Jugador Local */}
            <div className="flex items-center gap-2 bg-blue-950/70 border border-blue-500/40 px-3 py-1.5 rounded-2xl">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center border border-blue-200">
                🛡️
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-blue-100">{user?.name && user.name !== 'nulo' ? user.name : 'Tú'}</span>
                <span className="text-[9px] text-blue-300 block font-semibold">
                  {(mySeatIndex === 0 || mySeatIndex === 2) ? 'Equipo 1 (Azul)' : 'Equipo 2 (Rojo)'}
                </span>
              </div>
            </div>

            {/* Botón de PEDIR (3, 6, 9) */}
            <button
              type="button"
              onClick={handlePedirClick}
              disabled={currentStake >= 9 || isProcessingMove || isCleaningTable}
              className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 border-2 transition-all shadow-xl active:scale-95 ${
                currentStake >= 9
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 hover:brightness-110 shadow-yellow-500/25 cursor-pointer'
              } ${fonts.bowlbyOneSC.className}`}
            >
              <span>🔥 PEDIR</span>
              <span className="text-[10px] bg-black text-yellow-300 px-1.5 py-0.5 rounded-md font-extrabold">
                {currentStake === 1 ? '3' : (currentStake === 3 ? '6' : '9')}
              </span>
            </button>

          </div>

        </div>

      </div>

      {/* ANUNCIOS VISUALES ANIMADOS (CENTRALES) */}
      {announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <GameAnnouncement announcement={announcement} />
        </div>
      )}

    </main>
  );
}
