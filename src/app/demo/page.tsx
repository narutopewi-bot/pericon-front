"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as fonts from "@/components/fonts";
import { Carta } from "@/lib/library";
import { playCardSound, playVoiceAudio } from "@/lib/gameEffects";
import { playCoinWinSound } from "@/lib/soundEffects";

interface DemoCard {
  id: number;
  code: number;
  image: string;
  suit: string;
  number: number;
  power: number;
}

// Generador de cartas simplificado pero fiel a la Baraja Española
function createCard(code: number, isViraSuit: boolean): DemoCard {
  const suits = ["gold", "cups", "swords", "clubs"];
  const suitIndex = Math.floor(code / 10);
  const suit = suits[suitIndex] || "gold";
  const numIndex = code % 10;
  const numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const number = numbers[numIndex] || 1;

  // Poder jerárquico tradicional de cartas
  let power = number;
  if (number === 1) power = 14; // As alto
  if (number === 7) power = 13; // 7 alto
  if (number === 12) power = 12; // Rey
  if (number === 11) power = 11; // Caballo
  if (number === 10) power = 10; // Sota

  // Si es del palo de triunfo (Vira), tiene poder supremo
  if (isViraSuit) {
    power += 100;
    // 5 de Oro o carta vira especial
    if (number === 5 && suit === "gold") power += 500;
  }

  return {
    id: code,
    code,
    image: Carta(code),
    suit,
    number,
    power,
  };
}

export default function DemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promoFromUrl = searchParams.get("promo") || searchParams.get("ref") || "DEMO400";

  // Estado del juego
  const [viraCard, setViraCard] = useState<DemoCard | null>(null);
  const [playerCards, setPlayerCards] = useState<DemoCard[]>([]);
  const [botCards, setBotCards] = useState<DemoCard[]>([]);
  
  const [tablePlayerCard, setTablePlayerCard] = useState<DemoCard | null>(null);
  const [tableBotCard, setTableBotCard] = useState<DemoCard | null>(null);

  const [playerTricks, setPlayerTricks] = useState<number>(0);
  const [botTricks, setBotTricks] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);

  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [roundMessage, setRoundMessage] = useState<string>("¡Tu turno! Toca una carta para jugarla a la mesa.");
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [playerWon, setPlayerWon] = useState<boolean>(false);

  // Inicializar mano de prueba
  const dealHand = () => {
    // Vira de triunfo (ej: 0 = 1 de Oro)
    const viraCode = 0; // 1 de Oro
    const vira = createCard(viraCode, true);
    setViraCard(vira);

    // Cartas atractivas y ganadoras para el jugador novato (ej: Rey de Oro, 7 de Espadas, 3 de Copas)
    // 9 = 12 de Oro (triunfo alto), 26 = 7 de Espadas, 12 = 3 de Copas
    const pCards = [
      createCard(9, true),  // Rey de Oro (Triunfo)
      createCard(26, false), // 7 de Espadas
      createCard(12, false), // 3 de Copas
    ];
    setPlayerCards(pCards);

    // Cartas de Cheo el Bot (un poco más débiles para que el jugador sienta el triunfo)
    const bCards = [
      createCard(34, false), // 5 de Bastos
      createCard(17, false), // 10 de Copas
      createCard(1, true),   // 2 de Oro (Triunfo menor)
    ];
    setBotCards(bCards);

    setTablePlayerCard(null);
    setTableBotCard(null);
    setPlayerTricks(0);
    setBotTricks(0);
    setCurrentRound(1);
    setIsPlayerTurn(true);
    setRoundMessage("¡Tu turno! Juega una carta para llevarte la primera baza.");
    setGameFinished(false);
    setPlayerWon(false);
    playCardSound();
  };

  useEffect(() => {
    dealHand();
  }, []);

  // Jugar carta del jugador
  const playPlayerCard = (card: DemoCard) => {
    if (!isPlayerTurn || gameFinished || tablePlayerCard) return;

    playCardSound();
    setTablePlayerCard(card);
    setPlayerCards((prev) => prev.filter((c) => c.id !== card.id));
    setIsPlayerTurn(false);
    setRoundMessage("Cheo el Bot está pensando su jugada...");

    // Cheo responde tras 1 segundo
    setTimeout(() => {
      botPlayCard(card);
    }, 900);
  };

  // Cheo el bot tira su carta y se define la baza
  const botPlayCard = (playerPlayed: DemoCard) => {
    if (botCards.length === 0) return;

    // Cheo elige una carta
    const chosenBotCard = botCards[0];
    playCardSound();
    setTableBotCard(chosenBotCard);
    setBotCards((prev) => prev.slice(1));

    // Evaluar quién gana la baza
    const playerWinsTrick = playerPlayed.power >= chosenBotCard.power;

    setTimeout(() => {
      let newPlayerTricks = playerTricks;
      let newBotTricks = botTricks;

      if (playerWinsTrick) {
        newPlayerTricks++;
        setPlayerTricks(newPlayerTricks);
        setRoundMessage("¡Ganaste la baza! Llevas la delantera.");
      } else {
        newBotTricks++;
        setBotTricks(newBotTricks);
        setRoundMessage("Cheo se llevó esta baza.");
      }

      // Limpiar mesa para la siguiente ronda tras 1.2 segundos
      setTimeout(() => {
        setTablePlayerCard(null);
        setTableBotCard(null);

        // Si alguien llegó a 2 bazas o se terminaron las 3 cartas
        if (newPlayerTricks >= 2 || (currentRound === 3 && newPlayerTricks > newBotTricks)) {
          setGameFinished(true);
          setPlayerWon(true);
          playCoinWinSound();
          try {
            playVoiceAudio("mas_18");
          } catch { }
        } else if (newBotTricks >= 2) {
          setGameFinished(true);
          setPlayerWon(false);
        } else {
          setCurrentRound((prev) => prev + 1);
          setIsPlayerTurn(true);
          setRoundMessage("¡Tu turno para la siguiente baza!");
        }
      }, 1200);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#0d0907] flex flex-col items-center justify-between p-3 select-none relative overflow-hidden">
      {/* Fondo de Tapete de Cuero y Caoba */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1c120c] via-[#0f0a06] to-[#050302] z-0"></div>

      {/* Header superior */}
      <div className="w-full max-w-md flex items-center justify-between z-10 pt-1 border-b border-amber-500/20 pb-2">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:text-amber-300">
          <span>‹</span>
          <span>Volver al Inicio</span>
        </Link>
        <div className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-full text-[11px] font-black text-amber-300 uppercase tracking-wider">
          <span>🃏</span>
          <span>Modo Demo • 1 Mano Gratis</span>
        </div>
      </div>

      {/* Mesa de Juego */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-between py-2 z-10 relative">
        {/* Zona de Cheo el Bot */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 bg-black/60 border border-slate-700/60 px-3 py-1 rounded-2xl shadow">
            <span className="text-xl">🤖</span>
            <div className="text-left">
              <span className="text-xs font-black text-slate-200 block">Cheo el Bot</span>
              <span className="text-[10px] text-amber-400 font-bold">Bazas ganadas: {botTricks}/2</span>
            </div>
          </div>

          {/* Cartas boca abajo de Cheo */}
          <div className="flex gap-1.5 justify-center h-16 items-center">
            {botCards.map((_, i) => (
              <div key={i} className="w-11 h-16 bg-neutral-900 border border-amber-600/60 rounded-lg shadow-md flex items-center justify-center transform -rotate-1">
                <span className="text-amber-500 text-xs font-bold">🎴</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zona Central: Mesa y Triunfo (Vira) */}
        <div className="my-auto flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-6">
            {/* Vira de triunfo */}
            {viraCard && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-black uppercase text-amber-300 bg-black/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                  Triunfo (Vira)
                </span>
                <div className="w-14 h-20 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400 transform rotate-12 transition-all">
                  <Image src={viraCard.image} alt="Vira" width={56} height={80} className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Cartas jugadas a la mesa */}
            <div className="flex gap-2 items-center justify-center min-h-[90px] w-36 bg-black/40 border border-amber-500/20 rounded-2xl p-2 shadow-inner">
              {tableBotCard && (
                <div className="w-14 h-20 rounded-xl overflow-hidden shadow-2xl border-2 border-red-400 animate-in fade-in zoom-in-75">
                  <Image src={tableBotCard.image} alt="Cheo" width={56} height={80} className="w-full h-full object-cover" />
                </div>
              )}
              {tablePlayerCard && (
                <div className="w-14 h-20 rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-400 animate-in fade-in zoom-in-75">
                  <Image src={tablePlayerCard.image} alt="Tú" width={56} height={80} className="w-full h-full object-cover" />
                </div>
              )}
              {!tableBotCard && !tablePlayerCard && (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">
                  Mesa Lista
                </span>
              )}
            </div>
          </div>

          {/* Mensaje de estado */}
          <div className="bg-black/80 border border-amber-500/40 px-4 py-1.5 rounded-2xl text-center shadow-lg max-w-[280px]">
            <p className="text-xs font-bold text-amber-200">{roundMessage}</p>
          </div>
        </div>

        {/* Zona del Jugador */}
        <div className="flex flex-col items-center gap-2">
          {/* Marcador propio */}
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🤠</span>
              <span className="text-xs font-black text-amber-300">Tú (Jugador)</span>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
              Bazas: {playerTricks}/2
            </span>
          </div>

          {/* Cartas del Jugador (Interactivas) */}
          <div className="flex gap-2.5 justify-center items-end min-h-[110px]">
            {playerCards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                onClick={() => playPlayerCard(card)}
                disabled={!isPlayerTurn}
                className={`w-20 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400 transition-all transform hover:-translate-y-3 hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer ${
                  idx === 0 ? "-rotate-3" : idx === 2 ? "rotate-3" : ""
                }`}
              >
                <Image src={card.image} alt={`Carta ${card.number}`} width={80} height={112} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Victoria (Conversión a Registro) */}
      {gameFinished && playerWon && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#1c1408] to-[#0a0703] border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/30 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-3xl shadow-lg animate-bounce">
              🏆
            </div>
            <h2 className={`${fonts.bowlbyOneSC.className} text-xl text-amber-300 tracking-wide`}>
              ¡GANASTE TU PRIMERA MANO!
            </h2>
            <p className="text-xs text-slate-300 leading-snug">
              Le diste una paliza limpia a Cheo el Bot. Tienes{" "}
              <strong className="text-amber-300 font-extrabold">+400 MONEDAS DE REGALO</strong> esperando por ti.
            </p>

            <div className="w-full bg-black/60 border border-amber-500/40 rounded-2xl p-3 my-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Bono de Victoria Desbloqueado:
              </span>
              <span className="text-2xl font-black text-amber-300 tracking-wider">
                🪙 400 MONEDAS
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Regístrate en 20 segundos para guardarlas y jugar por dinero real.
              </p>
            </div>

            <button
              onClick={() => router.push(`/registro?promo=${encodeURIComponent(promoFromUrl)}`)}
              className={`${fonts.bowlbyOneSC.className} w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/30 text-sm tracking-wider active:scale-95 transition-all`}
            >
              RECLAMAR 400 MONEDAS Y CREAR CUENTA ➜
            </button>

            <button
              onClick={dealHand}
              className="text-xs text-amber-400/80 hover:text-white underline cursor-pointer pt-1"
            >
              Repetir otra mano de prueba
            </button>
          </div>
        </div>
      )}

      {/* Modal si pierde la mano de prueba (para reintentar) */}
      {gameFinished && !playerWon && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-slate-700 rounded-3xl p-6 text-center flex flex-col items-center gap-3">
            <span className="text-4xl">😅</span>
            <h3 className={`${fonts.bowlbyOneSC.className} text-lg text-amber-400`}>
              Cheo se llevó esta mano
            </h3>
            <p className="text-xs text-slate-300">
              ¡No te preocupes! El Pericón es de revancha criolla. Vuelve a tirar tus cartas.
            </p>
            <button
              onClick={dealHand}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs uppercase tracking-wider transition"
            >
              Volver a jugar mano de prueba ↺
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
