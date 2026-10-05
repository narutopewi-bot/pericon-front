'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Users, Swords, Crown, Sparkles, X, Check, RefreshCw, AlertCircle, Play } from 'lucide-react';

interface TournamentBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export default function TournamentBracketModal({
  isOpen,
  onClose,
  currentUser,
}: TournamentBracketModalProps) {
  const [loading, setLoading] = useState(false);
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [joining, setJoining] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

  const fetchTournament = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`${apiUrl}/api/tournaments/active`);
      if (res.ok) {
        const data = await res.json();
        setTournamentData(data);
      }
    } catch (e) {
      console.error("Error al cargar torneo:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTournament();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = tournamentData?.tournament;
  const participants = tournamentData?.participants || [];
  const matches = tournamentData?.matches || [];

  const isUserJoined = participants.some((p: any) => p.userId === currentUser?.id);

  const handleJoin = async () => {
    if (!currentUser || !currentUser.id) {
      setErrorMsg('Debes iniciar sesión para inscribirte en el torneo.');
      return;
    }
    if (t?.isPrivate && !passwordInput.trim()) {
      setErrorMsg('Por favor ingresa la contraseña del torneo.');
      return;
    }

    try {
      setJoining(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch(`${apiUrl}/api/tournaments/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: t.id,
          userId: currentUser.id,
          password: passwordInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Error al inscribirse en el torneo.');
      } else {
        setSuccessMsg(data.message || '¡Inscripción exitosa!');
        fetchTournament();
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión al inscribirte en el torneo.');
    } finally {
      setJoining(false);
    }
  };

  // Cuartos de Final (4 matches)
  const qMatches = matches.filter((m: any) => m.round === 'Cuartos');
  // Semifinales (2 matches)
  const sMatches = matches.filter((m: any) => m.round === 'Semifinal');
  // Gran Final (1 match)
  const fMatch = matches.find((m: any) => m.round === 'Final');

  const getMatchBoxContent = (match: any, defaultP1: string, defaultP2: string) => {
    const p1 = match?.playerOneUsername || defaultP1;
    const p2 = match?.playerTwoUsername || defaultP2;
    const winner = match?.winnerUsername;
    const isLive = match?.status === 'EnJuego';

    return { p1, p2, winner, isLive };
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[95dvh] overflow-y-auto rounded-3xl border-2 border-amber-500/60 bg-[#0d1117] p-4 sm:p-6 text-white shadow-[0_0_50px_rgba(245,158,11,0.25)]">
        
        {/* Encabezado del Torneo */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                  {t?.name || "Torneo Piloto Casona"}
                </h2>
                {t?.isPrivate && (
                  <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                    <Lock size={10} /> Privado
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/60 font-medium">
                Llave de Eliminación Directa (8 Jugadores) • Pozo: 🪙 {t?.totalPot || 400} monedas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-amber-200/60 hover:bg-amber-500/10 hover:text-white transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Barra de Estado y Acceso con Contraseña */}
        {!isUserJoined && t?.status === 'Inscripciones' && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-200">
              <Lock className="text-amber-400 shrink-0" size={18} />
              <span>
                <strong>Torneo de prueba privado:</strong> Requiere contraseña para inscribirse (Entrada: 🪙 {t?.buyInCoins} monedas).
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Contraseña del torneo"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full sm:w-48 rounded-xl bg-black/60 border border-amber-500/40 px-3 py-1.5 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleJoin}
                disabled={joining}
                className="shrink-0 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow-md disabled:opacity-50"
              >
                {joining ? 'Entrando...' : 'Inscribirme'}
              </button>
            </div>
          </div>
        )}

        {isUserJoined && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3.5 py-2 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>✅ Ya estás inscrito en este torneo. ¡Prepárate para jugar tu llave!</span>
            <span className="text-emerald-400 font-mono">Cupos: {participants.length}/{t?.maxParticipants || 8}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/20 p-2.5 text-xs text-red-300 font-medium flex items-center gap-2">
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-2.5 text-xs text-emerald-300 font-medium flex items-center gap-2">
            <Check size={15} /> {successMsg}
          </div>
        )}

        {/* DIAGRAMA DE LLAVES DEL TORNEO (Idéntico al Diagrama de la Imagen) */}
        <div className="relative overflow-x-auto py-4">
          <div className="min-w-[780px] grid grid-cols-4 gap-4 items-center">

            {/* COLUMNA 1: CUARTOS DE FINAL (8 Casillas en 4 Parejas) */}
            <div className="flex flex-col justify-between h-[480px]">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 text-center mb-1">
                Cuartos de Final
              </div>

              {[0, 1, 2, 3].map((mIdx) => {
                const match = qMatches.find((m: any) => m.matchIndex === mIdx);
                const p1 = match?.playerOneUsername || participants[mIdx * 2]?.username || `Jugador ${mIdx * 2 + 1}`;
                const p2 = match?.playerTwoUsername || participants[mIdx * 2 + 1]?.username || `Jugador ${mIdx * 2 + 2}`;
                const p1Won = match?.winnerUsername && match?.winnerUsername === p1;
                const p2Won = match?.winnerUsername && match?.winnerUsername === p2;

                return (
                  <div key={mIdx} className="relative flex flex-col gap-1.5 my-1">
                    {/* Caja Jugador 1 */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                      p1Won
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : match?.winnerUsername && !p1Won
                        ? 'border-red-500/40 bg-red-950/20 text-red-300/50'
                        : 'border-white/20 bg-slate-900/80 text-white'
                    }`}>
                      <span className="truncate max-w-[110px]">{p1}</span>
                      {p1Won && <span className="text-[10px] text-emerald-400">WIN 🏆</span>}
                    </div>

                    {/* Caja Jugador 2 */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                      p2Won
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : match?.winnerUsername && !p2Won
                        ? 'border-red-500/40 bg-red-950/20 text-red-300/50'
                        : 'border-white/20 bg-slate-900/80 text-white'
                    }`}>
                      <span className="truncate max-w-[110px]">{p2}</span>
                      {p2Won && <span className="text-[10px] text-emerald-400">WIN 🏆</span>}
                    </div>

                    {/* Conector Ortogonal hacia Semis */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-[44px] border-r-2 border-t-2 border-b-2 border-amber-500/40 rounded-r-md pointer-events-none" />
                  </div>
                );
              })}
            </div>

            {/* COLUMNA 2: SEMIFINALES (4 Casillas en 2 Parejas) */}
            <div className="flex flex-col justify-around h-[480px] pl-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 text-center mb-1">
                Semifinales
              </div>

              {[0, 1].map((sIdx) => {
                const match = sMatches.find((m: any) => m.matchIndex === sIdx);
                const p1 = match?.playerOneUsername || (sIdx === 0 ? "Ganador Q1" : "Ganador Q3");
                const p2 = match?.playerTwoUsername || (sIdx === 0 ? "Ganador Q2" : "Ganador Q4");
                const p1Won = match?.winnerUsername && match?.winnerUsername === p1;
                const p2Won = match?.winnerUsername && match?.winnerUsername === p2;

                return (
                  <div key={sIdx} className="relative flex flex-col gap-2 my-2">
                    {/* Caja Semifinalista 1 */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                      p1Won
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : match?.winnerUsername && !p1Won
                        ? 'border-red-500/40 bg-red-950/20 text-red-300/50'
                        : p1.startsWith("Ganador")
                        ? 'border-dashed border-white/10 bg-slate-900/40 text-white/40'
                        : 'border-amber-400/50 bg-amber-950/30 text-amber-200'
                    }`}>
                      <span className="truncate max-w-[120px]">{p1}</span>
                      {p1Won && <span className="text-[10px] text-emerald-400">FINALISTA</span>}
                    </div>

                    {/* Caja Semifinalista 2 */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                      p2Won
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : match?.winnerUsername && !p2Won
                        ? 'border-red-500/40 bg-red-950/20 text-red-300/50'
                        : p2.startsWith("Ganador")
                        ? 'border-dashed border-white/10 bg-slate-900/40 text-white/40'
                        : 'border-amber-400/50 bg-amber-950/30 text-amber-200'
                    }`}>
                      <span className="truncate max-w-[120px]">{p2}</span>
                      {p2Won && <span className="text-[10px] text-emerald-400">FINALISTA</span>}
                    </div>

                    {/* Conector Ortogonal hacia Final */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-[90px] border-r-2 border-t-2 border-b-2 border-amber-500/40 rounded-r-md pointer-events-none" />
                  </div>
                );
              })}
            </div>

            {/* COLUMNA 3: GRAN FINAL (2 Casillas) */}
            <div className="flex flex-col justify-center h-[480px] pl-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 text-center mb-2">
                Gran Final
              </div>

              <div className="relative flex flex-col gap-3 my-auto">
                {/* Finalista 1 */}
                <div className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-xs font-bold transition-all ${
                  fMatch?.winnerUsername && fMatch?.winnerUsername === fMatch?.playerOneUsername
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                    : fMatch?.playerOneUsername
                    ? 'border-amber-400/60 bg-amber-950/40 text-amber-200'
                    : 'border-dashed border-white/10 bg-slate-900/40 text-white/40'
                }`}>
                  <span className="truncate max-w-[130px]">{fMatch?.playerOneUsername || "Finalista 1"}</span>
                  {fMatch?.winnerUsername && fMatch?.winnerUsername === fMatch?.playerOneUsername && (
                    <Crown size={14} className="text-yellow-400" />
                  )}
                </div>

                {/* Finalista 2 */}
                <div className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-xs font-bold transition-all ${
                  fMatch?.winnerUsername && fMatch?.winnerUsername === fMatch?.playerTwoUsername
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                    : fMatch?.playerTwoUsername
                    ? 'border-amber-400/60 bg-amber-950/40 text-amber-200'
                    : 'border-dashed border-white/10 bg-slate-900/40 text-white/40'
                }`}>
                  <span className="truncate max-w-[130px]">{fMatch?.playerTwoUsername || "Finalista 2"}</span>
                  {fMatch?.winnerUsername && fMatch?.winnerUsername === fMatch?.playerTwoUsername && (
                    <Crown size={14} className="text-yellow-400" />
                  )}
                </div>

                {/* Conector Ortogonal hacia Trofeo */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-amber-500/60 pointer-events-none" />
              </div>
            </div>

            {/* COLUMNA 4: TROFEO DE CAMPEÓN (Idéntico a la imagen) */}
            <div className="flex flex-col items-center justify-center h-[480px]">
              <div className="relative flex flex-col items-center justify-center w-full max-w-[170px] p-5 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-[#241a0d] to-[#120c06] shadow-[0_0_35px_rgba(245,158,11,0.3)] animate-pulse">
                
                {/* Corona y Trofeo */}
                <div className="relative mb-2">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.6)]">
                    <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
                  </div>
                  <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-200" />
                </div>

                <span className="text-[11px] font-black uppercase tracking-widest text-yellow-300 text-center">
                  Campeón
                </span>

                <span className="mt-1 text-xs sm:text-sm font-extrabold text-white text-center truncate max-w-full">
                  {t?.winnerUsername || "En Disputa"}
                </span>

                <span className="mt-1 text-[10px] font-semibold text-amber-200/60">
                  Premio: 🪙 {Math.round((t?.totalPot || 400) * 0.7 * 0.9)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer con controles */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-amber-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Sincronización en tiempo real activa</span>
          </div>

          <button
            onClick={fetchTournament}
            disabled={loading}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar Llave
          </button>
        </div>

      </div>
    </div>
  );
}
