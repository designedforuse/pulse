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

export interface UtmbFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface UtmbMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface UtmbStop {
  id: string;
  displayName: string;
  city: string;
  country: string;
  startUtc: string;
  durationMin: number;
}

const DAY_MIN = 24 * 60;

// 2026 UTMB World Series — exclusive US broadcaster: FloSports
const UTMB_STOPS: UtmbStop[] = [
  {
    id: "athletics-utmb-ultra-trail-australia-2026",
    displayName: "Ultra-Trail Australia",
    city: "Blue Mountains",
    country: "Australia",
    startUtc: "2026-05-15T20:00:00.000Z", // May 16 06:00 AEST
    durationMin: DAY_MIN,
  },
  {
    id: "athletics-utmb-val-daran-2026",
    displayName: "Val d'Aran",
    city: "Val d'Aran",
    country: "Spain",
    startUtc: "2026-07-02T04:00:00.000Z", // Jul 2 06:00 CEST, runs through Jul 4
    durationMin: DAY_MIN * 3,
  },
  {
    id: "athletics-utmb-verbier-st-bernard-2026",
    displayName: "Verbier St-Bernard",
    city: "Verbier",
    country: "Switzerland",
    startUtc: "2026-07-11T03:00:00.000Z", // Jul 11 05:00 CEST
    durationMin: DAY_MIN,
  },
  {
    id: "athletics-utmb-monte-rosa-2026",
    displayName: "Monte Rosa-Walser",
    city: "Monte Rosa",
    country: "Italy",
    startUtc: "2026-07-17T03:00:00.000Z", // Jul 17 05:00 CEST, runs through Jul 18
    durationMin: DAY_MIN * 2,
  },
  {
    id: "athletics-utmb-mont-blanc-2026",
    displayName: "UTMB Mont-Blanc",
    city: "Chamonix",
    country: "France",
    startUtc: "2026-08-27T16:00:00.000Z", // Aug 27 18:00 CEST, runs through Aug 30
    durationMin: DAY_MIN * 4,
  },
  {
    id: "athletics-utmb-wildstrubel-2026",
    displayName: "Wildstrubel",
    city: "Wildstrubel",
    country: "Switzerland",
    startUtc: "2026-09-12T03:00:00.000Z", // Sep 12 05:00 CEST, runs through Sep 13
    durationMin: DAY_MIN * 2,
  },
  {
    id: "athletics-utmb-nice-cote-dazur-2026",
    displayName: "Nice Côte d'Azur",
    city: "Nice",
    country: "France",
    startUtc: "2026-09-25T16:00:00.000Z", // Sep 25 18:00 CEST, runs through Sep 26
    durationMin: DAY_MIN * 2,
  },
  {
    id: "athletics-utmb-kodiak-2026",
    displayName: "Kodiak Ultra Marathons",
    city: "Big Bear Lake",
    country: "USA",
    startUtc: "2026-10-10T12:00:00.000Z", // Oct 10 05:00 PDT
    durationMin: DAY_MIN,
  },
  {
    id: "athletics-utmb-chiang-mai-2026",
    displayName: "Chiang Mai",
    city: "Chiang Mai",
    country: "Thailand",
    startUtc: "2026-12-04T11:00:00.000Z", // Dec 4 18:00 ICT, runs through Dec 5
    durationMin: DAY_MIN * 2,
  },
];

export function fetchUtmbEvents(): UtmbFetchResult {
  console.log(`  UTMB: Generating schedule (${UTMB_STOPS.length} stops)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 160 * 86400000);

  const events: AppEvent[] = [];

  for (const stop of UTMB_STOPS) {
    const start = new Date(stop.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + stop.durationMin * 60000).toISOString();

    events.push({
      id: stop.id,
      sport: "athletics",
      league: "UTMB World Series",
      awayTeam: "",
      homeTeam: stop.displayName,
      startTimeLocal: stop.startUtc,
      endTimeLocal: endUtc,
      providerId: "flosports",
      isLive: false,
      source: "utmb-hardcoded",
      leagueKey: "utmb",
      eventType: "session",
      sessionTitle: stop.displayName,
      competitionType: "international",
      tournamentName: stop.displayName,
    });
  }

  console.log(`  UTMB: ${events.length} stops in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeUtmbEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): UtmbMergeResult {
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
