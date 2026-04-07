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

export interface CyclingFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  tourCounts: Record<string, number>;
}

export interface CyclingMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface GrandTour {
  name: string;
  route: string;
  startUtc: string;
  endUtc: string;
  providerId: string;
  providerReason: string;
}

const GRAND_TOURS: GrandTour[] = [
  {
    name: "Giro d'Italia",
    route: "Nessebar, Bulgaria → Rome, Italy",
    startUtc: "2026-05-08T12:00:00.000Z",
    endUtc: "2026-05-31T22:00:00.000Z",
    providerId: "youtubetv",
    providerReason: "tnt-broadcast",
  },
  {
    name: "Tour de France",
    route: "Barcelona, Spain → Paris, France",
    startUtc: "2026-07-04T12:00:00.000Z",
    endUtc: "2026-07-26T22:00:00.000Z",
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
  },
  {
    name: "Vuelta a España",
    route: "Monaco → Madrid, Spain",
    startUtc: "2026-08-22T12:00:00.000Z",
    endUtc: "2026-09-13T22:00:00.000Z",
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
  },
];

function stableId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `cycling-grand-tour-${slug}-2026`;
}

export function fetchCyclingEvents(): CyclingFetchResult {
  console.log(`  Cycling: Generating Grand Tour schedule (${GRAND_TOURS.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 180 * 86400000);

  const events: AppEvent[] = [];
  const tourCounts: Record<string, number> = {};

  for (const tour of GRAND_TOURS) {
    const start = new Date(tour.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const id = stableId(tour.name);
    const durationMin = Math.round((new Date(tour.endUtc).getTime() - start.getTime()) / 60000);

    events.push({
      id,
      sport: "cycling",
      league: "Grand Tour",
      awayTeam: tour.route,
      homeTeam: tour.name,
      startTimeLocal: tour.startUtc,
      endTimeLocal: tour.endUtc,
      providerId: tour.providerId,
      isLive: false,
      source: "cycling-hardcoded",
      leagueKey: "grand-tour",
      providerReason: tour.providerReason,
      eventType: "session",
      sessionTitle: `${tour.name} 2026`,
      competitionType: "international",
      tournamentName: tour.name,
    });

    tourCounts[tour.name] = 1;
  }

  console.log(`  Cycling: ${events.length} races in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length, tourCounts };
}

export function mergeCyclingEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): CyclingMergeResult {
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
  const windowEnd = new Date(now.getTime() + 180 * 86400000);

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
