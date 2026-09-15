"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { getPlayerLevelInfo } from "@/lib/levelHelper";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setGamePlayer, clearGamePlayer } from "@/store/slices/gameplayerSlice";
import Swal from "sweetalert2";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    email: string;
    coins: number;
    wins?: number;
    losses?: number;
    avatarUrl?: string;
  };
  onProfileUpdated?: (updatedPlayer: any) => void;
}

const PRESET_AVATARS = [
  { id: "chivo_classic", name: "Chivo Clásico", src: "/avatar.png" },
  { id: "chivo", name: "Chivo Caroreño", src: "/avatars/chivo.svg" },
  { id: "patron", name: "Don Patrón", src: "/avatars/patron.svg" },
  { id: "llanero", name: "El Llanero", src: "/avatars/llanero.svg" },
  { id: "cuatrista", name: "El Cuatrista", src: "/avatars/cuatrista.svg" },
  { id: "reina", name: "La Reina Criolla", src: "/avatars/reina.svg" },
  { id: "diablo", name: "El Diablo", src: "/avatars/diablo.svg" },
  { id: "gavilan", name: "El Gavilán", src: "/avatars/gavilan.svg" },
  { id: "caballo", name: "El Corcel", src: "/avatars/caballo.svg" },
  { id: "leon", name: "El Campeón", src: "/avatars/leon.svg" },
  { id: "buho", name: "El Búho Sabio", src: "/avatars/buho.svg" },
];

export default function ProfileModal({ isOpen, onClose, player, onProfileUpdated }: ProfileModalProps) {
  const router = useRouter();
  const dispatch = useDispatch();

  // Estados de edición
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setNewUsername(player.name || "Jugador");
      setSelectedAvatar(player.avatarUrl || "/avatar.png");
      setErrorMsg("");
    }
  }, [isOpen, player.name, player.avatarUrl]);

  if (!isOpen) return null;

  const isGuest = !player.id || isNaN(Number(player.id)) || Number(player.id) <= 0;
  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const levelInfo = getPlayerLevelInfo(wins);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pericon_user");
    }
    dispatch(clearGamePlayer());
    router.push("/");
  };

  // Procesar imagen personalizada subida por el usuario
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("La imagen seleccionada supera los 5MB. Por favor elige otra más ligera.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 180;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const base64 = canvas.toDataURL("image/jpeg", 0.85);
            setSelectedAvatar(base64);
            setErrorMsg("");
          }
        } catch {
          setSelectedAvatar(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Guardar cambios en el backend y persistir localmente
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      Swal.fire({
        title: "CUENTA REQUERIDA",
        text: "Para personalizar tu nombre y logotipo permanente, debes crear una cuenta gratuita.",
        icon: "info",
        confirmButtonText: "Crear Cuenta",
        confirmButtonColor: "#eab308",
        background: "#1a0e06",
        color: "#fff",
      }).then((r) => {
        if (r.isConfirmed) router.push("/registro");
      });
      return;
    }

    const cleanName = newUsername.trim();
    if (cleanName.length < 3 || cleanName.length > 25) {
      setErrorMsg("El nombre de usuario debe tener entre 3 y 25 caracteres.");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";

    try {
      const res = await fetch(`${apiUrl}/api/user/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(player.id, 10),
          newUsername: cleanName,
          newAvatarUrl: selectedAvatar,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Error al actualizar tu perfil.");
        setIsSaving(false);
        return;
      }

      // Actualizar Redux
      dispatch(
        setGamePlayer({
          name: cleanName,
          avatarUrl: selectedAvatar,
        })
      );

      // Actualizar localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("pericon_user");
          const u = raw ? JSON.parse(raw) : {};
          u.username = cleanName;
          u.avatarUrl = selectedAvatar;
          localStorage.setItem("pericon_user", JSON.stringify(u));
        } catch {}
      }

      if (onProfileUpdated) {
        onProfileUpdated(data.user || { username: cleanName, avatarUrl: selectedAvatar });
      }

      Swal.fire({
        title: "¡PERFIL ACTUALIZADO!",
        text: "Tu nombre y personaje han sido actualizados con éxito en todo el juego.",
        icon: "success",
        confirmButtonText: "Genial",
        confirmButtonColor: "#22c55e",
        background: "#1a0e06",
        color: "#fff",
        timer: 2000,
      });

      setIsEditing(false);
    } catch {
      setErrorMsg("Error de conexión con el servidor. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#2b180a] via-[#1a0f05] to-[#0d0702] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 text-white shadow-2xl shadow-amber-600/30 flex flex-col items-center max-h-[92vh] overflow-y-auto">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs transition z-10"
          title="Cerrar perfil"
        >
          ✕
        </button>

        {/* ========================================================================= */}
        {/* VISTA 1: MODO EDICIÓN DE PERSONAJE Y NOMBRE */}
        {/* ========================================================================= */}
        {isEditing ? (
          <form onSubmit={handleSaveChanges} className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera edición */}
            <div className="w-full flex items-center justify-between border-b border-amber-500/30 pb-2.5 mb-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-amber-400 hover:text-amber-200 text-xs font-bold flex items-center gap-1"
              >
                ← Volver
              </button>
              <h3 className={`${fonts.bowlbyOneSC.className} text-sm text-amber-300 tracking-wide uppercase`}>
                Personalizar Personaje
              </h3>
              <div className="w-10"></div>
            </div>

            {/* Vista Previa del Avatar Seleccionado */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-amber-400 p-1 bg-black/70 overflow-hidden shadow-2xl shadow-amber-500/50 flex items-center justify-center">
                <img
                  src={selectedAvatar || "/avatar.png"}
                  alt="Vista Previa"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mt-1">
                Vista Previa
              </span>
            </div>

            {/* Opción 1: Subir Tu Cara / Foto / Logotipo Propio */}
            <div className="w-full bg-[#1e1007] border border-amber-500/40 rounded-2xl p-3 mb-3 text-center">
              <span className="text-xs font-black text-amber-200 block mb-1.5">
                📷 ¿Quieres colocar tu propia cara o logotipo?
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <span>📤</span>
                <span>Subir Foto o Imagen de mi Dispositivo</span>
              </button>
              <p className="text-[9.5px] text-amber-200/50 mt-1">
                Puedes subir fotos tuyas, selfies o cualquier imagen que quieras de avatar.
              </p>
            </div>

            {/* Opción 2: Galería de Personajes Criollos */}
            <div className="w-full mb-3">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2 text-left">
                🎭 O elige un Personaje Criollo:
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1 p-1 bg-black/40 rounded-2xl border border-amber-500/20">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.src;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.src);
                        setErrorMsg("");
                      }}
                      className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
                        isSelected
                          ? "bg-amber-500/30 border-2 border-amber-400 shadow-lg shadow-amber-500/40 scale-105"
                          : "bg-[#24140a] border border-amber-500/20 hover:border-amber-400/60 opacity-85 hover:opacity-100"
                      }`}
                      title={av.name}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-black/50 border border-amber-400/50 mb-1">
                        <img src={av.src} alt={av.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[8.5px] font-bold text-amber-100 text-center leading-tight truncate w-full">
                        {av.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo: Nombre de Usuario */}
            <div className="w-full mb-3 text-left">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Nombre de Usuario (En mesas y partidas):
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={25}
                required
                className="w-full bg-[#180e07] border border-amber-500/50 rounded-xl px-3.5 py-2 text-sm text-white font-bold placeholder-amber-200/30 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Ej: El_Tigre_Carora"
              />
              <span className="text-[9.5px] text-amber-200/50 mt-0.5 block">
                Visible en salas 1v1, 2v2, podio de bazas y tablero de puntuación.
              </span>
            </div>

            {/* Error si lo hay */}
            {errorMsg && (
              <div className="w-full p-2 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs font-medium mb-3 text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Botones de acción del formulario */}
            <div className="flex gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* VISTA 2: PERFIL GENERAL CON BOTÓN DE EDITAR */
          /* ========================================================================= */
          <>
            {/* Cabecera del Perfil con Botón Editar */}
            <div className="flex flex-col items-center gap-1.5 mb-3 w-full">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-amber-400 p-1 bg-black/50 overflow-hidden shadow-lg shadow-amber-500/30 flex items-center justify-center text-3xl font-black text-amber-300">
                  {player.avatarUrl && player.avatarUrl.length > 5 ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <img
                      src="/avatar.png"
                      alt="Chivo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 text-2xl filter drop-shadow">
                  {levelInfo.badge}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 mt-1">
                <h2 className={`${fonts.bowlbyOneSC.className} text-xl text-amber-300 tracking-wide`}>
                  {player.name || "Jugador"}
                </h2>
              </div>
              <span className="text-xs text-amber-200/60">{player.email || "periquero@juego.com"}</span>

              {/* Botón Destacado: MODIFICAR PERSONAJE Y NOMBRE */}
              <button
                onClick={() => {
                  if (isGuest) {
                    Swal.fire({
                      title: "MODO INVITADO",
                      text: "Para cambiar tu nombre y seleccionar o subir tu propio avatar, debes crear una cuenta oficial.",
                      icon: "info",
                      showCancelButton: true,
                      confirmButtonText: "Crear Cuenta",
                      cancelButtonText: "Cerrar",
                      confirmButtonColor: "#eab308",
                      background: "#1a0e06",
                      color: "#fff",
                    }).then((r) => {
                      if (r.isConfirmed) router.push("/registro");
                    });
                    return;
                  }
                  setIsEditing(true);
                }}
                className="mt-1 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/40 border border-amber-400/60 text-amber-300 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>✏️</span>
                <span>Modificar Nombre o Personaje</span>
              </button>
            </div>

            {/* Tarjeta de Nivel y Rango */}
            <div
              className={`w-full ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} rounded-2xl p-3.5 flex flex-col gap-2 mb-3 shadow-inner`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{levelInfo.badge}</span>
                  <div>
                    <span className="text-[9.5px] text-amber-300/80 font-bold uppercase tracking-wider block">
                      Rango de Jugador
                    </span>
                    <span className={`text-sm font-black ${levelInfo.badgeTextColor}`}>
                      Nivel {levelInfo.level}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-black/50 border border-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full">
                  {wins} {wins === 1 ? "Victoria" : "Victorias"}
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full mt-0.5">
                <div className="flex justify-between text-[10.5px] text-amber-200/90 mb-1 font-semibold">
                  <span>
                    {levelInfo.level === "Experto"
                      ? "¡Nivel Máximo!"
                      : `${wins} / ${levelInfo.maxWins} victorias`}
                  </span>
                  <span>{levelInfo.progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Cuadrícula de Estadísticas */}
            <div className="grid grid-cols-2 gap-2 w-full mb-3">
              <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-2.5 flex flex-col items-center text-center">
                <span className="text-emerald-400 font-extrabold text-base">🏆 {wins}</span>
                <span className="text-[9.5px] text-emerald-200/80 uppercase font-bold mt-0.5">
                  Victorias
                </span>
              </div>

              <div className="bg-black/40 border border-rose-500/30 rounded-xl p-2.5 flex flex-col items-center text-center">
                <span className="text-rose-400 font-extrabold text-base">⚔️ {losses}</span>
                <span className="text-[9.5px] text-rose-200/80 uppercase font-bold mt-0.5">
                  Derrotas
                </span>
              </div>

              <div className="bg-black/40 border border-amber-500/30 rounded-xl p-2.5 flex flex-col items-center text-center">
                <span className="text-amber-300 font-extrabold text-base">🎮 {totalMatches}</span>
                <span className="text-[9.5px] text-amber-200/80 uppercase font-bold mt-0.5">
                  Partidas Totales
                </span>
              </div>

              <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-2.5 flex flex-col items-center text-center">
                <span className="text-yellow-300 font-extrabold text-base">{winRate}%</span>
                <span className="text-[9.5px] text-yellow-200/80 uppercase font-bold mt-0.5">
                  Efectividad
                </span>
              </div>
            </div>

            {/* Monedero Resumen */}
            <div className="w-full bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 relative">
                  <Image src="/coin.png" fill alt="Monedas" className="object-contain" />
                </div>
                <div>
                  <span className="text-[9.5px] text-amber-300/80 font-bold uppercase block">
                    Saldo Disponible
                  </span>
                  <span className="text-xs font-black text-amber-200">
                    {player.coins.toLocaleString()} Monedas
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md font-bold border border-amber-500/30">
                Monedero Activo
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs rounded-xl shadow-lg hover:brightness-110 transition"
              >
                Aceptar
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 px-3 bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 font-bold text-xs rounded-xl transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
