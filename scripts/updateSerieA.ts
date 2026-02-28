import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_SERIEA_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard";
const SERIEA_DURATION_MIN = 135;

interface EspnCompetitor {
  team: { displayName: string; abbreviation: string };
  homeAway: string;
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
  broadcasts?: { names?: string[] }[];
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
  return `soccer-seriea-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(end)}`;
}

async function fetchEspnPage(dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_SERIEA_API}?dates=${dateRange}&limit=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
  });
  if (!res.ok) {
    console.error(`  Serie A: ESPN API returned ${res.status} for ${dateRange}`);
    return [];
  }
  const data = await res.json() as any;
  return (data.events || []) as EspnEvent[];
}

export async function fetchSerieAEvents(): Promise<SoccerFetchResult> {
  console.log(`  Serie A: Fetching from ESPN API...`);
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const chunks: string[] = [];
    let cursor = new Date(windowStart);
    while (cursor < windowEnd) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + 31 * 86400000, windowEnd.getTime()));
      chunks.push(formatDateRange(cursor, chunkEnd));
      cursor = new Date(chunkEnd.getTime() + 86400000);
    }

    const allEspnEvents: EspnEvent[] = [];
    for (const range of chunks) {
      const events = await fetchEspnPage(range);
      allEspnEvents.push(...events);
    }

    console.log(`  Serie A: Fetched ${allEspnEvents.length} ESPN events`);

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
      const endUtc = addDuration(startUtc, SERIEA_DURATION_MIN);

      const id = stableId(startUtc, awayTeam, homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      events.push({
        id,
        sport: "soccer",
        league: "Serie A",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: "youtubetv",
        isLive: false,
        source: "soccer-seriea",
        leagueKey: "seriea",
        providerReason: "seriea-yttv",
      });
    }

    console.log(`  Serie A: ${events.length} events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  Serie A: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeSerieAEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
