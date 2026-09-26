import * as signalR from "@microsoft/signalr";

/**
 * Verifica si la conexión de SignalR está activa y lista para recibir comandos.
 */
function getSignalRState(conn: signalR.HubConnection): signalR.HubConnectionState {
  return conn.state;
}

export function isSignalRConnected(connection: signalR.HubConnection | null): boolean {
  return !!connection && getSignalRState(connection) === signalR.HubConnectionState.Connected;
}

/**
 * Espera a que la conexión de SignalR alcance el estado 'Connected'.
 * Es ideal para cuando la conexión está en 'Connecting' o 'Reconnecting' debido a microcortes de red.
 */
export async function waitForSignalRConnection(
  connection: signalR.HubConnection | null,
  timeoutMs: number = 6000
): Promise<boolean> {
  if (!connection) return false;
  if (getSignalRState(connection) === signalR.HubConnectionState.Connected) return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const currentState = getSignalRState(connection);
    if (currentState === signalR.HubConnectionState.Connected) {
      return true;
    }
    // Si quedó desconectada, intentar reactivarla
    if (currentState === signalR.HubConnectionState.Disconnected) {
      try {
        await connection.start();
        return true;
      } catch (e) {
        // Seguir esperando o reintentando
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return getSignalRState(connection) === signalR.HubConnectionState.Connected;
}

/**
 * Invoca un método de SignalR de manera altamente tolerante a fallos:
 * 1. Comprueba si el socket está reconectando o desconectado y espera/reactiva activamente.
 * 2. Realiza hasta 3 reintentos con espera activa de reconexión si ocurre un microcorte móvil.
 * 3. Proporciona diagnósticos claros y rollback defensivo de cartas ante cortes prolongados.
 */
export async function safeSignalRInvoke(
  connection: signalR.HubConnection | null,
  methodName: string,
  ...args: any[]
): Promise<any> {
  if (!connection) {
    throw new Error(`[safeSignalRInvoke] Conexión SignalR no instanciada para '${methodName}'.`);
  }

  const isReady = await waitForSignalRConnection(connection, 6000);
  if (!isReady && getSignalRState(connection) !== signalR.HubConnectionState.Connected) {
    // Intento forzado de start si está en Disconnected
    if (getSignalRState(connection) === signalR.HubConnectionState.Disconnected) {
      try {
        await connection.start();
      } catch (err) {
        console.warn(`[safeSignalRInvoke] Error al reconectar socket antes de ${methodName}:`, err);
      }
    }
  }

  let lastError: any = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (getSignalRState(connection) === signalR.HubConnectionState.Connected) {
        return await connection.invoke(methodName, ...args);
      } else {
        throw new Error(`Conexión SignalR en estado no conectado (${getSignalRState(connection)})`);
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err || "");
      const isTransientConnectionIssue =
        errMsg.includes("Cannot send data") ||
        errMsg.includes("WebSocket closed") ||
        errMsg.includes("not in the 'Connected' State") ||
        errMsg.includes("estado no conectado") ||
        errMsg.includes("Reconnecting") ||
        errMsg.includes("Connecting") ||
        errMsg.includes("negotiate") ||
        errMsg.includes("1006");

      if (isTransientConnectionIssue && attempt < maxAttempts) {
        console.warn(
          `[safeSignalRInvoke] Intento ${attempt}/${maxAttempts} para '${methodName}' detectó microcorte celular (${errMsg}). Esperando reconexión activa...`
        );
        // Espera activa de hasta 2500ms para permitir que la red móvil restablezca el socket
        const reconnected = await waitForSignalRConnection(connection, 2500);
        if (!reconnected && getSignalRState(connection) === signalR.HubConnectionState.Disconnected) {
          try {
            await connection.start();
          } catch (_) {}
        }
        continue;
      }

      // Si no es un problema transitorio de conexión o se agotaron los intentos, lanzar el error
      throw err;
    }
  }

  throw lastError;
}
