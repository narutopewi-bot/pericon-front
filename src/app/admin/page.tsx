"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { useRouter } from "next/navigation";

interface AdminStats {
  totalUsers: number;
  pendingRecharges: number;
  pendingWithdrawals: number;
  totalApprovedCount: number;
  totalBsApproved: number;
  totalCoinsApproved: number;
  totalPaidWithdrawalsCount: number;
  totalBsWithdrawn: number;
  totalHouseCommissions?: number;
  totalMatchesFinished?: number;
  totalCoinsWagered?: number;
}

interface MatchRow {
  id: number;
  gameId: number;
  playerOneName: string;
  playerTwoName: string;
  betPerPlayer: number;
  totalPot: number;
  houseCommission: number;
  winnerPrize: number;
  winnerUsername: string;
  loserUsername: string;
  endReason: string;
  createdAt: string;
}

interface RechargeRow {
  id: number;
  userId: number;
  username: string;
  userEmail: string;
  userCoins: number;
  amountBs: number;
  coinsAmount: number;
  reference: string;
  receiptImageUrl: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
}

interface WithdrawalRow {
  id: number;
  userId: number;
  username: string;
  userEmail: string;
  userCurrentCoins: number;
  coinsAmount: number;
  amountBs: number;
  bankName: string;
  phoneNumber: string;
  idCard: string;
  status: string;
  adminReference?: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
}

interface UserRow {
  id: number;
  username: string;
  email: string;
  coins: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  level: string;
  createdAt: string;
  avatarUrl?: string;
  isActive: boolean;
  isAdmin?: boolean;
}

export default function AdminPage() {
  const router = useRouter();

  // Acceso de Seguridad (PIN de Administrador: 26554121 o admin)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [activeTab, setActiveTab] = useState<"recharges" | "withdrawals" | "users" | "matches">("recharges");
  const [rechargeStatusFilter, setRechargeStatusFilter] = useState<string>("PENDIENTE");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("PENDIENTE");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recharges, setRecharges] = useState<RechargeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Visor de Comprobante / Capture Modal
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Modal para Ajustar Monedas de Usuario
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);

  // Copiado temporal
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Buscador de usuarios
  const [userSearch, setUserSearch] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "26554121" || pinInput.toLowerCase() === "admin123" || pinInput === "admin") {
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("PIN de acceso incorrecto. Verifica e intenta nuevamente.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Estadísticas
      const resStats = await fetch(`${apiUrl}/api/admin/stats`);
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // 2. Recargas
      const resRecharges = await fetch(`${apiUrl}/api/admin/recharges?status=${rechargeStatusFilter}`);
      if (resRecharges.ok) {
        const dataRecharges = await resRecharges.json();
        setRecharges(dataRecharges);
      }

      // 3. Retiros
      const resWithdrawals = await fetch(`${apiUrl}/api/admin/withdrawals?status=${withdrawalStatusFilter}`);
      if (resWithdrawals.ok) {
        const dataWithdrawals = await resWithdrawals.json();
        setWithdrawals(dataWithdrawals);
      }

      // 4. Usuarios
      const resUsers = await fetch(`${apiUrl}/api/admin/users`);
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsers(dataUsers);
      }

      // 5. Partidas y Comisiones de la Casa
      const resMatches = await fetch(`${apiUrl}/api/admin/matches`);
      if (resMatches.ok) {
        const dataMatches = await resMatches.json();
        setMatches(dataMatches);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, rechargeStatusFilter, withdrawalStatusFilter]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const handleApproveRecharge = async (id: number) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/recharge/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`);
        loadData();
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch (e) {
      setActionMessage("Error de conexión al aprobar la recarga.");
    }
  };

  const handleRejectRecharge = async (id: number) => {
    const reason = window.prompt(
      "Ingresa el motivo del rechazo (ej: Comprobante no encontrado en cuenta bancaria):",
      "No se visualiza la transferencia en la cuenta de El Pericón."
    );
    if (reason === null) return;

    setActionMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/recharge/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`⚠️ Recarga #${id} rechazada.`);
        loadData();
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch (e) {
      setActionMessage("Error de conexión al rechazar la recarga.");
    }
  };

  const handleApproveWithdrawal = async (w: WithdrawalRow) => {
    const ref = window.prompt(
      `Vas a transferir Bs. ${w.amountBs.toLocaleString()} al Pago Móvil de ${w.username}:\n\nBanco: ${w.bankName}\nTel: ${w.phoneNumber}\nCédula: ${w.idCard}\n\nIngresa el número de Referencia del Pago Móvil que realizaste:`,
      ""
    );
    if (ref === null) return;
    if (!ref.trim()) {
      alert("Debes ingresar el número de referencia del pago realizado.");
      return;
    }

    setActionMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/withdrawal/${w.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ Retiro #${w.id} marcado como PAGADO exitosamente. Referencia: ${ref.trim()}`);
        loadData();
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch (e) {
      setActionMessage("Error de conexión al procesar el retiro.");
    }
  };

  const handleRejectWithdrawal = async (w: WithdrawalRow) => {
    const reason = window.prompt(
      `Rechazar retiro de ${w.coinsAmount} monedas de ${w.username}.\n(Las monedas se le reembolsarán inmediatamente a su saldo).\n\nIngresa el motivo del rechazo:`,
      "Datos de Pago Móvil incorrectos o cuenta receptora rechazada."
    );
    if (reason === null) return;

    setActionMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/withdrawal/${w.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`⚠️ Retiro #${w.id} rechazado. Se han reembolsado ${w.coinsAmount} monedas al usuario.`);
        loadData();
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch (e) {
      setActionMessage("Error de conexión al rechazar el retiro.");
    }
  };

  const handleSaveCoinsAdjustment = async () => {
    if (!adjustingUser) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/user/${adjustingUser.id}/adjust-coins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: adjustAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`);
        setAdjustingUser(null);
        loadData();
      } else {
        alert(data.message || "Error al ajustar monedas.");
      }
    } catch (e) {
      alert("Error al conectar con el servidor.");
    }
  };

  // Pantalla de bloqueo si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#140a04] flex flex-col items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-diablo mix-blend-soft-light opacity-30"></div>

        <div className="relative z-10 w-full max-w-sm bg-[#1e0f06] border-2 border-amber-500/60 rounded-3xl p-6 text-white shadow-2xl shadow-amber-600/30 flex flex-col items-center text-center">
          <Image src="/brand.svg" width={160} height={50} alt="Pericón" priority />
          <div className="w-14 h-14 bg-amber-500/20 border border-amber-400 rounded-full flex items-center justify-center text-2xl my-3">
            🔒
          </div>
          <h1 className={`${fonts.bowlbyOneSC.className} text-lg text-amber-300`}>
            Panel de Administrador
          </h1>
          <p className="text-xs text-amber-200/70 mt-1 mb-4">
            Ingresa tu clave de administrador para gestionar recargas, retiros y usuarios de El Pericón.
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Ingresa PIN de seguridad"
              className="w-full bg-black/60 border border-amber-500/40 rounded-xl px-4 py-2.5 text-center text-sm font-black tracking-widest text-white focus:outline-none focus:border-amber-400"
              autoFocus
              required
            />

            {pinError && <p className="text-xs text-rose-400 font-medium">{pinError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
            >
              Ingresar al Panel 🚀
            </button>
            <button
              type="button"
              onClick={() => router.push("/desk")}
              className="text-xs text-amber-300/60 hover:text-amber-200 mt-1"
            >
              ← Volver a la Mesa
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#120803] text-white flex flex-col">
      {/* Barra Superior del Administrador */}
      <header className="w-full bg-black/80 border-b border-amber-500/40 px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/brand.svg" width={110} height={35} alt="Pericón" className="h-7 w-auto" />
            <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              ADMIN
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/desk")}
              className="text-xs text-amber-300/80 hover:text-amber-100 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition"
            >
              🎮 Ir a la Mesa de Juego
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl hover:bg-rose-900 transition"
            >
              Cerrar Sesión Admin
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Mensaje de acción */}
        {actionMessage && (
          <div className="w-full bg-black/80 border border-amber-400 text-amber-200 text-xs p-3 rounded-2xl shadow-lg flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-white/60 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Métricas y Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Comisión de Árbitro / Casa (20%) */}
          <div className="bg-gradient-to-br from-[#2f1906] via-[#1a0e03] to-[#2f1906] border-2 border-yellow-400 rounded-2xl p-4 flex flex-col gap-1 shadow-xl shadow-yellow-500/10 col-span-2 sm:col-span-1 lg:col-span-2">
            <span className="text-[11px] text-yellow-300 font-black uppercase tracking-wider flex items-center gap-1">
              <span>🏛️</span> Ganancias Árbitro (20%)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-yellow-400">
              🪙 {stats?.totalHouseCommissions ?? 0}
            </span>
            <span className="text-[10px] text-amber-200/90 font-bold">
              Monedas ganadas por comisiones del 20%
            </span>
          </div>

          {/* Partidas 1 vs 1 Jugadas */}
          <div className="bg-[#1c1208] border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-1 shadow-md">
            <span className="text-[11px] text-amber-300/80 font-bold uppercase tracking-wider flex items-center gap-1">
              <span>⚔️</span> Partidas 1 vs 1
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-300">
              {stats?.totalMatchesFinished ?? 0}
            </span>
            <span className="text-[10px] text-amber-200/60">
              Pozo total: 🪙 {stats?.totalCoinsWagered ?? 0}
            </span>
          </div>

          {/* Recargas Pendientes */}
          <div className="bg-[#241306] border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-1 shadow-md relative overflow-hidden">
            {stats && stats.pendingRecharges > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            )}
            <span className="text-[11px] text-amber-300/80 font-bold uppercase tracking-wider">
              ⏳ Recargas Pendientes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400">
              {stats?.pendingRecharges ?? 0}
            </span>
            <span className="text-[10px] text-amber-200/60">Por verificar capture</span>
          </div>

          {/* Retiros Pendientes */}
          <div className="bg-[#121c10] border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-1 shadow-md relative overflow-hidden">
            {stats && stats.pendingWithdrawals > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></span>
            )}
            <span className="text-[11px] text-emerald-300/80 font-bold uppercase tracking-wider">
              📤 Retiros Pendientes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {stats?.pendingWithdrawals ?? 0}
            </span>
            <span className="text-[10px] text-emerald-200/60">Por transferir a Pago Móvil</span>
          </div>

          {/* Total Recaudado en Recargas */}
          <div className="bg-[#241306] border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-1 shadow-md">
            <span className="text-[11px] text-amber-300/80 font-bold uppercase tracking-wider">
              💵 Recargas Aprobadas
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-300">
              Bs. {stats?.totalBsApproved?.toLocaleString() ?? 0}
            </span>
            <span className="text-[10px] text-amber-200/60">
              {stats?.totalApprovedCount ?? 0} procesadas
            </span>
          </div>
        </div>

        {/* Pestañas Principales */}
        <div className="flex border-b border-amber-500/30 gap-4 text-sm font-extrabold overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("matches")}
            className={`pb-2.5 transition flex items-center gap-2 border-b-2 flex-shrink-0 ${
              activeTab === "matches"
                ? "border-yellow-400 text-yellow-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>⚔️ Partidas y Comisiones ({matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("recharges")}
            className={`pb-2.5 transition flex items-center gap-2 border-b-2 flex-shrink-0 ${
              activeTab === "recharges"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>💳 Recargas de Saldo</span>
            {stats && stats.pendingRecharges > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {stats.pendingRecharges}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`pb-2.5 transition flex items-center gap-2 border-b-2 flex-shrink-0 ${
              activeTab === "withdrawals"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>💸 Solicitudes de Retiro</span>
            {stats && stats.pendingWithdrawals > 0 && (
              <span className="bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {stats.pendingWithdrawals}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2.5 transition flex items-center gap-2 border-b-2 flex-shrink-0 ${
              activeTab === "users"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>👥 Usuarios ({users.length})</span>
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: RECARGAS */}
        {activeTab === "recharges" && (
          <div className="flex flex-col gap-4">
            {/* Filtros de estado */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-amber-500/20 text-xs">
                {["PENDIENTE", "ALL", "APROBADO", "RECHAZADO"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRechargeStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      rechargeStatusFilter === st
                        ? "bg-amber-500 text-black shadow"
                        : "text-amber-200/70 hover:text-white"
                    }`}
                  >
                    {st === "PENDIENTE"
                      ? "⏳ Pendientes"
                      : st === "ALL"
                      ? "Todos"
                      : st === "APROBADO"
                      ? "✅ Aprobados"
                      : "❌ Rechazados"}
                  </button>
                ))}
              </div>

              <button
                onClick={loadData}
                className="text-xs text-amber-300 bg-black/40 hover:bg-black/60 border border-amber-500/30 px-3 py-1.5 rounded-xl transition"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Tabla de Recargas */}
            {loading ? (
              <div className="text-center py-12 text-amber-200/60 text-sm">
                Cargando solicitudes...
              </div>
            ) : recharges.length === 0 ? (
              <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-10 text-center text-amber-200/60 flex flex-col items-center gap-2">
                <span className="text-3xl">📭</span>
                <span className="text-sm">No hay solicitudes de recarga en este estado.</span>
              </div>
            ) : (
              <div className="bg-black/50 border border-amber-500/30 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-950/60 border-b border-amber-500/30 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="p-3">ID / Fecha</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Monto Bs / Monedas</th>
                      <th className="p-3">Referencia</th>
                      <th className="p-3">Capture de Pago</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {recharges.map((r) => (
                      <tr key={r.id} className="hover:bg-amber-950/20 transition">
                        <td className="p-3 font-mono text-[11px] text-amber-200/80">
                          #{r.id}
                          <span className="block text-[10px] text-white/40">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-amber-100 block">{r.username}</span>
                          <span className="text-[10px] text-amber-200/60">{r.userEmail}</span>
                          <span className="text-[10px] text-amber-400 block font-semibold">
                            Saldo: {r.userCoins} 🪙
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-emerald-300 text-sm block">
                            Bs. {r.amountBs.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-extrabold text-amber-300">
                            +{r.coinsAmount} Monedas
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-200">
                          {r.reference}
                        </td>
                        <td className="p-3">
                          {r.receiptImageUrl ? (
                            <button
                              onClick={() => setViewingReceipt(r.receiptImageUrl)}
                              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg font-bold transition text-[11px]"
                            >
                              <span>👁️</span>
                              <span>Ver Capture</span>
                            </button>
                          ) : (
                            <span className="text-white/40 italic">Sin capture</span>
                          )}
                        </td>
                        <td className="p-3">
                          {r.status === "PENDIENTE" && (
                            <span className="bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                              ⏳ PENDIENTE
                            </span>
                          )}
                          {r.status === "APROBADO" && (
                            <span className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                              ✅ APROBADO
                            </span>
                          )}
                          {r.status === "RECHAZADO" && (
                            <div>
                              <span className="bg-rose-500/20 border border-rose-500/50 text-rose-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                                ❌ RECHAZADO
                              </span>
                              {r.adminNotes && (
                                <span className="block text-[9px] text-rose-300/80 mt-1 max-w-[150px] truncate">
                                  {r.adminNotes}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {r.status === "PENDIENTE" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveRecharge(r.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow transition"
                                title="Aprobar y sumar monedas"
                              >
                                ✓ Aprobar
                              </button>
                              <button
                                onClick={() => handleRejectRecharge(r.id)}
                                className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-2 py-1 rounded-lg text-xs transition"
                                title="Rechazar pago"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: RETIROS A PAGO MÓVIL */}
        {activeTab === "withdrawals" && (
          <div className="flex flex-col gap-4">
            {/* Filtros de retiros */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-emerald-500/20 text-xs">
                {["PENDIENTE", "ALL", "PAGADO", "RECHAZADO"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setWithdrawalStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      withdrawalStatusFilter === st
                        ? "bg-emerald-500 text-black shadow"
                        : "text-emerald-200/70 hover:text-white"
                    }`}
                  >
                    {st === "PENDIENTE"
                      ? "⏳ Pendientes por Pagar"
                      : st === "ALL"
                      ? "Todos"
                      : st === "PAGADO"
                      ? "✅ Pagados"
                      : "❌ Rechazados"}
                  </button>
                ))}
              </div>

              <button
                onClick={loadData}
                className="text-xs text-emerald-300 bg-black/40 hover:bg-black/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Tabla de Retiros */}
            {loading ? (
              <div className="text-center py-12 text-emerald-200/60 text-sm">
                Cargando retiros...
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="bg-black/40 border border-emerald-500/20 rounded-2xl p-10 text-center text-emerald-200/60 flex flex-col items-center gap-2">
                <span className="text-3xl">💸</span>
                <span className="text-sm">No hay solicitudes de retiro en este estado.</span>
              </div>
            ) : (
              <div className="bg-black/50 border border-emerald-500/30 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#102410] border-b border-emerald-500/30 text-emerald-300 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="p-3">ID / Fecha</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Monto a Transferir</th>
                      <th className="p-3">Datos de Pago Móvil Receptor</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-emerald-950/20 transition">
                        <td className="p-3 font-mono text-[11px] text-emerald-200/80">
                          #{w.id}
                          <span className="block text-[10px] text-white/40">
                            {new Date(w.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-amber-100 block">{w.username}</span>
                          <span className="text-[10px] text-white/60">{w.userEmail}</span>
                          <span className="text-[10px] text-amber-400 block font-semibold">
                            Saldo: {w.userCurrentCoins} 🪙
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-emerald-300 text-sm block">
                            Bs. {w.amountBs.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-extrabold text-amber-300">
                            {w.coinsAmount} Monedas
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-extrabold text-white text-xs">
                              {w.bankName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-emerald-200">
                                📱 {w.phoneNumber}
                              </span>
                              <button
                                onClick={() => copyToClipboard(w.phoneNumber, `phone-${w.id}`)}
                                className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-1.5 py-0.5 rounded border border-white/20"
                              >
                                {copiedText === `phone-${w.id}` ? "✓" : "Copiar"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-emerald-200">
                                🪪 {w.idCard}
                              </span>
                              <button
                                onClick={() => copyToClipboard(w.idCard, `id-${w.id}`)}
                                className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-1.5 py-0.5 rounded border border-white/20"
                              >
                                {copiedText === `id-${w.id}` ? "✓" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {w.status === "PENDIENTE" && (
                            <span className="bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                              ⏳ PENDIENTE
                            </span>
                          )}
                          {w.status === "PAGADO" && (
                            <div>
                              <span className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                                ✅ PAGADO
                              </span>
                              {w.adminReference && (
                                <span className="block text-[9px] text-emerald-300 font-mono mt-1">
                                  Ref: {w.adminReference}
                                </span>
                              )}
                            </div>
                          )}
                          {w.status === "RECHAZADO" && (
                            <div>
                              <span className="bg-rose-500/20 border border-rose-500/50 text-rose-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                                ❌ RECHAZADO
                              </span>
                              <span className="block text-[9px] text-amber-300 mt-1">
                                Monedas devueltas
                              </span>
                              {w.adminNotes && (
                                <span className="block text-[9px] text-rose-300/80 mt-0.5 max-w-[150px] truncate">
                                  {w.adminNotes}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {w.status === "PENDIENTE" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveWithdrawal(w)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-1.5 rounded-lg text-xs shadow transition flex items-center gap-1"
                                title="Ingresar referencia bancaria y marcar pagado"
                              >
                                <span>✓</span>
                                <span>Marcar Pagado</span>
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(w)}
                                className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-2 py-1.5 rounded-lg text-xs transition"
                                title="Rechazar y reembolsar monedas"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO PESTAÑA 3: USUARIOS */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-4">
            {/* Buscador de Usuarios */}
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuario por nombre o correo..."
                className="w-full bg-black/60 border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Tabla de Usuarios */}
            <div className="bg-black/50 border border-amber-500/30 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-950/60 border-b border-amber-500/30 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Jugador</th>
                    <th className="p-3">Correo</th>
                    <th className="p-3">Saldo de Monedas</th>
                    <th className="p-3">Nivel (Rango)</th>
                    <th className="p-3">Victorias / Derrotas</th>
                    <th className="p-3">Efectividad</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-amber-950/20 transition">
                      <td className="p-3 font-mono text-[11px] text-white/50">#{u.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-amber-200 block">{u.username}</span>
                        {u.isAdmin && (
                          <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-amber-100/70">{u.email}</td>
                      <td className="p-3 font-black text-amber-300 text-sm">
                        {u.coins.toLocaleString()} 🪙
                      </td>
                      <td className="p-3">
                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {u.level}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-emerald-400 font-bold">{u.wins}V</span> /{" "}
                        <span className="text-rose-400 font-bold">{u.losses}D</span>
                      </td>
                      <td className="p-3 font-bold text-yellow-300">{u.winRate}%</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setAdjustingUser(u);
                            setAdjustAmount(100);
                          }}
                          className="text-[11px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg font-bold transition"
                        >
                          ⚙️ Ajustar Saldo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 4: PARTIDAS Y COMISIONES (20%) */}
        {activeTab === "matches" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-300">
                  Historial de Apuestas y Liquidación de Partidas 1 vs 1
                </span>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-500/30">
                  {matches.length} registradas
                </span>
              </div>

              <button
                onClick={loadData}
                className="text-xs text-amber-300 bg-black/40 hover:bg-black/60 border border-amber-500/30 px-3 py-1.5 rounded-xl transition"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Tabla de Partidas */}
            <div className="overflow-x-auto bg-black/40 border border-amber-500/30 rounded-2xl shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/40 text-amber-300/80 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3"># Juego</th>
                    <th className="p-3">Fecha / Hora</th>
                    <th className="p-3">Contendientes</th>
                    <th className="p-3 text-center">Apuesta / Pozo</th>
                    <th className="p-3 text-center">🏆 Ganador (80%)</th>
                    <th className="p-3 text-center bg-amber-500/10 text-amber-300 border-x border-amber-500/30">
                      🏛️ Comisión Casa (20%)
                    </th>
                    <th className="p-3 text-right">Razón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/20 text-stone-200">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-amber-200/50">
                        No hay partidas registradas aún. ¡En cuanto jueguen en 1 vs 1 aparecerán aquí con sus comisiones!
                      </td>
                    </tr>
                  ) : (
                    matches.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.03] transition">
                        <td className="p-3 font-mono font-bold text-amber-400">
                          #{m.gameId}
                        </td>
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {m.createdAt}
                        </td>
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-300 font-bold">@{m.winnerUsername}</span>
                            <span className="text-stone-500 font-normal">vs</span>
                            <span className="text-rose-300">@{m.loserUsername}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="text-yellow-400">🪙 {m.betPerPlayer}</span>
                          <span className="text-stone-400 text-[10px] block">
                            Pozo: {m.totalPot}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-950/80 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/40">
                            +{m.winnerPrize} monedas
                          </span>
                          <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                            @{m.winnerUsername}
                          </span>
                        </td>
                        <td className="p-3 text-center bg-amber-500/10 border-x border-amber-500/30">
                          <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black px-2.5 py-0.5 rounded-full shadow text-xs">
                            +{m.houseCommission} monedas
                          </span>
                          <span className="text-[9px] text-amber-200/70 block mt-0.5 font-bold uppercase tracking-wider">
                            20% Árbitro
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            m.endReason === "Rendicion"
                              ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                              : m.endReason === "TiempoAgotado"
                              ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                          }`}>
                            {m.endReason === "Rendicion" ? "🚪 Rendición" : m.endReason === "TiempoAgotado" ? "⏱️ Tiempo" : "⭐ Puntos"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: VISOR DE COMPROBANTE / CAPTURE */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative max-w-2xl w-full bg-[#1e0f06] border-2 border-amber-500/60 rounded-3xl p-5 flex flex-col items-center shadow-2xl">
            <button
              onClick={() => setViewingReceipt(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs transition"
            >
              ✕
            </button>

            <h3 className={`${fonts.bowlbyOneSC.className} text-base text-amber-300 mb-3`}>
              Comprobante de Pago
            </h3>

            <div className="w-full max-h-[75vh] overflow-auto flex items-center justify-center bg-black/60 rounded-xl border border-amber-500/30 p-2">
              <img
                src={
                  viewingReceipt.startsWith("http") || viewingReceipt.startsWith("data:")
                    ? viewingReceipt
                    : `${apiUrl}${viewingReceipt}`
                }
                alt="Capture de pago bancario"
                className="max-h-[68vh] w-auto object-contain rounded-lg shadow"
              />
            </div>

            <button
              onClick={() => setViewingReceipt(null)}
              className="mt-4 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition"
            >
              Cerrar Visor
            </button>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR MONEDAS MANUALMENTE */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative max-w-sm w-full bg-[#1e0f06] border-2 border-amber-500/60 rounded-3xl p-6 flex flex-col gap-3 shadow-2xl">
            <button
              onClick={() => setAdjustingUser(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 p-1 rounded-full text-xs"
            >
              ✕
            </button>

            <h3 className={`${fonts.bowlbyOneSC.className} text-sm text-amber-300`}>
              Ajustar Saldo de {adjustingUser.username}
            </h3>
            <span className="text-xs text-amber-200/70">
              Saldo actual: <strong>{adjustingUser.coins} monedas</strong>
            </span>

            <div>
              <label className="text-xs text-amber-200/80 font-bold block mb-1">
                Monedas a sumar (o restar en negativo):
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-black/70 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white font-black"
                placeholder="100"
              />
              <span className="text-[10px] text-amber-300/60 block mt-1">
                Nuevo saldo resultará en: {Math.max(0, adjustingUser.coins + adjustAmount)} monedas
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveCoinsAdjustment}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs rounded-xl shadow"
              >
                Guardar Ajuste
              </button>
              <button
                onClick={() => setAdjustingUser(null)}
                className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
