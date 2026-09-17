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
  metadataBase: new URL("https://pericon.lat"),
  title: {
    default: "El Pericón | Juego de Cartas Venezolano Online en Vivo (1v1 y 2v2)",
    template: "%s | El Pericón",
  },
  description: "Juega El Pericón tradicional de Carora online gratis. Partidas 1 vs 1 y 2 vs 2 en tiempo real. Aprende las reglas, la tumba, señas y canta triunfos con amigos.",
  keywords: [
    "pericon",
    "el pericon",
    "juego pericon",
    "pericon carora",
    "pericon online",
    "juego de cartas venezolano",
    "baraja española",
    "truco venezolano",
    "juego de naipes lara",
    "perico y perica",
    "cartas carora",
    "jugar pericon gratis",
  ],
  authors: [{ name: "El Pericón" }],
  creator: "El Pericón",
  publisher: "El Pericón",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "El Pericón | Juego de Cartas Venezolano Online en Vivo",
    description: "Juega El Pericón tradicional de Carora online gratis. Partidas 1 vs 1 y 2 vs 2 en tiempo real. ¡El legendario juego de naipes de la tierra del chivo y el cocuy!",
    url: "https://pericon.lat",
    siteName: "El Pericón",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "El Pericón - Juego de Cartas Tradicional de Venezuela",
      },
    ],
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "El Pericón | Juego de Cartas Venezolano Online en Vivo",
    description: "Juega El Pericón tradicional de Carora online gratis. Partidas 1 vs 1 y 2 vs 2 en tiempo real con amigos.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "El Pericón",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pericon.lat/#website",
      "url": "https://pericon.lat",
      "name": "El Pericón",
      "description": "El legendario juego de cartas tradicional de Carora y el llano venezolano en vivo.",
      "inLanguage": "es"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://pericon.lat/#game",
      "name": "El Pericón",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Web, Mobile, Android, iOS, Windows, macOS",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "Juego de cartas venezolano tradicional de 1 vs 1 y 2 vs 2 en vivo con baraja española.",
      "genre": ["Card Game", "Casual Game", "Multiplayer", "Strategy"],
      "inLanguage": "es",
      "image": "https://pericon.lat/og-image.png"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
