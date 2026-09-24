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

// Cache en memoria para reproducción instantánea sin latencia de red
const voiceAudioCache: Map<string, HTMLAudioElement> = new Map();

// Catálogo de los 42 audios oficiales del locutor
export const ALL_VOICE_KEYS = [
  'dame_tres', 'quiero_seis', 'van_nueve', 'acepto', 'no_quiero',
  'dijeron_quiero', 'no_quisieron', 'no_quisimos', 'pedimos_tres',
  'pedimos_seis', 'pedimos_nueve', 'estas_en_tumba', 'obligado',
  'mano_tumba_aceptada', 'pasaste_en_tumba', 'rivales_pasaron_tumba',
  'caiste_en_tumba', 'rivales_cayeron_tumba', 'en_tumba_no_se_pide',
  'tumba_completada', 'ganaste_en_obligado', 'la_cogia', 'la_cogia_propia',
  'la_cogia_rival', 'regla_del_pelao', 'ultimo_aumento_tuyo',
  'tiempo_agotado', 'punto_para_ti', 'punto_para_rivales',
  'ganaste_la_ronda', 'ganaron_la_mano', 'victoria_partida',
  'victoria_partida_alt', 'derrota_partida', 'tutorial_paso_1',
  'tutorial_paso_2', 'tutorial_paso_3', 'tutorial_paso_4',
  'tutorial_paso_5', 'tutorial_paso_6', 'tutorial_reto_acepto',
  'tutorial_reto_rechazo'
];

/**
 * Precarga todos los audios en la memoria del navegador para que no dependan
 * de la velocidad de la conexión durante las jugadas.
 */
export const preloadVoiceAudios = () => {
  if (typeof window === 'undefined') return;
  ALL_VOICE_KEYS.forEach(key => {
    if (!voiceAudioCache.has(key)) {
      try {
        const audio = new Audio(`/audio/${key}.mp3`);
        audio.preload = 'auto';
        audio.load();
        voiceAudioCache.set(key, audio);
      } catch (_) {}
    }
  });
};

/**
 * Reproduce un audio MP3 grabado por el locutor desde la memoria local.
 * Ya no recurre a la voz sintética para evitar que se escuchen voces robóticas en fallos o pausas.
 */
export const playVoiceAudio = (audioKey: string, _legacyFallbackText?: string, volume: number = 1.0) => {
  if (typeof window === 'undefined') return;
  if (isSoundMuted()) return;

  stopVoiceAudio();

  const cleanKey = audioKey.replace(/\.mp3$/, '');
  const audioUrl = `/audio/${cleanKey}.mp3`;

  // Autoprecargar catálogo en el primer uso si aún no se ha hecho
  if (voiceAudioCache.size === 0) {
    preloadVoiceAudios();
  }

  let audio = voiceAudioCache.get(cleanKey);
  if (!audio) {
    try {
      audio = new Audio(audioUrl);
      audio.preload = 'auto';
      voiceAudioCache.set(cleanKey, audio);
    } catch (e) {
      console.warn(`[playVoiceAudio] No se pudo instanciar audio ${audioUrl}:`, e);
      return;
    }
  }

  try {
    audio.currentTime = 0;
    audio.volume = Math.min(1.0, Math.max(0, volume));
    currentVoiceAudio = audio;

    audio.onended = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Reproduciendo normalmente
        })
        .catch((err: any) => {
          // AbortError ocurre legítimamente cuando otra acción pausa el audio anterior.
          // En NINGÚN caso activamos la voz robótica aquí.
          if (err && err.name === 'AbortError') {
            return;
          }
          console.warn(`[playVoiceAudio] Reproducción bloqueada o postergada para ${audioUrl}:`, err);
        });
    }
  } catch (e) {
    console.warn(`[playVoiceAudio] Error en audio ${audioUrl}:`, e);
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

