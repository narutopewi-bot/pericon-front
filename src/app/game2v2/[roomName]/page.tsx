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
import { playCardSound, playSwooshSound, vibrateDevice, playSynthSound, speakPhrase, playVoiceAudio } from '@/lib/gameEffects';
import { playCardDealSound, playCardDropSound, playCoinWinSound, playCantoSound, playChatPopSound } from '@/lib/soundEffects';
import GameTurnTimer from '@/components/game-turn-timer';
import { reportAppError } from '@/lib/errorLogger';
import { WebRTCVoiceManager, VoicePeerState } from '@/lib/webrtcVoiceManager';

import * as fonts from '@/components/fonts';
import { Copy, Check, Share2, Users, Clock, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
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
  avatarUrl?: string;
  isReady: boolean;
  isConnected?: boolean;
  disconnectedAt?: string;
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
  const lifeSuit = lifeCardId >= 0 ? Math.floor(lifeCardId / 10) : -1;
  const cardSuit = Math.floor(cardId / 10);
  const faceNum = (cardId % 10);
  const faceVal = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][faceNum];

  // 3 del palo de la vida (El Gollero)
  if (lifeSuit >= 0 && cardSuit === lifeSuit && faceVal === 3) return 28;

  // 2 de la vida
  if (lifeSuit >= 0 && cardSuit === lifeSuit && faceVal === 2) return 24;

  if (lifeSuit >= 0 && cardSuit === lifeSuit) {
    if (faceVal === 4) return 15;
    if (faceVal === 5) return 16;
    if (faceVal === 1) return 17; // As de la vida ("cinco y medio"): ¡le gana al 4 y al 5 de la vida!
    if (faceVal === 6) return 18; // El 6 de la vida le gana al As
    if (faceVal === 7) return 19;
    if (faceVal === 10) return 20;
    if (faceVal === 11) return 21;
    if (faceVal === 12) return 22;
  }
  return 0; // Carta común
};

const isTrumpCard = (cardId: number, lifeCardId: number): boolean => {
  return evaluatePericonCard(cardId, lifeCardId) >= 11;
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

const getSuitName = (cardId: number): string => {
  if (cardId < 0) return '';
  const suitIndex = Math.floor(cardId / 10);
  switch (suitIndex) {
    case 0: return 'Oros';
    case 1: return 'Copas';
    case 2: return 'Espadas';
    case 3: return 'Bastos';
    default: return '';
  }
};

const getSuitIcon = (cardId: number): string => {
  if (cardId < 0) return '⭐';
  const suitIndex = Math.floor(cardId / 10);
  switch (suitIndex) {
    case 0: return '🪙';
    case 1: return '🏆';
    case 2: return '⚔️';
    case 3: return '🪵';
    default: return '⭐';
  }
};

const getCardFaceName = (cardId: number): string => {
  if (cardId < 0) return 'Por repartir...';
  const num = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][cardId % 10];
  const suit = getSuitName(cardId);
  const title = num === 1 ? 'As' : (num === 10 ? 'Sota' : (num === 11 ? 'Caballo' : (num === 12 ? 'Rey' : num)));
  return `${title} de ${suit}`;
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

  const isFriendlyRoom = searchParams.get('friendly') === '1' ||
    (searchParams.get('match') !== 'auto' && !roomName.toLowerCase().startsWith('match-'));
  const initialBet = isFriendlyRoom ? 10 : parseInt(searchParams.get('bet') || '100', 10);
  const [betAmount, setBetAmount] = useState<number>(initialBet);

  // Estado de Sala Multijugador (4 personas reales)
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [mySeatIndex, setMySeatIndex] = useState<number>(-1);
  const mySeatIndexRef = useRef<number>(-1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const betAmountRef = useRef(betAmount);
  useEffect(() => { betAmountRef.current = betAmount; }, [betAmount]);

  // Estados de Chat de Voz WebRTC P2P (Cero consumo en Railway)
  const voiceManagerRef = useRef<WebRTCVoiceManager | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState<boolean>(true);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [speakingPeers, setSpeakingPeers] = useState<Record<number, boolean>>({});
  const [voicePeerStates, setVoicePeerStates] = useState<Record<number, VoicePeerState>>({});
  const [localVolume, setLocalVolume] = useState<number>(0);
  const [speakerTested, setSpeakerTested] = useState<boolean>(false);

  // Inicialización de usuario invitado persistente para evitar colisiones de asientos en enlaces compartidos
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let storedGuestId = localStorage.getItem('pericon_guest_id');
    let storedGuestName = localStorage.getItem('pericon_guest_name');

    if (!user?.id || user.id === '' || !user?.name || user.name === '' || user.name === 'nulo') {
      if (!storedGuestId) {
        storedGuestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        localStorage.setItem('pericon_guest_id', storedGuestId);
      }
      if (!storedGuestName) {
        storedGuestName = `Jugador_${Math.floor(100 + Math.random() * 900)}`;
        localStorage.setItem('pericon_guest_name', storedGuestName);
      }
      dispatch(setGamePlayer({
        id: storedGuestId,
        name: storedGuestName,
        avatarUrl: user?.avatarUrl || ''
      }));
    }
  }, [dispatch, user?.id, user?.name]);

  // Jugadores en la mesa (Asientos 0, 1, 2, 3)
  const [players, setPlayers] = useState<Array<{ name: string; team: number; role: string; avatarUrl?: string }>>([
    { name: 'Anfitrión (Tú)', team: 1, role: 'Anfitrión', avatarUrl: user?.avatarUrl || '' },
    { name: 'Esperando Rival 1...', team: 2, role: 'Rival 1' },
    { name: 'Esperando Compañero...', team: 1, role: 'Compañero' },
    { name: 'Esperando Rival 2...', team: 2, role: 'Rival 2' },
  ]);

  // Cartas en mano del jugador local y conteo por asiento (0, 1, 2, 3)
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [seatCardCounts, setSeatCardCounts] = useState<{ [seat: number]: number }>({ 0: 3, 1: 3, 2: 3, 3: 3 });

  // Perspectiva relativa dinámica según el asiento del jugador
  const partnerSeat = (mySeatIndex + 2) % 4;
  const leftRivalSeat = (mySeatIndex + 1) % 4;
  const rightRivalSeat = (mySeatIndex + 3) % 4;

  const partnerCardCount = seatCardCounts[partnerSeat] ?? 3;
  const rival1CardCount = seatCardCounts[leftRivalSeat] ?? 3;
  const rival2CardCount = seatCardCounts[rightRivalSeat] ?? 3;

  // La Vida y Mesa Central
  const [lifeCard, setLifeCard] = useState<Card>({ id: -1, position: -1, suit: '', number: -1, image: '' });
  const lifeCardRef = useRef<Card>({ id: -1, position: -1, suit: '', number: -1, image: '' });
  const [disconnectedNotice, setDisconnectedNotice] = useState<string | null>(null);
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
  const [isWaitingNextHand, setIsWaitingNextHand] = useState<boolean>(false);
  const isWaitingNextHandRef = useRef<boolean>(false);

  // Cantes y Apuestas (1, 3, 6, 9)
  const [currentStake, setCurrentStake] = useState<number>(1);
  const currentStakeRef = useRef<number>(1);
  const [isStakePending, setIsStakePending] = useState<boolean>(false);
  const isStakePendingRef = useRef<boolean>(false);
  const [lastStakeAskedBy, setLastStakeAskedBy] = useState<number | null>(null);
  const lastStakeAskedByRef = useRef<number | null>(null);

  // Tumba
  const [isTumbaDeParaAtrasT1, setIsTumbaDeParaAtrasT1] = useState<boolean>(false);
  const [isTumbaDeParaAtrasT2, setIsTumbaDeParaAtrasT2] = useState<boolean>(false);
  const isTumbaDeParaAtrasT1Ref = useRef<boolean>(false);
  const isTumbaDeParaAtrasT2Ref = useRef<boolean>(false);

  // Estados de Tumba oficiales (10 segundos de análisis y decisión)
  const [tumbaCountdown, setTumbaCountdown] = useState<number | null>(null);
  const tumbaCountdownTimerRef = useRef<any>(null);
  const [isWaitingOppTumba, setIsWaitingOppTumba] = useState<boolean>(false);

  // Temporizador oficial de 30 segundos por turno
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const timeLeftRef = useRef<number>(30);
  const handleTurnTimeoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    setTimeLeft(30);
    timeLeftRef.current = 30;
  }, [currentTurn]);

  useEffect(() => {
    if (isDealing || isCleaningTable || myCards.length === 0 || tumbaCountdown !== null || isWaitingOppTumba || isStakePending) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (currentTurnRef.current === mySeatIndexRef.current && !isProcessingMoveRef.current && myCards.length > 0) {
            handleTurnTimeoutRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, isDealing, isCleaningTable, myCards.length, tumbaCountdown, isWaitingOppTumba, isStakePending]);

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

  const updatePoints = (newT1: number, newT2: number, syncToServer: boolean = true) => {
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

    if (syncToServer && connection) {
      connection.invoke('UpdatePoints2v2', roomName, newT1, newT2).catch(() => {});
    }
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

    const syncJoinRoom = async () => {
      try {
        const currentUser = userRef.current;
        let myName = currentUser?.name && currentUser.name !== 'nulo' ? currentUser.name : '';
        let myUserId = currentUser?.id?.toString() || '';
        const myAvatar = currentUser?.avatarUrl || '';

        // Si redux aún no ha poblado el usuario, usar credenciales persistentes de localStorage
        if (!myUserId && typeof window !== 'undefined') {
          let storedGuestId = localStorage.getItem('pericon_guest_id');
          if (!storedGuestId) {
            storedGuestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            localStorage.setItem('pericon_guest_id', storedGuestId);
          }
          myUserId = storedGuestId;
        }

        if ((!myName || myName === 'Jugador') && typeof window !== 'undefined') {
          let storedGuestName = localStorage.getItem('pericon_guest_name');
          if (!storedGuestName) {
            storedGuestName = `Jugador_${Math.floor(100 + Math.random() * 900)}`;
            localStorage.setItem('pericon_guest_name', storedGuestName);
          }
          myName = storedGuestName;
        }

        const slotParam = searchParams.get('slot');
        const preferredSlot = mySeatIndexRef.current >= 0 ? mySeatIndexRef.current : (slotParam ? parseInt(slotParam, 10) : -1);
        await connection.invoke('JoinRoom2v2', roomName, myName || 'Jugador', betAmountRef.current, preferredSlot, myUserId, myAvatar);
      } catch (err: any) {
        console.error('Error al invocar JoinRoom2v2:', err);
      }
    };

    syncJoinRoom();

    const handleReconnected = () => {
      console.log('[SignalR 2v2] Reconexión exitosa detectada. Re-sincronizando sala...');
      syncJoinRoom();
    };
    connection.onreconnected(handleReconnected);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SignalR 2v2] Teléfono activo / pestaña visible. Sincronizando estado...');
        syncJoinRoom();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Evento: Sala llena
    connection.on('RoomFull2v2', (data: { message: string }) => {
      Swal.fire({
        title: 'Mesa Llena',
        text: data?.message || 'La mesa 2 vs 2 ya cuenta con los 4 jugadores completos.',
        icon: 'info',
        confirmButtonText: 'Regresar',
        confirmButtonColor: '#f59e0b',
        background: '#1a0e06',
        color: '#fff'
      }).then(() => {
        router.push('/desk');
      });
    });

    // Evento: Actualización de estado de la sala (quién entra, quién sale)
    connection.on('RoomUpdate2v2', (data: RoomState) => {
      console.log('[RoomUpdate2v2 recibido]', data);
      setRoomState(prev => ({
        ...data,
        gameStarted: prev?.gameStarted || data.gameStarted
      }));
      if (data.bet) setBetAmount(data.bet);

      const currentUser = userRef.current;
      const myName = currentUser?.name && currentUser.name !== 'nulo' ? currentUser.name : '';
      const myUserId = currentUser?.id?.toString() || (typeof window !== 'undefined' ? localStorage.getItem('pericon_guest_id') : '');

      // Determinar mi propio asiento (por ConnectionId, UserId o Nombre)
      const mySeat = data.seats.find(s =>
        s.connectionId === connection.connectionId ||
        (myUserId && (s as any).userId === myUserId) ||
        (myName && myName !== 'Jugador' && s.name === myName)
      );
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
              role: s.role,
              avatarUrl: s.avatarUrl
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

    // Evento: Resolución autoritativa de la baza desde el servidor
    connection.on('TrickFinished2v2', (data: any) => {
      console.log('[TrickFinished2v2 recibido]', data);
      handleServerTrickFinished(data);
    });

    // Evento: Desconexión y Reconexión
    connection.on('PlayerDisconnectedNotice2v2', (data: { seatIndex: number; name: string; message: string }) => {
      setDisconnectedNotice(data.message);
      speakPhrase(`${data.name} se ha desconectado. Esperando reconexión.`);
    });

    connection.on('PlayerReconnectedNotice2v2', (data: { seatIndex: number; name: string; message: string }) => {
      setDisconnectedNotice(null);
      speakPhrase(`${data.name} se ha reconectado.`);
      triggerAnnouncement({
        type: 'win_round',
        title: '¡JUGADOR RECONECTADO!',
        subtitle: `${data.name} ha regresado a la mesa`,
        badge: 'PARTIDA EN CURSO'
      }, 2500);
    });

    connection.on('GameReconnectedState2v2', (data: any) => {
      console.log('[GameReconnectedState2v2 recibido]', data);
      handleGameReconnected(data);
    });

    // Eventos de Pedir (3, 6, 9)
    connection.on('StakeAsked2v2', (data: { seatIndex: number; nextStake: number }) => {
      handleRemoteStakeAsked(data.seatIndex, data.nextStake);
    });

    connection.on('StakeAnswered2v2', (data: any) => {
      handleRemoteStakeAnswered(data);
    });



    // Eventos de Tumba Oficiales 2 vs 2
    connection.on('TumbaPassedNotice2v2', (data: any) => {
      console.log('[TumbaPassedNotice2v2 recibido]', data);
      setIsWaitingOppTumba(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);
      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
      setTumbaCountdown(null);
      Swal.close();

      updatePoints(data.pointsTeam1, data.pointsTeam2, false);
      if (typeof data.isTumbaDeParaAtrasTeam1 === 'boolean') {
        isTumbaDeParaAtrasT1Ref.current = data.isTumbaDeParaAtrasTeam1;
        setIsTumbaDeParaAtrasT1(data.isTumbaDeParaAtrasTeam1);
      }
      if (typeof data.isTumbaDeParaAtrasTeam2 === 'boolean') {
        isTumbaDeParaAtrasT2Ref.current = data.isTumbaDeParaAtrasTeam2;
        setIsTumbaDeParaAtrasT2(data.isTumbaDeParaAtrasTeam2);
      }

      const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
      const didMyTeamPass = data.passingTeam === myTeam;

      if (didMyTeamPass) {
        playVoiceAudio('pasaste_en_tumba', "Pasaron en Tumba. Menos una piedra.");
        triggerAnnouncement({
          type: 'tumba',
          title: 'PASARON EN TUMBA',
          subtitle: 'Se les resta 1 piedra a ustedes y se le suma al rival',
          badge: 'REPARTO NUEVA MANO'
        }, 3000);
      } else {
        playVoiceAudio('rivales_pasaron_tumba', "¡Los rivales pasaron en Tumba! Más una piedra para ustedes.");
        triggerAnnouncement({
          type: 'tumba',
          title: '¡LOS RIVALES PASARON EN TUMBA!',
          subtitle: 'Los rivales prefirieron no jugar. ¡Suman 1 piedra!',
          badge: 'REPARTO NUEVA MANO'
        }, 3000);
      }

      setIsWaitingNextHand(true);
      isWaitingNextHandRef.current = true;
      setTimeout(() => {
        if (isWaitingNextHandRef.current && connection) {
          console.warn('[Watchdog 2v2 Tumba] 5.5s sin NewHandDealt2v2. Solicitando RequestNewHand2v2...');
          connection.invoke('RequestNewHand2v2', roomName).catch((err: any) => {
            console.error('[Watchdog 2v2 invoke error]:', err);
          });
        }
      }, 5500);
    });

    connection.on('HandFinished2v2', (data: any) => {
      console.log('[HandFinished2v2 recibido]', data);
      if (typeof data.pointsTeam1 === 'number' && typeof data.pointsTeam2 === 'number') {
        updatePoints(data.pointsTeam1, data.pointsTeam2, false);
      }
      if (typeof data.isTumbaDeParaAtrasTeam1 === 'boolean') {
        isTumbaDeParaAtrasT1Ref.current = data.isTumbaDeParaAtrasTeam1;
        setIsTumbaDeParaAtrasT1(data.isTumbaDeParaAtrasTeam1);
      }
      if (typeof data.isTumbaDeParaAtrasTeam2 === 'boolean') {
        isTumbaDeParaAtrasT2Ref.current = data.isTumbaDeParaAtrasTeam2;
        setIsTumbaDeParaAtrasT2(data.isTumbaDeParaAtrasTeam2);
      }

      const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;

      if (data.fallenInTumbaTeam > 0) {
        const fallenTeam = data.fallenInTumbaTeam;
        const myTeamFell = fallenTeam === myTeam;
        if (myTeamFell) {
          triggerAnnouncement({
            type: 'tumba',
            title: '¡CAÍSTE EN TUMBA!',
            subtitle: '-3 piedras para tu equipo, +3 piedras para el rival',
            badge: `MARCADOR: ${data.pointsTeam1} a ${data.pointsTeam2}`
          }, 3800);
          playVoiceAudio('caiste_en_tumba', "¡Caíste en Tumba! Menos tres piedras.");
        } else {
          triggerAnnouncement({
            type: 'tumba',
            title: '¡LOS RIVALES CAYERON EN TUMBA!',
            subtitle: '-3 piedras para ellos, +3 piedras para tu equipo',
            badge: `MARCADOR: ${data.pointsTeam1} a ${data.pointsTeam2}`
          }, 3800);
          playVoiceAudio('rivales_cayeron_tumba', "¡Los rivales cayeron en Tumba! Más tres piedras para ustedes.");
        }
      }

      if (data.isGameOver) {
        setTimeout(() => {
          handleGameOver(data.winningTeamOfMatch === myTeam);
        }, 3500);
      } else {
        setIsWaitingNextHand(true);
        isWaitingNextHandRef.current = true;
        setTimeout(() => {
          if (isWaitingNextHandRef.current && connection) {
            console.warn('[Watchdog 2v2 HandFinished] 5.5s sin NewHandDealt2v2. Solicitando RequestNewHand2v2...');
            connection.invoke('RequestNewHand2v2', roomName).catch((err: any) => {
              console.error('[Watchdog 2v2 invoke error]:', err);
            });
          }
        }, 5500);
      }
    });

    connection.on('TumbaAcceptedNotice2v2', (data: { seatIndex: number; acceptingTeam: number; message: string }) => {
      console.log('[TumbaAcceptedNotice2v2 recibido]', data);
      setIsWaitingOppTumba(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);
      setTimeLeft(30);
      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
      setTumbaCountdown(null);
      Swal.close();

      triggerAnnouncement({
        type: 'tumba',
        title: '¡MANO DE TUMBA ACEPTADA!',
        subtitle: 'La mano de Tumba está en juego. ¡A jugar!',
        badge: 'TUMBA EN JUEGO'
      }, 2500);
      playVoiceAudio('mano_tumba_aceptada', "¡Aceptaron jugar la mano de Tumba!");
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      connection.off('RoomUpdate2v2');
      connection.off('GameStarted2v2');
      connection.off('NewHandDealt2v2');
      connection.off('CardPlayed2v2');
      connection.off('TrickFinished2v2');
      connection.off('HandFinished2v2');
      connection.off('PlayerDisconnectedNotice2v2');
      connection.off('PlayerReconnectedNotice2v2');
      connection.off('GameReconnectedState2v2');
      connection.off('StakeAsked2v2');
      connection.off('StakeAnswered2v2');
      connection.off('ReceiveQuickPhrase');
      connection.off('TumbaPassedNotice2v2');
      connection.off('TumbaAcceptedNotice2v2');
      if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
    };
  }, [connection, roomName]);

  // ==========================================
  // CHAT DE VOZ WEBRTC PEER-TO-PEER (P2P)
  // Comunicación directa de navegador a navegador
  // Cero consumo de ancho de banda en Railway
  // ==========================================
  useEffect(() => {
    if (!connection || !roomName || mySeatIndex < 0) return;
    if (typeof window === 'undefined') return;

    if (typeof RTCPeerConnection === 'undefined') {
      setIsVoiceSupported(false);
      return;
    }

    let isSubscribed = true;
    let vm = voiceManagerRef.current;

    const myName = userRef.current?.name && userRef.current.name !== 'nulo' ? userRef.current.name : `Jugador ${mySeatIndex + 1}`;

    if (!vm) {
      vm = new WebRTCVoiceManager();
      voiceManagerRef.current = vm;

      vm.onSpeakingChange = (seatIdx, isSpeaking) => {
        if (!isSubscribed) return;
        setSpeakingPeers(prev => ({ ...prev, [seatIdx]: isSpeaking }));
      };

      vm.onLocalVolumeChange = (vol) => {
        if (!isSubscribed) return;
        setLocalVolume(vol);
      };

      vm.onLocalMuteChange = (muted) => {
        if (!isSubscribed) return;
        setIsMicMuted(muted);
        if (muted) setLocalVolume(0);
      };

      vm.onStateChange = (states) => {
        if (!isSubscribed) return;
        setVoicePeerStates({ ...states });
      };

      vm.init(roomName, mySeatIndex, myName, connection).then((hasMic) => {
        if (!isSubscribed) return;
        setIsMicMuted(!hasMic);
      });
    } else {
      vm.updateSession(roomName, mySeatIndex, myName, connection);
    }

    return () => {
      isSubscribed = false;
    };
  }, [connection, roomName, mySeatIndex]);

  // Limpieza completa al salir de la sala
  useEffect(() => {
    return () => {
      if (voiceManagerRef.current) {
        voiceManagerRef.current.destroy();
        voiceManagerRef.current = null;
      }
    };
  }, []);

  // Conectar con compañeros y rivales cuando entran a la sala o cambian asientos
  useEffect(() => {
    if (!voiceManagerRef.current || !roomState?.seats || mySeatIndex < 0) return;

    roomState.seats.forEach((s) => {
      if (s.seatIndex !== mySeatIndex && s.seatIndex >= 0 && s.seatIndex < 4 && s.connectionId) {
        voiceManagerRef.current?.connectToPeer(s.seatIndex, s.name);
      }
    });
  }, [roomState?.seats, mySeatIndex]);

  const toggleVoiceMute = async () => {
    if (!voiceManagerRef.current) return;
    voiceManagerRef.current.resumeAllAudio();
    const muted = await voiceManagerRef.current.toggleMute();
    setIsMicMuted(muted);
  };

  const toggleDeafenAudio = () => {
    if (!voiceManagerRef.current) return;
    voiceManagerRef.current.resumeAllAudio();
    const deaf = voiceManagerRef.current.toggleDeafen();
    setIsDeafened(deaf);
  };

  const handleTestSpeakers = async () => {
    if (!voiceManagerRef.current) return;
    const ok = await voiceManagerRef.current.testSpeakers();
    if (ok) {
      setSpeakerTested(true);
      setTimeout(() => setSpeakerTested(false), 2500);
    }
  };

  // Reglas oficiales de La Tumba y Obligado 2 vs 2 (10 segundos de análisis y confirmación)
  const checkTumbaOnNewHand = (starterPlayer: number) => {
    const pT1 = pointsTeam1Ref.current;
    const pT2 = pointsTeam2Ref.current;
    const team1InTumba = pT1 >= 9 || (isTumbaDeParaAtrasT1Ref.current && pT1 === 8);
    const team2InTumba = pT2 >= 9 || (isTumbaDeParaAtrasT2Ref.current && pT2 === 8);
    const isObligado = team1InTumba && team2InTumba;

    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    const myTeamInTumba = myTeam === 1 ? team1InTumba : team2InTumba;
    const oppTeamInTumba = myTeam === 1 ? team2InTumba : team1InTumba;

    if (isObligado) {
      setIsWaitingOppTumba(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);
      triggerAnnouncement({
        type: 'tumba',
        title: '¡ESTADO OBLIGADO!',
        subtitle: '¡Mano definitiva! Quien gane 2 de 3 bazas gana el juego',
        badge: 'ÚLTIMA MANO'
      }, 3500);
      playVoiceAudio('obligado', "¡Obligado! Quien gane esta mano gana la partida");
      vibrateDevice('tumba');
      playSynthSound('tumba');
    } else if (myTeamInTumba) {
      setIsWaitingOppTumba(false);
      isProcessingMoveRef.current = true;
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

          let tumbaTimerInterval2v2: any;
          Swal.fire({
            title: "¿Deseas jugar esta ronda en TUMBA?",
            html: `
              <p style="font-size: 13px; color: #fde68a; margin-bottom: 8px;">
                Si aceptas y pierdes, se le restarán 3 piedras a tu equipo. Si rechazas, se te resta 1 piedra y se le suma al contrario.
              </p>
              <div style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; padding: 6px; font-size: 12px; color: #fca5a5; font-weight: bold;">
                Auto-ingreso a la mano en: <strong id="tumba-swal-timer-2v2" style="color: #ef4444; font-size: 14px;">3</strong>s
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
            background: "#1a0e06",
            color: "#fff",
            didOpen: () => {
              const timerEl = document.getElementById("tumba-swal-timer-2v2");
              tumbaTimerInterval2v2 = setInterval(() => {
                if (timerEl) {
                  const left = Math.ceil((Swal.getTimerLeft() || 0) / 1000);
                  timerEl.textContent = left.toString();
                }
              }, 100);
            },
            willClose: () => {
              if (tumbaTimerInterval2v2) clearInterval(tumbaTimerInterval2v2);
            }
          }).then(async (result) => {
            const autoAcceptedByTimer = result.dismiss === Swal.DismissReason.timer;
            if (result.isConfirmed || autoAcceptedByTimer) {
              triggerAnnouncement({
                type: 'tumba',
                title: '¡A JUGAR EN TUMBA!',
                subtitle: autoAcceptedByTimer ? 'Auto-ingreso a la mano por tiempo' : 'Tu equipo aceptó jugar esta mano',
                badge: 'MANO DE TUMBA'
              }, 2000);
              isProcessingMoveRef.current = false;
              setIsProcessingMove(false);
              setTimeLeft(30);
              if (connection) {
                try {
                  await connection.invoke("AcceptTumba2v2", roomName, mySeatIndexRef.current);
                } catch (e) {
                  console.error("Error al enviar AcceptTumba2v2:", e);
                }
              }
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              isProcessingMoveRef.current = false;
              setIsProcessingMove(false);
              setIsWaitingOppTumba(false);
              playVoiceAudio('pasaste_en_tumba', "Pasaron en Tumba. Menos una piedra.");
              vibrateDevice('reject');
              playSynthSound('reject');
              if (connection) {
                try {
                  await connection.invoke("PassTumba2v2", roomName, mySeatIndexRef.current);
                } catch (e) {
                  console.error("Error al enviar PassTumba2v2:", e);
                }
              }
            }
          });
        }
      }, 1000);
    } else if (oppTeamInTumba) {
      triggerAnnouncement({
        type: 'tumba',
        title: '¡LOS RIVALES ESTÁN EN TUMBA!',
        subtitle: 'Tus contrincantes están analizando sus cartas (10s)...',
        badge: 'Rivales en Tumba'
      }, 3500);
      playVoiceAudio('estas_en_tumba', "¡Los rivales están en tumba!");
      vibrateDevice('tumba');
      playSynthSound('tumba');
      setIsWaitingOppTumba(true);
      isProcessingMoveRef.current = true;
      setIsProcessingMove(true);
      setTimeLeft(30);

      // Watchdog de seguridad: máximo 15 segundos esperando decisión de Tumba del equipo rival
      setTimeout(() => {
        setIsWaitingOppTumba(prev => {
          if (prev) {
            console.warn("[Watchdog Tumba 2v2] Tiempo agotado esperando a los rivales (15s). Desbloqueando mesa...");
            setTimeLeft(30);
            isProcessingMoveRef.current = false;
            setIsProcessingMove(false);
            return false;
          }
          return false;
        });
      }, 15000);
    } else {
      setIsWaitingOppTumba(false);
      isProcessingMoveRef.current = false;
      setIsProcessingMove(false);
      const starterName = players[starterPlayer]?.name || 'Jugador';
      triggerAnnouncement({
        type: 'dame_tres',
        title: '¡NUEVA MANO!',
        subtitle: `Sale jugando: ${starterName}`,
        badge: 'MANO POR 1 PIEDRA'
      }, 2200);
    }
  };

  // Manejar el inicio formal de la partida
  const handleGameStarted = (data: any) => {
    setIsWaitingNextHand(false);
    isWaitingNextHandRef.current = false;
    setIsDealing(true);
    playCardDealSound();
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
    setIsStakePending(false);
    isStakePendingRef.current = false;
    setLastStakeAskedBy(null);
    lastStakeAskedByRef.current = null;
    isProcessingMoveRef.current = false;
    setIsProcessingMove(false);

    setRoomState(prev => prev ? { ...prev, gameStarted: true, seats: data.seats || prev.seats } : ({ gameStarted: true, seats: data.seats || [] } as any));

    if (typeof data.pointsTeam1 === 'number' && typeof data.pointsTeam2 === 'number') {
      updatePoints(data.pointsTeam1, data.pointsTeam2, false);
    }

    let resolvedSeatIdx = mySeatIndexRef.current;
    if (Array.isArray(data.seats)) {
      const currentUser = userRef.current;
      const myName = currentUser?.name && currentUser.name !== 'nulo' ? currentUser.name : '';
      const myUserId = currentUser?.id?.toString() || (typeof window !== 'undefined' ? localStorage.getItem('pericon_guest_id') : '');
      const matchSeat = data.seats.find((s: any) =>
        (connection?.connectionId && s.connectionId === connection.connectionId) ||
        (myUserId && s.userId === myUserId) ||
        (myName && myName !== 'Jugador' && s.name === myName)
      );
      if (matchSeat) {
        resolvedSeatIdx = matchSeat.seatIndex;
        setMySeatIndex(resolvedSeatIdx);
        mySeatIndexRef.current = resolvedSeatIdx;
      }
    }

    const myIdx = resolvedSeatIdx >= 0 ? resolvedSeatIdx : 0;
    const { hand, life } = parseHandCards(data.initHand, myIdx);

    setMyCards(hand);
    setLifeCard(life);
    lifeCardRef.current = life;
    setSeatCardCounts({ 0: 3, 1: 3, 2: 3, 3: 3 });

    const starter = data.starterPlayer ?? 0;
    leadPlayerRef.current = starter;
    setCurrentTurn(starter);
    currentTurnRef.current = starter;

    if (Array.isArray(data.seats)) {
      setPlayers(prev => {
        const next = [...prev];
        data.seats.forEach((s: any) => {
          if (s.seatIndex >= 0 && s.seatIndex < 4) {
            next[s.seatIndex] = {
              name: s.name,
              team: s.team,
              role: s.role,
              avatarUrl: s.avatarUrl
            };
          }
        });
        return next;
      });
    }

    setTimeout(() => {
      setIsDealing(false);
      checkTumbaOnNewHand(starter);
    }, 1200);
  };

  // Manejar el reparto de una nueva mano
  const handleNewHandDealt = (data: any) => {
    setIsWaitingNextHand(false);
    isWaitingNextHandRef.current = false;
    setIsDealing(true);
    playCardDealSound();
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
    setIsStakePending(false);
    isStakePendingRef.current = false;
    setLastStakeAskedBy(null);
    lastStakeAskedByRef.current = null;
    isProcessingMoveRef.current = false;
    setIsProcessingMove(false);

    if (typeof data.pointsTeam1 === 'number' && typeof data.pointsTeam2 === 'number') {
      updatePoints(data.pointsTeam1, data.pointsTeam2, false);
    }
    if (typeof data.isTumbaDeParaAtrasTeam1 === 'boolean') {
      isTumbaDeParaAtrasT1Ref.current = data.isTumbaDeParaAtrasTeam1;
      setIsTumbaDeParaAtrasT1(data.isTumbaDeParaAtrasTeam1);
    }
    if (typeof data.isTumbaDeParaAtrasTeam2 === 'boolean') {
      isTumbaDeParaAtrasT2Ref.current = data.isTumbaDeParaAtrasTeam2;
      setIsTumbaDeParaAtrasT2(data.isTumbaDeParaAtrasTeam2);
    }

    const myIdx = mySeatIndexRef.current >= 0 ? mySeatIndexRef.current : 0;
    const { hand, life } = parseHandCards(data.initHand, myIdx);

    setMyCards(hand);
    setLifeCard(life);
    lifeCardRef.current = life;
    setSeatCardCounts({ 0: 3, 1: 3, 2: 3, 3: 3 });

    const starter = data.starterPlayer ?? 0;
    handStarterRef.current = starter;
    leadPlayerRef.current = starter;
    setCurrentTurn(starter);
    currentTurnRef.current = starter;

    setTimeout(() => {
      setIsDealing(false);
      checkTumbaOnNewHand(starter);
    }, 1200);
  };

  // Manejar reconexión a partida activa
  const handleGameReconnected = (data: any) => {
    setRoomState(prev => prev ? { ...prev, gameStarted: true } : null);

    // 1. Asignar mi propio asiento autoritativo según el servidor
    let myIdx = mySeatIndexRef.current >= 0 ? mySeatIndexRef.current : 0;
    if (typeof data.mySeatIndex === 'number') {
      myIdx = data.mySeatIndex;
      setMySeatIndex(myIdx);
      mySeatIndexRef.current = myIdx;
    }

    // 2. Actualizar lista de jugadores si viene en la reconexión
    if (Array.isArray(data.seats)) {
      setPlayers(prev => {
        const next = [...prev];
        data.seats.forEach((s: any) => {
          if (s.seatIndex >= 0 && s.seatIndex < 4) {
            next[s.seatIndex] = {
              name: s.name,
              team: s.team,
              role: s.role,
              avatarUrl: s.avatarUrl
            };
          }
        });
        return next;
      });
    }

    // 3. Descomprimir cartas de la mano para MI asiento real
    const { hand, life } = parseHandCards(data.initHand, myIdx);
    setLifeCard(life);
    lifeCardRef.current = life;

    // 4. Descontar TODAS las cartas ya jugadas en esta mano (bazas pasadas + baza actual)
    const allPlayedInHand: any[] = Array.isArray(data.handPlayedCards)
      ? data.handPlayedCards
      : (data.currentTrick || []);

    const myPlayedIds = allPlayedInHand
      .filter((t: any) => t.seatIndex === myIdx)
      .map((t: any) => t.cardId);

    const remainingCards = hand.filter(c => !myPlayedIds.includes(c.id));
    setMyCards(remainingCards);
    if (remainingCards.length === 0 && !(data.pointsTeam1 >= 10 || data.pointsTeam2 >= 10)) {
      setIsWaitingNextHand(true);
      isWaitingNextHandRef.current = true;
      setTimeout(() => {
        if (isWaitingNextHandRef.current && connection) {
          console.warn('[Watchdog 2v2 Reconnect] 3s sin cartas. Solicitando RequestNewHand2v2...');
          connection.invoke('RequestNewHand2v2', roomName).catch(err => {
            console.error('[Watchdog 2v2 invoke error]:', err);
          });
        }
      }, 3000);
    } else {
      setIsWaitingNextHand(false);
      isWaitingNextHandRef.current = false;
    }

    // 5. Calcular conteo exacto de cartas de cada jugador (0 a 3)
    const counts: { [seat: number]: number } = { 0: 3, 1: 3, 2: 3, 3: 3 };
    for (let s = 0; s < 4; s++) {
      const countPlayed = allPlayedInHand.filter((t: any) => t.seatIndex === s).length;
      counts[s] = Math.max(0, 3 - countPlayed);
    }
    setSeatCardCounts(counts);

    // 6. Restaurar la baza actual en curso sobre la mesa
    if (data.currentTrick && Array.isArray(data.currentTrick)) {
      const parsedTrick: PlayedCard[] = data.currentTrick.map((t: any) => ({
        playerIndex: t.seatIndex,
        card: Baraja(t.cardId, 0)
      }));
      playedCardsRef.current = parsedTrick;
      setPlayedCards(parsedTrick);
    } else {
      playedCardsRef.current = [];
      setPlayedCards([]);
    }

    // 7. Puntos, bazas y turno
    setPointsTeam1(data.pointsTeam1);
    setPointsTeam2(data.pointsTeam2);
    pointsTeam1Ref.current = data.pointsTeam1;
    pointsTeam2Ref.current = data.pointsTeam2;

    setTricksTeam1(data.tricksTeam1);
    setTricksTeam2(data.tricksTeam2);
    tricksTeam1Ref.current = data.tricksTeam1;
    tricksTeam2Ref.current = data.tricksTeam2;

    setCurrentStake(data.currentStake || 1);
    currentStakeRef.current = data.currentStake || 1;

    setCurrentTurn(data.currentTurn);
    currentTurnRef.current = data.currentTurn;
    leadPlayerRef.current = data.starterPlayer ?? 0;
    handStarterRef.current = data.starterPlayer ?? 0;

    setDisconnectedNotice(null);
    isProcessingMoveRef.current = false;
    setIsProcessingMove(false);

    // 8. Restaurar estado de apuesta pendiente si la había
    if (data.pendingStake && data.pendingStake > 0) {
      setIsStakePending(true);
      isStakePendingRef.current = true;
      setLastStakeAskedBy(data.stakeAskerTeam);
      lastStakeAskedByRef.current = data.stakeAskerTeam;

      const myTeam = (myIdx === 0 || myIdx === 2) ? 1 : 2;
      if (data.stakeAskerTeam !== myTeam) {
        handleRemoteStakeAsked(data.stakeAskerSeat, data.pendingStake);
      }
    } else {
      setIsStakePending(false);
      isStakePendingRef.current = false;
    }

    triggerAnnouncement({
      type: 'win_round',
      title: '¡RECONEXIÓN EXITOSA!',
      subtitle: 'Partida restaurada exactamente donde quedó',
      badge: 'CONTINÚA EL JUEGO'
    }, 2500);
  };

  // Lanzar carta del jugador humano local
  const handlePlayMyCard = (card: Card) => {
    if (currentTurnRef.current !== mySeatIndexRef.current || isProcessingMoveRef.current || isCleaningTable || isWaitingOppTumba || tumbaCountdown !== null || isStakePendingRef.current) return;

    // Regla del Pelao: Si salieron con un triunfo y poseemos triunfos en la mano, obligatorio tirar triunfo (salvo excepción del 5 de Oro en 1ra baza)
    if (playedCardsRef.current.length > 0) {
      const leadCardId = playedCardsRef.current[0].card.id;
      const lifeId = lifeCardRef.current.id;
      const isLeadTrump = isTrumpCard(leadCardId, lifeId);
      const playerHasTrump = myCards.some(c => isTrumpCard(c.id, lifeId));
      const isSelectedTrump = isTrumpCard(card.id, lifeId);
      const isFirstBaza = myCards.length === 3;
      const hasCincoDeOro = myCards.some(c => c.id === 4);
      const trumpsCount = myCards.filter(c => isTrumpCard(c.id, lifeId)).length;
      const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;

      if (isLeadTrump && playerHasTrump && !canDenyCinco && !isSelectedTrump) {
        playVoiceAudio('regla_del_pelao', "¡Regla del Pelao! Debes lanzar un triunfo.");
        vibrateDevice('reject');
        playSynthSound('reject');
        Swal.fire({
          title: "¡REGLA DEL PELAO!",
          text: "Salieron con un triunfo en esta baza. ¡Estás obligado a tirar un triunfo de tu mano!",
          icon: "warning",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#f59e0b",
          background: "#1a0e06",
          color: "#fff"
        });
        return;
      }
    }

    isProcessingMoveRef.current = true;
    setIsProcessingMove(true);
    playCardDropSound();

    if (connection) {
      connection.invoke('PlayCard2v2', roomName, mySeatIndexRef.current, card.id).catch((err) => {
        console.error('Error al enviar carta:', err);
        isProcessingMoveRef.current = false;
        setIsProcessingMove(false);
      });
    }
  };

  // Auto-juego cuando se agotan los 30s del turno
  const handleTurnTimeout = () => {
    if (currentTurnRef.current !== mySeatIndexRef.current || isProcessingMoveRef.current || isCleaningTable || isWaitingOppTumba || tumbaCountdown !== null || isStakePendingRef.current) return;
    if (myCards.length === 0) return;

    let chosenCard = myCards[0];
    if (playedCardsRef.current.length > 0) {
      const leadCardId = playedCardsRef.current[0].card.id;
      const lifeId = lifeCardRef.current.id;
      const isLeadTrump = isTrumpCard(leadCardId, lifeId);
      const playerHasTrump = myCards.some(c => isTrumpCard(c.id, lifeId));
      const isFirstBaza = myCards.length === 3;
      const hasCincoDeOro = myCards.some(c => c.id === 4);
      const trumpsCount = myCards.filter(c => isTrumpCard(c.id, lifeId)).length;
      const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;

      if (isLeadTrump && playerHasTrump && !canDenyCinco) {
        const trump = myCards.find(c => isTrumpCard(c.id, lifeId));
        if (trump) chosenCard = trump;
      }
    }
    handlePlayMyCard(chosenCard);
  };
  handleTurnTimeoutRef.current = handleTurnTimeout;

  // Procesar carta recibida desde SignalR (para ti y para los otros 3 jugadores)
  const handleRemoteCardPlayed = (seatIndex: number, cardId: number) => {
    const card = Baraja(cardId, 0);
    playCardDropSound();
    playCardSound();

    if (seatIndex === mySeatIndexRef.current) {
      vibrateDevice('pedir');
      setMyCards(prev => prev.filter(c => c.id !== cardId));
    }
    setSeatCardCounts(prev => ({
      ...prev,
      [seatIndex]: Math.max(0, (prev[seatIndex] ?? 3) - 1)
    }));

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
      // Se completaron las 4 cartas en la mesa: resolución local con lifeCardRef
      finishTrick(playedCardsRef.current);
    }
  };

  // Manejar resolución autoritativa de la baza enviada por el servidor
  const handleServerTrickFinished = (res: any) => {
    setTricksTeam1(res.tricksTeam1);
    setTricksTeam2(res.tricksTeam2);
    tricksTeam1Ref.current = res.tricksTeam1;
    tricksTeam2Ref.current = res.tricksTeam2;
  };

  // Evaluar baza completa de 4 cartas
  const finishTrick = (fourCards: PlayedCard[]) => {
    isProcessingMoveRef.current = true;
    setIsProcessingMove(true);

    const leadCardId = fourCards[0].card.id;
    let winningItem = fourCards[0];
    const currentLifeId = lifeCardRef.current.id;

    for (let i = 1; i < fourCards.length; i++) {
      const bestId = winningItem.card.id;
      const candId = fourCards[i].card.id;
      if (doesCandidateBeatBest(bestId, candId, leadCardId, currentLifeId)) {
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

    // ---------------------------------------------------------
    // DETECCIÓN DE LA COGÍA (10 DE ORO MATADO CON 1 DE ORO)
    // En tumba la cogía NO vale (no aplica en fase de tumba)
    // ---------------------------------------------------------
    const isAnyTumba = (pointsTeam1Ref.current >= 9 || (isTumbaDeParaAtrasT1Ref.current && pointsTeam1Ref.current === 8)) ||
                       (pointsTeam2Ref.current >= 9 || (isTumbaDeParaAtrasT2Ref.current && pointsTeam2Ref.current === 8));

    const hasTenGold = fourCards.some(p => p.card.id === 7);
    const hasOneGold = fourCards.some(p => p.card.id === 0);

    if (!isAnyTumba && hasTenGold && hasOneGold) {
      const tenGoldIdx = fourCards.findIndex(p => p.card.id === 7);
      const oneGoldIdx = fourCards.findIndex(p => p.card.id === 0);

      // La Cogía ocurre cuando se juegan el 10 de Oro y el 1 de Oro entre equipos contrarios
      const tenGoldPlayer = fourCards[tenGoldIdx].playerIndex;
      const oneGoldPlayer = fourCards[oneGoldIdx].playerIndex;
      const tenGoldTeam = (tenGoldPlayer === 0 || tenGoldPlayer === 2) ? 1 : 2;
      const oneGoldTeam = (oneGoldPlayer === 0 || oneGoldPlayer === 2) ? 1 : 2;

      if (tenGoldTeam !== oneGoldTeam) {
        const isMyTeamCogia = oneGoldTeam === myTeam;
        if (oneGoldTeam === 1) {
          const newT1 = pointsTeam1Ref.current + 3;
          updatePoints(newT1, pointsTeam2Ref.current);
          if (isMyTeamCogia) {
            playVoiceAudio('la_cogia_propia', "¡La Cogía con el As de Oro!");
            vibrateDevice('winMatch');
            playSynthSound('win');
          } else {
            playVoiceAudio('la_cogia_rival', "¡La Cogía para los rivales!");
          }
          triggerAnnouncement({
            type: 'la_cogia',
            title: isMyTeamCogia ? '¡LA COGÍA!' : '¡LA COGÍA RIVAL!',
            subtitle: isMyTeamCogia ? '¡Cobrada La Cogía con el As de Oro!' : '¡Los rivales cobraron La Cogía con el As de Oro!',
            badge: '+3 piedras automáticas'
          }, 3500);
        } else {
          const newT2 = pointsTeam2Ref.current + 3;
          updatePoints(pointsTeam1Ref.current, newT2);
          if (isMyTeamCogia) {
            playVoiceAudio('la_cogia_propia', "¡La Cogía con el As de Oro!");
            vibrateDevice('winMatch');
            playSynthSound('win');
          } else {
            playVoiceAudio('la_cogia_rival', "¡La Cogía para los rivales!");
          }
          triggerAnnouncement({
            type: 'la_cogia',
            title: isMyTeamCogia ? '¡LA COGÍA!' : '¡LA COGÍA RIVAL!',
            subtitle: isMyTeamCogia ? '¡Cobrada La Cogía con el As de Oro!' : '¡Los rivales cobraron La Cogía con el As de Oro!',
            badge: '+3 piedras automáticas'
          }, 3500);
        }
      }
    }

    // Pausa ampliada: 4.2 segundos en baza final de la mano (o 3.2s en bazas intermedias)
    const isHandConcluding = (newTricksT1 >= 2 || newTricksT2 >= 2 || (newTricksT1 + newTricksT2 >= 3));
    const pauseMs2v2 = isHandConcluding ? 4200 : 3200;

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
    }, pauseMs2v2);
  };

  // Resolver la mano y pausar para la siguiente mano repartida por el servidor
  const resolveHandWinner = (t1Tricks: number, t2Tricks: number) => {
    isProcessingMoveRef.current = true;
    setIsProcessingMove(true);
    setIsWaitingNextHand(true);
    isWaitingNextHandRef.current = true;

    // Perro guardián (Watchdog Fallback): si tras 5.5s no ha llegado NewHandDealt2v2, solicitar forzar reparto
    setTimeout(() => {
      if (isWaitingNextHandRef.current && connection) {
        console.warn('[Watchdog 2v2] 5.5s sin NewHandDealt2v2. Solicitando RequestNewHand2v2...');
        connection.invoke('RequestNewHand2v2', roomName).catch((err: any) => {
          console.error('[Watchdog 2v2 invoke error]:', err);
        });
      }
    }, 5500);

    const handWinningTeam = t1Tricks > t2Tricks ? 1 : 2;
    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    const addedStones = currentStakeRef.current;

    const oldT1 = pointsTeam1Ref.current;
    const oldT2 = pointsTeam2Ref.current;
    const wasInTumba = (oldT1 >= 9 || (isTumbaDeParaAtrasT1Ref.current && oldT1 === 8)) ||
                       (oldT2 >= 9 || (isTumbaDeParaAtrasT2Ref.current && oldT2 === 8));

    if (!wasInTumba) {
      if (handWinningTeam === myTeam) {
        triggerAnnouncement({
          type: 'win_round',
          title: '¡MANO GANADA!',
          subtitle: `Tu equipo suma +${addedStones} piedra(s)`,
          badge: 'MANO FINALIZADA'
        }, 3000);
        playVoiceAudio('ganaron_la_mano', `¡Ganan la mano! Suman ${addedStones} piedras.`);
      } else {
        triggerAnnouncement({
          type: 'opp_win_round',
          title: 'MANO PERDIDA',
          subtitle: `Los rivales suman +${addedStones} piedra(s)`,
          badge: 'MANO FINALIZADA'
        }, 3000);
        playVoiceAudio('punto_para_rivales', `Punto para los rivales.`);
      }
    }
  };

  // Fin de la partida
  const handleGameOver = (isPlayerTeamWinner: boolean) => {
    // 1. CASO SALA AMISTOSA CREADA:
    // Tarifa de 10 monedas por entrar/jugar (para la casa). El ganador no se gana nada de pozo de monedas.
    if (isFriendlyRoom) {
      const roomFee = 10;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
      let currentUserId = user?.id ? parseInt(user.id.toString(), 10) : 0;
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

      const currentCoins = user?.coins ?? storedUser?.coins ?? 1000;
      const estimatedNewCoins = Math.max(0, currentCoins - roomFee);

      dispatch(setGamePlayer({
        ...user,
        coins: estimatedNewCoins,
        wins: isPlayerTeamWinner ? (user?.wins || 0) + 1 : (user?.wins || 0),
        losses: !isPlayerTeamWinner ? (user?.losses || 0) + 1 : (user?.losses || 0)
      }));

      if (currentUserId > 0) {
        fetch(`${apiUrl}/api/user/record-match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            won: isPlayerTeamWinner,
            coinsChange: -roomFee
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
        .catch(err => console.error("Error al registrar amistoso 2v2:", err));
      } else if (typeof window !== 'undefined' && storedUser) {
        storedUser.coins = estimatedNewCoins;
        if (isPlayerTeamWinner) storedUser.wins = (storedUser.wins || 0) + 1;
        else storedUser.losses = (storedUser.losses || 0) + 1;
        localStorage.setItem("pericon_user", JSON.stringify(storedUser));
      }

      if (isPlayerTeamWinner) {
        vibrateDevice('winMatch');
        playSynthSound('win');
        playVoiceAudio('victoria_partida', '¡Felicidades! Tu equipo ha ganado la partida.');

        setTimeout(() => {
          Swal.fire({
            title: '🏆 ¡VICTORIA AMISTOSA!',
            html: `
              <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
                <p style="margin-bottom: 12px; font-weight: bold; color: #4ade80; font-size: 15px; text-align: center;">
                  ¡Tu equipo dominó el encuentro amistoso!
                </p>
                <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(56,189,248,0.3);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #cbd5e1;">🎮 Modalidad:</span>
                    <span style="font-weight: bold; color: #38bdf8;">Sala Amistosa 2 vs 2</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #cbd5e1;">🏛️ Tarifa de sala (para la casa):</span>
                    <span style="font-weight: bold; color: #fb923c;">10 monedas</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #cbd5e1;">🏅 Récord personal:</span>
                    <span style="font-weight: bold; color: #4ade80;">+1 Victoria sumada</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #cbd5e1;">💰 Pozo de apuestas:</span>
                    <span style="color: #94a3b8; font-style: italic;">Sin apuestas (Amistoso)</span>
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
            router.push('/desk');
          });
        }, 3200);
      } else {
        playVoiceAudio('derrota_partida', 'Partida terminada. Los rivales se llevaron la victoria.');
        setTimeout(() => {
          Swal.fire({
            title: 'PARTIDA AMISTOSA FINALIZADA',
            html: `
              <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
                <p style="margin-bottom: 12px; font-weight: bold; color: #cbd5e1; font-size: 14px; text-align: center;">
                  Los rivales completaron la partida amistosa.
                </p>
                <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(255,255,255,0.15);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #cbd5e1;">🏛️ Tarifa de sala (para la casa):</span>
                    <span style="font-weight: bold; color: #fb923c;">10 monedas</span>
                  </div>
                  <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 8px 0;" />
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="font-weight: bold; color: #fff;">👛 Tu nuevo saldo:</span>
                    <span style="font-weight: 900; color: #fde047;">${estimatedNewCoins} monedas</span>
                  </div>
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'Volver al Menú',
            confirmButtonColor: '#d97706',
            background: '#1a0e06',
            color: '#fff',
          }).then(() => {
            router.push('/desk');
          });
        }, 3200);
      }
      return;
    }

    // 2. CASO 2 VS 2 COMPETITIVO (SIN CREAR SALA / EMPAREJAMIENTO AUTOMÁTICO):
    const totalPot = betAmount * 4;
    const houseCommission = Math.floor(totalPot * 0.20);
    const teamPrize = totalPot - houseCommission;
    const myShare = Math.floor(teamPrize / 2);
    const netCoinsChange = isPlayerTeamWinner ? (myShare - betAmount) : -betAmount;

    // Obtener el ID del usuario actual
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
    let currentUserId = user?.id ? parseInt(user.id.toString(), 10) : 0;
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

    const currentCoins = user?.coins ?? storedUser?.coins ?? 1000;
    const estimatedNewCoins = Math.max(0, currentCoins + netCoinsChange);

    // Actualizar Redux
    dispatch(setGamePlayer({
      ...user,
      coins: estimatedNewCoins,
      wins: isPlayerTeamWinner ? (user?.wins || 0) + 1 : (user?.wins || 0),
      losses: !isPlayerTeamWinner ? (user?.losses || 0) + 1 : (user?.losses || 0)
    }));

    // Registrar resultado en la Base de Datos en Supabase
    if (currentUserId > 0) {
      fetch(`${apiUrl}/api/user/record-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          won: isPlayerTeamWinner,
          coinsChange: netCoinsChange
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
      .catch(err => console.error("Error al registrar partida 2v2 en base de datos:", err));
    } else if (typeof window !== 'undefined' && storedUser) {
      storedUser.coins = estimatedNewCoins;
      if (isPlayerTeamWinner) storedUser.wins = (storedUser.wins || 0) + 1;
      else storedUser.losses = (storedUser.losses || 0) + 1;
      localStorage.setItem("pericon_user", JSON.stringify(storedUser));
    }

    if (isPlayerTeamWinner) {
      vibrateDevice('winMatch');
      playSynthSound('win');
      playCoinWinSound();
      playVoiceAudio('victoria_partida', '¡Felicidades! Tu equipo ha ganado la partida.');

      Swal.fire({
        title: '🏆 ¡VICTORIA EN EQUIPO!',
        html: `
          <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
            <p style="margin-bottom: 12px; font-weight: bold; color: #4ade80; font-size: 15px; text-align: center;">
              ¡Tu equipo dominó la mesa de 2 vs 2!
            </p>
            <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(250,204,21,0.25);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🪙 Apuesta individual:</span>
                <span style="font-weight: bold; color: #facc15;">${betAmount} monedas</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">💰 Pozo total de la mesa (4 jug.):</span>
                <span style="font-weight: bold; color: #facc15;">${totalPot} monedas</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🏛️ Comisión de sala (20%):</span>
                <span style="font-weight: bold; color: #fb923c;">-${houseCommission} monedas</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">👥 Premio al equipo ganador:</span>
                <span style="font-weight: bold; color: #38bdf8;">${teamPrize} monedas</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🪙 Tu parte individual (50%):</span>
                <span style="font-weight: bold; color: #4ade80;">+${myShare} monedas</span>
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
        router.push('/desk');
      });
    } else {
      playVoiceAudio('derrota_partida', 'Partida terminada. Los rivales se llevaron la victoria.');
      Swal.fire({
        title: '💔 PARTIDA FINALIZADA',
        html: `
          <div style="font-family: inherit; font-size: 13px; text-align: left; padding: 4px 0;">
            <p style="margin-bottom: 12px; font-weight: bold; color: #f87171; font-size: 15px; text-align: center;">
              Los rivales alcanzaron los 10 puntos.
            </p>
            <div style="background: rgba(0,0,0,0.45); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(239,68,68,0.3);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #cbd5e1;">🪙 Apuesta perdida:</span>
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
        router.push('/desk');
      });
    }
  };

  // Mecánica de PEDIR (3, 6, 9) sincronizada en vivo
  const handlePedirClick = () => {
    if (isProcessingMoveRef.current || isCleaningTable || isStakePendingRef.current) return;

    // Si algún equipo está en Tumba, Pedir no está permitido
    const isTumba = (pointsTeam1Ref.current >= 9 || (isTumbaDeParaAtrasT1Ref.current && pointsTeam1Ref.current === 8)) ||
                    (pointsTeam2Ref.current >= 9 || (isTumbaDeParaAtrasT2Ref.current && pointsTeam2Ref.current === 8));
    if (isTumba) {
      playVoiceAudio('en_tumba_no_se_pide', "En tumba no se puede pedir.");
      vibrateDevice('reject');
      Swal.fire({
        title: "¡ESTADO DE TUMBA!",
        text: "En Tumba no está permitido pedir.",
        icon: "warning",
        confirmButtonColor: "#d97706",
        background: "#1a0e06",
        color: "#fff"
      });
      return;
    }

    const current = currentStakeRef.current;
    const nextStake = current === 1 ? 3 : (current === 3 ? 6 : 9);

    if (current >= 9) return;

    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    if (lastStakeAskedByRef.current === myTeam && current > 1) {
      playVoiceAudio('ultimo_aumento_tuyo', "Tu equipo cantó el último aumento.");
      Swal.fire({
        title: "¡TURNO DEL RIVAL!",
        text: "Tu equipo cantó el último aumento. Deben esperar a que los rivales propongan el siguiente cante.",
        icon: "info",
        confirmButtonColor: "#3b82f6",
        background: "#1a0e06",
        color: "#fff"
      });
      return;
    }

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
      if (result.isConfirmed && connection && !isStakePendingRef.current) {
        connection.invoke('PedirStake2v2', roomName, mySeatIndexRef.current, nextStake).catch(err => {
          console.error('Error al pedir cante:', err);
          reportAppError({
            source: 'Game2v2',
            errorMessage: `Error al pedir aumento (${nextStake}): ${err?.message || err}`,
            roomName,
            username: user?.name,
            userId: user?.id,
            extraData: { nextStake, mySeatIndex: mySeatIndexRef.current }
          });
        });
      }
    });
  };

  const handleRemoteStakeAsked = (askerSeat: number, nextStake: number) => {
    const askerTeam = (askerSeat === 0 || askerSeat === 2) ? 1 : 2;
    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;
    const askerName = players[askerSeat]?.name || 'Un jugador';

    setIsStakePending(true);
    isStakePendingRef.current = true;
    setLastStakeAskedBy(askerTeam);
    lastStakeAskedByRef.current = askerTeam;

    if (askerTeam === myTeam) {
      Swal.close();
      triggerAnnouncement({
        type: nextStake === 3 ? 'dame_tres' : (nextStake === 6 ? 'quiero_seis' : 'van_nueve'),
        title: `¡TU EQUIPO PIDE ${nextStake}!`,
        subtitle: 'Esperando respuesta de los rivales...',
        badge: `CANTE POR ${nextStake}`
      }, 2500);
      const audioKey = nextStake === 3 ? 'pedimos_tres' : (nextStake === 6 ? 'pedimos_seis' : 'pedimos_nueve');
      const phrase = nextStake === 3 ? "¡Pedimos tres!" : (nextStake === 6 ? "¡Pedimos seis!" : "¡Pedimos nueve!");
      playVoiceAudio(audioKey, phrase);
    } else {
      // Los rivales pidieron: Mostrar modal interactivo para responder
      Swal.close();
      playSynthSound('canto');
      const audioKey = nextStake === 3 ? 'dame_tres' : (nextStake === 6 ? 'quiero_seis' : 'van_nueve');
      const phrase = nextStake === 3 ? "¡Dame tres!" : (nextStake === 6 ? "¡Quiero seis!" : "¡Van nueve!");
      playVoiceAudio(audioKey, phrase);
      Swal.fire({
        title: `¡${askerName.toUpperCase()} PIDE ${nextStake}!`,
        text: `El equipo rival propone jugar por ${nextStake} piedras. ¿Aceptan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '¡QUIERO! (Aceptar)',
        cancelButtonText: 'NO QUIERO (Rechazar)',
        confirmButtonColor: '#22c55e',
        cancelButtonColor: '#ef4444',
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: '#1a0e06',
        color: '#fff',
      }).then((res) => {
        if (connection && isStakePendingRef.current) {
          if (res.isConfirmed) {
            playVoiceAudio('acepto', "¡Acepto!");
            connection.invoke('AnswerStake2v2', roomName, mySeatIndexRef.current, true).catch(err => {
              console.error(err);
              reportAppError({
                source: 'Game2v2',
                errorMessage: `Error al responder cante (Aceptar): ${err?.message || err}`,
                roomName,
                username: user?.name,
                userId: user?.id
              });
            });
          } else if (res.dismiss === Swal.DismissReason.cancel) {
            playVoiceAudio('no_quiero', "¡No quiero!");
            connection.invoke('AnswerStake2v2', roomName, mySeatIndexRef.current, false).catch(err => {
              console.error(err);
              reportAppError({
                source: 'Game2v2',
                errorMessage: `Error al responder cante (Rechazar): ${err?.message || err}`,
                roomName,
                username: user?.name,
                userId: user?.id
              });
            });
          }
        }
      });
    }
  };

  const handleRemoteStakeAnswered = (data: any) => {
    // Cerrar inmediatamente cualquier popup en pantalla (en ambos compañeros)
    Swal.close();
    setIsStakePending(false);
    isStakePendingRef.current = false;

    const accepted = !!data.accepted;
    const current = Number(data.currentStake || currentStakeRef.current);
    const myTeam = (mySeatIndexRef.current === 0 || mySeatIndexRef.current === 2) ? 1 : 2;

    if (accepted) {
      setCurrentStake(current);
      currentStakeRef.current = current;
      triggerAnnouncement({
        type: 'win_round',
        title: '¡ACEPTADO!',
        subtitle: `Ahora se juega por ${current} piedras`,
        badge: `APUESTA: ${current} PIEDRAS`
      }, 2500);
      playVoiceAudio('dijeron_quiero', `¡Dijeron quiero! Jugamos por ${current} piedras.`);
      playSynthSound('canto');
    } else {
      const challengerTeam = Number(data.challengerTeam || lastStakeAskedByRef.current || 1);
      const reward = Number(data.reward || (current === 3 ? 1 : (current === 6 ? 3 : 6)));

      // Puntos autoritativos calculados por el servidor
      const newT1 = typeof data.pointsTeam1 === 'number' ? data.pointsTeam1 : pointsTeam1Ref.current;
      const newT2 = typeof data.pointsTeam2 === 'number' ? data.pointsTeam2 : pointsTeam2Ref.current;
      updatePoints(newT1, newT2, false);

      triggerAnnouncement({
        type: challengerTeam === myTeam ? 'win_round' : 'opp_win_round',
        title: '¡NO QUIERO!',
        subtitle: challengerTeam === myTeam 
          ? `El rival no quiso. Tu equipo suma +${reward} piedra(s)`
          : `Tu equipo no quiso. Los rivales suman +${reward} piedra(s)`,
        badge: `+${reward} PIEDRAS`
      }, 3000);
      if (challengerTeam === myTeam) {
        playVoiceAudio('no_quisieron', `¡No quisieron! Sumamos ${reward} piedras.`);
      } else {
        playVoiceAudio('no_quisimos', "No quisimos. Piedra para los rivales.");
      }

      // Bloquear cualquier jugada de cartas hasta que se reparta la nueva mano
      isProcessingMoveRef.current = true;
      setIsProcessingMove(true);
      setIsWaitingNextHand(true);
      isWaitingNextHandRef.current = true;
      playedCardsRef.current = [];
      setPlayedCards([]);
      setTrickResult(null);
      setCurrentStake(1);
      currentStakeRef.current = 1;
      setLastStakeAskedBy(null);
      lastStakeAskedByRef.current = null;

      // Watchdog fallback
      setTimeout(() => {
        if (isWaitingNextHandRef.current && connection) {
          console.warn('[Watchdog 2v2 Stake] 5.5s sin NewHandDealt2v2. Solicitando RequestNewHand2v2...');
          connection.invoke('RequestNewHand2v2', roomName).catch((err: any) => {
            console.error('[Watchdog 2v2 invoke error]:', err);
          });
        }
      }, 5500);

      if (data.isGameOver) {
        setTimeout(() => {
          handleGameOver((data.winningTeamOfMatch ? data.winningTeamOfMatch === myTeam : challengerTeam === myTeam));
        }, 3000);
      } else {
        // El anfitrión o el jugador activo con menor índice solicita repartir la nueva mano
        const activeSeats = roomState?.seats?.filter(s => s.isConnected)?.map(s => s.seatIndex) || [0];
        const lowestActiveSeat = activeSeats.length > 0 ? Math.min(...activeSeats) : 0;
        if (mySeatIndexRef.current === lowestActiveSeat && connection) {
          setTimeout(() => {
            const nextStarter = (handStarterRef.current + 1) % 4;
            connection.invoke('DealNewHand2v2', roomName, nextStarter).catch(err => {
              console.error('Error al repartir nueva mano tras no quiero:', err);
            });
          }, 3000);
        }
      }
    }
  };

  // Copiar link de la sala limpio
  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const path = window.location.pathname;
    const cleanUrl = `${origin}${path}?bet=${betAmountRef.current}&friendly=1`;
    navigator.clipboard.writeText(cleanUrl).then(() => {
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

  // Compartir directamente por WhatsApp limpio
  const handleShareWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const path = window.location.pathname;
    const cleanUrl = `${origin}${path}?bet=${betAmountRef.current}&friendly=1`;
    const text = `¡Únete a mi mesa de Pericón 2 vs 2!\nEntra aquí para jugar conmigo: ${cleanUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Copiar enlace con puesto/rol específico asignado
  const handleCopySlotLink = (slotIndex: number, roleName: string) => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const path = window.location.pathname;
    const link = `${origin}${path}?bet=${betAmountRef.current}&friendly=1&slot=${slotIndex}`;

    navigator.clipboard.writeText(link).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `¡Link para ${roleName} copiado!`,
        text: `Pásale este enlace para que tome el puesto de ${roleName}.`,
        showConfirmButton: false,
        timer: 3500,
        background: '#1a0e06',
        color: '#fff'
      });
    });
  };

  // Compartir por WhatsApp con puesto/rol asignado
  const handleShareSlotWhatsApp = (slotIndex: number, roleName: string) => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const path = window.location.pathname;
    const link = `${origin}${path}?bet=${betAmountRef.current}&friendly=1&slot=${slotIndex}`;
    const text = `¡Únete a mi mesa de Pericón 2 vs 2 como mi ${roleName}!\nEntra directo aquí: ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Cambiar de asiento en la sala de espera
  const handleSwitchSeat = async (targetSeat: number) => {
    if (!connection) return;
    try {
      await connection.invoke('SwitchSeat2v2', roomName, targetSeat);
    } catch (err) {
      console.error('Error al cambiar de asiento:', err);
    }
  };

  const isMatchmaking = roomName.startsWith('match-') || searchParams.get('match') === 'auto';
  const isGameRunning = roomState?.gameStarted === true || myCards.length > 0;
  const connectedCount = roomState?.seats?.length || 0;

  return (
    <main className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-[#140a04] via-[#0b0502] to-[#040201] text-white flex flex-col relative overflow-hidden select-none">
      
      {/* 1. BARRA SUPERIOR (HEADER GAMER) */}
      <header className="w-full bg-black/80 backdrop-blur-md border-b border-amber-500/30 px-2 py-1.5 sm:px-6 sm:py-2 flex items-center justify-between z-30 shadow-lg shrink-0">
        {/* Izquierda: Logo y Código de sala */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/desk" className="flex items-center gap-1 hover:opacity-80 transition">
            <Image src="/logo.svg" alt="Pericón" width={110} height={32} className="w-16 sm:w-24 object-contain" />
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest bg-purple-900/60 border border-purple-500/50 text-purple-200 px-2 py-0.5 rounded-md">
            {isMatchmaking ? 'DUELO 2 VS 2' : 'SALA PRIVADA'}
          </span>
          <span className="hidden md:inline-block text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
            {roomName}
          </span>
        </div>

        {/* Temporizador 30s con indicador de turno oficial */}
        {myCards.length > 0 && (
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border backdrop-blur-md shadow-lg transition-all shrink-0 ${
            currentTurn === mySeatIndex
              ? (timeLeft <= 10
                  ? 'bg-red-950/90 border-red-500 ring-2 ring-red-500/60 animate-pulse'
                  : 'bg-emerald-950/90 border-emerald-500/60 ring-1 ring-emerald-400/40')
              : 'bg-stone-900/80 border-amber-900/40 opacity-90'
          }`}>
            <span className='text-xs sm:text-base'>⏱️</span>
            <div className='flex flex-col text-left'>
              <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider ${
                currentTurn === mySeatIndex ? (timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400') : 'text-amber-400/70'
              }`}>
                {currentTurn === mySeatIndex ? 'Tu turno' : `Turno: ${players[currentTurn]?.name?.slice(0, 8) || 'Jugador'}`}
              </span>
              <span className={`text-[10px] sm:text-sm font-extrabold font-mono leading-none ${
                currentTurn === mySeatIndex ? (timeLeft <= 10 ? 'text-red-300' : 'text-emerald-200') : 'text-stone-300'
              }`}>
                00:{timeLeft.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Centro: Marcador de Piedras 2 vs 2 Claro y Legible (100% Visible en Celular) */}
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1 sm:gap-2.5 bg-gradient-to-r from-blue-950/90 via-black/95 to-red-950/90 border-2 border-amber-500/60 px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl shadow-xl shadow-black/60">
            {/* Equipo 1 - Azul (Nosotros) */}
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400 shrink-0"></span>
              <span className="text-[9px] sm:text-xs font-black text-blue-200 uppercase hidden xs:inline">Azul</span>
              <span className="text-xs sm:text-sm font-black text-blue-300 bg-blue-900/70 px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-400/50 min-w-[20px] text-center">
                {pointsTeam1}
              </span>
            </div>

            {/* Separador Piedras */}
            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 border-x border-amber-500/30 text-center">
              <span className="text-xs sm:text-sm">🪨</span>
              <span className="text-[8px] sm:text-[10px] text-amber-300/80 font-bold uppercase hidden md:inline">Piedras</span>
            </div>

            {/* Equipo 2 - Rojo (Rivales) */}
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-black text-red-300 bg-red-900/70 px-1.5 sm:px-2 py-0.5 rounded-md border border-red-400/50 min-w-[20px] text-center">
                {pointsTeam2}
              </span>
              <span className="text-[9px] sm:text-xs font-black text-red-200 uppercase hidden xs:inline">Rojo</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-400 shrink-0"></span>
            </div>

            {/* Indicador de Tumba / Obligado */}
            {((pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8)) && (pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8))) ? (
              <span className="bg-red-600 text-white text-[7.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse ml-0.5">
                OBLIGADO
              </span>
            ) : ((pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8)) || (pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8))) ? (
              <span className="bg-amber-500 text-black text-[7.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce ml-0.5">
                TUMBA
              </span>
            ) : null}
          </div>
        </div>

        {/* Derecha: Controles de Voz, Pote, Compartir y Salir */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Controles de Voz WebRTC P2P */}
          {isVoiceSupported && (
            <div className="flex items-center gap-1 bg-black/60 border border-amber-500/40 p-0.5 sm:p-1 rounded-lg sm:rounded-xl shadow-inner">
              <button
                type="button"
                onClick={toggleVoiceMute}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center transition active:scale-95 ${
                  isMicMuted
                    ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40'
                    : 'bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                }`}
                title={isMicMuted ? 'Micrófono MUTEADO (Clic para activar)' : 'Micrófono ACTIVO (Clic para silenciar)'}
              >
                {isMicMuted ? <MicOff size={14} /> : <Mic size={14} className={speakingPeers[mySeatIndex] ? 'text-emerald-400 animate-pulse' : ''} />}
              </button>
              <button
                type="button"
                onClick={toggleDeafenAudio}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center transition active:scale-95 ${
                  isDeafened
                    ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40'
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-600/50'
                }`}
                title={isDeafened ? 'Audio de Sala ENSORDECIDO (Clic para escuchar)' : 'Escuchando la sala (Clic para ensordecer)'}
              >
                {isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          )}

          {!isMatchmaking && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-purple-950/80 hover:bg-purple-800 border border-purple-500/50 text-purple-200 flex items-center justify-center gap-1 text-xs font-bold transition active:scale-95 shadow"
              title="Copiar Link de la Sala"
            >
              {copiedLink ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">Invitar</span>
            </button>
          )}

          <div className="bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl flex items-center gap-1 shadow">
            <span className="text-[11px] sm:text-xs">🪙</span>
            <span className="text-[11px] sm:text-sm font-black text-amber-300">{betAmount * 4}</span>
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
                if (res.isConfirmed) {
                  if (connection) {
                    connection.invoke('LeaveRoom2v2', roomName).catch(() => {});
                  }
                  router.push('/desk');
                }
              });
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-red-950/80 hover:bg-red-700 border border-red-500/40 flex items-center justify-center text-white text-xs font-bold transition active:scale-95"
            title="Salir"
          >
            🚪
          </button>
        </div>
      </header>

      {/* ALERTA FLOTANTE DE DESCONEXIÓN */}
      {disconnectedNotice && (
        <div className="w-full bg-amber-500 text-black px-4 py-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg z-30 animate-pulse border-b border-amber-600">
          <span>⚠️ {disconnectedNotice}</span>
        </div>
      )}

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
                onClick={() => {
                  if (connection) {
                    connection.invoke('LeaveRoom2v2', roomName).catch(() => {});
                  }
                  router.push('/desk');
                }}
                className="text-xs text-red-400 hover:text-red-300 font-bold underline transition"
              >
                Cancelar y volver al escritorio
              </button>
            </div>
          ) : (
            /* Lobby de Espera para Sala Privada con Amigos */
            <div className="w-full max-w-lg bg-gradient-to-b from-[#221208] via-[#180c05] to-[#0d0602] border-2 border-amber-500/60 rounded-3xl p-3.5 sm:p-6 shadow-2xl text-center">
              
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

              {/* BARRA LIMPIA Y COMPACTA DE VOZ Y CORNETAS (ADAPTADA A CELULAR Y PC) */}
              <div className="bg-black/60 border border-amber-500/40 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 my-2.5 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-left">
                {/* Fila 1 en móvil / Lado izquierdo en PC: Estado del Micrófono y controles directos */}
                <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow shrink-0 ${
                      isMicMuted ? 'bg-red-950/80 border border-red-500/50 text-red-300' : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                    }`}>
                      {isMicMuted ? <MicOff size={15} /> : <Mic size={15} className={localVolume > 5 ? 'animate-bounce text-emerald-400' : ''} />}
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs sm:text-sm font-extrabold block text-white flex items-center gap-1.5">
                        <span>{isMicMuted ? 'Micrófono Silenciado' : 'Micrófono Activo'}</span>
                        {!isMicMuted && (
                          <span className={`w-2 h-2 rounded-full ${localVolume > 5 ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`}></span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {isMicMuted ? 'Toca Activar para hablar' : (localVolume > 5 ? 'Detectando tu voz...' : 'Listo para hablar')}
                      </span>
                    </div>
                  </div>

                  {/* En móvil: Botones rápidos a la derecha del título (Silenciar y Ensordecer) */}
                  <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={toggleVoiceMute}
                      className={`px-2.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition active:scale-95 border shadow-sm ${
                        isMicMuted
                          ? 'bg-red-600 hover:bg-red-500 text-white border-red-400'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                      }`}
                    >
                      {isMicMuted ? <MicOff size={12} /> : <Mic size={12} />}
                      <span>{isMicMuted ? 'Activar' : 'Silenciar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleDeafenAudio}
                      className={`p-1.5 rounded-xl text-xs transition active:scale-95 border ${
                        isDeafened
                          ? 'bg-red-950/80 border-red-500 text-red-300 hover:bg-red-900'
                          : 'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700'
                      }`}
                      title={isDeafened ? 'Audio ensordecido' : 'Escuchando la sala'}
                    >
                      {isDeafened ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  </div>
                </div>

                {/* Fila 2 en móvil (Botón Probar Cornetas a lo ancho) / Lado derecho en PC */}
                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleTestSpeakers}
                    className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border shadow-sm ${
                      speakerTested
                        ? 'bg-amber-400 text-black border-amber-200 shadow-amber-500/50 animate-pulse'
                        : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-amber-500/40'
                    }`}
                    title="Probar sonido y desbloquear altavoces del teléfono o computadora"
                  >
                    <Volume2 size={15} className={speakerTested ? 'animate-bounce text-black' : 'text-amber-400'} />
                    <span>{speakerTested ? '🔔 ¡Sonando campanada!' : '🔊 Probar Cornetas (Toca para escuchar)'}</span>
                  </button>

                  {/* En desktop: Botones de silenciar y ensordecer al lado de probar cornetas */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={toggleVoiceMute}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition active:scale-95 border shadow-sm ${
                        isMicMuted
                          ? 'bg-red-600 hover:bg-red-500 text-white border-red-400'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                      }`}
                    >
                      {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
                      <span>{isMicMuted ? 'Activar' : 'Silenciar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleDeafenAudio}
                      className={`p-1.5 rounded-xl text-xs transition active:scale-95 border ${
                        isDeafened
                          ? 'bg-red-950/80 border-red-500 text-red-300 hover:bg-red-900'
                          : 'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700'
                      }`}
                      title={isDeafened ? 'Audio ensordecido' : 'Escuchando la sala'}
                    >
                      {isDeafened ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Estado de los 4 Asientos en la Mesa */}
              <div className="my-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
                  <span>Jugadores en la mesa:</span>
                  <span className="text-amber-400 font-extrabold">{connectedCount} de 4 Conectados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[0, 1, 2, 3].map((seatIdx) => {
                    const seat = roomState?.seats?.find(s => s.seatIndex === seatIdx);
                    const isTeam1 = seatIdx === 0 || seatIdx === 2;
                    const isMe = seatIdx === mySeatIndex;
                    const roleTitle = seatIdx === 0 ? 'Capitán' : (seatIdx === 2 ? 'Tu Compañero' : (seatIdx === 1 ? 'Rival 1' : 'Rival 2'));
                    const roleTeam = isTeam1 ? 'Equipo 1 (Azul)' : 'Equipo 2 (Rojo)';

                    const isSpeakingNow = seatIdx === mySeatIndex
                      ? (!isMicMuted && (speakingPeers[seatIdx] || localVolume > 5))
                      : speakingPeers[seatIdx];

                    return (
                      <div
                        key={seatIdx}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 text-left transition ${
                          seat
                            ? (isTeam1 ? 'bg-blue-950/60 border-blue-500/50 text-blue-100 shadow-md shadow-blue-950/40' : 'bg-red-950/60 border-red-500/50 text-red-100 shadow-md shadow-red-950/40')
                            : 'bg-black/40 border-dashed border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {seat && seat.avatarUrl && seat.avatarUrl.length > 5 ? (
                              <img src={seat.avatarUrl} alt={seat.name} className={`w-8 h-8 rounded-xl object-cover border border-amber-400/40 shrink-0 ${isSpeakingNow ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/60 scale-105 transition-all' : ''}`} />
                            ) : (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                seat
                                  ? (isTeam1 ? 'bg-blue-600 text-white shadow' : 'bg-red-600 text-white shadow')
                                  : 'bg-slate-800 text-slate-400'
                              } ${isSpeakingNow ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/60 scale-105 transition-all' : ''}`}>
                                {seat ? (isTeam1 ? '🛡️' : '⚔️') : '⏳'}
                              </div>
                            )}
                            {seat && (seatIdx === mySeatIndex ? isMicMuted : voicePeerStates[seatIdx]?.isMuted) && (
                              <span className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-0.5 border border-red-300 shadow">
                                <MicOff size={8} />
                              </span>
                            )}
                          </div>
                          <div className="truncate flex-1 leading-tight">
                            <span className="text-xs font-extrabold block truncate flex items-center gap-1.5">
                              <span className="truncate">{seat ? `${seat.name} ${isMe ? '(Tú)' : ''}` : `Esperando ${roleTitle}...`}</span>
                              {seat && isSpeakingNow && (
                                <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.2 rounded-full font-black animate-pulse flex items-center gap-0.5 shrink-0 shadow-sm">
                                  <Mic size={9} /> Hablando
                                </span>
                              )}
                              {seat && seat.isConnected === false && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse shrink-0">
                                  Reconectando...
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              {roleTitle} • {roleTeam}
                            </span>
                          </div>
                        </div>

                        {!seat && (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => handleCopySlotLink(seatIdx, roleTitle)}
                              className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                              title={`Copiar enlace directo para ${roleTitle}`}
                            >
                              <Copy size={11} />
                              <span>Copiar Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShareSlotWhatsApp(seatIdx, roleTitle)}
                              className="bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                              title={`Enviar por WhatsApp para ${roleTitle}`}
                            >
                              <Share2 size={11} />
                              <span>WhatsApp</span>
                            </button>
                            {mySeatIndex !== seatIdx && (
                              <button
                                type="button"
                                onClick={() => handleSwitchSeat(seatIdx)}
                                className="bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 py-1 px-2 rounded-lg text-[10px] font-bold transition active:scale-95"
                                title="Moverme a este puesto"
                              >
                                Sentarme
                              </button>
                            )}
                          </div>
                        )}
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
                    <span>
                      {roomState?.seats?.length === 4
                        ? `Esperando que todos estén activos (${connectedCount} de 4 conectados)...`
                        : `Esperando a que se unan ${4 - connectedCount} jugador(es) más...`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (connection) {
                      connection.invoke('LeaveRoom2v2', roomName).catch(() => {});
                    }
                    router.push('/desk');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-bold underline transition py-1"
                >
                  Cancelar y volver al escritorio
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 3. TABLERO DE JUEGO (MESA EN CRUZ 2 VS 2) */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between px-1 sm:px-4 py-0.5 sm:py-2 relative overflow-hidden">
        
        {/* ARRIBA: COMPAÑERO */}
        {(() => {
          const partner = players[partnerSeat] || { name: 'Compañero', team: (mySeatIndex % 2 === 0 ? 1 : 2), role: 'Compañero' };
          const isPartnerTurn = !isWaitingNextHand && currentTurn === partnerSeat;
          const isPartnerTeam1 = partnerSeat === 0 || partnerSeat === 2;

          return (
            <div className="w-full flex flex-col items-center justify-center relative z-10 shrink-0">
              <div className={`bg-gradient-to-r ${isPartnerTeam1 ? 'from-blue-950/90 to-sky-950/90 border-blue-400/60 shadow-blue-500/20' : 'from-red-950/90 to-rose-950/90 border-red-400/60 shadow-red-500/20'} border-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-lg`}>
                <div className="relative shrink-0">
                  {partner.avatarUrl && partner.avatarUrl.length > 5 ? (
                    <img src={partner.avatarUrl} alt={partner.name} className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover border border-blue-200 shrink-0 ${speakingPeers[partnerSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`} />
                  ) : (
                    <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${isPartnerTeam1 ? 'bg-blue-500 border-blue-200' : 'bg-red-500 border-red-200'} text-white flex items-center justify-center text-[8px] sm:text-[10px] font-black border shrink-0 ${speakingPeers[partnerSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`}>
                      🤝
                    </div>
                  )}
                  {voicePeerStates[partnerSeat]?.isMuted && (
                    <span className="absolute -bottom-1 -right-1 bg-red-600/95 text-white rounded-full p-0.5 border border-red-300 shadow">
                      <MicOff size={7} />
                    </span>
                  )}
                  {speakingPeers[partnerSeat] && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-emerald-300 animate-bounce shadow">
                      <Mic size={7} />
                    </span>
                  )}
                </div>
                <div className="text-left leading-tight">
                  <span className={`text-[10px] sm:text-xs font-bold ${isPartnerTeam1 ? 'text-blue-100' : 'text-red-100'} block max-w-[110px] sm:max-w-none truncate`}>{partner.name}</span>
                  <span className={`text-[7px] sm:text-[8px] ${isPartnerTeam1 ? 'text-blue-300' : 'text-red-300'} uppercase font-black`}>Compañero ({isPartnerTeam1 ? 'Azul' : 'Rojo'})</span>
                </div>
                {isPartnerTurn && (
                  <span className={`text-[7px] sm:text-[8px] ${isPartnerTeam1 ? 'bg-blue-500' : 'bg-red-500'} text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse`}>
                    TURNO
                  </span>
                )}
              </div>

              {/* Cartas ocultas del Compañero */}
              <div className="flex items-center -space-x-2.5 sm:-space-x-4 mt-0.5">
                {Array.from({ length: partnerCardCount }).map((_, i) => (
                  <div key={i} className={`w-6 h-8 sm:w-12 sm:h-16 rounded sm:rounded-lg overflow-hidden border ${isPartnerTeam1 ? 'border-blue-400/40' : 'border-red-400/40'} shadow`}>
                    <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* FILA MEDIA: RIVAL 1 (IZQ), TAPETE CENTRAL (4 CARTAS), RIVAL 2 (DER) */}
        <div className="w-full flex items-center justify-between relative my-auto gap-0.5 sm:gap-2 shrink-0">
          
          {/* IZQUIERDA: RIVAL 1 */}
          {(() => {
            const rival1 = players[leftRivalSeat] || { name: 'Rival 1', team: (leftRivalSeat % 2 === 0 ? 1 : 2), role: 'Rival 1' };
            const isRival1Turn = !isWaitingNextHand && currentTurn === leftRivalSeat;
            const isRival1Team1 = leftRivalSeat === 0 || leftRivalSeat === 2;

            return (
              <div className="flex flex-col items-center justify-center z-10 w-12 sm:w-24 shrink-0 relative">
                <div className={`bg-gradient-to-b ${isRival1Team1 ? 'from-blue-950/90 to-sky-950/90' : 'from-red-950/90 to-rose-950/90'} border-2 ${isRival1Turn ? 'border-yellow-400 ring-2 ring-yellow-400/50' : (isRival1Team1 ? 'border-blue-500/60' : 'border-red-500/60')} p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col items-center text-center shadow-lg ${isRival1Team1 ? 'shadow-blue-500/20' : 'shadow-red-500/20'} w-full`}>
                  <div className="relative shrink-0">
                    {rival1.avatarUrl && rival1.avatarUrl.length > 5 ? (
                      <img src={rival1.avatarUrl} alt={rival1.name} className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-red-200 shrink-0 ${speakingPeers[leftRivalSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`} />
                    ) : (
                      <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full ${isRival1Team1 ? 'bg-blue-600 border-blue-200' : 'bg-red-600 border-red-200'} text-white flex items-center justify-center text-[9px] sm:text-xs font-bold border shrink-0 ${speakingPeers[leftRivalSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`}>
                        ⚔️
                      </div>
                    )}
                    {voicePeerStates[leftRivalSeat]?.isMuted && (
                      <span className="absolute -bottom-1 -right-1 bg-red-600/95 text-white rounded-full p-0.5 border border-red-300 shadow">
                        <MicOff size={7} />
                      </span>
                    )}
                    {speakingPeers[leftRivalSeat] && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-emerald-300 animate-bounce shadow">
                        <Mic size={7} />
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] sm:text-[11px] font-bold ${isRival1Team1 ? 'text-blue-100' : 'text-red-100'} mt-0.5 truncate w-full`}>{rival1.name}</span>
                  <span className={`text-[7px] sm:text-[8px] ${isRival1Team1 ? 'text-blue-300' : 'text-red-300'} font-black uppercase`}>Rival 1</span>
                  {isRival1Turn && (
                    <span className={`text-[7px] sm:text-[8px] ${isRival1Team1 ? 'bg-blue-500' : 'bg-red-500'} text-white font-extrabold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full mt-0.5 animate-pulse`}>
                      TURNO
                    </span>
                  )}
                </div>

                {/* Cartas ocultas de Rival 1: En móvil tarjeta compacta con contador, en desktop abanico */}
                <div className="mt-0.5 sm:hidden relative">
                  <div className={`w-6 h-8 rounded overflow-hidden border ${isRival1Team1 ? 'border-blue-500/40' : 'border-red-500/40'} shadow`}>
                    <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                  </div>
                  <span className={`absolute -bottom-1 -right-1 ${isRival1Team1 ? 'bg-blue-600 border-blue-300' : 'bg-red-600 border-red-300'} text-white text-[8px] font-black px-1 rounded-full border shadow leading-tight`}>
                    {rival1CardCount}
                  </span>
                </div>
                <div className="hidden sm:flex sm:flex-col -space-y-6 mt-1.5">
                  {Array.from({ length: rival1CardCount }).map((_, i) => (
                    <div key={i} className={`w-12 h-16 rounded-lg overflow-hidden border ${isRival1Team1 ? 'border-blue-500/40' : 'border-red-500/40'} shadow`}>
                      <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* TAPETE VERDE CENTRAL: 4 CARTAS EN MESA BIEN DISTRIBUIDAS */}
          <div className="flex-1 mx-0.5 sm:mx-3 min-h-[165px] xs:min-h-[185px] sm:min-h-[280px] max-h-[225px] sm:max-h-none rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1b4332] via-[#2d6a4f] to-[#1b4332] border-2 sm:border-4 border-amber-600/60 shadow-2xl shadow-green-950/60 flex flex-col items-center justify-between p-1.5 sm:p-3 relative overflow-hidden">
            
            {/* Resplandor ambiental de tapete */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-black/30 pointer-events-none" />

            {/* Cabecera del Tapete: La Vida y Marcador de Bazas */}
            <div className="w-full flex items-center justify-between z-10 gap-1.5 sm:gap-2 px-0.5 sm:px-1">
              {/* LA VIDA REDISEÑADA Y CLARA */}
              <div 
                onClick={() => {
                  if (lifeCard.id >= 0) {
                    Swal.fire({
                      title: `LA VIDA: ${getCardFaceName(lifeCard.id).toUpperCase()}`,
                      html: `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                          <div style="width:110px; height:160px; border-radius:12px; overflow:hidden; border:3px solid #eab308; box-shadow:0 0 25px rgba(234,179,8,0.5); background:#fff;">
                            <img src="${lifeCard.image}" style="width:100%; height:100%; object-fit:contain;" alt="Vida" />
                          </div>
                          <p style="color:#fde047; font-size:16px; font-weight:900; margin:0;">Palo de Triunfo: ${getSuitName(lifeCard.id)} ${getSuitIcon(lifeCard.id)}</p>
                          <p style="color:#d6d3d1; font-size:13px; margin:0; line-height:1.4;">Todas las cartas de este palo son triunfos que superan a cualquier carta común.</p>
                        </div>
                      `,
                      confirmButtonText: 'Entendido',
                      confirmButtonColor: '#eab308',
                      background: '#1a0e06',
                      color: '#fff',
                    });
                  }
                }}
                className="flex items-center gap-1.5 sm:gap-2.5 bg-black/85 backdrop-blur-md border-2 border-amber-400/80 px-1.5 sm:px-2.5 py-1 rounded-xl sm:rounded-2xl shadow-xl shadow-black/70 cursor-pointer hover:border-yellow-300 transition-all active:scale-95"
                title="Toca para ampliar la carta de la Vida"
              >
                {lifeCard.id >= 0 && (
                  <div className="w-[34px] h-[50px] xs:w-[42px] xs:h-[62px] sm:w-[54px] sm:h-[78px] rounded sm:rounded-md overflow-hidden border-2 border-yellow-400 shadow-md bg-white flex items-center justify-center shrink-0">
                    <img 
                      src={lifeCard.image && lifeCard.image.startsWith('/') ? lifeCard.image : '/card_back.png'} 
                      alt="Vida" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                )}
                <div className="flex flex-col text-left leading-tight pr-0.5 sm:pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-0.5">
                      VIDA <span className="text-[9px] sm:text-[11px]">👑</span>
                    </span>
                  </div>
                  <span className="text-[9px] xs:text-[10px] sm:text-xs font-extrabold text-white capitalize mt-0.5">
                    {getCardFaceName(lifeCard.id)}
                  </span>
                  <span className="text-[7.5px] xs:text-[8px] sm:text-[9.5px] font-bold text-amber-400/90 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <span>{getSuitIcon(lifeCard.id)}</span>
                    <span className="hidden xs:inline">Triunfo</span>
                  </span>
                </div>
              </div>

              {/* MARCADOR DE BAZAS */}
              <div className="bg-black/80 backdrop-blur-md border-2 border-amber-500/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-extrabold text-amber-300 shadow-xl flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span className="text-[8px] sm:text-[11px] text-amber-200/90 font-black uppercase tracking-wider hidden xs:inline">Bazas:</span>
                <span className="text-blue-300 font-black bg-blue-950/80 px-1.5 sm:px-2 py-0.5 rounded border border-blue-500/40">🔵 {tricksTeam1}</span>
                <span className="text-stone-400 font-bold text-[10px]">-</span>
                <span className="text-red-300 font-black bg-red-950/80 px-1.5 sm:px-2 py-0.5 rounded border border-red-500/40">{tricksTeam2} 🔴</span>
              </div>
            </div>

            {/* LAS 4 CARTAS DE LA BAZA EN FILA CLARA (SIN TAPARSE) */}
            <div className="w-full flex items-center justify-center gap-1 sm:gap-3.5 my-auto z-10 px-0.5">
              {[0, 1, 2, 3].map((pIdx) => {
                const playedItem = playedCards.find((p) => p.playerIndex === pIdx);
                const playerInfo = players[pIdx];
                const isTeam1 = pIdx === 0 || pIdx === 2;
                const isWinner = trickResult?.winningPlayer === pIdx;

                return (
                  <div key={pIdx} className="flex flex-col items-center transition-all duration-300">
                    {/* Ranura de la Carta */}
                    <div className={`w-[40px] h-[60px] xs:w-[46px] xs:h-[68px] sm:w-[68px] sm:h-[98px] rounded-lg sm:rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all duration-300 ${
                      playedItem
                        ? (isWinner
                            ? 'border-yellow-400 ring-2 sm:ring-4 ring-yellow-400 shadow-2xl shadow-yellow-500/50 scale-105 bg-white z-20'
                            : 'border-slate-300 bg-white shadow-md')
                        : (currentTurn === pIdx
                            ? (isTeam1 ? 'border-blue-400/80 bg-blue-950/40 border-dashed' : 'border-red-400/80 bg-red-950/40 border-dashed')
                            : 'border-emerald-800/50 bg-emerald-950/30 border-dashed')
                    }`}>
                      {playedItem ? (
                        <img src={playedItem.card.image} alt="Carta jugada" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[7px] sm:text-[9px] text-emerald-300/50 font-bold text-center px-0.5 leading-tight">
                          {currentTurn === pIdx ? 'Jugando...' : '—'}
                        </span>
                      )}
                    </div>

                    {/* Identificación del Jugador debajo de su carta */}
                    <div className="flex flex-col items-center mt-0.5">
                      <span className={`text-[6.5px] sm:text-[9.5px] font-black uppercase px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full shadow max-w-[65px] sm:max-w-[90px] truncate ${
                        isTeam1
                          ? 'bg-blue-950/90 text-blue-200 border border-blue-400/50'
                          : 'bg-red-950/90 text-red-200 border border-red-400/50'
                      }`}>
                        {pIdx === mySeatIndex ? 'Tú' : (pIdx === partnerSeat ? 'Compañero' : (playerInfo?.name || playerInfo?.role))}
                      </span>

                      {/* Insignia de Resultado de la Baza */}
                      {trickResult && playedItem && (
                        <span className={`text-[6.5px] sm:text-[9px] font-black mt-0.5 px-1 py-0.2 rounded shadow ${
                          isWinner
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black ring-1 ring-yellow-200'
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
            <div className="w-full z-10 mt-0.5">
              {trickResult ? (
                <div className="w-full bg-black/90 border border-amber-400 rounded-xl sm:rounded-2xl py-0.5 sm:py-1.5 px-2 sm:px-3 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                  <span className={`text-[9.5px] sm:text-sm font-black tracking-wide leading-tight block ${
                    trickResult.winningTeam === 1 ? 'text-green-300' : 'text-rose-300'
                  }`}>
                    {trickResult.message}
                  </span>
                </div>
              ) : isWaitingNextHand ? (
                <div className="w-full bg-amber-950/80 border border-amber-500/50 rounded-xl py-0.5 sm:py-1 px-1.5 text-center text-amber-300 text-[8px] sm:text-xs leading-tight animate-pulse flex items-center justify-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Repartiendo nueva mano...</span>
                </div>
              ) : (
                <div className="w-full bg-black/60 border border-amber-500/20 rounded-xl py-0.5 sm:py-1 px-1.5 text-center text-emerald-200/80 text-[8px] sm:text-xs leading-tight">
                  <span>Mano: <strong>{currentStake}</strong> {currentStake === 1 ? 'piedra' : 'piedras'} • Turno: <strong className="text-amber-300">{players[currentTurn]?.name}</strong></span>
                </div>
              )}
            </div>

          </div>

          {/* DERECHA: RIVAL 2 */}
          {(() => {
            const rival2 = players[rightRivalSeat] || { name: 'Rival 2', team: (rightRivalSeat % 2 === 0 ? 1 : 2), role: 'Rival 2' };
            const isRival2Turn = !isWaitingNextHand && currentTurn === rightRivalSeat;
            const isRival2Team1 = rightRivalSeat === 0 || rightRivalSeat === 2;

            return (
              <div className="flex flex-col items-center justify-center z-10 w-12 sm:w-24 shrink-0 relative">
                <div className={`bg-gradient-to-b ${isRival2Team1 ? 'from-blue-950/90 to-sky-950/90' : 'from-red-950/90 to-rose-950/90'} border-2 ${isRival2Turn ? 'border-yellow-400 ring-2 ring-yellow-400/50' : (isRival2Team1 ? 'border-blue-500/60' : 'border-red-500/60')} p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col items-center text-center shadow-lg ${isRival2Team1 ? 'shadow-blue-500/20' : 'shadow-red-500/20'} w-full`}>
                  <div className="relative shrink-0">
                    {rival2.avatarUrl && rival2.avatarUrl.length > 5 ? (
                      <img src={rival2.avatarUrl} alt={rival2.name} className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-red-200 shrink-0 ${speakingPeers[rightRivalSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`} />
                    ) : (
                      <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full ${isRival2Team1 ? 'bg-blue-600 border-blue-200' : 'bg-red-600 border-red-200'} text-white flex items-center justify-center text-[9px] sm:text-xs font-bold border shrink-0 ${speakingPeers[rightRivalSeat] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`}>
                        ⚔️
                      </div>
                    )}
                    {voicePeerStates[rightRivalSeat]?.isMuted && (
                      <span className="absolute -bottom-1 -right-1 bg-red-600/95 text-white rounded-full p-0.5 border border-red-300 shadow">
                        <MicOff size={7} />
                      </span>
                    )}
                    {speakingPeers[rightRivalSeat] && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-emerald-300 animate-bounce shadow">
                        <Mic size={7} />
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] sm:text-[11px] font-bold ${isRival2Team1 ? 'text-blue-100' : 'text-red-100'} mt-0.5 truncate w-full`}>{rival2.name}</span>
                  <span className={`text-[7px] sm:text-[8px] ${isRival2Team1 ? 'text-blue-300' : 'text-red-300'} font-black uppercase`}>Rival 2</span>
                  {isRival2Turn && (
                    <span className={`text-[7px] sm:text-[8px] ${isRival2Team1 ? 'bg-blue-500' : 'bg-red-500'} text-white font-extrabold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full mt-0.5 animate-pulse`}>
                      TURNO
                    </span>
                  )}
                </div>

                {/* Cartas ocultas de Rival 2: En móvil tarjeta compacta con contador, en desktop abanico */}
                <div className="mt-0.5 sm:hidden relative">
                  <div className={`w-6 h-8 rounded overflow-hidden border ${isRival2Team1 ? 'border-blue-500/40' : 'border-red-500/40'} shadow`}>
                    <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                  </div>
                  <span className={`absolute -bottom-1 -right-1 ${isRival2Team1 ? 'bg-blue-600 border-blue-300' : 'bg-red-600 border-red-300'} text-white text-[8px] font-black px-1 rounded-full border shadow leading-tight`}>
                    {rival2CardCount}
                  </span>
                </div>
                <div className="hidden sm:flex sm:flex-col -space-y-6 mt-1.5">
                  {Array.from({ length: rival2CardCount }).map((_, i) => (
                    <div key={i} className={`w-12 h-16 rounded-lg overflow-hidden border ${isRival2Team1 ? 'border-blue-500/40' : 'border-red-500/40'} shadow`}>
                      <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>

        {/* ABAJO: PUESTO 0 - TÚ (EQUIPO 1 - AZUL) Y CONTROLES */}
        <div className="w-full flex flex-col items-center justify-center relative z-20 shrink-0 pb-2 sm:pb-4">
          {/* Contador de tiempo para decisión de Tumba (10s de análisis) */}
          {tumbaCountdown !== null && (
            <div className='flex justify-center mb-1 animate-pulse z-30'>
              <div className='flex items-center gap-2 bg-gradient-to-r from-stone-950 via-black to-stone-950 border-2 border-yellow-400 text-yellow-300 px-3 py-0.5 sm:py-1 rounded-xl shadow-2xl'>
                <span className='text-xs'>⏳</span>
                <span className='font-black text-[9px] sm:text-xs tracking-wide uppercase'>ANALIZA TUS CARTAS Y LA VIDA</span>
                <div className='bg-yellow-400 text-black font-black text-[9px] sm:text-xs px-2 py-0.2 rounded-full shadow'>
                  {tumbaCountdown}s
                </div>
              </div>
            </div>
          )}

          {/* Aviso cuando los rivales están analizando en Tumba */}
          {isWaitingOppTumba && (
            <div className='flex justify-center mb-1 animate-pulse z-30'>
              <div className='flex items-center gap-2 bg-gradient-to-r from-stone-950 via-black to-stone-950 border-2 border-amber-500 text-amber-300 px-3 py-0.5 sm:py-1 rounded-xl shadow-2xl'>
                <span className='text-xs'>⏳</span>
                <span className='font-black text-[9px] sm:text-xs tracking-wide uppercase'>RIVALES EN TUMBA</span>
                <div className='bg-amber-500 text-black font-black text-[9px] sm:text-xs px-2 py-0.2 rounded-full shadow'>
                  Analizando (10s)...
                </div>
              </div>
            </div>
          )}

          {/* Indicador visual de Regla del Pelao / Negar 5 de Oro */}
          {(() => {
            const currentLifeId = lifeCard?.id ?? -1;
            const isLeadTrump = playedCards.length > 0 && isTrumpCard(playedCards[0].card.id, currentLifeId);
            const playerHasTrump = myCards.some(c => isTrumpCard(c.id, currentLifeId));
            const isFirstBaza = myCards.length === 3;
            const hasCincoDeOro = myCards.some(c => c.id === 4);
            const trumpsCount = myCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
            const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;
            const isPelaoActive = isLeadTrump && playerHasTrump;

            if (!isPelaoActive || currentTurn !== mySeatIndex) return null;

            if (canDenyCinco) {
              return (
                <div className="flex justify-center mb-1 animate-pulse z-30">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-3 sm:px-4 py-0.5 sm:py-1 rounded-full font-black text-[9px] sm:text-xs shadow-xl border-2 border-yellow-200">
                    <span className="text-xs sm:text-sm">👑</span>
                    <span>REGLA DEL 5 DE ORO: ¡Puedes negarlo y tirar otra carta, o jugarlo si prefieres!</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex justify-center mb-1 animate-pulse z-30">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black px-3 sm:px-4 py-0.5 sm:py-1 rounded-full font-black text-[9px] sm:text-xs shadow-xl border-2 border-amber-300">
                  <span className="text-xs sm:text-sm">⚡</span>
                  <span>REGLA DEL PELAO: ¡Salieron con triunfo, debes lanzar triunfo!</span>
                </div>
              </div>
            );
          })()}

          {/* Barra de Acciones del Jugador: Identidad, Estado de Turno y Botón de PEDIR */}
          <div className="w-full max-w-md flex items-center justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1 px-1 sm:px-2">
            
            {/* Identidad del Jugador Local */}
            <div className="flex items-center gap-1 sm:gap-2 bg-blue-950/80 border border-blue-500/50 px-2 py-0.5 sm:py-1.5 rounded-xl sm:rounded-2xl shadow shrink-0">
              <div className="relative shrink-0">
                <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-blue-200 shrink-0 bg-blue-600 flex items-center justify-center text-xs font-black ${speakingPeers[mySeatIndex] ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/70 scale-105 transition-all' : ''}`}>
                  <img
                    src={user?.avatarUrl && user.avatarUrl.length > 5 ? user.avatarUrl : '/avatar.png'}
                    alt={user?.name || 'Tú'}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isMicMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-red-600/95 text-white rounded-full p-0.5 border border-red-300 shadow">
                    <MicOff size={7} />
                  </span>
                )}
                {speakingPeers[mySeatIndex] && !isMicMuted && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-emerald-300 animate-bounce shadow">
                    <Mic size={7} />
                  </span>
                )}
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] sm:text-xs font-bold text-blue-100 block max-w-[70px] sm:max-w-[120px] truncate">
                  {user?.name && user.name !== 'nulo' ? user.name : 'Tú'}
                </span>
                <span className="text-[7px] sm:text-[9px] text-blue-300 block font-semibold">
                  {(mySeatIndex === 0 || mySeatIndex === 2) ? 'Equipo 1' : 'Equipo 2'}
                </span>
              </div>
            </div>

            {/* Banner de Turno con Temporizador de 30s */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              {isWaitingNextHand ? (
                <span className="border border-amber-500/60 bg-amber-950/80 text-amber-300 font-bold text-[8.5px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full truncate max-w-[170px] sm:max-w-[200px] animate-pulse flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  Repartiendo cartas...
                </span>
              ) : (
                <span className={`border font-bold text-[8.5px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full truncate max-w-[140px] sm:max-w-[170px] ${
                  currentTurn === mySeatIndex
                    ? (timeLeft <= 10 ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300')
                    : 'bg-black/60 border-slate-700 text-slate-300'
                }`}>
                  {currentTurn === mySeatIndex ? `¡Tu turno! (${timeLeft}s)` : `Turno: ${players[currentTurn]?.name || 'Jugador'} (${timeLeft}s)`}
                </span>
              )}
            </div>

            {/* Botón de PEDIR */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

              {(() => {
                const isTumbaActive = (pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8)) ||
                                      (pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8));
                const myTeam = (mySeatIndex === 0 || mySeatIndex === 2) ? 1 : 2;
                const cannotRaise = lastStakeAskedBy === myTeam && currentStake > 1;
                const isPedirDisabled = currentStake >= 9 || isProcessingMove || isCleaningTable || isTumbaActive || tumbaCountdown !== null || isWaitingOppTumba || isStakePending || cannotRaise || myCards.length === 0 || isWaitingNextHand;
                return (
                  <button
                    type="button"
                    onClick={handlePedirClick}
                    disabled={isPedirDisabled}
                    className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-sm uppercase tracking-wider flex items-center gap-1 border-2 transition-all shadow-xl active:scale-95 shrink-0 ${
                      isPedirDisabled
                        ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 hover:brightness-110 shadow-yellow-500/25 cursor-pointer'
                    } ${fonts.bowlbyOneSC.className}`}
                    title={isTumbaActive ? 'En Tumba no se puede pedir' : cannotRaise ? 'Tu equipo cantó el último aumento' : 'Pedir aumento de apuesta'}
                  >
                    <span>{isTumbaActive ? '🪦 TUMBA' : '🔥 PEDIR'}</span>
                    {!isTumbaActive && (
                      <span className="text-[8.5px] sm:text-[10px] bg-black text-yellow-300 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-md font-extrabold">
                        {currentStake === 1 ? '3' : (currentStake === 3 ? '6' : '9')}
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>

          </div>

          {/* Tus Cartas en Abanico Interactivo (100% VISIBLES SIN CORTARSE) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3">
            {myCards.map((card, index) => {
              const currentLifeId = lifeCard?.id ?? -1;
              const isLeadTrump = playedCards.length > 0 && isTrumpCard(playedCards[0].card.id, currentLifeId);
              const playerHasTrump = myCards.some(c => isTrumpCard(c.id, currentLifeId));
              const isFirstBaza = myCards.length === 3;
              const hasCincoDeOro = myCards.some(c => c.id === 4);
              const trumpsCount = myCards.filter(c => isTrumpCard(c.id, currentLifeId)).length;
              const canDenyCinco = isFirstBaza && hasCincoDeOro && trumpsCount === 1;
              const isPelaoActive = isLeadTrump && playerHasTrump && !canDenyCinco;
              const isTrump = isTrumpCard(card.id, currentLifeId);
              const isBlockedByPelao = isPelaoActive && !isTrump;

              const isTurn = currentTurn === mySeatIndex && !isProcessingMove && !isCleaningTable && tumbaCountdown === null && !isWaitingOppTumba && !isStakePending;
              let rotClass = index === 0 ? 'rotate-[-3deg]' : (index === 1 ? 'rotate-0' : 'rotate-[3deg]');

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!isTurn || isBlockedByPelao}
                  onClick={() => handlePlayMyCard(card)}
                  className={`w-[62px] h-[90px] xs:w-[70px] xs:h-[102px] sm:w-24 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-200 transform relative ${rotClass} ${
                    isBlockedByPelao
                      ? 'opacity-30 grayscale filter pointer-events-none cursor-not-allowed scale-95 border-slate-700'
                      : isPelaoActive && isTrump
                      ? 'border-amber-400 ring-4 ring-amber-400 ring-offset-2 ring-offset-black shadow-2xl shadow-amber-500/60 scale-105 cursor-pointer animate-pulse'
                      : isTurn
                      ? 'border-amber-400 hover:-translate-y-3 hover:scale-105 active:scale-95 shadow-2xl shadow-amber-500/30 ring-2 ring-yellow-400/60 cursor-pointer'
                      : 'border-slate-600 opacity-80 cursor-not-allowed'
                  }`}
                  title={
                    isBlockedByPelao
                      ? 'Bloqueada por Regla del Pelao (Debes tirar triunfo)'
                      : isPelaoActive && isTrump
                      ? '¡Triunfo obligatorio para el Pelao!'
                      : isTurn
                      ? 'Toca para jugar esta carta'
                      : 'Espera tu turno'
                  }
                >
                  {isPelaoActive && isTrump && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[7.5px] sm:text-[9.5px] px-1.5 py-0.2 rounded-full shadow-md border border-amber-200 uppercase tracking-tighter whitespace-nowrap z-30">
                      Triunfo
                    </div>
                  )}
                  <img src={card.image} alt={`Carta ${card.number}`} className="w-full h-full object-contain bg-white" />
                </button>
              );
            })}
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
