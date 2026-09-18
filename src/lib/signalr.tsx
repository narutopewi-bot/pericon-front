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
      .withAutomaticReconnect([0, 1000, 2000, 4000, 8000, 15000, 30000, 60000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    newConnection.serverTimeoutInMilliseconds = 60000;
    newConnection.keepAliveIntervalInMilliseconds = 10000;

    let isMounted = true;

    const startConn = async () => {
      if (newConnection.state === signalR.HubConnectionState.Disconnected) {
        try {
          await newConnection.start();
          console.log("[SignalR] Conectado con éxito. ConnectionId:", newConnection.connectionId);
          if (isMounted) setConnection(newConnection);
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
      console.warn("[SignalR] Reconectando...", error);
    });

    newConnection.onreconnected((connectionId) => {
      console.log("[SignalR] Reconectado exitosamente. Nuevo ID:", connectionId);
      if (isMounted) setConnection(newConnection);
    });

    newConnection.onclose(async (error) => {
      console.warn("[SignalR] Conexión cerrada:", error);
      setTimeout(() => {
        if (isMounted) startConn();
      }, 3000);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (newConnection.state === signalR.HubConnectionState.Disconnected) {
          console.log("[SignalR] Dispositivo activo / Pestaña visible: reconectando SignalR...");
          startConn();
        }
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
