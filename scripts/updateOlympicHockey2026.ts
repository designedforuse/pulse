import * as fs from "fs";
import * as path from "path";

const HOCKEY_DURATION_MIN = 165;

interface OlympicGame {
  date: string;
  timeET: string;
  awayTeam: string;
  homeTeam: string;
  group?: string;
  round: string;
  venue: string;
}

interface AppEvent {
  id: string;
  sport: string;
  league: string;
  awayTeam: string;
  homeTeam: string;
  startTimeLocal: string;
  endTimeLocal?: string;
  providerId: string;
  isLive: boolean;
  source: string;
  leagueKey?: string;
  isOlympic?: boolean;
  seasonTag?: string;
  olympicRound?: string;
  olympicVenue?: string;
}

export interface OlympicHockeyFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

function etToUtc(date: string, timeET: string): string {
  const [h, m] = timeET.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  const rough = new Date(Date.UTC(year, month - 1, day, h, m, 0));
  const utcStr = rough.toLocaleString("en-US", { timeZone: "UTC" });
  const etStr = rough.toLocaleString("en-US", { timeZone: "America/New_York" });
  const offset = new Date(etStr).getTime() - new Date(utcStr).getTime();
  return new Date(rough.getTime() - offset).toISOString();
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function stableId(date: string, away: string, home: string): string {
  const a = away.toLowerCase().replace(/\s+/g, "-");
  const h = home.toLowerCase().replace(/\s+/g, "-");
  return `olympic-hockey-2026-${date}-${a}-at-${h}`;
}

const SCHEDULE: OlympicGame[] = [
  { date: "2026-02-11", timeET: "10:40", awayTeam: "Slovakia", homeTeam: "Finland", group: "B", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-11", timeET: "15:10", awayTeam: "Sweden", homeTeam: "Italy", group: "B", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-12", timeET: "06:10", awayTeam: "Switzerland", homeTeam: "France", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-12", timeET: "10:40", awayTeam: "Czechia", homeTeam: "Canada", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-12", timeET: "15:10", awayTeam: "Latvia", homeTeam: "USA", group: "C", round: "Preliminary", venue: "RHO Arena" },
  { date: "2026-02-12", timeET: "15:10", awayTeam: "Germany", homeTeam: "Denmark", group: "C", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-13", timeET: "06:10", awayTeam: "Finland", homeTeam: "Sweden", group: "B", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-13", timeET: "06:10", awayTeam: "Italy", homeTeam: "Slovakia", group: "B", round: "Preliminary", venue: "RHO Arena" },
  { date: "2026-02-13", timeET: "10:40", awayTeam: "France", homeTeam: "Czechia", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-13", timeET: "15:10", awayTeam: "Canada", homeTeam: "Switzerland", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-14", timeET: "06:10", awayTeam: "Sweden", homeTeam: "Slovakia", group: "B", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-14", timeET: "06:10", awayTeam: "Germany", homeTeam: "Latvia", group: "C", round: "Preliminary", venue: "RHO Arena" },
  { date: "2026-02-14", timeET: "10:40", awayTeam: "Finland", homeTeam: "Italy", group: "B", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-14", timeET: "15:10", awayTeam: "USA", homeTeam: "Denmark", group: "C", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-15", timeET: "06:10", awayTeam: "Switzerland", homeTeam: "Czechia", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-15", timeET: "10:40", awayTeam: "Canada", homeTeam: "France", group: "A", round: "Preliminary", venue: "Santagiulia Arena" },
  { date: "2026-02-15", timeET: "13:10", awayTeam: "Denmark", homeTeam: "Latvia", group: "C", round: "Preliminary", venue: "RHO Arena" },
  { date: "2026-02-15", timeET: "15:10", awayTeam: "USA", homeTeam: "Germany", group: "C", round: "Preliminary", venue: "Santagiulia Arena" },

  { date: "2026-02-17", timeET: "06:10", awayTeam: "Germany", homeTeam: "France", round: "Qualification Playoff", venue: "Santagiulia Arena" },
  { date: "2026-02-17", timeET: "06:10", awayTeam: "Switzerland", homeTeam: "Italy", round: "Qualification Playoff", venue: "RHO Arena" },
  { date: "2026-02-17", timeET: "10:40", awayTeam: "Czechia", homeTeam: "Denmark", round: "Qualification Playoff", venue: "Santagiulia Arena" },
  { date: "2026-02-17", timeET: "15:10", awayTeam: "Sweden", homeTeam: "Latvia", round: "Qualification Playoff", venue: "Santagiulia Arena" },

  { date: "2026-02-18", timeET: "06:10", awayTeam: "TBD", homeTeam: "Slovakia", round: "Quarterfinal", venue: "Santagiulia Arena" },
  { date: "2026-02-18", timeET: "10:40", awayTeam: "TBD", homeTeam: "Canada", round: "Quarterfinal", venue: "Santagiulia Arena" },
  { date: "2026-02-18", timeET: "12:10", awayTeam: "TBD", homeTeam: "Finland", round: "Quarterfinal", venue: "RHO Arena" },
  { date: "2026-02-18", timeET: "15:10", awayTeam: "TBD", homeTeam: "USA", round: "Quarterfinal", venue: "Santagiulia Arena" },

  { date: "2026-02-20", timeET: "10:40", awayTeam: "TBD", homeTeam: "TBD", round: "Semifinal", venue: "Santagiulia Arena" },
  { date: "2026-02-20", timeET: "15:10", awayTeam: "TBD", homeTeam: "TBD", round: "Semifinal", venue: "Santagiulia Arena" },

  { date: "2026-02-21", timeET: "14:40", awayTeam: "TBD", homeTeam: "TBD", round: "Bronze Medal Game", venue: "Santagiulia Arena" },
  { date: "2026-02-22", timeET: "08:10", awayTeam: "TBD", homeTeam: "TBD", round: "Gold Medal Game", venue: "Santagiulia Arena" },
];

export function fetchOlympicHockeyEvents(): OlympicHockeyFetchResult {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const events: AppEvent[] = [];

  for (const game of SCHEDULE) {
    const startUtc = etToUtc(game.date, game.timeET);
    const startDate = new Date(startUtc);
    if (startDate < windowStart || startDate > windowEnd) continue;

    const endUtc = addDuration(startUtc, HOCKEY_DURATION_MIN);
    const id = stableId(game.date, game.awayTeam, game.homeTeam);

    events.push({
      id,
      sport: "hockey",
      league: "Olympic Hockey",
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
      startTimeLocal: startUtc,
      endTimeLocal: endUtc,
      providerId: "youtubetv",
      isLive: false,
      source: "olympic-hockey-2026",
      leagueKey: "olympichockey",
      isOlympic: true,
      seasonTag: "Milan-Cortina-2026",
      olympicRound: game.round,
      olympicVenue: game.venue,
    });
  }

  events.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
  console.log(`  Olympic Hockey: ${events.length} events in retention window`);

  return {
    events,
    sourceUsed: "hardcoded-schedule",
    count: events.length,
  };
}

export function mergeOlympicHockeyEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of fresh) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;
  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
