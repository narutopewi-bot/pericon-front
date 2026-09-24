// Efectos sensoriales: Vibración Háptica, Síntesis de Voz y Efectos de Sonido Web Audio

export type VibrationType = 'pedir' | 'accept' | 'reject' | 'tumba' | 'winRound' | 'winMatch' | 'alert';

/**
 * Activa la vibración del dispositivo (especialmente celulares Android/compatibles)
 */
export const vibrateDevice = (type: VibrationType | number[]) => {
  if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) {
    return;
  }

  try {
    if (Array.isArray(type)) {
      navigator.vibrate(type);
      return;
    }

    switch (type) {
      case 'pedir':
        // Dos pulsos firmes de reto
        navigator.vibrate([150, 70, 180]);
        break;
      case 'accept':
        // Pulso firme de confirmación
        navigator.vibrate([220]);
        break;
      case 'reject':
        // Dos pulsos secos
        navigator.vibrate([80, 60, 80]);
        break;
      case 'tumba':
        // Patrón solemne y dramático
        navigator.vibrate([300, 100, 300, 100, 450]);
        break;
      case 'winRound':
        // Patrón festivo
        navigator.vibrate([120, 60, 120, 60, 250]);
        break;
      case 'winMatch':
        // Victoria absoluta
        navigator.vibrate([150, 80, 200, 80, 350, 100, 500]);
        break;
      case 'alert':
      default:
        navigator.vibrate([100, 50, 100]);
        break;
    }
  } catch (e) {
    console.warn("Vibration API error:", e);
  }
};

import { isSoundMuted } from './soundEffects';

let currentVoiceAudio: HTMLAudioElement | null = null;

/**
 * Detiene cualquier voz o narración activa en memoria
 */
export const stopVoiceAudio = () => {
  if (typeof window === 'undefined') return;
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch (_) {}
    currentVoiceAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
};

/**
 * Reproduce un audio MP3 personalizado grabado en /audio/${audioKey}.mp3,
 * o recurre a la voz sintética (speakPhrase) como respaldo automático.
 */
export const playVoiceAudio = (audioKey: string, fallbackText: string, volume: number = 1.0) => {
  if (typeof window === 'undefined') return;
  if (isSoundMuted()) return;

  stopVoiceAudio();

  try {
    const audio = new Audio(`/audio/${audioKey}.mp3`);
    audio.volume = Math.min(1.0, Math.max(0, volume));
    currentVoiceAudio = audio;
    let hasPlayed = false;

    audio.onerror = () => {
      if (!hasPlayed) {
        hasPlayed = true;
        speakPhrase(fallbackText);
      }
    };

    audio.onended = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        hasPlayed = true;
      }).catch(() => {
        if (!hasPlayed) {
          hasPlayed = true;
          speakPhrase(fallbackText);
        }
      });
    }
  } catch (e) {
    speakPhrase(fallbackText);
  }
};

/**
 * Reproduce voz hablada usando la Web Speech API nativa del navegador en Español
 */
export const speakPhrase = (phrase: string, rate: number = 1.05, pitch: number = 1.0) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  if (isSoundMuted()) return;

  try {
    // Si ya está hablando algo viejo, cancelamos para dar prioridad al evento actual
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'es-ES'; // Español estándar
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    // Buscar una voz en español disponible en el sistema del usuario
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.toLowerCase().includes('es') || v.lang.toLowerCase().includes('spa'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("SpeechSynthesis error:", e);
  }
};

/**
 * Sintetizador de tonos y efectos de sonido usando Web Audio API nativo (sin requerir archivos externos)
 */
export const playSynthSound = (type: 'canto' | 'accept' | 'reject' | 'tumba' | 'win') => {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'canto') {
      // Tono ascendente de desafío
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'accept') {
      // Doble campana de aprobación
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // Do
      osc.frequency.setValueAtTime(659.25, now + 0.12); // Mi
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'reject') {
      // Tono descendente
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'tumba') {
      // Acorde dramático
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.6);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'win') {
      // Fanfarria breve victoriosa
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // La
      osc.frequency.setValueAtTime(554.37, now + 0.1); // Do#
      osc.frequency.setValueAtTime(659.25, now + 0.2); // Mi
      osc.frequency.setValueAtTime(880, now + 0.3); // La alto
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    // Audio context may require user gesture on some browsers
  }
};

/**
 * Sonido al posar o lanzar una carta en la mesa
 */
export const playCardSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
};

/**
 * Sonido de viento suave (swoosh) para cartas volando y retorno al mazo
 */
export const playSwooshSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
};

