"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

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
  const [botDailyBreakdown, setBotDailyBreakdown] = useState<BotDailyRow[]>([]);
  const [botSearch, setBotSearch] = useState("");
  const [botResultFilter, setBotResultFilter] = useState<"all" | "user_won" | "bot_won">("all");
  const [botDifficultyMode, setBotDifficultyMode] = useState<"facil" | "medio" | "dificil">("medio");
  const [botDifficultyLoading, setBotDifficultyLoading] = useState(false);
  const [virtualBots, setVirtualBots] = useState<VirtualBotItem[]>([]);
  const [updatingBotId, setUpdatingBotId] = useState<number | null>(null);
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

  const getAdminHeaders = (extraHeaders: Record<string, string> = {}) => {
    const t = adminToken || (typeof window !== "undefined" ? sessionStorage.getItem("guardian_admin_token") : "") || "Guardian_SecKey_2026_Pericon$AdminToken!X9#Venezuela";
    return {
      "X-Admin-Token": t,
      ...extraHeaders,
    };
  };

  const adminFetch = (url: string, init: RequestInit = {}) => {
    const headers = getAdminHeaders((init.headers as Record<string, string>) || {});
    return fetch(url, {
      ...init,
      headers,
    });
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
            housePercent: mode === "facil" ? 40 : mode === "dificil" ? 65 : 50,
            userPercent: mode === "facil" ? 60 : mode === "dificil" ? 35 : 50,
          }
        } : prev);
        Swal.fire({
          icon: "success",
          title: "Dificultad Actualizada",
          text: `El bot ahora está en Modo ${mode.toUpperCase()} (${mode === "facil" ? "40% Casa / 60% Jugador - El jugador gana con mayor frecuencia" : mode === "dificil" ? "65% Casa / 35% Jugador - Mayor dificultad para la casa" : "50% Casa / 50% Jugador - Balance equitativo"}).`,
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

  // Verificar sesión existente en sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("guardian_session_auth");
      const token = sessionStorage.getItem("guardian_admin_token");
      if (auth === "true") {
        setIsAuthenticated(true);
        if (token) setAdminToken(token);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (cleanUser !== "Guardian") {
      setAuthError("Acceso denegado. Este panel es exclusivo para el usuario Guardian.");
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
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("guardian_session_auth", "true");
          if (data.token) {
            sessionStorage.setItem("guardian_admin_token", data.token);
            setAdminToken(data.token);
          }
        }
        return;
      }

      // Fallback directo si las credenciales coinciden exactamente
      if (cleanUser === "Guardian" && cleanPass === "Guardian.2026") {
        setIsAuthenticated(true);
        const fallbackToken = "Guardian_SecKey_2026_Pericon$AdminToken!X9#Venezuela";
        setAdminToken(fallbackToken);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("guardian_session_auth", "true");
          sessionStorage.setItem("guardian_admin_token", fallbackToken);
        }
        return;
      }

      setAuthError(data.message || "Contraseña de administrador incorrecta.");
    } catch {
      if (cleanUser === "Guardian" && cleanPass === "Guardian.2026") {
        setIsAuthenticated(true);
        const fallbackToken = "Guardian_SecKey_2026_Pericon$AdminToken!X9#Venezuela";
        setAdminToken(fallbackToken);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("guardian_session_auth", "true");
          sessionStorage.setItem("guardian_admin_token", fallbackToken);
        }
      } else {
        setAuthError("Error al conectar con el servidor. Verifica las credenciales.");
      }
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
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resRecharges, resWithdrawals, resUsers, resMatches, resPromos, resAnnounce, resBot, resFeedbacks] = await Promise.all([
        adminFetch(`${apiUrl}/api/admin/stats`),
        adminFetch(`${apiUrl}/api/admin/recharges?status=ALL`),
        adminFetch(`${apiUrl}/api/admin/withdrawals?status=ALL`),
        adminFetch(`${apiUrl}/api/admin/users`),
        adminFetch(`${apiUrl}/api/admin/matches?period=${matchPeriodFilter}`),
        adminFetch(`${apiUrl}/api/admin/promos`),
        adminFetch(`${apiUrl}/api/admin/announcements`),
        adminFetch(`${apiUrl}/api/admin/bot-matches`),
        adminFetch(`${apiUrl}/api/admin/feedbacks`),
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
      if (resBot.ok) {
        const botData = await resBot.json();
        setBotMatches(botData.matches || []);
        if (botData.summary) setBotSummary(botData.summary);
        if (botData.todaySummary) setBotTodaySummary(botData.todaySummary);
        if (botData.dailyBreakdown) setBotDailyBreakdown(botData.dailyBreakdown);
      }
      await fetchErrorLogs();
      await fetchBotDifficulty();
      await fetchVirtualBots();
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterMatchesPeriod = async (p: "dia" | "semana" | "mes" | "todo") => {
    setMatchPeriodFilter(p);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/matches?period=${p}`);
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

  const loadBotMatches = async (searchQuery: string = botSearch, filterType: string = botResultFilter) => {
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/bot-matches?search=${encodeURIComponent(searchQuery)}&filter=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setBotMatches(data.matches || []);
        if (data.summary) setBotSummary(data.summary);
        if (data.todaySummary) setBotTodaySummary(data.todaySummary);
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

  // Reiniciar Temporada: 300 Monedas de Cortesía, Ranking en 0 y Victorias en 0
  const handleResetSeasonStats = async () => {
    if (!window.confirm("⚠️ ¿Estás completamente seguro de reiniciar a TODOS los usuarios a 300 monedas de cortesía y poner ranking y victorias en CERO?\n\nEsta acción iniciará oficialmente la era de Dinero Real y publicará el comunicado global.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/reset-season-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins: 300, clearMatchHistory: false }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setActionMessage(`🔄 ${data.message}`);
        loadData();
        loadAnnouncements();
      } else {
        alert(data.message || "Error al reiniciar temporada.");
      }
    } catch {
      alert("Error de conexión al servidor al reiniciar temporada.");
    } finally {
      setLoading(false);
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
    setActionMessage(null);
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

  // APROBAR RETIRO
  const handleApproveWithdrawal = async (w: WithdrawalRow) => {
    const ref = window.prompt(
      `Vas a transferir Bs. ${w.amountBs.toLocaleString()} al Pago Móvil de ${w.username}:\n\nBanco: ${w.bankName}\nTel: ${w.phoneNumber}\nCédula: ${w.idCard}\n\nIngresa el N° de Referencia del Pago Móvil que realizaste:`,
      ""
    );
    if (ref === null) return;
    if (!ref.trim()) {
      alert("Debes ingresar el número de referencia del pago realizado.");
      return;
    }

    setActionMessage(null);
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/withdrawal/${w.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ Retiro #${w.id} marcado como PAGADO exitosamente. Referencia: ${ref.trim()}`);
        loadData();
        const updatedW: WithdrawalRow = { ...w, adminReference: ref.trim(), status: "PAGADO" };
        const waUrl = getWithdrawalPaidWhatsAppLink(updatedW);
        if (waUrl && waUrl !== "#" && window.confirm("¿Deseas abrir WhatsApp para enviar el comprobante de pago al jugador?")) {
          window.open(waUrl, "_blank");
        }
      } else {
        setActionMessage(`❌ Error: ${data.message}`);
      }
    } catch {
      setActionMessage("Error de conexión al procesar el retiro.");
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

  // Partidas contra el Bot filtradas y buscadas
  const filteredBotMatches = useMemo(() => {
    return botMatches.filter((m) => {
      const q = botSearch.toLowerCase().trim();
      const matchSearch = !q || m.username.toLowerCase().includes(q) || m.botName.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (botResultFilter === "user_won") return m.userWon;
      if (botResultFilter === "bot_won") return !m.userWon;
      return true;
    });
  }, [botMatches, botSearch, botResultFilter]);

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
    };
  }, [recharges, withdrawals, users, matches, botMatches, stats]);

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
            Panel de Control Guardian
          </div>

          <p className="text-xs text-amber-200/70 mb-6">
            Acceso restringido exclusivamente para el Administrador del Sistema.
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="text-left">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                Usuario Administrador
              </label>
              <input
                type="text"
                placeholder="Guardian"
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
              {authLoading ? "Verificando Credenciales..." : "Entrar como Guardian"}
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
                    {botDifficultyMode === 'facil' && "🟢 Modo Fácil: 50% Casa / 50% Jugador. El usuario gana ~5 de cada 10 partidas. Calibrado para fluidez de jugadores."}
                    {botDifficultyMode === 'medio' && "🟡 Modo Medio: 55% Casa / 45% Jugador. Ventaja gradual y balanceada con antirachas (máx 2 victorias del bot seguidas)."}
                    {botDifficultyMode === 'dificil' && "🔴 Modo Difícil: 62% Casa / 38% Jugador. Mayor ventaja para la casa con antirachas activas."}
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
                  title="40% Casa / 60% Jugador - Permite ganar más seguido a los usuarios (atracción de clientes)"
                >
                  <span>🟢</span>
                  <span>Fácil (60% Jugador)</span>
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
                  title="50% Casa / 50% Jugador - Balance equitativo"
                >
                  <span>🟡</span>
                  <span>Medio (50%)</span>
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
                  title="65% Casa / 35% Jugador - Mayor dificultad"
                >
                  <span>🔴</span>
                  <span>Difícil (65%)</span>
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

                <button
                  onClick={handleResetSeasonStats}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-extrabold text-xs transition shadow-lg border border-yellow-300 active:scale-95"
                  title="Reiniciar monedas a 300 de cortesía y ranking a cero para todos los usuarios (Inicio de Dinero Real)"
                >
                  <span>🔄</span>
                  <span>Reiniciar Temporada (300 Monedas)</span>
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
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-amber-200/40">
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
                    Filtra por día, semana o mes para saber qué días juegan más los usuarios y planificar promociones.
                  </p>
                </div>

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
                    {botDifficultyMode === 'facil' && "🟢 Modo Fácil: 50% Casa / 50% Jugador. El usuario gana ~5 de cada 10 partidas. Fluidez para nuevos jugadores."}
                    {botDifficultyMode === 'medio' && "🟡 Modo Medio: 60% Casa / 40% Jugador. Objetivo diario 60-40, equilibrio financiero y control antirachas estricto."}
                    {botDifficultyMode === 'dificil' && "🔴 Modo Difícil: 65% Casa / 35% Jugador. Mayor ventaja para la casa con protección antirachas activa."}
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
                  title="40% Casa / 60% Jugador - Permite ganar más seguido a los usuarios (atracción de clientes)"
                >
                  <span>🟢</span>
                  <span>Fácil (60% Jugador)</span>
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
                  title="50% Casa / 50% Jugador - Balance equitativo"
                >
                  <span>🟡</span>
                  <span>Medio (50%)</span>
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
                  title="65% Casa / 35% Jugador - Mayor dificultad"
                >
                  <span>🔴</span>
                  <span>Difícil (65%)</span>
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
                      Personajes autónomos que entran a jugar 1vs1 si un usuario espera entre 30 y 40 segundos sin encontrar rival humano. Poseen perfil real y aparecen en el ranking.
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
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-black text-white truncate">{bot.username}</h3>
                                <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
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

            {/* Rendimiento de Hoy (Operación Diaria - Reinicia a Medianoche) */}
            <div className="bg-[#180e07] border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <div>
                    <h2 className="text-sm font-black text-amber-300">
                      Rendimiento de Hoy ({botTodaySummary?.date || "Hoy"}) · Operación Diaria (Meta 60/40)
                    </h2>
                    <p className="text-[11px] text-amber-200/70">
                      El contador inicia en CERO a las 00:00 (Hora Venezuela) cada día. El bot calibra dinámicamente sus manos para ganar ~60% de partidas y ~60% de dinero.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black self-start sm:self-auto">
                  Objetivo: 60% Bot / 40% Jugador
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Partidas vs Bot Hoy</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {botTodaySummary?.totalMatches ?? 0}
                  </div>
                  <span className="text-[11px] text-amber-200/50 block mt-0.5">
                    🪙 {(botTodaySummary?.totalCoinsWagered ?? 0).toLocaleString()} apostadas hoy
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Victorias Jugadores Hoy</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {botTodaySummary?.userWins ?? 0} <span className="text-xs font-bold text-emerald-300/80">({botTodaySummary?.userWinRate ?? 0}%)</span>
                  </div>
                  <span className="text-[11px] text-emerald-300/60 block mt-0.5">
                    Meta ~40% · 🪙 {(botTodaySummary?.coinsWonByUser ?? 0).toLocaleString()} pagadas
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Victorias Bot Hoy</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {botTodaySummary?.botWins ?? 0} <span className="text-xs font-bold text-amber-300/80">({botTodaySummary?.botWinRate ?? 0}%)</span>
                  </div>
                  <span className="text-[11px] text-amber-300/60 block mt-0.5">
                    Meta ~60% · 🪙 {(botTodaySummary?.coinsWonByHouse ?? 0).toLocaleString()} retenidas
                  </span>
                </div>

                <div className="bg-[#24140a] border border-amber-500/20 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-200/60 block uppercase font-bold">Balance Neto Casa Hoy</span>
                  <div className={`text-2xl font-black mt-1 ${(botTodaySummary?.netHouseProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    🪙 {(botTodaySummary?.netHouseProfit ?? 0) >= 0 ? "+" : ""}{(botTodaySummary?.netHouseProfit ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-amber-200/50 block mt-0.5">
                    {(botTodaySummary?.netHouseProfit ?? 0) >= 0 ? "Superávit diario en caja" : "Usuarios arriba hoy"}
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
                    Registro de partidas jugadas, efectividad y ganancia en monedas día por día (Hora de Venezuela).
                  </p>
                </div>
                <span className="text-xs text-amber-200/60 font-semibold self-start sm:self-auto">
                  {botDailyBreakdown.length} días registrados
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-amber-500/20">
                <table className="w-full text-left text-xs min-w-[720px]">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {botDailyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-6 text-amber-200/40">
                          No hay historial diario previo registrado.
                        </td>
                      </tr>
                    ) : (
                      botDailyBreakdown.map((d) => (
                        <tr key={d.date} className="hover:bg-amber-500/5 transition">
                          <td className="p-3 font-mono font-bold text-amber-200">{d.date}</td>
                          <td className="p-3 text-center font-bold text-white">{d.totalMatches}</td>
                          <td className="p-3 text-center text-amber-400 font-bold">{d.botWins}</td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{d.userWins}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                              d.botWinRate >= 58 && d.botWinRate <= 65
                                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                                : d.botWinRate > 65
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            }`}>
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
                        </tr>
                      ))
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
                  Todas ({botMatches.length})
                </button>
                <button
                  onClick={() => setBotResultFilter("user_won")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    botResultFilter === "user_won" ? "bg-emerald-500 text-emerald-950 font-black" : "text-emerald-300/60 hover:text-white"
                  }`}
                >
                  🏆 Ganó Usuario ({botSummary.userWinsCount})
                </button>
                <button
                  onClick={() => setBotResultFilter("bot_won")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    botResultFilter === "bot_won" ? "bg-red-500 text-white font-black" : "text-red-300/60 hover:text-white"
                  }`}
                >
                  🤖 Ganó Bot ({botSummary.botWinsCount})
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Reportes Financieros y Balances
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Flujo neto de caja en Bolívares y volumen de monedas en la plataforma.
                </p>
              </div>

              <button
                onClick={exportFinancialReportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow self-start md:self-auto"
                title="Descargar reporte financiero en formato CSV/Excel"
              >
                <span>📥</span>
                <span>Exportar Balance Excel</span>
              </button>
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

            {/* Cuadrícula de Balances en Bolívares */}
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

              {/* Balance Neto en Caja */}
              <div className="bg-[#180e07] border border-amber-500/50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Balance Neto en Caja</span>
                  <span className="text-xl">🏦</span>
                </div>
                <div
                  className={`text-2xl font-black ${
                    financialSummary.netBsBalance >= 0 ? "text-amber-300" : "text-red-400"
                  }`}
                >
                  Bs. {financialSummary.netBsBalance.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/70 mt-1">
                  Caja confirmada (Aprobadas - Pagados). Con pendientes: Bs. {financialSummary.netBsBalanceWithPending.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Métricas de Monedas y Casa */}
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
    </div>
  );
}
