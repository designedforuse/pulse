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
}

export interface MlrFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  firstMatchDate?: string;
}

export interface MlrMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

const DURATION_MIN = 135;

const MLR_2026_SCHEDULE: Array<{
  week: number;
  date: string;
  time: string;
  home: string;
  away: string;
}> = [
  { week: 1, date: "2026-03-28", time: "18:00", home: "California Legion", away: "Anthem RC" },
  { week: 2, date: "2026-04-03", time: "22:30", home: "Seattle Seawolves", away: "Old Glory DC" },
  { week: 2, date: "2026-04-04", time: "16:00", home: "Anthem RC", away: "Chicago Hounds" },
  { week: 2, date: "2026-04-04", time: "19:00", home: "California Legion", away: "New England Free Jacks" },
  { week: 3, date: "2026-04-11", time: "16:00", home: "New England Free Jacks", away: "Old Glory DC" },
  { week: 3, date: "2026-04-12", time: "16:00", home: "Anthem RC", away: "Seattle Seawolves" },
  { week: 3, date: "2026-04-12", time: "20:00", home: "Chicago Hounds", away: "California Legion" },
  { week: 4, date: "2026-04-18", time: "16:00", home: "Anthem RC", away: "Old Glory DC" },
  { week: 4, date: "2026-04-19", time: "16:00", home: "Chicago Hounds", away: "New England Free Jacks" },
  { week: 4, date: "2026-04-19", time: "20:00", home: "California Legion", away: "Seattle Seawolves" },
  { week: 5, date: "2026-04-24", time: "22:00", home: "Seattle Seawolves", away: "Chicago Hounds" },
  { week: 5, date: "2026-04-26", time: "16:00", home: "New England Free Jacks", away: "Anthem RC" },
  { week: 5, date: "2026-04-26", time: "19:00", home: "Old Glory DC", away: "California Legion" },
  { week: 6, date: "2026-05-03", time: "16:00", home: "New England Free Jacks", away: "Seattle Seawolves" },
  { week: 6, date: "2026-05-03", time: "20:00", home: "Chicago Hounds", away: "Old Glory DC" },
  { week: 7, date: "2026-05-09", time: "16:00", home: "Anthem RC", away: "California Legion" },
  { week: 7, date: "2026-05-10", time: "16:00", home: "New England Free Jacks", away: "Chicago Hounds" },
  { week: 7, date: "2026-05-10", time: "20:00", home: "Seattle Seawolves", away: "Old Glory DC" },
  { week: 8, date: "2026-05-16", time: "20:00", home: "California Legion", away: "Chicago Hounds" },
  { week: 8, date: "2026-05-17", time: "16:00", home: "Old Glory DC", away: "New England Free Jacks" },
  { week: 8, date: "2026-05-17", time: "20:00", home: "Seattle Seawolves", away: "Anthem RC" },
  { week: 9, date: "2026-05-23", time: "16:00", home: "New England Free Jacks", away: "Old Glory DC" },
  { week: 9, date: "2026-05-24", time: "16:00", home: "Chicago Hounds", away: "Seattle Seawolves" },
  { week: 9, date: "2026-05-24", time: "20:00", home: "California Legion", away: "Anthem RC" },
  { week: 10, date: "2026-05-30", time: "16:00", home: "Anthem RC", away: "Seattle Seawolves" },
  { week: 10, date: "2026-05-31", time: "16:00", home: "New England Free Jacks", away: "California Legion" },
  { week: 10, date: "2026-05-31", time: "20:00", home: "Chicago Hounds", away: "Old Glory DC" },
  { week: 11, date: "2026-06-06", time: "16:00", home: "Old Glory DC", away: "Anthem RC" },
  { week: 11, date: "2026-06-07", time: "16:00", home: "Chicago Hounds", away: "New England Free Jacks" },
  { week: 11, date: "2026-06-07", time: "20:00", home: "Seattle Seawolves", away: "California Legion" },
  { week: 12, date: "2026-06-13", time: "16:00", home: "Anthem RC", away: "Chicago Hounds" },
  { week: 12, date: "2026-06-14", time: "16:00", home: "Old Glory DC", away: "New England Free Jacks" },
  { week: 12, date: "2026-06-14", time: "20:00", home: "California Legion", away: "Seattle Seawolves" },
  { week: 13, date: "2026-06-20", time: "16:00", home: "New England Free Jacks", away: "Anthem RC" },
  { week: 13, date: "2026-06-21", time: "16:00", home: "Chicago Hounds", away: "California Legion" },
  { week: 13, date: "2026-06-21", time: "20:00", home: "Old Glory DC", away: "Seattle Seawolves" },
];

function etToUtc(date: string, timeEt: string): string {
  const dtStr = `${date}T${timeEt}:00`;
  const etDate = new Date(new Date(dtStr + "-04:00").toISOString());
  const month = etDate.getUTCMonth() + 1;
  const isDst = month >= 3 && month <= 10;
  if (isDst) {
    return new Date(dtStr + "-04:00").toISOString();
  }
  return new Date(dtStr + "-05:00").toISOString();
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function stableId(startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `rugby-mlr-${dateStr}-${timeStr}-${a}-at-${h}`;
}

export function fetchMlrEvents(): MlrFetchResult {
  console.log(`  MLR: Loading hardcoded 2026 schedule (${MLR_2026_SCHEDULE.length} matches)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const events: AppEvent[] = [];
  const seenIds = new Set<string>();
  let firstMatchUtc: string | null = null;

  for (const match of MLR_2026_SCHEDULE) {
    const startUtc = etToUtc(match.date, match.time);

    if (!firstMatchUtc || startUtc < firstMatchUtc) {
      firstMatchUtc = startUtc;
    }

    const startDate = new Date(startUtc);
    if (startDate < windowStart || startDate > windowEnd) continue;

    const endUtc = addDuration(startUtc, DURATION_MIN);
    const id = stableId(startUtc, match.away, match.home);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    events.push({
      id,
      sport: "rugby",
      league: "MLR",
      awayTeam: match.away,
      homeTeam: match.home,
      startTimeLocal: startUtc,
      endTimeLocal: endUtc,
      providerId: "disneyplus",
      isLive: false,
      source: "rugby-mlr",
      leagueKey: "mlr",
      providerReason: "mlr-disneyplus",
    });
  }

  console.log(`  MLR: ${events.length} events in retention window`);
  if (firstMatchUtc) {
    console.log(`  MLR: First match: ${firstMatchUtc}`);
  }

  return { events, sourceUsed: "hardcoded", count: events.length, firstMatchDate: firstMatchUtc ?? undefined };
}

export function mergeMlrEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): MlrMergeResult {
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  // Authoritative-feed pruning: the hardcoded MLR_2026_SCHEDULE is the source of truth
  // for this league. Any existing rugby-mlr-* event inside the retention window that is
  // missing from `fresh` is a stale fixture (matchup correction, postponement, etc.) and
  // must be removed. Without this guard, edits to the schedule leave phantom events
  // behind — which is exactly how a non-existent fixture ended up flagged LIVE by the
  // time-based fallback in utils/gameState.ts. Only prune when fresh is non-empty so a
  // transient fetch failure doesn't wipe the cache.
  const freshById = new Map<string, AppEvent>();
  for (const e of fresh) freshById.set(e.id, e);

  const index = new Map<string, AppEvent>();
  let pruned = 0;

  for (const e of existing) {
    const isMlr = typeof e.id === "string" && e.id.startsWith("rugby-mlr-");
    if (!isMlr) {
      index.set(e.id, e);
      continue;
    }
    const start = new Date(e.startTimeLocal);
    const inWindow = start >= windowStart && start <= windowEnd;
    if (inWindow && freshById.size > 0 && !freshById.has(e.id)) {
      pruned++;
      continue;
    }
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

  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const isMlr = typeof e.id === "string" && e.id.startsWith("rugby-mlr-");
    if (!isMlr) {
      merged.push(e);
      continue;
    }
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    } else {
      pruned++;
    }
  }

  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
