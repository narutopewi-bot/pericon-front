'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Play, CheckCircle2, AlertCircle, RefreshCw, X, Radio } from 'lucide-react';
import { testVoiceAudio, playVoiceAudio, stopVoiceAudio } from '@/lib/gameEffects';
import { getSharedAudioContext, unlockAudioEngine, isSoundMuted, setSoundMuted } from '@/lib/soundEffects';
import { WebRTCVoiceManager } from '@/lib/webrtcVoiceManager';

interface AudioDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceManager?: WebRTCVoiceManager | null;
}

export default function AudioDiagnosticModal({ isOpen, onClose, voiceManager }: AudioDiagnosticModalProps) {
  const [activeTab, setActiveTab] = useState<'voices' | 'mic'>('voices');
  const [audioContextState, setAudioContextState] = useState<string>('desconocido');
  const [lastTestResult, setLastTestResult] = useState<{ key: string; success: boolean; engine: string; error?: string } | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  // Estados de micrófono
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [isEchoActive, setIsEchoActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);

  const localVoiceManagerRef = useRef<WebRTCVoiceManager | null>(null);

  // Actualizar estado del AudioContext
  useEffect(() => {
    if (!isOpen) return;
    const ctx = getSharedAudioContext();
    if (ctx) {
      setAudioContextState(ctx.state);
      const updateState = () => {
        if (ctx) setAudioContextState(ctx.state);
      };
      ctx.addEventListener('statechange', updateState);
      return () => {
        ctx.removeEventListener('statechange', updateState);
      };
    }
  }, [isOpen]);

  // Si no se proporcionó voiceManager, inicializamos uno local solo para la prueba de micro
  useEffect(() => {
    if (!isOpen) {
      if (localVoiceManagerRef.current) {
        localVoiceManagerRef.current.stopEchoTest();
        localVoiceManagerRef.current.destroy();
        localVoiceManagerRef.current = null;
      }
      setIsEchoActive(false);
      setIsMicTesting(false);
      setMicVolume(0);
      return;
    }

    const activeVM = voiceManager || (localVoiceManagerRef.current = new WebRTCVoiceManager());
    activeVM.onLocalVolumeChange = (vol) => {
      setMicVolume(vol);
    };

    return () => {
      if (localVoiceManagerRef.current) {
        localVoiceManagerRef.current.stopEchoTest();
        localVoiceManagerRef.current.destroy();
        localVoiceManagerRef.current = null;
      }
    };
  }, [isOpen, voiceManager]);

  const handleTestVoice = async (key: string, label: string) => {
    try {
      setIsTestingAudio(true);
      unlockAudioEngine();
      const res = await testVoiceAudio(key);
      setLastTestResult({ key: label, ...res });
      const ctx = getSharedAudioContext();
      if (ctx) setAudioContextState(ctx.state);
    } catch (e: any) {
      console.warn("Fallo al probar audio:", e);
    } finally {
      setIsTestingAudio(false);
    }
  };

  const handleStartMicTest = async () => {
    try {
      const activeVM = voiceManager || localVoiceManagerRef.current;
      if (!activeVM) return;

      unlockAudioEngine();
      const granted = await activeVM.requestMicrophone();
      setMicPermissionGranted(granted);
      setIsMicTesting(granted);
    } catch (e: any) {
      console.warn("Fallo al iniciar prueba de micrófono:", e);
      setMicPermissionGranted(false);
      setIsMicTesting(false);
    }
  };

  const handleToggleEcho = async () => {
    try {
      const activeVM = voiceManager || localVoiceManagerRef.current;
      if (!activeVM) return;

      if (!isEchoActive) {
        unlockAudioEngine();
        const started = await activeVM.startEchoTest();
        if (started) {
          setIsEchoActive(true);
          setIsMicTesting(true);
        }
      } else {
        activeVM.stopEchoTest();
        setIsEchoActive(false);
      }
    } catch (e: any) {
      console.warn("Fallo en prueba de eco:", e);
      setIsEchoActive(false);
    }
  };

  const handleUnlockManually = () => {
    unlockAudioEngine();
    const ctx = getSharedAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        setAudioContextState(ctx.state);
      });
    }
  };

  if (!isOpen) return null;

  const testPhrases = [
    { key: 'dame_tres', label: '¡Dame Tres!' },
    { key: 'quiero_seis', label: '¡Quiero Seis!' },
    { key: 'van_nueve', label: '¡Van Nueve!' },
    { key: 'acepto', label: '¡Acepto!' },
    { key: 'no_quiero', label: '¡No Quiero!' },
    { key: 'estas_en_tumba', label: '¡Estás en Tumba!' },
    { key: 'la_cogia_propia', label: '¡La Cogía!' },
    { key: 'ganaste_la_ronda', label: '¡Ganaste la Ronda!' },
    { key: 'victoria_partida', label: '¡Victoria de Partida!' },
    { key: 'mas_18', label: '🔞 Aviso +18 (Chivo de Carora)' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c140d] via-[#120e0a] to-[#0a0705] border-2 border-amber-500/70 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden text-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-500/30 flex items-center justify-between bg-amber-950/40">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎧</span>
            <div>
              <h3 className="text-base font-black text-amber-300 uppercase tracking-wide">
                Diagnóstico y Prueba de Audio
              </h3>
              <p className="text-[11px] text-stone-300">
                Verifica las voces del locutor y prueba tu micrófono en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-amber-500/20 bg-black/40">
          <button
            onClick={() => setActiveTab('voices')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'voices'
                ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Volume2 size={16} />
            <span>Voces del Locutor</span>
          </button>
          <button
            onClick={() => setActiveTab('mic')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'mic'
                ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Mic size={16} />
            <span>Prueba de Micrófono</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'voices' && (
            <div className="space-y-4">
              {/* Barra de Estado del Motor */}
              <div className="p-3 bg-stone-900/90 border border-stone-700 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-300">Estado del Audio:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    audioContextState === 'running'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                  }`}>
                    {audioContextState === 'running' ? 'Activo (Running)' : 'En Pausa (Suspended)'}
                  </span>
                </div>
                {audioContextState !== 'running' && (
                  <button
                    onClick={handleUnlockManually}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg text-[11px] transition"
                  >
                    ⚡ Despertar Audio
                  </button>
                )}
              </div>

              {/* Resultado de la última prueba */}
              {lastTestResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                  lastTestResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/50 text-red-200'
                }`}>
                  {lastTestResult.success ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {lastTestResult.success ? `¡Reproducido con éxito: ${lastTestResult.key}!` : `Fallo al reproducir: ${lastTestResult.key}`}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Motor utilizado: {lastTestResult.engine}
                      {lastTestResult.error ? ` (${lastTestResult.error})` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de cantes */}
              <div>
                <p className="text-xs text-stone-300 mb-2.5 font-medium">
                  Toca cualquier frase para escucharla sonar en tus altavoces:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {testPhrases.map((phrase) => (
                    <button
                      key={phrase.key}
                      onClick={() => handleTestVoice(phrase.key, phrase.label)}
                      disabled={isTestingAudio}
                      className="p-2.5 bg-gradient-to-b from-stone-800 to-stone-900 hover:from-amber-950 hover:to-stone-900 border border-amber-600/40 hover:border-amber-400 text-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow cursor-pointer text-center"
                    >
                      <Play size={13} className="text-amber-400 shrink-0" fill="currentColor" />
                      <span className="truncate">{phrase.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mic' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-stone-900/90 border border-stone-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-200">Entrada de Micrófono</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isMicTesting
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400'
                  }`}>
                    {isMicTesting ? 'Captando Audio' : 'Inactivo'}
                  </span>
                </div>

                {/* Vúmetro de Volumen en Vivo */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1 font-mono">
                    <span>Nivel de voz:</span>
                    <span className="font-bold text-amber-300">{micVolume}%</span>
                  </div>
                  <div className="w-full bg-stone-800 h-3 rounded-full overflow-hidden border border-stone-700 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-75 ${
                        micVolume > 60
                          ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500'
                          : micVolume > 15
                          ? 'bg-gradient-to-r from-emerald-500 to-yellow-400'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(4, micVolume)}%` }}
                    />
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-2 pt-1">
                  {!isMicTesting ? (
                    <button
                      onClick={handleStartMicTest}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mic size={16} />
                      <span>Activar y Probar Micrófono</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleEcho}
                      className={`w-full py-2.5 font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                        isEchoActive
                          ? 'bg-red-700 hover:bg-red-600 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-black'
                      }`}
                    >
                      <Radio size={16} className={isEchoActive ? 'animate-pulse' : ''} />
                      <span>
                        {isEchoActive ? '🛑 Detener Eco en Vivo' : '🔁 Escuchar Mi Propia Voz (Prueba de Altavoz)'}
                      </span>
                    </button>
                  )}
                </div>

                {isEchoActive && (
                  <p className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30 text-center animate-pulse">
                    🔊 ¡Eco activo! Habla por tu micrófono y escucha cómo sale tu voz por tus altavoces o audífonos.
                  </p>
                )}
              </div>

              {/* Explicación de Conexión de Voz con Servidores TURN */}
              <div className="p-3 bg-black/40 border border-stone-800 rounded-xl text-[11px] text-stone-400 space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Servidores STUN y TURN Configurados</span>
                </div>
                <p>
                  El chat de voz utiliza servidores de retransmisión (TURN) sobre puertos 80 y 443 para garantizar conexión entre teléfonos móviles y computadoras incluso en redes Digitel, Movistar o Cantv con NAT estricto.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-amber-500/20 bg-black/40 flex justify-between items-center text-[11px] text-stone-400">
          <span>El Pericón • Sistema de Audio y Voz</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
