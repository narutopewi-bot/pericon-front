import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export const useSignalR = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api-production.up.railway.app";
    const hubUrl = `${baseUrl}/hub`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Reintentos ultra-rápidos en redes móviles (nunca se rinde)
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 500;
          if (retryContext.previousRetryCount === 2) return 1000;
          if (retryContext.previousRetryCount === 3) return 2000;
          if (retryContext.previousRetryCount <= 10) return 3000;
          return 5000; // Mantener reintentos cada 5s indefinidamente
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Reducir intervalos para anticiparse a cierres de CGNAT / proxies móviles
    newConnection.serverTimeoutInMilliseconds = 30000; // 30s de silencio máximo antes de declarar caída
    newConnection.keepAliveIntervalInMilliseconds = 5000; // Ping cada 5s para mantener el túnel TCP activo

    let isMounted = true;
    let hasInitiallyConnected = false;

    const notifyConnectionRestored = (connId?: string | null) => {
      const activeId = connId || newConnection.connectionId || "";
      console.log("[SignalR] Notificando restablecimiento global de conexión:", activeId);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pericon:signalr:restored", {
            detail: { connectionId: activeId }
          })
        );
      }
    };

    const startConn = async () => {
      if (newConnection.state === signalR.HubConnectionState.Disconnected) {
        try {
          await newConnection.start();
          console.log("[SignalR] Conectado con éxito. ConnectionId:", newConnection.connectionId);
          if (isMounted) setConnection(newConnection);
          if (hasInitiallyConnected) {
            notifyConnectionRestored(newConnection.connectionId);
          }
          hasInitiallyConnected = true;
        } catch (err) {
          console.error("[SignalR] Error al conectar:", err);
          setTimeout(() => {
            if (isMounted) startConn();
          }, 3000);
        }
      }
    };

    startConn();

    newConnection.onreconnecting((error) => {
      console.warn("[SignalR] Reconectando señal de red...", error);
    });

    newConnection.onreconnected((connectionId) => {
      console.log("[SignalR] Reconectado exitosamente. Nuevo ID:", connectionId);
      if (isMounted) setConnection(newConnection);
      notifyConnectionRestored(connectionId);
    });

    newConnection.onclose(async (error) => {
      console.warn("[SignalR] Conexión cerrada:", error);
      setTimeout(() => {
        if (isMounted) startConn();
      }, 3000);
    });

    let isVerifying = false;
    const verifyOrRecoverConnection = async () => {
      if (isVerifying || !isMounted) return;
      isVerifying = true;
      try {
        if (newConnection.state === signalR.HubConnectionState.Disconnected) {
          console.log("[SignalR] Estado Disconnected en primer plano. Reconectando...");
          await startConn();
          return;
        }

        if (
          newConnection.state === signalR.HubConnectionState.Connecting ||
          newConnection.state === signalR.HubConnectionState.Reconnecting
        ) {
          console.warn("[SignalR] Socket en estado transitorio al volver a primer plano.");
          // Si continúa congelado tras 4s, forzar reinicio limpio
          setTimeout(async () => {
            if (
              isMounted &&
              (newConnection.state === signalR.HubConnectionState.Connecting ||
                newConnection.state === signalR.HubConnectionState.Reconnecting)
            ) {
              console.warn("[SignalR] Socket atascado en reconexión móvil. Forzando reinicio limpio...");
              try { await newConnection.stop(); } catch {}
              await startConn();
            }
          }, 4000);
          return;
        }

        if (newConnection.state === signalR.HubConnectionState.Connected) {
          // Comprobar con Ping si el socket TCP sigue vivo o es un socket zombie
          try {
            const pingPromise = newConnection.invoke("Ping");
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Ping timeout")), 2500));
            await Promise.race([pingPromise, timeoutPromise]);
            console.log("[SignalR] Socket TCP verificado y saludable con Ping.");
          } catch (pingErr) {
            console.warn("[SignalR] Socket zombie detectado (falló Ping en primer plano). Forzando reconexión inmediata...", pingErr);
            try { await newConnection.stop(); } catch {}
            await startConn();
          }
        }
      } finally {
        isVerifying = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyOrRecoverConnection();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      newConnection.stop();
    };
  }, []);

  return connection;
};
