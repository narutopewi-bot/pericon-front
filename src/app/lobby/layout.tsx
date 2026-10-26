"use client"

import React from "react";
import {
  useAppSelector,
  RootState,
} from "@/store/store"
import Credits from "@/components/credits";
import Exp from "@/components/experience"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //const user = useAppSelector((state: RootState) => state.user);

  return (
    <div className="w-full max-w-[100vw] min-h-[100dvh] relative overflow-x-hidden select-none">
      <div className="bg-goat absolute inset-0 z-0 mix-blend-soft-light opacity-40 pointer-events-none" />
      <div className="relative z-10 w-full max-w-[100vw] min-h-[100dvh] flex flex-col">
        <div className="flex justify-between w-full max-w-4xl mx-auto px-4 mt-5">
          <div className="mt-[5px] mb-4">
            <Exp name="Jugador" experience={10} level={"Aprendiz"} />
          </div>
          <div>
            <Credits credits={10} />
          </div>
        </div>

        {/* Dinamic content */}
        <div className="flex items-center justify-center flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
