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
  dayNumber?: number;
  totalDays?: number;
}

export interface WrcFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface WrcMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface WrcRound {
  round: number;
  id: string;
  displayName: string;
  city: string;
  country: string;
  surface: string;
  startUtc: string;
  endUtc: string;
}

// 2026 World Rally Championship calendar — 14 rounds.
// Source: official FIA 2026 WRC calendar via https://www.wrc.com/en/calendar
// Round order and surface types verified against wrc.com (May 2026).
// Exact start/end dates are best-effort placements within each rally's
// usual month — re-verify against wrc.com when each event approaches.
// All rounds route to YouTube (WRC's official channel for US viewers).
const WRC_ROUNDS: WrcRound[] = [
  {
    round: 1,
    id: "racing-wrc-monte-carlo-2026",
    displayName: "Rallye Monte-Carlo",
    city: "Monte Carlo",
    country: "Monaco",
    surface: "Asphalt / Ice",
    startUtc: "2026-01-22T18:00:00.000Z",
    endUtc: "2026-01-25T15:00:00.000Z",
  },
  {
    round: 2,
    id: "racing-wrc-sweden-2026",
    displayName: "Rally Sweden",
    city: "Umeå",
    country: "Sweden",
    surface: "Snow / Ice",
    startUtc: "2026-02-12T15:00:00.000Z",
    endUtc: "2026-02-15T14:00:00.000Z",
  },
  {
    round: 3,
    id: "racing-wrc-kenya-2026",
    displayName: "Safari Rally Kenya",
    city: "Naivasha",
    country: "Kenya",
    surface: "Gravel",
    startUtc: "2026-03-19T05:00:00.000Z",
    endUtc: "2026-03-22T11:00:00.000Z",
  },
  {
    round: 4,
    id: "racing-wrc-croatia-2026",
    displayName: "Croatia Rally",
    city: "Zagreb",
    country: "Croatia",
    surface: "Asphalt",
    startUtc: "2026-04-16T08:00:00.000Z",
    endUtc: "2026-04-19T13:00:00.000Z",
  },
  {
    round: 5,
    id: "racing-wrc-canarias-2026",
    displayName: "Rally Islas Canarias",
    city: "Las Palmas",
    country: "Spain",
    surface: "Asphalt",
    startUtc: "2026-04-30T08:00:00.000Z",
    endUtc: "2026-05-03T14:00:00.000Z",
  },
  {
    round: 6,
    id: "racing-wrc-portugal-2026",
    displayName: "Rally de Portugal",
    city: "Matosinhos",
    country: "Portugal",
    surface: "Gravel",
    startUtc: "2026-05-14T08:00:00.000Z",
    endUtc: "2026-05-17T13:00:00.000Z",
  },
  {
    round: 7,
    id: "racing-wrc-japan-2026",
    displayName: "Rally Japan",
    city: "Toyota City",
    country: "Japan",
    surface: "Asphalt",
    startUtc: "2026-05-28T23:00:00.000Z",
    endUtc: "2026-05-31T07:00:00.000Z",
  },
  {
    round: 8,
    id: "racing-wrc-acropolis-2026",
    displayName: "Acropolis Rally Greece",
    city: "Lamia",
    country: "Greece",
    surface: "Gravel",
    startUtc: "2026-06-25T06:00:00.000Z",
    endUtc: "2026-06-28T12:00:00.000Z",
  },
  {
    round: 9,
    id: "racing-wrc-estonia-2026",
    displayName: "Rally Estonia",
    city: "Tartu",
    country: "Estonia",
    surface: "Gravel",
    startUtc: "2026-07-16T08:00:00.000Z",
    endUtc: "2026-07-19T13:00:00.000Z",
  },
  {
    round: 10,
    id: "racing-wrc-finland-2026",
    displayName: "Rally Finland",
    city: "Jyväskylä",
    country: "Finland",
    surface: "Gravel",
    startUtc: "2026-07-30T08:00:00.000Z",
    endUtc: "2026-08-02T13:00:00.000Z",
  },
  {
    round: 11,
    id: "racing-wrc-paraguay-2026",
    displayName: "Rally del Paraguay",
    city: "Encarnación",
    country: "Paraguay",
    surface: "Gravel",
    startUtc: "2026-08-27T13:00:00.000Z",
    endUtc: "2026-08-30T19:00:00.000Z",
  },
  {
    round: 12,
    id: "racing-wrc-chile-2026",
    displayName: "Rally Chile",
    city: "Concepción",
    country: "Chile",
    surface: "Gravel",
    startUtc: "2026-09-10T13:00:00.000Z",
    endUtc: "2026-09-13T19:00:00.000Z",
  },
  {
    round: 13,
    id: "racing-wrc-sardegna-2026",
    displayName: "Rally Italia Sardegna",
    city: "Alghero",
    country: "Italy",
    surface: "Gravel",
    startUtc: "2026-10-01T06:00:00.000Z",
    endUtc: "2026-10-04T12:00:00.000Z",
  },
  {
    round: 14,
    id: "racing-wrc-saudi-arabia-2026",
    displayName: "Rally Saudi Arabia",
    city: "Jeddah",
    country: "Saudi Arabia",
    surface: "Gravel / Sand",
    startUtc: "2026-11-26T13:00:00.000Z",
    endUtc: "2026-11-29T19:00:00.000Z",
  },
];

export function fetchWrcEvents(): WrcFetchResult {
  console.log(`  WRC: Generating schedule (${WRC_ROUNDS.length} rounds)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 365 * 86400000);

  const events: AppEvent[] = [];

  // Rally weekends run across several days. Generate one event card per day so
  // each day shows independently, and cap each day at 8 hours of racing so the
  // card doesn't read as "live" overnight between stages.
  const DAY_MS = 86400000;
  const DAY_DURATION_MS = 8 * 60 * 60 * 1000;

  for (const round of WRC_ROUNDS) {
    const start = new Date(round.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const startMs = new Date(round.startUtc).getTime();
    const endMs = new Date(round.endUtc).getTime();
    const totalDays = Math.max(1, Math.floor((endMs - startMs) / DAY_MS) + 1);

    for (let i = 0; i < totalDays; i++) {
      const dayStartMs = startMs + i * DAY_MS;
      // Cap at 8 hours, but never run past the rally's real end (the final day
      // is often shorter than 8h, e.g. ends 12:00 from an 06:00 start).
      const dayEndMs = Math.min(dayStartMs + DAY_DURATION_MS, endMs);

      events.push({
        id: `${round.id}-day${i + 1}`,
        sport: "racing",
        league: "WRC",
        awayTeam: "",
        homeTeam: round.displayName,
        startTimeLocal: new Date(dayStartMs).toISOString(),
        endTimeLocal: new Date(dayEndMs).toISOString(),
        providerId: "youtube",
        providerReason: "wrc-youtube",
        isLive: false,
        source: "wrc-hardcoded",
        leagueKey: "wrc",
        eventType: "session",
        sessionTitle: `Round ${round.round} · ${round.displayName}`,
        competitionType: "international",
        tournamentName: round.displayName,
        dayNumber: i + 1,
        totalDays,
      });
    }
  }

  console.log(`  WRC: ${events.length} rally-days in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeWrcEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): WrcMergeResult {
  const freshIds = new Set(fresh.map(e => e.id));
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    // Drop stale WRC cache entries not in the fresh schedule
    // (handles removed/renamed rounds, e.g. Central European Rally dropped for 2026).
    if (e.id.startsWith("racing-wrc-") && !freshIds.has(e.id)) continue;
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
