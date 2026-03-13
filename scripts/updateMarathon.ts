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
  eventType?: string;
  sessionTitle?: string;
  competitionType?: string;
  tournamentName?: string;
}

export interface MarathonFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  raceCounts: Record<string, number>;
}

export interface MarathonMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface MarathonEvent {
  name: string;
  city: string;
  country: string;
  startUtc: string;
  durationMin: number;
}

const MARATHON_DURATION_MIN = 360;

const MARATHONS: MarathonEvent[] = [
  {
    name: "Tokyo Marathon",
    city: "Tokyo",
    country: "Japan",
    startUtc: "2026-03-01T00:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "Boston Marathon",
    city: "Boston",
    country: "USA",
    startUtc: "2026-04-20T14:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "London Marathon",
    city: "London",
    country: "UK",
    startUtc: "2026-04-26T08:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "Sydney Marathon",
    city: "Sydney",
    country: "Australia",
    startUtc: "2026-08-29T21:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "Berlin Marathon",
    city: "Berlin",
    country: "Germany",
    startUtc: "2026-09-27T07:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "Chicago Marathon",
    city: "Chicago",
    country: "USA",
    startUtc: "2026-10-11T13:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
  {
    name: "New York City Marathon",
    city: "New York City",
    country: "USA",
    startUtc: "2026-11-01T14:00:00.000Z",
    durationMin: MARATHON_DURATION_MIN,
  },
];

function stableId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `athletics-marathon-${slug}`;
}

export function fetchMarathonEvents(): MarathonFetchResult {
  console.log(`  Marathon: Generating schedule for ${MARATHONS.length} World Marathon Majors...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 120 * 86400000);

  const events: AppEvent[] = [];
  const raceCounts: Record<string, number> = {};

  for (const marathon of MARATHONS) {
    const start = new Date(marathon.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + marathon.durationMin * 60000).toISOString();
    const id = stableId(marathon.name);

    events.push({
      id,
      sport: "athletics",
      league: "World Marathon Majors",
      awayTeam: "",
      homeTeam: marathon.name,
      startTimeLocal: marathon.startUtc,
      endTimeLocal: endUtc,
      providerId: "flosports",
      isLive: false,
      source: "marathon-hardcoded",
      leagueKey: "marathon-majors",
      eventType: "session",
      sessionTitle: marathon.name,
      competitionType: "international",
      tournamentName: marathon.name,
    });

    raceCounts[marathon.name] = 1;
  }

  console.log(`  Marathon: ${events.length} events in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length, raceCounts };
}

export function mergeMarathonEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): MarathonMergeResult {
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
  const windowEnd = new Date(now.getTime() + 120 * 86400000);

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
