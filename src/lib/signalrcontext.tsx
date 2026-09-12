'use client';

import { createContext, useContext } from "react";
import { useSignalR } from "./signalr";

const SignalRContext = createContext<signalR.HubConnection | null>(null);

export const SignalRProvider = ({ children }: { children: React.ReactNode }) => {
  const connection = useSignalR();

  return (
    <SignalRContext.Provider value={connection}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalRContext = () => useContext(SignalRContext);

/* 'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { signalRService } from './signalr';

interface SignalRContextType {
  connection: HubConnection | null;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextType>({
  connection: null,
  isConnected: false,
});

export const SignalRProvider = ({ children }: { children: ReactNode }) => {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const startConnection = async () => {
      // Replace with your actual SignalR hub URL
      const hubUrl = 'http://localhost:5206/hub';
      const conn = await signalRService.startConnection();
      
      setConnection(conn);
      setIsConnected(true);

      conn?.onclose(() => {
        setIsConnected(false);
      });

      conn?.onreconnected(() => {
        setIsConnected(true);
      });
    };

    startConnection();

    return () => {
      signalRService.stopConnection();
    };
  }, []);

  return (
    <SignalRContext.Provider value={{ connection, isConnected }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = () => useContext(SignalRContext); */