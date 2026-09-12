"use client"

import React from "react";
import { useAppSelector, RootState, } from "@/store/store";

export default function DashboardLayout({ children, }: Readonly<{ children: React.ReactNode;}>) {
  return (
    <React.Fragment>
      <main className="grid h-screen overflow-auto space-y-0">
        <div className="bg-goat absolute inset-0 z-0 mix-blend-soft-light opacity-40">
        </div>
        <div className="flex flex-col h-screen relative">
          <div className="relative z-10">
            {children}
          </div>          
        </div>
      </main>
    </React.Fragment>
  );
}
