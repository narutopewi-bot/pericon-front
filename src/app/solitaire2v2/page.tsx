'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RootState, useAppSelector } from '@/store/store';
import { Baraja } from '@/lib/library';
import { GameAnnouncement, AnnouncementData, AnnouncementType } from '@/components/game-announcement';
import { playCardSound, playSwooshSound, vibrateDevice, playSynthSound, speakPhrase } from '@/lib/gameEffects';
import { playCardDealSound, playCardDropSound, playCoinWinSound } from '@/lib/soundEffects';

import * as fonts from '@/components/fonts';
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';

// Tipos
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

interface PlayerInfo {
  seatIndex: number;
  name: string;
  team: number;
  role: string;
  avatarUrl: string;
}

// Evaluación oficial de jerarquía de cartas de Pericón
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
    if (faceVal === 1) return 14; // As de triunfo (cinco y medio)
    return 11 + faceVal;
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

export default function SolitaireTwoVsTwo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state: RootState) => state.gameplayer);

  const betAmount = parseInt(searchParams?.get('bet') || '100', 10);

  // Definición de los 4 jugadores
  const players: PlayerInfo[] = [
    {
      seatIndex: 0,
      name: user?.name && user.name !== 'nulo' ? user.name : 'Tú',
      team: 1,
      role: 'Capitán',
      avatarUrl: user?.avatarUrl && user.avatarUrl.length > 5 ? user.avatarUrl : '/avatar.png',
    },
    {
      seatIndex: 1,
      name: 'Compadre Jacinto',
      team: 2,
      role: 'Rival 1',
      avatarUrl: '/avatars/diablo.svg',
    },
    {
      seatIndex: 2,
      name: 'Don Cipriano',
      team: 1,
      role: 'Tu Compañero',
      avatarUrl: '/avatars/patron.svg',
    },
    {
      seatIndex: 3,
      name: 'El Llanero',
      team: 2,
      role: 'Rival 2',
      avatarUrl: '/avatars/llanero.svg',
    },
  ];

  // Marcador de Piedras
  const [pointsTeam1, setPointsTeam1] = useState<number>(0);
  const [pointsTeam2, setPointsTeam2] = useState<number>(0);

  // Estados de Tumba y Tumba de para atrás
  const [isTumbaTeam1, setIsTumbaTeam1] = useState<boolean>(false);
  const [isTumbaTeam2, setIsTumbaTeam2] = useState<boolean>(false);
  const [isTumbaDeParaAtrasT1, setIsTumbaDeParaAtrasT1] = useState<boolean>(false);
  const [isTumbaDeParaAtrasT2, setIsTumbaDeParaAtrasT2] = useState<boolean>(false);

  // Estado de la Mano
  const [allHands, setAllHands] = useState<{ [seat: number]: Card[] }>({ 0: [], 1: [], 2: [], 3: [] });
  const [lifeCard, setLifeCard] = useState<Card>({ id: -1, position: 0, suit: '', number: 0, image: '/card_back.png' });
  const [playedCards, setPlayedCards] = useState<PlayedCard[]>([]);
  const [tricksTeam1, setTricksTeam1] = useState<number>(0);
  const [tricksTeam2, setTricksTeam2] = useState<number>(0);
  const [currentStake, setCurrentStake] = useState<number>(1);
  const [lastStakeAskedBy, setLastStakeAskedBy] = useState<number | null>(null);

  // Turnos
  const [handLeader, setHandLeader] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  // Estados de control de flujo
  const [isProcessingMove, setIsProcessingMove] = useState<boolean>(false);
  const [isCleaningTable, setIsCleaningTable] = useState<boolean>(false);
  const [tumbaCountdown, setTumbaCountdown] = useState<number | null>(null);
  const [isWaitingOppTumba, setIsWaitingOppTumba] = useState<boolean>(false);
  const [trickResult, setTrickResult] = useState<{ winningPlayer: number; winningTeam: number; message: string } | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Referencias para sincronización
  const pointsTeam1Ref = useRef(pointsTeam1);
  const pointsTeam2Ref = useRef(pointsTeam2);
  const isTumbaT1Ref = useRef(isTumbaTeam1);
  const isTumbaT2Ref = useRef(isTumbaTeam2);
  const isTumbaAtrasT1Ref = useRef(isTumbaDeParaAtrasT1);
  const isTumbaAtrasT2Ref = useRef(isTumbaDeParaAtrasT2);
  const allHandsRef = useRef(allHands);
  const playedCardsRef = useRef(playedCards);
  const currentTurnRef = useRef(currentTurn);
  const lifeCardRef = useRef(lifeCard);
  const isCleaningTableRef = useRef(isCleaningTable);
  const isProcessingMoveRef = useRef(isProcessingMove);
  const tricksTeam1Ref = useRef(tricksTeam1);
  const tricksTeam2Ref = useRef(tricksTeam2);
  const currentStakeRef = useRef(currentStake);

  useEffect(() => { pointsTeam1Ref.current = pointsTeam1; }, [pointsTeam1]);
  useEffect(() => { pointsTeam2Ref.current = pointsTeam2; }, [pointsTeam2]);
  useEffect(() => { isTumbaT1Ref.current = isTumbaTeam1; }, [isTumbaTeam1]);
  useEffect(() => { isTumbaT2Ref.current = isTumbaTeam2; }, [isTumbaTeam2]);
  useEffect(() => { isTumbaAtrasT1Ref.current = isTumbaDeParaAtrasT1; }, [isTumbaDeParaAtrasT1]);
  useEffect(() => { isTumbaAtrasT2Ref.current = isTumbaDeParaAtrasT2; }, [isTumbaDeParaAtrasT2]);
  useEffect(() => { allHandsRef.current = allHands; }, [allHands]);
  useEffect(() => { playedCardsRef.current = playedCards; }, [playedCards]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);
  useEffect(() => { lifeCardRef.current = lifeCard; }, [lifeCard]);
  useEffect(() => { isCleaningTableRef.current = isCleaningTable; }, [isCleaningTable]);
  useEffect(() => { isProcessingMoveRef.current = isProcessingMove; }, [isProcessingMove]);
  useEffect(() => { tricksTeam1Ref.current = tricksTeam1; }, [tricksTeam1]);
  useEffect(() => { tricksTeam2Ref.current = tricksTeam2; }, [tricksTeam2]);
  useEffect(() => { currentStakeRef.current = currentStake; }, [currentStake]);

  const triggerAnnouncement = (title: string, subtitle?: string, type: AnnouncementType = 'win_round') => {
    setAnnouncement({ title, subtitle, type });
    setTimeout(() => {
      setAnnouncement(null);
    }, 3000);
  };

  // Función para barajar y repartir nueva mano
  const dealNewHand = useCallback((newLeaderIndex: number) => {
    playCardDealSound();

    const deck = Array.from({ length: 40 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const hands: { [seat: number]: Card[] } = {
      0: [Baraja(deck[0], 0), Baraja(deck[1], 1), Baraja(deck[2], 2)],
      1: [Baraja(deck[3], 0), Baraja(deck[4], 1), Baraja(deck[5], 2)],
      2: [Baraja(deck[6], 0), Baraja(deck[7], 1), Baraja(deck[8], 2)],
      3: [Baraja(deck[9], 0), Baraja(deck[10], 1), Baraja(deck[11], 2)],
    };

    const trumpCard = Baraja(deck[12], 0);

    setAllHands(hands);
    allHandsRef.current = hands;
    setLifeCard(trumpCard);
    lifeCardRef.current = trumpCard;

    setPlayedCards([]);
    playedCardsRef.current = [];
    setTricksTeam1(0);
    tricksTeam1Ref.current = 0;
    setTricksTeam2(0);
    tricksTeam2Ref.current = 0;
    setTrickResult(null);
    setCurrentStake(1);
    currentStakeRef.current = 1;
    setLastStakeAskedBy(null);
    setIsProcessingMove(false);
    isProcessingMoveRef.current = false;
    setIsCleaningTable(false);
    isCleaningTableRef.current = false;

    setHandLeader(newLeaderIndex);

    const t1Points = pointsTeam1Ref.current;
    const t2Points = pointsTeam2Ref.current;
    const t1Tumba = t1Points >= 9;
    const t2Tumba = t2Points >= 9;
    const t1Atras = isTumbaAtrasT1Ref.current && t1Points === 8;
    const t2Atras = isTumbaAtrasT2Ref.current && t2Points === 8;

    setIsTumbaTeam1(t1Tumba);
    setIsTumbaTeam2(t2Tumba);

    // Flujo de decisión de Tumba
    if (t1Tumba && !t1Atras) {
      setCurrentTurn(-1);
      setTumbaCountdown(10);
      triggerAnnouncement('¡ESTÁS EN TUMBA!', 'Analiza tus cartas (10s) para decidir si juegas o pasas', 'tumba');
      speakPhrase('Estás en Tumba. Tienes diez segundos para decidir.');
      return;
    }

    if (t2Tumba && !t2Atras) {
      setCurrentTurn(-1);
      setIsWaitingOppTumba(true);
      triggerAnnouncement('¡RIVALES EN TUMBA!', 'Los rivales están analizando si juegan o pasan...', 'tumba');

      setTimeout(() => {
        setIsWaitingOppTumba(false);
        const r1Cards = hands[1];
        const r2Cards = hands[3];
        const countTrumps = [...r1Cards, ...r2Cards].filter(c => isTrumpCard(c.id, trumpCard.id)).length;
        const hasTopTrump = [...r1Cards, ...r2Cards].some(c => evaluatePericonCard(c.id, trumpCard.id) >= 26);

        if (countTrumps >= 2 || hasTopTrump) {
          triggerAnnouncement('¡RIVALES JUEGAN LA TUMBA!', 'Se disputan el partido en esta mano', 'tumba');
          speakPhrase('Los rivales deciden jugar la Tumba.');
          setCurrentTurn(newLeaderIndex);
          currentTurnRef.current = newLeaderIndex;
          if (newLeaderIndex !== 0) {
            triggerBotPlay(newLeaderIndex);
          }
        } else {
          handlePassTumba(2);
        }
      }, 3000);
      return;
    }

    if (t1Atras || t2Atras) {
      triggerAnnouncement('⚠️ TUMBA DE PARA ATRÁS', '¡Mano obligada a jugar sin pasar ni cantar!', 'tumba');
    }

    setCurrentTurn(newLeaderIndex);
    currentTurnRef.current = newLeaderIndex;
    setTimeLeft(30);

    if (newLeaderIndex !== 0) {
      triggerBotPlay(newLeaderIndex);
    }
  }, []);

  // Manejo de Pasar la Tumba (-1 al que pasa, +1 al rival)
  const handlePassTumba = (passingTeam: number) => {
    setTumbaCountdown(null);
    setIsWaitingOppTumba(false);

    if (passingTeam === 1) {
      const newP1 = Math.max(0, pointsTeam1Ref.current - 1);
      const newP2 = Math.min(10, pointsTeam2Ref.current + 1);
      setPointsTeam1(newP1);
      setPointsTeam2(newP2);
      pointsTeam1Ref.current = newP1;
      pointsTeam2Ref.current = newP2;

      if (newP1 === 8) {
        setIsTumbaDeParaAtrasT1(true);
        isTumbaAtrasT1Ref.current = true;
      }
      setIsTumbaTeam1(false);
      isTumbaT1Ref.current = false;

      triggerAnnouncement('PASASTE LA TUMBA', '-1 piedra para ti • +1 piedra para rivales', 'tumba');
      playCardDropSound();

      if (newP2 >= 10) {
        handleEndMatch(2);
        return;
      }
    } else {
      const newP2 = Math.max(0, pointsTeam2Ref.current - 1);
      const newP1 = Math.min(10, pointsTeam1Ref.current + 1);
      setPointsTeam2(newP2);
      setPointsTeam1(newP1);
      pointsTeam2Ref.current = newP2;
      pointsTeam1Ref.current = newP1;

      if (newP2 === 8) {
        setIsTumbaDeParaAtrasT2(true);
        isTumbaAtrasT2Ref.current = true;
      }
      setIsTumbaTeam2(false);
      isTumbaT2Ref.current = false;

      triggerAnnouncement('¡RIVALES PASARON!', '+1 piedra para ti • -1 para rivales', 'win_round');
      playCoinWinSound();

      if (newP1 >= 10) {
        handleEndMatch(1);
        return;
      }
    }

    setTimeout(() => {
      dealNewHand((handLeader + 1) % 4);
    }, 2500);
  };

  // Temporizador de 10s para la decisión de Tumba del usuario
  useEffect(() => {
    if (tumbaCountdown === null) return;
    if (tumbaCountdown > 0) {
      const timer = setTimeout(() => {
        setTumbaCountdown(tumbaCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (tumbaCountdown === 0) {
      handlePassTumba(1);
    }
  }, [tumbaCountdown]);

  // Modal interactivo cuando el usuario está en Tumba
  useEffect(() => {
    if (tumbaCountdown === 10) {
      Swal.fire({
        title: '¡ESTÁS EN TUMBA!',
        html: `
          <div style="text-align: center; font-size: 14px; padding: 4px 0;">
            <p style="color: #cbd5e1; margin-bottom: 12px; line-height: 1.5;">
              Tienes <strong>9 piedras</strong>. Analiza tus 3 cartas y la vida.<br/>
              ¿Quieres arriesgarte y <strong>Jugar</strong> para ganar el partido, o prefieres <strong>Pasar</strong>?
            </p>
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 10px; color: #fca5a5; font-size: 12px; margin-bottom: 8px;">
              ⚠️ <strong>Si pasas:</strong> Pierdes 1 piedra (-1) y le das 1 al rival (+1). Caerás a 8 en <em>Tumba de para atrás</em>.<br/>
              💀 <strong>Si juegas y pierdes:</strong> Caerás en Tumba (-3 piedras para tu equipo, +3 para el rival).<br/>
              🏆 <strong>Si juegas y ganas:</strong> ¡Victoria total del partido (10 piedras)!
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '¡JUGAR LA TUMBA!',
        cancelButtonText: 'PASAR (-1 piedra)',
        confirmButtonColor: '#22c55e',
        cancelButtonColor: '#ef4444',
        background: '#1a0e06',
        color: '#fff',
        customClass: {
          popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl',
        },
        allowOutsideClick: false,
      }).then((res) => {
        if (res.isConfirmed) {
          setTumbaCountdown(null);
          triggerAnnouncement('¡ACEPTASTE LA TUMBA!', '¡A por las 10 piedras del triunfo!', 'tumba');
          speakPhrase('¡Has aceptado jugar la Tumba!');
          setCurrentTurn(handLeader);
          currentTurnRef.current = handLeader;
          if (handLeader !== 0) {
            triggerBotPlay(handLeader);
          }
        } else if (res.dismiss === Swal.DismissReason.cancel) {
          handlePassTumba(1);
        }
      });
    }
  }, [tumbaCountdown]);

  // Turno y temporizador de 30s para el usuario
  useEffect(() => {
    if (currentTurn !== 0 || isProcessingMove || isCleaningTable || tumbaCountdown !== null || isWaitingOppTumba || gameOver) {
      return;
    }

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeoutAutoPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, isProcessingMove, isCleaningTable, tumbaCountdown, isWaitingOppTumba, gameOver]);

  const handleTimeoutAutoPlay = () => {
    const myCards = allHandsRef.current[0] || [];
    if (myCards.length === 0) return;

    const currentLifeId = lifeCardRef.current.id;
    const currentPlayed = playedCardsRef.current;
    const isLeadTrump = currentPlayed.length > 0 && isTrumpCard(currentPlayed[0].card.id, currentLifeId);
    const trumpsInHand = myCards.filter(c => isTrumpCard(c.id, currentLifeId));

    const legalCard = (isLeadTrump && trumpsInHand.length > 0) ? trumpsInHand[0] : myCards[0];
    handlePlayCard(0, legalCard);
  };

  // Bot AI
  const chooseBotCard = (seatIdx: number, hand: Card[]): Card => {
    const currentLifeId = lifeCardRef.current.id;
    const currentPlayed = playedCardsRef.current;

    // 1. REGLA DEL PELAO
    const isLeadTrump = currentPlayed.length > 0 && isTrumpCard(currentPlayed[0].card.id, currentLifeId);
    const trumpsInHand = hand.filter(c => isTrumpCard(c.id, currentLifeId));
    const candidateCards = (isLeadTrump && trumpsInHand.length > 0) ? trumpsInHand : hand;

    if (candidateCards.length === 1) return candidateCards[0];

    // Si abre la baza
    if (currentPlayed.length === 0) {
      const nonTrumps = candidateCards.filter(c => !isTrumpCard(c.id, currentLifeId));
      return nonTrumps.length > 0 ? nonTrumps[0] : candidateCards[0];
    }

    const leadCardId = currentPlayed[0].card.id;
    let bestPlayed = currentPlayed[0];
    for (let i = 1; i < currentPlayed.length; i++) {
      if (doesCandidateBeatBest(bestPlayed.card.id, currentPlayed[i].card.id, leadCardId, currentLifeId)) {
        bestPlayed = currentPlayed[i];
      }
    }

    const currentWinnerSeat = bestPlayed.playerIndex;
    const currentWinnerTeam = currentWinnerSeat === 0 || currentWinnerSeat === 2 ? 1 : 2;
    const botTeam = seatIdx === 0 || seatIdx === 2 ? 1 : 2;

    // Si su equipo ya gana la baza
    if (currentWinnerTeam === botTeam) {
      const winningPower = evaluatePericonCard(bestPlayed.card.id, currentLifeId);
      if (winningPower >= 24) {
        const sortedWeak = [...candidateCards].sort((a, b) =>
          evaluatePericonCard(a.id, currentLifeId) - evaluatePericonCard(b.id, currentLifeId)
        );
        return sortedWeak[0];
      }
    }

    // Si el rival gana la baza
    const winningCandidates = candidateCards.filter(c =>
      doesCandidateBeatBest(bestPlayed.card.id, c.id, leadCardId, currentLifeId)
    );

    if (winningCandidates.length > 0) {
      const sortedWinners = [...winningCandidates].sort((a, b) =>
        evaluatePericonCard(a.id, currentLifeId) - evaluatePericonCard(b.id, currentLifeId)
      );
      return sortedWinners[0];
    }

    const sortedLow = [...candidateCards].sort((a, b) =>
      evaluatePericonCard(a.id, currentLifeId) - evaluatePericonCard(b.id, currentLifeId)
    );
    return sortedLow[0];
  };

  const triggerBotPlay = (botSeat: number) => {
    setIsProcessingMove(true);
    isProcessingMoveRef.current = true;

    setTimeout(() => {
      const botHand = allHandsRef.current[botSeat] || [];
      if (botHand.length === 0) {
        setIsProcessingMove(false);
        isProcessingMoveRef.current = false;
        return;
      }

      const chosenCard = chooseBotCard(botSeat, botHand);
      handlePlayCard(botSeat, chosenCard);
    }, 1100);
  };

  const handlePlayCard = (seatIdx: number, card: Card) => {
    playCardSound();
    vibrateDevice([30]);

    const currentHands = { ...allHandsRef.current };
    currentHands[seatIdx] = (currentHands[seatIdx] || []).filter(c => c.id !== card.id);
    setAllHands(currentHands);
    allHandsRef.current = currentHands;

    const newPlayed = [...playedCardsRef.current, { playerIndex: seatIdx, card }];
    setPlayedCards(newPlayed);
    playedCardsRef.current = newPlayed;

    setIsProcessingMove(false);
    isProcessingMoveRef.current = false;

    if (newPlayed.length < 4) {
      const nextTurn = (seatIdx + 1) % 4;
      setCurrentTurn(nextTurn);
      currentTurnRef.current = nextTurn;
      setTimeLeft(30);

      if (nextTurn !== 0) {
        triggerBotPlay(nextTurn);
      }
    } else {
      resolveTrick(newPlayed);
    }
  };

  const resolveTrick = (trickCards: PlayedCard[]) => {
    setIsCleaningTable(true);
    isCleaningTableRef.current = true;
    setCurrentTurn(-1);

    const currentLifeId = lifeCardRef.current.id;
    const leadCardId = trickCards[0].card.id;

    let bestPlayed = trickCards[0];
    for (let i = 1; i < trickCards.length; i++) {
      if (doesCandidateBeatBest(bestPlayed.card.id, trickCards[i].card.id, leadCardId, currentLifeId)) {
        bestPlayed = trickCards[i];
      }
    }

    const winningSeat = bestPlayed.playerIndex;
    const winningTeam = winningSeat === 0 || winningSeat === 2 ? 1 : 2;
    const winnerName = players[winningSeat]?.name || `Puesto ${winningSeat}`;

    const newT1Tricks = winningTeam === 1 ? tricksTeam1Ref.current + 1 : tricksTeam1Ref.current;
    const newT2Tricks = winningTeam === 2 ? tricksTeam2Ref.current + 1 : tricksTeam2Ref.current;
    setTricksTeam1(newT1Tricks);
    setTricksTeam2(newT2Tricks);
    tricksTeam1Ref.current = newT1Tricks;
    tricksTeam2Ref.current = newT2Tricks;

    setTrickResult({
      winningPlayer: winningSeat,
      winningTeam,
      message: `⭐ Baza para ${winnerName} (${winningTeam === 1 ? 'Azul' : 'Rojo'})`,
    });

    playSwooshSound();

    setTimeout(() => {
      setPlayedCards([]);
      playedCardsRef.current = [];
      setTrickResult(null);
      setIsCleaningTable(false);
      isCleaningTableRef.current = false;

      if (newT1Tricks >= 2) {
        resolveHandWinner(1);
      } else if (newT2Tricks >= 2) {
        resolveHandWinner(2);
      } else if (newT1Tricks + newT2Tricks === 3) {
        if (newT1Tricks > newT2Tricks) resolveHandWinner(1);
        else resolveHandWinner(2);
      } else {
        setCurrentTurn(winningSeat);
        currentTurnRef.current = winningSeat;
        setTimeLeft(30);

        if (winningSeat !== 0) {
          triggerBotPlay(winningSeat);
        }
      }
    }, 2200);
  };

  const resolveHandWinner = (winningTeam: number) => {
    const isT1Tumba = isTumbaT1Ref.current || (isTumbaAtrasT1Ref.current && pointsTeam1Ref.current === 8);
    const isT2Tumba = isTumbaT2Ref.current || (isTumbaAtrasT2Ref.current && pointsTeam2Ref.current === 8);
    const stake = currentStakeRef.current;

    let newP1 = pointsTeam1Ref.current;
    let newP2 = pointsTeam2Ref.current;

    if (winningTeam === 1) {
      if (isT1Tumba) {
        newP1 = 10;
        setPointsTeam1(10);
        pointsTeam1Ref.current = 10;
        handleEndMatch(1);
        return;
      } else if (isT2Tumba) {
        newP2 = Math.max(0, newP2 - 3);
        newP1 = Math.min(10, newP1 + 3);
        setPointsTeam2(newP2);
        setPointsTeam1(newP1);
        pointsTeam2Ref.current = newP2;
        pointsTeam1Ref.current = newP1;

        if (newP2 === 8) {
          setIsTumbaDeParaAtrasT2(true);
          isTumbaAtrasT2Ref.current = true;
        }
        setIsTumbaTeam2(false);
        isTumbaT2Ref.current = false;

        triggerAnnouncement('¡CAÍDA EN TUMBA RIVAL!', '-3 piedras para rivales • +3 para ti', 'win_round');
        playCoinWinSound();

        if (newP1 >= 10) {
          handleEndMatch(1);
          return;
        }
      } else {
        newP1 = Math.min(9, newP1 + stake);
        setPointsTeam1(newP1);
        pointsTeam1Ref.current = newP1;

        if (newP1 === 9) {
          setIsTumbaTeam1(true);
          isTumbaT1Ref.current = true;
        }
        triggerAnnouncement('¡MANO PARA TU EQUIPO!', `+${stake} ${stake === 1 ? 'piedra' : 'piedras'} (Azul)`, 'win_round');
        playCoinWinSound();
      }
    } else {
      if (isT2Tumba) {
        newP2 = 10;
        setPointsTeam2(10);
        pointsTeam2Ref.current = 10;
        handleEndMatch(2);
        return;
      } else if (isT1Tumba) {
        newP1 = Math.max(0, newP1 - 3);
        newP2 = Math.min(10, newP2 + 3);
        setPointsTeam1(newP1);
        setPointsTeam2(newP2);
        pointsTeam1Ref.current = newP1;
        pointsTeam2Ref.current = newP2;

        if (newP1 === 8) {
          setIsTumbaDeParaAtrasT1(true);
          isTumbaAtrasT1Ref.current = true;
        }
        setIsTumbaTeam1(false);
        isTumbaT1Ref.current = false;

        triggerAnnouncement('¡CAÍSTE EN TUMBA!', '-3 piedras para tu equipo • +3 para rivales', 'opp_win_round');
        playSynthSound('tumba');

        if (newP2 >= 10) {
          handleEndMatch(2);
          return;
        }
      } else {
        newP2 = Math.min(9, newP2 + stake);
        setPointsTeam2(newP2);
        pointsTeam2Ref.current = newP2;

        if (newP2 === 9) {
          setIsTumbaTeam2(true);
          isTumbaT2Ref.current = true;
        }
        triggerAnnouncement('¡MANO PARA LOS RIVALES!', `+${stake} ${stake === 1 ? 'piedra' : 'piedras'} (Rojo)`, 'opp_win_round');
      }
    }

    setTimeout(() => {
      dealNewHand((handLeader + 1) % 4);
    }, 3000);
  };

  const handleEndMatch = (matchWinnerTeam: number) => {
    setGameOver(true);
    setCurrentTurn(-1);

    const isUserWin = matchWinnerTeam === 1;
    if (isUserWin) {
      playCoinWinSound();
      speakPhrase('¡Felicidades! Has ganado la partida 2 contra 2.');
    } else {
      playSynthSound('tumba');
      speakPhrase('Partida finalizada. Los rivales han ganado.');
    }

    Swal.fire({
      title: isUserWin ? '🏆 ¡VICTORIA 2 VS 2!' : '💀 DERROTA',
      html: `
        <div style="text-align: center; font-size: 14px; padding: 6px 0;">
          <h2 style="color: ${isUserWin ? '#4ade80' : '#f87171'}; font-size: 20px; font-weight: 900; margin-bottom: 8px;">
            ${isUserWin ? '¡TU EQUIPO HA GANADO EL PARTIDO!' : 'EL EQUIPO RIVAL HA GANADO'}
          </h2>
          <div style="background: rgba(0,0,0,0.5); border: 2px solid ${isUserWin ? '#22c55e' : '#ef4444'}; border-radius: 16px; padding: 12px; margin-bottom: 12px;">
            <p style="font-size: 16px; font-weight: 800; color: #facc15;">
              Marcador Final: <strong>${pointsTeam1Ref.current}</strong> (Azul) - <strong>${pointsTeam2Ref.current}</strong> (Rojo)
            </p>
          </div>
          <p style="color: #cbd5e1; font-size: 12px;">
            Has probado el módulo 2 vs 2 con bots IA. Todas las reglas oficiales, la tumba y las bazas se han ejecutado correctamente.
          </p>
        </div>
      `,
      icon: isUserWin ? 'success' : 'error',
      showCancelButton: true,
      confirmButtonText: '🔄 Jugar Otra Vez',
      cancelButtonText: 'Volver al Escritorio',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#475569',
      background: '#1a0e06',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl',
      },
    }).then((res) => {
      if (res.isConfirmed) {
        setPointsTeam1(0);
        setPointsTeam2(0);
        pointsTeam1Ref.current = 0;
        pointsTeam2Ref.current = 0;
        setIsTumbaTeam1(false);
        setIsTumbaTeam2(false);
        setIsTumbaDeParaAtrasT1(false);
        setIsTumbaDeParaAtrasT2(false);
        setGameOver(false);
        dealNewHand(0);
      } else {
        router.push('/desk');
      }
    });
  };

  const handlePedir = () => {
    const isT1Tumba = pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8);
    const isT2Tumba = pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8);

    if (isT1Tumba || isT2Tumba) {
      Swal.fire({
        title: '¡EN TUMBA NO SE PIDE!',
        text: 'En Tumba o Tumba de para atrás las apuestas están cerradas. Quien gane la mano se lleva el partido.',
        icon: 'info',
        confirmButtonColor: '#d97706',
        background: '#1a0e06',
        color: '#fff',
      });
      return;
    }

    if (lastStakeAskedBy === 1 && currentStake > 1) {
      Swal.fire({
        title: 'NO PUEDES CANTAR DE NUEVO',
        text: 'Tu equipo ya pidió el último aumento. Debes esperar a que los rivales vuelvan a pedir.',
        icon: 'warning',
        confirmButtonColor: '#d97706',
        background: '#1a0e06',
        color: '#fff',
      });
      return;
    }

    const nextStake = currentStake === 1 ? 3 : (currentStake === 3 ? 6 : 9);
    const stakeType: AnnouncementType = nextStake === 3 ? 'dame_tres' : (nextStake === 6 ? 'quiero_seis' : 'van_nueve');
    setLastStakeAskedBy(1);
    setCurrentStake(nextStake);
    triggerAnnouncement('¡PEDISTE AUMENTO!', `La mano ahora vale ${nextStake} piedras`, stakeType);
    speakPhrase(`¡Pido ${nextStake}!`);
  };

  useEffect(() => {
    dealNewHand(0);
  }, [dealNewHand]);

  const myCards = allHands[0] || [];
  const rival1CardsCount = (allHands[1] || []).length;
  const partnerCardsCount = (allHands[2] || []).length;
  const rival2CardsCount = (allHands[3] || []).length;

  return (
    <main className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-[#140a04] via-[#0b0502] to-[#040201] text-white flex flex-col relative overflow-hidden select-none">
      
      {/* 1. BARRA SUPERIOR (HEADER) */}
      <header className="w-full bg-black/80 backdrop-blur-md border-b border-amber-500/30 px-2 py-1.5 sm:px-6 sm:py-2 flex items-center justify-between z-30 shadow-lg shrink-0">
        
        {/* Izquierda: Logo y Modo Práctica */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/desk" className="flex items-center gap-1 hover:opacity-80 transition">
            <Image src="/logo.svg" alt="Pericón" width={110} height={32} className="w-16 sm:w-24 object-contain" />
          </Link>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-600 to-yellow-500 text-black px-2 py-0.5 rounded-md font-mono shadow">
            2 VS 2 CPU
          </span>
          <span className="hidden md:inline-block text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
            MODO PRÁCTICA
          </span>
        </div>

        {/* Temporizador de Turno */}
        <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border backdrop-blur-md shadow-lg transition-all shrink-0 ${
          currentTurn === 0
            ? (timeLeft <= 10
                ? 'bg-red-950/90 border-red-500 ring-2 ring-red-500/60 animate-pulse'
                : 'bg-emerald-950/90 border-emerald-500/60 ring-1 ring-emerald-400/40')
            : 'bg-stone-900/80 border-amber-900/40 opacity-90'
        }`}>
          <span className='text-xs sm:text-base'>⏱️</span>
          <div className='flex flex-col text-left'>
            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider ${
              currentTurn === 0 ? (timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400') : 'text-amber-400/70'
            }`}>
              {currentTurn === 0 ? 'Tu turno' : `Turno: ${players[currentTurn]?.name?.slice(0, 8)}`}
            </span>
            <span className={`text-[10px] sm:text-sm font-extrabold font-mono leading-none ${
              currentTurn === 0 ? (timeLeft <= 10 ? 'text-red-300' : 'text-emerald-200') : 'text-stone-300'
            }`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Centro: Marcador de Piedras */}
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1 sm:gap-2.5 bg-gradient-to-r from-blue-950/90 via-black/95 to-red-950/90 border-2 border-amber-500/60 px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl shadow-xl shadow-black/60">
            {/* Equipo 1 - Azul */}
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400 shrink-0"></span>
              <span className="text-[9px] sm:text-xs font-black text-blue-200 uppercase hidden xs:inline">Azul</span>
              <span className="text-xs sm:text-sm font-black text-blue-300 bg-blue-900/70 px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-400/50 min-w-[20px] text-center">
                {pointsTeam1}
              </span>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 border-x border-amber-500/30 text-center">
              <span className="text-xs sm:text-sm">🪨</span>
              <span className="text-[8px] sm:text-[10px] text-amber-300/80 font-bold uppercase hidden md:inline">Piedras</span>
            </div>

            {/* Equipo 2 - Rojo */}
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

        {/* Derecha: Botón Salir */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              Swal.fire({
                title: '¿Salir al Escritorio?',
                text: 'La partida de práctica terminará.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, Salir',
                cancelButtonText: 'Seguir Jugando',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#22c55e',
                background: '#1a0e06',
                color: '#fff',
              }).then((res) => {
                if (res.isConfirmed) {
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

      {/* 2. TABLERO DE JUEGO (MESA EN CRUZ) */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between px-1 sm:px-4 py-0.5 sm:py-2 relative overflow-hidden">
        
        {/* ARRIBA: COMPAÑERO (DON CIPRIANO) */}
        <div className="w-full flex flex-col items-center justify-center relative z-10 shrink-0">
          <div className="bg-gradient-to-r from-blue-950/90 to-sky-950/90 border-2 border-blue-400/60 shadow-blue-500/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-lg">
            <img src="/avatars/patron.svg" alt="Don Cipriano" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-blue-200 shrink-0 bg-blue-600 p-0.5" />
            <div className="text-left leading-tight">
              <span className="text-[10px] sm:text-xs font-bold text-blue-100 block max-w-[110px] sm:max-w-none truncate">Don Cipriano</span>
              <span className="text-[7px] sm:text-[8px] text-blue-300 uppercase font-black">Tu Compañero (Azul)</span>
            </div>
            {currentTurn === 2 && (
              <span className="text-[7px] sm:text-[8px] bg-blue-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                TURNO
              </span>
            )}
          </div>

          {/* Cartas ocultas de Don Cipriano */}
          <div className="flex items-center -space-x-2.5 sm:-space-x-4 mt-0.5">
            {Array.from({ length: partnerCardsCount }).map((_, i) => (
              <div key={i} className="w-6 h-8 sm:w-12 sm:h-16 rounded sm:rounded-lg overflow-hidden border border-blue-400/40 shadow">
                <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* FILA MEDIA: RIVAL 1 (IZQ), TAPETE CENTRAL (4 CARTAS), RIVAL 2 (DER) */}
        <div className="w-full flex items-center justify-between relative my-auto gap-0.5 sm:gap-2 shrink-0">
          
          {/* IZQUIERDA: RIVAL 1 (COMPADRE JACINTO) */}
          <div className="flex flex-col items-center justify-center z-10 w-14 sm:w-24 shrink-0 relative">
            <div className={`bg-gradient-to-b from-red-950/90 to-rose-950/90 border-2 ${currentTurn === 1 ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-red-500/60'} p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col items-center text-center shadow-lg shadow-red-500/20 w-full`}>
              <img src="/avatars/diablo.svg" alt="Jacinto" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-red-200 shrink-0 bg-red-600 p-0.5" />
              <span className="text-[9px] sm:text-[11px] font-bold text-red-100 mt-0.5 truncate w-full">Jacinto</span>
              <span className="text-[7px] sm:text-[8px] text-red-300 font-black uppercase">Rival 1</span>
              {currentTurn === 1 && (
                <span className="text-[7px] sm:text-[8px] bg-red-500 text-white font-extrabold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full mt-0.5 animate-pulse">
                  TURNO
                </span>
              )}
            </div>

            {/* Cartas ocultas de Jacinto */}
            <div className="mt-0.5 sm:hidden relative">
              <div className="w-6 h-8 rounded overflow-hidden border border-red-500/40 shadow">
                <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-red-600 border-red-300 text-white text-[8px] font-black px-1 rounded-full border shadow leading-tight">
                {rival1CardsCount}
              </span>
            </div>
            <div className="hidden sm:flex sm:flex-col -space-y-6 mt-1.5">
              {Array.from({ length: rival1CardsCount }).map((_, i) => (
                <div key={i} className="w-12 h-16 rounded-lg overflow-hidden border border-red-500/40 shadow">
                  <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* TAPETE VERDE CENTRAL */}
          <div className="flex-1 mx-0.5 sm:mx-3 min-h-[165px] xs:min-h-[185px] sm:min-h-[280px] max-h-[225px] sm:max-h-none rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1b4332] via-[#2d6a4f] to-[#1b4332] border-2 sm:border-4 border-amber-600/60 shadow-2xl shadow-green-950/60 flex flex-col items-center justify-between p-1.5 sm:p-3 relative overflow-hidden">
            
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-black/30 pointer-events-none" />

            {/* Cabecera del Tapete: Vida y Marcador de Bazas */}
            <div className="w-full flex items-center justify-between z-10 gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-black/75 backdrop-blur-sm border border-amber-500/40 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl shadow-lg">
                <div className="text-left leading-none">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 block">VIDA</span>
                  <span className="hidden sm:block text-[7.5px] text-slate-300 font-semibold mt-0.5">Triunfo</span>
                </div>
                {lifeCard.id >= 0 && (
                  <div className="w-5 h-8 sm:w-9 sm:h-13 rounded sm:rounded-md overflow-hidden border border-amber-400 shadow transform rotate-3 shrink-0">
                    <img src={lifeCard.image} alt="Vida" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="bg-black/75 backdrop-blur-sm border border-amber-500/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[9px] sm:text-xs font-bold text-amber-300 shadow flex items-center gap-1 shrink-0">
                <span className="text-[8px] sm:text-[11px] text-amber-200/80">Bazas:</span>
                <span className="text-blue-300 font-black">🔵{tricksTeam1}</span>
                <span className="text-stone-400">-</span>
                <span className="text-red-300 font-black">{tricksTeam2}🔴</span>
              </div>
            </div>

            {/* LAS 4 CARTAS DE LA BAZA EN MESA */}
            <div className="w-full flex items-center justify-center gap-1 sm:gap-3.5 my-auto z-10 px-0.5">
              {[0, 1, 2, 3].map((pIdx) => {
                const playedItem = playedCards.find((p) => p.playerIndex === pIdx);
                const isTeam1 = pIdx === 0 || pIdx === 2;
                const isWinner = trickResult?.winningPlayer === pIdx;

                return (
                  <div key={pIdx} className="flex flex-col items-center transition-all duration-300">
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

                    {/* Nombre del Jugador debajo de la carta */}
                    <div className="flex flex-col items-center mt-0.5">
                      <span className={`text-[6.5px] sm:text-[9.5px] font-black uppercase px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full shadow max-w-[65px] sm:max-w-[90px] truncate ${
                        isTeam1
                          ? 'bg-blue-950/90 text-blue-200 border border-blue-400/50'
                          : 'bg-red-950/90 text-red-200 border border-red-400/50'
                      }`}>
                        {pIdx === 0 ? 'Tú' : (pIdx === 2 ? 'Compañero' : (pIdx === 1 ? 'Jacinto' : 'Llanero'))}
                      </span>

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

            {/* BANNER DE RESULTADO DE LA BAZA */}
            <div className="w-full z-10 mt-0.5">
              {trickResult ? (
                <div className="w-full bg-black/90 border border-amber-400 rounded-xl sm:rounded-2xl py-0.5 sm:py-1.5 px-2 sm:px-3 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                  <span className={`text-[9.5px] sm:text-sm font-black tracking-wide leading-tight block ${
                    trickResult.winningTeam === 1 ? 'text-green-300' : 'text-rose-300'
                  }`}>
                    {trickResult.message}
                  </span>
                </div>
              ) : (
                <div className="w-full bg-black/60 border border-amber-500/20 rounded-xl py-0.5 sm:py-1 px-1.5 text-center text-emerald-200/80 text-[8px] sm:text-xs leading-tight">
                  <span>Mano: <strong>{currentStake}</strong> {currentStake === 1 ? 'piedra' : 'piedras'} • Turno: <strong className="text-amber-300">{players[currentTurn]?.name || '...'}</strong></span>
                </div>
              )}
            </div>

          </div>

          {/* DERECHA: RIVAL 2 (EL LLANERO) */}
          <div className="flex flex-col items-center justify-center z-10 w-14 sm:w-24 shrink-0 relative">
            <div className={`bg-gradient-to-b from-red-950/90 to-rose-950/90 border-2 ${currentTurn === 3 ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-red-500/60'} p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col items-center text-center shadow-lg shadow-red-500/20 w-full`}>
              <img src="/avatars/llanero.svg" alt="El Llanero" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-red-200 shrink-0 bg-red-600 p-0.5" />
              <span className="text-[9px] sm:text-[11px] font-bold text-red-100 mt-0.5 truncate w-full">El Llanero</span>
              <span className="text-[7px] sm:text-[8px] text-red-300 font-black uppercase">Rival 2</span>
              {currentTurn === 3 && (
                <span className="text-[7px] sm:text-[8px] bg-red-500 text-white font-extrabold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full mt-0.5 animate-pulse">
                  TURNO
                </span>
              )}
            </div>

            {/* Cartas ocultas de El Llanero */}
            <div className="mt-0.5 sm:hidden relative">
              <div className="w-6 h-8 rounded overflow-hidden border border-red-500/40 shadow">
                <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-red-600 border-red-300 text-white text-[8px] font-black px-1 rounded-full border shadow leading-tight">
                {rival2CardsCount}
              </span>
            </div>
            <div className="hidden sm:flex sm:flex-col -space-y-6 mt-1.5">
              {Array.from({ length: rival2CardsCount }).map((_, i) => (
                <div key={i} className="w-12 h-16 rounded-lg overflow-hidden border border-red-500/40 shadow">
                  <img src="/card_back.png" alt="Carta" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ABAJO: PUESTO 0 - TÚ Y TUS CARTAS */}
        <div className="w-full flex flex-col items-center justify-center relative z-20 shrink-0 pb-2 sm:pb-4">
          
          {/* Indicador de Tumba para el usuario */}
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

          {/* Aviso de Rivales en Tumba */}
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

          {/* Indicador de Regla del Pelao */}
          {(() => {
            const currentLifeId = lifeCard?.id ?? -1;
            const isLeadTrump = playedCards.length > 0 && isTrumpCard(playedCards[0].card.id, currentLifeId);
            const playerHasTrump = myCards.some(c => isTrumpCard(c.id, currentLifeId));
            const isPelaoActive = isLeadTrump && playerHasTrump;

            return isPelaoActive && currentTurn === 0 ? (
              <div className="flex justify-center mb-1 animate-pulse z-30">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black px-3 sm:px-4 py-0.5 sm:py-1 rounded-full font-black text-[9px] sm:text-xs shadow-xl border-2 border-amber-300">
                  <span className="text-xs sm:text-sm">⚡</span>
                  <span>REGLA DEL PELAO: ¡Salieron con triunfo, debes lanzar triunfo!</span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Barra de Acciones: Tu perfil, Estado de Turno y Botón PEDIR */}
          <div className="w-full max-w-md flex items-center justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1 px-1 sm:px-2">
            
            {/* Identidad */}
            <div className="flex items-center gap-1 sm:gap-2 bg-blue-950/80 border border-blue-500/50 px-2 py-0.5 sm:py-1.5 rounded-xl sm:rounded-2xl shadow shrink-0">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-blue-200 shrink-0 bg-blue-600 flex items-center justify-center text-xs font-black">
                <img
                  src={user?.avatarUrl && user.avatarUrl.length > 5 ? user.avatarUrl : '/avatar.png'}
                  alt={user?.name || 'Tú'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] sm:text-xs font-bold text-blue-100 block max-w-[70px] sm:max-w-[120px] truncate">
                  {user?.name && user.name !== 'nulo' ? user.name : 'Tú'}
                </span>
                <span className="text-[7px] sm:text-[9px] text-blue-300 block font-semibold">
                  Equipo 1 (Azul)
                </span>
              </div>
            </div>

            {/* Banner de Turno */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              <span className={`border font-bold text-[8.5px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full truncate max-w-[140px] sm:max-w-[170px] ${
                currentTurn === 0
                  ? (timeLeft <= 10 ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300')
                  : 'bg-black/60 border-slate-700 text-slate-300'
              }`}>
                {currentTurn === 0 ? `¡Tu turno! (${timeLeft}s)` : `Turno: ${players[currentTurn]?.name || '...'} (${timeLeft}s)`}
              </span>
            </div>

            {/* Botón de PEDIR */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {(() => {
                const isTumbaActive = (pointsTeam1 >= 9 || (isTumbaDeParaAtrasT1 && pointsTeam1 === 8)) ||
                                      (pointsTeam2 >= 9 || (isTumbaDeParaAtrasT2 && pointsTeam2 === 8));
                const cannotRaise = lastStakeAskedBy === 1 && currentStake > 1;
                const isPedirDisabled = currentStake >= 9 || isProcessingMove || isCleaningTable || isTumbaActive || tumbaCountdown !== null || isWaitingOppTumba || cannotRaise;
                
                return (
                  <button
                    type="button"
                    onClick={handlePedir}
                    disabled={isPedirDisabled}
                    className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-sm uppercase tracking-wider flex items-center gap-1 border-2 transition-all shadow-xl active:scale-95 shrink-0 ${
                      isPedirDisabled
                        ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 hover:brightness-110 shadow-yellow-500/25 cursor-pointer'
                    } ${fonts.bowlbyOneSC.className}`}
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

          {/* Tus 3 Cartas Interactivas */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3">
            {myCards.map((card, index) => {
              const currentLifeId = lifeCard?.id ?? -1;
              const isLeadTrump = playedCards.length > 0 && isTrumpCard(playedCards[0].card.id, currentLifeId);
              const playerHasTrump = myCards.some(c => isTrumpCard(c.id, currentLifeId));
              const isPelaoActive = isLeadTrump && playerHasTrump;
              const isTrump = isTrumpCard(card.id, currentLifeId);
              const isBlockedByPelao = isPelaoActive && !isTrump;

              const isTurn = currentTurn === 0 && !isProcessingMove && !isCleaningTable && tumbaCountdown === null && !isWaitingOppTumba;
              let rotClass = index === 0 ? 'rotate-[-3deg]' : (index === 1 ? 'rotate-0' : 'rotate-[3deg]');

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!isTurn || isBlockedByPelao}
                  onClick={() => handlePlayCard(0, card)}
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

      {/* ANUNCIOS ANIMADOS */}
      {announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <GameAnnouncement announcement={announcement} />
        </div>
      )}

    </main>
  );
}
