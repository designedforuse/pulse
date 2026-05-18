export type SeasonPhaseLabel = "Regular" | "Playoffs" | "Knockout" | "Final" | "Group" | "Tournament" | "Championship";

export interface PhaseWindow {
  label: SeasonPhaseLabel;
  start: string;
  end: string;
}

export interface ChampionshipFinal {
  leagueKey: string;
  sport: string;
  name: string;
  date: string;
  monthKey: string;
  emoji?: string;
}

export const SEASON_PHASES_2026: Record<string, PhaseWindow[]> = {
  nhl: [
    { label: "Regular", start: "2025-10-07", end: "2026-04-16" },
    { label: "Playoffs", start: "2026-04-18", end: "2026-06-02" },
    { label: "Final", start: "2026-06-03", end: "2026-06-22" },
  ],
  ahl: [
    { label: "Regular", start: "2025-10-10", end: "2026-04-19" },
    { label: "Playoffs", start: "2026-04-22", end: "2026-06-15" },
    { label: "Final", start: "2026-06-04", end: "2026-06-23" },
  ],
  echl: [
    { label: "Regular", start: "2025-10-17", end: "2026-04-12" },
    { label: "Playoffs", start: "2026-04-15", end: "2026-06-12" },
    { label: "Final", start: "2026-05-28", end: "2026-06-12" },
  ],
  shl: [
    { label: "Regular", start: "2025-09-13", end: "2026-03-08" },
    { label: "Playoffs", start: "2026-03-12", end: "2026-04-30" },
    { label: "Final", start: "2026-04-14", end: "2026-04-30" },
  ],
  nba: [
    { label: "Regular", start: "2025-10-21", end: "2026-04-12" },
    { label: "Playoffs", start: "2026-04-18", end: "2026-06-02" },
    { label: "Final", start: "2026-06-04", end: "2026-06-22" },
  ],
  mlb: [
    { label: "Regular", start: "2026-03-26", end: "2026-09-27" },
    { label: "Playoffs", start: "2026-09-29", end: "2026-10-22" },
    { label: "Final", start: "2026-10-23", end: "2026-11-04" },
  ],
  championsleague: [
    { label: "Group", start: "2025-09-16", end: "2026-01-28" },
    { label: "Knockout", start: "2026-02-17", end: "2026-05-09" },
    { label: "Final", start: "2026-05-30", end: "2026-05-30" },
  ],
  europaleague: [
    { label: "Group", start: "2025-09-24", end: "2026-01-29" },
    { label: "Knockout", start: "2026-02-19", end: "2026-05-07" },
    { label: "Final", start: "2026-05-27", end: "2026-05-27" },
  ],
  championscup: [
    { label: "Group", start: "2025-12-05", end: "2026-01-25" },
    { label: "Knockout", start: "2026-04-03", end: "2026-05-09" },
    { label: "Final", start: "2026-05-23", end: "2026-05-23" },
  ],
  cafchampionsleague: [
    { label: "Group", start: "2025-11-21", end: "2026-02-22" },
    { label: "Knockout", start: "2026-04-03", end: "2026-05-23" },
    { label: "Final", start: "2026-05-30", end: "2026-06-06" },
  ],
  facup: [
    { label: "Knockout", start: "2025-08-09", end: "2026-04-26" },
    { label: "Final", start: "2026-05-16", end: "2026-05-16" },
  ],
  mls: [
    { label: "Regular", start: "2026-02-21", end: "2026-10-04" },
    { label: "Playoffs", start: "2026-10-22", end: "2026-12-05" },
    { label: "Final", start: "2026-12-06", end: "2026-12-06" },
  ],
  usl: [
    { label: "Regular", start: "2026-03-07", end: "2026-10-25" },
    { label: "Playoffs", start: "2026-10-30", end: "2026-11-22" },
    { label: "Final", start: "2026-11-22", end: "2026-11-22" },
  ],
  nwsl: [
    { label: "Regular", start: "2026-03-13", end: "2026-11-01" },
    { label: "Playoffs", start: "2026-11-06", end: "2026-11-22" },
    { label: "Final", start: "2026-11-22", end: "2026-11-22" },
  ],
  epl: [{ label: "Regular", start: "2025-08-15", end: "2026-05-24" }],
  laliga: [{ label: "Regular", start: "2025-08-15", end: "2026-05-24" }],
  seriea: [{ label: "Regular", start: "2025-08-23", end: "2026-05-24" }],
  bundesliga: [{ label: "Regular", start: "2025-08-22", end: "2026-05-16" }],
  ligue1: [{ label: "Regular", start: "2025-08-15", end: "2026-05-23" }],
  ipl: [
    { label: "Group", start: "2026-03-22", end: "2026-05-17" },
    { label: "Playoffs", start: "2026-05-19", end: "2026-05-22" },
    { label: "Final", start: "2026-05-24", end: "2026-05-24" },
  ],
  mlr: [
    { label: "Regular", start: "2026-02-21", end: "2026-06-07" },
    { label: "Playoffs", start: "2026-06-13", end: "2026-06-21" },
    { label: "Final", start: "2026-06-28", end: "2026-06-28" },
  ],
  urc: [
    { label: "Regular", start: "2025-09-26", end: "2026-05-17" },
    { label: "Playoffs", start: "2026-05-29", end: "2026-06-13" },
    { label: "Final", start: "2026-06-20", end: "2026-06-20" },
  ],
  premiership: [
    { label: "Regular", start: "2025-09-26", end: "2026-05-23" },
    { label: "Playoffs", start: "2026-05-30", end: "2026-06-06" },
    { label: "Final", start: "2026-06-13", end: "2026-06-13" },
  ],
  top14: [
    { label: "Regular", start: "2025-09-06", end: "2026-05-24" },
    { label: "Playoffs", start: "2026-05-30", end: "2026-06-13" },
    { label: "Final", start: "2026-06-26", end: "2026-06-26" },
  ],
  superrugby: [
    { label: "Regular", start: "2026-02-13", end: "2026-05-23" },
    { label: "Playoffs", start: "2026-05-29", end: "2026-06-13" },
    { label: "Final", start: "2026-06-20", end: "2026-06-20" },
  ],
  leagueone: [
    { label: "Regular", start: "2025-12-13", end: "2026-04-26" },
    { label: "Playoffs", start: "2026-05-09", end: "2026-05-23" },
    { label: "Final", start: "2026-05-30", end: "2026-05-30" },
  ],
};

export const CHAMPIONSHIP_FINALS_2026: ChampionshipFinal[] = [
  { leagueKey: "championsleague", sport: "soccer", name: "Champions League Final", date: "2026-05-30", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "europaleague", sport: "soccer", name: "Europa League Final", date: "2026-05-27", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "championscup", sport: "rugby", name: "Investec Champions Cup Final", date: "2026-05-23", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "facup", sport: "soccer", name: "FA Cup Final", date: "2026-05-16", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "shl", sport: "hockey", name: "SHL Le Mat Trophy Final", date: "2026-04-30", monthKey: "2026-04", emoji: "🏆" },
  { leagueKey: "ipl", sport: "cricket", name: "IPL Final", date: "2026-05-24", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "leagueone", sport: "rugby", name: "Japan League One Final", date: "2026-05-30", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "cafchampionsleague", sport: "soccer", name: "CAF Champions League Final", date: "2026-05-30", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "nhl", sport: "hockey", name: "Stanley Cup Final", date: "2026-06-03", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "ahl", sport: "hockey", name: "AHL Calder Cup Final", date: "2026-06-04", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "echl", sport: "hockey", name: "ECHL Kelly Cup Final", date: "2026-05-28", monthKey: "2026-05", emoji: "🏆" },
  { leagueKey: "urc", sport: "rugby", name: "URC Grand Final", date: "2026-06-20", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "superrugby", sport: "rugby", name: "Super Rugby Final", date: "2026-06-20", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "premiership", sport: "rugby", name: "Premiership Final", date: "2026-06-13", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "top14", sport: "rugby", name: "Top 14 Final", date: "2026-06-26", monthKey: "2026-06", emoji: "🏆" },
  { leagueKey: "mlr", sport: "rugby", name: "MLR Championship", date: "2026-06-28", monthKey: "2026-06", emoji: "🏆" },
];

function dateOnlyMs(s: string): number {
  return new Date(s + "T00:00:00").getTime();
}

export function computeSeasonPhase(
  leagueKey: string,
  rangeStartIso: string,
  rangeEndIso: string
): SeasonPhaseLabel | null {
  const phases = SEASON_PHASES_2026[leagueKey];
  if (!phases) return null;
  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();
  const overlapping: SeasonPhaseLabel[] = [];
  for (const p of phases) {
    const pStart = dateOnlyMs(p.start);
    const pEnd = dateOnlyMs(p.end) + 24 * 60 * 60 * 1000 - 1;
    if (rangeEnd >= pStart && rangeStart <= pEnd) {
      overlapping.push(p.label);
    }
  }
  if (overlapping.length === 0) return null;
  const priority: SeasonPhaseLabel[] = ["Final", "Championship", "Playoffs", "Knockout", "Tournament", "Group", "Regular"];
  for (const label of priority) {
    if (overlapping.includes(label)) return label;
  }
  return overlapping[0];
}

export function getChampionshipFinalsForMonth(monthKey: string): ChampionshipFinal[] {
  return CHAMPIONSHIP_FINALS_2026.filter(f => f.monthKey === monthKey);
}
