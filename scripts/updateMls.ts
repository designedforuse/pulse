import * as fs from "fs";
import * as path from "path";

const SOCCER_DURATION_MIN = 135;
const ESPN_MLS_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard";

// Retention window: -14 days past, +21 days future.
const PAST_DAYS = 14;
const FUTURE_DAYS = 21;

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

export interface MlsFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface MlsMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface EspnCompetitor {
  homeAway?: string;
  team?: { displayName?: string; shortDisplayName?: string };
}

interface EspnCompetition {
  date?: string;
  competitors?: EspnCompetitor[];
}

interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
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
  return `soccer-mls-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function fetchMlsEvents(): Promise<MlsFetchResult> {
  const now = new Date();
  const dates: string[] = [];
  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
    const d = new Date(now.getTime() + offset * 86400000);
    dates.push(ymd(d));
  }

  console.log(`  MLS: Fetching ESPN scoreboard for ${dates.length} dates (${dates[0]} → ${dates[dates.length - 1]})...`);

  const events: AppEvent[] = [];
  const seenIds = new Set<string>();
  let totalEspnEvents = 0;
  let httpErrors = 0;

  for (const dateStr of dates) {
    try {
      const url = `${ESPN_MLS_URL}?dates=${dateStr}&limit=100`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
      });
      if (!res.ok) {
        httpErrors++;
        continue;
      }
      const data = (await res.json()) as { events?: EspnEvent[] };
      const espnEvents = data.events || [];
      totalEspnEvents += espnEvents.length;

      for (const ev of espnEvents) {
        const comp = (ev.competitions || [])[0];
        if (!comp) continue;

        const startUtc = ev.date || comp.date;
        if (!startUtc) continue;
        const startIso = new Date(startUtc).toISOString();

        const home = comp.competitors?.find((c) => c.homeAway === "home")?.team?.displayName;
        const away = comp.competitors?.find((c) => c.homeAway === "away")?.team?.displayName;
        if (!home || !away) continue;

        const id = stableId(startIso, away, home);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        events.push({
          id,
          sport: "soccer",
          league: "MLS",
          awayTeam: away,
          homeTeam: home,
          startTimeLocal: startIso,
          endTimeLocal: addDuration(startIso, SOCCER_DURATION_MIN),
          providerId: "appletv",
          isLive: false,
          source: "soccer-mls",
          leagueKey: "mls",
          providerReason: "mls-appletv",
        });
      }
    } catch (err: any) {
      httpErrors++;
      console.warn(`  MLS: ESPN fetch failed for ${dateStr}: ${err?.message ?? err}`);
    }
  }

  events.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  console.log(`  MLS: ${events.length} events from ESPN (raw=${totalEspnEvents}, errors=${httpErrors})`);
  return { events, sourceUsed: "espn", count: events.length };
}

export function mergeMlsEvents(
  existing: AppEvent[],
  fetched: AppEvent[],
  now: Date
): MlsMergeResult {
  const windowStart = new Date(now.getTime() - PAST_DAYS * 86400000);
  const windowEnd = new Date(now.getTime() + FUTURE_DAYS * 86400000);

  // ESPN is the source of truth (the prior fixturedownload feed had wrong
  // kickoff times for several games and used inconsistent team display names
  // like "Atlanta United" vs "Atlanta United FC"). When the fetch succeeds
  // with at least one event, replace the entire in-window slice with the
  // fetched data. Out-of-window historical events are preserved untouched.
  // If the fetch returned nothing at all (transient outage), keep the
  // existing cache rather than wiping it.
  if (fetched.length === 0) {
    return { merged: [...existing], added: 0, updated: 0, pruned: 0 };
  }

  const merged: AppEvent[] = [];
  let pruned = 0;
  for (const e of existing) {
    const start = new Date(e.startTimeLocal);
    if (start < windowStart || start > windowEnd) {
      merged.push(e);
    } else {
      pruned++;
    }
  }

  const existingIdSet = new Set(existing.map((e) => e.id));
  let added = 0;
  let updated = 0;
  for (const fe of fetched) {
    if (existingIdSet.has(fe.id)) updated++;
    else added++;
    merged.push(fe);
  }

  // Net pruned = events removed minus those that came back unchanged.
  const netPruned = Math.max(0, pruned - updated);

  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
  return { merged, added, updated, pruned: netPruned };
}
