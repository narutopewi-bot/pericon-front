"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { showNativeNotification, triggerNativeHaptic, isApkEnvironment } from "@/lib/nativeBridge";

interface AdminStats {
  totalUsers: number;
  pendingRecharges: number;
  pendingWithdrawals: number;
  totalApprovedCount: number;
  totalBsApproved: number;
  totalCoinsApproved: number;
  totalBsPending?: number;
  totalCoinsPending?: number;
  todayRechargesCount?: number;
  todayRechargesBs?: number;
  todayApprovedBs?: number;
  todayPendingBs?: number;
  totalPaidWithdrawalsCount: number;
  totalBsWithdrawn: number;
  totalBsPendingWithdrawals?: number;
  totalHouseCommissions?: number;
  totalMatchesFinished?: number;
  totalCoinsWagered?: number;
  totalBotMatches?: number;
  totalBotCoinsWagered?: number;
  totalBotHouseProfit?: number;
  totalBotUserWins?: number;
  combinedTotalMatches?: number;
  combinedCoinsWagered?: number;
  combinedHouseProfit?: number;
  live?: {
    onlineUsers?: number;
    activeSolitaire?: number;
    active1v1?: number;
    active2v2?: number;
    inQueue?: number;
    totalActiveGames?: number;
  };
}

interface PlatformExpenseRow {
  id: number;
  description: string;
  category: string;
  currency: "BS" | "USDT";
  amount: number;
  usdtReceived?: number | null;
  exchangeRate?: number | null;
  createdAt: string;
  createdBy?: string | null;
  notes?: string | null;
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
  isBotMatch?: boolean;
  createdAt: string;
}

interface RechargeRow {
  id: number;
  userId: number;
  username: string;
  userEmail: string;
  userPhone?: string;
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
  phoneNumber?: string;
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
  botDifficulty?: "general" | "facil" | "medio" | "dificil" | "favor_jugador";
  clientType?: string;
  deviceFingerprint?: string;
}

interface PromoCodeRow {
  id: number;
  code: string;
  coinsReward: number;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

interface ErrorLogRow {
  id: number;
  source: string;
  roomName?: string;
  username?: string;
  userId?: number;
  errorMessage: string;
  stackTrace?: string;
  extraData?: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface AnnouncementRow {
  id: number;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

interface FeedbackRow {
  id: number;
  userId?: number;
  username: string;
  userEmail?: string;
  userPhone?: string;
  rating: number;
  category: string;
  message: string;
  canPublish: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface BotMatchRow {
  id: number;
  userId: number;
  username: string;
  botName: string;
  betAmount: number;
  userWon: boolean;
  coinsWon: number;
  coinsLost: number;
  houseCommission?: number;
  houseProfit: number;
  userCoinsBefore: number;
  userCoinsAfter: number;
  endReason: string;
  createdAt: string;
}

interface BotSummary {
  totalBotMatches: number;
  userWinsCount: number;
  botWinsCount: number;
  userWinRate: number;
  botWinRate: number;
  totalCoinsWagered: number;
  totalCoinsWonByUser: number;
  totalCoinsWonByHouse: number;
  totalHouseCommission?: number;
  netHouseProfit: number;
}

interface VirtualBotItem {
  id: number;
  username: string;
  avatarUrl?: string;
  level: string;
  coins: number;
  isActive: boolean;
  difficulty: "facil" | "medio" | "dificil";
  totalMatches: number;
  botWins: number;
  botLosses: number;
  winRate: number;
  houseProfit: number;
}

interface BotDailyRow {
  date: string;
  totalMatches: number;
  botWins: number;
  userWins: number;
  botWinRate: number;
  userWinRate: number;
  totalCoinsWagered: number;
  coinsWonByUser: number;
  coinsWonByHouse: number;
  houseCommission?: number;
  netHouseProfit: number;
}

interface BotTodaySummary {
  date: string;
  totalMatches: number;
  botWins: number;
  userWins: number;
  botWinRate: number;
  userWinRate: number;
  totalCoinsWagered: number;
  coinsWonByUser: number;
  coinsWonByHouse: number;
  houseCommission?: number;
  netHouseProfit: number;
  targetWinRate: number;
}

interface MatchesPeriodSummary {
  totalMatches: number;
  totalCoinsWagered: number;
  totalHouseCommissions: number;
  totalPrizesAwarded: number;
  averageBet: number;
}

interface MatchesDailyActivity {
  date: string;
  count: number;
  totalPot: number;
  commission: number;
  prizes: number;
}

type TabType = "dashboard" | "users" | "whatsapp" | "broadcast" | "recharges" | "withdrawals" | "matches" | "bot-matches" | "reports" | "promos" | "errors" | "feedbacks";

export default function AdminPage() {
  const router = useRouter();

  // Autenticación exclusiva Guardian
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Navegación Sidebar
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtros de estado y búsquedas
  const [rechargeStatusFilter, setRechargeStatusFilter] = useState<string>("PENDIENTE");
  const [rechargeSearch, setRechargeSearch] = useState("");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("PENDIENTE");
  const [withdrawalSearch, setWithdrawalSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [userSearch, setUserSearch] = useState("");

  // Errores e Incidencias (Telemetría)
  const [errorLogs, setErrorLogs] = useState<ErrorLogRow[]>([]);
  const [errorStatusFilter, setErrorStatusFilter] = useState<string>("ALL");
  const [errorSourceFilter, setErrorSourceFilter] = useState<string>("ALL");
  const [errorCounts, setErrorCounts] = useState({ total: 0, new: 0, resolved: 0 });
  const [selectedError, setSelectedError] = useState<ErrorLogRow | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  // Gastos y Caja Dual (Bs / USDT)
  const [expenses, setExpenses] = useState<PlatformExpenseRow[]>([]);
  const [expenseFilterCurrency, setExpenseFilterCurrency] = useState<string>("ALL");
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>("ALL");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFormType, setExpenseFormType] = useState<"BS" | "USDT" | "COMPRA_USDT">("BS");
  const [expenseFormDescription, setExpenseFormDescription] = useState("");
  const [expenseFormCategory, setExpenseFormCategory] = useState("Servidor / Infraestructura");
  const [expenseFormAmount, setExpenseFormAmount] = useState("");
  const [expenseFormUsdtReceived, setExpenseFormUsdtReceived] = useState("");
  const [expenseFormNotes, setExpenseFormNotes] = useState("");
  const [loadingExpense, setLoadingExpense] = useState(false);


  // Datos
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recharges, setRecharges] = useState<RechargeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesSubTab, setMatchesSubTab] = useState<"pvp" | "bot">("pvp");
  const [playerMatchSearch, setPlayerMatchSearch] = useState("");
  const [playerMatchFilter, setPlayerMatchFilter] = useState<"all" | "won" | "lost">("all");
  const [matchPeriodFilter, setMatchPeriodFilter] = useState<"dia" | "semana" | "mes" | "todo">("todo");
  const [matchTypeFilter, setMatchTypeFilter] = useState<"pvp" | "bot" | "all">("pvp");
  const [matchesPeriodSummary, setMatchesPeriodSummary] = useState<MatchesPeriodSummary | null>(null);
  const [matchesDailyActivity, setMatchesDailyActivity] = useState<MatchesDailyActivity[]>([]);
  const [botMatches, setBotMatches] = useState<BotMatchRow[]>([]);
  const [botSummary, setBotSummary] = useState<BotSummary>({
    totalBotMatches: 0,
    userWinsCount: 0,
    botWinsCount: 0,
    userWinRate: 0,
    botWinRate: 0,
    totalCoinsWagered: 0,
    totalCoinsWonByUser: 0,
    totalCoinsWonByHouse: 0,
    netHouseProfit: 0,
  });
  const [botTodaySummary, setBotTodaySummary] = useState<BotTodaySummary | null>(null);
  const [botYesterdaySummary, setBotYesterdaySummary] = useState<BotTodaySummary | null>(null);
  const [botDailyBreakdown, setBotDailyBreakdown] = useState<BotDailyRow[]>([]);
  const [botDateFilter, setBotDateFilter] = useState<string>("today"); // "today" | "yesterday" | "last7" | "all" | "YYYY-MM-DD"
  const [customBotDate, setCustomBotDate] = useState<string>("");
  const [botSearch, setBotSearch] = useState("");
  const [botResultFilter, setBotResultFilter] = useState<"all" | "user_won" | "bot_won">("all");
  const [botDifficultyMode, setBotDifficultyMode] = useState<"facil" | "medio" | "dificil">("medio");
  const [botDifficultyLoading, setBotDifficultyLoading] = useState(false);
  const [virtualBots, setVirtualBots] = useState<VirtualBotItem[]>([]);
  const [updatingBotId, setUpdatingBotId] = useState<number | null>(null);
  const [updatingUserDiffId, setUpdatingUserDiffId] = useState<number | null>(null);
  const [cheData, setCheData] = useState<any>(null);
  const [cheLoading, setCheLoading] = useState(false);
  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{ total: number; averageRating: number }>({ total: 0, averageRating: 5.0 });
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>("ALL");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Anuncio Global y Comunicados a Jugadores
  const [broadcastTitle, setBroadcastTitle] = useState("📢 COMUNICADO OFICIAL");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<string>("info");
  const [broadcasting, setBroadcasting] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);

  // Directorio de WhatsApp
  const [whatsappSearch, setWhatsappSearch] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState<"all" | "with_phone" | "without_phone">("all");
  const [whatsappTemplate, setWhatsappTemplate] = useState<"grupo" | "torneo" | "novedades" | "promo" | "libre">("grupo");
  const [customWaMessage, setCustomWaMessage] = useState("");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pericon_wa_group_link") || "";
    }
    return "";
  });

  interface ReactivationCandidate {
    id: number;
    username: string;
    originalPhone: string;
    cleanPhone: string;
    coins: number;
    wins: number;
    level: string;
    createdAt: string;
    lastReactivatedAt: string | null;
    reactivationCount: number;
    suggestedMessage: string;
    waUrl: string;
  }
  const [reactivationCandidates, setReactivationCandidates] = useState<ReactivationCandidate[]>([]);
  const [reactivationTotalEligible, setReactivationTotalEligible] = useState<number>(0);
  const [reactivationLoading, setReactivationLoading] = useState<boolean>(false);
  const [creditingIds, setCreditingIds] = useState<{ [key: number]: boolean }>({});
  const [creditedIds, setCreditedIds] = useState<{ [key: number]: boolean }>({});


  // Formulario de Creación de Cupón
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoCoins, setNewPromoCoins] = useState(200);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(1000);
  const [creatingPromo, setCreatingPromo] = useState(false);

  // Modales
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustMode, setAdjustMode] = useState<"add" | "subtract">("add");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<UserRow | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [resettingLoading, setResettingLoading] = useState<boolean>(false);
  const [resetSuccessModal, setResetSuccessModal] = useState<{ username: string; password: string; phone?: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
  const [adminToken, setAdminToken] = useState<string>("");

  const getFullReceiptUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    const cleanBase = apiUrl.replace(/\/+$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  const getAdminHeaders = (extraHeaders: Record<string, string> = {}, overrideToken?: string) => {
    const t = overrideToken || adminToken || (typeof window !== "undefined" ? sessionStorage.getItem("guardian_admin_token") : "") || "";
    return {
      "X-Admin-Token": t,
      ...extraHeaders,
    };
  };

  const adminFetch = async (url: string, init: RequestInit = {}, overrideToken?: string) => {
    const headers = getAdminHeaders((init.headers as Record<string, string>) || {}, overrideToken);
    const res = await fetch(url, {
      ...init,
      headers,
    });
    if (res.status === 401 || res.status === 403) {
      setIsAuthenticated(false);
      setAdminToken("");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("guardian_session_auth");
        sessionStorage.removeItem("guardian_admin_token");
      }
    }
    return res;
  };

  const fetchReactivationCandidates = async () => {
    setReactivationLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/reactivation/candidates`);
      if (res.ok) {
        const data = await res.json();
        if (data.candidates) {
          setReactivationCandidates(data.candidates);
          setReactivationTotalEligible(data.totalEligible || 0);
        }
      }
    } catch (err) {
      console.error("Error al cargar candidatos de reactivación:", err);
    } finally {
      setReactivationLoading(false);
    }
  };

  const handleCreditAndOpenWA = async (candidate: ReactivationCandidate) => {
    setCreditingIds(prev => ({ ...prev, [candidate.id]: true }));
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/reactivation/credit-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: candidate.id, bonusCoins: 300 })
      });

      if (res.ok) {
        const data = await res.json();
        setCreditedIds(prev => ({ ...prev, [candidate.id]: true }));
        setUsers(prev => prev.map(u => u.id === candidate.id ? { ...u, coins: data.newCoins } : u));
        setReactivationCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, coins: data.newCoins, lastReactivatedAt: data.reactivatedAt } : c));

        window.open(candidate.waUrl, "_blank");

        Swal.fire({
          icon: "success",
          title: "¡300 Monedas Acreditadas!",
          text: `Se recargaron +300 monedas a @${candidate.username} y se abrió WhatsApp. Saldo actual: ${data.newCoins} monedas.`,
          timer: 3500,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Error al acreditar",
          text: errData.message || "No se pudo acreditar el bono."
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: err.message || "No se pudo conectar con el servidor."
      });
    } finally {
      setCreditingIds(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  const fetchBotDifficulty = async () => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/bot-difficulty`);
      if (res.ok) {
        const data = await res.json();
        if (data.mode) setBotDifficultyMode(data.mode);
      }
    } catch (err) {
      console.error("Error al obtener dificultad del bot:", err);
    }
  };

  const handleSetBotDifficulty = async (mode: "facil" | "medio" | "dificil") => {
    setBotDifficultyLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/bot-difficulty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setBotDifficultyMode(mode);
        setStats((prev: any) => prev ? {
          ...prev,
          botDifficulty: {
            ...prev.botDifficulty,
            mode: mode,
            housePercent: mode === "facil" ? 50 : mode === "dificil" ? 85 : 70,
            userPercent: mode === "facil" ? 50 : mode === "dificil" ? 15 : 30,
          }
        } : prev);
        Swal.fire({
          icon: "success",
          title: "Dificultad Actualizada",
          text: `El bot ahora está en Modo ${mode.toUpperCase()} (${mode === "facil" ? "50% Casa / 50% Jugador - Modo Recreativo" : mode === "dificil" ? "85% Casa / 15% Jugador - Muro de Contención y Bloqueo Total" : "70% Casa / 30% Jugador - Recuperación de Tesorería"}).`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errData.message || "No se pudo actualizar la dificultad del bot.",
          background: "#180e07",
          color: "#fef3c7"
        });
      }
    } catch (err) {
      console.error("Error setting bot difficulty:", err);
    } finally {
      setBotDifficultyLoading(false);
    }
  };

  const fetchCheStatus = async () => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/special-user/che`);
      if (res.ok) {
        setCheData(await res.json());
      }
    } catch (e) {
      console.error("Error al cargar estado de Che:", e);
    }
  };

  const handleSetCheMode = async (mode: "favor_jugador" | "facil" | "medio" | "dificil" | "general") => {
    setCheLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/special-user/che/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchCheStatus();
        setUsers(prev => prev.map(u => (u.username.toLowerCase() === "che" || u.id === (cheData?.id || 202)) ? { ...u, botDifficulty: mode === "general" ? undefined : mode } : u));
        Swal.fire({
          icon: "success",
          title: "Calibración de Che Actualizada",
          text: data.message || `Che ahora está calibrado en modo ${mode.toUpperCase()}.`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b",
          timer: 3500
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errData.message || "No se pudo actualizar el modo de Che.",
          background: "#180e07",
          color: "#fef3c7"
        });
      }
    } catch (e) {
      console.error("Error al cambiar modo de Che:", e);
    } finally {
      setCheLoading(false);
    }
  };

  const handleSetUserBotDifficulty = async (userId: number, difficulty: "general" | "facil" | "medio" | "dificil" | "favor_jugador") => {
    setUpdatingUserDiffId(userId);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/user/${userId}/bot-difficulty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, botDifficulty: difficulty === "general" ? undefined : difficulty } : u));
        if (cheData && (userId === cheData.id || userId === 202)) {
          fetchCheStatus();
        }
        Swal.fire({
          icon: "success",
          title: "Dificultad de Jugador Actualizada",
          text: data.message || `El jugador ahora está calibrado en modo ${difficulty.toUpperCase()}.`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b",
          timer: 3500
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errData.message || "No se pudo actualizar la dificultad del jugador.",
          background: "#180e07",
          color: "#fef3c7"
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUserDiffId(null);
    }
  };

  const fetchVirtualBots = async () => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/virtual-bots`);
      if (res.ok) {
        setVirtualBots(await res.json());
      }
    } catch (e) {
      console.error("Error al cargar bots virtuales:", e);
    }
  };

  const handleUpdateVirtualBot = async (botId: number, difficulty: string, isActive?: boolean) => {
    setUpdatingBotId(botId);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/virtual-bots/difficulty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, difficulty, isActive })
      });
      if (res.ok) {
        setVirtualBots(prev => prev.map(b => b.id === botId ? {
          ...b,
          difficulty: (difficulty as any) || b.difficulty,
          isActive: isActive !== undefined ? isActive : b.isActive
        } : b));
        setActionMessage(`✅ Configuración del bot actualizada.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Error al actualizar bot.");
      }
    } catch {
      alert("Error de conexión al actualizar bot.");
    } finally {
      setUpdatingBotId(null);
    }
  };

  const handleRenameVirtualBot = async (bot: VirtualBotItem) => {
    const { value: newName } = await Swal.fire({
      title: `Renombrar Bot #${bot.id}`,
      text: `Ingresa el nuevo nombre visible para '${bot.username}':`,
      input: "text",
      inputValue: bot.username,
      inputPlaceholder: "Ej: Don Vicente, La Catira, etc.",
      showCancelButton: true,
      confirmButtonText: "💾 Guardar Nombre",
      cancelButtonText: "Cancelar",
      background: "#180e07",
      color: "#fef3c7",
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#451a03",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "¡El nombre no puede estar vacío!";
        }
        if (value.trim().length < 2) {
          return "El nombre debe tener al menos 2 caracteres.";
        }
        if (value.trim().length > 25) {
          return "El nombre no puede superar los 25 caracteres.";
        }
        return null;
      }
    });

    if (!newName || newName.trim() === bot.username) return;

    setUpdatingBotId(bot.id);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/virtual-bots/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id, newName: newName.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedName = newName.trim();
        setVirtualBots(prev => prev.map(b => b.id === bot.id ? { ...b, username: updatedName } : b));
        setBotMatches(prev => prev.map(m => m.botName.toLowerCase() === bot.username.toLowerCase() ? { ...m, botName: updatedName } : m));
        Swal.fire({
          icon: "success",
          title: "¡Nombre Actualizado!",
          text: `El bot ahora se llama '${updatedName}'. Los usuarios lo verán con este nombre en todas las partidas.`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b"
        });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "No se pudo renombrar",
          text: err.message || "Ocurrió un error al actualizar el nombre del bot.",
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b"
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error de Conexión",
        text: "No se pudo comunicar con el servidor.",
        background: "#180e07",
        color: "#fef3c7"
      });
    } finally {
      setUpdatingBotId(null);
    }
  };

  const [isApkAdminDevice, setIsApkAdminDevice] = useState(false);
  const [adminDeviceId, setAdminDeviceId] = useState("");

  // Blindaje de Hardware y Persistencia para el Teléfono Administrador de Pewi
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isApk = Boolean(
      window.AndroidApp?.isApk() ||
      (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("ElPericonApp"))
    );

    if (isApk && window.AndroidApp?.getDeviceId) {
      try {
        const devId = window.AndroidApp.getDeviceId();
        setAdminDeviceId(devId);
        setIsApkAdminDevice(true);

        const masterId = localStorage.getItem("pericon_admin_master_device_id");
        const savedToken = localStorage.getItem("pericon_admin_master_token");

        // Si este teléfono ya está registrado como maestro y tiene token guardado, auto-iniciar sesión
        if (masterId && masterId === devId && savedToken) {
          setAdminToken(savedToken);
          setIsAuthenticated(true);
          sessionStorage.setItem("guardian_session_auth", "true");
          sessionStorage.setItem("guardian_admin_token", savedToken);
          loadData(savedToken);
          return;
        }

        // Si es la APK, sugerir usuario "Guardian" por comodidad
        setUsernameInput("Guardian");
      } catch (e) {
        console.warn("[AdminHardwareLock] Error verificando hardware:", e);
      }
    } else {
      // En navegadores web se limpia la sesión por seguridad estricta
      sessionStorage.removeItem("guardian_session_auth");
      sessionStorage.removeItem("guardian_admin_token");
      setAdminToken("");
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      setAuthError("Ingresa usuario y contraseña.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setAdminToken(data.token);
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("guardian_session_auth", "true");
          sessionStorage.setItem("guardian_admin_token", data.token);

          // Si inicia sesión desde la APK, sellar este teléfono como el Dispositivo Maestro Exclusivo
          if (window.AndroidApp?.getDeviceId) {
            try {
              const devId = window.AndroidApp.getDeviceId();
              localStorage.setItem("pericon_admin_master_device_id", devId);
              localStorage.setItem("pericon_admin_master_token", data.token);
              setAdminDeviceId(devId);
              setIsApkAdminDevice(true);
              if (window.AndroidApp.showToast) {
                window.AndroidApp.showToast("📱 Celular vinculado como Administrador Exclusivo");
              }
            } catch (_) {}
          }
        }
        loadData(data.token);
        return;
      }

      setAuthError(data.message || "Usuario o contraseña de administrador incorrecta.");
    } catch {
      setAuthError("Error de comunicación con el servidor. Verifica tu conexión.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminToken("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("guardian_session_auth");
      sessionStorage.removeItem("guardian_admin_token");
      localStorage.removeItem("pericon_admin_master_token");
    }
  };

  const loadData = async (overrideToken?: string | unknown) => {
    const tokenStr = typeof overrideToken === "string" ? overrideToken : undefined;
    setLoading(true);
    try {
      const [resStats, resRecharges, resWithdrawals, resUsers, resMatches, resPromos, resAnnounce, resBot, resFeedbacks, resExpenses] = await Promise.all([
        adminFetch(`${apiUrl}/api/admin/stats`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/recharges?status=ALL`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/withdrawals?status=ALL`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/users`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/matches?period=${matchPeriodFilter}&type=${matchTypeFilter}`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/promos`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/announcements`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/bot-matches`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/feedbacks`, {}, tokenStr),
        adminFetch(`${apiUrl}/api/admin/expenses`, {}, tokenStr),
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
        if (statsData.botDifficulty?.mode) {
          setBotDifficultyMode(statsData.botDifficulty.mode);
        }
      }
      if (resRecharges.ok) setRecharges(await resRecharges.json());
      if (resWithdrawals.ok) setWithdrawals(await resWithdrawals.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resMatches.ok) {
        const mData = await resMatches.json();
        if (Array.isArray(mData)) {
          setMatches(mData);
        } else {
          setMatches(mData.matches || []);
          if (mData.summary) setMatchesPeriodSummary(mData.summary);
          if (mData.dailyActivity) setMatchesDailyActivity(mData.dailyActivity);
        }
      }
      if (resPromos.ok) setPromos(await resPromos.json());
      if (resAnnounce.ok) setAnnouncements(await resAnnounce.json());
      if (resFeedbacks.ok) {
        const fData = await resFeedbacks.json();
        setFeedbacks(fData.feedbacks || []);
        setFeedbackStats({ total: fData.total || 0, averageRating: fData.averageRating || 5.0 });
      }
      if (resExpenses.ok) {
        const expData = await resExpenses.json();
        setExpenses(Array.isArray(expData.expenses) ? expData.expenses : []);
      }
      if (resBot.ok) {
        const botData = await resBot.json();
        setBotMatches(botData.matches || []);
        if (botData.summary) setBotSummary(botData.summary);
        if (botData.todaySummary) setBotTodaySummary(botData.todaySummary);
        if (botData.yesterdaySummary) setBotYesterdaySummary(botData.yesterdaySummary);
        if (botData.dailyBreakdown) setBotDailyBreakdown(botData.dailyBreakdown);
      }
      await fetchErrorLogs();
      await fetchBotDifficulty();
      await fetchVirtualBots();
      await fetchCheStatus();
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterMatchesPeriod = async (p: "dia" | "semana" | "mes" | "todo") => {
    setMatchPeriodFilter(p);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/matches?period=${p}&type=${matchTypeFilter}`);
      if (res.ok) {
        const mData = await res.json();
        if (Array.isArray(mData)) {
          setMatches(mData);
        } else {
          setMatches(mData.matches || []);
          if (mData.summary) setMatchesPeriodSummary(mData.summary);
          if (mData.dailyActivity) setMatchesDailyActivity(mData.dailyActivity);
        }
      }
    } catch (e) {
      console.error("Error al filtrar partidas por período:", e);
    }
  };

  const handleFilterMatchesType = async (t: "pvp" | "bot" | "all") => {
    setMatchTypeFilter(t);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/matches?period=${matchPeriodFilter}&type=${t}`);
      if (res.ok) {
        const mData = await res.json();
        if (Array.isArray(mData)) {
          setMatches(mData);
        } else {
          setMatches(mData.matches || []);
          if (mData.summary) setMatchesPeriodSummary(mData.summary);
          if (mData.dailyActivity) setMatchesDailyActivity(mData.dailyActivity);
        }
      }
    } catch (e) {
      console.error("Error al filtrar partidas por tipo:", e);
    }
  };

  const loadBotMatches = async (searchQuery: string = botSearch, filterType: string = botResultFilter) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/bot-matches?search=${encodeURIComponent(searchQuery)}&filter=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setBotMatches(data.matches || []);
        if (data.summary) setBotSummary(data.summary);
        if (data.todaySummary) setBotTodaySummary(data.todaySummary);
        if (data.yesterdaySummary) setBotYesterdaySummary(data.yesterdaySummary);
        if (data.dailyBreakdown) setBotDailyBreakdown(data.dailyBreakdown);
      }
    } catch (e) {
      console.error("Error al cargar partidas vs bot:", e);
    }
  };

  const exportBotMatchesCSV = () => {
    const headers = ["ID", "Usuario", "Rival", "Apuesta", "Resultado", "Monedas Ganadas", "Monedas Perdidas", "Comision Casa (10%)", "Impacto Casa", "Saldo Final", "Motivo", "Fecha"];
    const rows = filteredBotMatches.map((m) => [
      m.id,
      m.username,
      m.botName,
      m.betAmount,
      m.userWon ? "GANO USUARIO" : "GANO BOT",
      m.coinsWon,
      m.coinsLost,
      m.houseCommission || (m.userWon ? Math.round(m.betAmount * 0.1) : 0),
      m.houseProfit,
      m.userCoinsAfter,
      m.endReason,
      m.createdAt,
    ]);
    downloadCSV(`partidas_bot_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleResetMatchHistory = async () => {
    if (!window.confirm("⚠️ ¿Estás completamente seguro de reiniciar a CERO todas las partidas (Multijugador y Solitario vs Bot) y las ganancias de la casa?\n\nEsta acción dejará el panel administrativo completamente limpio en cero (0 partidas jugadas y 0 ganancias acumuladas) para iniciar el conteo oficial con dinero real a partir de la próxima jugada.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/matches/reset-history`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setActionMessage(`🔄 ${data.message}`);
        loadData();
      } else {
        alert(data.message || "Error al reiniciar estadísticas del panel.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/announcements`);
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (err) {
      console.error("Error cargando comunicados:", err);
    }
  };

  const fetchErrorLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (errorStatusFilter !== "ALL") queryParams.append("status", errorStatusFilter);
      if (errorSourceFilter !== "ALL") queryParams.append("source", errorSourceFilter);
      const res = await adminFetch(`${apiUrl}/api/admin/errors?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data.items || []);
        setErrorCounts({
          total: data.totalErrors || 0,
          new: data.newErrors || 0,
          resolved: data.resolvedErrors || 0
        });
      }
    } catch (err) {
      console.error("Error loading error logs:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchErrorLogs();
    }
  }, [errorStatusFilter, errorSourceFilter, isAuthenticated]);

  // Monitoreo Automático de Recargas y Notificaciones Nativas para Administrador (APK & Web)
  const lastPendingCountRef = React.useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const res = await adminFetch(`${apiUrl}/api/admin/stats`);
        if (res.ok) {
          const statsData: AdminStats = await res.json();
          setStats(statsData);

          const currentPending = statsData.pendingRecharges || 0;
          if (currentPending > lastPendingCountRef.current && currentPending > 0) {
            showNativeNotification(
              "🔔 ¡Nueva Recarga Pendiente!",
              `Hay ${currentPending} recarga(s) esperando tu aprobación en El Pericón.`,
              "/admin"
            );
            triggerNativeHaptic('heavy');
          }
          lastPendingCountRef.current = currentPending;
        }
      } catch {
        // Monitoreo silencioso
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, apiUrl]);

  const handleUpdateErrorStatus = async (id: number, status: string, notes?: string) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/errors/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes })
      });
      if (res.ok) {
        setActionMessage(`✅ Incidencia #${id} marcada como ${status}`);
        setEditingNotesId(null);
        fetchErrorLogs();
      }
    } catch (err) {
      console.error("Error updating error status:", err);
    }
  };

  const handleDeleteError = async (id: number) => {
    if (!confirm(`¿Eliminar reporte #${id}?`)) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/errors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setActionMessage(`🗑️ Incidencia #${id} eliminada`);
        if (selectedError?.id === id) setSelectedError(null);
        fetchErrorLogs();
      }
    } catch (err) {
      console.error("Error deleting error:", err);
    }
  };

  const handleClearResolvedErrors = async () => {
    if (!confirm("¿Deseas eliminar todas las incidencias marcadas como RESUELTO?")) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/errors/clear-resolved`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`🧹 ${data.message}`);
        fetchErrorLogs();
      }
    } catch (err) {
      console.error("Error clearing resolved errors:", err);
    }
  };

  const handleToggleFeaturedFeedback = async (id: number) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/feedback/${id}/toggle-featured`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isFeatured: data.isFeatured } : f));
        setActionMessage(data.isFeatured ? "⭐ Opinión destacada como testimonio público" : "Opinión removida de destacados");
      }
    } catch (err) {
      alert("Error al actualizar estado");
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta opinión de jugador?")) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
        setActionMessage("🗑️ Opinión eliminada correctamente");
      }
    } catch (err) {
      alert("Error al eliminar opinión");
    }
  };

  // Helper para descarga de archivos CSV compatibles con Microsoft Excel (UTF-8 con BOM)
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (cell: string | number) => {
      const str = cell !== null && cell !== undefined ? String(cell) : "";
      return `"${str.replace(/"/g, '""')}"`;
    };
    const csvContent =
      "\uFEFF" +
      [
        headers.map(escapeCell).join(";"),
        ...rows.map((row) => row.map(escapeCell).join(";")),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar Usuarios a Excel/CSV
  const exportUsersCSV = () => {
    const headers = ["ID", "Usuario", "Email", "Monedas", "Victorias", "Derrotas", "Total Partidas", "% Victorias", "Nivel", "Estado", "Fecha Registro"];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.username,
      u.email,
      u.coins,
      u.wins,
      u.losses,
      u.totalMatches,
      `${u.winRate}%`,
      u.level,
      u.isActive ? "ACTIVO" : "BANEADO",
      u.createdAt,
    ]);
    downloadCSV(`usuarios_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Exportar Recargas a Excel/CSV
  const exportRechargesCSV = () => {
    const headers = ["ID", "Usuario", "Email", "Monto Bs", "Monedas", "Referencia", "Estado", "Fecha Creacion", "Fecha Procesado"];
    const rows = recharges.map((r) => [
      r.id,
      r.username,
      r.userEmail,
      r.amountBs,
      r.coinsAmount,
      r.reference,
      r.status,
      r.createdAt,
      r.processedAt || "",
    ]);
    downloadCSV(`recargas_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Exportar Retiros a Excel/CSV
  const exportWithdrawalsCSV = () => {
    const headers = ["ID", "Usuario", "Email", "Monedas", "Monto Bs", "Banco", "Telefono", "Cedula", "Estado", "Ref Admin", "Fecha"];
    const rows = withdrawals.map((w) => [
      w.id,
      w.username,
      w.userEmail,
      w.coinsAmount,
      w.amountBs,
      w.bankName,
      w.phoneNumber,
      w.idCard,
      w.status,
      w.adminReference || "",
      w.createdAt,
    ]);
    downloadCSV(`retiros_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Exportar Partidas a Excel/CSV
  const exportMatchesCSV = () => {
    const headers = ["ID", "Jugador 1", "Jugador 2", "Apuesta/Jugador", "Pozo Total", "Comision Casa", "Ganador", "Premio", "Fin", "Fecha"];
    const rows = matches.map((m) => [
      m.id,
      m.playerOneName,
      m.playerTwoName,
      m.betPerPlayer,
      m.totalPot,
      m.houseCommission,
      m.winnerUsername,
      m.winnerPrize,
      m.endReason,
      m.createdAt,
    ]);
    downloadCSV(`partidas_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Exportar Cupones a Excel/CSV
  const exportPromosCSV = () => {
    const headers = ["ID", "Codigo", "Monedas Otorgadas", "Usos Actuales", "Limite Usos", "Estado", "Fecha Creacion", "Vencimiento"];
    const rows = promos.map((p) => [
      p.id,
      p.code,
      p.coinsReward,
      p.currentUses,
      p.maxUses,
      p.isActive ? "ACTIVO" : "INACTIVO",
      p.createdAt,
      p.expiresAt || "Sin Vencimiento",
    ]);
    downloadCSV(`cupones_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Exportar Reporte Financiero a Excel/CSV
  
  // Manejo de Gastos y Movimientos de Caja
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseFormAmount);
    if (isNaN(amt) || amt <= 0) {
      Swal.fire({ icon: "error", title: "Monto inválido", text: "Por favor ingrese un monto mayor a 0." });
      return;
    }
    if (!expenseFormDescription.trim()) {
      Swal.fire({ icon: "error", title: "Descripción requerida", text: "Ingrese una descripción o concepto del gasto." });
      return;
    }

    let usdtReceivedNum: number | null = null;
    if (expenseFormType === "COMPRA_USDT") {
      const usdtVal = parseFloat(expenseFormUsdtReceived);
      if (isNaN(usdtVal) || usdtVal <= 0) {
        Swal.fire({ icon: "error", title: "USDT Inválido", text: "Ingrese la cantidad de USDT recibidos." });
        return;
      }
      usdtReceivedNum = usdtVal;
    }

    try {
      setLoadingExpense(true);
      const bodyPayload = {
        description: expenseFormDescription.trim(),
        category: expenseFormType === "COMPRA_USDT" ? "Compra USDT" : expenseFormCategory,
        currency: expenseFormType === "USDT" ? "USDT" : "BS",
        amount: amt,
        usdtReceived: usdtReceivedNum,
        exchangeRate: usdtReceivedNum && usdtReceivedNum > 0 ? Number((amt / usdtReceivedNum).toFixed(4)) : null,
        notes: expenseFormNotes.trim() || null
      };

      const res = await adminFetch(`${apiUrl}/api/admin/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "¡Gasto Registrado!",
          text: "El movimiento ha sido registrado y el balance de caja se ha actualizado.",
          timer: 2000,
          showConfirmButton: false
        });
        setIsExpenseModalOpen(false);
        setExpenseFormDescription("");
        setExpenseFormAmount("");
        setExpenseFormUsdtReceived("");
        setExpenseFormNotes("");
        loadData();
      } else {
        const err = await res.json();
        Swal.fire({ icon: "error", title: "Error", text: err.message || "No se pudo registrar el gasto." });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error de conexión", text: err.message });
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    const result = await Swal.fire({
      title: "¿Eliminar este gasto?",
      text: "Esta acción reintegrará el monto al balance neto de la caja correspondiente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const res = await adminFetch(`${apiUrl}/api/admin/expenses/${id}`, { method: "DELETE" });
        if (res.ok) {
          Swal.fire("Eliminado", "El gasto ha sido eliminado de la caja.", "success");
          loadData();
        } else {
          const err = await res.json();
          Swal.fire("Error", err.message || "No se pudo eliminar el gasto.", "error");
        }
      } catch (err: any) {
        Swal.fire("Error", err.message, "error");
      }
    }
  };

  const exportFinancialReportCSV = () => {
    const headers = ["Metrica Financiera", "Valor"];
    const rows = [
      ["Ingresos por Recargas Confirmados/Aprobados (Bs.)", `Bs. ${financialSummary.totalDeposits.toLocaleString()}`],
      ["Cantidad de Recargas Aprobadas", String(financialSummary.approvedCount)],
      ["Recargas Pendientes por Validar (Bs.)", `Bs. ${financialSummary.pendingDepositsBs.toLocaleString()}`],
      ["Cantidad de Recargas Pendientes", String(financialSummary.pendingCount)],
      ["Total Recargas Registradas Hoy (Bs.)", `Bs. ${financialSummary.todayRechargesBs.toLocaleString()}`],
      ["Cantidad de Recargas Hoy", String(financialSummary.todayRechargesCount)],
      ["Pagos por Retiros Realizados (Bs.)", `Bs. ${financialSummary.totalWithdrawalsPaid.toLocaleString()}`],
      ["Cantidad de Retiros Pagados", String(financialSummary.paidWithdrawalsCount)],
      ["Retiros Pendientes por Procesar (Bs.)", `Bs. ${financialSummary.pendingWithdrawalsBs.toLocaleString()}`],
      ["Cantidad de Retiros Pendientes", String(financialSummary.pendingWithdrawalsCount)],
      ["Gastos Operativos en Bolívares (Bs.)", `Bs. ${financialSummary.totalBsExpenses.toLocaleString()}`],
      ["Caja Real Neta en Bolívares (Bs.)", `Bs. ${financialSummary.cajaNetaBs.toLocaleString()}`],
      ["Total Compras de USDT Realizadas (USDT)", `$ ${financialSummary.totalUsdtPurchased.toLocaleString()} USDT`],
      ["Total Gastos en USDT (USDT)", `$ ${financialSummary.totalUsdtExpenses.toLocaleString()} USDT`],
      ["Caja Real Neta en USDT (USDT)", `$ ${financialSummary.cajaNetaUsdt.toLocaleString()} USDT`],
      ["Balance Neto Confirmado en Caja (Bs.)", `Bs. ${financialSummary.netBsBalance.toLocaleString()}`],
      ["Balance Neto Proyectado con Pendientes (Bs.)", `Bs. ${financialSummary.netBsBalanceWithPending.toLocaleString()}`],
      ["Comisión de Sala Acumulada (Monedas)", `🪙 ${financialSummary.totalCommissions.toLocaleString()}`],
      ["Balance de la Casa en Bot (Monedas)", `🪙 ${financialSummary.totalBotHouseProfit.toLocaleString()}`],
      ["Ganancia Neta Total Casa (Monedas)", `🪙 ${financialSummary.totalCombinedProfit.toLocaleString()}`],
      ["Monedas en Manos de Jugadores", `🪙 ${financialSummary.totalCoinsInUsers.toLocaleString()}`],
      ["Volumen Total Apostado Global", `🪙 ${(financialSummary.totalWagered + financialSummary.totalBotCoinsWagered).toLocaleString()}`],
      ["Total Partidas Registradas", String(financialSummary.totalMatches + financialSummary.totalBotMatches)],
      ["Total Usuarios Registrados", String(users.length)],
      ["Fecha de Generación del Reporte", new Date().toLocaleString()],
    ];
    downloadCSV(`reporte_financiero_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Transmitir Anuncio Global en Vivo y Guardarlo en Base de Datos
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/broadcast-announcement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle.trim() || "📢 COMUNICADO OFICIAL",
          message: broadcastMessage.trim(),
          type: broadcastType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`📢 ${data.message}`);
        setBroadcastMessage("");
        loadAnnouncements();
      } else {
        alert(data.message || "Error al transmitir anuncio.");
      }
    } catch {
      alert("Error de conexión con el servidor.");
    } finally {
      setBroadcasting(false);
    }
  };

  // Activar o Pausar Comunicado
  const handleToggleAnnouncement = async (id: number) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/announcements/${id}/toggle`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMessage(`📢 ${data.message || "Estado de comunicado actualizado."}`);
        loadAnnouncements();
      } else {
        alert(data.message || `Error del servidor (${res.status}) al cambiar estado del comunicado.`);
      }
    } catch (err: any) {
      alert(`Error al conectar con el servidor: ${err?.message || "fallo de red"}`);
    }
  };

  // Eliminar Comunicado
  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("¿Deseas eliminar este comunicado permanentemente?")) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMessage(`🗑️ ${data.message || "Comunicado eliminado exitosamente."}`);
        loadAnnouncements();
      } else {
        alert(data.message || `Error del servidor (${res.status}) al eliminar comunicado.`);
      }
    } catch (err: any) {
      alert(`Error al conectar con el servidor: ${err?.message || "fallo de red"}`);
    }
  };


  // Funciones de Apoyo para Directorio de WhatsApp
  const cleanPhoneDigits = (phone?: string) => {
    if (!phone) return "";
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "58" + digits.slice(1);
    } else if (digits.length === 10 && (digits.startsWith("412") || digits.startsWith("414") || digits.startsWith("424") || digits.startsWith("416") || digits.startsWith("426"))) {
      digits = "58" + digits;
    }
    return digits;
  };

  const getWhatsAppMessageText = (username: string) => {
    if (whatsappTemplate === "grupo") {
      const link = whatsappGroupLink.trim() || "[ENLACE_DEL_GRUPO]";
      return `¡Hola ${username}! 🃏 Te saluda el equipo de El Pericón. Te invitamos a unirte a nuestro Grupo Oficial de WhatsApp para enterarte de partidas, torneos relámpago, promociones y recargas: ${link}`;
    }
    if (whatsappTemplate === "torneo") {
      return `¡Hola ${username}! 🏆 Te escribe la administración de El Pericón. Te invitamos al próximo gran torneo en nuestra plataforma. ¡Participa y gana fabulosos premios!`;
    }
    if (whatsappTemplate === "promo") {
      return `¡Hola ${username}! 🎁 Te escribe El Pericón. Tenemos promociones activas y recargas con bonificación especial para ti. ¡Entra a jugar hoy!`;
    }
    if (whatsappTemplate === "novedades") {
      return `¡Hola ${username}! 📢 En El Pericón hemos lanzado nuevas actualizaciones y salas disponibles para ti. ¡Entra y pruébalas!`;
    }
    return customWaMessage.trim();
  };

  const getWhatsAppLink = (phone?: string, username: string = "Jugador") => {
    const clean = cleanPhoneDigits(phone);
    if (!clean) return "#";
    const text = getWhatsAppMessageText(username);
    return text ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}` : `https://wa.me/${clean}`;
  };

  const getRechargeApprovedWhatsAppLink = (r: RechargeRow) => {
    const phone = r.userPhone || users.find((u) => u.id === r.userId)?.phoneNumber;
    const clean = cleanPhoneDigits(phone);
    if (!clean) return "#";
    const text = `¡Hola ${r.username}! 🪙 Tu recarga de Bs. ${r.amountBs.toLocaleString()} (${r.coinsAmount.toLocaleString()} Monedas) ha sido APROBADA exitosamente en El Pericón. Tu saldo ya se encuentra acreditado en tu cuenta. ¡Mucho éxito en tus partidas! 🃏`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const getWithdrawalPaidWhatsAppLink = (w: WithdrawalRow) => {
    const clean = cleanPhoneDigits(w.phoneNumber);
    if (!clean) return "#";
    const refText = w.adminReference ? ` (Ref Bancaria: ${w.adminReference})` : "";
    const text = `¡Hola ${w.username}! 💸 Tu retiro de ${w.coinsAmount.toLocaleString()} Monedas (Bs. ${w.amountBs.toLocaleString()}) ha sido PROCESADO Y PAGADO exitosamente por Pago Móvil a tu cuenta (${w.bankName}, Cédula: ${w.idCard})${refText}. ¡Gracias por jugar en El Pericón! 🏆`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const copyAllWhatsAppNumbers = () => {
    const phones = users
      .map((u) => cleanPhoneDigits(u.phoneNumber))
      .filter((p) => Boolean(p));
    const uniquePhones = Array.from(new Set(phones));
    if (uniquePhones.length === 0) {
      alert("No hay números de WhatsApp registrados aún.");
      return;
    }
    const text = uniquePhones.map((p) => `+${p}`).join(", ");
    copyToClipboard(text, "whatsapp_all");
    setActionMessage(`📋 ${uniquePhones.length} números de WhatsApp copiados al portapapeles.`);
  };

  const exportWhatsAppCSV = () => {
    const headers = ["ID", "Usuario", "Email", "WhatsApp_Formato_Internacional", "Monedas", "Estado", "Fecha_Registro"];
    const rows = users
      .filter((u) => Boolean(u.phoneNumber && u.phoneNumber.trim()))
      .map((u) => [
        u.id,
        u.username,
        u.email,
        `+${cleanPhoneDigits(u.phoneNumber)}`,
        u.coins,
        u.isActive ? "ACTIVO" : "BANEADO",
        u.createdAt,
      ]);
    downloadCSV(`directorio_whatsapp_pericon_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const exportWhatsAppVCF = () => {
    const validUsers = users.filter((u) => Boolean(u.phoneNumber && u.phoneNumber.trim()));
    if (validUsers.length === 0) {
      alert("No hay usuarios con número de WhatsApp registrado.");
      return;
    }

    let vcf = "";
    validUsers.forEach((u) => {
      const clean = cleanPhoneDigits(u.phoneNumber);
      if (clean) {
        vcf += "BEGIN:VCARD\r\n";
        vcf += "VERSION:3.0\r\n";
        vcf += `FN:Pericon - ${u.username}\r\n`;
        vcf += `TEL;TYPE=CELL:+${clean}\r\n`;
        vcf += "END:VCARD\r\n";
      }
    });

    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contactos_pericon_para_whatsapp_${new Date().toISOString().slice(0, 10)}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActionMessage(`📇 Archivo de contactos VCF generado con éxito (${validUsers.length} jugadores listos para guardar en tu celular).`);
  };

  // Crear Nuevo Cupón Promocional
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || newPromoCoins <= 0) return;
    setCreatingPromo(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/promos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newPromoCode.trim().toUpperCase(),
          coinsReward: newPromoCoins,
          maxUses: newPromoMaxUses,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🎟️ ${data.message}`);
        setNewPromoCode("");
        loadData();
      } else {
        alert(data.message || "Error al crear cupón.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    } finally {
      setCreatingPromo(false);
    }
  };

  // Activar o Pausar Cupón
  const handleTogglePromo = async (id: number) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/promos/${id}/toggle`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🎟️ ${data.message}`);
        loadData();
      } else {
        alert(data.message || "Error al modificar cupón.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  // BAN / DESBANEAR USUARIO
  const handleToggleBan = async (u: UserRow) => {
    if (u.username.toLowerCase() === "guardian") {
      alert("No es posible suspender la cuenta del Administrador Guardian.");
      return;
    }

    const actionText = u.isActive ? "suspender / banear" : "habilitar";
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText} a ${u.username}?`)) {
      return;
    }

    try {
      const res = await adminFetch(`${apiUrl}/api/admin/user/${u.id}/toggle-ban`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🛡️ ${data.message}`);
        loadData();
      } else {
        alert(data.message || "Error al modificar estado del usuario.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    }
  };

  // BANEAR MULTICUENTAS / CLONES POR DISPOSITIVO O SERIE
  const handleBanDeviceClones = async (u: UserRow) => {
    if (u.username.toLowerCase() === "guardian") {
      alert("No es posible suspender la cuenta del Administrador Guardian.");
      return;
    }

    const confirmBan = window.confirm(
      `¿Deseas suspender a "${u.username}" y a TODAS las multicuentas/clones creados desde su mismo dispositivo o serie?\n\nEsto desactivará y vaciará las monedas de todas las cuentas vinculadas.`
    );
    if (!confirmBan) return;

    try {
      const res = await adminFetch(`${apiUrl}/api/admin/users/ban-device-clones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Multicuentas Suspendidas",
          text: data.message || `Se suspendieron ${data.bannedCount} cuentas vinculadas exitosamente.`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b",
        });
        loadData();
      } else {
        alert(data.message || "Error al banear multicuentas.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    }
  };

  // AJUSTAR MONEDAS (ACREDITAR O QUITAR)
  const handleSaveCoinsAdjustment = async () => {
    if (!adjustingUser) return;
    const rawAmt = Math.abs(adjustAmount);
    if (rawAmt <= 0) {
      alert("Por favor ingresa una cantidad mayor a 0 monedas.");
      return;
    }

    if (adjustMode === "subtract" && adjustingUser.coins <= 0) {
      alert("El usuario ya tiene 0 monedas. No se le pueden restar más monedas.");
      return;
    }

    const finalAmount = adjustMode === "subtract" ? -rawAmt : rawAmt;
    const reasonText = adjustReason.trim() || (adjustMode === "subtract" ? "Deducción administrativa" : "Acreditación administrativa");

    try {
      const res = await adminFetch(`${apiUrl}/api/admin/user/${adjustingUser.id}/adjust-coins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, reason: reasonText }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🛡️ ${data.message}`);
        setAdjustingUser(null);
        setAdjustReason("");
        loadData();
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("pericon_user");
            if (raw && data.coins !== undefined) {
              const u = JSON.parse(raw);
              if (u && (String(u.id) === String(adjustingUser.id) || u.username === adjustingUser.username)) {
                u.coins = data.coins;
                localStorage.setItem("pericon_user", JSON.stringify(u));
              }
            }
          }
        } catch {}
      } else {
        alert(data.message || "Error al ajustar monedas.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    }
  };

  // RESETEAR CONTRASEÑA DE USUARIO (ADMIN)
  const handleOpenResetModal = (u: UserRow) => {
    setResettingUser(u);
    const gen = "Pericon" + Math.floor(1000 + Math.random() * 9000) + "*";
    setNewPasswordInput(gen);
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingUser || !newPasswordInput.trim()) return;
    if (newPasswordInput.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setResettingLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/user/${resettingUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      const data = await res.json();
      setResettingLoading(false);

      if (res.ok) {
        setResetSuccessModal({
          username: resettingUser.username,
          password: newPasswordInput,
          phone: resettingUser.phoneNumber,
        });
        setResettingUser(null);
        setActionMessage(`🔑 Contraseña de ${resettingUser.username} actualizada con éxito.`);
      } else {
        alert(data.message || "Error al restablecer contraseña.");
      }
    } catch {
      setResettingLoading(false);
      alert("Error de conexión con el servidor.");
    }
  };

  // APROBAR RECARGA
  const handleApproveRecharge = async (id: number) => {
    const foundRecharge = recharges.find((r) => r.id === id);
    const targetUser = foundRecharge ? `${foundRecharge.username} (Bs. ${foundRecharge.amountBs} · Ref: ${foundRecharge.reference})` : `Recarga #${id}`;
    if (!window.confirm(`⚠️ ¿Estás completamente seguro de APROBAR la recarga para ${targetUser}?

Esta acción acreditará las monedas al monedero del jugador.`)) {
      return;
    }
    setActionMessage(null);
      fetchReactivationCandidates();
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/recharge/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message || "Recarga aprobada exitosamente."}`);
        loadData();
        const found = recharges.find((r) => r.id === id);
        if (found) {
          const waUrl = getRechargeApprovedWhatsAppLink(found);
          if (waUrl && waUrl !== "#" && window.confirm("¿Deseas abrir WhatsApp para notificar al jugador que su recarga fue aprobada?")) {
            window.open(waUrl, "_blank");
          }
        }
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("pericon_user");
            if (raw && data.userNewCoins !== undefined) {
              const u = JSON.parse(raw);
              if (u && String(u.id) === String(data.userId)) {
                u.coins = data.userNewCoins;
                localStorage.setItem("pericon_user", JSON.stringify(u));
              }
            }
          }
        } catch {}
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch {
      setActionMessage("Error de conexión al aprobar la recarga.");
    }
  };

  // RESTABLECER RECARGA A PENDIENTE
  const handleResetPendingRecharge = async (id: number) => {
    if (!window.confirm(`⚠️ ¿Deseas restablecer la recarga #${id} a estado PENDIENTE para revisión manual?`)) {
      return;
    }
    setActionMessage(null);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/recharge/${id}/reset-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revertCoins: false })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🔄 Recarga #${id} restablecida a estado PENDIENTE.`);
        loadData();
      } else {
        alert(data.message || "Error al restablecer recarga.");
      }
    } catch {
      alert("Error de conexión al restablecer recarga.");
    }
  };

  // RECHAZAR RECARGA
  const handleRejectRecharge = async (id: number) => {
    const reason = window.prompt(
      "Ingresa el motivo del rechazo:",
      "No se visualiza la transferencia en la cuenta bancaria de El Pericón."
    );
    if (reason === null) return;

    setActionMessage(null);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/recharge/${id}/reject`, {
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
    } catch {
      setActionMessage("Error de conexión al rechazar la recarga.");
    }
  };

  // APROBAR RETIRO CON MODAL SWEETALERT2
  const handleApproveWithdrawal = async (w: WithdrawalRow) => {
    const result = await Swal.fire({
      title: "Marcar Retiro como Pagado",
      html: `
        <div style="text-align: left; font-size: 13px; color: #fde68a; line-height: 1.6;">
          <p><strong>Jugador:</strong> @${w.username}</p>
          <p><strong>Monto a pagar:</strong> <span style="color:#10b981; font-weight:bold; font-size: 15px;">Bs. ${w.amountBs.toLocaleString()}</span> (${w.coinsAmount.toLocaleString()} monedas)</p>
          <hr style="border: 1px solid rgba(245,158,11,0.2); margin: 8px 0;" />
          <p><strong>Banco:</strong> ${w.bankName}</p>
          <p><strong>Teléfono:</strong> ${w.phoneNumber}</p>
          <p><strong>Cédula:</strong> ${w.idCard}</p>
        </div>
      `,
      input: "text",
      inputLabel: "Número de Referencia del Pago Móvil que realizaste:",
      inputPlaceholder: "Ingresa el Nº de comprobante...",
      showCancelButton: true,
      confirmButtonText: "✅ Confirmar Pago Realizado",
      cancelButtonText: "Cancelar",
      background: "#180e07",
      color: "#fef3c7",
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#374151",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "¡Debes ingresar el número de referencia del Pago Móvil!";
        }
        return null;
      }
    });

    if (!result.isConfirmed || !result.value || !result.value.trim()) return;
    const ref = result.value.trim();

    setActionMessage(null);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/withdrawal/${w.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref, forceApprove: true }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "¡Retiro Marcado como Pagado!",
          text: `Retiro #${w.id} de @${w.username} por Bs. ${w.amountBs.toLocaleString()} marcado como PAGADO exitosamente.`,
          background: "#180e07",
          color: "#fef3c7",
          confirmButtonColor: "#f59e0b",
          timer: 3500
        });
        loadData();
        const updatedW: WithdrawalRow = { ...w, adminReference: ref, status: "PAGADO" };
        const waUrl = getWithdrawalPaidWhatsAppLink(updatedW);
        if (waUrl && waUrl !== "#") {
          window.open(waUrl, "_blank");
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error al marcar como pagado",
          text: data.message || "El servidor no pudo procesar la solicitud.",
          background: "#180e07",
          color: "#fef3c7"
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: err?.message || "No se pudo conectar con el servidor.",
        background: "#180e07",
        color: "#fef3c7"
      });
    }
  };

  // RECHAZAR RETIRO
  const handleRejectWithdrawal = async (w: WithdrawalRow) => {
    const reason = window.prompt(
      `Rechazar retiro de ${w.coinsAmount} monedas de ${w.username}.\n(Las monedas se le reembolsarán a su saldo).\n\nMotivo del rechazo:`,
      "Datos de Pago Móvil incorrectos o cuenta receptora rechazada."
    );
    if (reason === null) return;

    setActionMessage(null);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/withdrawal/${w.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`⚠️ Retiro #${w.id} rechazado y monedas reembolsadas a ${w.username}.`);
        loadData();
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch {
      setActionMessage("Error de conexión al rechazar el retiro.");
    }
  };

  // Usuarios filtrados y buscados
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(userSearch.toLowerCase()));
      if (!matchesSearch) return false;

      if (userStatusFilter === "active") return u.isActive;
      if (userStatusFilter === "banned") return !u.isActive;
      return true;
    });
  }, [users, userSearch, userStatusFilter]);

  // Usuarios con y sin WhatsApp para métricas
  const usersWithPhone = useMemo(() => users.filter((u) => Boolean(u.phoneNumber && u.phoneNumber.trim())), [users]);
  const usersWithoutPhone = useMemo(() => users.filter((u) => !u.phoneNumber || !u.phoneNumber.trim()), [users]);

  // Directorio de WhatsApp filtrado
  const filteredWhatsAppUsers = useMemo(() => {
    return users.filter((u) => {
      const q = whatsappSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q));
      if (!matchesSearch) return false;

      if (whatsappFilter === "with_phone") return Boolean(u.phoneNumber && u.phoneNumber.trim());
      if (whatsappFilter === "without_phone") return !u.phoneNumber || !u.phoneNumber.trim();
      return true;
    });
  }, [users, whatsappSearch, whatsappFilter]);

  // Partidas contra el Bot filtradas por búsqueda, resultado Y FECHA / PERIODO
  const filteredBotMatches = useMemo(() => {
    const todayStr = botTodaySummary?.date || new Date().toISOString().split("T")[0];
    const yesterdayStr = botYesterdaySummary?.date || "";

    return botMatches.filter((m) => {
      const q = botSearch.toLowerCase().trim();
      const matchSearch = !q || m.username.toLowerCase().includes(q) || m.botName.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (botResultFilter === "user_won") return m.userWon;
      if (botResultFilter === "bot_won") return !m.userWon;

      if (botDateFilter === "all") return true;

      const matchDate = m.createdAt ? m.createdAt.substring(0, 10) : "";
      if (botDateFilter === "today") return matchDate === todayStr;
      if (botDateFilter === "yesterday") return matchDate === yesterdayStr;
      if (botDateFilter === "last7") {
        const last7Dates = new Set(botDailyBreakdown.slice(0, 7).map((d) => d.date));
        return last7Dates.has(matchDate);
      }
      // Fecha específica seleccionada
      return matchDate === botDateFilter;
    });
  }, [botMatches, botSearch, botResultFilter, botDateFilter, botTodaySummary, botYesterdaySummary, botDailyBreakdown]);

  // Métricas dinámicas para los Boxes superiores basadas en el periodo o fecha seleccionada
  const currentBotMetrics = useMemo(() => {
    if (botDateFilter === "all") {
      return {
        title: "Acumulado Histórico Global",
        subtitle: "Todas las fechas registradas en la base de datos.",
        badge: "Histórico Completo",
        totalMatches: botSummary.totalBotMatches,
        userWins: botSummary.userWinsCount,
        botWins: botSummary.botWinsCount,
        userWinRate: botSummary.userWinRate,
        botWinRate: botSummary.botWinRate,
        totalCoinsWagered: botSummary.totalCoinsWagered,
        coinsWonByUser: botSummary.totalCoinsWonByUser,
        coinsWonByHouse: botSummary.totalCoinsWonByHouse,
        houseCommission: botDailyBreakdown.reduce((acc, d) => acc + (d.houseCommission || 0), 0),
        netHouseProfit: botSummary.netHouseProfit,
      };
    }

    if (botDateFilter === "today") {
      return {
        title: `Rendimiento de Hoy (${botTodaySummary?.date || "Hoy"})`,
        subtitle: "El contador reinicia a las 00:00 (Hora Venezuela). Meta dinámica 60% Bot / 40% Jugador.",
        badge: "Hoy",
        totalMatches: botTodaySummary?.totalMatches ?? 0,
        userWins: botTodaySummary?.userWins ?? 0,
        botWins: botTodaySummary?.botWins ?? 0,
        userWinRate: botTodaySummary?.userWinRate ?? 0,
        botWinRate: botTodaySummary?.botWinRate ?? 0,
        totalCoinsWagered: botTodaySummary?.totalCoinsWagered ?? 0,
        coinsWonByUser: botTodaySummary?.coinsWonByUser ?? 0,
        coinsWonByHouse: botTodaySummary?.coinsWonByHouse ?? 0,
        houseCommission: botTodaySummary?.houseCommission ?? 0,
        netHouseProfit: botTodaySummary?.netHouseProfit ?? 0,
      };
    }

    if (botDateFilter === "yesterday") {
      const yDate = botYesterdaySummary?.date || "";
      const yRow = botDailyBreakdown.find((d) => d.date === yDate) || botYesterdaySummary;
      return {
        title: `Rendimiento de Ayer (${yDate || "Ayer"})`,
        subtitle: "Jornada completa consolidada del día de ayer (Hora Venezuela).",
        badge: "Ayer",
        totalMatches: yRow?.totalMatches ?? 0,
        userWins: yRow?.userWins ?? 0,
        botWins: yRow?.botWins ?? 0,
        userWinRate: yRow?.userWinRate ?? 0,
        botWinRate: yRow?.botWinRate ?? 0,
        totalCoinsWagered: yRow?.totalCoinsWagered ?? 0,
        coinsWonByUser: yRow?.coinsWonByUser ?? 0,
        coinsWonByHouse: yRow?.coinsWonByHouse ?? 0,
        houseCommission: yRow?.houseCommission ?? 0,
        netHouseProfit: yRow?.netHouseProfit ?? 0,
      };
    }

    if (botDateFilter === "last7") {
      const slice7 = botDailyBreakdown.slice(0, 7);
      const totalMatches = slice7.reduce((acc, d) => acc + d.totalMatches, 0);
      const userWins = slice7.reduce((acc, d) => acc + d.userWins, 0);
      const botWins = slice7.reduce((acc, d) => acc + d.botWins, 0);
      const totalCoinsWagered = slice7.reduce((acc, d) => acc + d.totalCoinsWagered, 0);
      const coinsWonByUser = slice7.reduce((acc, d) => acc + d.coinsWonByUser, 0);
      const coinsWonByHouse = slice7.reduce((acc, d) => acc + d.coinsWonByHouse, 0);
      const houseCommission = slice7.reduce((acc, d) => acc + (d.houseCommission || 0), 0);
      const netHouseProfit = slice7.reduce((acc, d) => acc + d.netHouseProfit, 0);
      return {
        title: "Rendimiento de los Últimos 7 Días",
        subtitle: "Balance consolidado de los últimos 7 días de juego contra el Bot.",
        badge: "Últimos 7 Días",
        totalMatches,
        userWins,
        botWins,
        userWinRate: totalMatches > 0 ? Math.round((userWins / totalMatches) * 1000) / 10 : 0,
        botWinRate: totalMatches > 0 ? Math.round((botWins / totalMatches) * 1000) / 10 : 0,
        totalCoinsWagered,
        coinsWonByUser,
        coinsWonByHouse,
        houseCommission,
        netHouseProfit,
      };
    }

    // Fecha específica (ej: "2026-10-18")
    const matchRow = botDailyBreakdown.find((d) => d.date === botDateFilter);
    if (matchRow) {
      return {
        title: `Rendimiento del Día (${botDateFilter})`,
        subtitle: `Registro consolidado de la jornada del ${botDateFilter} (Hora Venezuela).`,
        badge: botDateFilter,
        totalMatches: matchRow.totalMatches,
        userWins: matchRow.userWins,
        botWins: matchRow.botWins,
        userWinRate: matchRow.userWinRate,
        botWinRate: matchRow.botWinRate,
        totalCoinsWagered: matchRow.totalCoinsWagered,
        coinsWonByUser: matchRow.coinsWonByUser,
        coinsWonByHouse: matchRow.coinsWonByHouse,
        houseCommission: matchRow.houseCommission ?? 0,
        netHouseProfit: matchRow.netHouseProfit,
      };
    }

    // Si no está en breakdown, calcular directamente de las partidas filtradas
    const dayMatches = botMatches.filter((m) => m.createdAt?.startsWith(botDateFilter));
    const totalMatches = dayMatches.length;
    const userWins = dayMatches.filter((m) => m.userWon).length;
    const botWins = dayMatches.filter((m) => !m.userWon).length;
    const totalCoinsWagered = dayMatches.reduce((acc, m) => acc + m.betAmount, 0);
    const coinsWonByUser = dayMatches.reduce((acc, m) => acc + m.coinsWon, 0);
    const coinsWonByHouse = dayMatches.reduce((acc, m) => acc + m.coinsLost, 0);
    const houseCommission = dayMatches.reduce((acc, m) => acc + (m.houseCommission || 0), 0);
    const netHouseProfit = dayMatches.reduce((acc, m) => acc + m.houseProfit, 0);

    return {
      title: `Rendimiento del Día (${botDateFilter})`,
      subtitle: `Registro de partidas para la fecha ${botDateFilter}.`,
      badge: botDateFilter,
      totalMatches,
      userWins,
      botWins,
      userWinRate: totalMatches > 0 ? Math.round((userWins / totalMatches) * 1000) / 10 : 0,
      botWinRate: totalMatches > 0 ? Math.round((botWins / totalMatches) * 1000) / 10 : 0,
      totalCoinsWagered,
      coinsWonByUser,
      coinsWonByHouse,
      houseCommission,
      netHouseProfit,
    };
  }, [botDateFilter, botTodaySummary, botYesterdaySummary, botSummary, botDailyBreakdown, botMatches]);

  // Partidas Multijugador (PvP) filtradas y análisis estadístico por jugador
  const { filteredPvpMatches, searchedPlayerSummary } = useMemo(() => {
    const q = playerMatchSearch.toLowerCase().trim();
    if (!q) {
      return { filteredPvpMatches: matches, searchedPlayerSummary: null };
    }

    const filtered = matches.filter((m) => {
      const p1 = m.playerOneName.toLowerCase();
      const p2 = m.playerTwoName.toLowerCase();
      const winner = m.winnerUsername.toLowerCase();
      const loser = m.loserUsername.toLowerCase();
      const matchesSearch =
        p1.includes(q) ||
        p2.includes(q) ||
        winner.includes(q) ||
        loser.includes(q) ||
        String(m.id).includes(q) ||
        String(m.gameId).includes(q);

      if (!matchesSearch) return false;

      if (playerMatchFilter === "won") return winner.includes(q);
      if (playerMatchFilter === "lost") return loser.includes(q);
      return true;
    });

    // Detectar si la búsqueda coincide con un jugador para generar su ficha estadística
    const exactMatches = matches.filter(
      (m) => m.playerOneName.toLowerCase() === q || m.playerTwoName.toLowerCase() === q
    );
    const targetMatches = exactMatches.length > 0 ? exactMatches : filtered;
    const targetPlayerName = exactMatches.length > 0
      ? (exactMatches[0].playerOneName.toLowerCase() === q ? exactMatches[0].playerOneName : exactMatches[0].playerTwoName)
      : playerMatchSearch.trim();

    let summary = null;
    if (targetMatches.length > 0) {
      const wins = targetMatches.filter((m) => m.winnerUsername.toLowerCase() === q).length;
      const losses = targetMatches.filter((m) => m.loserUsername.toLowerCase() === q).length;
      const coinsWon = targetMatches
        .filter((m) => m.winnerUsername.toLowerCase() === q)
        .reduce((sum, m) => sum + m.winnerPrize, 0);
      const coinsBet = targetMatches
        .filter((m) => m.playerOneName.toLowerCase() === q || m.playerTwoName.toLowerCase() === q)
        .reduce((sum, m) => sum + m.betPerPlayer, 0);

      summary = {
        name: targetPlayerName,
        totalMatches: targetMatches.length,
        wins,
        losses,
        winRate: targetMatches.length > 0 ? Math.round((wins / targetMatches.length) * 100) : 0,
        coinsWon,
        coinsBet,
        netProfit: coinsWon - coinsBet,
      };
    }

    return { filteredPvpMatches: filtered, searchedPlayerSummary: summary };
  }, [matches, playerMatchSearch, playerMatchFilter]);

  // Filtrado en memoria de recargas por estado y búsqueda
  const filteredRecharges = useMemo(() => {
    return recharges.filter((r) => {
      const matchesStatus = rechargeStatusFilter === "ALL" ? true : r.status === rechargeStatusFilter;
      if (!matchesStatus) return false;
      if (!rechargeSearch.trim()) return true;
      const q = rechargeSearch.toLowerCase().trim();
      return (
        r.username.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
        (r.userPhone && r.userPhone.includes(q))
      );
    });
  }, [recharges, rechargeStatusFilter, rechargeSearch]);

  // Filtrado en memoria de retiros por estado y búsqueda
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const matchesStatus = withdrawalStatusFilter === "ALL" ? true : w.status === withdrawalStatusFilter;
      if (!matchesStatus) return false;
      if (!withdrawalSearch.trim()) return true;
      const q = withdrawalSearch.toLowerCase().trim();
      return (
        w.username.toLowerCase().includes(q) ||
        (w.bankName && w.bankName.toLowerCase().includes(q)) ||
        (w.phoneNumber && w.phoneNumber.includes(q)) ||
        (w.idCard && w.idCard.toLowerCase().includes(q)) ||
        (w.adminReference && w.adminReference.toLowerCase().includes(q))
      );
    });
  }, [withdrawals, withdrawalStatusFilter, withdrawalSearch]);

  // Filtrado de gastos en memoria
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (expenseFilterCurrency !== "ALL" && exp.currency !== expenseFilterCurrency) return false;
      if (expenseFilterCategory !== "ALL" && exp.category !== expenseFilterCategory) return false;
      return true;
    });
  }, [expenses, expenseFilterCurrency, expenseFilterCategory]);

  // Cálculos para reportes financieros integrales y balances
  const financialSummary = useMemo(() => {
    const approvedRecharges = recharges.filter((r) => r.status === "APROBADO");
    const pendingRecharges = recharges.filter((r) => r.status === "PENDIENTE");
    const rejectedRecharges = recharges.filter((r) => r.status === "RECHAZADO");

    const paidWithdrawals = withdrawals.filter((w) => w.status === "PAGADO");
    const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDIENTE");

    // Ingresos aprobados y pendientes
    const totalDeposits = stats?.totalBsApproved ?? approvedRecharges.reduce((sum, r) => sum + r.amountBs, 0);
    const approvedCount = stats?.totalApprovedCount ?? approvedRecharges.length;

    const pendingDepositsBs = stats?.totalBsPending ?? pendingRecharges.reduce((sum, r) => sum + r.amountBs, 0);
    const pendingCount = stats?.pendingRecharges ?? pendingRecharges.length;

    // Retiros pagados y pendientes
    const totalWithdrawalsPaid = stats?.totalBsWithdrawn ?? paidWithdrawals.reduce((sum, w) => sum + w.amountBs, 0);
    const paidWithdrawalsCount = stats?.totalPaidWithdrawalsCount ?? paidWithdrawals.length;

    const pendingWithdrawalsBs = stats?.totalBsPendingWithdrawals ?? pendingWithdrawals.reduce((sum, w) => sum + w.amountBs, 0);
    const pendingWithdrawalsCount = stats?.pendingWithdrawals ?? pendingWithdrawals.length;

    // Balances netos
    const netBsBalance = totalDeposits - totalWithdrawalsPaid;
    const netBsBalanceWithPending = (totalDeposits + pendingDepositsBs) - (totalWithdrawalsPaid + pendingWithdrawalsBs);

    // Métricas del día de hoy
    const todayStr = new Date().toDateString();
    const todayRechargesList = recharges.filter((r) => {
      try {
        return new Date(r.createdAt).toDateString() === todayStr;
      } catch {
        return false;
      }
    });
    const todayRechargesCount = stats?.todayRechargesCount ?? todayRechargesList.length;
    const todayRechargesBs = stats?.todayRechargesBs ?? todayRechargesList.reduce((sum, r) => sum + r.amountBs, 0);
    const todayApprovedBs = stats?.todayApprovedBs ?? todayRechargesList.filter((r) => r.status === "APROBADO").reduce((sum, r) => sum + r.amountBs, 0);
    const todayPendingBs = stats?.todayPendingBs ?? todayRechargesList.filter((r) => r.status === "PENDIENTE").reduce((sum, r) => sum + r.amountBs, 0);

    // Gastos y Caja Dual
    const totalBsExpenses = expenses.filter(e => e.currency === "BS").reduce((sum, e) => sum + e.amount, 0);
    const totalUsdtExpenses = expenses.filter(e => e.currency === "USDT").reduce((sum, e) => sum + e.amount, 0);
    const totalUsdtPurchased = expenses.filter(e => e.usdtReceived && e.usdtReceived > 0).reduce((sum, e) => sum + (e.usdtReceived || 0), 0);
    const cajaNetaBs = totalDeposits - totalWithdrawalsPaid - totalBsExpenses;
    const cajaNetaUsdt = totalUsdtPurchased - totalUsdtExpenses;

    const totalCoinsInUsers = users.reduce((sum, u) => sum + u.coins, 0);
    const totalCommissions = matches.reduce((sum, m) => sum + m.houseCommission, 0);
    const totalWagered = matches.reduce((sum, m) => sum + m.totalPot, 0);

    const totalBotCoinsWagered = botMatches.reduce((sum, m) => sum + m.betAmount, 0);
    const totalBotHouseProfit = botMatches.reduce((sum, m) => sum + m.houseProfit, 0);
    const totalCombinedProfit = totalCommissions + totalBotHouseProfit;

    return {
      totalDeposits,
      approvedCount,
      pendingDepositsBs,
      pendingCount,
      rejectedCount: rejectedRecharges.length,
      todayRechargesCount,
      todayRechargesBs,
      todayApprovedBs,
      todayPendingBs,
      totalWithdrawalsPaid,
      paidWithdrawalsCount,
      pendingWithdrawalsBs,
      pendingWithdrawalsCount,
      netBsBalance,
      netBsBalanceWithPending,
      totalCoinsInUsers,
      totalCommissions,
      totalWagered,
      totalMatches: matches.length,
      totalBotMatches: botMatches.length,
      totalBotCoinsWagered,
      totalBotHouseProfit,
      totalCombinedProfit,
      totalBsExpenses,
      totalUsdtExpenses,
      totalUsdtPurchased,
      cajaNetaBs,
      cajaNetaUsdt,
    };
  }, [recharges, withdrawals, users, matches, botMatches, stats, expenses]);

  // ----------------------------------------------------
  // PANTALLA DE LOGIN GUARDIAN
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0704] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Fondo decorativo de naipes */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0d0704] to-black"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-[#180e07] border-2 border-amber-500/50 rounded-3xl p-8 text-white shadow-2xl shadow-amber-950/60 flex flex-col items-center text-center">
          <Image src="/brand.svg" width={180} height={60} alt="El Pericón" priority className="mb-2" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300 uppercase tracking-widest my-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Panel de Control Administrativo
          </div>

          <p className="text-xs text-amber-200/70 mb-6">
            Acceso restringido exclusivamente para el Administrador del Sistema.
          </p>

          {isApkAdminDevice && (
            <div className="w-full mb-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-left flex items-center gap-2.5">
              <span className="text-xl">📱</span>
              <div>
                <div className="text-[11px] font-black text-emerald-300 uppercase tracking-wide">
                  Celular Android Maestro Detectado
                </div>
                <div className="text-[10px] text-emerald-200/70 font-mono">
                  Hardware ID: {adminDeviceId.slice(0, 8)}... • Las credenciales quedarán guardadas en este teléfono
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="text-left">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                Usuario Administrador
              </label>
              <input
                type="text"
                placeholder=""
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                autoComplete="username"
                required
              />
            </div>

            <div className="text-left">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                Contraseña de Seguridad
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                autoComplete="current-password"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-xs text-red-200 font-medium">
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {authLoading ? "Verificando Credenciales..." : "Iniciar Sesión"}
            </button>
          </form>

          <button
            onClick={() => router.push("/")}
            className="mt-6 text-xs text-amber-400/70 hover:text-amber-300 underline"
          >
            ← Volver a la página principal
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PANEL ADMINISTRADOR PRINCIPAL CON SIDEBAR VERTICAL
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0d0704] text-white flex flex-col md:flex-row font-sans">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR EXCLUSIVA PARA MÓVIL (STICKY) */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 bg-[#160c06]/95 backdrop-blur-md border-b border-amber-500/30 px-3 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Image src="/brand.svg" width={95} height={28} alt="El Pericón" priority />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-black text-amber-300">
            <span>
              {activeTab === "dashboard" && "📊 Dashboard"}
              {activeTab === "users" && "👥 Usuarios"}
              {activeTab === "whatsapp" && "📱 WhatsApp"}
              {activeTab === "broadcast" && "📢 Avisos"}
              {activeTab === "recharges" && "📥 Recargas"}
              {activeTab === "withdrawals" && "📤 Retiros"}
              {activeTab === "matches" && "⚔️ Partidas"}
              {activeTab === "bot-matches" && "🤖 Bot IA"}
              {activeTab === "reports" && "📈 Reportes"}
              {activeTab === "promos" && "🎟️ Cupones"}
              {activeTab === "errors" && "⚠️ Errores"}
              {activeTab === "feedbacks" && "⭐ Opiniones"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${((stats?.live?.totalActiveGames || 0) > 0) ? "bg-emerald-400 animate-ping" : "bg-green-500"}`} title="En Vivo"></span>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-base flex items-center justify-center active:scale-95"
            aria-label="Abrir Menú"
          >
            ☰
          </button>
        </div>
      </header>

      {/* BARRA DESLIZABLE DE PESTAÑAS RÁPIDAS PARA CELULAR */}
      <div className="md:hidden sticky top-[49px] z-30 bg-[#140a05]/95 backdrop-blur-md border-b border-amber-500/20 px-2.5 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-md">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "dashboard" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>📊</span> Resumen
        </button>

        <button
          onClick={() => setActiveTab("recharges")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "recharges" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>📥</span> Recargas
          {financialSummary.pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-black animate-pulse">
              {financialSummary.pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "withdrawals" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>📤</span> Retiros
          {(stats?.pendingWithdrawals || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-black animate-pulse">
              {stats?.pendingWithdrawals}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "users" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>👥</span> Usuarios
        </button>

        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "whatsapp" ? "bg-emerald-500 text-emerald-950 shadow" : "bg-[#201007] text-emerald-300/80 border border-emerald-500/30"
          }`}
        >
          <span>📱</span> WhatsApp
        </button>

        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "matches" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>⚔️</span> Partidas
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "reports" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>📈</span> Reportes
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "broadcast" ? "bg-amber-500 text-amber-950 shadow" : "bg-[#201007] text-amber-200/70 border border-amber-500/20"
          }`}
        >
          <span>📢</span> Avisos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DRAWER / MENÚ DESPLEGABLE MÓVIL (OFF-CANVAS) */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Fondo oscuro con desenfoque para cerrar al tocar afuera */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-80 max-w-[85vw] bg-[#160c06] border-r border-amber-500/40 h-full flex flex-col p-4 overflow-y-auto shadow-2xl z-10">
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
              <Image src="/brand.svg" width={110} height={32} alt="El Pericón" priority />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#24140a] border border-amber-500/40 text-amber-400 text-sm font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Identidad Guardian */}
            <div className="p-3 mb-3 bg-gradient-to-r from-amber-950/40 to-[#221207] border border-amber-500/30 rounded-xl flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-base shadow">
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-black text-xs text-amber-300 block truncate">Guardian</span>
                <span className="text-[10px] text-amber-200/60 block truncate">Administrador Principal</span>
              </div>
            </div>

            {/* Monitor en Vivo */}
            <div className="mb-3 px-3 py-2 bg-[#201007] border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${((stats?.live?.totalActiveGames || 0) > 0) ? "bg-emerald-400 animate-ping" : "bg-green-500"}`}></span>
                <span className="font-bold text-amber-200 text-[11px]">En Vivo:</span>
              </div>
              <span className="text-[11px] font-black text-amber-300">
                {stats?.live?.totalActiveGames || 0} partidas
              </span>
            </div>

            {/* Navegación Móvil */}
            <nav className="flex-1 space-y-1">
              <button
                onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "dashboard" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📊</span><span>Dashboard General</span></div>
              </button>

              <button
                onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "users" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>👥</span><span>Usuarios & Baneo</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{users.length}</span>
              </button>

              <button
                onClick={() => { setActiveTab("whatsapp"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "whatsapp" ? "bg-emerald-500 text-emerald-950 shadow-md" : "text-amber-100/70 hover:bg-emerald-500/10 hover:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📱</span><span>Directorio WhatsApp</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-400/30 font-bold">{usersWithPhone.length}</span>
              </button>

              <button
                onClick={() => { setActiveTab("broadcast"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "broadcast" ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📢</span><span>Avisos a Usuarios</span></div>
                {announcements.some((a) => a.isActive) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-green-500 text-white font-black animate-pulse">ACTIVO</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("recharges"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "recharges" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📥</span><span>Recargas de Saldo</span></div>
                {financialSummary.pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black animate-pulse">{financialSummary.pendingCount}</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("withdrawals"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "withdrawals" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📤</span><span>Retiros de Saldo</span></div>
                {financialSummary.pendingWithdrawalsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">{financialSummary.pendingWithdrawalsCount}</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("matches"); setMatchesSubTab("pvp"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "matches" && matchesSubTab === "pvp" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>⚔️</span><span>Partidas Multijugador</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{matches.length}</span>
              </button>

              <button
                onClick={() => { setActiveTab("bot-matches"); setMatchesSubTab("bot"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "bot-matches" || (activeTab === "matches" && matchesSubTab === "bot") ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>🤖</span><span>Partidas vs Bot</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{botMatches.length}</span>
              </button>

              <button
                onClick={() => { setActiveTab("reports"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "reports" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📈</span><span>Reportes Financieros</span></div>
              </button>

              <button
                onClick={() => { setActiveTab("promos"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "promos" ? "bg-amber-500 text-amber-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>🎟️</span><span>Cupones de Monedas</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{promos.length}</span>
              </button>

              <button
                onClick={() => { setActiveTab("errors"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "errors" ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>⚠️</span><span>Errores & Fallas</span></div>
                {errorCounts.new > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white font-black animate-pulse">{errorCounts.new} NUEVOS</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{errorLogs.length}</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("feedbacks"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "feedbacks" ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-stone-950 shadow-md" : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2.5"><span>⭐</span><span>Opiniones & Sugerencias</span></div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">{feedbacks.length}</span>
              </button>
            </nav>

            {/* Footer Drawer */}
            <div className="pt-3 border-t border-amber-500/20 space-y-1.5 mt-3">
              <button
                onClick={() => { loadData(); setMobileMenuOpen(false); }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30"
              >
                <span>🔄</span>
                <span>{loading ? "Actualizando..." : "Actualizar Datos"}</span>
              </button>
              <button
                onClick={() => router.push("/desk")}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#201107] text-amber-200/80 text-xs font-medium"
              >
                <span>🎮</span>
                <span>Ir al Juego</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 text-red-300 text-xs font-bold border border-red-500/30"
              >
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BARRA VERTICAL IZQUIERDA (SIDEBAR ESCRITORIO) */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-[#160c06] border-r border-amber-500/30 flex-col flex-shrink-0 z-30 min-h-screen">
        {/* Encabezado Sidebar */}
        <div className="p-5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand.svg" width={130} height={40} alt="El Pericón" priority />
          </div>
        </div>

        {/* Tarjeta de Identidad Guardian */}
        <div className="p-4 mx-3 my-3 bg-gradient-to-r from-amber-950/40 to-[#221207] border border-amber-500/30 rounded-2xl flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl shadow-md">
            🛡️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-amber-300 truncate">Guardian</span>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            </div>
            <p className="text-[11px] text-amber-200/60 truncate">Administrador Principal</p>
          </div>
        </div>

        {/* Monitor en Vivo de Partidas */}
        <div className="mx-3 mb-2 px-3.5 py-2.5 bg-gradient-to-r from-[#201007] to-[#160b05] border border-amber-500/30 rounded-xl flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${((stats?.live?.totalActiveGames || 0) > 0) ? "bg-emerald-400 animate-ping" : "bg-green-500"}`}></span>
            <span className="font-bold text-amber-200">Partidas en Vivo:</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full font-black text-xs ${((stats?.live?.totalActiveGames || 0) > 0) ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-950/60 text-amber-300/80 border border-amber-500/30"}`}>
            {stats?.live?.totalActiveGames || 0} activas
          </span>
        </div>

        {/* Menú de Navegación Vertical */}
        <nav className="flex-1 px-3 space-y-1 py-2">
          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📊</span>
              <span>Dashboard General</span>
            </div>
          </button>

          {/* 2. Usuarios & Baneo */}
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "users"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">👥</span>
              <span>Usuarios & Baneo</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {users.length}
            </span>
          </button>

          {/* 3. Directorio de WhatsApp */}
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "whatsapp"
                ? "bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/30"
                : "text-amber-100/70 hover:bg-emerald-500/10 hover:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📱</span>
              <span>Directorio WhatsApp</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-400/30 font-bold">
              {usersWithPhone.length}
            </span>
          </button>

          {/* 4. Avisos y Comunicados a Usuarios */}
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "broadcast"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 shadow-md shadow-amber-500/30"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📢</span>
              <span>Avisos a Usuarios</span>
            </div>
            {announcements.some((a) => a.isActive) ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500 text-white font-black animate-pulse">
                ACTIVO
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
                {announcements.length}
              </span>
            )}
          </button>

          {/* 5. Recargas */}
          <button
            onClick={() => setActiveTab("recharges")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "recharges"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📥</span>
              <span>Recargas de Saldo</span>
            </div>
            {stats && stats.pendingRecharges > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black animate-pulse">
                {stats.pendingRecharges}
              </span>
            )}
          </button>

          {/* 6. Retiros */}
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "withdrawals"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📤</span>
              <span>Retiros de Saldo</span>
            </div>
            {stats && stats.pendingWithdrawals > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
                {stats.pendingWithdrawals}
              </span>
            )}
          </button>

          {/* 7. Partidas Multijugador */}
          <button
            onClick={() => {
              setActiveTab("matches");
              setMatchesSubTab("pvp");
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "matches" && matchesSubTab === "pvp"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">⚔️</span>
              <span>Partidas Multijugador</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {matches.length}
            </span>
          </button>

          {/* 8. Partidas vs Bot */}
          <button
            onClick={() => {
              setActiveTab("bot-matches");
              setMatchesSubTab("bot");
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "bot-matches" || (activeTab === "matches" && matchesSubTab === "bot")
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🤖</span>
              <span>Partidas vs Bot</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {botMatches.length}
            </span>
          </button>

          {/* 9. Reportes Financieros */}
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "reports"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📈</span>
              <span>Reportes Financieros</span>
            </div>
          </button>

          {/* 10. Cupones Promocionales */}
          <button
            onClick={() => setActiveTab("promos")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "promos"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🎟️</span>
              <span>Cupones de Monedas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {promos.length}
            </span>
          </button>

          {/* 11. Errores e Incidencias (Telemetría en Vivo) */}
          <button
            onClick={() => setActiveTab("errors")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "errors"
                ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-500/30"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">⚠️</span>
              <span>Errores & Fallas</span>
            </div>
            {errorCounts.new > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black animate-pulse border border-red-300">
                {errorCounts.new} NUEVOS
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
                {errorLogs.length}
              </span>
            )}
          </button>

          {/* 12. Opiniones y Sugerencias de Jugadores */}
          <button
            onClick={() => setActiveTab("feedbacks")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "feedbacks"
                ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-stone-950 shadow-md shadow-amber-500/30"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">⭐</span>
              <span>Opiniones & Sugerencias</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {feedbacks.length}
            </span>
          </button>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-amber-500/20 space-y-1.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all"
          >
            <span>🔄</span>
            <span>{loading ? "Actualizando..." : "Actualizar Datos"}</span>
          </button>
          
          <button
            onClick={() => router.push("/desk")}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#201107] hover:bg-[#2b170a] text-amber-200/80 text-xs font-medium transition-all"
          >
            <span>🎮</span>
            <span>Ir al Juego</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold border border-red-500/30 transition-all"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* ÁREA DE CONTENIDO PRINCIPAL (DERECHA) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3.5 sm:p-5 md:p-8 overflow-y-auto max-w-7xl w-full min-w-0">
        {/* Banner de Mensajes de Acción */}
        {actionMessage && (
          <div className="mb-6 p-4 bg-amber-500/15 border border-amber-400 rounded-2xl flex items-center justify-between text-xs md:text-sm font-semibold text-amber-200 shadow-lg">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-amber-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 1: DASHBOARD GENERAL */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Panel de Control General
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Resumen de actividad, transacciones, partidas y balances en El Pericón.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  onClick={handleResetMatchHistory}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-bold transition shadow"
                  title="Reiniciar partidas jugadas y ganancias del panel a cero"
                >
                  <span>🔄</span>
                  <span>Reiniciar Panel a Cero</span>
                </button>
              </div>
            </div>

            {/* Monitor de Actividad y Partidas en Juego en Vivo */}
            <div className="bg-gradient-to-r from-[#1c0f08] via-[#241309] to-[#1c0f08] border border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl">
                  {((stats?.live?.totalActiveGames || 0) > 0) ? "🎮" : "🟢"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">MONITOR DE JUGADAS EN TIEMPO REAL</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${((stats?.live?.totalActiveGames || 0) > 0) ? "bg-emerald-400 animate-ping" : "bg-green-500"}`}></span>
                  </div>
                  <p className="text-xs text-amber-200/70">
                    {((stats?.live?.totalActiveGames || 0) > 0) 
                      ? `⚠️ Hay ${stats?.live?.totalActiveGames} partida(s) jugándose en este segundo (${stats?.live?.activeSolitaire || 0} Solitario vs Bot, ${stats?.live?.active1v1 || 0} 1v1 PvP).` 
                      : "✅ No hay ninguna partida jugándose ahora mismo. El servidor está 100% despejado."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">Conectados</div>
                  <div className="text-sm font-black text-white">{stats?.live?.onlineUsers || 0}</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">En Solitario</div>
                  <div className="text-sm font-black text-emerald-400">{stats?.live?.activeSolitaire || 0}</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">En Duelos PvP</div>
                  <div className="text-sm font-black text-amber-400">{(stats?.live?.active1v1 || 0) + (stats?.live?.active2v2 || 0)}</div>
                </div>
              </div>
            </div>

            {/* Tarjeta Especial de Control y Monitoreo en Vivo: Jugador Che */}
            {cheData && (
              <div className={`rounded-2xl p-4 shadow-xl border-2 transition-all ${
                cheData.botDifficulty === "favor_jugador"
                  ? "bg-gradient-to-r from-purple-950/90 via-fuchsia-950/70 to-black border-purple-500 shadow-purple-900/30 ring-2 ring-purple-400"
                  : "bg-[#180e07] border-amber-500/40"
              }`}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Info del Jugador Che */}
                  <div className="flex items-center gap-3.5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 border ${
                      cheData.botDifficulty === "favor_jugador"
                        ? "bg-purple-600/30 border-purple-400 text-yellow-300 animate-pulse"
                        : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    }`}>
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-white tracking-wide">
                          Control Especial de Partidas: <span className="text-yellow-400 font-extrabold">{cheData.username}</span> (ID {cheData.id})
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow ${
                          cheData.botDifficulty === "favor_jugador"
                            ? "bg-purple-600 text-white border-purple-300 animate-bounce"
                            : cheData.botDifficulty === "facil"
                            ? "bg-green-600 text-white border-green-300"
                            : cheData.botDifficulty === "dificil"
                            ? "bg-red-600 text-white border-red-300"
                            : cheData.botDifficulty === "medio"
                            ? "bg-amber-500 text-black border-amber-200"
                            : "bg-slate-700 text-slate-200 border-slate-500"
                        }`}>
                          {cheData.botDifficulty === "favor_jugador"
                            ? "⭐ MODO 60/40 ACTIVO A FAVOR DE CHE"
                            : `MODO ACTUAL: ${(cheData.botDifficulty || "GENERAL").toUpperCase()}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-amber-200/80 flex-wrap">
                        <span className="bg-black/50 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold text-yellow-400">
                          💰 Saldo: {cheData.coins.toLocaleString()} 🪙
                        </span>
                        <span className="bg-black/50 px-2 py-0.5 rounded-md border border-amber-500/20">
                          ⚔️ Partidas vs Bot: {cheData.totalMatches} ({cheData.userWins}G - {cheData.botWins}P)
                        </span>
                        <span className="bg-black/50 px-2 py-0.5 rounded-md border border-amber-500/20 font-semibold">
                          📊 Tasa de Victoria: {cheData.userWinRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción Inmediata para Che */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={cheLoading || cheData.botDifficulty === "favor_jugador"}
                      onClick={() => handleSetCheMode("favor_jugador")}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg ${
                        cheData.botDifficulty === "favor_jugador"
                          ? "bg-purple-600 text-white ring-2 ring-yellow-300 scale-105"
                          : "bg-gradient-to-r from-purple-800 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-600 text-white border border-purple-400/60 hover:scale-105"
                      }`}
                      title="60% Che / 40% Casa: Che gana 6 de cada 10 con corte estricto a las 3 victorias consecutivas (Anti-desfalco)"
                    >
                      <span>⭐</span>
                      <span>60/40 A FAVOR DE CHE</span>
                    </button>

                    <button
                      type="button"
                      disabled={cheLoading || cheData.botDifficulty === "facil"}
                      onClick={() => handleSetCheMode("facil")}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        cheData.botDifficulty === "facil"
                          ? "bg-green-600 text-white ring-2 ring-green-300"
                          : "bg-[#24140a] text-green-400 border border-green-500/40 hover:bg-green-950/40"
                      }`}
                    >
                      <span>🟢</span>
                      <span>Fácil 50/50</span>
                    </button>

                    <button
                      type="button"
                      disabled={cheLoading || cheData.botDifficulty === "medio"}
                      onClick={() => handleSetCheMode("medio")}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        cheData.botDifficulty === "medio"
                          ? "bg-amber-500 text-black ring-2 ring-amber-200"
                          : "bg-[#24140a] text-amber-300 border border-amber-500/40 hover:bg-amber-950/40"
                      }`}
                    >
                      <span>🟡</span>
                      <span>60/40 Casa</span>
                    </button>

                    <button
                      type="button"
                      disabled={cheLoading || cheData.botDifficulty === "dificil"}
                      onClick={() => handleSetCheMode("dificil")}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        cheData.botDifficulty === "dificil"
                          ? "bg-red-600 text-white ring-2 ring-red-300"
                          : "bg-[#24140a] text-red-400 border border-red-500/40 hover:bg-red-950/40"
                      }`}
                    >
                      <span>🔴</span>
                      <span>Muro 85/15</span>
                    </button>

                    <button
                      type="button"
                      disabled={cheLoading || cheData.botDifficulty === "general" || !cheData.botDifficulty}
                      onClick={() => handleSetCheMode("general")}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        cheData.botDifficulty === "general" || !cheData.botDifficulty
                          ? "bg-slate-700 text-white ring-2 ring-slate-400"
                          : "bg-[#24140a] text-slate-300 border border-slate-600 hover:bg-slate-900/60"
                      }`}
                    >
                      <span>🌐</span>
                      <span>Reset Global</span>
                    </button>
                  </div>
                </div>

                {/* Banner Didáctico en Vivo */}
                {cheData.botDifficulty === "favor_jugador" && (
                  <div className="mt-3 p-2.5 bg-purple-950/80 border border-purple-500/50 rounded-xl text-xs text-purple-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base animate-pulse">⚡</span>
                      <span>
                        <strong>MODO 60/40 A FAVOR DE CHE ACTIVO (BLINDADO):</strong> Che gana 6 de cada 10 partidas con corte estricto de máximo 3 consecutivas (la banca gana 1 o 2 para evitar desfalco). Pulsa <strong>"🟡 60/40 Casa"</strong> o <strong>"🟢 Fácil 50/50"</strong> cuando desees cambiar de modo.
                      </span>
                    </div>
                    <button
                      onClick={() => handleSetCheMode("medio")}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] rounded-lg shrink-0 shadow transition"
                    >
                      Quitar Modo Ahora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Banner de Calibración Rápida de Dificultad del Bot (Solitario) */}
            <div className="bg-[#1c0f08] border border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  ⚙️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-amber-300">Calibración de Dificultad del Bot (Solitario)</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      botDifficultyMode === 'facil'
                        ? 'bg-green-950/80 text-green-300 border-green-500/50'
                        : botDifficultyMode === 'dificil'
                        ? 'bg-red-950/80 text-red-300 border-red-500/50'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    }`}>
                      Modo Actual: {botDifficultyMode.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/70 mt-1">
                    {botDifficultyMode === 'facil' && "🟢 Modo Fácil: 50% Casa / 50% Jugador. El usuario gana ~5 de cada 10 partidas. Calibrado para fluidez y modo recreativo."}
                    {botDifficultyMode === 'medio' && "🟡 Modo Medio (Estándar): 70% Casa / 30% Jugador. Recuperación constante de fondos con rotación sutil de triunfos."}
                    {botDifficultyMode === 'dificil' && "🔴 Modo Difícil: 85% Casa / 15% Jugador. Muro de contención y bloqueo total de rachas para frenar desfalcos."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "facil"}
                  onClick={() => handleSetBotDifficulty("facil")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "facil"
                      ? "bg-green-600 text-white ring-2 ring-green-400"
                      : "bg-[#24140a] text-green-400 border border-green-500/40 hover:bg-green-950/40"
                  }`}
                  title="50% Casa / 50% Jugador - Permite ganar más seguido a los usuarios (modo recreativo)"
                >
                  <span>🟢</span>
                  <span>Fácil (50/50)</span>
                </button>

                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "medio"}
                  onClick={() => handleSetBotDifficulty("medio")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "medio"
                      ? "bg-amber-500 text-black ring-2 ring-amber-300"
                      : "bg-[#24140a] text-amber-300 border border-amber-500/40 hover:bg-amber-950/40"
                  }`}
                  title="70% Casa / 30% Jugador - Recuperación de tesorería ordenada por la banca"
                >
                  <span>🟡</span>
                  <span>Medio (60/40)</span>
                </button>

                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "dificil"}
                  onClick={() => handleSetBotDifficulty("dificil")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "dificil"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : "bg-[#24140a] text-red-400 border border-red-500/40 hover:bg-red-950/40"
                  }`}
                  title="85% Casa / 15% Jugador - Muro de contención para cortar fugas"
                >
                  <span>🔴</span>
                  <span>Difícil Muro (85%)</span>
                </button>
              </div>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Usuarios</span>
                  <span className="text-xl">👥</span>
                </div>
                <div className="text-2xl font-black text-white">{stats?.totalUsers ?? users.length}</div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  {users.filter((u) => u.isActive).length} activos · {users.filter((u) => !u.isActive).length} baneados
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Recargas Pendientes</span>
                  <span className="text-xl">📥</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.pendingCount > 0 ? "text-amber-400" : "text-white"}`}>
                  {financialSummary.pendingCount}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  Bs. {financialSummary.pendingDepositsBs.toLocaleString()} por validar · Bs. {financialSummary.totalDeposits.toLocaleString()} aprobados
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Retiros Pendientes</span>
                  <span className="text-xl">📤</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.pendingWithdrawalsCount > 0 ? "text-amber-400" : "text-white"}`}>
                  {financialSummary.pendingWithdrawalsCount}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  Bs. {financialSummary.pendingWithdrawalsBs.toLocaleString()} por pagar · Bs. {financialSummary.totalWithdrawalsPaid.toLocaleString()} pagados
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Comisión PvP</span>
                  <span className="text-xl">⚔️</span>
                </div>
                <div className="text-2xl font-black text-amber-300">
                  🪙 {(stats?.totalHouseCommissions ?? financialSummary.totalCommissions).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  En {matches.length} duelos 1v1 y 2v2
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Balance vs Bot</span>
                  <span className="text-xl">🤖</span>
                </div>
                <div className={`text-2xl font-black ${botSummary.netHouseProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  🪙 {botSummary.netHouseProfit >= 0 ? "+" : ""}{botSummary.netHouseProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  En {botMatches.length} partidas Solitario
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ganancia Casa</span>
                  <span className="text-xl">🏦</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.totalCombinedProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                  🪙 {financialSummary.totalCombinedProfit >= 0 ? "+" : ""}{financialSummary.totalCombinedProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  {matches.length + botMatches.length} partidas en total
                </div>
              </div>
            </div>

            {/* Accesos Rápidos y Últimas Actividades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recargas Rápidas Pendientes */}
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-amber-300">Solicitudes de Recarga Recientes</h3>
                  <button
                    onClick={() => setActiveTab("recharges")}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                {recharges.filter((r) => r.status === "PENDIENTE").length === 0 ? (
                  <p className="text-xs text-amber-200/40 text-center py-6">No hay recargas pendientes de revisión.</p>
                ) : (
                  <div className="space-y-2">
                    {recharges
                      .filter((r) => r.status === "PENDIENTE")
                      .slice(0, 4)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 bg-[#24140a] rounded-xl border border-amber-500/20"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{r.username}</div>
                            <div className="text-[11px] text-amber-200/60">
                              Bs. {r.amountBs.toLocaleString()} · Ref: {r.reference}
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveRecharge(r.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold"
                          >
                            Aprobar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Retiros Rápidos Pendientes */}
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-amber-300">Solicitudes de Retiro Recientes</h3>
                  <button
                    onClick={() => setActiveTab("withdrawals")}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                {withdrawals.filter((w) => w.status === "PENDIENTE").length === 0 ? (
                  <p className="text-xs text-amber-200/40 text-center py-6">No hay retiros pendientes de pago.</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals
                      .filter((w) => w.status === "PENDIENTE")
                      .slice(0, 4)
                      .map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-3 bg-[#24140a] rounded-xl border border-amber-500/20"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{w.username}</div>
                            <div className="text-[11px] text-amber-200/60">
                              Bs. {w.amountBs.toLocaleString()} · {w.bankName}
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveWithdrawal(w)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-xs font-bold"
                          >
                            Pagar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Widget de Transmisión de Anuncio Global en Vivo */}
            <div className="bg-gradient-to-r from-[#201007] via-[#1a0c05] to-[#201007] border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📢</span>
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  Transmitir Anuncio Global en Vivo a Jugadores
                </h3>
              </div>
              <p className="text-xs text-amber-200/70 mb-4">
                Envía un comunicado urgente en tiempo real que aparecerá instantáneamente en pantalla a todos los jugadores que estén jugando o en el lobby.
              </p>

              <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Título (ej: 📢 TORNEO HOY A LAS 8PM)"
                    className="md:col-span-1 bg-[#2a160a] border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Escribe el mensaje para todos los jugadores..."
                    className="md:col-span-2 bg-[#2a160a] border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={broadcasting || !broadcastMessage.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    <span>📢</span>
                    <span>{broadcasting ? "Transmitiendo..." : "Transmitir en Vivo"}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: GESTIÓN DE USUARIOS Y BANEO */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Control de Usuarios y Baneo
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Gestiona el acceso, saldos y suspensión de cuentas de la plataforma.
                </p>
              </div>

              {/* Filtros, Buscador y Exportación Excel */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar usuario o correo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-[#1e1008] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400 w-52"
                />

                <div className="flex rounded-xl bg-[#1e1008] border border-amber-500/30 p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setUserStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      userStatusFilter === "all" ? "bg-amber-500 text-amber-950" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    Todos ({users.length})
                  </button>
                  <button
                    onClick={() => setUserStatusFilter("active")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      userStatusFilter === "active" ? "bg-green-600 text-white" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    Activos ({users.filter((u) => u.isActive).length})
                  </button>
                  <button
                    onClick={() => setUserStatusFilter("banned")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      userStatusFilter === "banned" ? "bg-red-600 text-white" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    Baneados ({users.filter((u) => !u.isActive).length})
                  </button>
                </div>

                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Exportar usuarios a archivo CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>

              </div>
            </div>

            {/* Tabla de Usuarios */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Usuario</th>
                      <th className="p-3.5">Monedas</th>
                      <th className="p-3.5">Récord (W / L)</th>
                      <th className="p-3.5">Nivel</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Registro</th>
                      <th className="p-3.5 text-center">Dificultad Bots</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-amber-200/40">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isGuardian = u.username.toLowerCase() === "guardian";
                        const isVipUser = u.id === 28 || u.id === 44 ||
                          u.username.toLowerCase() === "dianilith" || u.username.toLowerCase() === "bea" ||
                          (u.email ? (u.email.toLowerCase().includes("madriddianelith") || u.email.toLowerCase().includes("beatrizmadrid")) : false);
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-amber-500/5 transition-colors ${
                              !u.isActive ? "bg-red-950/20" : ""
                            }`}
                          >
                            <td className="p-3.5 font-mono text-amber-200/50">#{u.id}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                {u.username}
                                {isGuardian && <span className="text-xs" title="Administrador Principal">🛡️</span>}
                                {isVipUser && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    title="Usuario VIP con preferencia sutil de triunfos"
                                  >
                                    ⭐ VIP
                                  </span>
                                )}
                                {(u.username.toLowerCase() === "che" || u.id === 202) && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400 animate-pulse"
                                    title="Jugador Especial Monitoreado"
                                  >
                                    🎯 CHE
                                  </span>
                                )}
                                {(isGuardian || u.clientType === "apk" || (u.deviceFingerprint && (u.deviceFingerprint.includes("apk") || u.deviceFingerprint.includes("android")))) ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    title="Usuario verificado con App Android (APK)"
                                  >
                                    📱 APK
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
                                    title="Usuario en Navegador Web"
                                  >
                                    🌐 Web
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-amber-200/40">{u.email}</div>
                            </td>
                            <td className="p-3.5 font-black text-amber-300">
                              🪙 {u.coins.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span className="text-green-400 font-bold">{u.wins}V</span> -{" "}
                              <span className="text-red-400 font-bold">{u.losses}D</span>
                              <span className="text-[10px] text-amber-200/50 ml-1.5">({u.winRate}%)</span>
                            </td>
                            <td className="p-3.5 font-medium text-amber-200/80">{u.level}</td>
                            <td className="p-3.5">
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                  ACTIVO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  BANEADO
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-amber-200/50 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="inline-flex rounded-lg bg-[#140b06] border border-amber-500/20 p-0.5 gap-1 shadow-inner">
                                <button
                                  type="button"
                                  disabled={updatingUserDiffId === u.id || u.botDifficulty === "general" || !u.botDifficulty}
                                  onClick={() => handleSetUserBotDifficulty(u.id, "general")}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                                    u.botDifficulty === "general" || !u.botDifficulty
                                      ? "bg-slate-700 text-amber-200 shadow ring-1 ring-slate-400"
                                      : "text-slate-400/60 hover:text-slate-200 hover:bg-slate-900/60"
                                  }`}
                                  title="General (Hereda la dificultad global configurada para todos los bots)"
                                >
                                  🌐 General
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingUserDiffId === u.id || u.botDifficulty === "facil"}
                                  onClick={() => handleSetUserBotDifficulty(u.id, "facil")}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                                    u.botDifficulty === "facil"
                                      ? "bg-green-600 text-white shadow ring-1 ring-green-400"
                                      : "text-green-400/60 hover:text-green-300 hover:bg-green-950/40"
                                  }`}
                                  title="Individual Fácil (50% Casa / 50% Jugador - Modo Recreativo)"
                                >
                                  🟢 Fácil
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingUserDiffId === u.id || u.botDifficulty === "medio"}
                                  onClick={() => handleSetUserBotDifficulty(u.id, "medio")}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                                    u.botDifficulty === "medio"
                                      ? "bg-amber-500 text-black shadow ring-1 ring-amber-300"
                                      : "text-amber-300/60 hover:text-amber-200 hover:bg-amber-950/40"
                                  }`}
                                  title="Individual Medio (60% Casa / 40% Jugador - Retención Progresiva de Tesorería)"
                                >
                                  🟡 60/40
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingUserDiffId === u.id || u.botDifficulty === "dificil"}
                                  onClick={() => handleSetUserBotDifficulty(u.id, "dificil")}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                                    u.botDifficulty === "dificil"
                                      ? "bg-red-600 text-white shadow ring-1 ring-red-400 animate-pulse"
                                      : "text-red-400/60 hover:text-red-300 hover:bg-red-950/40"
                                  }`}
                                  title="Individual Difícil (85% Casa / 15% Jugador - Muro Total de Bloqueo de Ganancias)"
                                >
                                  🔴 Muro
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingUserDiffId === u.id || u.botDifficulty === "favor_jugador"}
                                  onClick={() => handleSetUserBotDifficulty(u.id, "favor_jugador")}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                                    u.botDifficulty === "favor_jugador"
                                      ? "bg-purple-600 text-white shadow ring-2 ring-purple-300 animate-pulse"
                                      : "text-purple-400/60 hover:text-purple-300 hover:bg-purple-950/40"
                                  }`}
                                  title="Favorable 60/40 (60% Jugador / 40% Casa - Calibración especial para que gane partidas)"
                                >
                                  ⭐ 60/40
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Botón Ajustar Saldo */}
                                <button
                                  onClick={() => {
                                    setAdjustingUser(u);
                                    setAdjustAmount(100);
                                    setAdjustMode("add");
                                    setAdjustReason("");
                                  }}
                                  title="Ajustar Monedas"
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40 transition-all"
                                >
                                  🪙 Monedas
                                </button>

                                {/* Botón Reset Clave */}
                                <button
                                  onClick={() => handleOpenResetModal(u)}
                                  title="Cambiar o Resetear Contraseña"
                                  className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-500/40 transition-all"
                                >
                                  🔑 Clave
                                </button>

                                {/* Botón Banear / Habilitar */}
                                {!isGuardian && (
                                  <>
                                    <button
                                      onClick={() => handleToggleBan(u)}
                                      title={u.isActive ? "Suspender Usuario" : "Rehabilitar Usuario"}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        u.isActive
                                          ? "bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40"
                                          : "bg-green-950/60 hover:bg-green-900 text-green-300 border border-green-500/40"
                                      }`}
                                    >
                                      {u.isActive ? "🚫 Banear" : "✅ Activar"}
                                    </button>
                                    <button
                                      onClick={() => handleBanDeviceClones(u)}
                                      title="Suspender este usuario y todas sus multicuentas vinculadas por dispositivo / serie"
                                      className="px-2 py-1 bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-bold transition-all"
                                    >
                                      🧹 Clones
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA: DIRECTORIO DE WHATSAPP (NUEVO) */}
        {/* ========================================================================= */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            {/* Encabezado y Estadísticas de WhatsApp */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-emerald-400 tracking-wide flex items-center gap-2`}>
                  <span>📱</span>
                  <span>Directorio de WhatsApp de Jugadores</span>
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Conéctate directamente con tus jugadores para invitarlos a torneos, avisar mantenimientos o difundir eventos.
                </p>
              </div>

              {/* Botones de acción masiva */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={copyAllWhatsAppNumbers}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  title="Copiar todos los números registrados para listas de difusión de WhatsApp"
                >
                  <span>📋</span>
                  <span>Copiar Todos los Números</span>
                </button>

                <button
                  onClick={exportWhatsAppCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#24140a] hover:bg-[#341d0e] text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow"
                  title="Exportar directorio telefónico a archivo Excel/CSV"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>

                <button
                  onClick={exportWhatsAppVCF}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-amber-600/30 transition active:scale-95"
                  title="Descargar archivo de contactos .VCF para importar todos los números a tu celular y agregarlos al grupo de WhatsApp"
                >
                  <span>📇</span>
                  <span>Descargar Contactos (.VCF Celular)</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Resumen de Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[#1c0f07] to-[#251409] border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold border border-amber-500/30">
                  👥
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-300/70 uppercase">Total Jugadores</span>
                  <p className="text-2xl font-black text-white">{users.length}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#0c2214] to-[#122e1b] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold border border-emerald-500/40">
                  📱
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-300/80 uppercase">Con WhatsApp Registrado</span>
                  <p className="text-2xl font-black text-emerald-300">{usersWithPhone.length}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1c0f07] to-[#201107] border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-200/50 flex items-center justify-center text-2xl font-bold border border-amber-500/20">
                  ⏳
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-200/50 uppercase">Sin Teléfono Aún</span>
                  <p className="text-2xl font-black text-amber-200/60">{usersWithoutPhone.length}</p>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ASISTENTE DE REACTIVACIÓN POR LOTES (10 JUGADORES + 300 MONEDAS) */}
            {/* ========================================================================= */}
            <div className="bg-gradient-to-br from-[#0c2214] via-[#122e1b] to-[#1c0f07] border-2 border-emerald-500/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-500/30 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      🎯 Módulo Anti-Baneo
                    </span>
                    <span className="text-xs text-emerald-300 font-bold">
                      • Jugadores elegibles en total: {reactivationTotalEligible}
                    </span>
                  </div>
                  <h2 className={`${fonts.bowlbyOneSC.className} text-lg md:text-xl text-emerald-300 tracking-wide mt-1 flex items-center gap-2`}>
                    <span>⚡ Asistente de Reactivación: Lote de 10 Jugadores (+300 🪙)</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Al hacer clic en <strong className="text-emerald-300">"Acreditar 300 🪙 + Abrir WhatsApp"</strong>, el sistema le suma de inmediato las 300 monedas a su cuenta en la base de datos y te abre el chat de WhatsApp con el mensaje personalizado y verídico listo para enviar.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={fetchReactivationCandidates}
                    disabled={reactivationLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-950/60 transition disabled:opacity-50"
                  >
                    <span>{reactivationLoading ? "⏳" : "🔄"}</span>
                    <span>{reactivationLoading ? "Cargando..." : "Cargar Otro Lote"}</span>
                  </button>
                </div>
              </div>

              {/* Lista de los 10 candidatos */}
              {reactivationCandidates.length === 0 ? (
                <div className="text-center py-8 bg-black/40 rounded-2xl border border-emerald-500/20">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-bold text-emerald-200 mt-2">¡No hay jugadores inactivos pendientes!</p>
                  <p className="text-xs text-slate-400 mt-1">Todos los jugadores con teléfono han sido reactivados en los últimos 7 días o tienen saldo activo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reactivationCandidates.map((candidate, idx) => {
                    const isCredited = !!creditedIds[candidate.id];
                    const isCrediting = !!creditingIds[candidate.id];

                    return (
                      <div
                        key={candidate.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCredited
                            ? "bg-emerald-950/40 border-emerald-500/60 shadow-md"
                            : "bg-black/50 border-emerald-500/30 hover:border-emerald-400/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-black text-emerald-300 text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-white truncate max-w-[120px]">
                                  {candidate.username}
                                </span>
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                  🪙 {candidate.coins}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  • {candidate.wins} Vics
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-300 font-mono mt-0.5">
                                📞 {candidate.originalPhone}
                              </p>
                              {candidate.lastReactivatedAt && (
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                  Última reactivación: {candidate.lastReactivatedAt}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Botón de Acción 1 Clic */}
                          <button
                            onClick={() => handleCreditAndOpenWA(candidate)}
                            disabled={isCrediting}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow ${
                              isCredited
                                ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                                : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30"
                            } disabled:opacity-50`}
                          >
                            <span>{isCrediting ? "⏳" : isCredited ? "✅" : "📲"}</span>
                            <span>{isCrediting ? "Acreditando..." : isCredited ? "Reenviar WA" : "Acreditar 300 🪙 + WA"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selector de Plantilla de Mensaje de WhatsApp */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Plantilla de Mensaje al Abrir WhatsApp:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  {[
                    { id: "grupo", label: "👥 Invitar al Grupo Oficial" },
                    { id: "torneo", label: "🏆 Convocatoria a Torneo" },
                    { id: "promo", label: "🎁 Bono y Promoción" },
                    { id: "novedades", label: "📢 Nuevas Salas y Mejoras" },
                    { id: "libre", label: "✍️ Mensaje Personalizado" },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setWhatsappTemplate(tpl.id as any)}
                      className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
                        whatsappTemplate === tpl.id
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black"
                          : "bg-[#24140a] text-amber-200/70 hover:text-white border border-amber-500/20"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enlace configurable del Grupo de WhatsApp */}
              <div className="bg-[#24140a] border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 flex-shrink-0">
                  <span>🔗</span>
                  <span>Enlace de tu Grupo de WhatsApp:</span>
                </span>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappGroupLink}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWhatsappGroupLink(val);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("pericon_wa_group_link", val);
                    }
                  }}
                  className="flex-1 bg-black/60 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-emerald-100 placeholder-emerald-400/30 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {whatsappTemplate === "libre" ? (
                <textarea
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  placeholder="Escribe el mensaje que se cargará automáticamente al abrir el chat con el jugador..."
                  rows={2}
                  className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-[#24140a] border border-amber-500/20 text-xs text-amber-200/80 italic">
                  &ldquo;{getWhatsAppMessageText("NombreUsuario")}&rdquo;
                </div>
              )}
            </div>

            {/* Filtros de Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Buscar por usuario, teléfono o correo..."
                value={whatsappSearch}
                onChange={(e) => setWhatsappSearch(e.target.value)}
                className="bg-[#1e1008] border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400 w-full sm:w-72"
              />

              <div className="flex rounded-xl bg-[#1e1008] border border-amber-500/30 p-0.5 text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setWhatsappFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    whatsappFilter === "all" ? "bg-amber-500 text-amber-950" : "text-amber-200/60 hover:text-white"
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  onClick={() => setWhatsappFilter("with_phone")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    whatsappFilter === "with_phone" ? "bg-emerald-600 text-white" : "text-amber-200/60 hover:text-white"
                  }`}
                >
                  Con WhatsApp ({usersWithPhone.length})
                </button>
                <button
                  onClick={() => setWhatsappFilter("without_phone")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    whatsappFilter === "without_phone" ? "bg-amber-800 text-white" : "text-amber-200/60 hover:text-white"
                  }`}
                >
                  Sin WhatsApp ({usersWithoutPhone.length})
                </button>
              </div>
            </div>

            {/* Tabla del Directorio de WhatsApp */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Usuario</th>
                      <th className="p-3.5">Teléfono / WhatsApp</th>
                      <th className="p-3.5">Saldo</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha Registro</th>
                      <th className="p-3.5 text-center">Contactar WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredWhatsAppUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-amber-200/40">
                          No se encontraron jugadores que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredWhatsAppUsers.map((u) => {
                        const hasPhone = Boolean(u.phoneNumber && u.phoneNumber.trim());
                        const cleanPhone = cleanPhoneDigits(u.phoneNumber);
                        const waLink = getWhatsAppLink(u.phoneNumber, u.username);

                        return (
                          <tr key={u.id} className="hover:bg-amber-500/5 transition-colors">
                            <td className="p-3.5 font-mono text-amber-200/50">#{u.id}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {u.username}
                                {u.username.toLowerCase() === "guardian" && (
                                  <span className="text-xs" title="Administrador Principal">🛡️</span>
                                )}
                              </div>
                              <div className="text-[11px] text-amber-200/40">{u.email}</div>
                            </td>
                            <td className="p-3.5">
                              {hasPhone ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                    +{cleanPhone}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(`+${cleanPhone}`, `tel_${u.id}`)}
                                    title="Copiar número"
                                    className="p-1 rounded hover:bg-amber-500/20 text-amber-300 text-xs transition"
                                  >
                                    {copiedText === `tel_${u.id}` ? "✓" : "📋"}
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/40 text-amber-200/40 border border-amber-500/20">
                                  Pendiente por registrar
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-black text-amber-300">
                              🪙 {u.coins.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/40">
                                  ACTIVO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                  BANEADO
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-amber-200/50 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-center">
                              {hasPhone ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs shadow-md shadow-green-600/20 active:scale-95 transition"
                                >
                                  <span>💬</span>
                                  <span>Abrir WhatsApp</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-amber-200/30 italic">
                                  Sin WhatsApp
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA: AVISOS Y COMUNICADOS A USUARIOS (NUEVO) */}
        {/* ========================================================================= */}
        {activeTab === "broadcast" && (
          <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide flex items-center gap-2`}>
                  <span>📢</span>
                  <span>Avisos y Comunicados a Jugadores</span>
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Publica anuncios instantáneos en pantalla para todos los jugadores activos y guárdalos para quienes entren después.
                </p>
              </div>
            </div>

            {/* Tarjeta de Estado del Comunicado Activo */}
            {announcements.find((a) => a.isActive) ? (
              (() => {
                const active = announcements.find((a) => a.isActive)!;
                return (
                  <div className="bg-gradient-to-r from-[#2a1708] via-[#331c0b] to-[#2a1708] border-2 border-amber-400 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-4 py-1 bg-green-500 text-black font-black text-[10px] tracking-wider uppercase rounded-bl-xl shadow flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-black animate-ping"></span>
                      <span>AVISO ACTIVO Y VISIBLE EN LA SALA</span>
                    </div>

                    <div className="flex items-start gap-3 mt-1">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
                        {active.type === "torneo" && "🏆"}
                        {active.type === "alerta" && "⚠️"}
                        {active.type === "promo" && "🎁"}
                        {active.type !== "torneo" && active.type !== "alerta" && active.type !== "promo" && "📢"}
                      </div>
                      <div className="flex-1 min-w-0 pr-28">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {(active.type || 'AVISO').toUpperCase()}
                          </span>
                          <span className="text-[11px] text-amber-200/50">
                            Publicado el {new Date(active.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-amber-300 mt-1">{active.title}</h3>
                        <p className="text-sm text-white/90 mt-1 whitespace-pre-line leading-relaxed">
                          {active.message}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleToggleAnnouncement(active.id)}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
                      >
                        ⏸️ Desactivar / Pausar Aviso
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(active.id)}
                        className="px-4 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-bold transition"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-[#180e07] border border-amber-500/20 rounded-2xl p-4 text-center text-amber-200/50 text-xs flex items-center justify-center gap-2">
                <span>⚪</span>
                <span>No hay ningún comunicado activo en este momento. Los jugadores no están viendo avisos en su sala.</span>
              </div>
            )}

            {/* Formulario de Publicación y Transmisión */}
            <div className="bg-gradient-to-br from-[#1b0e06] to-[#241309] border border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                <span className="text-xl">✍️</span>
                <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  Crear y Transmitir Nuevo Aviso
                </h2>
              </div>

              <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
                {/* Tipo de Comunicado */}
                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1.5">
                    Tipo de Comunicado
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                    {[
                      { id: "torneo", label: "🏆 Torneo Oficial", icon: "🏆" },
                      { id: "info", label: "📢 Noticia / Info", icon: "📢" },
                      { id: "alerta", label: "⚠️ Alerta / Mant.", icon: "⚠️" },
                      { id: "promo", label: "🎁 Bono / Promo", icon: "🎁" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBroadcastType(t.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition ${
                          broadcastType === t.id
                            ? "bg-amber-500 text-amber-950 border-amber-300 shadow-md font-black"
                            : "bg-[#24140a] text-amber-200/70 border-amber-500/20 hover:text-white hover:border-amber-500/40"
                        }`}
                      >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">
                    Título del Aviso
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Ej: 🏆 GRAN TORNEO DE PERICÓN ESTE VIERNES"
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400 font-bold"
                    required
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">
                    Mensaje o Instrucciones para los Jugadores
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Escribe el contenido detallado del aviso. Ej: El torneo iniciará a las 8:00 PM. El premio para el primer lugar será de 50.000 monedas..."
                    rows={4}
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                {/* Vista Previa en Vivo */}
                {broadcastMessage.trim() && (
                  <div>
                    <label className="text-[11px] font-bold text-amber-300/80 uppercase block mb-1.5">
                      Vista Previa de cómo lo verán los Jugadores:
                    </label>
                    <div className="w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-black px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl animate-bounce">
                          {broadcastType === "torneo" && "🏆"}
                          {broadcastType === "alerta" && "⚠️"}
                          {broadcastType === "promo" && "🎁"}
                          {broadcastType !== "torneo" && broadcastType !== "alerta" && broadcastType !== "promo" && "📢"}
                        </span>
                        <div>
                          <p className="font-black text-xs uppercase tracking-wide">
                            {broadcastTitle.trim() || "COMUNICADO OFICIAL"}
                          </p>
                          <p className="text-xs font-semibold text-black/90">
                            {broadcastMessage.trim()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold opacity-60">✕</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={broadcasting || !broadcastMessage.trim()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-black text-xs tracking-wider uppercase shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>📢</span>
                    <span>{broadcasting ? "Transmitiendo a todos los jugadores..." : "Transmitir y Publicar Aviso"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Historial de Avisos y Comunicados Anteriores */}
            <div className="space-y-3">
              <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Historial de Comunicados ({announcements.length})
              </h2>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Tipo</th>
                        <th className="p-3.5">Título</th>
                        <th className="p-3.5">Mensaje</th>
                        <th className="p-3.5">Fecha</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-500/10">
                      {announcements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-amber-200/40">
                            No hay registros de avisos previos.
                          </td>
                        </tr>
                      ) : (
                        announcements.map((a) => (
                          <tr key={a.id} className="hover:bg-amber-500/5 transition-colors">
                            <td className="p-3.5 font-mono text-amber-200/50">#{a.id}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {a.type}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-white max-w-xs truncate">
                              {a.title}
                            </td>
                            <td className="p-3.5 text-amber-200/70 max-w-md truncate">
                              {a.message}
                            </td>
                            <td className="p-3.5 text-amber-200/50 text-[11px]">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3.5">
                              {a.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                  ACTIVO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-200/40 border border-amber-500/20">
                                  PAUSADO
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleToggleAnnouncement(a.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    a.isActive
                                      ? "bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/30"
                                      : "bg-green-950/60 hover:bg-green-900 text-green-300 border border-green-500/30"
                                  }`}
                                >
                                  {a.isActive ? "Pausar" : "Reactivar"}
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(a.id)}
                                  className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: RECARGAS DE SALDO */}
        {/* ========================================================================= */}
        {activeTab === "recharges" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Recargas y Depósitos
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Verifica comprobantes de transferencias y acredita monedas a los jugadores.
                </p>
              </div>

              {/* Filtro de Estado y Exportación */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl bg-[#1e1008] border border-amber-500/30 p-0.5 text-xs font-bold">
                  {[
                    { key: "PENDIENTE", label: "Pendientes", count: recharges.filter((r) => r.status === "PENDIENTE").length },
                    { key: "APROBADO", label: "Aprobadas", count: recharges.filter((r) => r.status === "APROBADO").length },
                    { key: "RECHAZADO", label: "Rechazadas", count: recharges.filter((r) => r.status === "RECHAZADO").length },
                    { key: "ALL", label: "Todas", count: recharges.length },
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setRechargeStatusFilter(st.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        rechargeStatusFilter === st.key
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        rechargeStatusFilter === st.key ? "bg-amber-950/40 text-amber-950 font-black" : "bg-black/40 text-amber-300/80"
                      }`}>
                        {st.count}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={exportRechargesCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Exportar recargas a archivo CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda de Recargas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#180e07] border border-amber-500/30 p-3 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por usuario, referencia o teléfono..."
                  value={rechargeSearch}
                  onChange={(e) => setRechargeSearch(e.target.value)}
                  className="w-full bg-[#1e1008] border border-amber-500/30 rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                />
                {rechargeSearch && (
                  <button
                    onClick={() => setRechargeSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-200/40 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-amber-200/60 self-start sm:self-auto">
                Mostrando <strong className="text-amber-300">{filteredRecharges.length}</strong> de {recharges.length} recargas
              </div>
            </div>

            {/* Tabla de Recargas */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Usuario</th>
                      <th className="p-3.5">Monto Bs.</th>
                      <th className="p-3.5">Monedas</th>
                      <th className="p-3.5">Referencia</th>
                      <th className="p-3.5">Comprobante</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredRecharges.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-amber-200/40">
                          {rechargeSearch
                            ? `No se encontraron recargas que coincidan con "${rechargeSearch}".`
                            : "No hay solicitudes de recarga en esta categoría."}
                        </td>
                      </tr>
                    ) : (
                      filteredRecharges.map((r) => (
                        <tr key={r.id} className="hover:bg-amber-500/5 transition-colors">
                          <td className="p-3.5 font-mono text-amber-200/50">#{r.id}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{r.username}</div>
                            <div className="text-[11px] text-amber-200/40">{r.userEmail}</div>
                          </td>
                          <td className="p-3.5 font-bold text-white">Bs. {r.amountBs.toLocaleString()}</td>
                          <td className="p-3.5 font-black text-amber-300">+{r.coinsAmount.toLocaleString()}</td>
                          <td className="p-3.5">
                            <button
                              onClick={() => copyToClipboard(r.reference, `ref_${r.id}`)}
                              className="font-mono bg-[#24140a] px-2 py-1 rounded border border-amber-500/30 text-amber-200 hover:text-white text-[11px]"
                            >
                              {copiedText === `ref_${r.id}` ? "¡Copiado!" : r.reference}
                            </button>
                          </td>
                          <td className="p-3.5">
                            {r.receiptImageUrl ? (
                              <button
                                onClick={() => setViewingReceipt(r.receiptImageUrl)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] font-bold border border-amber-500/30"
                              >
                                🔍 Ver Capture
                              </button>
                            ) : (
                              <span className="text-amber-200/30">Sin imagen</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === "APROBADO"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                  : r.status === "RECHAZADO"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-amber-200/50 text-[11px]">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            {r.status === "PENDIENTE" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleApproveRecharge(r.id)}
                                  className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleRejectRecharge(r.id)}
                                  className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs font-bold border border-red-500/30"
                                >
                                  Rechazar
                                </button>
                              </div>
                            ) : r.status === "APROBADO" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={getRechargeApprovedWhatsAppLink(r)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                                  title="Enviar comprobante de aprobación por WhatsApp al jugador"
                                >
                                  <span>💬</span>
                                  <span>Avisar WhatsApp</span>
                                </a>
                                  <button
                                    onClick={() => handleResetPendingRecharge(r.id)}
                                    className="px-2 py-1 bg-amber-700/60 hover:bg-amber-600 text-amber-200 rounded-lg text-xs font-semibold border border-amber-500/30 transition shadow"
                                    title="Volver a poner esta recarga en revisión manual"
                                  >
                                    Revertir a Pendiente
                                  </button>
                              </div>
                            ) : (
                              <span className="text-amber-200/30 text-[11px]">Rechazada</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: RETIROS DE SALDO */}
        {/* ========================================================================= */}
        {activeTab === "withdrawals" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Solicitudes de Retiro (Pagos)
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Procesa las transferencias de bolívares a los datos bancarios de los ganadores.
                </p>
              </div>

              {/* Filtro de Estado y Exportación */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl bg-[#1e1008] border border-amber-500/30 p-0.5 text-xs font-bold">
                  {[
                    { key: "PENDIENTE", label: "Pendientes", count: withdrawals.filter((w) => w.status === "PENDIENTE").length },
                    { key: "PAGADO", label: "Pagados", count: withdrawals.filter((w) => w.status === "PAGADO").length },
                    { key: "RECHAZADO", label: "Rechazados", count: withdrawals.filter((w) => w.status === "RECHAZADO").length },
                    { key: "ALL", label: "Todos", count: withdrawals.length },
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setWithdrawalStatusFilter(st.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        withdrawalStatusFilter === st.key
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        withdrawalStatusFilter === st.key ? "bg-amber-950/40 text-amber-950 font-black" : "bg-black/40 text-amber-300/80"
                      }`}>
                        {st.count}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={exportWithdrawalsCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Exportar retiros a archivo CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda de Retiros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#180e07] border border-amber-500/30 p-3 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por usuario, banco, teléfono o cédula..."
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  className="w-full bg-[#1e1008] border border-amber-500/30 rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                />
                {withdrawalSearch && (
                  <button
                    onClick={() => setWithdrawalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-200/40 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-amber-200/60 self-start sm:self-auto">
                Mostrando <strong className="text-amber-300">{filteredWithdrawals.length}</strong> de {withdrawals.length} retiros
              </div>
            </div>

            {/* Tabla de Retiros */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Usuario</th>
                      <th className="p-3.5">Monedas</th>
                      <th className="p-3.5">Monto Bs.</th>
                      <th className="p-3.5">Datos Pago Móvil</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-amber-200/40">
                          {withdrawalSearch
                            ? `No se encontraron retiros que coincidan con "${withdrawalSearch}".`
                            : "No hay solicitudes de retiro en esta categoría."}
                        </td>
                      </tr>
                    ) : (
                      filteredWithdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-amber-500/5 transition-colors">
                          <td className="p-3.5 font-mono text-amber-200/50">#{w.id}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{w.username}</div>
                            <div className="text-[11px] text-amber-200/40">{w.userEmail}</div>
                          </td>
                          <td className="p-3.5 font-bold text-red-400">-{w.coinsAmount.toLocaleString()}</td>
                          <td className="p-3.5 font-black text-amber-300">Bs. {w.amountBs.toLocaleString()}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{w.bankName}</div>
                            <div className="text-[11px] text-amber-200/80">
                              Tel: {w.phoneNumber} · CI: {w.idCard}
                            </div>
                            {w.adminReference && (
                              <div className="text-[10px] text-green-400 mt-0.5">Ref: {w.adminReference}</div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                w.status === "PAGADO"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                  : w.status === "RECHAZADO"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-amber-200/50 text-[11px]">
                            {new Date(w.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            {w.status === "PENDIENTE" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleApproveWithdrawal(w)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-xs font-bold"
                                >
                                  Pagar Bs.
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(w)}
                                  className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs font-bold border border-red-500/30"
                                >
                                  Rechazar
                                </button>
                              </div>
                            ) : w.status === "PAGADO" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={getWithdrawalPaidWhatsAppLink(w)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                                  title="Enviar comprobante de pago por WhatsApp al jugador"
                                >
                                  <span>💬</span>
                                  <span>Avisar Pago WhatsApp</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-amber-200/30 text-[11px]">Rechazado</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 5: PARTIDAS Y AUDITORÍA (MULTIJUGADOR Y BOT) */}
        {/* ========================================================================= */}
        {activeTab === "matches" && matchesSubTab === "pvp" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Auditoría de Partidas y Apuestas
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Historial de duelos multijugador, pozos apostados y comisiones de sala retenidas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  onClick={exportMatchesCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Exportar partidas multijugador a archivo CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>

                <button
                  onClick={handleResetMatchHistory}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-bold transition shadow"
                  title="Reiniciar partidas jugadas y ganancias del panel a cero"
                >
                  <span>🔄</span>
                  <span>Reiniciar a Cero</span>
                </button>
              </div>
            </div>

            {/* Selector de Sub-pestañas: Multijugador vs Bot */}
            <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
              <button
                onClick={() => setMatchesSubTab("pvp")}
                className="px-4 py-2 rounded-xl text-xs font-bold transition bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
              >
                ⚔️ Duelos Multijugador ({matches.length})
              </button>
              <button
                onClick={() => setMatchesSubTab("bot")}
                className="px-4 py-2 rounded-xl text-xs font-bold transition bg-[#180e07] text-amber-200/70 border border-amber-500/20 hover:text-white"
              >
                🤖 Solitario contra el Bot ({botMatches.length})
              </button>
            </div>

            {/* Filtros de Período de Tiempo (Día, Semana, Mes, Todo) */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📅</span>
                    <span>Filtro de Período y Análisis de Actividad</span>
                  </h3>
                  <p className="text-[11px] text-amber-200/60 mt-0.5">
                    Filtra por tipo de contrincante (Humanos reales vs Bots) y por período de tiempo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Tipo: Solo Humanos | Solo Bots | Todas */}
                  <div className="flex rounded-xl bg-[#24140a] border border-amber-500/30 p-1 text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesType("pvp")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        matchTypeFilter === "pvp"
                          ? "bg-emerald-500 text-black font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                      title="Mostrar únicamente partidas entre dos jugadores humanos reales"
                    >
                      <span>👤</span>
                      <span>Solo Humanos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesType("bot")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        matchTypeFilter === "bot"
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                      title="Mostrar únicamente partidas jugadas contra los bots de IA"
                    >
                      <span>🤖</span>
                      <span>Solo Bots</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesType("all")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        matchTypeFilter === "all"
                          ? "bg-yellow-500 text-black font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                      title="Mostrar todas las partidas (Humanos y Bots)"
                    >
                      <span>📋</span>
                      <span>Todas</span>
                    </button>
                  </div>

                  {/* Selector de Período */}
                  <div className="flex rounded-xl bg-[#24140a] border border-amber-500/30 p-1 text-xs font-bold flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesPeriod("dia")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        matchPeriodFilter === "dia"
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      Hoy (Día)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesPeriod("semana")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        matchPeriodFilter === "semana"
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      7 Días (Semana)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesPeriod("mes")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        matchPeriodFilter === "mes"
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      30 Días (Mes)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterMatchesPeriod("todo")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        matchPeriodFilter === "todo"
                          ? "bg-amber-500 text-amber-950 font-black shadow"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      Histórico (Todo)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjetas KPI del Período Seleccionado */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Duelos en Período</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    {matchesPeriodSummary?.totalMatches ?? matches.length}
                  </div>
                  <span className="text-[10px] text-amber-200/40">
                    Apuesta prom: 🪙 {matchesPeriodSummary?.averageBet ?? (matches.length > 0 ? Math.round(matches.reduce((s, m) => s + m.betPerPlayer, 0) / matches.length) : 0)}
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Pozo Apostado</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
                    🪙 {(matchesPeriodSummary?.totalCoinsWagered ?? matches.reduce((s, m) => s + m.totalPot, 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-200/40">Volumen disputado</span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Comisión Casa</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                    🪙 {(matchesPeriodSummary?.totalHouseCommissions ?? matches.reduce((s, m) => s + m.houseCommission, 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-300/60">Retención 10% / 100%</span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Premios Ganadores</span>
                  <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">
                    🪙 {(matchesPeriodSummary?.totalPrizesAwarded ?? matches.reduce((s, m) => s + m.winnerPrize, 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-cyan-300/60">Entregado a ganadores</span>
                </div>
              </div>

              {/* Desglose de Afluencia por Día (Estrategia Administrativa) */}
              {matchesDailyActivity.length > 0 && (
                <div className="pt-2 border-t border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                      📊 Afluencia Diaria en el Período ({matchesDailyActivity.length} días con partidas)
                    </span>
                    <span className="text-[10px] text-amber-200/50">Días más concurridos vs menos activos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {matchesDailyActivity.slice(0, 14).map((d) => (
                      <div
                        key={d.date}
                        className="bg-[#201107] border border-amber-500/25 rounded-xl p-2.5 text-center flex flex-col justify-between"
                      >
                        <span className="text-[10px] font-bold text-amber-200/70 block truncate">{d.date}</span>
                        <div className="text-base font-black text-amber-400 my-1">{d.count} <span className="text-[10px] font-normal text-amber-200/60">partidas</span></div>
                        <span className="text-[9.5px] text-emerald-400 font-semibold block truncate">+🪙 {d.commission.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Buscador de Jugadores y Filtro de Partidas */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-base">🔍</span>
                  <input
                    type="text"
                    placeholder="Escribe el nombre del jugador para ver su historial, victorias y derrotas..."
                    value={playerMatchSearch}
                    onChange={(e) => setPlayerMatchSearch(e.target.value)}
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400 font-medium"
                  />
                  {playerMatchSearch && (
                    <button
                      onClick={() => setPlayerMatchSearch("")}
                      className="px-2.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-500/30 transition flex-shrink-0"
                      title="Limpiar búsqueda"
                    >
                      ✕ Limpiar
                    </button>
                  )}
                </div>

                <div className="flex rounded-xl bg-[#24140a] border border-amber-500/30 p-0.5 text-xs font-bold self-start sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => setPlayerMatchFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      playerMatchFilter === "all" ? "bg-amber-500 text-amber-950" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    Todas ({filteredPvpMatches.length})
                  </button>
                  <button
                    onClick={() => setPlayerMatchFilter("won")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      playerMatchFilter === "won" ? "bg-emerald-600 text-white" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    🏆 Victorias
                  </button>
                  <button
                    onClick={() => setPlayerMatchFilter("lost")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      playerMatchFilter === "lost" ? "bg-red-800 text-white" : "text-amber-200/60 hover:text-white"
                    }`}
                  >
                    💀 Derrotas
                  </button>
                </div>
              </div>

              {/* Ficha Estadística del Jugador Encontrado */}
              {searchedPlayerSummary && (
                <div className="bg-gradient-to-r from-amber-950/40 via-black/60 to-amber-950/40 border border-amber-500/50 rounded-xl p-3.5 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg">
                        👤
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-amber-300">
                            Historial de: {searchedPlayerSummary.name}
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                            Efectividad: {searchedPlayerSummary.winRate}%
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/60">
                          Resumen global de duelos multijugador disputados en la plataforma.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-black/50 p-2 rounded-lg border border-amber-500/20">
                        <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Partidas</span>
                        <span className="font-black text-white text-sm">{searchedPlayerSummary.totalMatches}</span>
                      </div>
                      <div className="bg-black/50 p-2 rounded-lg border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 block uppercase font-bold">Victorias</span>
                        <span className="font-black text-emerald-300 text-sm">🏆 {searchedPlayerSummary.wins}</span>
                      </div>
                      <div className="bg-black/50 p-2 rounded-lg border border-red-500/30">
                        <span className="text-[10px] text-red-400 block uppercase font-bold">Derrotas</span>
                        <span className="font-black text-red-300 text-sm">💀 {searchedPlayerSummary.losses}</span>
                      </div>
                      <div className="bg-black/50 p-2 rounded-lg border border-amber-500/20">
                        <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Balance Neto</span>
                        <span className={`font-black text-sm ${searchedPlayerSummary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {searchedPlayerSummary.netProfit >= 0 ? `+🪙 ${searchedPlayerSummary.netProfit.toLocaleString()}` : `-🪙 ${Math.abs(searchedPlayerSummary.netProfit).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Jugadores</th>
                      <th className="p-3.5">Apuesta c/u</th>
                      <th className="p-3.5">Pozo Total</th>
                      <th className="p-3.5">Comisión Casa</th>
                      <th className="p-3.5">Ganador</th>
                      <th className="p-3.5">Motivo</th>
                      <th className="p-3.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredPvpMatches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-amber-200/40">
                          {playerMatchSearch
                            ? `No se encontraron partidas para "${playerMatchSearch}".`
                            : "No hay registros de partidas multijugador finalizadas aún (Panel en Cero)."}
                        </td>
                      </tr>
                    ) : (
                      filteredPvpMatches.map((m) => {
                        const isRefund = m.winnerUsername === "REEMBOLSO" || m.endReason?.toLowerCase().includes("reembolso");
                        const isSalaMatch = !isRefund && (m.houseCommission === m.totalPot || m.endReason?.includes("[SALA"));
                        const q = playerMatchSearch.trim().toLowerCase();
                        const isPlayerWon = q && !isRefund && m.winnerUsername.toLowerCase() === q;
                        const isPlayerLost = q && !isRefund && m.loserUsername.toLowerCase() === q;

                        return (
                          <tr key={m.id} className="hover:bg-amber-500/5 transition-colors">
                            <td className="p-3.5 font-mono text-amber-200/50">#{m.id}</td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setPlayerMatchSearch(m.playerOneName)}
                                  className="font-bold text-white hover:text-amber-300 hover:underline transition"
                                  title="Filtrar partidas de este jugador"
                                >
                                  {m.playerOneName}
                                </button>
                                <span className="text-amber-200/40 text-[10px]">vs</span>
                                <button
                                  onClick={() => setPlayerMatchSearch(m.playerTwoName)}
                                  className="font-bold text-white hover:text-amber-300 hover:underline transition"
                                  title="Filtrar partidas de este jugador"
                                >
                                  {m.playerTwoName}
                                </button>

                                {m.isBotMatch ? (
                                  <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-black inline-flex items-center gap-1 shrink-0">
                                    <span>🤖</span> Bot IA
                                  </span>
                                ) : (
                                  <span className="ml-1 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-black inline-flex items-center gap-1 shrink-0">
                                    <span>👤</span> PvP Real
                                  </span>
                                )}

                                {isPlayerWon && (
                                  <span className="ml-1 text-[9.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-black">
                                    ✓ VICTORIA
                                  </span>
                                )}
                                {isPlayerLost && (
                                  <span className="ml-1 text-[9.5px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-black">
                                    ✕ DERROTA
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 font-semibold text-amber-200">🪙 {m.betPerPlayer}</td>
                            <td className="p-3.5 font-black text-amber-300">🪙 {m.totalPot}</td>
                            <td className="p-3.5 font-bold">
                              {isRefund ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-amber-400 font-bold text-sm">🪙 0</span>
                                  <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                                    Reembolso 100%
                                  </span>
                                </div>
                              ) : isSalaMatch ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-emerald-400 font-black text-sm">+🪙 {m.houseCommission}</span>
                                  <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                                    100% Sala
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-green-400 font-bold">+🪙 {m.houseCommission}</span>
                                  <span className="text-[10px] text-green-300/70 font-semibold">10% Duelo</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              {isRefund ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-bold text-amber-300 inline-flex items-center gap-1">
                                    🔄 REEMBOLSO
                                  </span>
                                  <span className="block text-[10px] text-amber-200/60 font-semibold">Devuelto 100% a Jugadores</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setPlayerMatchSearch(m.winnerUsername)}
                                    className="inline-flex items-center gap-1 font-bold text-amber-300 hover:underline transition"
                                    title="Filtrar partidas del ganador"
                                  >
                                    🏆 {m.winnerUsername}
                                  </button>
                                  {isSalaMatch && (
                                    <span className="block text-[10px] text-amber-200/60 font-semibold">Tarifa Abonada a Casa</span>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="p-3.5 text-amber-200/70">{m.endReason}</td>
                            <td className="p-3.5 text-amber-200/50 text-[11px]">{m.createdAt}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 5.1: PARTIDAS SOLITARIO CONTRA EL BOT */}
        {/* ========================================================================= */}
        {(activeTab === "bot-matches" || (activeTab === "matches" && matchesSubTab === "bot")) && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Auditoría de Partidas contra el Bot (Solitario)
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Registro de duelos contra la máquina, victorias de usuarios, efectividad de la IA y balance neto de la casa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  onClick={exportBotMatchesCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Exportar partidas vs bot a archivo CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>

                <button
                  onClick={handleResetMatchHistory}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-bold transition shadow"
                  title="Reiniciar partidas jugadas y ganancias del panel a cero"
                >
                  <span>🔄</span>
                  <span>Reiniciar a Cero</span>
                </button>
              </div>
            </div>

            {/* Selector de Sub-pestañas: Multijugador vs Bot si estamos en matches */}
            {activeTab === "matches" && (
              <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                <button
                  onClick={() => setMatchesSubTab("pvp")}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition bg-[#180e07] text-amber-200/70 border border-amber-500/20 hover:text-white"
                >
                  ⚔️ Duelos Multijugador ({matches.length})
                </button>
                <button
                  onClick={() => setMatchesSubTab("bot")}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                >
                  🤖 Solitario contra el Bot ({botMatches.length})
                </button>
              </div>
            )}

            {/* Control Interactivo de Dificultad del Bot */}
            <div className="bg-[#180e07] border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  ⚙️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-amber-300">Calibración de Dificultad del Bot (Solitario)</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      botDifficultyMode === 'facil'
                        ? 'bg-green-950/80 text-green-300 border-green-500/50'
                        : botDifficultyMode === 'dificil'
                        ? 'bg-red-950/80 text-red-300 border-red-500/50'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    }`}>
                      Modo Actual: {botDifficultyMode.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/70 mt-1">
                    {botDifficultyMode === 'facil' && "🟢 Modo Fácil: 50% Casa / 50% Jugador. El usuario gana ~5 de cada 10 partidas. Fluidez y modo recreativo."}
                    {botDifficultyMode === 'medio' && "🟡 Modo Medio (Estándar): 70% Casa / 30% Jugador. Recuperación constante de tesorería y control estricto de banca."}
                    {botDifficultyMode === 'dificil' && "🔴 Modo Difícil: 85% Casa / 15% Jugador. Muro de contención y protección antirachas activa."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "facil"}
                  onClick={() => handleSetBotDifficulty("facil")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "facil"
                      ? "bg-green-600 text-white ring-2 ring-green-400"
                      : "bg-[#24140a] text-green-400 border border-green-500/40 hover:bg-green-950/40"
                  }`}
                  title="50% Casa / 50% Jugador - Permite ganar más seguido a los usuarios (modo recreativo)"
                >
                  <span>🟢</span>
                  <span>Fácil (50/50)</span>
                </button>

                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "medio"}
                  onClick={() => handleSetBotDifficulty("medio")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "medio"
                      ? "bg-amber-500 text-black ring-2 ring-amber-300"
                      : "bg-[#24140a] text-amber-300 border border-amber-500/40 hover:bg-amber-950/40"
                  }`}
                  title="70% Casa / 30% Jugador - Recuperación de tesorería"
                >
                  <span>🟡</span>
                  <span>Medio (60/40)</span>
                </button>

                <button
                  type="button"
                  disabled={botDifficultyLoading || botDifficultyMode === "dificil"}
                  onClick={() => handleSetBotDifficulty("dificil")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow ${
                    botDifficultyMode === "dificil"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : "bg-[#24140a] text-red-400 border border-red-500/40 hover:bg-red-950/40"
                  }`}
                  title="85% Casa / 15% Jugador - Muro de contención para frenar desfalcos"
                >
                  <span>🔴</span>
                  <span>Difícil Muro (85%)</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* GESTIÓN DE BOTS VIRTUALES 1 VS 1 (INYECCIÓN DE OPONENTES) */}
            {/* ========================================================================= */}
            <div className="bg-[#180e07] border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                    👥
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`${fonts.bowlbyOneSC.className} text-base md:text-lg text-amber-300 tracking-wide`}>
                        Bots Virtuales 1 vs 1 (Retención de Jugadores)
                      </h2>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        Infill Automático (30 - 40s)
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/70 mt-0.5">
                      Personajes autónomos que entran a jugar 1vs1 si un usuario espera sin encontrar rival humano. Puedes cambiarles el nombre manualmente en cualquier momento con el botón ✏️.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid de Personajes Virtuales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {virtualBots.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-amber-200/50">
                    Cargando personajes de bots virtuales...
                  </div>
                ) : (
                  virtualBots.map((bot) => {
                    const isUpdating = updatingBotId === bot.id;
                    return (
                      <div
                        key={bot.id}
                        className={`bg-[#20120a] border rounded-2xl p-4 transition-all space-y-3 relative overflow-hidden ${
                          bot.isActive
                            ? "border-amber-500/40 hover:border-amber-400/80 shadow-md"
                            : "border-zinc-700 opacity-60"
                        }`}
                      >
                        {/* Header del Bot */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-300 text-sm overflow-hidden shrink-0">
                              {bot.avatarUrl && bot.avatarUrl.length > 5 ? (
                                <img src={bot.avatarUrl} alt={bot.username} className="w-full h-full object-cover" />
                              ) : (
                                bot.username.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-black text-white truncate">{bot.username}</h3>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleRenameVirtualBot(bot)}
                                  className="text-amber-400 hover:text-amber-200 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1 shrink-0"
                                  title={`Cambiar nombre de ${bot.username}`}
                                >
                                  <span>✏️</span>
                                  <span className="text-[10px] font-bold">Cambiar</span>
                                </button>
                                <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                                  ID #{bot.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-200/60 truncate">{bot.level}</p>
                            </div>
                          </div>

                          {/* Toggle Activo / Pausa */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateVirtualBot(bot.id, bot.difficulty, !bot.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition border ${
                              bot.isActive
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900"
                                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                            }`}
                            title={bot.isActive ? "Pausar bot" : "Activar bot"}
                          >
                            {bot.isActive ? "Activo" : "Pausado"}
                          </button>
                        </div>

                        {/* Selector de Dificultad Individual */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block mb-1.5">
                            Dificultad Individual:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              disabled={isUpdating || bot.difficulty === "facil"}
                              onClick={() => handleUpdateVirtualBot(bot.id, "facil", bot.isActive)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition border text-center ${
                                bot.difficulty === "facil"
                                  ? "bg-green-600 text-white border-green-400 ring-1 ring-green-400"
                                  : "bg-[#140b06] text-green-400/80 border-green-500/30 hover:bg-green-950/30"
                              }`}
                              title="40% Casa / 60% Jugador"
                            >
                              🟢 Fácil
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating || bot.difficulty === "medio"}
                              onClick={() => handleUpdateVirtualBot(bot.id, "medio", bot.isActive)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition border text-center ${
                                bot.difficulty === "medio"
                                  ? "bg-amber-500 text-black border-amber-300 ring-1 ring-amber-300"
                                  : "bg-[#140b06] text-amber-300/80 border-amber-500/30 hover:bg-amber-950/30"
                              }`}
                              title="50% Casa / 50% Jugador"
                            >
                              🟡 Medio
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating || bot.difficulty === "dificil"}
                              onClick={() => handleUpdateVirtualBot(bot.id, "dificil", bot.isActive)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition border text-center ${
                                bot.difficulty === "dificil"
                                  ? "bg-red-600 text-white border-red-400 ring-1 ring-red-400"
                                  : "bg-[#140b06] text-red-400/80 border-red-500/30 hover:bg-red-950/30"
                              }`}
                              title="65% Casa / 35% Jugador"
                            >
                              🔴 Difícil
                            </button>
                          </div>
                        </div>

                        {/* Estadísticas del Bot */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/10 text-xs">
                          <div className="bg-[#140b06] p-2 rounded-xl border border-amber-500/10">
                            <span className="text-[10px] text-amber-200/60 block">Partidas / Winrate:</span>
                            <span className="font-black text-amber-300">
                              {bot.totalMatches} ({bot.winRate}%)
                            </span>
                          </div>
                          <div className="bg-[#140b06] p-2 rounded-xl border border-amber-500/10">
                            <span className="text-[10px] text-amber-200/60 block">Victorias / Derrotas:</span>
                            <span className="font-bold text-white">
                              <span className="text-emerald-400">{bot.botWins}V</span> - <span className="text-red-400">{bot.botLosses}D</span>
                            </span>
                          </div>
                          <div className="col-span-2 bg-[#140b06] p-2 rounded-xl border border-amber-500/10 flex items-center justify-between">
                            <span className="text-[10px] text-amber-200/60">Impacto Casa (Ganancia Neta):</span>
                            <span className={`font-black ${bot.houseProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {bot.houseProfit >= 0 ? `+Bs. ${bot.houseProfit.toLocaleString()}` : `-Bs. ${Math.abs(bot.houseProfit).toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rendimiento y Selector de Periodo (Hoy, Ayer, 7 Días, Histórico o Fecha) */}
            <div id="bot-performance-boxes" className="bg-[#180e07] border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-black text-amber-300">
                        {currentBotMetrics.title}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black">
                        {currentBotMetrics.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/70 mt-0.5">
                      {currentBotMetrics.subtitle}
                    </p>
                  </div>
                </div>

                {/* Barra de Selección de Periodo */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#120803] border border-amber-500/30 p-1.5 rounded-xl">
                  <button
                    onClick={() => {
                      setBotDateFilter("today");
                      setCustomBotDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                      botDateFilter === "today"
                        ? "bg-amber-500 text-amber-950 shadow-md"
                        : "text-amber-200/70 hover:text-white hover:bg-amber-500/10"
                    }`}
                  >
                    <span>📅</span>
                    <span>Hoy</span>
                  </button>

                  <button
                    onClick={() => {
                      setBotDateFilter("yesterday");
                      setCustomBotDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                      botDateFilter === "yesterday"
                        ? "bg-amber-500 text-amber-950 shadow-md"
                        : "text-amber-200/70 hover:text-white hover:bg-amber-500/10"
                    }`}
                  >
                    <span>⏪</span>
                    <span>Ayer</span>
                  </button>

                  <button
                    onClick={() => {
                      setBotDateFilter("last7");
                      setCustomBotDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                      botDateFilter === "last7"
                        ? "bg-amber-500 text-amber-950 shadow-md"
                        : "text-amber-200/70 hover:text-white hover:bg-amber-500/10"
                    }`}
                  >
                    <span>🗓️</span>
                    <span>7 Días</span>
                  </button>

                  <button
                    onClick={() => {
                      setBotDateFilter("all");
                      setCustomBotDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                      botDateFilter === "all"
                        ? "bg-amber-500 text-amber-950 shadow-md"
                        : "text-amber-200/70 hover:text-white hover:bg-amber-500/10"
                    }`}
                  >
                    <span>📈</span>
                    <span>Todo</span>
                  </button>

                  <div className="flex items-center gap-1 pl-1.5 border-l border-amber-500/20">
                    <span className="text-[10px] text-amber-200/60 hidden sm:inline">Fecha:</span>
                    <input
                      type="date"
                      value={customBotDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomBotDate(val);
                        if (val) {
                          setBotDateFilter(val);
                        }
                      }}
                      className="bg-[#1e1008] border border-amber-500/40 rounded-lg px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Los 4 Boxes Dinámicos de Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5 shadow">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Partidas vs Bot</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {currentBotMetrics.totalMatches}
                  </div>
                  <span className="text-[11px] text-amber-200/50 block mt-0.5">
                    🪙 {currentBotMetrics.totalCoinsWagered.toLocaleString()} apostadas
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5 shadow">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Victorias Jugadores</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {currentBotMetrics.userWins} <span className="text-xs font-bold text-emerald-300/80">({currentBotMetrics.userWinRate}%)</span>
                  </div>
                  <span className="text-[11px] text-emerald-300/60 block mt-0.5">
                    🪙 {currentBotMetrics.coinsWonByUser.toLocaleString()} entregadas en premios
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5 shadow">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Victorias Bot</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {currentBotMetrics.botWins} <span className="text-xs font-bold text-amber-300/80">({currentBotMetrics.botWinRate}%)</span>
                  </div>
                  <span className="text-[11px] text-amber-300/60 block mt-0.5">
                    🪙 {currentBotMetrics.coinsWonByHouse.toLocaleString()} retenidas por bot
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5 shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Balance Neto Casa</span>
                    {currentBotMetrics.houseCommission > 0 && (
                      <span className="text-[10px] text-yellow-400 font-bold">Com: 🪙{currentBotMetrics.houseCommission.toLocaleString()}</span>
                    )}
                  </div>
                  <div className={`text-2xl font-black mt-1 ${currentBotMetrics.netHouseProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    🪙 {currentBotMetrics.netHouseProfit >= 0 ? "+" : ""}{currentBotMetrics.netHouseProfit.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-amber-200/50 block mt-0.5">
                    {currentBotMetrics.netHouseProfit >= 0 ? "Superávit neto para la casa" : "Premios superan balance"}
                  </span>
                </div>
              </div>
            </div>

            {/* Historial y Rendimiento Diario del Bot */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📊</span>
                    <span>Historial Diario del Bot (Desglose Día por Día)</span>
                  </h3>
                  <p className="text-[11px] text-amber-200/60 mt-0.5">
                    Haz clic en "Ver día" en cualquier fecha para filtrar los boxes superiores y la lista de partidas.
                  </p>
                </div>
                <span className="text-xs text-amber-200/60 font-semibold self-start sm:self-auto">
                  {botDailyBreakdown.length} días registrados
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-amber-500/20">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Fecha (Vzla)</th>
                      <th className="p-3 text-center">Partidas</th>
                      <th className="p-3 text-center">Bot (W)</th>
                      <th className="p-3 text-center">Jugador (W)</th>
                      <th className="p-3 text-center">% Bot (Meta 60%)</th>
                      <th className="p-3 text-right">Apostado</th>
                      <th className="p-3 text-right text-yellow-400">Comisión 10%</th>
                      <th className="p-3 text-right">Casa Retuvo</th>
                      <th className="p-3 text-right">Pagado Jugador</th>
                      <th className="p-3 text-right">Balance Neto</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {botDailyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-6 text-amber-200/40">
                          No hay historial diario previo registrado.
                        </td>
                      </tr>
                    ) : (
                      botDailyBreakdown.map((d) => {
                        const isSelected = botDateFilter === d.date;
                        return (
                          <tr
                            key={d.date}
                            className={`transition ${
                              isSelected
                                ? "bg-amber-500/15 border-l-4 border-amber-400"
                                : "hover:bg-amber-500/5"
                            }`}
                          >
                            <td className="p-3 font-mono font-bold text-amber-200">
                              <div className="flex items-center gap-1.5">
                                <span>{d.date}</span>
                                {d.date === botTodaySummary?.date && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black border border-emerald-500/30">
                                    HOY
                                  </span>
                                )}
                                {d.date === botYesterdaySummary?.date && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">
                                    AYER
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-white">{d.totalMatches}</td>
                            <td className="p-3 text-center text-amber-400 font-bold">{d.botWins}</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">{d.userWins}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                                  d.botWinRate >= 58 && d.botWinRate <= 65
                                    ? "bg-green-500/20 text-green-300 border border-green-500/40"
                                    : d.botWinRate > 65
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                }`}
                              >
                                {d.botWinRate}%
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-amber-200/80">🪙 {d.totalCoinsWagered.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-yellow-400 font-bold">🪙 {(d.houseCommission ?? 0).toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-400 font-bold">🪙 {d.coinsWonByHouse.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-red-300">🪙 {d.coinsWonByUser.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-black">
                              <span className={d.netHouseProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {d.netHouseProfit >= 0 ? "+🪙 " : "-🪙 "}{Math.abs(d.netHouseProfit).toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setBotDateFilter(d.date);
                                  setCustomBotDate(d.date);
                                  document.getElementById("bot-performance-boxes")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto ${
                                  isSelected
                                    ? "bg-amber-500 text-amber-950 font-black shadow"
                                    : "bg-[#24140a] hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                                title={`Ver métricas y partidas del ${d.date}`}
                              >
                                <span>👁️</span>
                                <span>{isSelected ? "Viendo" : "Ver día"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen Acumulado Global del Bot (Histórico Total) */}
            <div className="pt-2">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>📈</span>
                <span>Acumulado Histórico Global del Bot (Todas las Fechas)</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Partidas vs Bot</span>
                  <span className="text-xl">🤖</span>
                </div>
                <div className="text-2xl font-black text-white">{botSummary.totalBotMatches}</div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  🪙 {botSummary.totalCoinsWagered.toLocaleString()} monedas apostadas
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-emerald-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Victorias Jugadores</span>
                  <span className="text-xl">👤</span>
                </div>
                <div className="text-2xl font-black text-emerald-400">{botSummary.userWinsCount}</div>
                <div className="text-[11px] text-emerald-300/70 mt-1">
                  {botSummary.userWinRate}% efectividad · 🪙 {botSummary.totalCoinsWonByUser.toLocaleString()} entregadas
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Victorias del Bot</span>
                  <span className="text-xl">💻</span>
                </div>
                <div className="text-2xl font-black text-amber-400">{botSummary.botWinsCount}</div>
                <div className="text-[11px] text-amber-300/70 mt-1">
                  {botSummary.botWinRate}% efectividad · 🪙 {botSummary.totalCoinsWonByHouse.toLocaleString()} retenidas
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Balance Casa (Bot)</span>
                  <span className="text-xl">🏦</span>
                </div>
                <div className={`text-2xl font-black ${botSummary.netHouseProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  🪙 {botSummary.netHouseProfit >= 0 ? "+" : ""}{botSummary.netHouseProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  {botSummary.netHouseProfit >= 0 ? "Superávit neto para la casa" : "Premios pagados superan derrotas"}
                </div>
              </div>
            </div>

            {/* Aviso de Filtro de Fecha Activo */}
            {botDateFilter !== "all" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-200">
                  <span className="text-amber-400 font-bold">📅 Mostrando partidas de:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                    {currentBotMetrics.badge}
                  </span>
                  <span className="text-amber-200/70">
                    ({filteredBotMatches.length} partidas en tabla)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setBotDateFilter("all");
                    setCustomBotDate("");
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>Ver todo el historial completo</span>
                </button>
              </div>
            )}

            {/* Filtros y Buscador */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#180e07] border border-amber-500/20 rounded-2xl p-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Buscar por usuario o bot..."
                  value={botSearch}
                  onChange={(e) => setBotSearch(e.target.value)}
                  className="w-full bg-[#100804] border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                />
                {botSearch && (
                  <button
                    onClick={() => setBotSearch("")}
                    className="absolute right-2.5 top-2.5 text-xs text-amber-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex rounded-xl bg-[#1e1008] border border-amber-500/30 p-0.5 text-xs font-bold w-full sm:w-auto justify-center">
                <button
                  onClick={() => setBotResultFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    botResultFilter === "all" ? "bg-amber-500 text-amber-950 font-black" : "text-amber-200/60 hover:text-white"
                  }`}
                >
                  Todas ({botDateFilter === "all" ? botMatches.length : currentBotMetrics.totalMatches})
                </button>
                <button
                  onClick={() => setBotResultFilter("user_won")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    botResultFilter === "user_won" ? "bg-emerald-500 text-emerald-950 font-black" : "text-emerald-300/60 hover:text-white"
                  }`}
                >
                  🏆 Ganó Usuario ({botDateFilter === "all" ? botSummary.userWinsCount : currentBotMetrics.userWins})
                </button>
                <button
                  onClick={() => setBotResultFilter("bot_won")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    botResultFilter === "bot_won" ? "bg-red-500 text-white font-black" : "text-red-300/60 hover:text-white"
                  }`}
                >
                  🤖 Ganó Bot ({botDateFilter === "all" ? botSummary.botWinsCount : currentBotMetrics.botWins})
                </button>
              </div>
            </div>

            {/* Tabla de Partidas vs Bot */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Jugador</th>
                      <th className="p-3.5">Rival</th>
                      <th className="p-3.5">Apuesta</th>
                      <th className="p-3.5">Resultado</th>
                      <th className="p-3.5">Monedas Usuario</th>
                      <th className="p-3.5 text-amber-400">Comisión 10%</th>
                      <th className="p-3.5">Balance Casa</th>
                      <th className="p-3.5">Saldo Final</th>
                      <th className="p-3.5">Motivo</th>
                      <th className="p-3.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredBotMatches.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-10 text-amber-200/40">
                          No hay registros de partidas solitario contra el Bot aún (Panel en Cero).
                        </td>
                      </tr>
                    ) : (
                      filteredBotMatches.map((m) => (
                        <tr key={m.id} className="hover:bg-amber-500/5 transition-colors">
                          <td className="p-3.5 font-mono text-amber-200/50">#{m.id}</td>
                          <td className="p-3.5 font-bold text-white">
                            <span>👤 {m.username}</span>
                          </td>
                          <td className="p-3.5 font-medium text-amber-300">
                            <span>🤖 {m.botName}</span>
                          </td>
                          <td className="p-3.5 font-semibold text-amber-200">🪙 {m.betAmount}</td>
                          <td className="p-3.5">
                            {m.userWon ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                🏆 Ganó Usuario
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                🤖 Ganó el Bot
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold">
                            {m.userWon ? (
                              <span className="text-emerald-400 font-black">+🪙 {m.coinsWon}</span>
                            ) : (
                              <span className="text-red-400 font-bold">-🪙 {m.coinsLost}</span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold font-mono text-amber-400">
                            🪙 {m.houseCommission ? m.houseCommission : (m.userWon ? Math.round(m.betAmount * 0.1) : 0)}
                          </td>
                          <td className="p-3.5 font-bold">
                            {m.houseProfit > 0 ? (
                              <span className="text-emerald-400 font-black">+🪙 {m.houseProfit}</span>
                            ) : m.houseProfit < 0 ? (
                              <span className="text-red-400 font-bold">-🪙 {Math.abs(m.houseProfit)}</span>
                            ) : (
                              <span className="text-amber-200/50">🪙 0</span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-amber-100">🪙 {m.userCoinsAfter}</td>
                          <td className="p-3.5 text-amber-200/70">{m.endReason}</td>
                          <td className="p-3.5 text-amber-200/50 text-[11px]">{m.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 6: REPORTES FINANCIEROS */}
        {/* ========================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Encabezado y Acciones Principales */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide flex items-center gap-2`}>
                  <span>Reportes Financieros y Control de Caja Dual</span>
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Balance real de caja en Bolívares y USDT, flujo de recargas/retiros y gestión integral de gastos operativos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setExpenseFormType("BS");
                    setExpenseFormCategory("Servidor / Infraestructura");
                    setExpenseFormDescription("");
                    setExpenseFormAmount("");
                    setExpenseFormUsdtReceived("");
                    setExpenseFormNotes("");
                    setIsExpenseModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  <span className="text-sm">➕</span>
                  <span>Registrar Gasto / Compra USDT</span>
                </button>

                <button
                  onClick={exportFinancialReportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow"
                  title="Descargar reporte financiero en formato CSV/Excel"
                >
                  <span>📥</span>
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* Alerta de Recargas Pendientes por Validar */}
            {financialSummary.pendingCount > 0 && (
              <div className="bg-amber-950/60 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <div className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>Hay {financialSummary.pendingCount} recarga(s) pendiente(s) por validar</span>
                      <span className="bg-amber-500 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Acción Requerida
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      Monto total en espera de aprobación: <strong className="text-white">Bs. {financialSummary.pendingDepositsBs.toLocaleString()}</strong>. Al aprobarlas, se acreditarán automáticamente las monedas a los jugadores y se sumarán a la caja confirmada.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRechargeStatusFilter("PENDIENTE");
                    setActiveTab("recharges");
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
                >
                  <span>👉 Validar Recargas Ahora</span>
                </button>
              </div>
            )}

            {/* SECCIÓN 1: CAJAS NETAS REALES Y GASTOS (DUAL BS / USDT) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Caja Real Neta Bs */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1208] via-[#120904] to-[#0a0502] border-2 border-emerald-500/60 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>🇻🇪</span>
                    <span>Caja Real Bolívares</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Disponible
                  </span>
                </div>
                <div className={`text-3xl font-black ${financialSummary.cajaNetaBs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  Bs. {financialSummary.cajaNetaBs.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-100/70 mt-2 leading-relaxed">
                  Ingresos (Bs. {financialSummary.totalDeposits.toLocaleString()}) − Retiros Pagados (Bs. {financialSummary.totalWithdrawalsPaid.toLocaleString()}) − Gastos Bs. (Bs. {financialSummary.totalBsExpenses.toLocaleString()})
                </p>
              </div>

              {/* Caja Real Neta USDT */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#121815] via-[#091410] to-[#040a08] border-2 border-cyan-500/60 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>Caja Neta USDT</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Fondo Cripto
                  </span>
                </div>
                <div className={`text-3xl font-black ${financialSummary.cajaNetaUsdt >= 0 ? "text-cyan-300" : "text-red-400"}`}>
                  ${financialSummary.cajaNetaUsdt.toLocaleString()} <span className="text-sm text-cyan-400 font-bold">USDT</span>
                </div>
                <p className="text-[11px] text-cyan-100/70 mt-2 leading-relaxed">
                  USDT Comprados (${financialSummary.totalUsdtPurchased.toLocaleString()}) − Gastos USDT (${financialSummary.totalUsdtExpenses.toLocaleString()})
                </p>
              </div>

              {/* Total Gastos en Bs */}
              <div className="bg-[#180e07] border border-red-500/40 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2 text-rose-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Gastos en Bolívares</span>
                  <span className="text-lg">📉</span>
                </div>
                <div className="text-2xl font-black text-rose-400">
                  Bs. {financialSummary.totalBsExpenses.toLocaleString()}
                </div>
                <p className="text-[11px] text-rose-200/70 mt-2">
                  {expenses.filter(e => e.currency === "BS").length} egresos registrados (incluye Bs. usados para comprar USDT)
                </p>
              </div>

              {/* Total Gastos en USDT */}
              <div className="bg-[#180e07] border border-purple-500/40 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2 text-purple-300">
                  <span className="text-[11px] font-black uppercase tracking-wider">Gastos en USDT</span>
                  <span className="text-lg">💸</span>
                </div>
                <div className="text-2xl font-black text-purple-300">
                  ${financialSummary.totalUsdtExpenses.toLocaleString()} <span className="text-sm font-bold">USDT</span>
                </div>
                <p className="text-[11px] text-purple-200/70 mt-2">
                  {expenses.filter(e => e.currency === "USDT").length} egresos directos pagados en USDT
                </p>
              </div>
            </div>

            {/* SECCIÓN 2: FLUJO DE ENTRADAS Y SALIDAS BASE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recargas Aprobadas */}
              <div className="bg-[#180e07] border border-green-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-green-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ingresos Confirmados</span>
                  <span className="text-xl">✅</span>
                </div>
                <div className="text-2xl font-black text-white">
                  Bs. {financialSummary.totalDeposits.toLocaleString()}
                </div>
                <p className="text-[11px] text-green-300/70 mt-1">
                  {financialSummary.approvedCount} recargas aprobadas y acreditadas en caja
                </p>
              </div>

              {/* Recargas Pendientes */}
              <div className="bg-[#180e07] border border-amber-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Recargas por Validar</span>
                  <span className="text-xl">⏳</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.pendingCount > 0 ? "text-amber-300" : "text-white"}`}>
                  Bs. {financialSummary.pendingDepositsBs.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/70 mt-1">
                  {financialSummary.pendingCount} comprobantes en cola esperando verificación
                </p>
              </div>

              {/* Recargas Registradas Hoy */}
              <div className="bg-[#180e07] border border-cyan-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-cyan-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Recargas de Hoy (24h)</span>
                  <span className="text-xl">📅</span>
                </div>
                <div className="text-2xl font-black text-white">
                  Bs. {financialSummary.todayRechargesBs.toLocaleString()}
                </div>
                <p className="text-[11px] text-cyan-200/70 mt-1">
                  {financialSummary.todayRechargesCount} solicitudes hoy ({financialSummary.todayApprovedBs.toLocaleString()} Bs. aprobadas · {financialSummary.todayPendingBs.toLocaleString()} Bs. pendientes)
                </p>
              </div>

              {/* Pagos por Retiros Realizados */}
              <div className="bg-[#180e07] border border-red-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-red-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Retiros Pagados</span>
                  <span className="text-xl">📤</span>
                </div>
                <div className="text-2xl font-black text-white">
                  Bs. {financialSummary.totalWithdrawalsPaid.toLocaleString()}
                </div>
                <p className="text-[11px] text-red-300/70 mt-1">
                  {financialSummary.paidWithdrawalsCount} transferencias completadas a ganadores
                </p>
              </div>

              {/* Retiros Pendientes */}
              <div className="bg-[#180e07] border border-orange-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-orange-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Retiros por Pagar</span>
                  <span className="text-xl">⌛</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.pendingWithdrawalsCount > 0 ? "text-orange-300" : "text-white"}`}>
                  Bs. {financialSummary.pendingWithdrawalsBs.toLocaleString()}
                </div>
                <p className="text-[11px] text-orange-200/70 mt-1">
                  {financialSummary.pendingWithdrawalsCount} solicitudes de cobro pendientes
                </p>
              </div>

              {/* Balance Contable Base */}
              <div className="bg-[#180e07] border border-amber-500/50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Flujo Contable Recargas - Retiros</span>
                  <span className="text-xl">🏦</span>
                </div>
                <div className={`text-2xl font-black ${financialSummary.netBsBalance >= 0 ? "text-amber-300" : "text-red-400"}`}>
                  Bs. {financialSummary.netBsBalance.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/70 mt-1">
                  Antes de gastos operativos. Con pendientes: Bs. {financialSummary.netBsBalanceWithPending.toLocaleString()}
                </p>
              </div>
            </div>

            {/* SECCIÓN 3: CONTROL Y TABLA INTERACTIVA DE GASTOS */}
            <div className="bg-[#180e07] border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📋</span>
                  <div>
                    <h2 className="text-base font-black text-amber-300">
                      Historial de Gastos y Movimientos de Caja
                    </h2>
                    <p className="text-[11px] text-amber-200/60">
                      Registro detallado de salidas en Bolívares, salidas en USDT y compras de criptoactivos.
                    </p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro Moneda */}
                  <div className="flex rounded-xl bg-[#120803] border border-amber-500/30 p-0.5 text-xs font-bold">
                    {[
                      { key: "ALL", label: "Todas" },
                      { key: "BS", label: "Bs." },
                      { key: "USDT", label: "USDT" }
                    ].map(cur => (
                      <button
                        key={cur.key}
                        onClick={() => setExpenseFilterCurrency(cur.key)}
                        className={`px-2.5 py-1 rounded-lg transition ${expenseFilterCurrency === cur.key ? "bg-amber-500 text-amber-950 font-black shadow" : "text-amber-200/70 hover:text-white"}`}
                      >
                        {cur.label}
                      </button>
                    ))}
                  </div>

                  {/* Selector Categoría */}
                  <select
                    value={expenseFilterCategory}
                    onChange={(e) => setExpenseFilterCategory(e.target.value)}
                    className="bg-[#120803] border border-amber-500/30 text-amber-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Todas las categorías</option>
                    <option value="Servidor / Infraestructura">Servidor / Infraestructura</option>
                    <option value="Desarrollo & Mejoras">Desarrollo & Mejoras</option>
                    <option value="Compra USDT">Compra USDT</option>
                    <option value="Marketing & Publicidad">Marketing & Publicidad</option>
                    <option value="Nómina / Administrativo">Nómina / Administrativo</option>
                    <option value="Comisiones Bancarias">Comisiones Bancarias</option>
                    <option value="Varios / Otros">Varios / Otros</option>
                  </select>

                  <button
                    onClick={() => {
                      setExpenseFormType("BS");
                      setExpenseFormCategory("Servidor / Infraestructura");
                      setExpenseFormDescription("");
                      setExpenseFormAmount("");
                      setExpenseFormUsdtReceived("");
                      setExpenseFormNotes("");
                      setIsExpenseModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>➕ Registrar</span>
                  </button>
                </div>
              </div>

              {/* Tabla de Gastos */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3"># ID</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo / Moneda</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-right">Monto Gastado</th>
                      <th className="py-2.5 px-3 text-right">USDT Recibidos / Tasa</th>
                      <th className="py-2.5 px-3">Notas</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-amber-200/50">
                          No se han registrado gastos en esta categoría o moneda. Haz clic en "➕ Registrar Gasto" para comenzar.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-amber-500/5 transition">
                          <td className="py-3 px-3 font-mono text-amber-400/80">#{exp.id}</td>
                          <td className="py-3 px-3 text-amber-100/80 whitespace-nowrap">
                            {new Date(exp.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            {exp.category?.includes("Compra USDT") ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 w-max">
                                🔄 Compra USDT
                              </span>
                            ) : exp.currency === "BS" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-max">
                                🇻🇪 Bolívares
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 w-max">
                                💵 USDT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-amber-200">{exp.category}</td>
                          <td className="py-3 px-3 text-white font-medium max-w-xs truncate" title={exp.description}>
                            {exp.description}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-rose-400 whitespace-nowrap">
                            − {exp.currency === "BS" ? `Bs. ${exp.amount.toLocaleString()}` : `$ ${exp.amount.toLocaleString()} USDT`}
                          </td>
                          <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                            {exp.usdtReceived && exp.usdtReceived > 0 ? (
                              <div>
                                <span className="text-emerald-400 font-bold">+${exp.usdtReceived.toLocaleString()} USDT</span>
                                {exp.exchangeRate && (
                                  <div className="text-[10px] text-amber-200/60">
                                    @ Bs. {exp.exchangeRate.toLocaleString()} / $
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-200/40">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-amber-200/70 max-w-[150px] truncate" title={exp.notes || ""}>
                            {exp.notes || "—"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 text-[11px] font-bold transition"
                              title="Eliminar gasto y reintegrar al balance"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 4: MÉTRICAS DE MONEDAS Y CASA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Comisión Duelos PvP
                </div>
                <div className="text-2xl font-black text-amber-400">
                  🪙 {financialSummary.totalCommissions.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  En {financialSummary.totalMatches} duelos (100% salas privadas y 10% matchmaking)
                </p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Balance Solitario vs Bot
                </div>
                <div className={`text-2xl font-black ${financialSummary.totalBotHouseProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  🪙 {financialSummary.totalBotHouseProfit >= 0 ? "+" : ""}{financialSummary.totalBotHouseProfit.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  En {financialSummary.totalBotMatches} partidas vs máquina (🪙 {financialSummary.totalBotCoinsWagered.toLocaleString()} apostadas)
                </p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Ganancia Neta Total Casa
                </div>
                <div className={`text-2xl font-black ${financialSummary.totalCombinedProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                  🪙 {financialSummary.totalCombinedProfit >= 0 ? "+" : ""}{financialSummary.totalCombinedProfit.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  Comisiones PvP + Balance Solitario vs Bot
                </p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Monedas en Manos de Jugadores
                </div>
                <div className="text-2xl font-black text-white">
                  🪙 {financialSummary.totalCoinsInUsers.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  Saldo total en circulación entre los {users.length} usuarios
                </p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5 md:col-span-2">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Volumen Total Apostado Global
                </div>
                <div className="text-2xl font-black text-white">
                  🪙 {(financialSummary.totalWagered + financialSummary.totalBotCoinsWagered).toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  Monedas apostadas en {financialSummary.totalMatches + financialSummary.totalBotMatches} partidas ({financialSummary.totalMatches} multijugador + {financialSummary.totalBotMatches} solitario)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 7: CUPONES PROMOCIONALES */}
        {/* ========================================================================= */}
        {activeTab === "promos" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Cupones y Códigos Promocionales
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Genera códigos de monedas de regalo para promociones en redes sociales y transmisiones en vivo.
                </p>
              </div>

              <button
                onClick={exportPromosCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow self-start md:self-auto"
                title="Descargar cupones en archivo CSV/Excel"
              >
                <span>📥</span>
                <span>Exportar Cupones Excel</span>
              </button>
            </div>

            {/* Formulario de Creación de Cupón */}
            <div className="bg-[#180e07] border border-amber-500/40 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>➕</span>
                <span>Crear Nuevo Código Promocional</span>
              </h3>

              <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Código Promocional
                  </label>
                  <input
                    type="text"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="Ej: LLANERO2026"
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-amber-200/30 font-mono font-bold uppercase focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Monedas de Regalo
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="10"
                    value={newPromoCoins}
                    onChange={(e) => setNewPromoCoins(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Límite de Canjes (Usos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={newPromoMaxUses}
                    onChange={(e) => setNewPromoMaxUses(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingPromo || !newPromoCode.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition"
                >
                  {creatingPromo ? "Creando..." : "Crear Cupón"}
                </button>
              </form>
            </div>

            {/* Tabla de Cupones */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Código</th>
                      <th className="p-3.5">Recompensa</th>
                      <th className="p-3.5">Canjes / Límite</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha Creación</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {promos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-amber-200/40">
                          No hay cupones promocionales registrados aún.
                        </td>
                      </tr>
                    ) : (
                      promos.map((p) => (
                        <tr key={p.id} className="hover:bg-amber-500/5 transition">
                          <td className="p-3.5 text-amber-200/60 font-mono">#{p.id}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                                {p.code}
                              </span>
                              <button
                                onClick={() => copyToClipboard(p.code, `promo-${p.id}`)}
                                className="text-[10px] text-amber-400/80 hover:text-white"
                                title="Copiar código"
                              >
                                {copiedText === `promo-${p.id}` ? "✓" : "📋"}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                              🪙 +{p.coinsReward.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1 min-w-[110px]">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>{p.currentUses.toLocaleString()}</span>
                                <span className="text-amber-200/60">/ {p.maxUses.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-amber-500/20">
                                <div
                                  className="bg-amber-400 h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, (p.currentUses / Math.max(1, p.maxUses)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                p.isActive
                                  ? "bg-green-950/80 text-green-300 border border-green-500/40"
                                  : "bg-red-950/80 text-red-300 border border-red-500/40"
                              }`}
                            >
                              {p.isActive ? "ACTIVO" : "PAUSADO"}
                            </span>
                          </td>
                          <td className="p-3.5 text-amber-200/60 font-mono text-[11px]">{p.createdAt}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleTogglePromo(p.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                                p.isActive
                                  ? "bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/40"
                                  : "bg-green-600 hover:bg-green-500 text-white"
                              }`}
                            >
                              {p.isActive ? "Pausar" : "Reactivar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 8: CENTRO DE MONITOREO DE ERRORES E INCIDENCIAS (TELEMETRÍA) */}
        {/* ========================================================================= */}
        {activeTab === "errors" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#180e07] border border-amber-500/30 p-5 rounded-2xl shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h2 className="text-lg font-black text-amber-300">Monitoreo de Errores e Incidencias</h2>
                  {errorCounts.new > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                      {errorCounts.new} NUEVO{errorCounts.new > 1 ? 'S' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-200/60 mt-1">
                  Telemetría en tiempo real: reportes automáticos de salas 2v2, 1v1, reconexiones, jugadas y SignalR.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchErrorLogs}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition flex items-center gap-1.5 shadow"
                >
                  <span>🔄</span>
                  <span>Actualizar</span>
                </button>
                <button
                  onClick={handleClearResolvedErrors}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 shadow"
                  title="Elimina de la base de datos todos los reportes marcados como RESUELTO"
                >
                  <span>🧹</span>
                  <span>Limpiar Resueltos</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Errores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-2xl">
                  📋
                </div>
                <div>
                  <span className="text-[11px] text-amber-200/60 font-bold uppercase tracking-wider block">Total Reportes</span>
                  <span className="text-2xl font-black text-amber-300 font-mono">{errorCounts.total}</span>
                </div>
              </div>

              <div className={`bg-[#180e07] border ${errorCounts.new > 0 ? 'border-red-500/80 shadow-red-500/20 ring-1 ring-red-500/50' : 'border-amber-500/30'} p-4 rounded-2xl shadow-lg flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl ${errorCounts.new > 0 ? 'bg-red-500/20 border border-red-500 text-red-400' : 'bg-slate-800 text-slate-400'} flex items-center justify-center text-2xl`}>
                  🚨
                </div>
                <div>
                  <span className="text-[11px] text-red-300/80 font-bold uppercase tracking-wider block">Nuevos / Pendientes</span>
                  <span className={`text-2xl font-black font-mono ${errorCounts.new > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                    {errorCounts.new}
                  </span>
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-2xl">
                  ✅
                </div>
                <div>
                  <span className="text-[11px] text-green-200/70 font-bold uppercase tracking-wider block">Incidencias Resueltas</span>
                  <span className="text-2xl font-black text-green-400 font-mono">{errorCounts.resolved}</span>
                </div>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#180e07] border border-amber-500/30 p-3.5 rounded-2xl">
              {/* Filtro por Estado */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-200/60 uppercase mr-1">Estado:</span>
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "NUEVO", label: "🔴 Nuevos" },
                  { id: "REVISADO", label: "🟡 En Revisión" },
                  { id: "RESUELTO", label: "🟢 Resueltos" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setErrorStatusFilter(st.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      errorStatusFilter === st.id
                        ? "bg-amber-500 text-amber-950 font-black shadow"
                        : "bg-[#24140a] text-amber-200/70 hover:text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Filtro por Módulo / Origen */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-200/60 uppercase mr-1">Origen:</span>
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "Game2v2", label: "Módulo 2v2" },
                  { id: "Game1v1", label: "Módulo 1v1" },
                  { id: "SignalR", label: "SignalR" },
                  { id: "Client", label: "Cliente Web" },
                ].map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setErrorSourceFilter(src.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      errorSourceFilter === src.id
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400 shadow"
                        : "bg-[#24140a] text-amber-200/50 hover:text-amber-200 border border-amber-500/20"
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Errores e Incidencias */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#24140a] border-b border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">ID / Fecha</th>
                      <th className="p-3.5">Origen</th>
                      <th className="p-3.5">Sala / Usuario</th>
                      <th className="p-3.5">Detalle del Error</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-amber-200/40">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="text-3xl">✨</span>
                            <span className="font-bold text-sm text-green-300">¡No hay errores registrados con estos filtros!</span>
                            <span className="text-xs text-amber-200/50">El sistema opera con normalidad.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((err) => {
                        const isNew = err.status === "NUEVO";
                        const isResolved = err.status === "RESUELTO";
                        const isReviewed = err.status === "REVISADO";

                        return (
                          <tr key={err.id} className={`hover:bg-amber-500/5 transition ${isNew ? 'bg-red-950/10' : ''}`}>
                            {/* ID y Fecha */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-mono font-black text-amber-400 block">#{err.id}</span>
                              <span className="text-[10px] text-amber-200/60 block">
                                {new Date(err.createdAt).toLocaleDateString()} {new Date(err.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Origen */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                err.source === 'Game2v2'
                                  ? 'bg-purple-950/80 text-purple-200 border-purple-400/50'
                                  : err.source === 'SignalR'
                                  ? 'bg-blue-950/80 text-blue-200 border-blue-400/50'
                                  : err.source === 'Game1v1'
                                  ? 'bg-amber-950/80 text-amber-200 border-amber-400/50'
                                  : 'bg-stone-900 text-stone-200 border-stone-600'
                              }`}>
                                {err.source}
                              </span>
                            </td>

                            {/* Sala / Usuario */}
                            <td className="p-3.5">
                              {err.roomName && (
                                <span className="font-mono text-[11px] font-bold text-sky-300 block max-w-[150px] truncate" title={err.roomName}>
                                  🏠 {err.roomName}
                                </span>
                              )}
                              <span className="text-[11px] text-amber-200/80 block max-w-[150px] truncate">
                                👤 {err.username || 'Anónimo'} {err.userId ? `(ID: ${err.userId})` : ''}
                              </span>
                            </td>

                            {/* Error / Descripción */}
                            <td className="p-3.5">
                              <p className="font-medium text-red-200 text-xs line-clamp-2 max-w-md" title={err.errorMessage}>
                                {err.errorMessage}
                              </p>
                              {err.adminNotes && (
                                <span className="text-[10px] text-amber-300/80 italic mt-0.5 block">
                                  📝 Nota: {err.adminNotes}
                                </span>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {(err.stackTrace || err.extraData) && (
                                  <button
                                    onClick={() => setSelectedError(err)}
                                    className="text-[10px] text-amber-400 hover:text-amber-200 underline font-bold"
                                  >
                                    🔍 Ver Detalles & Stack
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow ${
                                isNew
                                  ? 'bg-red-600 text-white border-red-300 animate-pulse'
                                  : isReviewed
                                  ? 'bg-amber-500/20 text-yellow-300 border-yellow-500/40'
                                  : 'bg-green-950/80 text-green-300 border-green-500/40'
                              }`}>
                                {err.status}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isResolved && (
                                  <button
                                    onClick={() => handleUpdateErrorStatus(err.id, "RESUELTO")}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold rounded-lg transition shadow"
                                    title="Marcar incidencia como resuelta"
                                  >
                                    ✓ Resolver
                                  </button>
                                )}
                                {!isReviewed && !isResolved && (
                                  <button
                                    onClick={() => handleUpdateErrorStatus(err.id, "REVISADO")}
                                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition"
                                    title="Marcar como revisado"
                                  >
                                    Revisar
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedError(err)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 transition"
                                  title="Ver detalles completos"
                                >
                                  Detalle
                                </button>
                                <button
                                  onClick={() => handleDeleteError(err.id)}
                                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition text-xs"
                                  title="Eliminar reporte"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. PESTAÑA: OPINIONES, SUGERENCIAS Y TESTIMONIOS DE JUGADORES             */}
        {/* ========================================================================= */}
        {activeTab === "feedbacks" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cabecera del Módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#180e07] border border-amber-500/30 p-5 rounded-2xl shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐💬</span>
                  <h2 className="text-lg font-black text-amber-300">
                    Opiniones, Sugerencias y Experiencias
                  </h2>
                </div>
                <p className="text-xs text-amber-200/70 mt-1 max-w-2xl">
                  Revisa qué tal le parece <strong>El Pericón</strong> a tus jugadores, responde a sus ideas por WhatsApp y destaca sus testimonios en la página principal.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <span>🔄</span>
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Opiniones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-xl shadow-lg">
                <span className="text-[10px] font-bold text-amber-300/70 uppercase block">Calificación Promedio</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-yellow-400">★ {feedbackStats.averageRating}</span>
                  <span className="text-xs text-amber-200/60">/ 5.0</span>
                </div>
                <p className="text-[10px] text-amber-200/50 mt-1">Nivel de satisfacción global</p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-xl shadow-lg">
                <span className="text-[10px] font-bold text-amber-300/70 uppercase block">Total de Opiniones</span>
                <span className="text-2xl font-black text-white mt-1 block">{feedbacks.length}</span>
                <p className="text-[10px] text-amber-200/50 mt-1">Comentarios recibidos</p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-xl shadow-lg">
                <span className="text-[10px] font-bold text-amber-300/70 uppercase block">💡 Sugerencias</span>
                <span className="text-2xl font-black text-amber-300 mt-1 block">
                  {feedbacks.filter(f => f.category === "Sugerencia").length}
                </span>
                <p className="text-[10px] text-amber-200/50 mt-1">Ideas para nuevas funciones</p>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 p-4 rounded-xl shadow-lg">
                <span className="text-[10px] font-bold text-amber-300/70 uppercase block">⭐ Testimonios Destacados</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {feedbacks.filter(f => f.isFeatured).length}
                </span>
                <p className="text-[10px] text-amber-200/50 mt-1">Visibles en página web</p>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#180e07] border border-amber-500/20 p-3.5 rounded-xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-amber-200/60 font-bold mr-1">Filtrar por:</span>
                {["ALL", "Sugerencia", "Experiencia", "Reglas", "Recargas", "General"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFeedbackCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      feedbackCategoryFilter === cat
                        ? "bg-amber-500 text-stone-950 shadow"
                        : "bg-[#24140a] text-amber-200/70 hover:text-white hover:bg-[#301b0f]"
                    }`}
                  >
                    {cat === "ALL" ? "Todas" : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={feedbackRatingFilter}
                  onChange={(e) => setFeedbackRatingFilter(parseInt(e.target.value) || 0)}
                  className="bg-[#24140a] border border-amber-500/30 text-amber-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
                >
                  <option value={0}>Todas las estrellas</option>
                  <option value={5}>⭐⭐⭐⭐⭐ (5 estrellas)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 estrellas)</option>
                  <option value={3}>⭐⭐⭐ (3 estrellas)</option>
                  <option value={2}>⭐⭐ (2 estrellas)</option>
                  <option value={1}>⭐ (1 estrella)</option>
                </select>
              </div>
            </div>

            {/* Listado de Opiniones */}
            <div className="space-y-3">
              {feedbacks
                .filter((f) => {
                  const matchCat = feedbackCategoryFilter === "ALL" || f.category.toLowerCase() === feedbackCategoryFilter.toLowerCase();
                  const matchRating = feedbackRatingFilter === 0 || f.rating === feedbackRatingFilter;
                  return matchCat && matchRating;
                })
                .length === 0 ? (
                <div className="text-center py-12 bg-[#180e07] border border-amber-500/20 rounded-2xl text-amber-200/60">
                  <span className="text-4xl block mb-2">📭</span>
                  <p className="text-sm font-bold text-amber-300">No hay opiniones en esta categoría todavía.</p>
                  <p className="text-xs text-amber-200/50 mt-1">Los comentarios enviados por los jugadores desde el lobby aparecerán aquí.</p>
                </div>
              ) : (
                feedbacks
                  .filter((f) => {
                    const matchCat = feedbackCategoryFilter === "ALL" || f.category.toLowerCase() === feedbackCategoryFilter.toLowerCase();
                    const matchRating = feedbackRatingFilter === 0 || f.rating === feedbackRatingFilter;
                    return matchCat && matchRating;
                  })
                  .map((f) => {
                    const cleanPhone = f.userPhone ? f.userPhone.replace(/[^0-9]/g, "").replace(/^0/, "58") : null;
                    const waLink = cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `¡Hola ${f.username}! 🤠 Te escribe la administración de El Pericón. Leímos tu ${f.category === "Sugerencia" ? "sugerencia" : "opinión"} sobre "${f.category}" y queremos agradecerte tu valioso aporte.`
                        )}`
                      : null;

                    return (
                      <div
                        key={f.id}
                        className={`bg-[#180e07] border p-4 sm:p-5 rounded-2xl shadow-xl transition-all ${
                          f.isFeatured ? "border-amber-400 bg-amber-950/20 shadow-amber-500/10" : "border-amber-500/20 hover:border-amber-500/40"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-amber-500/15">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Estrellas */}
                              <div className="flex text-yellow-400 text-sm tracking-widest font-black">
                                {"★".repeat(f.rating)}
                                {"☆".repeat(5 - f.rating)}
                              </div>
                              <span className="text-xs font-bold text-white">{f.username}</span>
                              {f.userEmail && (
                                <span className="text-[11px] text-amber-200/50">({f.userEmail})</span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#24140a] text-amber-300 border border-amber-500/30">
                                {f.category}
                              </span>
                              {f.isFeatured && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-stone-950 shadow-sm animate-pulse">
                                  ⭐ DESTACADO
                                </span>
                              )}
                              {f.canPublish && !f.isFeatured && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                  ✓ Autoriza publicar
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-amber-200/40 block mt-1">
                              Recibido el {new Date(f.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 shrink-0">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                                title="Responder directamente al jugador por WhatsApp"
                              >
                                <span>📱</span>
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleToggleFeaturedFeedback(f.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                                f.isFeatured
                                  ? "bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-500/40"
                                  : "bg-[#24140a] hover:bg-[#301b0f] text-amber-300/80 border-amber-500/30"
                              }`}
                              title={f.isFeatured ? "Quitar de testimonios destacados" : "Marcar como testimonio destacado"}
                            >
                              {f.isFeatured ? "⭐ Desmarcar" : "⭐ Destacar"}
                            </button>
                            <button
                              onClick={() => handleDeleteFeedback(f.id)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition text-xs border border-red-500/20"
                              title="Eliminar opinión"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Contenido del Mensaje */}
                        <div className="mt-3 bg-[#24140a]/70 p-3.5 rounded-xl border border-amber-500/15 text-xs sm:text-sm text-stone-200 leading-relaxed font-sans">
                          &ldquo;{f.message}&rdquo;
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL DE DETALLE DE INCIDENCIA / ERROR */}
      {/* ========================================================================= */}
      {selectedError && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedError(null)}
        >
          <div
            className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-black text-amber-300">
                    Incidencia #{selectedError.id} • [{selectedError.source}]
                  </h3>
                  <span className="text-[10px] text-amber-200/60">
                    Reportado el {new Date(selectedError.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-amber-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {/* Info de Contexto */}
              <div className="grid grid-cols-2 gap-2 bg-[#24140a] p-3 rounded-xl border border-amber-500/20 text-xs">
                <div>
                  <span className="text-amber-200/60 font-bold block text-[10px] uppercase">Sala:</span>
                  <span className="text-sky-300 font-mono font-bold">{selectedError.roomName || 'No especificada'}</span>
                </div>
                <div>
                  <span className="text-amber-200/60 font-bold block text-[10px] uppercase">Usuario:</span>
                  <span className="text-amber-100 font-bold">{selectedError.username || 'Anónimo'} {selectedError.userId ? `(ID: ${selectedError.userId})` : ''}</span>
                </div>
                <div>
                  <span className="text-amber-200/60 font-bold block text-[10px] uppercase">Estado Actual:</span>
                  <span className="font-bold text-amber-300">{selectedError.status}</span>
                </div>
                <div>
                  <span className="text-amber-200/60 font-bold block text-[10px] uppercase">Resuelto En:</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {selectedError.resolvedAt ? new Date(selectedError.resolvedAt).toLocaleString() : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* Mensaje de Error */}
              <div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-1">
                  Mensaje del Error:
                </span>
                <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs font-medium">
                  {selectedError.errorMessage}
                </div>
              </div>

              {/* Metadatos Extra */}
              {selectedError.extraData && (
                <div>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-1">
                    Datos Adicionales (JSON / Metadatos):
                  </span>
                  <pre className="bg-black/80 border border-amber-500/20 p-3 rounded-xl text-amber-200 text-[11px] font-mono overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {selectedError.extraData}
                  </pre>
                </div>
              )}

              {/* Stack Trace */}
              {selectedError.stackTrace && (
                <div>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-1">
                    Pila de Llamadas (Stack Trace):
                  </span>
                  <pre className="bg-black/90 border border-red-500/20 p-3 rounded-xl text-red-300/80 text-[10px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}

              {/* Notas del Administrador */}
              <div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-1">
                  Notas de Administración:
                </span>
                <textarea
                  value={editingNotesId === selectedError.id ? adminNoteInput : (selectedError.adminNotes || '')}
                  onChange={(e) => {
                    setEditingNotesId(selectedError.id);
                    setAdminNoteInput(e.target.value);
                  }}
                  placeholder="Escribe notas sobre la causa o solución de esta incidencia..."
                  rows={2}
                  className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/30 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Pie del Modal con Acciones */}
            <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => handleDeleteError(selectedError.id)}
                className="px-3 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-500/40 transition"
              >
                Eliminar Registro
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const notes = editingNotesId === selectedError.id ? adminNoteInput : selectedError.adminNotes;
                    handleUpdateErrorStatus(selectedError.id, "REVISADO", notes);
                    setSelectedError(prev => prev ? { ...prev, status: "REVISADO", adminNotes: notes } : null);
                  }}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition"
                >
                  Guardar como Revisado
                </button>
                <button
                  onClick={() => {
                    const notes = editingNotesId === selectedError.id ? adminNoteInput : selectedError.adminNotes;
                    handleUpdateErrorStatus(selectedError.id, "RESUELTO", notes);
                    setSelectedError(prev => prev ? { ...prev, status: "RESUELTO", adminNotes: notes, resolvedAt: new Date().toISOString() } : null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-green-600/20"
                >
                  ✓ Marcar Resuelto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE AJUSTE DE MONEDAS (SUMAR Y QUITAR) */}
      {/* ========================================================================= */}
      {adjustingUser && (() => {
        const currentCoins = adjustingUser.coins || 0;
        const absAmt = Math.abs(adjustAmount || 0);
        const finalCoins = adjustMode === "add"
          ? currentCoins + absAmt
          : Math.max(0, currentCoins - absAmt);
        const deductedCoins = Math.min(currentCoins, absAmt);

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="bg-gradient-to-b from-[#1c0f07] to-[#120803] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-md w-full text-white shadow-2xl relative flex flex-col gap-4">
              
              {/* Encabezado */}
              <div className="flex items-start justify-between border-b border-amber-500/20 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                    <span>🪙</span>
                    <span>Gestionar Saldo de Monedas</span>
                  </h3>
                  <p className="text-xs text-amber-200/70 mt-0.5">
                    Usuario: <span className="font-bold text-white">@{adjustingUser.username}</span> (ID #{adjustingUser.id})
                  </p>
                </div>
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="w-8 h-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold transition"
                  title="Cerrar modal"
                >
                  ✕
                </button>
              </div>

              {/* Selector de Modo: SUMAR (Acreditar) vs RESTAR (Quitar) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/50 border border-amber-500/30 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode("add");
                    if (adjustAmount <= 0) setAdjustAmount(100);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                    adjustMode === "add"
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/50 border border-emerald-400/60"
                      : "text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/10"
                  }`}
                >
                  <span>➕</span>
                  <span>Acreditar (Sumar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode("subtract");
                    if (adjustAmount <= 0) setAdjustAmount(100);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                    adjustMode === "subtract"
                      ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/50 border border-red-400/60"
                      : "text-red-300/70 hover:text-red-200 hover:bg-red-500/10"
                  }`}
                >
                  <span>➖</span>
                  <span>Quitar (Restar)</span>
                </button>
              </div>

              {/* Tarjeta de Cálculo en Tiempo Real */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${
                adjustMode === "add"
                  ? "bg-emerald-950/30 border-emerald-500/30"
                  : "bg-red-950/30 border-red-500/30"
              }`}>
                <div className="flex flex-col">
                  <span className="text-[10px] text-amber-200/60 uppercase font-bold">Saldo Actual</span>
                  <span className="font-extrabold text-amber-300 text-sm">{currentCoins.toLocaleString()} 🪙</span>
                </div>

                <div className="text-center font-bold text-base">
                  {adjustMode === "add" ? (
                    <span className="text-emerald-400">+{absAmt.toLocaleString()}</span>
                  ) : (
                    <span className="text-red-400">-{deductedCoins.toLocaleString()}</span>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-amber-200/60 uppercase font-bold">Saldo Final</span>
                  <span className={`font-black text-sm ${adjustMode === "add" ? "text-emerald-300" : "text-amber-300"}`}>
                    {finalCoins.toLocaleString()} 🪙
                  </span>
                </div>
              </div>

              {/* Campo de Entrada Numérica */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-amber-300 uppercase block">
                  {adjustMode === "add" ? "Cantidad a Sumar" : "Cantidad a Quitar / Deducir"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400/80">
                    {adjustMode === "add" ? "➕" : "➖"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={adjustAmount === 0 ? "" : Math.abs(adjustAmount)}
                    onChange={(e) => setAdjustAmount(Math.abs(parseInt(e.target.value) || 0))}
                    className="w-full bg-black/60 border border-amber-500/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                    placeholder="Escribe la cantidad (ej: 500)"
                  />
                </div>
              </div>

              {/* Botones de Selección Rápida */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-200/60 uppercase block">Cantidades Rápidas:</span>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {(adjustMode === "add" ? [100, 500, 1000, 2000, 5000] : [100, 500, 1000, 2000]).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustAmount(amt)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition ${
                        adjustMode === "add"
                          ? "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30"
                          : "bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-500/30"
                      }`}
                    >
                      {adjustMode === "add" ? `+${amt}` : `-${amt}`}
                    </button>
                  ))}
                  {adjustMode === "subtract" && (
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(currentCoins)}
                      className="py-1.5 px-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                      title="Dejar saldo del usuario en 0 monedas"
                    >
                      Vaciar a 0
                    </button>
                  )}
                </div>
              </div>

              {/* Motivo o Razón Opcional */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-300/80 uppercase block">
                  Motivo / Nota Interna (Opcional):
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-amber-200/30"
                  placeholder={adjustMode === "add" ? "Ej: Recarga manual, Bono de cortesía..." : "Ej: Corrección de saldo, Penalización..."}
                />
              </div>

              {/* Botones de Guardar / Cancelar */}
              <div className="flex gap-2.5 pt-2 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2.5 bg-black/60 hover:bg-[#201108] text-amber-200/80 border border-amber-500/30 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCoinsAdjustment}
                  className={`flex-[1.5] py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    adjustMode === "add"
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-900/40"
                      : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-900/40"
                  }`}
                >
                  {adjustMode === "add" ? (
                    <>
                      <span>➕</span>
                      <span>Acreditar +{absAmt.toLocaleString()} Monedas</span>
                    </>
                  ) : (
                    <>
                      <span>➖</span>
                      <span>Quitar -{deductedCoins.toLocaleString()} Monedas</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL DE ZOOM DE COMPROBANTE */}
      {/* ========================================================================= */}
      {viewingReceipt && (() => {
        const fullUrl = getFullReceiptUrl(viewingReceipt);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingReceipt(null);
            }}
          >
            <div
              className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-5 max-w-2xl w-full text-white shadow-2xl relative flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-300">📄 Comprobante de Pago Móvil</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-500/30">
                    Imagen Oficial
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-all"
                    title="Abrir imagen original en nueva pestaña"
                  >
                    ↗ Abrir pestaña
                  </a>
                  <button
                    onClick={() => setViewingReceipt(null)}
                    className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 flex items-center justify-center text-sm font-bold transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="relative flex-1 w-full min-h-[320px] max-h-[65vh] bg-black/60 rounded-2xl overflow-auto border border-amber-500/20 p-2 flex items-center justify-center">
                {/* Usamos etiqueta <img> estándar para máxima compatibilidad con URLs externas de Railway */}
                <img
                  src={fullUrl}
                  alt="Comprobante Pago Móvil"
                  className="max-h-[60vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-xl"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.error-fallback')) {
                      const div = document.createElement('div');
                      div.className = 'error-fallback text-center p-6 text-amber-200/80';
                      div.innerHTML = `
                        <div class="text-3xl mb-2">⚠️</div>
                        <div class="font-bold text-sm text-amber-300 mb-1">No se pudo cargar la vista previa directa</div>
                        <div class="text-xs text-amber-200/60 mb-4 max-w-md break-all">${fullUrl}</div>
                        <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-amber-500 text-amber-950 font-bold text-xs rounded-xl inline-block hover:bg-amber-400">
                          ↗ Intentar abrir directamente en el navegador
                        </a>
                      `;
                      parent.appendChild(div);
                    }
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-500/20">
                <div className="text-[11px] text-amber-200/60 truncate max-w-xs font-mono">
                  {viewingReceipt}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(fullUrl, "receipt_url")}
                    className="px-3 py-1.5 bg-[#24140a] hover:bg-[#341d0f] text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    {copiedText === "receipt_url" ? "✓ ¡Link Copiado!" : "📋 Copiar Link"}
                  </button>
                  <button
                    onClick={() => setViewingReceipt(null)}
                    className="px-4 py-1.5 bg-amber-500 text-amber-950 font-bold text-xs rounded-xl hover:bg-amber-400 shadow-md"
                  >
                    Cerrar Visor
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL PARA CAMBIAR O RESETEAR CONTRASEÑA */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="text-xl">🔑</span>
              <h3 className="text-base font-bold">Resetear Contraseña</h3>
            </div>
            <p className="text-xs text-amber-200/70">
              Usuario: <span className="font-bold text-white">{resettingUser.username}</span> ({resettingUser.email})
            </p>

            <div>
              <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">
                Nueva Contraseña
              </label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const gen = "Pericon" + Math.floor(1000 + Math.random() * 9000) + "*";
                  setNewPasswordInput(gen);
                }}
                className="w-full py-1.5 bg-[#24140a] hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-all"
              >
                🎲 Generar Otra Clave
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setResettingUser(null)}
                disabled={resettingLoading}
                className="flex-1 py-2.5 bg-[#24140a] hover:bg-[#301b0f] text-amber-200/80 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetPassword}
                disabled={resettingLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black rounded-xl text-xs font-black transition-all"
              >
                {resettingLoading ? "Guardando..." : "Guardar Clave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ÉXITO CON BOTÓN DIRECTO DE WHATSAPP */}
      {/* ========================================================================= */}
      {resetSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#180e07] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
              ✓
            </div>
            <h3 className="text-base font-extrabold text-emerald-400">
              ¡Contraseña Restablecida!
            </h3>
            <div className="p-3 bg-[#24140a] rounded-xl border border-amber-500/30 text-left text-xs space-y-1">
              <p><span className="text-amber-300/70">Usuario:</span> <strong className="text-white">{resetSuccessModal.username}</strong></p>
              <p><span className="text-amber-300/70">Nueva clave:</span> <strong className="text-emerald-300 font-mono text-sm">{resetSuccessModal.password}</strong></p>
            </div>

            {resetSuccessModal.phone ? (
              <a
                href={`https://wa.me/${resetSuccessModal.phone.replace(/[^0-9]/g, "").replace(/^0/, "58")}?text=${encodeURIComponent(
                  `Hola ${resetSuccessModal.username}, tu contraseña de acceso a El Pericón ha sido restablecida con éxito.\n\n🔑 Tu nueva contraseña es: ${resetSuccessModal.password}\n\nPuedes ingresar ahora en: https://pericon.lat/iniciar-sesion`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg"
              >
                📱 Enviar Clave por WhatsApp
              </a>
            ) : (
              <p className="text-[11px] text-amber-200/60">
                El usuario no tiene WhatsApp registrado. Cópiale la clave para hacérsela llegar.
              </p>
            )}

            <button
              onClick={() => setResetSuccessModal(null)}
              className="w-full py-2 bg-[#24140a] hover:bg-[#301b0f] text-amber-200/80 rounded-xl text-xs font-bold transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR GASTO / COMPRA DE USDT */}
      {isExpenseModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsExpenseModalOpen(false)}
        >
          <div
            className="bg-gradient-to-b from-[#1c0f07] to-[#120803] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-white shadow-2xl relative flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-amber-500/20 pb-3">
              <div>
                <h2 className={`${fonts.bowlbyOneSC.className} text-lg text-amber-400`}>
                  Registrar Movimiento de Caja
                </h2>
                <p className="text-xs text-amber-200/70 mt-0.5">
                  Ingresa gastos operativos o compras de USDT para actualizar el balance en tiempo real.
                </p>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Selector de Tipo */}
            <div className="grid grid-cols-3 gap-2 bg-[#120803] p-1 rounded-2xl border border-amber-500/30">
              <button
                type="button"
                onClick={() => {
                  setExpenseFormType("BS");
                  if (expenseFormCategory.includes("Compra")) setExpenseFormCategory("Servidor / Infraestructura");
                }}
                className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  expenseFormType === "BS" ? "bg-amber-500 text-amber-950 shadow" : "text-amber-200/70 hover:text-white"
                }`}
              >
                <span>🇻🇪 Gasto en Bs.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpenseFormType("USDT");
                  if (expenseFormCategory.includes("Compra")) setExpenseFormCategory("Servidor / Infraestructura");
                }}
                className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  expenseFormType === "USDT" ? "bg-cyan-500 text-cyan-950 shadow" : "text-amber-200/70 hover:text-white"
                }`}
              >
                <span>💵 Gasto en USDT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpenseFormType("COMPRA_USDT");
                  setExpenseFormCategory("Compra USDT");
                }}
                className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  expenseFormType === "COMPRA_USDT" ? "bg-emerald-500 text-emerald-950 shadow" : "text-amber-200/70 hover:text-white"
                }`}
              >
                <span>🔄 Compra USDT</span>
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  {expenseFormType === "COMPRA_USDT" ? "Concepto / Proveedor" : "Descripción o Concepto"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    expenseFormType === "COMPRA_USDT"
                      ? "Ej. Compra 50 USDT en Binance P2P"
                      : expenseFormType === "BS"
                      ? "Ej. Pago mensual VPS / Soporte técnico / Mejoras de código"
                      : "Ej. Pago API OpenAI / Servidor internacional en USDT"
                  }
                  value={expenseFormDescription}
                  onChange={(e) => setExpenseFormDescription(e.target.value)}
                  className="w-full bg-[#120803] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Categoría (solo si no es compra usdt) */}
              {expenseFormType !== "COMPRA_USDT" && (
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={expenseFormCategory}
                    onChange={(e) => setExpenseFormCategory(e.target.value)}
                    className="w-full bg-[#120803] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Servidor / Infraestructura">Servidor / Infraestructura (Hosting, Dominio)</option>
                    <option value="Desarrollo & Mejoras">Desarrollo & Mejoras de la App</option>
                    <option value="Marketing & Publicidad">Marketing & Publicidad (Redes, Promociones)</option>
                    <option value="Nómina / Administrativo">Nómina / Sueldos / Administrativo</option>
                    <option value="Comisiones Bancarias">Comisiones Bancarias / Pasarelas</option>
                    <option value="Varios / Otros">Varios / Otros Gastos</option>
                  </select>
                </div>
              )}

              {/* Campos de Montos según tipo */}
              {expenseFormType === "COMPRA_USDT" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-950/30 p-3 rounded-2xl border border-amber-500/30">
                  <div>
                    <label className="block text-[11px] font-black text-amber-300 mb-1">
                      Bolívares Pagados (Sale de Caja Bs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="Ej. 5000"
                      value={expenseFormAmount}
                      onChange={(e) => setExpenseFormAmount(e.target.value)}
                      className="w-full bg-[#120803] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-cyan-300 mb-1">
                      USDT Recibidos (Entra a Caja USDT)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="Ej. 50"
                      value={expenseFormUsdtReceived}
                      onChange={(e) => setExpenseFormUsdtReceived(e.target.value)}
                      className="w-full bg-[#120803] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-cyan-200/40 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Cálculo en vivo de tasa */}
                  {parseFloat(expenseFormAmount) > 0 && parseFloat(expenseFormUsdtReceived) > 0 && (
                    <div className="sm:col-span-2 text-center text-xs font-black text-emerald-400 bg-emerald-950/50 py-1.5 px-3 rounded-xl border border-emerald-500/30">
                      Tasa implícita calculada: Bs. {(parseFloat(expenseFormAmount) / parseFloat(expenseFormUsdtReceived)).toFixed(2)} por cada USDT
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    Monto a Deducir ({expenseFormType === "BS" ? "Bolívares Bs." : "Dólares USDT"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder={expenseFormType === "BS" ? "Ej. 1200.50" : "Ej. 25.00"}
                    value={expenseFormAmount}
                    onChange={(e) => setExpenseFormAmount(e.target.value)}
                    className="w-full bg-[#120803] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Notas adicionales */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Notas Adicionales (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Factura #0921, comprobante en WhatsApp, etc."
                  value={expenseFormNotes}
                  onChange={(e) => setExpenseFormNotes(e.target.value)}
                  className="w-full bg-[#120803] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-transparent hover:bg-white/5 text-amber-200/70 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingExpense}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2"
                >
                  {loadingExpense ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Guardar en Caja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
