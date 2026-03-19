import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_UEL_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard";
const UEL_DURATION_MIN = 135;

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
  notes?: { headline?: string; type?: string }[];
}

function extractRoundLabel(espnEvent: EspnEvent): string | undefined {
  const note = espnEvent.notes?.find(n => n.headline);
  if (!note?.headline) return undefined;
  const h = note.headline.trim();
  if (/group stage/i.test(h)) return "Group Stage";
  if (/round of 16/i.test(h)) return "R16";
  if (/quarter.?final/i.test(h)) return "QF";
  if (/semi.?final/i.test(h)) return "SF";
  if (/^final$/i.test(h)) return "Final";
  if (/knockout/i.test(h)) return "KO";
  if (/leg 1/i.test(h)) return h.replace(/leg 1/i, "Leg 1").trim();
  if (/leg 2/i.test(h)) return h.replace(/leg 2/i, "Leg 2").trim();
  return h.length <= 12 ? h : undefined;
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
  return `soccer-europaleague-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(end)}`;
}

async function fetchEspnPage(dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_UEL_API}?dates=${dateRange}&limit=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
  });
  if (!res.ok) {
    console.error(`  Europa League: ESPN API returned ${res.status} for ${dateRange}`);
    return [];
  }
  const data = await res.json() as any;
  return (data.events || []) as EspnEvent[];
}

export async function fetchEuropaLeagueEvents(): Promise<SoccerFetchResult> {
  console.log(`  Europa League: Fetching from ESPN API...`);
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const allEspnEvents: EspnEvent[] = [];
    let cursor = new Date(windowStart);
    while (cursor < windowEnd) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + 31 * 86400000, windowEnd.getTime()));
      const range = formatDateRange(cursor, chunkEnd);
      const events = await fetchEspnPage(range);
      allEspnEvents.push(...events);
      cursor = new Date(chunkEnd.getTime() + 86400000);
    }

    console.log(`  Europa League: Fetched ${allEspnEvents.length} ESPN events`);

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
      const endUtc = addDuration(startUtc, UEL_DURATION_MIN);

      const id = stableId(startUtc, awayTeam, homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const roundLabel = extractRoundLabel(espnEvent);
      events.push({
        id,
        sport: "soccer",
        league: "Europa League",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: "youtubetv",
        isLive: false,
        source: "soccer-europaleague",
        leagueKey: "europaleague",
        providerReason: "uel-yttv",
        ...(roundLabel ? { roundLabel } : {}),
      });
    }

    console.log(`  Europa League: ${events.length} events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  Europa League: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeEuropaLeagueEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
