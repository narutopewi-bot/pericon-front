'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RootState, useAppSelector, useAppDispatch } from '@/store/store';
import { setGamePlayer } from '@/store/slices/gameplayerSlice';
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

// -------------------------------------------------------------
// EVALUACIÓN OFICIAL DE CARTAS DE PERICÓN (IDÉNTICA A 1 VS 1)
// -------------------------------------------------------------
const evaluateCard = (cardId: number, lifeId: number): number => {
  if (cardId < 0) return -1;
  switch (cardId) {
    case 4: return 30;  // 5 de Oro (Perico)
    case 33: return 29; // 4 de Basto (Perica)
    case 38: return 27; // 11 de Basto
    case 0: return 26;  // 1 de Oro
    case 7: return 25;  // 10 de Oro
  }

  const lifeSuit = lifeId >= 0 ? Math.floor(lifeId / 10) : -1;
  const cardSuit = Math.floor(cardId / 10);
  const faceVal = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][cardId % 10];

  // 3 del palo de la vida (El Gollero)
  if (lifeSuit >= 0 && cardSuit === lifeSuit && faceVal === 3) return 28;

  // 2 del palo de la vida
  if (lifeSuit >= 0 && cardSuit === lifeSuit && faceVal === 2) return 24;

  // Resto de cartas del palo de la vida
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

const isTrumpCard = (cardId: number, lifeId: number): boolean => {
  return evaluateCard(cardId, lifeId) >= 11;
};

// Determina si cardA (salida) le gana a cardB (respuesta), idéntico a GamePlayOneVsOne.DetermineWinner
const determineWinnerOfTwo = (cardA: number, cardB: number, lifeId: number, aIsLead: boolean): boolean => {
  const leadCard = aIsLead ? cardA : cardB;
  const respCard = aIsLead ? cardB : cardA;

  const powerLead = evaluateCard(leadCard, lifeId);
  const powerResp = evaluateCard(respCard, lifeId);

  const leadIsTrump = powerLead >= 11;
  const respIsTrump = powerResp >= 11;

  let leadWins: boolean;
  if (leadIsTrump && respIsTrump) {
    leadWins = powerLead > powerResp;
  } else if (leadIsTrump && !respIsTrump) {
    leadWins = true;
  } else if (!leadIsTrump && respIsTrump) {
    leadWins = false;
  } else {
    // Ambas son cartas comunes
    const suitLead = Math.floor(leadCard / 10);
    const suitResp = Math.floor(respCard / 10);

    if (suitResp !== suitLead) {
      leadWins = true; // Descarte no mata al palo de salida
    } else {
      const faceLead = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][leadCard % 10];
      const faceResp = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12][respCard % 10];
      leadWins = faceLead >= faceResp;
    }
  }

  return aIsLead ? leadWins : !leadWins;
};

export default function SolitaireTwoVsTwo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
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

  // -------------------------------------------------------------
  // ESTADOS PRINCIPALES DE JUEGO (IDÉNTICOS A 1 VS 1)
  // -------------------------------------------------------------
  const [pointsTeam1, setPointsTeam1] = useState<number>(0);
  const [pointsTeam2, setPointsTeam2] = useState<number>(0);

  // Flags de Tumba de para atrás (1 = activa en 8 piedras decreciente, 0 = inactiva)
  const [partT1, setPartT1] = useState<number>(0);
  const [partT2, setPartT2] = useState<number>(0);

  // Mano actual
  const [allHands, setAllHands] = useState<{ [seat: number]: Card[] }>({ 0: [], 1: [], 2: [], 3: [] });
  const [lifeCard, setLifeCard] = useState<Card>({ id: -1, position: 0, suit: '', number: 0, image: '/card_back.png' });
  const [playedCards, setPlayedCards] = useState<PlayedCard[]>([]);
  const [tricksTeam1, setTricksTeam1] = useState<number>(0);
  const [tricksTeam2, setTricksTeam2] = useState<number>(0);

  // Apuesta de la mano
  const [currentStake, setCurrentStake] = useState<number>(1);
  const [lastStakeAskedBy, setLastStakeAskedBy] = useState<'team1' | 'team2' | null>(null);

  // Turnos y temporizadores
  const [handLeader, setHandLeader] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [tumbaCountdown, setTumbaCountdown] = useState<number | null>(null);
  const tumbaCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Banderas de control de interacción
  const isProcessingRef = useRef<boolean>(false);
  const [isProcessingMove, setIsProcessingMove] = useState<boolean>(false);
  const [trickResult, setTrickResult] = useState<{ winningPlayer: number; winningTeam: number; message: string } | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const announcementTimer = useRef<NodeJS.Timeout | null>(null);

  // Referencias para evitar desincronización en closures asíncronos
  const pointsTeam1Ref = useRef(pointsTeam1);
  const pointsTeam2Ref = useRef(pointsTeam2);
  const partT1Ref = useRef(partT1);
  const partT2Ref = useRef(partT2);
  const allHandsRef = useRef(allHands);
  const playedCardsRef = useRef(playedCards);
  const currentTurnRef = useRef(currentTurn);
  const lifeCardRef = useRef(lifeCard);
  const tricksTeam1Ref = useRef(tricksTeam1);
  const tricksTeam2Ref = useRef(tricksTeam2);
  const currentStakeRef = useRef(currentStake);

  useEffect(() => { pointsTeam1Ref.current = pointsTeam1; }, [pointsTeam1]);
  useEffect(() => { pointsTeam2Ref.current = pointsTeam2; }, [pointsTeam2]);
  useEffect(() => { partT1Ref.current = partT1; }, [partT1]);
  useEffect(() => { partT2Ref.current = partT2; }, [partT2]);
  useEffect(() => { allHandsRef.current = allHands; }, [allHands]);
  useEffect(() => { playedCardsRef.current = playedCards; }, [playedCards]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);
  useEffect(() => { lifeCardRef.current = lifeCard; }, [lifeCard]);
  useEffect(() => { tricksTeam1Ref.current = tricksTeam1; }, [tricksTeam1]);
  useEffect(() => { tricksTeam2Ref.current = tricksTeam2; }, [tricksTeam2]);
  useEffect(() => { currentStakeRef.current = currentStake; }, [currentStake]);

  const triggerAnnouncement = (data: AnnouncementData, durationMs: number = 2500) => {
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    setAnnouncement(data);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(null);
    }, durationMs);
  };

  // -------------------------------------------------------------
  // REGLA OFICIAL DE PUNTOS Y TUMBA DE PARA ATRÁS (IDÉNTICA A 1 VS 1)
  // -------------------------------------------------------------
  const updatePointsAndTumba = (newT1: number, newT2: number) => {
    const oldT1 = pointsTeam1Ref.current;
    const oldT2 = pointsTeam2Ref.current;

    // Regla de "Tumba de para atrás" (en 8 piedras):
    // Solo se activa de manera decreciente cuando un equipo tiene >= 9 y cae a 8 puntos.
    // Si baja a 7 o menos, se desactiva por completo.
    // Si sube desde <= 7 a 8 puntos, NO se activa tumba de para atrás.
    if (oldT1 >= 9 && newT1 === 8) {
      partT1Ref.current = 1;
      setPartT1(1);
    } else if (newT1 !== 8) {
      partT1Ref.current = 0;
      setPartT1(0);
    }

    if (oldT2 >= 9 && newT2 === 8) {
      partT2Ref.current = 1;
      setPartT2(1);
    } else if (newT2 !== 8) {
      partT2Ref.current = 0;
      setPartT2(0);
    }

    pointsTeam1Ref.current = newT1;
    setPointsTeam1(newT1);
    pointsTeam2Ref.current = newT2;
    setPointsTeam2(newT2);
  };

  // -------------------------------------------------------------
  // REPARTO DE MANO Y FASE DE ANÁLISIS DE TUMBA (IDÉNTICO A 1 VS 1)
  // -------------------------------------------------------------
  const dealNewHand = useCallback((newLeaderIndex: number) => {
    if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
    setTumbaCountdown(null);

    playCardDealSound();

    // Barajar 40 cartas
    const deck = Array.from({ length: 40 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Repartir 3 cartas a cada uno de los 4 puestos
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
    setHandLeader(newLeaderIndex);

    // Estados de Tumba y Obligado
    const team1InTumba = (pointsTeam1Ref.current >= 9 || (partT1Ref.current === 1 && pointsTeam1Ref.current === 8));
    const team2InTumba = (pointsTeam2Ref.current >= 9 || (partT2Ref.current === 1 && pointsTeam2Ref.current === 8));
    const isObligado = team1InTumba && team2InTumba;

    // Caso 1: ¡ESTADO OBLIGADO! (Ambos en tumba o tumba de para atrás)
    if (isObligado) {
      isProcessingRef.current = false;
      setIsProcessingMove(false);
      triggerAnnouncement({
        type: 'tumba',
        title: '¡ESTADO OBLIGADO!',
        subtitle: '¡Mano definitiva! El que gane 2 de 3 bazas gana el juego',
        badge: 'ÚLTIMA MANO'
      }, 3500);
      speakPhrase("¡Obligado! Quien gane esta mano gana la partida.");
      vibrateDevice('tumba');
      playSynthSound('tumba');

      setCurrentTurn(newLeaderIndex);
      currentTurnRef.current = newLeaderIndex;
      setTimeLeft(30);

      if (newLeaderIndex !== 0) {
        triggerBotPlay(newLeaderIndex);
      }
      return;
    }

    // Caso 2: TU EQUIPO ESTÁ EN TUMBA
    // Fase de análisis de 10 segundos limpia (sin popups que tapen la mesa)
    if (team1InTumba) {
      isProcessingRef.current = true;
      setIsProcessingMove(true);
      setCurrentTurn(-1);

      triggerAnnouncement({
        type: 'tumba',
        title: '¡ESTÁS EN TUMBA!',
        subtitle: 'Analiza tus 3 cartas y La Vida. Tienes 10 segundos.',
        badge: 'TUMBA: 10 SEGUNDOS'
      }, 3500);
      speakPhrase("¡Estás en tumba! Analiza tus cartas y la vida durante diez segundos.");
      vibrateDevice('tumba');
      playSynthSound('tumba');

      let count = 10;
      setTumbaCountdown(count);

      tumbaCountdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setTumbaCountdown(count);
        } else {
          if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
          setTumbaCountdown(null);

          // Una vez concluidos los 10 segundos, mostrar el modal de decisión (idéntico a 1 vs 1)
          Swal.fire({
            title: "¿Deseas jugar esta ronda en TUMBA?",
            text: "Si aceptas y pierdes, se te restarán 3 piedras. Si rechazas, se te resta 1 piedra y se le suma al contrario.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, acepto jugar",
            cancelButtonText: "No, paso esta mano",
            confirmButtonColor: "#22c55e",
            cancelButtonColor: "#ef4444",
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then((result) => {
            if (result.isConfirmed) {
              // Acepta jugar en Tumba
              isProcessingRef.current = false;
              setIsProcessingMove(false);
              triggerAnnouncement({
                type: 'tumba',
                title: '¡A JUGAR EN TUMBA!',
                subtitle: newLeaderIndex === 0 ? 'Te toca salir a ti' : `Sale jugando ${players[newLeaderIndex]?.name}`,
                badge: 'MANO DE TUMBA'
              }, 2500);
              speakPhrase("Aceptaste jugar en Tumba.");

              setCurrentTurn(newLeaderIndex);
              currentTurnRef.current = newLeaderIndex;
              setTimeLeft(30);

              if (newLeaderIndex !== 0) {
                triggerBotPlay(newLeaderIndex);
              }
            } else {
              // Decide pasar la mano
              isProcessingRef.current = false;
              setIsProcessingMove(false);
              const newT1 = Math.max(0, pointsTeam1Ref.current - 1);
              const newT2 = pointsTeam2Ref.current + 1;
              updatePointsAndTumba(newT1, newT2);

              speakPhrase("Pasaste en Tumba. Menos una piedra.");
              vibrateDevice('reject');
              playSynthSound('reject');

              Swal.fire({
                title: "Pasaste en Tumba (-1 piedra para ti, +1 para el rival)",
                showConfirmButton: false,
                timer: 2000,
                color: "#ffffff",
                background: "#1a0e06"
              }).then(() => {
                if (newT2 >= 10) {
                  endGame(2);
                } else {
                  dealNewHand((newLeaderIndex + 1) % 4);
                }
              });
            }
          });
        }
      }, 1000);
      return;
    }

    // Caso 3: LOS RIVALES ESTÁN EN TUMBA
    if (team2InTumba) {
      isProcessingRef.current = true;
      setIsProcessingMove(true);
      setCurrentTurn(-1);

      triggerAnnouncement({
        type: 'tumba',
        title: '¡RIVALES EN TUMBA!',
        subtitle: 'Los rivales analizan si juegan o pasan (10 segundos)...',
        badge: 'RIVALES TUMBAN'
      }, 3500);
      speakPhrase("Los rivales están en tumba y están analizando sus cartas.");
      vibrateDevice('tumba');
      playSynthSound('tumba');

      let oppCount = 10;
      setTumbaCountdown(oppCount);

      tumbaCountdownTimerRef.current = setInterval(() => {
        oppCount -= 1;
        if (oppCount > 0) {
          setTumbaCountdown(oppCount);
        } else {
          if (tumbaCountdownTimerRef.current) clearInterval(tumbaCountdownTimerRef.current);
          setTumbaCountdown(null);

          // Evaluar cartas de rivales (Jacinto y El Llanero)
          const r1Cards = hands[1];
          const r2Cards = hands[3];
          const totalTrumps = [...r1Cards, ...r2Cards].filter(c => isTrumpCard(c.id, trumpCard.id)).length;
          const hasTopTrump = [...r1Cards, ...r2Cards].some(c => evaluateCard(c.id, trumpCard.id) >= 26);

          if (totalTrumps >= 2 || hasTopTrump) {
            // Rivales aceptan jugar
            isProcessingRef.current = false;
            setIsProcessingMove(false);
            triggerAnnouncement({
              type: 'tumba',
              title: '¡LOS RIVALES JUEGAN LA TUMBA!',
              subtitle: 'Se disputa el partido en esta mano',
              badge: 'MANO DE TUMBA'
            }, 2500);
            speakPhrase("Los rivales han aceptado jugar la Tumba.");

            setCurrentTurn(newLeaderIndex);
            currentTurnRef.current = newLeaderIndex;
            setTimeLeft(30);

            if (newLeaderIndex !== 0) {
              triggerBotPlay(newLeaderIndex);
            }
          } else {
            // Rivales deciden pasar (-1 a ellos, +1 a ti)
            isProcessingRef.current = false;
            setIsProcessingMove(false);
            const newT2 = Math.max(0, pointsTeam2Ref.current - 1);
            const newT1 = pointsTeam1Ref.current + 1;
            updatePointsAndTumba(newT1, newT2);

            speakPhrase("Los rivales pasaron en Tumba. Más una piedra.");
            vibrateDevice('winRound');
            playSynthSound('win');

            Swal.fire({
              title: "¡Los rivales pasaron en Tumba! (+1 piedra para ti, -1 para ellos)",
              showConfirmButton: false,
              timer: 2000,
              color: "#ffffff",
              background: "#1a0e06"
            }).then(() => {
              if (newT1 >= 10) {
                endGame(1);
              } else {
                dealNewHand((newLeaderIndex + 1) % 4);
              }
            });
          }
        }
      }, 1000);
      return;
    }

    // Caso 4: Mano normal
    isProcessingRef.current = false;
    setIsProcessingMove(false);
    setCurrentTurn(newLeaderIndex);
    currentTurnRef.current = newLeaderIndex;
    setTimeLeft(30);

    if (newLeaderIndex !== 0) {
      triggerBotPlay(newLeaderIndex);
    }
  }, []);

  // -------------------------------------------------------------
  // TEMPORIZADOR DE 30 SEGUNDOS (IDÉNTICO A 1 VS 1)
  // -------------------------------------------------------------
  useEffect(() => {
    if (currentTurn !== 0 || isProcessingRef.current || tumbaCountdown !== null) {
      return;
    }

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-jugada legal de carta cuando se agotan los 30s
          handleTimeoutAutoPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, tumbaCountdown]);

  const handleTimeoutAutoPlay = () => {
    const myCards = allHandsRef.current[0] || [];
    if (myCards.length === 0) return;

    const currentLifeId = lifeCardRef.current.id;
    const currentPlayed = playedCardsRef.current;
    const isLeadTrump = currentPlayed.length > 0 && isTrumpCard(currentPlayed[0].card.id, currentLifeId);
    const trumpsInHand = myCards.filter(c => isTrumpCard(c.id, currentLifeId));

    // Si aplica el pelao, obligatoriamente tirar triunfo
    const legalCard = (isLeadTrump && trumpsInHand.length > 0) ? trumpsInHand[0] : myCards[0];
    handlePlayCard(0, legalCard);
  };

  // -------------------------------------------------------------
  // INTELIGENCIA ARTIFICIAL DE LOS 3 BOTS
  // -------------------------------------------------------------
  const chooseBotCard = (seatIdx: number, hand: Card[]): Card => {
    const currentLifeId = lifeCardRef.current.id;
    const currentPlayed = playedCardsRef.current;

    // Regla del Pelao: Si salieron con triunfo y tiene triunfos, obligatorio tirar triunfo
    const isLeadTrump = currentPlayed.length > 0 && isTrumpCard(currentPlayed[0].card.id, currentLifeId);
    const trumpsInHand = hand.filter(c => isTrumpCard(c.id, currentLifeId));
    const candidateCards = (isLeadTrump && trumpsInHand.length > 0) ? trumpsInHand : hand;

    if (candidateCards.length === 1) return candidateCards[0];

    // Si el bot abre la baza
    if (currentPlayed.length === 0) {
      // Guardar triunfos altos y salir con carta común más baja
      const nonTrumps = candidateCards.filter(c => !isTrumpCard(c.id, currentLifeId));
      if (nonTrumps.length > 0) {
        return nonTrumps.sort((a, b) => (a.number - b.number))[0];
      }
      return candidateCards.sort((a, b) => evaluateCard(a.id, currentLifeId) - evaluateCard(b.id, currentLifeId))[0];
    }

    // Si responde a una baza ya iniciada: Determinar la carta ganadora actual
    let bestPlayed = currentPlayed[0];
    for (let i = 1; i < currentPlayed.length; i++) {
      const beats = determineWinnerOfTwo(bestPlayed.card.id, currentPlayed[i].card.id, currentLifeId, true);
      if (!beats) {
        bestPlayed = currentPlayed[i];
      }
    }

    const currentWinnerSeat = bestPlayed.playerIndex;
    const currentWinnerTeam = (currentWinnerSeat === 0 || currentWinnerSeat === 2) ? 1 : 2;
    const botTeam = (seatIdx === 0 || seatIdx === 2) ? 1 : 2;

    // Si su propio compañero de equipo ya está ganando la baza
    if (currentWinnerTeam === botTeam) {
      const winPower = evaluateCard(bestPlayed.card.id, currentLifeId);
      // Si la carta del compañero es muy alta (poder >= 24), no gastar triunfo, echar carta baja
      if (winPower >= 24) {
        return candidateCards.sort((a, b) =>
          evaluateCard(a.id, currentLifeId) - evaluateCard(b.id, currentLifeId)
        )[0];
      }
    }

    // Si el rival va ganando la baza: buscar la carta más económica que le gane
    const winningCards = candidateCards.filter(c =>
      !determineWinnerOfTwo(bestPlayed.card.id, c.id, currentLifeId, true)
    );

    if (winningCards.length > 0) {
      // Ordenar ganadoras por poder ascendente y tirar la mínima necesaria
      return winningCards.sort((a, b) =>
        evaluateCard(a.id, currentLifeId) - evaluateCard(b.id, currentLifeId)
      )[0];
    }

    // Si no le puede ganar: tirar la carta más baja
    return candidateCards.sort((a, b) =>
      evaluateCard(a.id, currentLifeId) - evaluateCard(b.id, currentLifeId)
    )[0];
  };

  const triggerBotPlay = (botSeat: number) => {
    isProcessingRef.current = true;
    setIsProcessingMove(true);

    // Pausa de 1 segundo para que la jugada se sienta natural
    setTimeout(() => {
      const botHand = allHandsRef.current[botSeat] || [];
      if (botHand.length === 0) {
        isProcessingRef.current = false;
        setIsProcessingMove(false);
        return;
      }

      const chosenCard = chooseBotCard(botSeat, botHand);
      handlePlayCard(botSeat, chosenCard);
    }, 1000);
  };

  // -------------------------------------------------------------
  // ACCIÓN DE JUGAR UNA CARTA (USUARIO O BOT)
  // -------------------------------------------------------------
  const handlePlayCard = (seatIdx: number, card: Card) => {
    playCardSound();
    vibrateDevice([30]);

    // Remover de la mano del jugador
    const currentHands = { ...allHandsRef.current };
    currentHands[seatIdx] = (currentHands[seatIdx] || []).filter(c => c.id !== card.id);
    setAllHands(currentHands);
    allHandsRef.current = currentHands;

    // Colocar en el tapete
    const newPlayed = [...playedCardsRef.current, { playerIndex: seatIdx, card }];
    setPlayedCards(newPlayed);
    playedCardsRef.current = newPlayed;

    // Verificar si faltan jugadores en la baza
    if (newPlayed.length < 4) {
      const nextTurn = (seatIdx + 1) % 4;
      setCurrentTurn(nextTurn);
      currentTurnRef.current = nextTurn;
      setTimeLeft(30);

      if (nextTurn === 0) {
        isProcessingRef.current = false;
        setIsProcessingMove(false);
      } else {
        triggerBotPlay(nextTurn);
      }
    } else {
      // ¡Las 4 cartas fueron jugadas! Resolver la baza
      resolveTrick(newPlayed);
    }
  };

  // -------------------------------------------------------------
  // RESOLUCIÓN DE BAZA (4 CARTAS EN MESA) CON PAUSA DE 2.4s
  // -------------------------------------------------------------
  const resolveTrick = (trickCards: PlayedCard[]) => {
    isProcessingRef.current = true;
    setIsProcessingMove(true);
    setCurrentTurn(-1);

    const currentLifeId = lifeCardRef.current.id;

    // Evaluar ganador de las 4 cartas
    let bestPlayed = trickCards[0];
    for (let i = 1; i < trickCards.length; i++) {
      const beats = determineWinnerOfTwo(bestPlayed.card.id, trickCards[i].card.id, currentLifeId, true);
      if (!beats) {
        bestPlayed = trickCards[i];
      }
    }

    const winningSeat = bestPlayed.playerIndex;
    const winningTeam = (winningSeat === 0 || winningSeat === 2) ? 1 : 2;
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

    // ---------------------------------------------------------
    // DETECCIÓN DE LA COGÍA (10 DE ORO MATADO CON 1 DE ORO)
    // En tumba la cogía NO vale (no aplica en fase de tumba)
    // ---------------------------------------------------------
    const isAnyTumba = (pointsTeam1Ref.current >= 9 || (partT1Ref.current === 1 && pointsTeam1Ref.current === 8)) ||
                       (pointsTeam2Ref.current >= 9 || (partT2Ref.current === 1 && pointsTeam2Ref.current === 8));

    const hasTenGold = trickCards.some(p => p.card.id === 7);
    const hasOneGold = trickCards.some(p => p.card.id === 0);

    if (!isAnyTumba && hasTenGold && hasOneGold) {
      const tenGoldIdx = trickCards.findIndex(p => p.card.id === 7);
      const oneGoldIdx = trickCards.findIndex(p => p.card.id === 0);

      // La Cogía ocurre cuando el 1 de Oro se tira para matar el 10 de Oro de un rival
      if (oneGoldIdx > tenGoldIdx) {
        const tenGoldPlayer = trickCards[tenGoldIdx].playerIndex;
        const oneGoldPlayer = trickCards[oneGoldIdx].playerIndex;
        const tenGoldTeam = (tenGoldPlayer === 0 || tenGoldPlayer === 2) ? 1 : 2;
        const oneGoldTeam = (oneGoldPlayer === 0 || oneGoldPlayer === 2) ? 1 : 2;

        if (tenGoldTeam !== oneGoldTeam) {
          if (oneGoldTeam === 1) {
            const newT1 = pointsTeam1Ref.current + 3;
            updatePointsAndTumba(newT1, pointsTeam2Ref.current);
            speakPhrase("¡La Cogía! Mataron el diez con el As de Oro.");
            vibrateDevice('winMatch');
            playSynthSound('win');
            triggerAnnouncement({
              type: 'la_cogia',
              title: '¡LA COGÍA!',
              subtitle: '¡Mataron el 10 con el As de Oro!',
              badge: '+3 piedras automáticas'
            }, 3000);

            if (newT1 >= 10) {
              endGame(1);
              return;
            }
          } else {
            const newT2 = pointsTeam2Ref.current + 3;
            updatePointsAndTumba(pointsTeam1Ref.current, newT2);
            speakPhrase("¡La Cogía para los rivales!");
            vibrateDevice('reject');
            playSynthSound('reject');
            triggerAnnouncement({
              type: 'la_cogia',
              title: '¡LA COGÍA RIVAL!',
              subtitle: 'Mataron el 10 con el As de Oro',
              badge: '+3 piedras rivales'
            }, 3000);

            if (newT2 >= 10) {
              endGame(2);
              return;
            }
          }
        }
      }
    }

    // 1. PAUSA GENEROSA DE 2.4 SEGUNDOS: Cartas visibles perfectamente en la mesa
    setTimeout(() => {
      playSwooshSound();

      // 2. Limpiar la mesa
      setPlayedCards([]);
      playedCardsRef.current = [];
      setTrickResult(null);

      // Verificar si un equipo ya ganó 2 bazas
      if (newT1Tricks >= 2) {
        resolveHandWinner(1);
      } else if (newT2Tricks >= 2) {
        resolveHandWinner(2);
      } else if (newT1Tricks + newT2Tricks === 3) {
        if (newT1Tricks > newT2Tricks) resolveHandWinner(1);
        else resolveHandWinner(2);
      } else {
        // La mano continúa: el ganador de la baza anterior sale jugando
        setCurrentTurn(winningSeat);
        currentTurnRef.current = winningSeat;
        setTimeLeft(30);

        if (winningSeat === 0) {
          isProcessingRef.current = false;
          setIsProcessingMove(false);
        } else {
          triggerBotPlay(winningSeat);
        }
      }
    }, 2400);
  };

  // -------------------------------------------------------------
  // RESOLUCIÓN DE GANADOR DE LA MANO (IDÉNTICO A LÍNEAS 680-760 EN 1v1)
  // -------------------------------------------------------------
  const resolveHandWinner = (winningTeam: number) => {
    isProcessingRef.current = true;
    setIsProcessingMove(true);
    setCurrentTurn(-1);

    const team1WonHand = winningTeam === 1;

    const team1InTumba = (pointsTeam1Ref.current >= 9 || (partT1Ref.current === 1 && pointsTeam1Ref.current === 8));
    const team2InTumba = (pointsTeam2Ref.current >= 9 || (partT2Ref.current === 1 && pointsTeam2Ref.current === 8));
    const isObligado = team1InTumba && team2InTumba;

    if (isObligado) {
      if (team1WonHand) {
        speakPhrase("¡Ganaste la partida en obligado!");
        vibrateDevice('winMatch');
        playSynthSound('win');
        Swal.fire({
          title: "¡GANASTE LA PARTIDA EN OBLIGADO!",
          icon: "success",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#22c55e"
        }).then(() => endGame(1));
      } else {
        speakPhrase("Los rivales ganan en obligado");
        vibrateDevice('reject');
        playSynthSound('reject');
        Swal.fire({
          title: "¡LOS RIVALES GANAN EN OBLIGADO!",
          icon: "error",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#ef4444"
        }).then(() => endGame(2));
      }
      return;
    }

    if (team1InTumba) {
      if (team1WonHand) {
        speakPhrase("¡Ganaste la partida! Tumba completada.");
        vibrateDevice('winMatch');
        playSynthSound('win');
        Swal.fire({
          title: "¡GANASTE LA PARTIDA! (Tumba completada)",
          icon: "success",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#22c55e"
        }).then(() => endGame(1));
        return;
      } else {
        // Tu equipo estaba en Tumba y perdió: -3 piedras para ti, +3 para el rival
        const newT1 = Math.max(0, pointsTeam1Ref.current - 3);
        const newT2 = pointsTeam2Ref.current + 3;
        updatePointsAndTumba(newT1, newT2);

        speakPhrase("Perdiste en tumba. Menos tres piedras.");
        vibrateDevice('reject');
        playSynthSound('reject');

        Swal.fire({
          title: "Perdiste en Tumba (-3 piedras para tu equipo, +3 para el rival)",
          icon: "error",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#ef4444"
        }).then(() => {
          if (newT2 >= 10) {
            endGame(2);
          } else {
            dealNewHand((handLeader + 1) % 4);
          }
        });
        return;
      }
    } else if (team2InTumba) {
      if (!team1WonHand) {
        speakPhrase("Los rivales ganan la partida");
        vibrateDevice('reject');
        playSynthSound('reject');
        Swal.fire({
          title: "¡LOS RIVALES GANAN LA PARTIDA! (Tumba completada)",
          icon: "error",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#ef4444"
        }).then(() => endGame(2));
        return;
      } else {
        // Los rivales estaban en Tumba y perdieron: +3 para ti, -3 para ellos
        const newT1 = pointsTeam1Ref.current + 3;
        const newT2 = Math.max(0, pointsTeam2Ref.current - 3);
        updatePointsAndTumba(newT1, newT2);

        speakPhrase("¡El rival cayó en tumba! Más tres piedras para ti.");
        vibrateDevice('winRound');
        playSynthSound('win');

        Swal.fire({
          title: "¡El rival cayó en Tumba! (+3 piedras para tu equipo, -3 para ellos)",
          icon: "success",
          background: "#1a0e06",
          color: "#fff",
          confirmButtonColor: "#22c55e"
        }).then(() => {
          if (newT1 >= 10) {
            endGame(1);
          } else {
            dealNewHand((handLeader + 1) % 4);
          }
        });
        return;
      }
    } else {
      // Mano normal
      const stake = currentStakeRef.current;
      if (team1WonHand) {
        const newT1 = Math.min(9, pointsTeam1Ref.current + stake);
        updatePointsAndTumba(newT1, pointsTeam2Ref.current);

        speakPhrase(stake > 1 ? `¡Ganaron la mano! Más ${stake} piedras.` : "¡Punto para tu equipo!");
        vibrateDevice('winRound');
        playSynthSound('win');

        triggerAnnouncement({
          type: 'win_round',
          title: '¡GANARON LA RONDA!',
          subtitle: stake > 1 ? `Te llevas ${stake} piedras` : 'Sumas 1 piedra a tu cuenta',
          badge: `Marcador: ${newT1} - ${pointsTeam2Ref.current}`
        }, 2500);

        Swal.fire({
          title: stake > 1 ? `¡Ganaron la mano! (+${stake} piedras)` : "¡Punto para tu equipo!",
          showConfirmButton: false,
          timer: 2000,
          background: "#1a0e06",
          color: "#fff"
        }).then(() => {
          dealNewHand((handLeader + 1) % 4);
        });
      } else {
        const newT2 = Math.min(9, pointsTeam2Ref.current + stake);
        updatePointsAndTumba(pointsTeam1Ref.current, newT2);

        speakPhrase(stake > 1 ? `Los rivales ganan la mano. Más ${stake} piedras.` : "Punto para los rivales");
        vibrateDevice('reject');
        playSynthSound('reject');

        triggerAnnouncement({
          type: 'opp_win_round',
          title: 'RIVALES GANAN LA RONDA',
          subtitle: stake > 1 ? `El rival suma ${stake} piedras` : 'El rival suma 1 piedra',
          badge: `Marcador: ${pointsTeam1Ref.current} - ${newT2}`
        }, 2500);

        Swal.fire({
          title: stake > 1 ? `Los rivales ganan la mano (+${stake} piedras)` : "Punto para los rivales",
          showConfirmButton: false,
          timer: 2000,
          background: "#1a0e06",
          color: "#fff"
        }).then(() => {
          dealNewHand((handLeader + 1) % 4);
        });
      }
    }
  };

  // -------------------------------------------------------------
  // FIN DE PARTIDA
  // -------------------------------------------------------------
  const endGame = (winnerTeam: number) => {
    const isWinner = winnerTeam === 1;

    Swal.fire({
      title: isWinner ? '🏆 ¡VICTORIA 2 VS 2!' : '💀 DERROTA',
      html: `
        <div style="text-align: center; font-size: 14px; padding: 6px 0;">
          <h2 style="color: ${isWinner ? '#4ade80' : '#f87171'}; font-size: 20px; font-weight: 900; margin-bottom: 8px;">
            ${isWinner ? '¡TU EQUIPO HA GANADO EL PARTIDO!' : 'EL EQUIPO RIVAL HA GANADO'}
          </h2>
          <div style="background: rgba(0,0,0,0.5); border: 2px solid ${isWinner ? '#22c55e' : '#ef4444'}; border-radius: 16px; padding: 12px; margin-bottom: 12px;">
            <p style="font-size: 16px; font-weight: 800; color: #facc15;">
              Marcador Final: <strong>${pointsTeam1Ref.current}</strong> (Azul) - <strong>${pointsTeam2Ref.current}</strong> (Rojo)
            </p>
          </div>
          <p style="color: #cbd5e1; font-size: 12px;">
            Partida finalizada. Reglas oficiales del Pericón aplicadas correctamente.
          </p>
        </div>
      `,
      icon: isWinner ? 'success' : 'error',
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
        setPartT1(0);
        setPartT2(0);
        partT1Ref.current = 0;
        partT2Ref.current = 0;
        dealNewHand(0);
      } else {
        router.push('/desk');
      }
    });
  };

  // -------------------------------------------------------------
  // BOTÓN DE PEDIR AUMENTO (1 -> 3 -> 6 -> 9)
  // -------------------------------------------------------------
  const handlePedir = () => {
    const team1InTumba = (pointsTeam1 >= 9 || (partT1 === 1 && pointsTeam1 === 8));
    const team2InTumba = (pointsTeam2 >= 9 || (partT2 === 1 && pointsTeam2 === 8));

    if (team1InTumba || team2InTumba) {
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

    if (lastStakeAskedBy === 'team1' && currentStake > 1) {
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
    setLastStakeAskedBy('team1');
    setCurrentStake(nextStake);
    triggerAnnouncement({
      type: stakeType,
      title: `¡PIDO ${nextStake}!`,
      subtitle: `La mano ahora vale ${nextStake} piedras`
    });
    speakPhrase(`¡Pido ${nextStake}!`);
  };

  // -------------------------------------------------------------
  // INICIO AL CARGAR LA PÁGINA
  // -------------------------------------------------------------
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
            {((pointsTeam1 >= 9 || (partT1 === 1 && pointsTeam1 === 8)) && (pointsTeam2 >= 9 || (partT2 === 1 && pointsTeam2 === 8))) ? (
              <span className="bg-red-600 text-white text-[7.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse ml-0.5">
                OBLIGADO
              </span>
            ) : ((pointsTeam1 >= 9 || (partT1 === 1 && pointsTeam1 === 8)) || (pointsTeam2 >= 9 || (partT2 === 1 && pointsTeam2 === 8))) ? (
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
          
          {/* Indicador de Análisis de Tumba (10 segundos limpios para mirar tus cartas) */}
          {tumbaCountdown !== null && (
            <div className='flex justify-center mb-1 animate-pulse z-30'>
              <div className='flex items-center gap-2 bg-gradient-to-r from-stone-950 via-black to-stone-950 border-2 border-yellow-400 text-yellow-300 px-3 py-0.5 sm:py-1 rounded-xl shadow-2xl'>
                <span className='text-xs'>⏳</span>
                <span className='font-black text-[9px] sm:text-xs tracking-wide uppercase'>ANALIZA TUS 3 CARTAS Y LA VIDA</span>
                <div className='bg-yellow-400 text-black font-black text-[9px] sm:text-xs px-2 py-0.2 rounded-full shadow'>
                  {tumbaCountdown}s
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
                const team1InTumba = (pointsTeam1 >= 9 || (partT1 === 1 && pointsTeam1 === 8));
                const team2InTumba = (pointsTeam2 >= 9 || (partT2 === 1 && pointsTeam2 === 8));
                const isTumbaActive = team1InTumba || team2InTumba;
                const cannotRaise = lastStakeAskedBy === 'team1' && currentStake > 1;
                const isPedirDisabled = currentStake >= 9 || isProcessingMove || isTumbaActive || tumbaCountdown !== null || cannotRaise;
                
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

              const isTurn = currentTurn === 0 && !isProcessingMove && tumbaCountdown === null;
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
