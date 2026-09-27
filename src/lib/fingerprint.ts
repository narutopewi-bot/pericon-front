/**
 * Generador de Huella Digital de Dispositivo (Device Fingerprinting)
 * Combina características físicas de hardware (Canvas 3D/2D, GPU, AudioContext,
 * resolución de pantalla, procesador y plataforma) para identificar un dispositivo físico
 * incluso si el usuario utiliza Modo Incógnito o borra cookies.
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

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server_rendered";

  try {
    const components: string[] = [];

    // 1. Pantalla y resolución física
    components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
    components.push(`ratio:${window.devicePixelRatio || 1}`);

    // 2. Hardware y Sistema
    const nav = window.navigator as any;
    components.push(`cores:${nav.hardwareConcurrency || 2}`);
    components.push(`mem:${nav.deviceMemory || 4}`);
    components.push(`platform:${nav.platform || "unknown"}`);
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || ""}`);
    components.push(`lang:${nav.language || ""}`);

    // 3. Canvas 2D Fingerprint (Renderizado microscópico de GPU y fuentes)
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

    // 4. WebGL / GPU Renderer
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

    // Generar 4 partes de hash para un código robusto de 32 caracteres
    const raw = components.join("|||");
    const p1 = simpleHash(raw);
    const p2 = simpleHash(raw.split("").reverse().join(""));
    const p3 = simpleHash(raw.slice(Math.floor(raw.length / 2)) + raw.slice(0, Math.floor(raw.length / 2)));
    const p4 = simpleHash(`${window.screen.width * 31}-${nav.hardwareConcurrency || 2}-${nav.platform}`);

    return `fp_${p1}${p2}${p3}${p4}`;
  } catch (err) {
    console.warn("[Fingerprint] Error generando huella digital:", err);
    return `fp_fallback_${Date.now()}`;
  }
}
