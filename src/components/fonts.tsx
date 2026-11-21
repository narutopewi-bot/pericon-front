import localFont from "next/font/local";

const bowlbyOneSC = localFont({
  src: "../app/fonts/BowlbyOneSC-Latin.woff2",
  weight: "400",
  display: "swap",
});

const almarai = localFont({
  src: [
    { path: "../app/fonts/Almarai-300-Latin.woff2", weight: "300", style: "normal" },
    { path: "../app/fonts/Almarai-400-Latin.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/Almarai-700-Latin.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const archivo = localFont({
  src: "../app/fonts/Archivo-Latin.woff2",
  weight: "300 700",
  display: "swap",
});

const angkor = localFont({
  src: "../app/fonts/Angkor-Latin.woff2",
  weight: "400",
  display: "swap",
});

export { bowlbyOneSC, angkor, almarai, archivo };
