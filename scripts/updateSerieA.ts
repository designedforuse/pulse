import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_SERIEA_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard";
const GOLAZO_SCHEDULE_URL = "https://www.livesoccertv.com/channels/cbs-sports-golazo/";
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

interface GolazoMatch {
  homeTeam: string;
  awayTeam: string;
  dateStr: string;
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

function normalizeTeam(name: string): string {
  return name.toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamsMatchGolazo(espnHome: string, espnAway: string, golazo: GolazoMatch): boolean {
  const eH = normalizeTeam(espnHome);
  const eA = normalizeTeam(espnAway);
  const gH = normalizeTeam(golazo.homeTeam);
  const gA = normalizeTeam(golazo.awayTeam);

  return (eH.includes(gH) || gH.includes(eH) || eA.includes(gA) || gA.includes(eA)) &&
         (eH.includes(gH) || gH.includes(eH)) &&
         (eA.includes(gA) || gA.includes(eA));
}

async function fetchGolazoSerieAMatches(): Promise<GolazoMatch[]> {
  const matches: GolazoMatch[] = [];
  try {
    const { execSync } = await import("child_process");
    const html = execSync(
      `curl -s "${GOLAZO_SCHEDULE_URL}" ` +
      `-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ` +
      `-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" ` +
      `-H "Accept-Language: en-US,en;q=0.5" ` +
      `-H "Referer: https://www.livesoccertv.com/"`,
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    ).toString();

    if (!html || html.length < 100) {
      console.log(`  Serie A Golazo: Empty or invalid response`);
      return matches;
    }

    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(rowRegex) || [];

    for (const row of rows) {
      if (!row.includes("Serie A") || !row.includes("/match/")) continue;

      const titleMatch = row.match(/title="([^"]+)\s+vs\s+([^"]+)"/i);
      if (titleMatch) {
        matches.push({
          homeTeam: titleMatch[1].trim(),
          awayTeam: titleMatch[2].trim(),
          dateStr: "",
        });
      }
    }

    console.log(`  Serie A Golazo: Found ${matches.length} Serie A matches on Golazo`);
    matches.forEach(m => console.log(`    Golazo: ${m.homeTeam} vs ${m.awayTeam} (${m.dateStr})`));
  } catch (err: any) {
    console.error(`  Serie A Golazo: Error fetching schedule:`, err.message);
  }
  return matches;
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

    const [allEspnEvents, golazoMatches] = await Promise.all([
      (async () => {
        const chunks: string[] = [];
        let cursor = new Date(windowStart);
        while (cursor < windowEnd) {
          const chunkEnd = new Date(Math.min(cursor.getTime() + 31 * 86400000, windowEnd.getTime()));
          chunks.push(formatDateRange(cursor, chunkEnd));
          cursor = new Date(chunkEnd.getTime() + 86400000);
        }
        const all: EspnEvent[] = [];
        for (const range of chunks) {
          const events = await fetchEspnPage(range);
          all.push(...events);
        }
        return all;
      })(),
      fetchGolazoSerieAMatches(),
    ]);

    console.log(`  Serie A: Fetched ${allEspnEvents.length} ESPN events`);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();
    let golazoCount = 0;

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

      const broadcastNames = (comp.broadcasts || [])
        .flatMap(b => b.names || [])
        .map(n => n.toLowerCase());
      const espnSaysGolazo = broadcastNames.some(n => n.includes("golazo"));
      const scraperSaysGolazo = golazoMatches.some(g => teamsMatchGolazo(homeTeam, awayTeam, g));
      const isGolazo = espnSaysGolazo || scraperSaysGolazo;
      if (isGolazo) golazoCount++;

      events.push({
        id,
        sport: "soccer",
        league: "Serie A",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: isGolazo ? "primevideo" : "youtubetv",
        isLive: false,
        source: "soccer-seriea",
        leagueKey: "seriea",
        providerReason: isGolazo ? "seriea-golazo-primevideo" : "seriea-yttv",
      });
    }

    console.log(`  Serie A: ${events.length} events in retention window (${golazoCount} on Golazo/Prime Video)`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  Serie A: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeSerieAEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
