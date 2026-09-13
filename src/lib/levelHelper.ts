export type PlayerLevel =
  | "Peón de Casona"
  | "Arriero de Chivos"
  | "Catador de Cocuy"
  | "Tocador de Cuatro"
  | "Patrón de Hacienda"
  | "Leyenda de Carora"
  | "Novato"
  | "Avanzado"
  | "Experto";

export interface LevelInfo {
  level: PlayerLevel;
  badge: string;
  rankTitle: string;
  nextRankTitle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  currentWins: number;
  minWins: number;
  maxWins: number;
  winsToNext: number;
  progressPercent: number;
  description: string;
}

export function getPlayerLevelInfo(wins: number = 0): LevelInfo {
  const safeWins = Math.max(0, wins);

  if (safeWins <= 10) {
    const progress = Math.min(100, Math.round((safeWins / 10) * 100));
    return {
      level: "Peón de Casona",
      badge: "🪵",
      rankTitle: "Peón de Casona",
      nextRankTitle: "Arriero de Chivos 🐐",
      badgeBg: "bg-amber-950/70",
      badgeBorder: "border-amber-600/60",
      badgeTextColor: "text-amber-400",
      currentWins: safeWins,
      minWins: 0,
      maxWins: 10,
      winsToNext: 11 - safeWins,
      progressPercent: progress,
      description: "0 a 10 victorias. Apenas estás llegando a Carora y aprendiendo las mañas del Pericón.",
    };
  } else if (safeWins <= 30) {
    const progress = Math.min(100, Math.round(((safeWins - 10) / 20) * 100));
    return {
      level: "Arriero de Chivos",
      badge: "🐐",
      rankTitle: "Arriero de Chivos",
      nextRankTitle: "Catador de Cocuy 🍶",
      badgeBg: "bg-amber-900/80",
      badgeBorder: "border-amber-500/60",
      badgeTextColor: "text-amber-300",
      currentWins: safeWins,
      minWins: 11,
      maxWins: 30,
      winsToNext: 31 - safeWins,
      progressPercent: progress,
      description: "11 a 30 victorias. Conoces los caminos de Carora y ya sabes cuándo pedir y cuándo cantar.",
    };
  } else if (safeWins <= 60) {
    const progress = Math.min(100, Math.round(((safeWins - 30) / 30) * 100));
    return {
      level: "Catador de Cocuy",
      badge: "🍶",
      rankTitle: "Catador de Cocuy",
      nextRankTitle: "Tocador de Cuatro 🎸",
      badgeBg: "bg-emerald-950/80",
      badgeBorder: "border-emerald-500/60",
      badgeTextColor: "text-emerald-300",
      currentWins: safeWins,
      minWins: 31,
      maxWins: 60,
      winsToNext: 61 - safeWins,
      progressPercent: progress,
      description: "31 a 60 victorias. Tienes temple de roble y no te tiembla el pulso en las bazas bravas.",
    };
  } else if (safeWins <= 100) {
    const progress = Math.min(100, Math.round(((safeWins - 60) / 40) * 100));
    return {
      level: "Tocador de Cuatro",
      badge: "🎸",
      rankTitle: "Tocador de Cuatro",
      nextRankTitle: "Patrón de Hacienda 🤠",
      badgeBg: "bg-purple-950/80",
      badgeBorder: "border-purple-500/60",
      badgeTextColor: "text-purple-300",
      currentWins: safeWins,
      minWins: 61,
      maxWins: 100,
      winsToNext: 101 - safeWins,
      progressPercent: progress,
      description: "61 a 100 victorias. Le pones música y picardía a la mesa como en los mejores golpes larenses.",
    };
  } else if (safeWins <= 200) {
    const progress = Math.min(100, Math.round(((safeWins - 100) / 100) * 100));
    return {
      level: "Patrón de Hacienda",
      badge: "🤠",
      rankTitle: "Patrón de Hacienda",
      nextRankTitle: "Leyenda de Carora 👑",
      badgeBg: "bg-amber-900/90",
      badgeBorder: "border-amber-400",
      badgeTextColor: "text-amber-200",
      currentWins: safeWins,
      minWins: 101,
      maxWins: 200,
      winsToNext: 201 - safeWins,
      progressPercent: progress,
      description: "101 a 200 victorias. Jugador de respeto en todas las casonas y pulperías del municipio Torres.",
    };
  } else {
    return {
      level: "Leyenda de Carora",
      badge: "👑",
      rankTitle: "Leyenda de Carora",
      nextRankTitle: "Rango Máximo 🏆",
      badgeBg: "bg-yellow-950/90",
      badgeBorder: "border-yellow-400",
      badgeTextColor: "text-yellow-300",
      currentWins: safeWins,
      minWins: 201,
      maxWins: 201,
      winsToNext: 0,
      progressPercent: 100,
      description: "¡Más de 200 victorias! ¡Ah mundo Carora! Eres el amo absoluto de la baraja y del Pericón.",
    };
  }
}
