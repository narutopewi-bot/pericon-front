/**
 * Puente de Integración Nativa con la APK de Android (El Pericón)
 * Detecta y aprovecha las funciones nativas de AndroidApp inyectadas en WebView.
 */

declare global {
  interface Window {
    AndroidApp?: {
      isApk(): boolean;
      getDeviceId(): string;
      vibrate(milliseconds: number): void;
      vibratePattern(patternCsv: string): void;
      showNotification(title: string, message: string, deepLink?: string): void;
      showToast(msg: string): void;
      keepScreenOn(enable: boolean): void;
    };
  }
}

export function isApkEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.AndroidApp?.isApk() ||
    (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("ElPericonApp"))
  );
}

export function triggerNativeHaptic(type: 'light' | 'medium' | 'heavy' | 'turn' | 'win'): void {
  if (typeof window === "undefined") return;

  if (window.AndroidApp) {
    try {
      switch (type) {
        case 'light':
          window.AndroidApp.vibrate(15);
          break;
        case 'medium':
          window.AndroidApp.vibrate(40);
          break;
        case 'heavy':
          window.AndroidApp.vibratePattern("0,60,40,90");
          break;
        case 'turn':
          window.AndroidApp.vibratePattern("0,100,60,150");
          break;
        case 'win':
          window.AndroidApp.vibratePattern("0,50,50,50,50,150");
          break;
      }
      return;
    } catch (_) {}
  }

  // Fallback web estándar si el navegador lo permite
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(40);
          break;
        case 'heavy':
        case 'turn':
          navigator.vibrate([0, 100, 60, 150]);
          break;
        case 'win':
          navigator.vibrate([0, 50, 50, 50, 50, 150]);
          break;
      }
    } catch (_) {}
  }
}

export function showNativeNotification(title: string, message: string, deepLink?: string): void {
  if (typeof window === "undefined") return;

  if (window.AndroidApp) {
    try {
      window.AndroidApp.showNotification(title, message, deepLink || "");
      return;
    } catch (e) {
      console.warn("[NativeBridge] Error invoking showNotification", e);
    }
  }

  // Fallback en navegador con Notification API
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: message,
        icon: "/icons/icon-192x192.png"
      });
    } catch (_) {}
  }
}

export function showNativeToast(msg: string): void {
  if (typeof window !== "undefined" && window.AndroidApp) {
    try {
      window.AndroidApp.showToast(msg);
    } catch (_) {}
  }
}
