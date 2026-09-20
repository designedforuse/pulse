const SOCCER_DURATION_MIN = 135;
const ESPN_EPL_API =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard";

interface AppEvent {
  id: string;
  externalId?: string;
  espnId?: string;
  sourceEventId?: string;
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

interface EspnCompetitor {
  homeAway: string;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  competitions?: {
    competitors?: EspnCompetitor[];
  }[];
}

export interface EplFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface EplMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

function addDuration(isoString: string, minutes: number): string {
  return new Date(new Date(isoString).getTime() + minutes * 60000).toISOString();
}

function retentionWindow(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(now.getTime() - 14 * 86400000),
    end: new Date(now.getTime() + 21 * 86400000),
  };
}

function eventEspnId(event: AppEvent): string | undefined {
  const explicit = event.espnId || event.externalId || event.sourceEventId;
  if (explicit) return String(explicit);
  return event.id.match(/^soccer-epl-espn-(.+)$/i)?.[1];
}

function normalizedTeam(name: string): string {
  return name.toLowerCase().replace(/\bfc\b/g, "").replace(/[^a-z0-9]/g, "");
}

function teamIdentity(event: AppEvent): string {
  return `${normalizedTeam(event.homeTeam)}|${normalizedTeam(event.awayTeam)}`;
}

/**
 * Convert ESPN scoreboard rows to app events. Exported so feed-shape and
 * identity behavior can be regression tested without making a network call.
 */
export function parseEspnEplEvents(
  espnEvents: EspnEvent[],
  now: Date = new Date(),
): AppEvent[] {
  const { start, end } = retentionWindow(now);
  const events: AppEvent[] = [];
  const seenEspnIds = new Set<string>();

  for (const espnEvent of espnEvents) {
    const startDate = new Date(espnEvent.date);
    if (!espnEvent.id || !Number.isFinite(startDate.getTime())) continue;
    if (startDate < start || startDate > end) continue;

    const competitors = espnEvent.competitions?.[0]?.competitors;
    const home = competitors?.find((team) => team.homeAway === "home");
    const away = competitors?.find((team) => team.homeAway === "away");
    const homeTeam = home?.team?.displayName || home?.team?.shortDisplayName;
    const awayTeam = away?.team?.displayName || away?.team?.shortDisplayName;
    if (!homeTeam || !awayTeam || seenEspnIds.has(String(espnEvent.id))) continue;

    const espnId = String(espnEvent.id);
    const startUtc = startDate.toISOString();
    seenEspnIds.add(espnId);
    events.push({
      id: `soccer-epl-espn-${espnId}`,
      externalId: espnId,
      espnId,
      sourceEventId: espnId,
      sport: "soccer",
      league: "EPL",
      awayTeam,
      homeTeam,
      startTimeLocal: startUtc,
      endTimeLocal: addDuration(startUtc, SOCCER_DURATION_MIN),
      // Preserve the existing EPL viewing-provider mapping.
      providerId: "youtubetv",
      isLive: false,
      source: "soccer-epl",
      leagueKey: "epl",
      providerReason: "epl-yttv",
    });
  }

  return events.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
  );
}

async function fetchEspnYear(year: number): Promise<EspnEvent[]> {
  // ESPN rejects multi-day date ranges for eng.1, but its supported YYYY form
  // returns the full calendar year. Filtering is done locally.
  const url = `${ESPN_EPL_API}?dates=${year}&limit=500`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
  });
  if (!response.ok) {
    throw new Error(`ESPN API returned ${response.status} for ${year}`);
  }
  const body = await response.json() as { events?: EspnEvent[] };
  if (!Array.isArray(body.events)) {
    throw new Error(`ESPN API returned an invalid events payload for ${year}`);
  }
  return body.events;
}

export async function fetchEplEvents(now: Date = new Date()): Promise<EplFetchResult> {
  console.log("  EPL: Fetching from ESPN API...");
  try {
    const { start, end } = retentionWindow(now);
    const years = Array.from(new Set([start.getUTCFullYear(), end.getUTCFullYear()]));
    const pages = await Promise.all(years.map(fetchEspnYear));
    const events = parseEspnEplEvents(pages.flat(), now);
    console.log(`  EPL: ${events.length} ESPN events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error("  EPL: Error fetching ESPN API:", err.message);
    // mergeEplEvents retains in-window cache rows when this empty result is
    // returned, preventing a transient fetch failure from erasing fixtures.
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeEplEvents(
  existing: AppEvent[],
  fetched: AppEvent[],
  now: Date,
): EplMergeResult {
  const { start, end } = retentionWindow(now);
  const consumedExisting = new Set<AppEvent>();
  const merged: AppEvent[] = [];
  let added = 0;
  let updated = 0;

  for (const fresh of fetched) {
    const freshEspnId = eventEspnId(fresh);
    const match = existing.find((cached) => {
      if (consumedExisting.has(cached)) return false;
      const cachedEspnId = eventEspnId(cached);
      if (freshEspnId && cachedEspnId) return freshEspnId === cachedEspnId;
      // This reconciles kickoff-derived iCal ids with ESPN ids, including
      // rescheduled matches whose date/time changed.
      return teamIdentity(fresh) === teamIdentity(cached);
    });
    if (match) {
      consumedExisting.add(match);
      updated++;
    } else {
      added++;
    }
    merged.push(fresh);
  }

  // ESPN pages can be transiently empty or incomplete. Keep unmatched cached
  // rows inside the retention window rather than interpreting omission as a
  // cancellation.
  for (const cached of existing) {
    if (consumedExisting.has(cached)) continue;
    const startTime = new Date(cached.startTimeLocal);
    if (startTime >= start && startTime <= end) merged.push(cached);
  }

  const seen = new Set<string>();
  const deduped = merged.filter((event) => {
    const identity = eventEspnId(event)
      ? `espn:${eventEspnId(event)}`
      : `teams:${teamIdentity(event)}:${event.startTimeLocal.slice(0, 10)}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  deduped.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
  );

  const includedExisting = new Set(deduped.filter((event) => existing.includes(event)));
  const pruned = existing.filter(
    (event) => !consumedExisting.has(event) && !includedExisting.has(event),
  ).length;
  return { merged: deduped, added, updated, pruned };
}