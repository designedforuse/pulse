export interface TopPlayer {
  name: string;
  lastName: string;
  rank: number;
  tour: "ATP" | "WTA";
  country: string;
}

export const ATP_TOP_10: TopPlayer[] = [
  { name: "Jannik Sinner", lastName: "Sinner", rank: 1, tour: "ATP", country: "ITA" },
  { name: "Alexander Zverev", lastName: "Zverev", rank: 2, tour: "ATP", country: "GER" },
  { name: "Carlos Alcaraz", lastName: "Alcaraz", rank: 3, tour: "ATP", country: "ESP" },
  { name: "Novak Djokovic", lastName: "Djokovic", rank: 4, tour: "ATP", country: "SRB" },
  { name: "Taylor Fritz", lastName: "Fritz", rank: 5, tour: "ATP", country: "USA" },
  { name: "Casper Ruud", lastName: "Ruud", rank: 6, tour: "ATP", country: "NOR" },
  { name: "Daniil Medvedev", lastName: "Medvedev", rank: 7, tour: "ATP", country: "RUS" },
  { name: "Alex de Minaur", lastName: "de Minaur", rank: 8, tour: "ATP", country: "AUS" },
  { name: "Andrey Rublev", lastName: "Rublev", rank: 9, tour: "ATP", country: "RUS" },
  { name: "Grigor Dimitrov", lastName: "Dimitrov", rank: 10, tour: "ATP", country: "BUL" },
];

export function getTopPlayerByName(name: string): TopPlayer | undefined {
  return ATP_TOP_10.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() || p.lastName.toLowerCase() === name.toLowerCase()
  );
}

export function isTopPlayer(name: string): boolean {
  return ATP_TOP_10.some(
    (p) =>
      name.toLowerCase().includes(p.lastName.toLowerCase()) ||
      p.name.toLowerCase() === name.toLowerCase()
  );
}

export const TENNIS_ROUND_PRIORITY: Record<string, number> = {
  "Final": 100,
  "Semifinals": 90,
  "Quarterfinals": 80,
  "Round of 16": 70,
  "Round of 32": 60,
  "Round of 64": 50,
  "Round of 128": 40,
  "Early Rounds": 30,
};

export function getTennisRoundPriority(round: string): number {
  return TENNIS_ROUND_PRIORITY[round] ?? 20;
}

export function getTennisRoundShort(round: string): string {
  const SHORT_MAP: Record<string, string> = {
    "Final": "F",
    "Semifinals": "SF",
    "Quarterfinals": "QF",
    "Round of 16": "R16",
    "Round of 32": "R32",
    "Round of 64": "R64",
    "Round of 128": "R128",
    "Early Rounds": "R128",
  };
  return SHORT_MAP[round] ?? round;
}
