// Sistema unificado de reporte y monitoreo de errores para Pericón

export interface AppErrorReport {
  source: 'Game2v2' | 'Game1v1' | 'Solitaire' | 'Client' | 'SignalR';
  errorMessage: string;
  roomName?: string;
  username?: string;
  userId?: number | string;
  stackTrace?: string;
  extraData?: Record<string, any> | string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";

let lastReportedTime = 0;
let lastReportedMessage = '';

export async function reportAppError(report: AppErrorReport): Promise<void> {
  try {
    // Evitar spam duplicado de exactamente el mismo error en menos de 3 segundos
    const now = Date.now();
    if (report.errorMessage === lastReportedMessage && now - lastReportedTime < 3000) {
      return;
    }
    lastReportedTime = now;
    lastReportedMessage = report.errorMessage;

    console.error(`[ErrorLogger - ${report.source}]`, report.errorMessage, report.extraData);

    let parsedUserId: number | null = null;
    if (report.userId) {
      const num = typeof report.userId === 'number' ? report.userId : parseInt(report.userId.toString(), 10);
      if (!isNaN(num) && num > 0) parsedUserId = num;
    }

    const payload = {
      source: report.source || 'Client',
      roomName: report.roomName || null,
      username: report.username || null,
      userId: parsedUserId,
      errorMessage: report.errorMessage,
      stackTrace: report.stackTrace || (new Error().stack) || null,
      extraData: typeof report.extraData === 'object' ? JSON.stringify(report.extraData) : (report.extraData || null)
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
