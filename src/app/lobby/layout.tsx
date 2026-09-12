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
    <React.Fragment>
      <main className="grid h-screen overflow-auto space-y-0">
        <div className="bg-goat absolute inset-0 z-0 mix-blend-soft-light opacity-40"></div>
        <div className="flex flex-col h-screen relative">
          {/* UI content */}
          <div className="relative z-10">
            <div className="flex justify-between w-full mt-5">
              <div className="mt-[5px] mb-4">
                <Exp name="Jugador" experience={10} level={"Aprendiz"} />
              </div>
              <div>
                <Credits credits={10} />
              </div>
            </div>

            {/* Dinamic content */}
            <div className="flex items-center justify-center h-full">
              {children}
            </div>
          </div>
        </div>
      </main>
    </React.Fragment>
  );
}
