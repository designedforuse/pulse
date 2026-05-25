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
  id: string;
  displayName: string;
  city: string;
  country: string;
  startUtc: string;
  endUtc: string;
}

// 2026 World Rally Championship calendar — 14 rounds.
// Source: FIA-published 2026 WRC calendar via https://www.wrc.com/en/calendar
// Dates reflect each rally's competitive window (super-special stage Thursday
// evening through Power Stage Sunday afternoon). Re-verify against the
// official WRC site when dates firm up closer to each event.
// All rounds route to YouTube (WRC's official channel hosts highlights
// and select live coverage in the US).
const WRC_ROUNDS: WrcRound[] = [
  {
    id: "racing-wrc-monte-carlo-2026",
    displayName: "Rallye Monte-Carlo",
    city: "Monte Carlo",
    country: "Monaco",
    startUtc: "2026-01-22T18:00:00.000Z", // Thu Jan 22 evening shakedown
    endUtc: "2026-01-25T15:00:00.000Z",   // Sun Jan 25 Power Stage
  },
  {
    id: "racing-wrc-sweden-2026",
    displayName: "Rally Sweden",
    city: "Umeå",
    country: "Sweden",
    startUtc: "2026-02-12T15:00:00.000Z",
    endUtc: "2026-02-15T14:00:00.000Z",
  },
  {
    id: "racing-wrc-kenya-2026",
    displayName: "Safari Rally Kenya",
    city: "Naivasha",
    country: "Kenya",
    startUtc: "2026-03-19T05:00:00.000Z",
    endUtc: "2026-03-22T11:00:00.000Z",
  },
  {
    id: "racing-wrc-canarias-2026",
    displayName: "Rally Islas Canarias",
    city: "Las Palmas",
    country: "Spain",
    startUtc: "2026-04-23T08:00:00.000Z",
    endUtc: "2026-04-26T14:00:00.000Z",
  },
  {
    id: "racing-wrc-portugal-2026",
    displayName: "Rally de Portugal",
    city: "Matosinhos",
    country: "Portugal",
    startUtc: "2026-05-14T08:00:00.000Z",
    endUtc: "2026-05-17T13:00:00.000Z",
  },
  {
    id: "racing-wrc-sardegna-2026",
    displayName: "Rally Italia Sardegna",
    city: "Alghero",
    country: "Italy",
    startUtc: "2026-06-04T06:00:00.000Z",
    endUtc: "2026-06-07T12:00:00.000Z",
  },
  {
    id: "racing-wrc-acropolis-2026",
    displayName: "Acropolis Rally Greece",
    city: "Lamia",
    country: "Greece",
    startUtc: "2026-09-03T06:00:00.000Z",
    endUtc: "2026-09-06T12:00:00.000Z",
  },
  {
    id: "racing-wrc-estonia-2026",
    displayName: "Rally Estonia",
    city: "Tartu",
    country: "Estonia",
    startUtc: "2026-07-16T08:00:00.000Z",
    endUtc: "2026-07-19T13:00:00.000Z",
  },
  {
    id: "racing-wrc-finland-2026",
    displayName: "Rally Finland",
    city: "Jyväskylä",
    country: "Finland",
    startUtc: "2026-07-30T08:00:00.000Z",
    endUtc: "2026-08-02T13:00:00.000Z",
  },
  {
    id: "racing-wrc-paraguay-2026",
    displayName: "Rally Paraguay",
    city: "Encarnación",
    country: "Paraguay",
    startUtc: "2026-08-27T13:00:00.000Z",
    endUtc: "2026-08-30T19:00:00.000Z",
  },
  {
    id: "racing-wrc-chile-2026",
    displayName: "Rally Chile",
    city: "Concepción",
    country: "Chile",
    startUtc: "2026-09-24T13:00:00.000Z",
    endUtc: "2026-09-27T19:00:00.000Z",
  },
  {
    id: "racing-wrc-central-european-2026",
    displayName: "Central European Rally",
    city: "Passau",
    country: "Germany / Austria / Czechia",
    startUtc: "2026-10-15T08:00:00.000Z",
    endUtc: "2026-10-18T13:00:00.000Z",
  },
  {
    id: "racing-wrc-japan-2026",
    displayName: "Rally Japan",
    city: "Toyota City",
    country: "Japan",
    startUtc: "2026-11-05T00:00:00.000Z",
    endUtc: "2026-11-08T07:00:00.000Z",
  },
  {
    id: "racing-wrc-saudi-arabia-2026",
    displayName: "Rally Saudi Arabia",
    city: "Jeddah",
    country: "Saudi Arabia",
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

  for (const round of WRC_ROUNDS) {
    const start = new Date(round.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    events.push({
      id: round.id,
      sport: "racing",
      league: "WRC",
      awayTeam: "",
      homeTeam: round.displayName,
      startTimeLocal: round.startUtc,
      endTimeLocal: round.endUtc,
      providerId: "youtube",
      providerReason: "wrc-youtube",
      isLive: false,
      source: "wrc-hardcoded",
      leagueKey: "wrc",
      eventType: "session",
      sessionTitle: round.displayName,
      competitionType: "international",
      tournamentName: round.displayName,
    });
  }

  console.log(`  WRC: ${events.length} rounds in retention window`);

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
    // (handles removed/renamed rounds).
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
