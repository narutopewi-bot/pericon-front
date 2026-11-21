"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import * as fonts from "@/components/fonts";
import {
  downloadRestaurantTableCardPng,
  generateQrDataUrl,
} from "@/lib/qrCardGenerator";

interface AffiliatePlayerRow {
  maskedUsername: string;
  registeredAt: string;
  status: string;
  hasRecharged?: boolean;
  rechargeCount?: number;
  totalRechargedBs?: number;
  commissionGeneratedBs?: number;
}

interface AffiliatePayoutRow {
  id: number;
  amountBs: number;
  reference?: string;
  notes?: string;
  paidAt: string;
}

interface AffiliateData {
  code: string;
  businessName: string;
  category?: string;
  bonusCoinsReward?: number;
  isActive?: boolean;
  registeredPlayersCount: number;
  rechargedPlayersCount?: number;
  totalRechargesCount?: number;
  totalRechargedBs: number;
  commissionRate: number;
  accumulatedCommissionBs: number;
  paidCommissionBs?: number;
  pendingCommissionBs?: number;
  payoutSchedule: string;
  bankAccount: string | null;
  recentPlayers: AffiliatePlayerRow[];
  payouts?: AffiliatePayoutRow[];
}

function AffiliateDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawCode = (params?.code as string) || "";
  const code = rawCode.toUpperCase();
  const token = searchParams?.get("token") || "";

  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notFoundErr, setNotFoundErr] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const registerUrl = `https://pericon.lat/registro?ref=${encodeURIComponent(code)}`;

  useEffect(() => {
    if (!code) return;
    let active = true;
    setLoading(true);
    setAccessDenied(false);
    setNotFoundErr(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";

    fetch(`${apiUrl}/api/feed/affiliate/${encodeURIComponent(code)}${qs}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          if (active) {
            setAccessDenied(true);
            setErrorMsg(body.message || "Enlace privado inválido o sin token de acceso.");
          }
          return;
        }
        if (res.status === 404 || !res.ok) {
          if (active) {
            setNotFoundErr(true);
            setErrorMsg(body.message || "Comercio o restaurante no encontrado.");
          }
          return;
        }
        if (active) {
          setData(body as AffiliateData);
        }
      })
      .catch(() => {
        if (active) {
          setNotFoundErr(true);
          setErrorMsg("No se pudo conectar con el servidor de El Pericón.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code, token]);

  useEffect(() => {
    if (!code || accessDenied || notFoundErr) return;
    generateQrDataUrl(registerUrl, 320)
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [code, registerUrl, accessDenied, notFoundErr]);

  const pct = Math.round((data?.commissionRate ?? 0.2) * 100);
  const bonusCoins = data?.bonusCoinsReward ?? 100;

  return (
    <div className="min-h-screen bg-[#0a0705] text-slate-100 p-4 flex flex-col items-center relative">
      <div className="absolute inset-0 bg-diablo mix-blend-soft-light opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-2xl flex flex-col gap-4 z-10 py-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <Link href="/" className="text-xs text-amber-400 font-bold hover:underline">
            ‹ pericon.lat
          </Link>
          <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
            Panel Privado del Comercio
          </span>
        </div>

        {loading && (
          <div className="bg-black/75 border border-amber-500/30 rounded-2xl p-8 text-center text-sm text-amber-300">
            Cargando métricas en vivo de {code}...
          </div>
        )}

        {!loading && accessDenied && (
          <div className="bg-red-950/50 border border-red-500/50 rounded-3xl p-6 text-center space-y-2 shadow-xl">
            <span className="text-3xl block">🔐</span>
            <h1 className="text-lg font-black text-white">Acceso Restringido</h1>
            <p className="text-xs text-red-200">{errorMsg}</p>
            <p className="text-[11px] text-slate-300">
              Solicita al administrador de El Pericón tu enlace privado completo con token para ver las estadísticas de tu restaurante.
            </p>
          </div>
        )}

        {!loading && notFoundErr && (
          <div className="bg-black/75 border border-amber-500/40 rounded-3xl p-6 text-center space-y-2 shadow-xl">
            <span className="text-3xl block">🍽️</span>
            <h1 className="text-lg font-black text-amber-300">Comercio no encontrado</h1>
            <p className="text-xs text-slate-300">{errorMsg}</p>
          </div>
        )}

        {!loading && data && !accessDenied && !notFoundErr && (
          <>
            {/* Título del Comercio */}
            <div className="text-center">
              <span className="text-3xl">🍽️</span>
              <h1 className={`${fonts.bowlbyOneSC.className} text-xl sm:text-2xl text-amber-400 mt-1`}>
                {data.businessName}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {data.category || "Restaurante"} • Código oficial:{" "}
                <strong className="text-amber-300 font-mono">{data.code}</strong>
                {data.isActive === false && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                    Pausado
                  </span>
                )}
              </p>
            </div>

            {/* 4 Tarjetas Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/75 border border-amber-500/40 rounded-2xl p-3.5 text-center shadow-lg">
                <span className="text-[11px] text-slate-400 block font-medium">Personas Registradas</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  👥 {data.registeredPlayersCount ?? 0}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Con tu QR</span>
              </div>

              <div className="bg-black/75 border border-sky-500/40 rounded-2xl p-3.5 text-center shadow-lg">
                <span className="text-[11px] text-slate-400 block font-medium">Personas que Recargaron</span>
                <span className="text-2xl font-black text-sky-300 mt-1 block">
                  💳 {data.rechargedPlayersCount ?? 0}
                </span>
                <span className="text-[10px] text-sky-400/90 font-bold mt-0.5 block">
                  {data.totalRechargesCount ?? 0} recargas aprobadas
                </span>
              </div>

              <div className="bg-black/75 border border-amber-500/40 rounded-2xl p-3.5 text-center shadow-lg">
                <span className="text-[11px] text-slate-400 block font-medium">Total Recargado</span>
                <span className="text-xl font-black text-amber-300 mt-1 block">
                  Bs. {(data.totalRechargedBs ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-200/70 font-bold mt-0.5 block">Volumen clientes</span>
              </div>

              <div className="bg-black/75 border border-emerald-500/50 rounded-2xl p-3.5 text-center shadow-lg">
                <span className="text-[11px] text-emerald-200/80 block font-medium">Tu Comisión ({pct}%)</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">
                  Bs. {(data.accumulatedCommissionBs ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold mt-0.5 block">
                  {pct}% de todas las recargas
                </span>
              </div>
            </div>

            {/* Balance de Pagos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-200/80 block">Pendiente por Cobrar</span>
                  <span className="text-lg font-black text-emerald-300">
                    Bs. {(data.pendingCommissionBs ?? data.accumulatedCommissionBs ?? 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-2xl">💰</span>
              </div>
              <div className="bg-black/60 border border-white/15 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Ya Pagado / Liquidado</span>
                  <span className="text-lg font-black text-white">
                    Bs. {(data.paidCommissionBs ?? 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-2xl">✅</span>
              </div>
            </div>

            {/* Info de Pago */}
            <div className="bg-gradient-to-r from-emerald-950/60 to-black/80 border border-emerald-500/35 rounded-2xl p-4 shadow-lg flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div className="text-left flex-1">
                <span className="text-xs font-bold text-emerald-300 block">Liquidación de Comisiones</span>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  {data.payoutSchedule}
                  {data.bankAccount ? ` • Cuenta: ${data.bankAccount}` : ""}
                </span>
              </div>
            </div>

            {/* Código QR de Mesas */}
            <div className="bg-black/80 border border-amber-500/40 rounded-3xl p-5 text-center shadow-2xl flex flex-col items-center gap-3">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Código QR Oficial para las Mesas
              </span>
              <p className="text-[11px] text-slate-300 leading-tight max-w-sm">
                Tus clientes escanean este QR y reciben{" "}
                <strong className="text-amber-300">+{bonusCoins} monedas de regalo</strong> al registrarse, quedando vinculados a tu comercio para siempre.
              </p>

              {qrDataUrl && (
                <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-amber-400">
                  <img src={qrDataUrl} alt={`QR ${data.code}`} width={180} height={180} className="w-44 h-44 object-contain" />
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  downloadRestaurantTableCardPng({
                    businessName: data.businessName,
                    code: data.code,
                    bonusCoinsReward: bonusCoins,
                    registerUrl,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs shadow-lg transition"
              >
                🖨️ Descargar Tarjeta Imprimible para Mesas (PNG)
              </button>

              <div className="w-full bg-neutral-900 border border-slate-700 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">Enlace directo de registro de tus mesas:</span>
                <code className="text-xs font-bold text-amber-300 break-all select-all block mt-0.5">
                  {registerUrl}
                </code>
              </div>
            </div>

            {/* Detalle de Jugadores */}
            <div className="bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs font-bold text-amber-400 block mb-2.5">
                Últimos Clientes Registrados ({data.registeredPlayersCount})
              </span>
              {!data.recentPlayers || data.recentPlayers.length === 0 ? (
                <p className="text-xs text-slate-400">Aún no hay clientes registrados con tu QR.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentPlayers.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap justify-between items-center gap-2 text-[11px] border-b border-white/10 pb-2"
                    >
                      <div>
                        <span className="text-white font-mono font-bold">@{p.maskedUsername}</span>
                        <span className="text-slate-400 ml-2 text-[10px]">
                          {new Date(p.registeredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        {p.hasRecharged ? (
                          <span className="text-emerald-400 font-bold">
                            Recargó Bs. {(p.totalRechargedBs ?? 0).toFixed(2)} ({p.rechargeCount}x) → Comisión: Bs.{" "}
                            {(p.commissionGeneratedBs ?? 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Registrado • Sin recargas aún</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Pagos */}
            {data.payouts && data.payouts.length > 0 && (
              <div className="bg-black/75 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
                <span className="text-xs font-bold text-emerald-300 block mb-2">
                  Historial de Comisiones Pagadas
                </span>
                <div className="space-y-1.5">
                  {data.payouts.map((py) => (
                    <div
                      key={py.id}
                      className="flex justify-between items-center text-[11px] border-b border-white/10 pb-1.5"
                    >
                      <span className="text-slate-200">
                        <strong className="text-emerald-400">Bs. {py.amountBs.toFixed(2)}</strong>
                        {py.reference ? ` • Ref: ${py.reference}` : ""}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(py.paidAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AffiliatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0705] flex items-center justify-center text-amber-300 text-sm">
          Cargando panel del comercio...
        </div>
      }
    >
      <AffiliateDashboardContent />
    </Suspense>
  );
}
