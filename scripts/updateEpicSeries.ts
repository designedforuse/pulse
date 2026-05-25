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

export interface EpicSeriesFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface EpicSeriesMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface EpicSeriesRace {
  id: string;
  displayName: string;
  city: string;
  country: string;
  startUtc: string;
  endUtc: string;
}

// 2026 Epic Series — global mountain bike stage-race circuit.
// Source: https://www.epic-series.com/calendar (2026 calendar)
// All races broadcast on FloSports (FloBikes coverage).
const EPIC_SERIES_RACES: EpicSeriesRace[] = [
  {
    id: "cycling-epic-series-absa-cape-epic-2026",
    displayName: "Absa Cape Epic",
    city: "Western Cape",
    country: "South Africa",
    startUtc: "2026-03-15T05:00:00.000Z", // 07:00 SAST Sun Mar 15
    endUtc: "2026-03-22T13:00:00.000Z", // ~15:00 SAST Sun Mar 22
  },
  {
    id: "cycling-epic-series-4islands-epic-2026",
    displayName: "4Islands Epic",
    city: "Kvarner Islands",
    country: "Croatia",
    startUtc: "2026-04-14T05:00:00.000Z", // 07:00 CEST Tue Apr 14
    endUtc: "2026-04-18T13:00:00.000Z", // ~15:00 CEST Sat Apr 18
  },
  {
    id: "cycling-epic-series-andorra-epic-pyrenees-2026",
    displayName: "Andorra Epic Pyrenees",
    city: "La Massana",
    country: "Andorra",
    startUtc: "2026-07-02T05:00:00.000Z", // 07:00 CEST Thu Jul 2
    endUtc: "2026-07-05T13:00:00.000Z", // ~15:00 CEST Sun Jul 5
  },
  {
    id: "cycling-epic-series-swiss-epic-2026",
    displayName: "Swiss Epic",
    city: "Graubünden",
    country: "Switzerland",
    startUtc: "2026-08-19T05:00:00.000Z", // 07:00 CEST Wed Aug 19
    endUtc: "2026-08-23T13:00:00.000Z", // ~15:00 CEST Sun Aug 23
  },
  {
    id: "cycling-epic-series-fnb-wines2whales-2026",
    displayName: "FNB Wines2Whales",
    city: "Western Cape",
    country: "South Africa",
    startUtc: "2026-11-06T05:00:00.000Z", // 07:00 SAST Fri Nov 6
    endUtc: "2026-11-15T13:00:00.000Z", // ~15:00 SAST Sun Nov 15
  },
];

export function fetchEpicSeriesEvents(): EpicSeriesFetchResult {
  console.log(`  Epic Series: Generating schedule (${EPIC_SERIES_RACES.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 300 * 86400000);

  const events: AppEvent[] = [];

  for (const race of EPIC_SERIES_RACES) {
    const start = new Date(race.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    events.push({
      id: race.id,
      sport: "cycling",
      league: "Epic Series",
      awayTeam: "",
      homeTeam: race.displayName,
      startTimeLocal: race.startUtc,
      endTimeLocal: race.endUtc,
      providerId: "flosports",
      providerReason: "flosports-broadcast",
      isLive: false,
      source: "epic-series-hardcoded",
      leagueKey: "epic-series",
      eventType: "session",
      sessionTitle: race.displayName,
      competitionType: "international",
      tournamentName: race.displayName,
    });
  }

  console.log(`  Epic Series: ${events.length} races in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeEpicSeriesEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): EpicSeriesMergeResult {
  const freshIds = new Set(fresh.map(e => e.id));
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    // Drop stale Epic Series cache entries not in the fresh schedule
    // (handles removed/renamed races).
    if (e.id.startsWith("cycling-epic-series-") && !freshIds.has(e.id)) continue;
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
  const windowEnd = new Date(now.getTime() + 300 * 86400000);

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
