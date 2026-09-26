"use client";

import React, { useState, useEffect, useMemo } from "react";
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

type TabType = "dashboard" | "users" | "whatsapp" | "broadcast" | "recharges" | "withdrawals" | "matches" | "reports" | "promos" | "errors";

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

  // Filtros de estado
  const [rechargeStatusFilter, setRechargeStatusFilter] = useState<string>("PENDIENTE");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("PENDIENTE");
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
  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
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
  const [whatsappTemplate, setWhatsappTemplate] = useState<"torneo" | "novedades" | "promo" | "libre">("torneo");
  const [customWaMessage, setCustomWaMessage] = useState("");

  // Formulario de Creación de Cupón
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoCoins, setNewPromoCoins] = useState(200);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(1000);
  const [creatingPromo, setCreatingPromo] = useState(false);

  // Modales
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<UserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<UserRow | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [resettingLoading, setResettingLoading] = useState<boolean>(false);
  const [resetSuccessModal, setResetSuccessModal] = useState<{ username: string; password: string; phone?: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
  const [adminToken, setAdminToken] = useState<string>("");

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
      const [resStats, resRecharges, resWithdrawals, resUsers, resMatches, resPromos, resAnnounce] = await Promise.all([
        adminFetch(`${apiUrl}/api/admin/stats`),
        adminFetch(`${apiUrl}/api/admin/recharges?status=${rechargeStatusFilter}`),
        adminFetch(`${apiUrl}/api/admin/withdrawals?status=${withdrawalStatusFilter}`),
        adminFetch(`${apiUrl}/api/admin/users`),
        adminFetch(`${apiUrl}/api/admin/matches`),
        adminFetch(`${apiUrl}/api/admin/promos`),
        adminFetch(`${apiUrl}/api/admin/announcements`),
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resRecharges.ok) setRecharges(await resRecharges.json());
      if (resWithdrawals.ok) setWithdrawals(await resWithdrawals.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resMatches.ok) setMatches(await resMatches.json());
      if (resPromos.ok) setPromos(await resPromos.json());
      if (resAnnounce.ok) setAnnouncements(await resAnnounce.json());
      await fetchErrorLogs();
    } catch (err) {
      console.error("Error loading admin data:", err);
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
      ["Total Ingresos por Recargas (Bs.)", `Bs. ${financialSummary.totalDeposits.toLocaleString()}`],
      ["Total Pagos por Retiros (Bs.)", `Bs. ${financialSummary.totalWithdrawalsPaid.toLocaleString()}`],
      ["Balance Neto en Caja (Bs.)", `Bs. ${financialSummary.netBsBalance.toLocaleString()}`],
      ["Comisión de Sala Acumulada (Monedas)", `🪙 ${financialSummary.totalCommissions.toLocaleString()}`],
      ["Monedas en Manos de Jugadores", `🪙 ${financialSummary.totalCoinsInUsers.toLocaleString()}`],
      ["Volumen Total Apostado en Duelos", `🪙 ${financialSummary.totalWagered.toLocaleString()}`],
      ["Total Partidas Registradas", String(financialSummary.totalMatches)],
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
      const res = await adminFetch(`${apiUrl}/api/admin/announcement/${id}/toggle`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`📢 ${data.message}`);
        loadAnnouncements();
      } else {
        alert(data.message || "Error al cambiar estado del comunicado.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
    }
  };

  // Eliminar Comunicado
  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("¿Deseas eliminar este comunicado permanentemente?")) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/announcement/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`🗑️ ${data.message}`);
        loadAnnouncements();
      } else {
        alert(data.message || "Error al eliminar comunicado.");
      }
    } catch {
      alert("Error al conectar con el servidor.");
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
  }, [isAuthenticated, rechargeStatusFilter, withdrawalStatusFilter]);

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

  // AJUSTAR MONEDAS
  const handleSaveCoinsAdjustment = async () => {
    if (!adjustingUser) return;
    try {
      const res = await adminFetch(`${apiUrl}/api/admin/user/${adjustingUser.id}/adjust-coins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: adjustAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`);
        setAdjustingUser(null);
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
        setActionMessage(`✅ ${data.message}`);
        loadData();
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

  // Cálculos para reportes financieros
  const financialSummary = useMemo(() => {
    const totalDeposits = recharges.filter((r) => r.status === "APROBADO").reduce((sum, r) => sum + r.amountBs, 0);
    const totalWithdrawalsPaid = withdrawals.filter((w) => w.status === "PAGADO").reduce((sum, w) => sum + w.amountBs, 0);
    const netBsBalance = totalDeposits - totalWithdrawalsPaid;

    const totalCoinsInUsers = users.reduce((sum, u) => sum + u.coins, 0);
    const totalCommissions = matches.reduce((sum, m) => sum + m.houseCommission, 0);
    const totalWagered = matches.reduce((sum, m) => sum + m.totalPot, 0);

    return {
      totalDeposits,
      totalWithdrawalsPaid,
      netBsBalance,
      totalCoinsInUsers,
      totalCommissions,
      totalWagered,
      totalMatches: matches.length,
    };
  }, [recharges, withdrawals, users, matches]);

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
      {/* BARRA VERTICAL IZQUIERDA (SIDEBAR) */}
      {/* ========================================================================= */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#160c06] border-b md:border-b-0 md:border-r border-amber-500/30 flex flex-col flex-shrink-0 z-30">
        {/* Encabezado Sidebar */}
        <div className="p-5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand.svg" width={130} height={40} alt="El Pericón" priority />
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-amber-500/10 text-amber-400"
          >
            ☰
          </button>
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

        {/* Menú de Navegación Vertical */}
        <nav className={`flex-1 px-3 space-y-1 py-2 ${mobileMenuOpen ? "block" : "hidden md:block"}`}>
          {/* 1. Dashboard */}
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setMobileMenuOpen(false);
            }}
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
            onClick={() => {
              setActiveTab("users");
              setMobileMenuOpen(false);
            }}
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

          {/* 3. Directorio de WhatsApp (NUEVO) */}
          <button
            onClick={() => {
              setActiveTab("whatsapp");
              setMobileMenuOpen(false);
            }}
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

          {/* 4. Avisos y Comunicados a Usuarios (NUEVO) */}
          <button
            onClick={() => {
              setActiveTab("broadcast");
              setMobileMenuOpen(false);
            }}
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
            onClick={() => {
              setActiveTab("recharges");
              setMobileMenuOpen(false);
            }}
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

          {/* 4. Retiros */}
          <button
            onClick={() => {
              setActiveTab("withdrawals");
              setMobileMenuOpen(false);
            }}
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

          {/* 5. Partidas */}
          <button
            onClick={() => {
              setActiveTab("matches");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "matches"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🃏</span>
              <span>Partidas y Apuestas</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-400/30">
              {matches.length}
            </span>
          </button>

          {/* 6. Reportes */}
          <button
            onClick={() => {
              setActiveTab("reports");
              setMobileMenuOpen(false);
            }}
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

          {/* 7. Cupones Promocionales */}
          <button
            onClick={() => {
              setActiveTab("promos");
              setMobileMenuOpen(false);
            }}
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

          {/* 8. Errores e Incidencias (Telemetría en Vivo) */}
          <button
            onClick={() => {
              setActiveTab("errors");
              setMobileMenuOpen(false);
            }}
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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl">
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
            <div>
              <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                Panel de Control General
              </h1>
              <p className="text-xs text-amber-200/60 mt-0.5">
                Resumen de actividad, transacciones y usuarios en El Pericón.
              </p>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className={`text-2xl font-black ${stats?.pendingRecharges ? "text-red-400" : "text-white"}`}>
                  {stats?.pendingRecharges ?? 0}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  Bs. {(stats?.totalBsApproved ?? 0).toLocaleString()} aprobados
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Retiros Pendientes</span>
                  <span className="text-xl">📤</span>
                </div>
                <div className={`text-2xl font-black ${stats?.pendingWithdrawals ? "text-amber-400" : "text-white"}`}>
                  {stats?.pendingWithdrawals ?? 0}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  Bs. {(stats?.totalBsWithdrawn ?? 0).toLocaleString()} pagados
                </div>
              </div>

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Comisión de la Casa</span>
                  <span className="text-xl">🪙</span>
                </div>
                <div className="text-2xl font-black text-amber-300">
                  {(stats?.totalHouseCommissions ?? financialSummary.totalCommissions).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200/60 mt-1">
                  En {matches.length} partidas finalizadas
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
                <table className="w-full text-left text-xs">
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
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-amber-500/5 transition-colors ${
                              !u.isActive ? "bg-red-950/20" : ""
                            }`}
                          >
                            <td className="p-3.5 font-mono text-amber-200/50">#{u.id}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {u.username}
                                {isGuardian && <span className="text-xs" title="Administrador Principal">🛡️</span>}
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
                <table className="w-full text-left text-xs">
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
                  <table className="w-full text-left text-xs">
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
                  {["PENDIENTE", "APROBADO", "RECHAZADO", "ALL"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setRechargeStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        rechargeStatusFilter === st
                          ? "bg-amber-500 text-amber-950"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      {st === "ALL" ? "Todas" : st}
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

            {/* Tabla de Recargas */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                    {recharges.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-amber-200/40">
                          No hay solicitudes de recarga en esta categoría.
                        </td>
                      </tr>
                    ) : (
                      recharges.map((r) => (
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
                            ) : (
                              <span className="text-amber-200/30 text-[11px]">Completada</span>
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
                  {["PENDIENTE", "PAGADO", "RECHAZADO", "ALL"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setWithdrawalStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        withdrawalStatusFilter === st
                          ? "bg-amber-500 text-amber-950"
                          : "text-amber-200/60 hover:text-white"
                      }`}
                    >
                      {st === "ALL" ? "Todas" : st}
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

            {/* Tabla de Retiros */}
            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-amber-200/40">
                          No hay solicitudes de retiro en esta categoría.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
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
                            ) : (
                              <span className="text-amber-200/30 text-[11px]">Procesado</span>
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
        {/* PESTAÑA 5: PARTIDAS Y AUDITORÍA */}
        {/* ========================================================================= */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`${fonts.bowlbyOneSC.className} text-xl md:text-2xl text-amber-400 tracking-wide`}>
                  Auditoría de Partidas y Apuestas
                </h1>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Historial de duelos, pozos apostados y comisiones de sala retenidas.
                </p>
              </div>

              <button
                onClick={exportMatchesCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow self-start md:self-auto"
                title="Exportar partidas a archivo CSV/Excel"
              >
                <span>📥</span>
                <span>Exportar Excel</span>
              </button>
            </div>

            <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                    {matches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-amber-200/40">
                          No hay registros de partidas finalizadas con apuesta aún.
                        </td>
                      </tr>
                    ) : (
                      matches.map((m) => {
                        const isSalaMatch = m.houseCommission === m.totalPot || m.endReason?.includes("[SALA") || (m.winnerPrize === 0 && m.totalPot > 0);
                        return (
                          <tr key={m.id} className="hover:bg-amber-500/5 transition-colors">
                            <td className="p-3.5 font-mono text-amber-200/50">#{m.id}</td>
                            <td className="p-3.5">
                              <span className="font-bold text-white">{m.playerOneName}</span> vs{" "}
                              <span className="font-bold text-white">{m.playerTwoName}</span>
                            </td>
                            <td className="p-3.5 font-semibold text-amber-200">🪙 {m.betPerPlayer}</td>
                            <td className="p-3.5 font-black text-amber-300">🪙 {m.totalPot}</td>
                            <td className="p-3.5 font-bold">
                              {isSalaMatch ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-emerald-400 font-black text-sm">+🪙 {m.houseCommission}</span>
                                  <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                                    100% Sala
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-green-400 font-bold">+🪙 {m.houseCommission}</span>
                                  <span className="text-[10px] text-green-300/70 font-semibold">20% Duelo</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                🏆 {m.winnerUsername}
                              </span>
                              {isSalaMatch && (
                                <span className="block text-[10px] text-amber-200/60 font-semibold">Tarifa Abonada a Casa</span>
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

            {/* Cuadrícula de Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Entradas */}
              <div className="bg-[#180e07] border border-green-500/40 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-green-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ingresos por Recargas</span>
                  <span className="text-xl">📈</span>
                </div>
                <div className="text-2xl font-black text-white">
                  Bs. {financialSummary.totalDeposits.toLocaleString()}
                </div>
                <p className="text-[11px] text-green-300/70 mt-1">
                  Total depositado por jugadores en Pago Móvil
                </p>
              </div>

              {/* Salidas */}
              <div className="bg-[#180e07] border border-red-500/40 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-red-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pagos por Retiros</span>
                  <span className="text-xl">📉</span>
                </div>
                <div className="text-2xl font-black text-white">
                  Bs. {financialSummary.totalWithdrawalsPaid.toLocaleString()}
                </div>
                <p className="text-[11px] text-red-300/70 mt-1">
                  Total transferido a jugadores ganadores
                </p>
              </div>

              {/* Balance Neto */}
              <div className="bg-[#180e07] border border-amber-500/50 rounded-2xl p-5 shadow-lg">
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
                  Saldo neto restante (Depósitos - Retiros)
                </p>
              </div>
            </div>

            {/* Métricas de Monedas y Casa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Comisión de Sala Acumulada
                </div>
                <div className="text-2xl font-black text-amber-400">
                  🪙 {financialSummary.totalCommissions.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  100% en salas privadas y 20% en duelos de matchmaking
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

              <div className="bg-[#180e07] border border-amber-500/30 rounded-2xl p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Volumen Total Apostado
                </div>
                <div className="text-2xl font-black text-white">
                  🪙 {financialSummary.totalWagered.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-200/60 mt-1">
                  Monedas apostadas en {financialSummary.totalMatches} partidas
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
                <table className="w-full text-left text-xs">
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
                <table className="w-full text-left text-xs">
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
      {/* MODAL DE AJUSTE DE MONEDAS */}
      {/* ========================================================================= */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 mb-1">Ajustar Saldo de Monedas</h3>
            <p className="text-xs text-amber-200/70 mb-4">
              Usuario: <span className="font-bold text-white">{adjustingUser.username}</span> (Saldo actual:{" "}
              <span className="font-bold text-amber-300">{adjustingUser.coins.toLocaleString()}</span>)
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">
                  Cantidad a Sumar o Restar
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#24140a] border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Ej: 500 o -200"
                />
              </div>

              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustAmount(amt)}
                    className="flex-1 py-1.5 bg-[#24140a] hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAdjustingUser(null)}
                className="flex-1 py-2.5 bg-[#24140a] hover:bg-[#301b0f] text-amber-200/80 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCoinsAdjustment}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-xs font-black transition-all"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ZOOM DE COMPROBANTE */}
      {/* ========================================================================= */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div
            className="bg-[#180e07] border-2 border-amber-500/60 rounded-3xl p-4 max-w-lg w-full text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-300">Comprobante de Pago Móvil</span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-amber-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full h-96 bg-black/40 rounded-2xl overflow-hidden border border-amber-500/20">
              <Image
                src={viewingReceipt}
                alt="Comprobante"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 bg-amber-500 text-amber-950 font-bold text-xs rounded-xl hover:bg-amber-400"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

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
