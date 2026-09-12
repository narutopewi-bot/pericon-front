export type PlayerLevel = "Novato" | "Avanzado" | "Experto";

export interface LevelInfo {
  level: PlayerLevel;
  badge: string;
  rankTitle: string;
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

  if (safeWins <= 50) {
    const progress = Math.min(100, Math.round((safeWins / 50) * 100));
    return {
      level: "Novato",
      badge: "🥉",
      rankTitle: "Novato del Pericón",
      badgeBg: "bg-amber-950/70",
      badgeBorder: "border-amber-600/60",
      badgeTextColor: "text-amber-400",
      currentWins: safeWins,
      minWins: 0,
      maxWins: 50,
      winsToNext: 51 - safeWins,
      progressPercent: progress,
      description: "0 a 50 victorias. Estás aprendiendo las mañas y trucos de la baraja criolla.",
    };
  } else if (safeWins <= 100) {
    const progress = Math.min(100, Math.round(((safeWins - 50) / 50) * 100));
    return {
      level: "Avanzado",
      badge: "🥈",
      rankTitle: "Periquero Avanzado",
      badgeBg: "bg-slate-900/80",
      badgeBorder: "border-slate-400/60",
      badgeTextColor: "text-slate-200",
      currentWins: safeWins,
      minWins: 51,
      maxWins: 100,
      winsToNext: 101 - safeWins,
      progressPercent: progress,
      description: "51 a 100 victorias. Ya dominas La Vida, sabes cuándo pedir y cuándo ceder la baza.",
    };
  } else {
    return {
      level: "Experto",
      badge: "👑",
      rankTitle: "Maestro Periquero",
      badgeBg: "bg-amber-900/90",
      badgeBorder: "border-yellow-400",
      badgeTextColor: "text-yellow-300",
      currentWins: safeWins,
      minWins: 101,
      maxWins: 101,
      winsToNext: 0,
      progressPercent: 100,
      description: "¡Más de 100 victorias! Eres una leyenda viviente de la mesa de Pericón.",
    };
  }
}
