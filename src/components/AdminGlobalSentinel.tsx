"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSignalRContext } from "@/lib/signalrcontext";
import { showNativeNotification, triggerNativeHaptic } from "@/lib/nativeBridge";

interface AdminAlertPayload {
  id?: number;
  type: "RECHARGE" | "WITHDRAWAL";
  username?: string;
  amountBs?: number;
  coins?: number;
  status?: string;
  isAutoApproved?: boolean;
  timestamp?: string;
}

function getActiveAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      sessionStorage.getItem("guardian_admin_token") ||
      localStorage.getItem("guardian_admin_token") ||
      localStorage.getItem("pericon_admin_master_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function playSentinelChime(): void {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.15);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {
    // ignore audio autoplay restriction
  }
}

export default function AdminGlobalSentinel() {
  const pathname = usePathname();
  const signalrConn = useSignalRContext();
  const lastAlertKeyRef = useRef<string>("");
  const lastPendingRechargesRef = useRef<number>(-1);
  const lastPendingWithdrawalsRef = useRef<number>(-1);

  // Si estamos dentro de /admin, la propia página /admin maneja sus alertas y recarga de tablas
  const isInsideAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isInsideAdminPage) return;
    const token = getActiveAdminToken();
    if (!token || !signalrConn) return;

    const handleAlert = (alert: AdminAlertPayload) => {
      const currentToken = getActiveAdminToken();
      if (!currentToken) return;

      const dedupKey = `${alert.type}_${alert.id || ""}_${alert.username || ""}_${alert.amountBs || 0}`;
      if (lastAlertKeyRef.current === dedupKey) return;
      lastAlertKeyRef.current = dedupKey;
      setTimeout(() => {
        if (lastAlertKeyRef.current === dedupKey) lastAlertKeyRef.current = "";
      }, 5000);

      playSentinelChime();
      triggerNativeHaptic("heavy");

      if (alert.type === "WITHDRAWAL") {
        showNativeNotification(
          "💸 ¡Nueva Solicitud de Retiro!",
          `Jugador ${alert.username || "Usuario"} solicita retiro de ${
            alert.amountBs ? Number(alert.amountBs).toFixed(2) : "0.00"
          } Bs. (${alert.coins || 0} Monedas)`,
          "/admin"
        );
      } else {
        const isAuto = alert.isAutoApproved || alert.status === "APROBADO";
        showNativeNotification(
          isAuto ? "⚡ Recarga Aprobada al Instante" : "🔔 ¡Nueva Recarga Pendiente!",
          `Jugador ${alert.username || "Usuario"} reportó ${
            alert.amountBs ? Number(alert.amountBs).toFixed(2) : "0.00"
          } Bs. (${isAuto ? "Acreditada por Tesoro" : "Requiere revisión"})`,
          "/admin"
        );
      }
    };

    signalrConn.invoke("RegisterAdminAlertChannel", token).catch(() => {});
    signalrConn.on("ReceiveAdminAlert", handleAlert);
    signalrConn.on("AdminSentinelPing", handleAlert);

    const onReconnected = () => {
      const latestToken = getActiveAdminToken();
      if (latestToken) {
        signalrConn.invoke("RegisterAdminAlertChannel", latestToken).catch(() => {});
      }
    };
    signalrConn.onreconnected(onReconnected);

    return () => {
      signalrConn.off("ReceiveAdminAlert", handleAlert);
      signalrConn.off("AdminSentinelPing", handleAlert);
    };
  }, [signalrConn, isInsideAdminPage]);

  // Respaldo de polling cada 15s en segundo plano cuando el Admin está fuera de /admin (por ejemplo en /desk)
  useEffect(() => {
    if (isInsideAdminPage) return;
    const token = getActiveAdminToken();
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

    const checkCounts = async () => {
      const activeToken = getActiveAdminToken();
      if (!activeToken) return;
      try {
        const res = await fetch(`${apiUrl}/api/payment/sentinel-counts`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const curRech = Number(data.pendingRecharges || 0);
        const curWith = Number(data.pendingWithdrawals || 0);

        if (lastPendingRechargesRef.current >= 0 && curRech > lastPendingRechargesRef.current) {
          playSentinelChime();
          triggerNativeHaptic("heavy");
          showNativeNotification(
            "🔔 ¡Nueva Recarga Pendiente!",
            `Hay ${curRech} recarga(s) esperando tu aprobación en El Pericón.`,
            "/admin"
          );
        }
        lastPendingRechargesRef.current = curRech;

        if (lastPendingWithdrawalsRef.current >= 0 && curWith > lastPendingWithdrawalsRef.current) {
          playSentinelChime();
          triggerNativeHaptic("heavy");
          showNativeNotification(
            "💸 ¡Nueva Solicitud de Retiro!",
            `Hay ${curWith} solicitud(es) de retiro esperando transferencia bancaria.`,
            "/admin"
          );
        }
        lastPendingWithdrawalsRef.current = curWith;
      } catch {
        // Silencioso
      }
    };

    checkCounts();
    const interval = setInterval(checkCounts, 15000);
    return () => clearInterval(interval);
  }, [isInsideAdminPage]);

  return null;
}
