// Sistema unificado de reporte y monitoreo de incidencias para Pericón

export interface AppErrorReport {
  source: 'Game2v2' | 'Game1v1' | 'Solitaire' | 'Client' | 'SignalR';
  errorMessage: string;
  roomName?: string;
  username?: string;
  userId?: number | string;
  stackTrace?: string;
  extraData?: Record<string, any> | string;
  screenshotUrl?: string;
  captureUrl?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";

let lastReportedTime = 0;
let lastReportedMessage = '';

export async function reportAppError(report: AppErrorReport): Promise<void> {
  try {
    const rawMsg = report.errorMessage || '';
    const lowerMsg = rawMsg.toLowerCase();

    // FILTRO INTELIGENTE DE CONECTIVIDAD MÓVIL:
    // Los microcortes de red celular (cambio de antena 4G, fluctuaciones temporales de señal o wifi),
    // cierres limpios o transitorios de WebSockets, y estados transitorios de reconexión de SignalR
    // son eventos esperables de conectividad del cliente, NO errores de programación o del sistema.
    const isTransientNetworkIssue =
      lowerMsg.includes('reconnecting') ||
      lowerMsg.includes('server timeout elapsed without receiving a message') ||
      lowerMsg.includes("not in the 'connected' state") ||
      lowerMsg.includes("not in the connected state") ||
      lowerMsg.includes('estado no conectado') ||
      lowerMsg.includes('websocket closed') ||
      lowerMsg.includes('1006') ||
      lowerMsg.includes('cannot send data') ||
      lowerMsg.includes('underlying connection was closed') ||
      lowerMsg.includes('invocation canceled') ||
      lowerMsg.includes('connection disconnected') ||
      lowerMsg.includes('failed to fetch') ||
      lowerMsg.includes('networkerror') ||
      lowerMsg.includes('aborted');

    if (isTransientNetworkIssue) {
      console.warn(`[ErrorLogger - Filtrado microcorte móvil]: ${report.source} - ${rawMsg}`);
      return; // No saturar la base de datos de administración con falsos positivos de red
    }

    // Evitar spam duplicado de exactamente el mismo error en menos de 5 segundos
    const now = Date.now();
    if (rawMsg === lastReportedMessage && now - lastReportedTime < 5000) {
      return;
    }
    lastReportedTime = now;
    lastReportedMessage = rawMsg;

    console.error(`[ErrorLogger - ${report.source}]`, rawMsg, report.extraData);

    let parsedUserId: number | null = null;
    if (report.userId) {
      const num = typeof report.userId === 'number' ? report.userId : parseInt(report.userId.toString(), 10);
      if (!isNaN(num) && num > 0) parsedUserId = num;
    }

    const capture = report.screenshotUrl || report.captureUrl;
    let serializedExtra: string | null = null;
    if (typeof report.extraData === 'object' && report.extraData !== null) {
      serializedExtra = JSON.stringify({ ...report.extraData, ...(capture ? { screenshotUrl: capture } : {}) });
    } else if (capture) {
      serializedExtra = JSON.stringify({ extra: report.extraData, screenshotUrl: capture });
    } else if (typeof report.extraData === 'string') {
      serializedExtra = report.extraData;
    }

    const payload = {
      source: report.source || 'Client',
      roomName: report.roomName || null,
      username: report.username || null,
      userId: parsedUserId,
      errorMessage: rawMsg,
      stackTrace: report.stackTrace || (new Error().stack) || null,
      extraData: serializedExtra
    };

    await fetch(`${API_URL}/api/admin/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (err) {
    // Silencioso para no romper la app
  }
}
