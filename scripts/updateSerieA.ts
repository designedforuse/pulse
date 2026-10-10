import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { getSerieAMatchIdentityAliases } from "../lib/serie-a-identity";

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
  const url = `${ESPN_SERIEA_API}?dates=${dateRange}&limit=500`;
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

    const years = new Set([windowStart.getUTCFullYear(), windowEnd.getUTCFullYear()]);
    const allEspnEvents = (await Promise.all([...years].map((year) => fetchEspnPage(String(year))))).flat();

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

      // ESPN's fixture id does not change when a kickoff is moved. Keep the
      // old prefix shape so live-score routing and existing consumers remain
      // compatible, while no longer baking kickoff time into the id.
      const id = `soccer-seriea-espn-${espnEvent.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      events.push({
        id,
        externalId: espnEvent.id,
        espnId: espnEvent.id,
        sourceEventId: espnEvent.id,
        sport: "soccer",
        league: "Serie A",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: "primevideo",
        isLive: false,
        source: "soccer-seriea",
        leagueKey: "seriea",
      });
    }

    console.log(`  Serie A: ${events.length} events in retention window (all on Golazo/Prime Video)`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  Serie A: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeSerieAEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const aliases = (event: any): string[] => {
    const result = getSerieAMatchIdentityAliases({
      id: event.id,
      league: event.league,
      leagueKey: event.leagueKey,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      startTimeLocal: event.startTimeLocal,
      seasonTag: event.seasonTag,
      espnId: event.espnId,
      externalId: event.externalId,
      sourceEventId: event.sourceEventId,
    });
    // Old generated records used a kickoff-derived id. The team/season alias
    // above is what links those records to a new ESPN-backed fixture.
    return result;
  };

  const merged: any[] = [];
  const consumedExisting = new Set<any>();
  let added = 0;
  let updated = 0;

  for (const event of fetched) {
    const matchingExisting = existing.find((candidate) => {
      if (consumedExisting.has(candidate)) return false;
      const candidateAliases = new Set(aliases(candidate));
      return aliases(event).some((key) => candidateAliases.has(key));
    });
    if (matchingExisting) {
      consumedExisting.add(matchingExisting);
      updated++;
    } else {
      added++;
    }
    merged.push(event);
  }

  // ESPN can return a partial date page (or a transiently truncated response).
  // Never treat "some rows fetched from this source" as proof that every
  // unmatched cached fixture was removed. Retain all unmatched rows that are
  // still inside the rolling window; only rows outside the window are pruned.
  for (const event of existing) {
    if (consumedExisting.has(event)) continue;
    const start = new Date(event.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) merged.push(event);
  }

  const seen = new Set<string>();
  const deduped = merged.filter((event) => {
    const eventAliases = aliases(event);
    // Rows with no positive identity are retained rather than collapsing
    // unrelated records under an empty/unknown key.
    if (eventAliases.length === 0) return true;
    if (eventAliases.some((identity) => seen.has(identity))) return false;
    for (const identity of eventAliases) seen.add(identity);
    return true;
  });

  const includedExisting = new Set(deduped.filter((event) => existing.includes(event)));
  const pruned = existing.filter(
    (event) => !consumedExisting.has(event) && !includedExisting.has(event),
  ).length;

  deduped.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
  );
  return {
    merged: deduped,
    added,
    updated,
    pruned,
  };
}
