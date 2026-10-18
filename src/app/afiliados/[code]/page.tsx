"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as fonts from "@/components/fonts";

interface AffiliateData {
  code: string;
  businessName: string;
  registeredPlayersCount: number;
  totalRechargedBs: number;
  commissionRate: number;
  accumulatedCommissionBs: number;
  payoutSchedule: string;
  bankAccount: string | null;
  recentPlayers: {
    maskedUsername: string;
    registeredAt: string;
    status: string;
  }[];
}

export default function AffiliatePage() {
  const params = useParams();
  const rawCode = (params?.code as string) || "DONPEPE";
  const code = rawCode.toUpperCase();

  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
    fetch(`${apiUrl}/api/feed/affiliate/${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error loading affiliate");
        return res.json();
      })
      .then((resData: AffiliateData) => {
        setData(resData);
      })
      .catch(() => {
        // Fallback placeholder para que nunca quede en blanco si el afiliado es nuevo
        setData({
          code: code,
          businessName: `Bodega / Aliado ${code}`,
          registeredPlayersCount: 0,
          totalRechargedBs: 0,
          commissionRate: 0.03,
          accumulatedCommissionBs: 0,
          payoutSchedule: "Semanal (Todos los Lunes vía Pago Móvil)",
          bankAccount: "Pago Móvil registrado",
          recentPlayers: [],
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `https://pericon.lat/registro?ref=${code}`
  )}`;

  return (
    <div className="min-h-screen bg-[#0a0705] text-slate-100 p-4 flex flex-col items-center select-none relative">
      <div className="absolute inset-0 bg-diablo mix-blend-soft-light opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col gap-4 z-10 py-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <Link href="/" className="text-xs text-amber-400 font-bold hover:underline">
            ‹ pericon.lat
          </Link>
          <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
            Panel del Aliado
          </span>
        </div>

        {/* Título de la Bodega */}
        <div className="text-center">
          <span className="text-3xl">🏪</span>
          <h1 className={`${fonts.bowlbyOneSC.className} text-xl text-amber-400 mt-1`}>
            {data?.businessName || `Aliado ${code}`}
          </h1>
          <p className="text-xs text-slate-400">
            Código oficial de afiliado: <strong className="text-amber-300 font-mono">{code}</strong>
          </p>
        </div>

        {/* Tarjetas de Métricas en Vivo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/75 border border-amber-500/40 rounded-2xl p-3.5 text-center shadow-lg">
            <span className="text-xs text-slate-400 block font-medium">Jugadores Registrados</span>
            <span className="text-2xl font-black text-white mt-1 block">
              👥 {data?.registeredPlayersCount ?? 0}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Vinculados de por vida</span>
          </div>

          <div className="bg-black/75 border border-amber-500/40 rounded-2xl p-3.5 text-center shadow-lg">
            <span className="text-xs text-slate-400 block font-medium">Comisión Acumulada</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              Bs. {data?.accumulatedCommissionBs ? data.accumulatedCommissionBs.toLocaleString() : "0"}
            </span>
            <span className="text-[10px] text-amber-400/90 font-bold mt-0.5 block">3% de todas las recargas</span>
          </div>
        </div>

        {/* Liquidación de Pagos */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-black/80 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div className="text-left flex-1">
            <span className="text-xs font-bold text-emerald-300 block">Liquidación Automática</span>
            <span className="text-[11px] text-slate-300 block mt-0.5">
              Tus comisiones se pagan directamente a tu cuenta bancaria registrada por <strong>Pago Móvil</strong> todos los lunes.
            </span>
          </div>
        </div>

        {/* Tu Código QR Dedicado */}
        <div className="bg-black/80 border border-amber-500/40 rounded-3xl p-5 text-center shadow-2xl flex flex-col items-center gap-3">
          <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
            Tu Código QR para Imprimir y Mostrar
          </span>
          <p className="text-[11px] text-slate-300 leading-tight max-w-[280px]">
            Tus clientes escanean este código y reciben <strong>+100 monedas de regalo</strong> en su registro.
          </p>

          <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-amber-400">
            <img src={qrUrl} alt={`QR Bodega ${code}`} width={180} height={180} className="w-44 h-44 object-contain" />
          </div>

          <div className="w-full bg-neutral-900 border border-slate-700 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 block">Enlace directo para compartir por WhatsApp:</span>
            <code className="text-xs font-bold text-amber-300 break-all select-all block mt-0.5">
              https://pericon.lat/registro?ref={code}
            </code>
          </div>
        </div>

        {/* Registro de clientes recientes */}
        {data && data.recentPlayers && data.recentPlayers.length > 0 && (
          <div className="bg-black/70 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-xs font-bold text-amber-400 block mb-2">Últimos Jugadores Registrados:</span>
            <div className="space-y-1.5">
              {data.recentPlayers.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-1">
                  <span className="text-slate-300 font-mono">@{p.maskedUsername}</span>
                  <span className="text-emerald-400 font-bold">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
