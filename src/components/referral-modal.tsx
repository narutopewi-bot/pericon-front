'use client';

import React, { useState, useEffect } from 'react';
import { Users, Share2, Copy, Check, Gift, AlertCircle, X, Sparkles } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onRewardApplied?: () => void;
}

export default function ReferralModal({
  isOpen,
  onClose,
  currentUser,
  onRewardApplied,
}: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
  const myCode = currentUser?.username ? currentUser.username.toUpperCase() : 'AMIGO';
  const myUrl = `https://pericon.lat/r/${myCode}`;
  const shareText = `🎴 ¡Únete a El Pericón y recibe 100 MONEDAS DE BONO de regalo para jugar y ganar dinero real! 🪙\n\nRegístrate gratis usando mi enlace exclusivo:\n👉 ${myUrl}`;

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      fetchReferralStats();
    }
  }, [isOpen, currentUser]);

  const fetchReferralStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${apiUrl}/api/user/referral-info/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setReferralStats(data);
      }
    } catch (e) {
      console.error("Error al cargar estadísticas de referidos:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(myUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleApplyCode = async () => {
    if (!friendCode.trim() || !currentUser?.id) return;
    try {
      setApplying(true);
      setApplyMsg(null);
      const res = await fetch(`${apiUrl}/api/user/apply-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          code: friendCode.trim().toUpperCase()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyMsg({ text: data.message || 'Código inválido o ya canjeado.', isError: true });
      } else {
        setApplyMsg({ text: data.message || '¡100 monedas de bono acreditadas con éxito!', isError: false });
        setFriendCode('');
        fetchReferralStats();
        if (onRewardApplied) onRewardApplied();
      }
    } catch {
      setApplyMsg({ text: 'Error de conexión al aplicar código.', isError: true });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-emerald-500/60 bg-[#0c1610] p-5 sm:p-6 text-white shadow-[0_0_50px_rgba(16,185,129,0.3)]">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <Gift size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-emerald-300 uppercase">
                Programa de Referidos
              </h2>
              <p className="text-[11px] text-emerald-200/60 font-semibold">
                Gana 150 monedas por amigo invitado
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-xl p-1.5 text-emerald-200/60 hover:bg-emerald-500/10 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Tarjeta de Recompensas Dual */}
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-green-950/40 to-emerald-950/60 border border-emerald-500/40 p-4 text-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 block mb-1">
            🎁 Beneficio Exclusivo Dual
          </span>
          <div className="flex items-center justify-center gap-3 my-2">
            <div className="bg-black/40 rounded-xl px-3 py-2 border border-emerald-500/30 flex-1">
              <span className="text-[10px] text-emerald-200/60 block">Tu Amigo Recibe</span>
              <span className="text-sm font-black text-emerald-300">+🪙 100 Bono</span>
            </div>
            <div className="bg-black/40 rounded-xl px-3 py-2 border border-amber-500/40 flex-1">
              <span className="text-[10px] text-amber-200/60 block">Tú Ganas</span>
              <span className="text-sm font-black text-amber-300">+🪙 150 Monedas</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-200/50">
            Tu amigo recibe 100 de bono para jugar y a ti se te acreditan 150 monedas cuando juegue.
          </p>
        </div>

        {/* Tu Enlace de Invitación */}
        <div className="mb-4">
          <label className="text-xs font-bold text-emerald-200/80 mb-1.5 block">
            Tu Enlace Personal de Invitación:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={myUrl}
              className="w-full rounded-xl bg-black/60 border border-emerald-500/40 px-3 py-2 text-xs font-mono text-emerald-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Botón WhatsApp */}
        <button
          onClick={handleShareWhatsApp}
          className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#2ae772] hover:to-[#20b859] py-2.5 px-4 text-xs sm:text-sm font-black uppercase text-white shadow-[0_4px_15px_rgba(37,211,102,0.35)] transition active:scale-95"
        >
          <Share2 size={16} /> Compartir Reto por WhatsApp (+150 Monedas)
        </button>

        {/* Canjear Código de un Amigo */}
        <div className="pt-3 border-t border-emerald-500/20">
          <label className="text-[11px] font-bold text-emerald-200/80 mb-1 block">
            ¿Te invitó un amigo? Ingresa su código aquí:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ej: JUAN99"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              className="w-full rounded-xl bg-black/60 border border-emerald-500/30 px-3 py-1.5 text-xs text-white placeholder-emerald-200/30 uppercase focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleApplyCode}
              disabled={applying || !friendCode.trim()}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition disabled:opacity-50"
            >
              {applying ? 'Canjeando...' : 'Reclamar 100'}
            </button>
          </div>

          {applyMsg && (
            <div className={`mt-2 text-xs flex items-center gap-1.5 font-medium ${applyMsg.isError ? 'text-red-400' : 'text-emerald-400'}`}>
              {applyMsg.isError ? <AlertCircle size={14} /> : <Check size={14} />}
              {applyMsg.text}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
