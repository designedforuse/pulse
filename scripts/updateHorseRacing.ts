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

export interface HorseRacingFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  raceCounts: Record<string, number>;
}

export interface HorseRacingMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface TripleCrownRace {
  name: string;
  shortName: string;
  location: string;
  startUtc: string;
  durationMin: number;
  providerId: string;
  providerReason: string;
}

const TRIPLE_CROWN_RACES: TripleCrownRace[] = [
  {
    name: "Kentucky Derby",
    shortName: "Kentucky Derby",
    location: "Churchill Downs, Louisville KY",
    startUtc: "2026-05-02T18:30:00.000Z",
    durationMin: 360,
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
  },
  {
    name: "Preakness Stakes",
    shortName: "Preakness Stakes",
    location: "Laurel Park, Laurel MD",
    startUtc: "2026-05-16T18:30:00.000Z",
    durationMin: 360,
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
  },
  {
    name: "Belmont Stakes",
    shortName: "Belmont Stakes",
    location: "Saratoga Race Course, Saratoga Springs NY",
    startUtc: "2026-06-06T18:30:00.000Z",
    durationMin: 360,
    providerId: "youtubetv",
    providerReason: "nbc-broadcast",
  },
];

function stableId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `horse-racing-triple-crown-${slug}`;
}

export function fetchHorseRacingEvents(): HorseRacingFetchResult {
  console.log(`  Horse Racing: Generating Triple Crown schedule (${TRIPLE_CROWN_RACES.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 120 * 86400000);

  const events: AppEvent[] = [];
  const raceCounts: Record<string, number> = {};

  for (const race of TRIPLE_CROWN_RACES) {
    const start = new Date(race.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + race.durationMin * 60000).toISOString();
    const id = stableId(race.name);

    events.push({
      id,
      sport: "horse-racing",
      league: "Triple Crown",
      awayTeam: race.location,
      homeTeam: race.name,
      startTimeLocal: race.startUtc,
      endTimeLocal: endUtc,
      providerId: race.providerId,
      isLive: false,
      source: "horse-racing-hardcoded",
      leagueKey: "triple-crown",
      providerReason: race.providerReason,
      eventType: "session",
      sessionTitle: race.shortName,
      competitionType: "domestic",
      tournamentName: race.name,
    });

    raceCounts[race.name] = 1;
  }

  console.log(`  Horse Racing: ${events.length} races in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length, raceCounts };
}

export function mergeHorseRacingEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): HorseRacingMergeResult {
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
