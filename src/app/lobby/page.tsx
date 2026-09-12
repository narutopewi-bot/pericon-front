"use client";

import * as React from 'react'
import Image from "next/image"
import * as fonts from "@/components/fonts"
import Duel from "./_components/duel/duel"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation";

export default function Lobby() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const duelToggle = () => {
    setOpen(!open);
  };

  return (
    <React.Fragment>
      <div
        style={{ height: "calc(89vh - 100px)" }}
        className={`
          flex flex-wrap justify-center items-center
        `}>
        <div className={`
          flex flex-col items-center pb-3
          ${open ? "opacity-1" : "opacity-100"}
        `}>
          {/* Cuadrado 0 */}
          <div
            onClick={() => duelToggle()}
            className="relative w-[179px] h-[135px] xl:w-[240px] xl:h-[180px] mb-[50px] backdrop-blur-xl bg-[#9d6727] rounded-[10px] border-secondary border-[3px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a59649]"
          >
            <Image
              priority
              src="/duel.svg"
              alt=""
              width="100"
              height="100"
              className="mt-[-131px] absolute xl:mt-[-160px]"
            />
            <div className="mt-6 flex justify-center">
              <p
                className={`text-white text-[16px] xl:text-[22px] ${fonts.bowlbyOneSC.className}`}
              >
                DUELO
              </p>
            </div>
            <div className="flex justify-center items-center">
              <p
                className={`text-white text-left text-[11px] xl:text-[16px] ${fonts.almarai.className} pr-[4px] text-center`}
              >
                Juega un duelo contra otros jugadores por monedas
              </p>
            </div>
          </div>

          {/* Cuadrado 1 */}
          <div 
             onClick={() => router.push("/ejemplo")}
             className="relative w-[179px] h-[135px] xl:w-[240px] xl:h-[180px] backdrop-blur-xl bg-[#9d6727] rounded-[10px] border-secondary border-[3px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a59649]"
            >
            <Image
              src="/tournament.svg"
              alt=""
              width="100"
              height="100"
              className="mt-[-131px] absolute xl:mt-[-160px]"
            />
            <div className="mt-6 flex justify-center">
              <p
                className={`text-white font-angkor text-[16px] xl:text-[22px] ${fonts.bowlbyOneSC.className}`}
              >
                TORNEOS
              </p>
            </div>
            <div className="flex justify-center items-center">
              <p
                className={`text-white text-left text-[11px] xl:text-[16px] ${fonts.almarai.className} pr-[4px] text-center`}
              >
                Pon a prueba tus habilidades en los torneos semanales.
              </p>
            </div>
          </div>
        </div>

        <div className={`
          flex flex-col items-center ml-11 pb-2
          ${open ? "opacity-1" : "opacity-100"}
        `}>
          {/* Cuadrado 2 */}
          <div
            className="relative w-[179px] h-[135px] xl:w-[240px] xl:h-[180px] mb-[50px] backdrop-blur-xl bg-[#9d6727] rounded-[10px] border-secondary border-[3px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a59649]"
          >
            <Image
              src="/room.svg"
              alt=""
              width="100"
              height="100"
              className="mt-[-131px] absolute xl:mt-[-160px]"
            />
            <div className="mt-6 flex justify-center">
              <p
                className={`text-white font-angkor text-[16px] xl:text-[22px] ${fonts.bowlbyOneSC.className}`}
              >
                CREAR SALA
              </p>
            </div>
            <div className="flex justify-center items-center">
              <p
                className={`text-white text-left text-[11px] xl:text-[16px] ${fonts.almarai.className} pr-[4px] text-center`}
              >
                Crea una sala para competir por la victoria con amigos
              </p>
            </div>
          </div>

          {/* Cuadrado 3 */}
          <div className="relative w-[179px] h-[135px] xl:w-[240px] xl:h-[180px] backdrop-blur-xl bg-[#9d6727] rounded-[10px] border-secondary border-[3px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a59649]">
            <Image
              src="/join.svg"
              alt=""
              width="100"
              height="100"
              className="mt-[-131px] absolute xl:mt-[-160px]"
            />
            <div className="mt-6 flex justify-center">
              <p
                className={`text-white font-angkor text-[16px] xl:text-[22px] ${fonts.bowlbyOneSC.className}`}
              >
                UNIRSE
              </p>
            </div>
            <div className="flex justify-center items-center">
              <p
                className={`text-white text-left text-[11px] xl:text-[16px] ${fonts.almarai.className} pr-[4px] text-center`}
              >
                Únete a una partida amistosa ya creada por otra persona
              </p>
            </div>
          </div>
        </div>

      </div>

      {/*Duel*/}
      <Duel open={open} duelToggle={duelToggle} />
      {/*\Duel*/}
    </React.Fragment>
  )
}
