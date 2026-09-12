import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export const useSignalR = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://pericon-api.onrender.com";
    const hubUrl = `${baseUrl}/hub`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    newConnection.start()
      .then(() => {
        console.log("Conectado a SignalR con éxito");
        setConnection(newConnection);
      })
      .catch(err => console.error("Error al conectar a SignalR:", err));

    return () => {
      newConnection.stop();
    };
  }, []);

  return connection;
};
