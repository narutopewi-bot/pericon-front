"use client";

import * as React from 'react'
import Image from "next/image"
import * as fonts from "@/components/fonts"
import Duel from "./_components/duel"
import NewDuel from "./_components/newduel"
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { useSignalRContext } from '@/lib/signalrcontext';
import { useDispatch, useSelector } from "react-redux";

import { GamePlayer, setGamePlayer } from "@/store/slices/gameplayerSlice";
import { RootState } from "@/store/store";
import GameHeaderMenu from "@/components/game-header-menu";
import ProfileModal from "@/components/profile-modal";
import WalletModal from "@/components/wallet-modal";
import PericonTutorialModal from "@/components/pericon-tutorial-modal";
import LeaderboardModal from "@/components/leaderboard-modal";
import { playChatPopSound } from "@/lib/soundEffects";
import Swal from "sweetalert2";

export default function Desk() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [newopen, setNewopen] = React.useState(false);

  const showMaintenanceNotice = (moduleName: string) => {
    Swal.fire({
      title: `¡${moduleName.toUpperCase()} EN MANTENIMIENTO!`,
      html: `
        <div style="text-align: center; font-size: 14px; padding: 4px 0;">
          <p style="color: #cbd5e1; margin-bottom: 8px;">Estamos preparando y calibrando esta modalidad para las próximas actualizaciones del juego.</p>
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px; color: #fde68a; font-weight: bold;">
            ⚔️ Por ahora puedes competir en el modo <strong>DUELO</strong> (Solitario y 1 contra 1 por monedas).
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#d97706',
      background: '#1a0e06',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl'
      }
    });
  };

  const handleCreatePrivateRoom = () => {
    Swal.fire({
      title: 'CREAR SALA AMISTOSA 2 VS 2',
      html: `
        <div style="text-align: center; padding: 6px 0;">
          <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 12px; line-height: 1.5;">
            Esta es una <strong>Mesa Amistosa en Parejas</strong>.<br/>
            Costo de entrada por jugador: <strong style="color: #facc15; font-size: 16px;">10 monedas</strong> (tarifa para la casa).
          </p>
          <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 12px; padding: 10px; margin-bottom: 8px; color: #86efac; font-size: 13px;">
            ℹ️ En los amistosos creados no hay pozo de apuestas: ¡el objetivo es jugar con amigos y sumar victorias a tu récord!
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '¡Crear Sala (10 🪙)!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#475569',
      background: '#0a1a0f',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-emerald-500/50 rounded-3xl shadow-2xl'
      }
    }).then((res) => {
      if (res.isConfirmed) {
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const roomName = `sala-${randomCode}`;
        router.push(`/game2v2/${roomName}?bet=10&friendly=1&creator=1`);
      }
    });
  };

  const handleJoinPrivateRoom = () => {
    Swal.fire({
      title: 'UNIRSE A SALA AMISTOSA',
      html: `
        <div style="text-align: center; padding: 6px 0;">
          <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px;">
            Ingresa el código que te compartió tu amigo (ej: <strong>SALA-4821</strong> o <strong>4821</strong>) o pega el enlace completo.<br/>
            <span style="color: #facc15; font-weight: bold;">Tarifa de entrada: 10 monedas</span>
          </p>
          <input id="swal-room-code" type="text" placeholder="Ej: SALA-4821 o pega el link" style="width: 85%; background:#0f172a; border:1px solid #a855f7; border-radius:10px; padding:10px 14px; color:#e9d5ff; font-size:14px; font-weight:bold; text-align:center;" />
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Entrar a la Sala (10 🪙)',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#9333ea',
      cancelButtonColor: '#475569',
      background: '#15091e',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-purple-500/50 rounded-3xl shadow-2xl'
      },
      preConfirm: () => {
        const input = document.getElementById('swal-room-code') as HTMLInputElement;
        const val = (input?.value || '').trim();
        if (!val) {
          Swal.showValidationMessage('Ingresa un código de sala o enlace válido');
          return false;
        }
        return val;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        let inputVal = res.value.trim();
        let targetRoom = inputVal;

        if (inputVal.includes('/game2v2/')) {
          const afterSlash = inputVal.split('/game2v2/')[1];
          targetRoom = afterSlash.split('?')[0];
        } else {
          targetRoom = targetRoom.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          if (!targetRoom.startsWith('sala-') && !targetRoom.startsWith('match-')) {
            targetRoom = `sala-${targetRoom}`;
          }
        }

        router.push(`/game2v2/${targetRoom}?bet=10&friendly=1`);
      }
    });
  };

  // Estados de Modales: Perfil, Monedero, Tutorial y Ranking
  const [profileOpen, setProfileOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  interface AnnouncementPayload {
    id?: number;
    title?: string;
    message: string;
    type?: string;
    createdAt?: string;
  }
  const [globalAnnouncement, setGlobalAnnouncement] = useState<AnnouncementPayload | null>(null);

  const handleDismissAnnouncement = () => {
    if (globalAnnouncement?.id && typeof window !== "undefined") {
      try {
        localStorage.setItem(`pericon_dismissed_announcement_${globalAnnouncement.id}`, "true");
      } catch {}
    }
    setGlobalAnnouncement(null);
  };

  const dispatch = useDispatch();
  const connection = useSignalRContext(); 
  const hasConnected = React.useRef(false);
  const gamep = useSelector((state: RootState) => state.gameplayer);

  const [dataplayer, setDataplayer] = React.useState<GamePlayer>({
    id: "",
    name: "",
    email: "",
    coins: 100,
    active: true,
    wins: 0,
    losses: 0,
    level: "Novato",
    avatarUrl: "",
  });

  const isGuest = Boolean(
    dataplayer.name?.startsWith("Invitado_") ||
    dataplayer.id?.startsWith("guest_") ||
    gamep.name?.startsWith("Invitado_") ||
    gamep.id?.startsWith("guest_")
  );

  const showGuestRestrictedNotice = () => {
    Swal.fire({
      title: 'MODO INVITADO: SOLO AMISTOSOS',
      html: `
        <div style="text-align: center; font-size: 14px; padding: 6px 0;">
          <p style="color: #cbd5e1; margin-bottom: 12px; line-height: 1.5;">
            Como jugador invitado, únicamente puedes participar en <strong>Partidas Amistosas</strong> (Crear Sala o Unirte con código).
          </p>
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 12px; color: #fde68a; font-size: 13px; margin-bottom: 12px;">
            🪙 Para jugar <strong>Duelos 1 vs 1</strong> o competir por monedas y ranking, necesitas registrar tu cuenta oficial.
          </div>
          <p style="color: #94a3b8; font-size: 12px;">
            ¡El registro es rápido y podrás guardar tu progreso y premios!
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Crear Cuenta Oficial',
      cancelButtonText: 'Seguir como Invitado',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#475569',
      background: '#1a0e06',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl'
      }
    }).then((res) => {
      if (res.isConfirmed) {
        router.push("/registro");
      }
    });
  };

  const duelToggle = () => {
    if (isGuest) {
      showGuestRestrictedNotice();
      return;
    }
    setOpen(!open);
  };

  const duelToggle02 = () => {
    if (isGuest) {
      showGuestRestrictedNotice();
      return;
    }
    setNewopen(!newopen);
  };

  const handleFinishNewDuel = () => {
    setNewopen(false);
  };

  const openNewDuel = () => {
    if (isGuest) {
      showGuestRestrictedNotice();
      return;
    }
    setNewopen(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Verificar si ya vio el tutorial
      const seen = localStorage.getItem("pericon_tutorial_seen");
      if (!seen) {
        setTutorialOpen(true);
      }

      // Consultar aviso global activo del servidor
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";
      fetch(`${apiUrl}/api/admin/announcement/active`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.announcement) {
            const ann = data.announcement;
            const isDismissed = localStorage.getItem(`pericon_dismissed_announcement_${ann.id}`);
            if (!isDismissed) {
              setGlobalAnnouncement(ann);
            }
          }
        })
        .catch(() => {});

      const stored = localStorage.getItem("pericon_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u && u.username) {
            const playerObj = {
              id: u.id?.toString() || "1",
              name: u.username,
              email: u.email || "",
              coins: u.coins ?? 1000,
              wins: u.wins ?? 0,
              losses: u.losses ?? 0,
              level: u.level || "Novato",
              avatarUrl: u.avatarUrl || "",
              active: true,
            };
            dispatch(setGamePlayer(playerObj));
            setDataplayer(playerObj);

            // Sincronizar estadísticas desde la API
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";
            fetch(`${apiUrl}/api/user/${playerObj.id}/profile`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data) {
                  const updated = {
                    id: data.id?.toString() || playerObj.id,
                    name: data.username || playerObj.name,
                    email: data.email || playerObj.email,
                    coins: data.coins ?? playerObj.coins,
                    wins: data.wins ?? 0,
                    losses: data.losses ?? 0,
                    level: data.level || "Novato",
                    avatarUrl: data.avatarUrl || playerObj.avatarUrl,
                    active: true,
                  };
                  dispatch(setGamePlayer(updated));
                  setDataplayer(updated);

                  // Guardar inmediatamente en localStorage para persistir saldo
                  try {
                    const rawStored = localStorage.getItem("pericon_user");
                    const prevStored = rawStored ? JSON.parse(rawStored) : {};
                    localStorage.setItem(
                      "pericon_user",
                      JSON.stringify({
                        ...prevStored,
                        id: updated.id,
                        username: updated.name,
                        email: updated.email,
                        coins: updated.coins,
                        wins: updated.wins,
                        losses: updated.losses,
                        level: updated.level,
                        avatarUrl: updated.avatarUrl,
                      })
                    );
                  } catch (err) {
                    console.error("Error al persistir pericon_user en localStorage:", err);
                  }
                }
              })
              .catch((err) => console.warn("Sync profile notice:", err));
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (gamep.name && gamep.name !== "nulo") {
      setDataplayer((prev) => ({
        ...prev,
        id: gamep.id && !isNaN(Number(gamep.id)) ? gamep.id : prev.id,
        name: gamep.name,
        coins: gamep.coins,
        email: gamep.email,
      }));
    }
  }, [gamep]);

  useEffect(() => {
    if (!connection) return;
    connection.on('GetPlayer', (modelo: GamePlayer) => {
      console.log("GetPlayer recibido:", modelo);
      // Keep authenticated name and numeric database ID if model returns generic connection info
      setDataplayer((prev) => ({
        ...modelo,
        id: prev.id && !isNaN(Number(prev.id)) ? prev.id : (modelo.id && !isNaN(Number(modelo.id)) ? modelo.id : prev.id),
        name: prev.name && prev.name !== "nulo" ? prev.name : modelo.name,
        coins: typeof prev.coins === "number" && prev.coins >= 0 ? prev.coins : modelo.coins,
      }));
    });

    connection.on('GlobalAnnouncement', (data: AnnouncementPayload) => {
      console.log('[GlobalAnnouncement recibido]', data);
      setGlobalAnnouncement(data);
      playChatPopSound();
    });

    return () => {
      connection.off('GetPlayer');
      connection.off('GlobalAnnouncement');
    };
  }, [connection]); 

  useEffect(() => {
    if (!connection) return;
    if (hasConnected.current) return;

    const runStart = async () => {
      try {
        await connection.invoke("SetPlayer");
        if (gamep.name && gamep.name !== "nulo") {
          await connection.invoke("IdentifyPlayer", gamep.name, gamep.email, gamep.coins);
        }
        hasConnected.current = true;
      } catch (error) {
        console.error("Error al iniciar el juego en desk:", error);
      }
    };
    runStart();
  }, [connection, gamep]); 

  return (
    <React.Fragment>
      {/* Menú Superior y Barra de Estado del Jugador */}
      <GameHeaderMenu
        player={dataplayer}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenWallet={() => {
          if (isGuest) {
            Swal.fire({
              title: 'MONEDERO EXCLUSIVO',
              html: `
                <div style="text-align: center; font-size: 14px; padding: 6px 0;">
                  <p style="color: #cbd5e1; margin-bottom: 12px; line-height: 1.5;">
                    El monedero y las recargas de saldo están disponibles únicamente para cuentas registradas.
                  </p>
                  <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px; color: #fde68a; font-weight: bold; margin-bottom: 8px;">
                    ¡Crea tu cuenta oficial para recargar y cobrar premios!
                  </div>
                </div>
              `,
              icon: 'info',
              showCancelButton: true,
              confirmButtonText: 'Crear Cuenta',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#d97706',
              cancelButtonColor: '#475569',
              background: '#1a0e06',
              color: '#fff',
              customClass: {
                popup: 'border-2 border-amber-500/50 rounded-3xl shadow-2xl'
              }
            }).then((res) => {
              if (res.isConfirmed) {
                router.push("/registro");
              }
            });
            return;
          }
          setWalletOpen(true);
        }}
        onOpenTutorial={() => setTutorialOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
      />

      {/* Banner de Anuncio Global en Vivo y Persistente */}
      {globalAnnouncement && (
        <div
          className={`w-full px-4 py-2.5 flex items-center justify-between shadow-2xl z-30 animate-in slide-in-from-top duration-300 border-b ${
            globalAnnouncement.type === "alerta"
              ? "bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white border-red-400"
              : globalAnnouncement.type === "torneo"
              ? "bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 font-black border-amber-300"
              : globalAnnouncement.type === "promo"
              ? "bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 text-white border-pink-400"
              : "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-black border-amber-400"
          }`}
        >
          <div className="flex items-center gap-3 max-w-5xl mx-auto flex-1 justify-center text-center">
            <span className="text-xl animate-bounce shrink-0">
              {globalAnnouncement.type === "torneo" && "🏆"}
              {globalAnnouncement.type === "alerta" && "⚠️"}
              {globalAnnouncement.type === "promo" && "🎁"}
              {globalAnnouncement.type !== "torneo" &&
                globalAnnouncement.type !== "alerta" &&
                globalAnnouncement.type !== "promo" &&
                "📢"}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 text-left sm:text-center">
              {globalAnnouncement.title && (
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider underline decoration-amber-900/40">
                  {globalAnnouncement.title}:
                </span>
              )}
              <span className="font-extrabold text-xs sm:text-sm tracking-wide">
                {globalAnnouncement.message}
              </span>
            </div>
          </div>
          <button
            onClick={handleDismissAnnouncement}
            className="text-inherit hover:opacity-70 font-black text-xs px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 transition shrink-0 ml-2"
            title="Cerrar anuncio"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Game Modes Content: Grid 2x2 Gamer Pro */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative z-10 w-full min-h-[calc(88vh-80px)]">
        <div className="w-full max-w-sm sm:max-w-xl mx-auto flex flex-col items-center">
          
          {/* Título de sección sutil */}
          <div className="text-center mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-300 uppercase bg-black/70 border border-amber-500/50 px-3.5 py-1 rounded-full shadow-lg backdrop-blur-md inline-flex items-center gap-1.5">
              <span>🌵</span>
              <span>PULPERÍA DE CARORA • MODOS DE JUEGO</span>
            </span>
          </div>

          {/* Aviso informativo si es Modo Invitado */}
          {isGuest && (
            <div className="w-full mb-3 bg-amber-950/70 border border-amber-500/60 rounded-2xl p-2.5 text-center shadow-lg backdrop-blur-md">
              <p className="text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <span>🛡️</span>
                <span>Modo Invitado: Habilitado únicamente para Partidas Amistosas (Crear o Unirse a Sala).</span>
              </p>
              <button
                onClick={() => router.push("/registro")}
                className="mt-1 text-[11px] text-amber-400 hover:text-amber-200 underline font-extrabold cursor-pointer"
              >
                ¿Quieres apostar monedas y subir de nivel? ¡Regístrate aquí!
              </button>
            </div>
          )}

          {/* Cuadrícula 2x2 Optimizada para Móvil y Desktop */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">

            {/* 1. DUELO (Activo: Solitario y 1 vs 1) */}
            <div
              onClick={() => duelToggle()}
              className={`rounded-2xl sm:rounded-3xl border-2 ${isGuest ? 'border-amber-500/50 opacity-80 hover:opacity-100' : 'border-blue-500/70'} p-3 sm:p-4 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-150 bg-gradient-to-b from-[#1b1e2e]/90 via-[#12141f]/95 to-[#0a0b12] shadow-lg shadow-blue-500/20 backdrop-blur-md group`}
            >
              <div className={`absolute -top-2.5 right-2 ${isGuest ? 'bg-amber-800 text-amber-200 border-amber-400/60' : 'bg-blue-600 text-white border-blue-300'} font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow border`}>
                {isGuest ? '🔒 CUENTA REQUERIDA' : '🔥 POPULAR'}
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-400 p-2 shadow-lg border border-blue-200/50 flex items-center justify-center mt-1 group-hover:rotate-6 transition transform">
                <Image priority src="/duel.svg" alt="Duelo" width={40} height={40} className="w-7 h-7 sm:w-10 sm:h-10 object-contain drop-shadow" />
              </div>
              <div className="mt-2">
                <h3 className={`text-xs sm:text-base text-white tracking-wider font-extrabold ${fonts.bowlbyOneSC.className}`}>
                  DUELO
                </h3>
                <p className={`text-slate-300 text-[9.5px] sm:text-xs font-medium leading-tight mt-0.5 ${fonts.almarai.className}`}>
                  1 vs 1 o Solitario por monedas
                </p>
              </div>
              <div className={`w-full mt-2 ${isGuest ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' : 'bg-blue-600/30 border-blue-400/50 text-blue-200'} border rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition`}>
                <span>{isGuest ? 'SOLO REGISTRADOS' : 'JUGAR'}</span>
                <span>➜</span>
              </div>
            </div>

            {/* 2. TORNEOS (En Mantenimiento) */}
            <div
              onClick={() => showMaintenanceNotice("Torneos")}
              className="rounded-2xl sm:rounded-3xl border-2 border-amber-600/40 p-3 sm:p-4 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-150 bg-gradient-to-b from-[#2a1c0d]/85 via-[#1a1107]/90 to-[#0f0904] shadow-md opacity-90 hover:opacity-100 backdrop-blur-md group"
            >
              <div className="absolute -top-2.5 right-2 bg-amber-950 text-amber-300 font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow border border-amber-500/50">
                🛠️ MANTENIMIENTO
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-yellow-500/80 p-2 shadow-lg border border-amber-300/30 flex items-center justify-center mt-1 group-hover:rotate-6 transition transform">
                <Image src="/tournament.svg" alt="Torneos" width={40} height={40} className="w-7 h-7 sm:w-10 sm:h-10 object-contain drop-shadow" />
              </div>
              <div className="mt-2">
                <h3 className={`text-xs sm:text-base text-amber-100 tracking-wider font-extrabold ${fonts.bowlbyOneSC.className}`}>
                  TORNEOS
                </h3>
                <p className={`text-amber-200/80 text-[9.5px] sm:text-xs font-medium leading-tight mt-0.5 ${fonts.almarai.className}`}>
                  Próximos torneos semanales
                </p>
              </div>
              <div className="w-full mt-2 bg-amber-950/60 border border-amber-500/30 rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-amber-300 flex items-center justify-center gap-1 group-hover:bg-amber-800/60 transition">
                <span>🔒 EN DESARROLLO</span>
              </div>
            </div>

            {/* 3. CREAR SALA (Activo: Salas Privadas) */}
            <div
              onClick={() => handleCreatePrivateRoom()}
              className="rounded-2xl sm:rounded-3xl border-2 border-emerald-500/70 hover:border-emerald-400 p-3 sm:p-4 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-150 bg-gradient-to-b from-[#0d2417]/90 via-[#07170f]/95 to-[#030d08] shadow-lg shadow-emerald-500/20 backdrop-blur-md group"
            >
              <div className="absolute -top-2.5 right-2 bg-emerald-600 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow border border-emerald-300">
                👑 SALA PRIVADA
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-2 shadow-lg border border-emerald-200/50 flex items-center justify-center mt-1 group-hover:rotate-6 transition transform">
                <Image src="/room.svg" alt="Crear Sala" width={40} height={40} className="w-7 h-7 sm:w-10 sm:h-10 object-contain drop-shadow" />
              </div>
              <div className="mt-2">
                <h3 className={`text-xs sm:text-base text-emerald-100 tracking-wider font-extrabold ${fonts.bowlbyOneSC.className}`}>
                  CREAR SALA
                </h3>
                <p className={`text-emerald-200/80 text-[9.5px] sm:text-xs font-medium leading-tight mt-0.5 ${fonts.almarai.className}`}>
                  Mesa privada con amigos
                </p>
              </div>
              <div className="w-full mt-2 bg-emerald-600/30 border border-emerald-400/50 rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-black text-emerald-200 flex items-center justify-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition">
                <span>CREAR MESA</span>
                <span>➜</span>
              </div>
            </div>

            {/* 4. UNIRSE (Activo: Código de Sala o Enlace) */}
            <div
              onClick={() => handleJoinPrivateRoom()}
              className="rounded-2xl sm:rounded-3xl border-2 border-purple-500/70 hover:border-purple-400 p-3 sm:p-4 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-150 bg-gradient-to-b from-[#21112b]/90 via-[#14081c]/95 to-[#0b030f] shadow-lg shadow-purple-500/20 backdrop-blur-md group"
            >
              <div className="absolute -top-2.5 right-2 bg-purple-600 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow border border-purple-300">
                🔑 CÓDIGO O LINK
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-400 p-2 shadow-lg border border-purple-200/50 flex items-center justify-center mt-1 group-hover:rotate-6 transition transform">
                <Image src="/join.svg" alt="Unirse" width={40} height={40} className="w-7 h-7 sm:w-10 sm:h-10 object-contain drop-shadow" />
              </div>
              <div className="mt-2">
                <h3 className={`text-xs sm:text-base text-purple-100 tracking-wider font-extrabold ${fonts.bowlbyOneSC.className}`}>
                  UNIRSE
                </h3>
                <p className={`text-purple-200/80 text-[9.5px] sm:text-xs font-medium leading-tight mt-0.5 ${fonts.almarai.className}`}>
                  Únete con código recibido
                </p>
              </div>
              <div className="w-full mt-2 bg-purple-600/30 border border-purple-400/50 rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-black text-purple-200 flex items-center justify-center gap-1 group-hover:bg-purple-600 group-hover:text-white transition">
                <span>ENTRAR AHORA</span>
                <span>➜</span>
              </div>
            </div>

          </div>

          {/* Barra de estado inferior */}
          <div className="w-full mt-3 sm:mt-5 py-2 px-4 bg-black/60 backdrop-blur-md rounded-2xl border border-amber-500/30 flex items-center justify-between text-[11px] sm:text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
              <span className="font-bold text-slate-200">Servidores activos</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLeaderboardOpen(true)}
                className="text-yellow-400 hover:text-yellow-300 font-extrabold flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/40 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs transition shadow-sm hover:scale-105"
              >
                <span>🏆</span>
                <span>Top 10</span>
              </button>
              <button
                onClick={() => setTutorialOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-extrabold underline flex items-center gap-1"
              >
                📖 Tutorial y Reglas
              </button>
            </div>
          </div>

        </div>

        {/* Modal de Duelo */}
        <Duel open={open} duelToggle={duelToggle} />

        {/* NewDuel */}
        <NewDuel open={newopen} duelToggle={duelToggle02} onFinish={handleFinishNewDuel} />
      </div>

      {/* Modal de Perfil y Nivel del Jugador */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        player={dataplayer}
        onProfileUpdated={(updated) => {
          setDataplayer((prev) => ({
            ...prev,
            name: updated.username || updated.name || prev.name,
            avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : prev.avatarUrl,
          }));
        }}
      />

      {/* Modal del Monedero y Recargas */}
      <WalletModal
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        userId={dataplayer.id && !isNaN(Number(dataplayer.id)) ? dataplayer.id : (gamep.id || "")}
        coins={dataplayer.coins}
      />

      {/* Modal del Ranking Top 10 */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />

      {/* Modal del Tutorial Animado (Flotación suave del Chivo) */}
      <PericonTutorialModal
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        animationStyle="float"
      />
    </React.Fragment>
  )
}
