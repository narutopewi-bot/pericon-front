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

import { isSoundMuted, getSharedAudioContext, unlockAudioEngine } from './soundEffects';

let currentBufferSource: AudioBufferSourceNode | null = null;
let currentVoiceAudio: HTMLAudioElement | null = null;

/**
 * Detiene cualquier voz o narración activa en memoria
 */
export const stopVoiceAudio = () => {
  if (typeof window === 'undefined') return;
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
    } catch (_) {}
    currentBufferSource = null;
  }
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

// Cache de AudioBuffers en memoria (Web Audio API) para reproducción instantánea (0ms) y sin restricciones en móviles
const audioBufferCache: Map<string, AudioBuffer> = new Map();
const pendingLoads: Map<string, Promise<AudioBuffer | null>> = new Map();

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
 * Carga y decodifica un archivo de audio MP3 en memoria como AudioBuffer
 */
export const loadAudioBuffer = async (audioKey: string): Promise<AudioBuffer | null> => {
  if (typeof window === 'undefined') return null;
  const cleanKey = audioKey.replace(/\.mp3$/, '');

  if (audioBufferCache.has(cleanKey)) {
    return audioBufferCache.get(cleanKey)!;
  }

  if (pendingLoads.has(cleanKey)) {
    return pendingLoads.get(cleanKey)!;
  }

  const loadPromise = (async () => {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return null;

      const res = await fetch(`/audio/${cleanKey}.mp3`);
      if (!res.ok) {
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(cleanKey, decoded);
      return decoded;
    } catch (e) {
      console.warn(`[loadAudioBuffer] No se pudo decodificar /audio/${cleanKey}.mp3:`, e);
      return null;
    } finally {
      pendingLoads.delete(cleanKey);
    }
  })();

  pendingLoads.set(cleanKey, loadPromise);
  return loadPromise;
};

/**
 * Precarga los audios en la memoria del navegador como AudioBuffers decodificados
 */
export const preloadVoiceAudios = () => {
  if (typeof window === 'undefined') return;
  unlockAudioEngine();

  // Precargar primero los cantes más urgentes de la partida
  const priorityKeys = [
    'dame_tres', 'quiero_seis', 'van_nueve', 'acepto', 'no_quiero',
    'estas_en_tumba', 'caiste_en_tumba', 'la_cogia_propia', 'la_cogia_rival',
    'ganaste_la_ronda', 'ganaron_la_mano', 'victoria_partida', 'derrota_partida'
  ];

  priorityKeys.forEach(k => loadAudioBuffer(k));

  // En segundo plano, precargar el resto del catálogo
  const remainingKeys = ALL_VOICE_KEYS.filter(k => !priorityKeys.includes(k));
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      remainingKeys.forEach(k => loadAudioBuffer(k));
    });
  } else {
    setTimeout(() => {
      remainingKeys.forEach(k => loadAudioBuffer(k));
    }, 1200);
  }
};

function fallbackHtmlAudio(cleanKey: string, volume: number) {
  const audioUrl = `/audio/${cleanKey}.mp3`;
  try {
    const audio = new Audio(audioUrl);
    audio.volume = Math.min(1.0, Math.max(0, volume));
    currentVoiceAudio = audio;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err: any) => {
        if (err && err.name === 'AbortError') return;
        console.warn(`[playVoiceAudio-fallback] Error en audio ${audioUrl}:`, err);
      });
    }
  } catch (e) {
    console.warn(`[playVoiceAudio-fallback] Error instanciando audio:`, e);
  }
}

/**
 * Reproduce una locución con Web Audio API (AudioBuffer) garantizando reproducción
 * instantánea y permanente en celulares incluso ante mensajes WebSocket de la red.
 */
export const playVoiceAudio = (audioKey: string, _legacyFallbackText?: string, volume: number = 1.0) => {
  if (typeof window === 'undefined') return;
  if (isSoundMuted()) return;

  stopVoiceAudio();
  unlockAudioEngine();

  const cleanKey = audioKey.replace(/\.mp3$/, '');
  const ctx = getSharedAudioContext();

  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playFromBuffer = (buffer: AudioBuffer) => {
      try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        source.buffer = buffer;
        gainNode.gain.setValueAtTime(Math.min(1.0, Math.max(0, volume)), ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        currentBufferSource = source;

        source.onended = () => {
          if (currentBufferSource === source) {
            currentBufferSource = null;
          }
        };

        source.start(0);
        return true;
      } catch (err) {
        console.warn(`[playVoiceAudio] Error reproduciendo buffer ${cleanKey}:`, err);
        return false;
      }
    };

    if (audioBufferCache.has(cleanKey)) {
      playFromBuffer(audioBufferCache.get(cleanKey)!);
      return;
    }

    // Si aún no está en cache, cargarlo de inmediato y reproducirlo al terminar
    loadAudioBuffer(cleanKey).then(buffer => {
      if (buffer) {
        playFromBuffer(buffer);
      } else {
        fallbackHtmlAudio(cleanKey, volume);
      }
    });
    return;
  }

  // Fallback si Web Audio API no estuviera disponible
  fallbackHtmlAudio(cleanKey, volume);
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
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
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
    const ctx = getSharedAudioContext();
    if (!ctx) return;
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
    const ctx = getSharedAudioContext();
    if (!ctx) return;
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

