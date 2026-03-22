import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_NBA_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const NBA_DURATION_MIN = 150;

interface EspnCompetitor {
  team: { displayName: string; abbreviation: string };
  homeAway: string;
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
  broadcasts?: { market?: string; names?: string[] }[];
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  competitions: EspnCompetition[];
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
  return `basketball-nba-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(end)}`;
}

function resolveProvider(broadcasts?: EspnCompetition["broadcasts"]): { providerId: string; providerReason: string; broadcastNetworks: string } {
  if (!broadcasts || broadcasts.length === 0) {
    return { providerId: "youtubetv", providerReason: "nba-default-yttv", broadcastNetworks: "" };
  }
  const allNames = broadcasts.flatMap(b => b.names || []);
  const allNamesLower = allNames.map(n => n.toLowerCase());
  const networksStr = allNames.join(", ");
  if (allNamesLower.some(n => n === "abc" || n.startsWith("abc "))) {
    return { providerId: "disneyplus", providerReason: "nba-espn-abc", broadcastNetworks: networksStr };
  }
  if (allNamesLower.some(n => n.includes("espn") && !n.includes("espn+"))) {
    return { providerId: "disneyplus", providerReason: "nba-espn-abc", broadcastNetworks: networksStr };
  }
  if (allNamesLower.some(n => n.includes("espn+"))) {
    return { providerId: "disneyplus", providerReason: "nba-espnplus", broadcastNetworks: networksStr };
  }
  if (allNamesLower.some(n => n.includes("tnt") || n.includes("tbs"))) {
    return { providerId: "youtubetv", providerReason: "nba-tnt", broadcastNetworks: networksStr };
  }
  if (allNamesLower.some(n => n.includes("nba tv"))) {
    return { providerId: "youtubetv", providerReason: "nba-nbatv", broadcastNetworks: networksStr };
  }
  return { providerId: "youtubetv", providerReason: "nba-regional-yttv", broadcastNetworks: networksStr };
}

async function fetchEspnPage(dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_NBA_API}?dates=${dateRange}&limit=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
  });
  if (!res.ok) {
    console.error(`  NBA: ESPN API returned ${res.status} for ${dateRange}`);
    return [];
  }
  const data = await res.json() as any;
  return (data.events || []) as EspnEvent[];
}

export async function fetchNbaEvents(): Promise<SoccerFetchResult> {
  console.log(`  NBA: Fetching from ESPN API...`);
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const allEspnEvents: EspnEvent[] = [];
    let cursor = new Date(windowStart);
    while (cursor < windowEnd) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + 7 * 86400000, windowEnd.getTime()));
      const range = formatDateRange(cursor, chunkEnd);
      const events = await fetchEspnPage(range);
      allEspnEvents.push(...events);
      cursor = new Date(chunkEnd.getTime() + 86400000);
    }

    console.log(`  NBA: Fetched ${allEspnEvents.length} ESPN events`);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    for (const espnEvent of allEspnEvents) {
      const startUtc = new Date(espnEvent.date).toISOString();
      const startDate = new Date(startUtc);

      if (startDate < windowStart || startDate > windowEnd) continue;

      const comp = espnEvent.competitions?.[0];
      if (!comp?.competitors || comp.competitors.length < 2) continue;

      const homeComp = comp.competitors.find(c => c.homeAway === "home");
      const awayComp = comp.competitors.find(c => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;

      const homeTeam = homeComp.team.displayName;
      const awayTeam = awayComp.team.displayName;
      const endUtc = addDuration(startUtc, NBA_DURATION_MIN);

      const id = stableId(startUtc, awayTeam, homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const { providerId, providerReason, broadcastNetworks } = resolveProvider(comp.broadcasts);

      events.push({
        id,
        sport: "basketball",
        league: "NBA",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId,
        isLive: false,
        source: "basketball-nba",
        leagueKey: "nba",
        providerReason,
        ...(broadcastNetworks ? { broadcastNetworks } : {}),
      });
    }

    console.log(`  NBA: ${events.length} events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  NBA: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeNbaEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
