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

export interface ComradesFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface ComradesMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface ComradesRace {
  id: string;
  edition: string;
  direction: "Up Run" | "Down Run";
  startUtc: string;
  durationMin: number;
}

// 2026 Comrades Marathon — 99th edition, Down Run (Pietermaritzburg → Durban).
// Sunday June 14, 2026, gun at 05:30 SAST (03:30 UTC), 12-hour cutoff.
// Re-verify date/start against comrades.com when official confirmation
// posts — historical pattern is the 2nd Sunday in June.
const COMRADES_RACES: ComradesRace[] = [
  {
    id: "athletics-comrades-2026",
    edition: "99th Comrades Marathon",
    direction: "Down Run",
    startUtc: "2026-06-14T03:30:00.000Z",
    durationMin: 12 * 60,
  },
];

export function fetchComradesEvents(): ComradesFetchResult {
  console.log(`  Comrades: Generating schedule (${COMRADES_RACES.length} race)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 365 * 86400000);

  const events: AppEvent[] = [];

  for (const race of COMRADES_RACES) {
    const start = new Date(race.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    const endUtc = new Date(start.getTime() + race.durationMin * 60000).toISOString();
    const name = `Comrades Marathon — ${race.direction}`;

    events.push({
      id: race.id,
      sport: "athletics",
      league: "Comrades Marathon",
      awayTeam: "",
      homeTeam: name,
      startTimeLocal: race.startUtc,
      endTimeLocal: endUtc,
      providerId: "youtube",
      isLive: false,
      source: "comrades-hardcoded",
      leagueKey: "comrades",
      providerReason: "comrades-youtube",
      eventType: "session",
      sessionTitle: race.edition,
      competitionType: "international",
      tournamentName: name,
    });
  }

  console.log(`  Comrades: ${events.length} race(s) in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeComradesEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): ComradesMergeResult {
  const freshIds = new Set(fresh.map((e) => e.id));
  const index = new Map<string, AppEvent>();

  // Drop any cached comrades events not in the fresh schedule (handles
  // renamed/removed editions so stale entries don't linger).
  for (const e of existing) {
    if (e.id.startsWith("athletics-comrades-") && !freshIds.has(e.id)) continue;
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
