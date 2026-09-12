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
      title: 'CREAR SALA PRIVADA 2 VS 2',
      html: `
        <div style="text-align: center; padding: 6px 0;">
          <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px;">
            Elige la apuesta por jugador para tu mesa privada. Luego podrás compartir el enlace por WhatsApp o pasar el código a tus amigos.
          </p>
          <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <button type="button" class="swal-bet-btn" data-bet="100" style="background:#166534; color:#fff; border:1px solid #4ade80; border-radius:8px; padding:6px 14px; font-weight:bold; cursor:pointer;">🪙 100</button>
            <button type="button" class="swal-bet-btn" data-bet="150" style="background:#1e293b; color:#94a3b8; border:1px solid #475569; border-radius:8px; padding:6px 14px; font-weight:bold; cursor:pointer;">🪙 150</button>
            <button type="button" class="swal-bet-btn" data-bet="200" style="background:#1e293b; color:#94a3b8; border:1px solid #475569; border-radius:8px; padding:6px 14px; font-weight:bold; cursor:pointer;">🪙 200</button>
            <button type="button" class="swal-bet-btn" data-bet="500" style="background:#1e293b; color:#94a3b8; border:1px solid #475569; border-radius:8px; padding:6px 14px; font-weight:bold; cursor:pointer;">🪙 500</button>
          </div>
          <input id="swal-custom-bet" type="number" value="100" min="50" max="5000" step="50" style="width: 80%; background:#0f172a; border:1px solid #22c55e; border-radius:10px; padding:8px 12px; color:#4ade80; font-size:16px; font-weight:bold; text-align:center;" />
        </div>
      `,
      didOpen: () => {
        const input = document.getElementById('swal-custom-bet') as HTMLInputElement;
        const btns = document.querySelectorAll('.swal-bet-btn');
        btns.forEach((btn) => {
          btn.addEventListener('click', () => {
            btns.forEach((b) => {
              (b as HTMLElement).style.background = '#1e293b';
              (b as HTMLElement).style.color = '#94a3b8';
              (b as HTMLElement).style.borderColor = '#475569';
            });
            (btn as HTMLElement).style.background = '#166534';
            (btn as HTMLElement).style.color = '#fff';
            (btn as HTMLElement).style.borderColor = '#4ade80';
            if (input) input.value = (btn as HTMLElement).getAttribute('data-bet') || '100';
          });
        });
      },
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '¡Crear y Abrir Mesa!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#475569',
      background: '#0a1a0f',
      color: '#fff',
      customClass: {
        popup: 'border-2 border-emerald-500/50 rounded-3xl shadow-2xl'
      },
      preConfirm: () => {
        const input = document.getElementById('swal-custom-bet') as HTMLInputElement;
        const bet = input ? parseInt(input.value, 10) : 100;
        if (isNaN(bet) || bet < 10) {
          Swal.showValidationMessage('Por favor ingresa una apuesta válida mayor a 10 monedas');
          return false;
        }
        return bet;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const chosenBet = res.value;
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const roomName = `sala-${randomCode}`;
        router.push(`/game2v2/${roomName}?bet=${chosenBet}&creator=1`);
      }
    });
  };

  const handleJoinPrivateRoom = () => {
    Swal.fire({
      title: 'UNIRSE A SALA PRIVADA',
      html: `
        <div style="text-align: center; padding: 6px 0;">
          <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px;">
            Ingresa el código que te compartió tu amigo (ej: <strong>SALA-4821</strong> o <strong>4821</strong>) o pega el enlace completo:
          </p>
          <input id="swal-room-code" type="text" placeholder="Ej: SALA-4821 o pega el link" style="width: 85%; background:#0f172a; border:1px solid #a855f7; border-radius:10px; padding:10px 14px; color:#e9d5ff; font-size:14px; font-weight:bold; text-align:center;" />
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Entrar a la Sala',
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

        router.push(`/game2v2/${targetRoom}`);
      }
    });
  };

  // Estados de Modales: Perfil, Monedero y Tutorial
  const [profileOpen, setProfileOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

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

  const duelToggle = () => {
    setOpen(!open);
  };

  const duelToggle02 = () => {
    setNewopen(!newopen);
  };

  const handleFinishNewDuel = () => {
  // Puedes reiniciar estados o simplemente reactivar algo
  //  duelToggle02();
    setNewopen(false); // cierra el modal desde el padre
  // Si necesitas hacer algo extra aquí, lo puedes añadir
  };

  const openNewDuel = () => {
    setNewopen(true); // ← abre siempre
  };

  const dispatch = useDispatch();
  const connection = useSignalRContext(); 
  const hasConnected = React.useRef(false);
  const gamep = useSelector((state: RootState) => state.gameplayer);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Verificar si ya vio el tutorial
      const seen = localStorage.getItem("pericon_tutorial_seen");
      if (!seen) {
        setTutorialOpen(true);
      }

      const stored = localStorage.getItem("pericon_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u && u.username) {
            const playerObj = {
              id: u.id?.toString() || "1",
              name: u.username,
              email: u.email || "",
              coins: u.coins ?? 100,
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
        coins: prev.coins > 0 ? prev.coins : modelo.coins,
      }));
    });
    return () => {
      connection.off('GetPlayer');
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
        onOpenWallet={() => setWalletOpen(true)}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      {/* Dynamic Game Modes Content: Grid 2x2 Gamer Pro */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative z-10 w-full min-h-[calc(88vh-80px)]">
        <div className="w-full max-w-sm sm:max-w-xl mx-auto flex flex-col items-center">
          
          {/* Título de sección sutil */}
          <div className="text-center mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400 uppercase bg-black/60 border border-amber-500/40 px-3 py-1 rounded-full shadow">
              MODOS DE JUEGO
            </span>
          </div>

          {/* Cuadrícula 2x2 Optimizada para Móvil y Desktop */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">

            {/* 1. DUELO (Activo: Solitario y 1 vs 1) */}
            <div
              onClick={() => duelToggle()}
              className="rounded-2xl sm:rounded-3xl border-2 border-blue-500/70 p-3 sm:p-4 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-150 bg-gradient-to-b from-[#1b1e2e]/90 via-[#12141f]/95 to-[#0a0b12] shadow-lg shadow-blue-500/20 backdrop-blur-md group"
            >
              <div className="absolute -top-2.5 right-2 bg-blue-600 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow border border-blue-300 animate-pulse">
                🔥 POPULAR
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
              <div className="w-full mt-2 bg-blue-600/30 border border-blue-400/50 rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-black text-blue-200 flex items-center justify-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition">
                <span>JUGAR</span>
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
            <button
              onClick={() => setTutorialOpen(true)}
              className="text-amber-400 hover:text-amber-300 font-extrabold underline flex items-center gap-1"
            >
              📖 Tutorial y Reglas
            </button>
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
      />

      {/* Modal del Monedero y Recargas */}
      <WalletModal
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        userId={dataplayer.id && !isNaN(Number(dataplayer.id)) ? dataplayer.id : (gamep.id || "")}
        coins={dataplayer.coins}
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
