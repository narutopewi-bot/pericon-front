/**
 * Generador de Huella Digital de Dispositivo (Device Fingerprinting)
 * Combina almacenamiento persistente (localStorage y cookies) con características físicas 
 * de hardware inalterables (Canvas 2D, WebGL GPU, resolución normalizada, núcleos y audio)
 * para identificar de forma precisa y consistente un celular o computador, incluso en modo incógnito.
 */

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convertir a entero de 32 bits
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function getStoredCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setStoredCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 año
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server_rendered";

  // 1. Revisar si ya tenemos un anclaje persistente en LocalStorage o Cookies
  try {
    const localFp = localStorage.getItem("pericon_device_fp");
    if (localFp && localFp.startsWith("fp_") && localFp.length >= 20) {
      setStoredCookie("pericon_device_fp", localFp);
      return localFp;
    }

    const cookieFp = getStoredCookie("pericon_device_fp");
    if (cookieFp && cookieFp.startsWith("fp_") && cookieFp.length >= 20) {
      localStorage.setItem("pericon_device_fp", cookieFp);
      return cookieFp;
    }
  } catch {
    // Si cookies o localStorage están bloqueados (modo incógnito estricto), se continúa con hardware
  }

  try {
    const components: string[] = [];

    // 2. Pantalla y resolución física (Normalizada para evitar cambios al rotar el teléfono)
    const sw = Math.min(window.screen.width, window.screen.height);
    const sh = Math.max(window.screen.width, window.screen.height);
    components.push(`screen:${sw}x${sh}x${window.screen.colorDepth || 24}`);
    components.push(`ratio:${window.devicePixelRatio || 1}`);

    // 3. Hardware y Sistema Operativo
    const nav = window.navigator as any;
    components.push(`cores:${nav.hardwareConcurrency || 2}`);
    components.push(`mem:${nav.deviceMemory || 4}`);
    components.push(`platform:${nav.platform || "unknown"}`);
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || ""}`);
    components.push(`lang:${nav.language || ""}`);

    // 4. Canvas 2D Fingerprint (Renderizado microscópico de GPU y rasterizado de fuentes)
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial', 'Helvetica', sans-serif";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Pericón 🇻🇪 Casona 1910!", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("El Pericón Carora Game", 4, 35);
        components.push(`canvas:${canvas.toDataURL()}`);
      }
    } catch {
      components.push("canvas:unsupported");
    }

    // 5. WebGL / GPU Renderer (Chipset exacto: Mali, Adreno, Apple GPU, etc.)
    try {
      const glCanvas = document.createElement("canvas");
      const gl = glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          components.push(`gpu:${vendor}~${renderer}`);
        }
      }
    } catch {
      components.push("gpu:unsupported");
    }

    // 6. AudioContext Fingerprint (DSP acústico específico del chip de audio)
    try {
      const OfflineCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (OfflineCtx) {
        const actx = new OfflineCtx(1, 44100, 44100);
        const osc = actx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(10000, actx.currentTime);
        const comp = actx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-50, actx.currentTime);
        comp.knee.setValueAtTime(40, actx.currentTime);
        comp.ratio.setValueAtTime(12, actx.currentTime);
        comp.attack.setValueAtTime(0, actx.currentTime);
        comp.release.setValueAtTime(0.25, actx.currentTime);
        osc.connect(comp);
        comp.connect(actx.destination);
        osc.start(0);

        const renderedBuffer = await actx.startRendering();
        let audioSum = 0;
        const channelData = renderedBuffer.getChannelData(0);
        for (let i = 4500; i < 5000; i++) {
          audioSum += Math.abs(channelData[i]);
        }
        components.push(`audio:${audioSum.toFixed(6)}`);
      }
    } catch {
      components.push("audio:unsupported");
    }

    // Generar código hash robusto de 32 caracteres
    const raw = components.join("|||");
    const p1 = simpleHash(raw);
    const p2 = simpleHash(raw.split("").reverse().join(""));
    const p3 = simpleHash(raw.slice(Math.floor(raw.length / 2)) + raw.slice(0, Math.floor(raw.length / 2)));
    const p4 = simpleHash(`${sw * 31}-${sh * 17}-${nav.hardwareConcurrency || 2}-${nav.platform}`);

    const finalFp = `fp_${p1}${p2}${p3}${p4}`;

    // Guardar para futuras sesiones en el mismo navegador
    try {
      localStorage.setItem("pericon_device_fp", finalFp);
      setStoredCookie("pericon_device_fp", finalFp);
    } catch {}

    return finalFp;
  } catch (err) {
    console.warn("[Fingerprint] Error generando huella digital:", err);
    // Fallback determinista (sin fechas aleatorias) basado en hardware mínimo
    const nav = typeof window !== "undefined" ? (window.navigator as any) : {};
    const fallbackRaw = `${nav.userAgent || "ua"}|${window.screen?.colorDepth || 24}|${nav.language || "es"}`;
    const fbHash = simpleHash(fallbackRaw);
    return `fp_fb_${fbHash}`;
  }
}
