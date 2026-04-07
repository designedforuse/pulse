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

export interface DiamondLeagueFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface DiamondLeagueMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface DiamondLeagueMeet {
  id: string;
  displayName: string;
  city: string;
  startUtc: string;
  durationMin: number;
}

// 2026 Wanda Diamond League — all 14 qualifying meets + 2-day Final in Brussels
const DIAMOND_LEAGUE_MEETS: DiamondLeagueMeet[] = [
  {
    id: "athletics-diamond-league-doha-2026",
    displayName: "Diamond League — Doha",
    city: "Doha, Qatar",
    startUtc: "2026-05-08T16:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-shanghai-2026",
    displayName: "Diamond League — Shanghai",
    city: "Shanghai, China",
    startUtc: "2026-05-16T12:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-xiamen-2026",
    displayName: "Diamond League — Xiamen",
    city: "Xiamen, China",
    startUtc: "2026-05-23T12:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-rabat-2026",
    displayName: "Diamond League — Rabat",
    city: "Rabat, Morocco",
    startUtc: "2026-05-31T18:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-rome-2026",
    displayName: "Diamond League — Rome",
    city: "Rome, Italy",
    startUtc: "2026-06-04T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-stockholm-2026",
    displayName: "Diamond League — Stockholm",
    city: "Stockholm, Sweden",
    startUtc: "2026-06-07T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-oslo-2026",
    displayName: "Diamond League — Oslo",
    city: "Oslo, Norway",
    startUtc: "2026-06-10T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-paris-2026",
    displayName: "Diamond League — Paris",
    city: "Paris, France",
    startUtc: "2026-06-26T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-eugene-2026",
    displayName: "Diamond League — Eugene",
    city: "Eugene, USA",
    startUtc: "2026-07-04T19:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-monaco-2026",
    displayName: "Diamond League — Monaco",
    city: "Monaco",
    startUtc: "2026-07-10T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-london-2026",
    displayName: "Diamond League — London",
    city: "London, Great Britain",
    startUtc: "2026-07-18T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-lausanne-2026",
    displayName: "Diamond League — Lausanne",
    city: "Lausanne, Switzerland",
    startUtc: "2026-08-21T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-silesia-2026",
    displayName: "Diamond League — Silesia",
    city: "Silesia, Poland",
    startUtc: "2026-08-23T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-zurich-2026",
    displayName: "Diamond League — Zurich",
    city: "Zurich, Switzerland",
    startUtc: "2026-08-27T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-brussels-final-day-1-2026",
    displayName: "Diamond League Final — Brussels",
    city: "Brussels, Belgium",
    startUtc: "2026-09-04T17:00:00.000Z",
    durationMin: 180,
  },
  {
    id: "athletics-diamond-league-brussels-final-day-2-2026",
    displayName: "Diamond League Final — Brussels",
    city: "Brussels, Belgium",
    startUtc: "2026-09-05T15:00:00.000Z",
    durationMin: 180,
  },
];

export function fetchDiamondLeagueEvents(): DiamondLeagueFetchResult {
  console.log(`  Diamond League: Generating schedule (${DIAMOND_LEAGUE_MEETS.length} meets)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 160 * 86400000);

  const events: AppEvent[] = [];

  for (const meet of DIAMOND_LEAGUE_MEETS) {
    const start = new Date(meet.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + meet.durationMin * 60000).toISOString();

    events.push({
      id: meet.id,
      sport: "athletics",
      league: "Diamond League",
      awayTeam: "",
      homeTeam: meet.displayName,
      startTimeLocal: meet.startUtc,
      endTimeLocal: endUtc,
      providerId: "flosports",
      isLive: false,
      source: "diamond-league-hardcoded",
      leagueKey: "diamond-league",
      eventType: "session",
      sessionTitle: meet.displayName,
      competitionType: "international",
      tournamentName: meet.displayName,
    });
  }

  console.log(`  Diamond League: ${events.length} meets in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeDiamondLeagueEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): DiamondLeagueMergeResult {
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
  const windowEnd = new Date(now.getTime() + 160 * 86400000);

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
