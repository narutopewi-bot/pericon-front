import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import dynamic from "next/dynamic";
import { SignalRProvider } from '@/lib/signalrcontext';
const ReduxProvider = dynamic(() => import("./StoreProvider"), {
  ssr: false
});
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: "#140a04",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "El Pericón - Juego de Cartas Venezolano",
  description: "El legendario juego de naipes del llano venezolano en vivo. Partidas 1 vs 1 y 2 vs 2 con amigos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "El Pericón",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>
          <SignalRProvider>
            <main className="grid h-screen overflow-auto space-y-0">
              {children}
            </main>
          </SignalRProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
