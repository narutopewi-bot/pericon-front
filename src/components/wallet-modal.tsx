"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import * as fonts from "@/components/fonts";
import { useDispatch, useSelector } from "react-redux";
import { setGamePlayer } from "@/store/slices/gameplayerSlice";
import { RootState } from "@/store/store";
import { playCoinWinSound } from "@/lib/soundEffects";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  coins?: number;
}

interface RechargeItem {
  id: number;
  amountBs: number;
  coinsAmount: number;
  reference: string;
  receiptImageUrl: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

interface WithdrawalItem {
  id: number;
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

const VENEZUELAN_BANKS = [
  "0191 - BNC (Banco Nacional de Crédito)",
  "0102 - Banco de Venezuela",
  "0134 - Banesco",
  "0108 - Banco Provincial (BBVA)",
  "0105 - Banco Mercantil",
  "0114 - Bancamiga",
  "0163 - Banco del Tesoro",
  "0172 - Bancaribe",
  "0175 - Banco Bicentenario",
  "0115 - Banco Exterior",
  "0128 - Banco Caroní",
  "0174 - Banplus",
  "0177 - BANFANB",
  "0168 - Bancrecer",
  "0169 - Mi Banco",
  "0151 - Banco Fondo Común (BFC)",
  "0157 - Banco del Sur",
  "Otro banco..."
];

// Variable configurable para el monto mínimo de retiro en monedas (1 moneda = 1 Bs.)
export const MIN_WITHDRAWAL_COINS = 1500;

export default function WalletModal({ isOpen, onClose, userId, coins: propCoins }: WalletModalProps) {
  const dispatch = useDispatch();
  const reduxPlayer = useSelector((state: RootState) => state.gameplayer);

  const [activeTab, setActiveTab] = useState<"recharge" | "withdraw" | "promo" | "history">("recharge");
  const [historyTab, setHistoryTab] = useState<"recharges" | "withdrawals">("recharges");
  const [loading, setLoading] = useState(false);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Cupones Promocionales
  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoLoading, setPromoLoading] = useState<boolean>(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Recompensa Instagram (+300 Monedas)
  const [instagramClaimed, setInstagramClaimed] = useState<boolean>(false);
  const [instagramLoading, setInstagramLoading] = useState<boolean>(false);
  const [showIgVerify, setShowIgVerify] = useState<boolean>(false);
  const [igHandleInput, setIgHandleInput] = useState<string>("");
  const [igRewardSuccess, setIgRewardSuccess] = useState<string | null>(null);
  const [igRewardError, setIgRewardError] = useState<string | null>(null);

  // Formulario de Recarga (con soporte para borrar sin trabarse en 1)
  const [amountBs, setAmountBs] = useState<string>("100");
  const [reference, setReference] = useState<string>("");
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Formulario de Retiro (con soporte para borrar sin trabarse y mínimo configurable)
  const [withdrawCoins, setWithdrawCoins] = useState<string>(MIN_WITHDRAWAL_COINS.toString());
  const [withdrawBank, setWithdrawBank] = useState<string>(VENEZUELAN_BANKS[0]);
  const [withdrawPhone, setWithdrawPhone] = useState<string>("");
  const [withdrawIdCard, setWithdrawIdCard] = useState<string>("");
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Historiales
  const [recharges, setRecharges] = useState<RechargeItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

  // Monedas siempre sincronizadas entre Redux y Props
  const currentCoins = typeof reduxPlayer?.coins === "number" ? reduxPlayer.coins : (propCoins ?? 100);

  // Resolución segura del ID de usuario (evita ConnectionId de SignalR)
  const getValidNumericUserId = useCallback((): number | null => {
    if (userId && !isNaN(Number(userId)) && Number(userId) > 0) {
      return Number(userId);
    }
    if (reduxPlayer?.id && !isNaN(Number(reduxPlayer.id)) && Number(reduxPlayer.id) > 0) {
      return Number(reduxPlayer.id);
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pericon_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u && u.id && !isNaN(Number(u.id)) && Number(u.id) > 0) {
            return Number(u.id);
          }
        }
      } catch (e) {}
    }
    return null;
  }, [userId, reduxPlayer?.id]);

  // Función para obtener y sincronizar historial + balance
  const fetchHistory = useCallback(async () => {
    const validId = getValidNumericUserId();
    if (!validId) return;

    setLoadingHistory(true);
    try {
      const [resRec, resWit, resProf] = await Promise.all([
        fetch(`${apiUrl}/api/payment/user/${validId}`),
        fetch(`${apiUrl}/api/payment/user/${validId}/withdrawals`),
        fetch(`${apiUrl}/api/user/${validId}/profile`)
      ]);

      if (resRec.ok) {
        const dataRec = await resRec.json();
        setRecharges(Array.isArray(dataRec) ? dataRec : []);
      }
      if (resWit.ok) {
        const dataWit = await resWit.json();
        setWithdrawals(Array.isArray(dataWit) ? dataWit : []);
      }
      if (resProf.ok) {
        const profile = await resProf.json();
        if (profile) {
          if (profile.hasClaimedInstagramReward) {
            setInstagramClaimed(true);
          }
          if (profile.instagramHandle) {
            setIgHandleInput(profile.instagramHandle);
          }
          if (typeof profile.coins === "number") {
            dispatch(setGamePlayer({
              coins: profile.coins,
              wins: profile.wins,
              losses: profile.losses,
              level: profile.level,
            }));
            if (typeof window !== "undefined") {
              const stored = localStorage.getItem("pericon_user");
              if (stored) {
                try {
                  const u = JSON.parse(stored);
                  u.coins = profile.coins;
                  if (profile.hasClaimedInstagramReward) {
                    u.hasClaimedInstagramReward = true;
                  }
                  if (profile.instagramHandle) {
                    u.instagramHandle = profile.instagramHandle;
                  }
                  localStorage.setItem("pericon_user", JSON.stringify(u));
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch user payments/withdrawals:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, [apiUrl, getValidNumericUserId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, activeTab, historyTab, fetchHistory]);

  // Polling automático en tiempo real cada 4 segundos mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchHistory();
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, fetchHistory]);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimDaily = async () => {
    const validId = getValidNumericUserId();
    if (!validId) {
      setBonusMessage("Inicia sesión para reclamar tu bono.");
      return;
    }

    setLoading(true);
    setBonusMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/user/claim-daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: validId }),
      });
      const data = await res.json();
      if (res.ok) {
        setBonusMessage(data.message || "¡Has recibido tus 10 monedas diarias! 🐐💰");
        dispatch(setGamePlayer({ coins: data.coins }));
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("pericon_user");
          if (stored) {
            try {
              const u = JSON.parse(stored);
              u.coins = data.coins;
              localStorage.setItem("pericon_user", JSON.stringify(u));
            } catch (e) {}
          }
        }
      } else {
        setBonusMessage(data.message || "No se pudo reclamar el bono hoy.");
      }
    } catch (e) {
      console.error(e);
      setBonusMessage("Error de conexión al reclamar el bono.");
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramRewardClick = () => {
    const validId = getValidNumericUserId();
    if (!validId) {
      setBonusMessage("Inicia sesión para reclamar tu recompensa de Instagram.");
      return;
    }
    // Abre el perfil de Instagram en una pestaña nueva
    if (typeof window !== "undefined") {
      window.open("https://www.instagram.com/pericon.lat", "_blank", "noopener,noreferrer");
    }
    setShowIgVerify(true);
    setIgRewardError(null);
    setIgRewardSuccess(null);
  };

  const handleConfirmInstagramClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validId = getValidNumericUserId();
    if (!validId) {
      setIgRewardError("Debes iniciar sesión para reclamar tus monedas.");
      return;
    }

    const cleanHandle = igHandleInput.trim();
    if (!cleanHandle || cleanHandle.length < 3) {
      setIgRewardError("Por favor ingresa tu usuario de Instagram (ej: @carlos_carora).");
      return;
    }

    setInstagramLoading(true);
    setIgRewardError(null);
    setIgRewardSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/user/claim-instagram-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: validId,
          instagramHandle: cleanHandle
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInstagramClaimed(true);
        setIgRewardSuccess(data.message || "¡300 monedas acreditadas con éxito por apoyar a @pericon.lat! 🐐📸🪙");
        dispatch(setGamePlayer({ coins: data.coins }));
        try { playCoinWinSound(); } catch (err) {}
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("pericon_user");
          if (stored) {
            try {
              const u = JSON.parse(stored);
              u.coins = data.coins;
              u.hasClaimedInstagramReward = true;
              u.instagramHandle = cleanHandle.startsWith("@") ? cleanHandle : `@${cleanHandle}`;
              localStorage.setItem("pericon_user", JSON.stringify(u));
            } catch (err) {}
          }
        }
      } else {
        setIgRewardError(data.message || "No se pudo acreditar la recompensa.");
      }
    } catch (err) {
      console.error(err);
      setIgRewardError("Error de conexión al validar tu recompensa.");
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    const validId = getValidNumericUserId();
    if (!validId) {
      setPromoError("Debes iniciar sesión para canjear un código promocional.");
      return;
    }

    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/user/redeem-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: validId,
          code: promoCodeInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPromoSuccess(data.message);
        setPromoCodeInput("");
        playCoinWinSound();

        if (typeof data.newBalance === "number") {
          dispatch(setGamePlayer({ coins: data.newBalance }));
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("pericon_user");
            if (raw) {
              const u = JSON.parse(raw);
              u.coins = data.newBalance;
              localStorage.setItem("pericon_user", JSON.stringify(u));
            }
          }
        }
      } else {
        setPromoError(data.message || "Código inválido o ya canjeado.");
      }
    } catch {
      setPromoError("Error al conectar con el servidor.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmitRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const validId = getValidNumericUserId();
    if (!validId) {
      setSubmitError("No se pudo identificar tu cuenta. Por favor vuelve a iniciar sesión.");
      return;
    }

    const numAmount = parseInt(amountBs, 10) || 0;
    if (numAmount <= 0) {
      setSubmitError("Por favor ingresa un monto válido en Bolívares (mínimo 1 Bs).");
      return;
    }

    if (!reference.trim()) {
      setSubmitError("Debes ingresar el número de referencia del pago.");
      return;
    }

    if (!receiptBase64) {
      setSubmitError("Debes subir la foto o capture del comprobante de pago.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/payment/report-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: validId,
          amountBs: numAmount,
          reference: reference.trim(),
          base64Image: receiptBase64,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(
          `¡Comprobante enviado con éxito! Tu recarga de ${data.coinsAmount} monedas está en revisión. El administrador la verificará en breve.`
        );
        setReference("");
        setReceiptBase64("");
        setReceiptFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Cambiar automáticamente a solicitudes para ver el comprobante
        setActiveTab("history");
        setHistoryTab("recharges");
        fetchHistory();
      } else {
        setSubmitError(data.message || "No se pudo enviar el reporte de pago.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError("Error de conexión al enviar el comprobante.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const validId = getValidNumericUserId();
    if (!validId) {
      setWithdrawError("No se pudo identificar tu cuenta. Por favor vuelve a iniciar sesión.");
      return;
    }

    const numCoins = parseInt(withdrawCoins, 10) || 0;
    if (numCoins < MIN_WITHDRAWAL_COINS) {
      setWithdrawError(`El monto mínimo de retiro es de ${MIN_WITHDRAWAL_COINS.toLocaleString()} monedas (Bs. ${MIN_WITHDRAWAL_COINS.toLocaleString()}).`);
      return;
    }

    if (numCoins > currentCoins) {
      setWithdrawError(`Saldo insuficiente. Tienes ${currentCoins.toLocaleString()} monedas disponibles y deseas retirar ${numCoins.toLocaleString()}.`);
      return;
    }

    // REGLA FINANCIERA: Cero retiros de monedas regaladas
    const hasApprovedDeposit = recharges.some((r) => r.status === "APROBADO");
    if (!hasApprovedDeposit) {
      setWithdrawError(
        "Por política de seguridad y protección financiera, para solicitar un retiro debes haber realizado al menos una recarga de saldo aprobada en la plataforma. Las monedas de bienvenida, bonos o cupones son exclusivas para jugar y no son retirables directamente sin un depósito previo."
      );
      return;
    }

    if (!withdrawPhone.trim()) {
      setWithdrawError("Ingresa tu número de teléfono de Pago Móvil.");
      return;
    }

    if (!withdrawIdCard.trim()) {
      setWithdrawError("Ingresa tu número de cédula de identidad.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/payment/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: validId,
          coinsAmount: numCoins,
          bankName: withdrawBank,
          phoneNumber: withdrawPhone.trim(),
          idCard: withdrawIdCard.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setWithdrawSuccess(
          `¡Solicitud de retiro de Bs. ${data.amountBs} enviada con éxito! Ya se encuentra en revisión. El administrador transferirá el dinero a tu Pago Móvil.`
        );
        
        // Descontar inmediatamente en el cliente
        if (typeof data.userNewCoins === "number") {
          dispatch(setGamePlayer({ coins: data.userNewCoins }));
          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("pericon_user");
            if (stored) {
              try {
                const u = JSON.parse(stored);
                u.coins = data.userNewCoins;
                localStorage.setItem("pericon_user", JSON.stringify(u));
              } catch (e) {}
            }
          }
        }

        // Limpiar formulario y cambiar automáticamente a la pestaña de Retiros
        setWithdrawPhone("");
        setWithdrawIdCard("");
        setWithdrawCoins(MIN_WITHDRAWAL_COINS.toString());
        setActiveTab("history");
        setHistoryTab("withdrawals");
        fetchHistory();
      } else {
        setWithdrawError(data.message || "Error al procesar la solicitud de retiro.");
      }
    } catch (err) {
      console.error(err);
      setWithdrawError("Error de conexión al solicitar el retiro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#2b180a] via-[#1a0f05] to-[#0d0702] border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 text-white shadow-2xl shadow-amber-600/30 flex flex-col items-center max-h-[92vh] overflow-y-auto">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs transition"
          title="Cerrar monedero"
        >
          ✕
        </button>

        {/* Cabecera del Monedero */}
        <div className="flex items-center gap-3 mb-3 w-full border-b border-amber-500/20 pb-3">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image src="/coin.png" fill alt="Monedas" className="object-contain" priority />
          </div>
          <div>
            <h2 className={`${fonts.bowlbyOneSC.className} text-lg sm:text-xl text-amber-400 leading-tight`}>
              Monedero del Pericón
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-amber-200/80">Saldo disponible:</span>
              <span className="text-sm font-black text-amber-300">
                {currentCoins.toLocaleString()} Monedas
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.2 rounded-full">
                ≈ Bs. {currentCoins.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bono Diario (10 Monedas) */}
        <div className="w-full bg-gradient-to-r from-amber-950/70 via-black/60 to-amber-950/70 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 mb-2 flex items-center justify-between gap-2 shadow">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🐐</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-300">Bono Diario del Chivo</span>
                <span className="text-[10px] bg-amber-500 text-black font-extrabold px-1.5 rounded-full">
                  +10 🪙
                </span>
              </div>
              <span className="text-[10px] text-amber-200/70 block">
                10 monedas gratis cada 24 horas
              </span>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-[11px] rounded-xl shadow transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
          >
            {loading ? "..." : "Reclamar 🎁"}
          </button>
        </div>

        {/* Recompensa Instagram (+300 Monedas) */}
        <div className="w-full bg-gradient-to-r from-purple-950/80 via-black/75 to-pink-950/80 border border-pink-500/40 rounded-2xl p-2.5 sm:p-3 mb-3 flex items-center justify-between gap-2 shadow-lg shadow-pink-950/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0 p-1.5">
              <Image width={24} height={24} src="/instagram.svg" alt="Instagram" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-pink-300 truncate">Seguir en Instagram</span>
                <span className="text-[10px] bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full shadow">
                  +300 🪙
                </span>
              </div>
              <span className="text-[10px] text-pink-200/80 block truncate">
                Sigue a @pericon.lat y gana 300 monedas
              </span>
            </div>
          </div>

          <button
            onClick={handleInstagramRewardClick}
            disabled={instagramClaimed || instagramLoading}
            className={`px-3 py-1.5 font-extrabold text-[11px] rounded-xl shadow transition flex-shrink-0 ${
              instagramClaimed
                ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default"
                : "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 text-white active:scale-95 cursor-pointer"
            }`}
          >
            {instagramClaimed ? "✅ Reclamado" : instagramLoading ? "..." : "Seguir y Ganar 📸"}
          </button>
        </div>

        {/* Modal / Diálogo de Verificación de Instagram */}
        {showIgVerify && !instagramClaimed && (
          <div className="w-full bg-gradient-to-b from-purple-950/95 to-black/95 border-2 border-pink-500/60 rounded-2xl p-3 sm:p-4 mb-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">📸</span>
                <span className="text-xs font-black text-pink-300">Validar Recompensa de Instagram</span>
              </div>
              <button
                onClick={() => setShowIgVerify(false)}
                className="text-pink-300/70 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-pink-100/90 mb-3 leading-snug">
              Ya abrimos <strong className="text-pink-300">@pericon.lat</strong> en Instagram. Dale a <strong>Seguir</strong> y escribe aquí tu usuario para acreditarte tus <strong className="text-amber-300 font-black">+300 monedas</strong>:
            </p>
            <form onSubmit={handleConfirmInstagramClaim} className="flex gap-2">
              <input
                type="text"
                value={igHandleInput}
                onChange={(e) => setIgHandleInput(e.target.value)}
                placeholder="@tu_usuario_instagram"
                className="flex-1 bg-black/80 border border-pink-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                disabled={instagramLoading}
                className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {instagramLoading ? "..." : "Validar y Ganar 🪙"}
              </button>
            </form>
            {igRewardError && (
              <p className="text-[11px] text-rose-400 font-semibold mt-2">⚠️ {igRewardError}</p>
            )}
          </div>
        )}

        {igRewardSuccess && (
          <div className="w-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs p-2.5 rounded-xl mb-3 text-center font-bold shadow animate-in fade-in">
            {igRewardSuccess}
          </div>
        )}

        {bonusMessage && (
          <div className="w-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs p-2.5 rounded-xl mb-3 text-center font-medium">
            {bonusMessage}
          </div>
        )}

        {/* Pestañas Principales: Recargar / Retirar / Cupón / Mis Solicitudes */}
        <div className="grid grid-cols-4 gap-1 w-full bg-black/50 p-1 rounded-xl border border-amber-500/30 mb-3 text-xs">
          <button
            onClick={() => setActiveTab("recharge")}
            className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === "recharge"
                ? "bg-amber-500 text-black shadow"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>💳</span>
            <span>Recarga</span>
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === "withdraw"
                ? "bg-amber-500 text-black shadow"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>💸</span>
            <span>Retiro</span>
          </button>
          <button
            onClick={() => setActiveTab("promo")}
            className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === "promo"
                ? "bg-amber-500 text-black shadow"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>🎟️</span>
            <span>Cupón</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === "history"
                ? "bg-amber-500 text-black shadow"
                : "text-amber-200/70 hover:text-white"
            }`}
          >
            <span>📋</span>
            <span>Historial</span>
          </button>
        </div>

        {/* PESTAÑA 1: RECARGAR MONEDAS */}
        {activeTab === "recharge" && (
          <div className="w-full flex flex-col gap-3">
            {/* Tarjeta con los Datos Bancarios Oficiales */}
            <div className="w-full bg-gradient-to-b from-[#1f1105] to-[#120802] border-2 border-amber-400/60 rounded-2xl p-3.5 shadow-lg flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-amber-500/20 pb-1.5">
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  🏦 Datos de Pago Móvil BNC
                </span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  1 Bs = 1 Moneda
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Banco */}
                <div className="bg-black/50 p-2 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-amber-400/80 font-bold block uppercase">Banco:</span>
                  <span className="font-extrabold text-amber-100 text-xs">BNC (0191)</span>
                </div>

                {/* Teléfono */}
                <div className="bg-black/50 p-2 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400/80 font-bold block uppercase">Teléfono:</span>
                    <span className="font-black text-amber-100 text-xs">04129278335</span>
                  </div>
                  <button
                    onClick={() => handleCopy("04129278335", "phone")}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 transition"
                  >
                    {copiedField === "phone" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Cédula */}
                <div className="bg-black/50 p-2 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400/80 font-bold block uppercase">Cédula:</span>
                    <span className="font-black text-amber-100 text-xs">26554121</span>
                  </div>
                  <button
                    onClick={() => handleCopy("26554121", "id")}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 transition"
                  >
                    {copiedField === "id" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-amber-200/70 text-center italic mt-0.5">
                💡 Realiza tu pago móvil por el monto que desees y luego reporta aquí la referencia y el capture.
              </p>
            </div>

            {/* Formulario de Reporte de Pago */}
            <form onSubmit={handleSubmitRecharge} className="w-full bg-black/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                Reportar Pago Realizado:
              </span>

              {submitSuccess && (
                <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-3 rounded-xl">
                  {submitSuccess}
                </div>
              )}

              {submitError && (
                <div className="bg-rose-950/90 border border-rose-500 text-rose-200 text-xs p-3 rounded-xl">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Monto con borrado libre */}
                <div>
                  <label className="text-[11px] text-amber-200/80 font-bold block mb-1">
                    Monto transferido (Bs.):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountBs}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^[0-9]+$/.test(val)) {
                          setAmountBs(val);
                        }
                      }}
                      className="w-full bg-black/70 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-amber-400"
                      placeholder="100"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs font-extrabold text-amber-400">
                      = {amountBs ? parseInt(amountBs, 10).toLocaleString() : 0} 🪙
                    </span>
                  </div>
                </div>

                {/* Referencia */}
                <div>
                  <label className="text-[11px] text-amber-200/80 font-bold block mb-1">
                    Número de Referencia:
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full bg-black/70 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
                    placeholder="Ej. 482910"
                    required
                  />
                </div>
              </div>

              {/* Subida del Capture */}
              <div>
                <label className="text-[11px] text-amber-200/80 font-bold block mb-1">
                  Foto o Capture del Comprobante:
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-amber-200/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                    required
                  />

                  {receiptBase64 && (
                    <div className="relative w-full h-32 bg-black/60 rounded-xl overflow-hidden border border-amber-500/40 p-1 flex items-center justify-center">
                      <img
                        src={receiptBase64}
                        alt="Previsualización del comprobante"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                      <span className="absolute top-2 right-2 text-[10px] bg-black/80 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                        ✓ Imagen cargada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {loading ? "Enviando comprobante..." : "Enviar Comprobante al Administrador 📤"}
              </button>
            </form>
          </div>
        )}

        {/* PESTAÑA 2: RETIRAR A PAGO MÓVIL */}
        {activeTab === "withdraw" && (
          <div className="w-full flex flex-col gap-3">
            <div className="w-full bg-gradient-to-b from-[#121c10] to-[#0a1208] border-2 border-emerald-500/60 rounded-2xl p-3.5 shadow-lg flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1.5">
                <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  💸 Retiro a tu Pago Móvil
                </span>
                <span className="text-[10px] bg-black/60 border border-emerald-500/40 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  1 Moneda = 1 Bs
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                Retira tus ganancias directamente a tu cuenta bancaria vía Pago Móvil. Las monedas se reservan y descuentan de inmediato para transferirte los bolívares.
              </p>
            </div>

            {/* Aviso de Requisito de Depósito Previo: Cero retiros de moneda regalada */}
            {!recharges.some((r) => r.status === "APROBADO") ? (
              <div className="w-full bg-gradient-to-r from-amber-950/90 to-[#221207] border-2 border-amber-500/60 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg">
                <span className="text-xl shrink-0">🔒</span>
                <div className="flex-1 text-left">
                  <span className="text-xs font-black text-amber-300 block uppercase">
                    Requisito de Retiro: Depósito Previo
                  </span>
                  <p className="text-[11px] text-amber-100/80 leading-tight mt-0.5">
                    Para retirar tus ganancias debes haber realizado al menos una recarga de saldo aprobada por Pago Móvil. Las monedas regaladas son exclusivas para jugar y no pueden retirarse sin un depósito previo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("recharge")}
                    className="mt-2 text-[11px] font-black text-amber-950 bg-amber-400 hover:bg-amber-300 px-3 py-1 rounded-lg transition shadow flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Hacer una Recarga de Saldo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2 px-3 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                <span>✓</span>
                <span>Cuenta habilitada para retiros (Depósitos verificados en plataforma)</span>
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="w-full bg-black/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3">
              {withdrawSuccess && (
                <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-3 rounded-xl">
                  {withdrawSuccess}
                </div>
              )}

              {withdrawError && (
                <div className="bg-rose-950/90 border border-rose-500 text-rose-200 text-xs p-3 rounded-xl">
                  {withdrawError}
                </div>
              )}

              {/* Cantidad de monedas a retirar con borrado libre */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-emerald-200/90 font-bold">
                    Cantidad de Monedas a Retirar:
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md">
                    Mínimo: {MIN_WITHDRAWAL_COINS.toLocaleString()} monedas
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={withdrawCoins}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]+$/.test(val)) {
                        setWithdrawCoins(val);
                      }
                    }}
                    className="w-full bg-black/70 border border-emerald-500/40 rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-emerald-400"
                    placeholder={MIN_WITHDRAWAL_COINS.toString()}
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs font-extrabold text-emerald-400">
                    = Bs. {withdrawCoins ? parseInt(withdrawCoins, 10).toLocaleString() : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-emerald-300/70">
                  <span>Tu saldo disponible: {currentCoins.toLocaleString()} monedas</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawCoins(MIN_WITHDRAWAL_COINS.toString())}
                      className="underline text-emerald-400 hover:text-emerald-300"
                    >
                      Mínimo ({MIN_WITHDRAWAL_COINS.toLocaleString()})
                    </button>
                    {currentCoins >= MIN_WITHDRAWAL_COINS && (
                      <button
                        type="button"
                        onClick={() => setWithdrawCoins(currentCoins.toString())}
                        className="underline text-amber-300 hover:text-amber-200"
                      >
                        Retirar todo ({currentCoins.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
                {currentCoins < MIN_WITHDRAWAL_COINS && (
                  <p className="text-amber-400 text-[10px] font-semibold mt-1">
                    ⚠️ Tu saldo actual ({currentCoins.toLocaleString()} monedas) es menor al mínimo requerido para retirar ({MIN_WITHDRAWAL_COINS.toLocaleString()} monedas).
                  </p>
                )}
              </div>

              {/* Banco Receptor */}
              <div>
                <label className="text-[11px] text-emerald-200/90 font-bold block mb-1">
                  Banco Receptor:
                </label>
                <select
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="w-full bg-black/80 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-emerald-400"
                  required
                >
                  {VENEZUELAN_BANKS.map((b) => (
                    <option key={b} value={b} className="bg-[#1a0f05] text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Teléfono Pago Móvil */}
                <div>
                  <label className="text-[11px] text-emerald-200/90 font-bold block mb-1">
                    Teléfono Pago Móvil:
                  </label>
                  <input
                    type="text"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    className="w-full bg-black/70 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-400"
                    placeholder="Ej. 04121234567"
                    required
                  />
                </div>

                {/* Cédula */}
                <div>
                  <label className="text-[11px] text-emerald-200/90 font-bold block mb-1">
                    Cédula de Identidad:
                  </label>
                  <input
                    type="text"
                    value={withdrawIdCard}
                    onChange={(e) => setWithdrawIdCard(e.target.value)}
                    className="w-full bg-black/70 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-400"
                    placeholder="Ej. 26554121"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || currentCoins <= 0}
                className="w-full py-2.5 mt-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {loading ? "Procesando retiro..." : "Solicitar Retiro de Bolívares 💸"}
              </button>
            </form>
          </div>
        )}

        {/* PESTAÑA 3: CANJEAR CUPÓN PROMOCIONAL */}
        {activeTab === "promo" && (
          <div className="w-full flex flex-col gap-3 min-h-[220px]">
            <div className="bg-gradient-to-b from-[#1c1007] to-[#120803] border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <span className="text-xl">🎟️</span>
                <div>
                  <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                    Canjear Código Promocional
                  </h3>
                  <p className="text-[10px] text-amber-200/60">
                    Ingresa un cupón de regalo o cortesía para recibir monedas gratis al instante.
                  </p>
                </div>
              </div>

              {promoSuccess && (
                <div className="p-3 bg-green-950/80 border border-green-500 rounded-xl text-xs text-green-200 font-medium">
                  {promoSuccess}
                </div>
              )}

              {promoError && (
                <div className="p-3 bg-red-950/80 border border-red-500 rounded-xl text-xs text-red-200 font-medium">
                  ⚠️ {promoError}
                </div>
              )}

              <form onSubmit={handleRedeemPromo} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase block mb-1">
                    Código de Cupón
                  </label>
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ej. PERICON2026"
                    className="w-full bg-black/70 border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm font-black text-amber-300 placeholder-amber-200/30 tracking-widest uppercase focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={promoLoading || !promoCodeInput.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-amber-950 font-black text-xs rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {promoLoading ? "Verificando..." : "Reclamar Monedas Gratis 🎁"}
                </button>
              </form>

              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-200/70 text-center">
                💡 Síguenos en nuestras redes sociales y eventos en vivo para obtener cupones exclusivos.
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: MIS SOLICITUDES (RECARGAS Y RETIROS) */}
        {activeTab === "history" && (
          <div className="w-full flex flex-col gap-2.5 min-h-[240px]">
            {/* Mensaje de confirmación reciente si existe */}
            {withdrawSuccess && (
              <div className="w-full bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-2.5 rounded-xl shadow">
                {withdrawSuccess}
              </div>
            )}

            {/* Sub-selector: Recargas vs Retiros */}
            <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
              <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-amber-500/20 text-xs">
                <button
                  onClick={() => {
                    setHistoryTab("recharges");
                    fetchHistory();
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition text-[11px] ${
                    historyTab === "recharges"
                      ? "bg-amber-500 text-black shadow"
                      : "text-amber-200/70 hover:text-white"
                  }`}
                >
                  📥 Recargas ({recharges.length})
                </button>
                <button
                  onClick={() => {
                    setHistoryTab("withdrawals");
                    fetchHistory();
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition text-[11px] ${
                    historyTab === "withdrawals"
                      ? "bg-emerald-500 text-black shadow"
                      : "text-emerald-200/70 hover:text-white"
                  }`}
                >
                  📤 Retiros ({withdrawals.length})
                </button>
              </div>

              <button
                onClick={fetchHistory}
                className="text-[10px] text-amber-400 hover:text-amber-200 flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg transition"
              >
                <span>🔄</span>
                <span>Actualizar</span>
              </button>
            </div>

            {loadingHistory && recharges.length === 0 && withdrawals.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-amber-200/70 text-xs">
                Cargando solicitudes...
              </div>
            ) : historyTab === "recharges" ? (
              /* Lista de Recargas */
              recharges.length === 0 ? (
                <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-6 text-center text-xs text-amber-200/60 flex flex-col items-center gap-2">
                  <span>📭</span>
                  <span>Aún no has reportado recargas de monedas.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {recharges.map((r) => (
                    <div
                      key={r.id}
                      className="bg-black/50 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-amber-200 text-sm">
                            +{r.coinsAmount} Monedas
                          </span>
                          <span className="text-[10px] text-amber-400/70">
                            (Bs. {r.amountBs})
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-200/60 block">
                          Ref: {r.reference} • {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                        {r.adminNotes && (
                          <span className="text-[10px] text-rose-300 block italic mt-0.5">
                            Nota: {r.adminNotes}
                          </span>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {r.status === "PENDIENTE" && (
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full">
                            ⏳ En Revisión
                          </span>
                        )}
                        {r.status === "APROBADO" && (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                            ✅ Aprobado
                          </span>
                        )}
                        {r.status === "RECHAZADO" && (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full">
                            ❌ Rechazado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Lista de Retiros */
              withdrawals.length === 0 ? (
                <div className="bg-black/40 border border-emerald-500/20 rounded-2xl p-6 text-center text-xs text-emerald-200/60 flex flex-col items-center gap-2">
                  <span>💸</span>
                  <span>Aún no tienes solicitudes de retiro a Pago Móvil.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="bg-black/50 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-emerald-300 text-sm">
                            - {w.coinsAmount} Monedas
                          </span>
                          <span className="text-[10px] text-emerald-400/80 font-bold">
                            (Bs. {w.amountBs.toLocaleString()})
                          </span>
                        </div>
                        <span className="text-[10px] text-white/70 block">
                          {w.bankName}
                        </span>
                        <span className="text-[10px] text-emerald-200/70 block font-mono">
                          📱 {w.phoneNumber} • 🪪 {w.idCard}
                        </span>
                        <span className="text-[9px] text-white/40 block">
                          {new Date(w.createdAt).toLocaleString()}
                        </span>
                        {w.adminReference && (
                          <span className="text-[10px] text-emerald-300 font-mono block mt-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg w-fit">
                            Ref. Transferencia: <strong>{w.adminReference}</strong>
                          </span>
                        )}
                        {w.adminNotes && (
                          <span className="text-[10px] text-rose-300 block italic mt-1 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                            Motivo: {w.adminNotes}
                          </span>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        {w.status === "PENDIENTE" && (
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-full whitespace-nowrap">
                            ⏳ En Proceso
                          </span>
                        )}
                        {w.status === "PAGADO" && (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-full whitespace-nowrap">
                            ✅ Pagado
                          </span>
                        )}
                        {w.status === "RECHAZADO" && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-1 rounded-full whitespace-nowrap">
                              ❌ Rechazado
                            </span>
                            <span className="text-[9px] text-emerald-300 font-bold mt-1 bg-black/60 px-1.5 py-0.5 rounded">
                              ✓ Saldo Reembolsado
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
