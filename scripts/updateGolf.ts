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
  tournamentName?: string;
}

export interface GolfFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  tournamentCounts: Record<string, number>;
}

export interface GolfMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface GolfTournament {
  name: string;
  shortName: string;
  location: string;
  country: string;
  startDate: string;
  endDate: string;
  providerId: string;
  providerReason: string;
  rounds: { name: string; dayIndex: number }[];
}

const FOUR_ROUND_SCHEDULE = [
  { name: "Round 1", dayIndex: 0 },
  { name: "Round 2", dayIndex: 1 },
  { name: "Round 3", dayIndex: 2 },
  { name: "Final Round", dayIndex: 3 },
];

function buildRounds(startDate: string, endDate: string): { name: string; dayIndex: number }[] {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  const roundNames = ["Round 1", "Round 2", "Round 3", "Final Round"];
  const roundStartDay = totalDays - 3;
  return roundNames.map((name, i) => ({ name, dayIndex: roundStartDay + i }));
}

const TOURNAMENTS: GolfTournament[] = [
  {
    name: "Players Championship",
    shortName: "Players",
    location: "Sawgrass, FL",
    country: "USA",
    startDate: "2026-03-10",
    endDate: "2026-03-15",
    providerId: "youtubetv",
    providerReason: "cbs-broadcast",
    rounds: buildRounds("2026-03-10", "2026-03-15"),
  },
  {
    name: "The Masters",
    shortName: "Masters",
    location: "Augusta, GA",
    country: "USA",
    startDate: "2026-04-09",
    endDate: "2026-04-12",
    providerId: "youtubetv",
    providerReason: "cbs-broadcast",
    rounds: FOUR_ROUND_SCHEDULE,
  },
  {
    name: "PGA Championship",
    shortName: "PGA",
    location: "Aronimink, PA",
    country: "USA",
    startDate: "2026-05-11",
    endDate: "2026-05-17",
    providerId: "youtubetv",
    providerReason: "cbs-broadcast",
    rounds: buildRounds("2026-05-11", "2026-05-17"),
  },
  {
    name: "US Open",
    shortName: "US Open",
    location: "Shinnecock Hills, NY",
    country: "USA",
    startDate: "2026-06-18",
    endDate: "2026-06-21",
    providerId: "youtubetv",
    providerReason: "cbs-broadcast",
    rounds: FOUR_ROUND_SCHEDULE,
  },
  {
    name: "British Open",
    shortName: "The Open",
    location: "Royal Birkdale, England",
    country: "England",
    startDate: "2026-07-12",
    endDate: "2026-07-19",
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
    rounds: buildRounds("2026-07-12", "2026-07-19"),
  },
];

const ROUND_DURATION_MIN = 300;

const SESSION_START_HOURS: Record<string, number> = {
  "USA": 10,
  "England": 7,
};

const SESSION_TZ_OFFSET: Record<string, string> = {
  "USA": "-04:00",
  "England": "+01:00",
};

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateLocal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function stableId(tournamentName: string, date: string): string {
  const slug = tournamentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `golf-${slug}-${date}`;
}

function generateGolfSessions(tournament: GolfTournament, windowStart: Date, windowEnd: Date): AppEvent[] {
  const events: AppEvent[] = [];

  for (const round of tournament.rounds) {
    const dayDate = addDays(tournament.startDate, round.dayIndex);
    if (dayDate < windowStart || dayDate > windowEnd) continue;

    const dateStr = formatDateLocal(dayDate);
    const tzOffset = SESSION_TZ_OFFSET[tournament.country] ?? "-04:00";
    const startHour = SESSION_START_HOURS[tournament.country] ?? 10;
    const startIso = `${dateStr}T${String(startHour).padStart(2, "0")}:00:00${tzOffset}`;
    const startUtc = new Date(startIso).toISOString();
    const endUtc = new Date(new Date(startUtc).getTime() + ROUND_DURATION_MIN * 60000).toISOString();

    const id = stableId(tournament.name, dateStr);

    events.push({
      id,
      sport: "golf",
      league: "The Majors",
      awayTeam: "TBD",
      homeTeam: tournament.name,
      startTimeLocal: startUtc,
      endTimeLocal: endUtc,
      providerId: tournament.providerId,
      isLive: false,
      source: "golf-hardcoded",
      leagueKey: "golf-majors",
      providerReason: tournament.providerReason,
      eventType: "session",
      sessionTitle: `${tournament.shortName} — ${round.name}`,
      competitionType: "international",
      tournamentName: tournament.name,
    });
  }

  return events;
}

export function fetchGolfEvents(): GolfFetchResult {
  console.log(`  Golf: Generating schedule for ${TOURNAMENTS.length} majors...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 60 * 86400000);

  const events: AppEvent[] = [];
  const tournamentCounts: Record<string, number> = {};

  for (const tournament of TOURNAMENTS) {
    const tStart = new Date(tournament.startDate + "T00:00:00Z");
    const tEnd = new Date(tournament.endDate + "T23:59:59Z");

    if (tEnd < windowStart || tStart > windowEnd) continue;

    const sessions = generateGolfSessions(tournament, windowStart, windowEnd);
    events.push(...sessions);
    if (sessions.length > 0) {
      tournamentCounts[tournament.name] = sessions.length;
    }
  }

  console.log(`  Golf: ${events.length} sessions generated across ${Object.keys(tournamentCounts).length} tournaments in window`);

  return { events, sourceUsed: "hardcoded", count: events.length, tournamentCounts };
}

export function mergeGolfEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): GolfMergeResult {
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
  const windowEnd = new Date(now.getTime() + 60 * 86400000);

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
