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

// 2026 Golden Trail World Series — official calendar published Feb 2026.
// 7 regular races + Grand Finale across 8 countries / 3 continents.
// Source: https://goldentrailseries.com/gtws-unveils-its-2026-calendar/
// All races broadcast on FloSports.
const GOLDEN_TRAIL_RACES: GoldenTrailRace[] = [
  {
    id: "athletics-golden-trail-zegama-aizkorri-2026",
    displayName: "GTWS — Zegama-Aizkorri",
    city: "Zegama",
    country: "Spain",
    startUtc: "2026-05-17T06:00:00.000Z", // 08:00 CEST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-ledro-sky-2026",
    displayName: "GTWS — Ledro Sky Trentino",
    city: "Ledro",
    country: "Italy",
    startUtc: "2026-05-24T06:00:00.000Z", // 08:00 CEST Sun
    durationMin: 300,
  },
  {
    id: "athletics-golden-trail-quebec-mega-trail-2026",
    displayName: "GTWS — Quebec Mega Trail",
    city: "Mont-Sainte-Anne",
    country: "Canada",
    startUtc: "2026-07-05T12:00:00.000Z", // 08:00 EDT Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-pitz-alpine-2026",
    displayName: "GTWS — Pitz Alpine Glacier Trail",
    city: "Pitztal",
    country: "Austria",
    startUtc: "2026-08-01T06:00:00.000Z", // 08:00 CEST Sat
    durationMin: 300,
  },
  {
    id: "athletics-golden-trail-sierre-zinal-2026",
    displayName: "GTWS — Sierre-Zinal",
    city: "Sierre",
    country: "Switzerland",
    startUtc: "2026-08-08T06:30:00.000Z", // 08:30 CEST Sat
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-myoko-trail-2026",
    displayName: "GTWS — Myoko Trail",
    city: "Myoko",
    country: "Japan",
    startUtc: "2026-09-19T23:00:00.000Z", // 08:00 JST Sun Sep 20
    durationMin: 300,
  },
  {
    id: "athletics-golden-trail-jinshanling-2026",
    displayName: "GTWS — Jinshanling Great Wall Trail Race",
    city: "Jinshanling",
    country: "China",
    startUtc: "2026-09-27T00:00:00.000Z", // 08:00 CST Sun
    durationMin: 360,
  },
  {
    id: "athletics-golden-trail-muju-grand-finale-2026",
    displayName: "GTWS — Muju Trail Grand Finale",
    city: "Muju",
    country: "South Korea",
    startUtc: "2026-10-23T23:00:00.000Z", // Oct 24 08:00 KST (women) — runs through Oct 25 (men)
    durationMin: 60 * 36, // 36h window spanning women's (Oct 24) and men's (Oct 25) races
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
      providerId: "flosports",
      providerReason: "gtws-flosports",
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
  const freshIds = new Set(fresh.map(e => e.id));
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    // Drop stale GTWS cache entries that aren't in the fresh schedule
    // (handles prior provisional IDs / removed races).
    if (e.id.startsWith("athletics-golden-trail-") && !freshIds.has(e.id)) continue;
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
