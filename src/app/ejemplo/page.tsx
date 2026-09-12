"use client";

import * as React from 'react'
import Image from "next/image"
import * as fonts from "@/components/fonts"
import { useEffect, useState } from "react"
import { useSignalRContext } from '../../lib/signalrcontext';
import { Ejemplito } from "@/lib/ejemplito"
import { Porcion, Carta } from "@/lib/library"

export default function Ejemplo() {

  const connection = useSignalRContext();

 // const [connection, setConnection] = useState<HubConnection | null>(null);
  const [ejemplote, setEjemplote] = React.useState<Ejemplito | null>();
  const [imguno, setImguno] = React.useState<string | null>();
  const [imgdos, setImgdos] = React.useState<string | null>();
  const [imgtres, setImgtres] = React.useState<string | null>();
  const [imgcuatro, setImgcuatro] = React.useState<string | null>();

  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!connection) return;
    connection.on('ReceiveOrderDeck', (modelo: Ejemplito) => {
      setEjemplote(modelo);
      const numUno : number = Porcion(modelo.tres,0);
      const numDos : number = Porcion(modelo.tres,1);
      const numTres : number = Porcion(modelo.tres,2);
      setImguno(Carta(numUno));
      setImgdos(Carta(numDos));
      setImgtres(Carta(numTres));
      setImgcuatro(Carta(100));
    });
    return () => {
      connection.off('ReceiveOrderDeck');
    };
  }, [connection]);

  const sendObjectToServer = async () => {
    if (connection) {
      const modelo: Ejemplito = {
        uno: 1,
        dos: 100,
        tres: "Hola Mundo",
      };
      try {
        console.log("Enviando objeto al servidor:", modelo);
        await connection.invoke("SendOrderDeck", modelo);
      } catch (error) {
        console.error("Error al enviar objeto al servidor:", error);
      }
    }
  };

  return (
    <React.Fragment>
        <div>
          <h1>Comunicación vía SignalR</h1>
          <button onClick={sendObjectToServer}>Cargar Imágenes</button>
          <div>
          {ejemplote ? (
          <div>
            <img
              src={`/${imguno}`} 
              style={{ margin: "10px", width: "120px", height: "120px" }} />
            <img
              src={`/${imgdos}`} // Asegúrate de que las imágenes estén en la carpeta pública
              style={{ margin: "10px", width: "120px", height: "120px" }} />
            <img
              src={`/${imgtres}`} // Asegúrate de que las imágenes estén en la carpeta pública
              style={{ margin: "10px", width: "120px", height: "120px" }} />
            <img
              src={`/${imgcuatro}`} // Asegúrate de que las imágenes estén en la carpeta pública
              style={{ margin: "10px", width: "120px", height: "120px" }} />
          </div>
          ) : (
            <p>No se ha recibido ningún objeto aún.</p>
          )}
          </div>
        </div>
    </React.Fragment>
  )
}

