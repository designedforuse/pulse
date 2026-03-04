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
  providerReason?: string;
  eventType?: string;
  sessionTitle?: string;
  competitionType?: string;
  tennisRound?: string;
}

export interface TennisFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  tournamentCounts: Record<string, number>;
}

export interface TennisMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface TennisTournament {
  name: string;
  league: string;
  leagueKey: string;
  location: string;
  country: string;
  startDate: string;
  endDate: string;
  providerId: string;
  providerReason: string;
  rounds: { name: string; startDay: number; endDay: number }[];
}

const GRAND_SLAM_ROUNDS = [
  { name: "Early Rounds", startDay: 0, endDay: 4 },
  { name: "Round of 16", startDay: 5, endDay: 7 },
  { name: "Quarterfinals", startDay: 8, endDay: 10 },
  { name: "Semifinals", startDay: 11, endDay: 13 },
  { name: "Final", startDay: 14, endDay: 20 },
];

const MASTERS_ROUNDS = [
  { name: "Early Rounds", startDay: 0, endDay: 3 },
  { name: "Round of 16", startDay: 4, endDay: 6 },
  { name: "Quarterfinals", startDay: 7, endDay: 9 },
  { name: "Semifinals", startDay: 10, endDay: 12 },
  { name: "Final", startDay: 13, endDay: 14 },
];

const TOURNAMENTS: TennisTournament[] = [
  {
    name: "Australian Open",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "Melbourne, Australia",
    country: "Australia",
    startDate: "2026-01-12",
    endDate: "2026-02-01",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "French Open",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "Paris, France",
    country: "France",
    startDate: "2026-05-24",
    endDate: "2026-06-07",
    providerId: "youtubetv",
    providerReason: "tnt-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "Wimbledon",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "London, England",
    country: "England",
    startDate: "2026-06-29",
    endDate: "2026-07-12",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "US Open",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "New York, USA",
    country: "USA",
    startDate: "2026-08-23",
    endDate: "2026-09-13",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "Indian Wells Masters",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Indian Wells, USA",
    country: "USA",
    startDate: "2026-03-01",
    endDate: "2026-03-15",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Miami Masters",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Miami, USA",
    country: "USA",
    startDate: "2026-03-15",
    endDate: "2026-03-29",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Monte-Carlo Masters",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Monte-Carlo, Monaco",
    country: "Monaco",
    startDate: "2026-04-02",
    endDate: "2026-04-12",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Madrid Open",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Madrid, Spain",
    country: "Spain",
    startDate: "2026-04-29",
    endDate: "2026-05-10",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Italian Open",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Rome, Italy",
    country: "Italy",
    startDate: "2026-05-06",
    endDate: "2026-05-17",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Canadian Open",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Montreal/Toronto, Canada",
    country: "Canada",
    startDate: "2026-08-04",
    endDate: "2026-08-10",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Cincinnati Open",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Cincinnati, USA",
    country: "USA",
    startDate: "2026-08-10",
    endDate: "2026-08-17",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Shanghai Masters",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Shanghai, China",
    country: "China",
    startDate: "2026-10-07",
    endDate: "2026-10-18",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Paris Masters",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Paris, France",
    country: "France",
    startDate: "2026-11-02",
    endDate: "2026-11-08",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
];

function stableId(tournamentName: string, date: string): string {
  const slug = tournamentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `tennis-${slug}-${date}`;
}

function getRoundForDay(tournament: TennisTournament, dayIndex: number): string {
  for (const round of tournament.rounds) {
    if (dayIndex >= round.startDay && dayIndex <= round.endDay) {
      return round.name;
    }
  }
  return "Early Rounds";
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateLocal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const SESSION_START_HOURS: Record<string, number> = {
  "Australia": 19,
  "France": 11,
  "England": 11,
  "USA": 11,
  "Monaco": 11,
  "Spain": 11,
  "Italy": 11,
  "Canada": 11,
  "China": 11,
};

const SESSION_START_TZ_OFFSET: Record<string, string> = {
  "Australia": "+11:00",
  "France": "+02:00",
  "England": "+01:00",
  "USA": "-04:00",
  "Monaco": "+02:00",
  "Spain": "+02:00",
  "Italy": "+02:00",
  "Canada": "-04:00",
  "China": "+08:00",
};

const SESSION_DURATION_MIN = 360;

export function fetchTennisEvents(): TennisFetchResult {
  console.log(`  Tennis: Loading hardcoded schedule (${TOURNAMENTS.length} tournaments)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 30 * 86400000);

  const events: AppEvent[] = [];
  const tournamentCounts: Record<string, number> = {};
  const seenIds = new Set<string>();

  for (const tournament of TOURNAMENTS) {
    const tStart = new Date(tournament.startDate + "T00:00:00Z");
    const tEnd = new Date(tournament.endDate + "T23:59:59Z");
    let count = 0;

    const totalDays = Math.ceil((tEnd.getTime() - tStart.getTime()) / 86400000);

    for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
      const dayDate = addDays(tournament.startDate, dayIdx);
      const dateStr = formatDateLocal(dayDate);

      if (dayDate < windowStart || dayDate > windowEnd) continue;

      const round = getRoundForDay(tournament, dayIdx);
      const hourLocal = SESSION_START_HOURS[tournament.country] ?? 11;
      const tzOffset = SESSION_START_TZ_OFFSET[tournament.country] ?? "+00:00";
      const startIso = `${dateStr}T${String(hourLocal).padStart(2, "0")}:00:00${tzOffset}`;
      const startUtc = new Date(startIso).toISOString();
      const endUtc = new Date(new Date(startUtc).getTime() + SESSION_DURATION_MIN * 60000).toISOString();

      const id = stableId(tournament.name, dateStr);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      events.push({
        id,
        sport: "tennis",
        league: tournament.league,
        awayTeam: tournament.name,
        homeTeam: tournament.location,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: tournament.providerId,
        isLive: false,
        source: "tennis-hardcoded",
        leagueKey: tournament.leagueKey,
        providerReason: tournament.providerReason,
        eventType: "session",
        sessionTitle: `${tournament.name} — ${round}`,
        competitionType: tournament.league === "Grand Slam" ? "international" : "domestic",
        tennisRound: round,
      });
      count++;
    }

    if (count > 0) {
      tournamentCounts[tournament.name] = count;
    }
  }

  console.log(`  Tennis: ${events.length} sessions in retention window`);
  if (Object.keys(tournamentCounts).length > 0) {
    console.log(`  Tennis tournaments: ${JSON.stringify(tournamentCounts)}`);
  }

  return { events, sourceUsed: "hardcoded", count: events.length, tournamentCounts };
}

export function mergeTennisEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): TennisMergeResult {
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
  const windowEnd = new Date(now.getTime() + 30 * 86400000);

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
