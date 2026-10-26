"use client";

import React from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full max-w-[100vw] min-h-[100dvh] relative overflow-x-hidden select-none">
      <div className="bg-goat absolute inset-0 z-0 mix-blend-soft-light opacity-40 pointer-events-none" />
      <div className="relative z-10 w-full max-w-[100vw] min-h-[100dvh] flex flex-col overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
