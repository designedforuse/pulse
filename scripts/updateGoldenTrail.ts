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

export interface GoldenTrailFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface GoldenTrailMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface GoldenTrailRace {
  id: string;
  displayName: string;
  city: string;
  country: string;
  startUtc: string;
  durationMin: number;
}

const DAY_MIN = 24 * 60;

// 2026 Golden Trail World Series — provisional schedule based on the
// historical Apr–Oct cadence. Dates should be re-verified once Salomon
// publishes the official 2026 calendar (typically released Nov/Dec).
// All races stream free on the official Golden Trail Series YouTube channel.
const GOLDEN_TRAIL_RACES: GoldenTrailRace[] = [
  {
    id: "athletics-golden-trail-zegama-aizkorri-2026",
    displayName: "Zegama-Aizkorri",
    city: "Zegama",
    country: "Spain",
    startUtc: "2026-05-24T07:00:00.000Z", // 09:00 CEST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-mont-blanc-marathon-2026",
    displayName: "Mont-Blanc Marathon",
    city: "Chamonix",
    country: "France",
    startUtc: "2026-06-28T05:00:00.000Z", // 07:00 CEST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-stranda-fjord-2026",
    displayName: "Stranda Fjord Trail Race",
    city: "Stranda",
    country: "Norway",
    startUtc: "2026-07-11T08:00:00.000Z", // 10:00 CEST Sat
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-dolomyths-run-2026",
    displayName: "Dolomyths Run Sky Race",
    city: "Canazei",
    country: "Italy",
    startUtc: "2026-07-19T07:00:00.000Z", // 09:00 CEST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-sierre-zinal-2026",
    displayName: "Sierre-Zinal",
    city: "Sierre",
    country: "Switzerland",
    startUtc: "2026-08-09T06:30:00.000Z", // 08:30 CEST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-pikes-peak-2026",
    displayName: "Pikes Peak Marathon",
    city: "Manitou Springs, CO",
    country: "USA",
    startUtc: "2026-09-20T13:00:00.000Z", // 07:00 MDT Sun
    durationMin: 480,
  },
  {
    id: "athletics-golden-trail-grand-final-2026",
    displayName: "Golden Trail World Series Grand Final",
    city: "TBD",
    country: "TBD",
    startUtc: "2026-10-25T08:00:00.000Z", // TBD — typically late Oct
    durationMin: DAY_MIN * 3,
  },
];

export function fetchGoldenTrailEvents(): GoldenTrailFetchResult {
  console.log(`  Golden Trail: Generating schedule (${GOLDEN_TRAIL_RACES.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 200 * 86400000);

  const events: AppEvent[] = [];

  for (const race of GOLDEN_TRAIL_RACES) {
    const start = new Date(race.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + race.durationMin * 60000).toISOString();

    events.push({
      id: race.id,
      sport: "athletics",
      league: "Golden Trail World Series",
      awayTeam: "",
      homeTeam: race.displayName,
      startTimeLocal: race.startUtc,
      endTimeLocal: endUtc,
      providerId: "youtubetv",
      providerReason: "gtws-youtube",
      isLive: false,
      source: "golden-trail-hardcoded",
      leagueKey: "golden-trail",
      eventType: "session",
      sessionTitle: race.displayName,
      competitionType: "international",
      tournamentName: race.displayName,
    });
  }

  console.log(`  Golden Trail: ${events.length} races in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeGoldenTrailEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): GoldenTrailMergeResult {
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
  const windowEnd = new Date(now.getTime() + 200 * 86400000);

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
