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

export interface PaddlingFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface PaddlingMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface PaddlingRace {
  id: string;
  displayName: string;
  shortName: string;
  region: string;
  country: string;
  startUtc: string;
  endUtc: string;
}

// 2026 South Africa "Big Three" canoe marathons.
// Source: official race sites + Canoeing South Africa fixture lists.
// Exact start/end dates are best-effort placements within each race's
// usual window — re-verify against each race's official site as it
// approaches. All races stream live on YouTube (race channels +
// Canoeing SA channel).
const PADDLING_RACES: PaddlingRace[] = [
  {
    id: "paddling-sabig3-dusi-2026",
    displayName: "Dusi Canoe Marathon",
    shortName: "Dusi",
    region: "Pietermaritzburg → Durban",
    country: "South Africa",
    // 3-day race, mid-February (Thu–Sat).
    startUtc: "2026-02-12T05:00:00.000Z",
    endUtc: "2026-02-14T13:00:00.000Z",
  },
  {
    id: "paddling-sabig3-berg-2026",
    displayName: "Berg River Canoe Marathon",
    shortName: "Berg",
    region: "Paarl → Velddrif",
    country: "South Africa",
    // 4-day race, mid-July (Wed–Sat).
    startUtc: "2026-07-15T06:00:00.000Z",
    endUtc: "2026-07-18T13:00:00.000Z",
  },
  {
    id: "paddling-sabig3-fish-2026",
    displayName: "Fish River Canoe Marathon",
    shortName: "Fish",
    region: "Cradock",
    country: "South Africa",
    // 2-day race, early October (Fri–Sat).
    startUtc: "2026-10-02T07:00:00.000Z",
    endUtc: "2026-10-03T13:00:00.000Z",
  },
];

export function fetchPaddlingEvents(): PaddlingFetchResult {
  console.log(`  Paddling: Generating schedule (${PADDLING_RACES.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 365 * 86400000);

  const events: AppEvent[] = [];

  for (const race of PADDLING_RACES) {
    const start = new Date(race.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    events.push({
      id: race.id,
      sport: "paddling",
      league: "SA Big Three",
      awayTeam: "",
      homeTeam: race.displayName,
      startTimeLocal: race.startUtc,
      endTimeLocal: race.endUtc,
      providerId: "youtube",
      providerReason: "sabig3-youtube",
      isLive: false,
      source: "paddling-hardcoded",
      leagueKey: "sa-big-three",
      eventType: "session",
      sessionTitle: race.displayName,
      competitionType: "international",
      tournamentName: race.displayName,
    });
  }

  console.log(`  Paddling: ${events.length} races in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergePaddlingEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): PaddlingMergeResult {
  const freshIds = new Set(fresh.map(e => e.id));
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    // Drop stale paddling cache entries not in the fresh schedule
    // (handles removed/renamed races).
    if (e.id.startsWith("paddling-sabig3-") && !freshIds.has(e.id)) continue;
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
  const windowEnd = new Date(now.getTime() + 365 * 86400000);

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
