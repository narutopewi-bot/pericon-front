"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  downloadQrOnlyPng,
  downloadRestaurantTableCardPng,
  generateQrDataUrl,
} from "@/lib/qrCardGenerator";

export interface AffiliatePayoutItem {
  id: number;
  amountBs: number;
  reference?: string;
  notes?: string;
  paidAt: string;
  createdBy?: string;
}

export interface AffiliatePlayerMetric {
  maskedUsername: string;
  fullUsername?: string;
  registeredAt: string;
  status: string;
  hasRecharged: boolean;
  rechargeCount: number;
  totalRechargedBs: number;
  commissionGeneratedBs: number;
}

export interface AffiliatePartnerMetric {
  id: number;
  code: string;
  businessName: string;
  category: string;
  ownerName?: string;
  phoneNumber?: string;
  bankName?: string;
  cedula?: string;
  bonusCoinsReward: number;
  commissionRate: number;
  accessToken: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  registeredPlayersCount: number;
  rechargedPlayersCount: number;
  totalRechargesCount: number;
  totalRechargedBs: number;
  totalWithdrawnBs: number;
  accumulatedCommissionBs: number;
  paidCommissionBs: number;
  pendingCommissionBs: number;
  recentPlayers: AffiliatePlayerMetric[];
  payouts: AffiliatePayoutItem[];
}

interface AdminAffiliatesTabProps {
  apiUrl: string;
  adminToken: string;
  onActionMessage: (msg: string) => void;
}

export default function AdminAffiliatesTab({
  apiUrl,
  adminToken,
  onActionMessage,
}: AdminAffiliatesTabProps) {
  const [affiliates, setAffiliates] = useState<AffiliatePartnerMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});

  // Create form
  const [businessName, setBusinessName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Restaurante");
  const [bonusCoinsReward, setBonusCoinsReward] = useState("100");
  const [commissionPct, setCommissionPct] = useState("20");
  const [ownerName, setOwnerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [cedula, setCedula] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Payout modal
  const [payoutTarget, setPayoutTarget] = useState<AffiliatePartnerMetric | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  // Detail modal
  const [detailTarget, setDetailTarget] = useState<AffiliatePartnerMetric | null>(null);

  const publicOrigin =
    typeof window !== "undefined" && window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://pericon.lat";

  const getToken = useCallback(() => {
    if (adminToken) return adminToken;
    if (typeof window !== "undefined") {
      return (
        sessionStorage.getItem("guardian_admin_token") ||
        localStorage.getItem("guardian_admin_token") ||
        localStorage.getItem("pericon_admin_master_token") ||
        ""
      );
    }
    return "";
  }, [adminToken]);

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/affiliates`, {
        headers: { "X-Admin-Token": getToken() },
        cache: "no-store",
      });
      if (res.ok) {
        const list: AffiliatePartnerMetric[] = await res.json();
        setAffiliates(list);
      }
    } catch (e) {
      console.error("[AdminAffiliates] Error loading affiliates:", e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  useEffect(() => {
    let active = true;
    const generateAll = async () => {
      const nextMap: Record<string, string> = {};
      for (const item of affiliates) {
        const regUrl = `https://pericon.lat/registro?ref=${encodeURIComponent(item.code)}`;
        try {
          nextMap[item.code] = await generateQrDataUrl(regUrl, 220);
        } catch {
          // ignore
        }
      }
      if (active) setQrPreviews(nextMap);
    };
    if (affiliates.length > 0) generateAll();
    return () => {
      active = false;
    };
  }, [affiliates]);

  const handleAutoCode = (nameVal: string) => {
    setBusinessName(nameVal);
    if (!code || code === sanitizeCode(businessName)) {
      setCode(sanitizeCode(nameVal));
    }
  };

  function sanitizeCode(val: string): string {
    return val
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 20);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !code.trim()) return;
    setCreating(true);
    try {
      const pctNum = parseFloat(commissionPct) || 20;
      const res = await fetch(`${apiUrl}/api/admin/affiliates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": getToken(),
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          code: sanitizeCode(code),
          category,
          bonusCoinsReward: parseInt(bonusCoinsReward, 10) || 100,
          commissionRate: pctNum / 100,
          ownerName: ownerName.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          bankName: bankName.trim() || undefined,
          cedula: cedula.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onActionMessage(`❌ ${data.message || "No se pudo crear el restaurante."}`);
      } else {
        onActionMessage(`✅ ${data.message}`);
        setBusinessName("");
        setCode("");
        setOwnerName("");
        setPhoneNumber("");
        setBankName("");
        setCedula("");
        setNotes("");
        await fetchAffiliates();
      }
    } catch {
      onActionMessage("❌ Error de red creando el restaurante.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (item: AffiliatePartnerMetric) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/affiliates/${item.id}/toggle`, {
        method: "POST",
        headers: { "X-Admin-Token": getToken() },
      });
      const data = await res.json();
      if (res.ok) {
        onActionMessage(`✅ ${data.message}`);
        await fetchAffiliates();
      }
    } catch {
      onActionMessage("❌ Error cambiando estado del comercio.");
    }
  };

  const handleRegenerateToken = async (item: AffiliatePartnerMetric) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/affiliates/${item.id}/regenerate-token`, {
        method: "POST",
        headers: { "X-Admin-Token": getToken() },
      });
      const data = await res.json();
      if (res.ok) {
        onActionMessage(`🔐 ${data.message}`);
        await fetchAffiliates();
      }
    } catch {
      onActionMessage("❌ Error regenerando enlace privado.");
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onActionMessage(`📋 ${label} copiado al portapapeles.`);
    } catch {
      onActionMessage(`⚠️ No se pudo copiar automáticamente: ${text}`);
    }
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutTarget) return;
    const amt = parseFloat(payoutAmount);
    if (!amt || amt <= 0) return;

    setSavingPayout(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/affiliates/${payoutTarget.id}/payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": getToken(),
        },
        body: JSON.stringify({
          amountBs: amt,
          reference: payoutRef.trim() || undefined,
          notes: payoutNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onActionMessage(`💸 ${data.message}`);
        setPayoutTarget(null);
        setPayoutAmount("");
        setPayoutRef("");
        setPayoutNotes("");
        await fetchAffiliates();
      } else {
        onActionMessage(`❌ ${data.message || "Error registrando pago."}`);
      }
    } catch {
      onActionMessage("❌ Error de red registrando liquidación.");
    } finally {
      setSavingPayout(false);
    }
  };

  const filtered = affiliates.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.businessName.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.ownerName || "").toLowerCase().includes(q)
    );
  });

  const totals = affiliates.reduce(
    (acc, cur) => {
      acc.registered += cur.registeredPlayersCount;
      acc.rechargedPlayers += cur.rechargedPlayersCount;
      acc.rechargedBs += cur.totalRechargedBs;
      acc.commissionBs += cur.accumulatedCommissionBs;
      acc.pendingBs += cur.pendingCommissionBs;
      return acc;
    },
    { registered: 0, rechargedPlayers: 0, rechargedBs: 0, commissionBs: 0, pendingBs: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wide">
            🍽️ Restaurantes & Comercios QR (20%)
          </h2>
          <p className="text-xs text-amber-200/70 mt-0.5">
            Crea códigos QR de mesa, descarga tarjetas listas para imprimir y entrega a cada restaurante su enlace privado de métricas.
          </p>
        </div>
        <button
          onClick={fetchAffiliates}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition"
        >
          {loading ? "Actualizando..." : "🔄 Actualizar Datos"}
        </button>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#180d07] border border-amber-500/30 rounded-2xl p-3.5">
          <span className="text-[11px] text-amber-200/60 block">Comercios Activos</span>
          <span className="text-xl font-black text-white">{affiliates.filter((a) => a.isActive).length} / {affiliates.length}</span>
        </div>
        <div className="bg-[#180d07] border border-amber-500/30 rounded-2xl p-3.5">
          <span className="text-[11px] text-amber-200/60 block">Registros vía QR</span>
          <span className="text-xl font-black text-emerald-300">{totals.registered}</span>
        </div>
        <div className="bg-[#180d07] border border-amber-500/30 rounded-2xl p-3.5">
          <span className="text-[11px] text-amber-200/60 block">Clientes que Recargaron</span>
          <span className="text-xl font-black text-sky-300">{totals.rechargedPlayers}</span>
        </div>
        <div className="bg-[#180d07] border border-amber-500/30 rounded-2xl p-3.5">
          <span className="text-[11px] text-amber-200/60 block">Recargado Total (Bs.)</span>
          <span className="text-xl font-black text-amber-300">Bs. {totals.rechargedBs.toFixed(2)}</span>
        </div>
        <div className="bg-[#180d07] border border-emerald-500/40 rounded-2xl p-3.5">
          <span className="text-[11px] text-emerald-200/70 block">Comisión Pendiente</span>
          <span className="text-xl font-black text-emerald-400">Bs. {totals.pendingBs.toFixed(2)}</span>
        </div>
      </div>

      {/* Formulario crear restaurante */}
      <form
        onSubmit={handleCreate}
        className="bg-[#180d07] border border-amber-500/30 rounded-2xl p-4 md:p-5 space-y-4"
      >
        <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
          ➕ Registrar Nuevo Restaurante / Comercio QR
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Nombre del Restaurante *</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => handleAutoCode(e.target.value)}
              placeholder="Ej: Restaurante La Brasa"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white focus:border-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Código QR Único *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(sanitizeCode(e.target.value))}
              placeholder="Ej: LABRASA"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs font-mono text-amber-300 focus:border-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Bono Extra al Registrarse</label>
            <input
              type="number"
              min={0}
              max={50000}
              value={bonusCoinsReward}
              onChange={(e) => setBonusCoinsReward(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white focus:border-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">% Comisión por Recargas</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-emerald-300 font-bold focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white focus:border-amber-400 outline-none"
            >
              <option value="Restaurante">Restaurante</option>
              <option value="Tasca / Bar">Tasca / Bar</option>
              <option value="Licorería / Bodega">Licorería / Bodega</option>
              <option value="Billar / Club">Billar / Club</option>
              <option value="Otro Comercio">Otro Comercio</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Encargado / Dueño</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nombre contacto"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Teléfono Pago Móvil</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0412..."
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Banco</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ej: Banco de Venezuela"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-amber-200/70 block mb-1">Cédula / RIF</label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12345678"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas (ej: 12 mesas, zona centro...)"
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-black text-xs shadow-lg transition disabled:opacity-50"
          >
            {creating ? "Creando..." : "✅ Crear Restaurante y Generar QR"}
          </button>
        </div>
      </form>

      {/* Buscador */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar restaurante por nombre, código o encargado..."
          className="w-full md:max-w-md px-3.5 py-2 rounded-xl bg-[#180d07] border border-amber-500/30 text-xs text-white outline-none focus:border-amber-400"
        />
      </div>

      {/* Tarjetas de Restaurantes */}
      {filtered.length === 0 ? (
        <div className="bg-[#180d07] border border-amber-500/20 rounded-2xl p-8 text-center text-xs text-amber-200/60">
          No hay restaurantes/comercios registrados aún. Crea el primero arriba para generar su QR de mesa y link de métricas.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const registerUrl = `https://pericon.lat/registro?ref=${encodeURIComponent(item.code)}`;
            const partnerPanelUrl = `${publicOrigin}/afiliados/${encodeURIComponent(item.code)}?token=${encodeURIComponent(item.accessToken)}`;
            const prodPanelUrl = `https://pericon.lat/afiliados/${encodeURIComponent(item.code)}?token=${encodeURIComponent(item.accessToken)}`;
            const pctLabel = Math.round(item.commissionRate * 100);
            const arbitrageAlert = item.totalWithdrawnBs > 0 && item.totalWithdrawnBs >= item.totalRechargedBs * 0.85 && item.totalRechargedBs > 0;

            return (
              <div
                key={item.id}
                className={`bg-[#180d07] border rounded-2xl p-4 flex flex-col gap-3 shadow-lg ${
                  item.isActive ? "border-amber-500/35" : "border-red-500/30 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {qrPreviews[item.code] ? (
                      <div className="bg-white p-1.5 rounded-xl border-2 border-amber-400 flex-shrink-0">
                        <img
                          src={qrPreviews[item.code]}
                          alt={`QR ${item.code}`}
                          className="w-20 h-20 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-black/50 border border-amber-500/30 flex items-center justify-center text-[10px] text-amber-300">
                        QR...
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-white">{item.businessName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          {item.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-red-500/20 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {item.isActive ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/70 mt-0.5">
                        {item.category} • Bono: <strong className="text-amber-300">+{item.bonusCoinsReward}</strong> monedas • Comisión:{" "}
                        <strong className="text-emerald-300">{pctLabel}%</strong>
                      </p>
                      {(item.ownerName || item.phoneNumber) && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.ownerName || "Sin contacto"} {item.phoneNumber ? `• ${item.phoneNumber}` : ""} {item.bankName ? `(${item.bankName})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-black/40 border border-white/10 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">Registrados</span>
                    <span className="text-sm font-black text-white">{item.registeredPlayersCount}</span>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">Recargaron</span>
                    <span className="text-sm font-black text-sky-300">
                      {item.rechargedPlayersCount} <span className="text-[10px] font-normal">({item.totalRechargesCount}x)</span>
                    </span>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">Total Recargado</span>
                    <span className="text-sm font-black text-amber-300">Bs. {item.totalRechargedBs.toFixed(2)}</span>
                  </div>
                  <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-2">
                    <span className="text-[10px] text-emerald-300/80 block">Pendiente ({pctLabel}%)</span>
                    <span className="text-sm font-black text-emerald-400">Bs. {item.pendingCommissionBs.toFixed(2)}</span>
                  </div>
                </div>

                {arbitrageAlert && (
                  <div className="bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-1.5 text-[11px] text-red-200">
                    ⚠️ Alerta antifraude: sus referidos han retirado Bs. {item.totalWithdrawnBs.toFixed(2)} frente a Bs. {item.totalRechargedBs.toFixed(2)} recargados.
                  </div>
                )}

                <div className="text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Comisión generada total: <strong className="text-white">Bs. {item.accumulatedCommissionBs.toFixed(2)}</strong></span>
                  <span>Ya pagado: <strong className="text-emerald-300">Bs. {item.paidCommissionBs.toFixed(2)}</strong></span>
                  <span>Retirado por referidos: <strong className="text-amber-200">Bs. {item.totalWithdrawnBs.toFixed(2)}</strong></span>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      downloadRestaurantTableCardPng({
                        businessName: item.businessName,
                        code: item.code,
                        bonusCoinsReward: item.bonusCoinsReward,
                        registerUrl,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-[11px] transition"
                  >
                    🖨️ Descargar Tarjeta Mesa (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadQrOnlyPng(registerUrl, item.code)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black border border-amber-500/40 text-amber-300 font-bold text-[11px] transition"
                  >
                    ⬇️ Solo QR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(prodPanelUrl, "Link privado del restaurante")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition"
                  >
                    🔗 Copiar Link Restaurante
                  </button>
                  <a
                    href={partnerPanelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/40 text-sky-300 font-bold text-[11px] transition"
                  >
                    👁️ Abrir Vista
                  </a>
                  <button
                    type="button"
                    onClick={() => setDetailTarget(item)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-[11px] transition"
                  >
                    📋 Detalle ({item.registeredPlayersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutTarget(item);
                      setPayoutAmount(item.pendingCommissionBs > 0 ? item.pendingCommissionBs.toFixed(2) : "");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-300 font-bold text-[11px] transition"
                  >
                    💸 Registrar Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegenerateToken(item)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-bold text-[11px] transition"
                  >
                    🔑 Rotar Token
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-200 font-bold text-[11px] transition"
                  >
                    {item.isActive ? "⏸️ Pausar" : "▶️ Activar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Pago */}
      {payoutTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayout}
            className="w-full max-w-md bg-[#180d07] border border-amber-500/50 rounded-2xl p-5 space-y-3 shadow-2xl"
          >
            <h3 className="text-base font-black text-amber-300">
              💸 Liquidar Comisión: {payoutTarget.businessName}
            </h3>
            <p className="text-xs text-slate-300">
              Pendiente actual: <strong className="text-emerald-400">Bs. {payoutTarget.pendingCommissionBs.toFixed(2)}</strong>
            </p>
            <div>
              <label className="text-[11px] text-amber-200/70 block mb-1">Monto Pagado (Bs.) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-amber-200/70 block mb-1">Referencia Pago Móvil</label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="Ej: 123456"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-amber-200/70 block mb-1">Nota</label>
              <input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs text-white outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPayout}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black"
              >
                {savingPayout ? "Guardando..." : "Confirmar Pago"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Detalle Jugadores y Pagos */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#180d07] border border-amber-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <h3 className="text-base font-black text-amber-300">
                📋 {detailTarget.businessName} ({detailTarget.code})
              </h3>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="px-3 py-1 rounded-lg bg-white/10 text-xs font-bold text-white"
              >
                ✕ Cerrar
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-amber-200 mb-2">Últimos Jugadores Registrados por este QR</h4>
              {detailTarget.recentPlayers.length === 0 ? (
                <p className="text-xs text-slate-400">Sin registros aún.</p>
              ) : (
                <div className="space-y-1.5">
                  {detailTarget.recentPlayers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-bold text-white">{p.fullUsername || p.maskedUsername}</span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          {new Date(p.registeredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        {p.hasRecharged ? (
                          <span className="text-emerald-300 font-bold">
                            {p.rechargeCount} recarga(s) • Bs. {p.totalRechargedBs.toFixed(2)} (Com: Bs. {p.commissionGeneratedBs.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-slate-400">Solo registro (0 recargas)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-emerald-300 mb-2">Historial de Liquidaciones Pagadas</h4>
              {detailTarget.payouts.length === 0 ? (
                <p className="text-xs text-slate-400">No se han registrado pagos todavía.</p>
              ) : (
                <div className="space-y-1.5">
                  {detailTarget.payouts.map((py) => (
                    <div key={py.id} className="flex items-center justify-between text-xs bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-3 py-2">
                      <span>
                        <strong className="text-emerald-300">Bs. {py.amountBs.toFixed(2)}</strong>
                        {py.reference ? ` • Ref: ${py.reference}` : ""}
                        {py.notes ? ` • ${py.notes}` : ""}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(py.paidAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
