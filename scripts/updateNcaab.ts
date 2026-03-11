import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_NCAAB_TEAM_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams";
const NCAAB_DURATION_MIN = 130;

const UCI_ESPN_ID = "300";
const UCI_DISPLAY_NAME = "UC Irvine Anteaters";

interface EspnTeamGame {
  id: string;
  date: string;
  competitions: {
    competitors: { team: { displayName: string; abbreviation: string }; homeAway: string }[];
    broadcasts?: { market?: string; names?: string[] }[];
    status?: { type?: { state?: string } };
  }[];
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
  return `basketball-ncaab-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function resolveProvider(broadcasts?: { market?: string; names?: string[] }[]): { providerId: string; providerReason: string } {
  if (!broadcasts || broadcasts.length === 0) {
    return { providerId: "disneyplus", providerReason: "ncaab-espn-plus-default" };
  }
  const allNames = broadcasts.flatMap(b => b.names || []).map(n => n.toLowerCase());
  if (allNames.some(n => n.includes("espn+") || n.includes("espn plus"))) {
    return { providerId: "disneyplus", providerReason: "ncaab-espn-plus" };
  }
  if (allNames.some(n => n.includes("espn") || n.includes("abc"))) {
    return { providerId: "disneyplus", providerReason: "ncaab-espn-abc" };
  }
  return { providerId: "disneyplus", providerReason: "ncaab-default" };
}

async function fetchUciSchedule(): Promise<EspnTeamGame[]> {
  const season = new Date().getFullYear() >= 2026 ? "2026" : "2025";
  const url = `${ESPN_NCAAB_TEAM_API}/${UCI_ESPN_ID}/schedule?season=${season}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
    });
    if (!res.ok) {
      console.error(`  NCAAB: ESPN team schedule API returned ${res.status}`);
      return [];
    }
    const data = await res.json() as any;
    return (data.events || []) as EspnTeamGame[];
  } catch (err: any) {
    console.error(`  NCAAB: Error fetching UCI schedule:`, err.message);
    return [];
  }
}

export async function fetchNcaabEvents(): Promise<SoccerFetchResult> {
  console.log(`  NCAAB: Fetching UC Irvine schedule from ESPN...`);
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 30 * 86400000);

    const espnGames = await fetchUciSchedule();
    console.log(`  NCAAB: Fetched ${espnGames.length} UCI games`);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    for (const game of espnGames) {
      const startUtc = new Date(game.date).toISOString();
      const startDate = new Date(startUtc);

      if (startDate < windowStart || startDate > windowEnd) continue;

      const comp = game.competitions?.[0];
      if (!comp?.competitors || comp.competitors.length < 2) continue;

      const homeComp = comp.competitors.find(c => c.homeAway === "home");
      const awayComp = comp.competitors.find(c => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;

      const homeTeam = homeComp.team.displayName;
      const awayTeam = awayComp.team.displayName;
      const endUtc = addDuration(startUtc, NCAAB_DURATION_MIN);

      const id = stableId(startUtc, awayTeam, homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const { providerId, providerReason } = resolveProvider(comp.broadcasts);

      events.push({
        id,
        sport: "basketball",
        league: "NCAAB",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId,
        isLive: false,
        source: "basketball-ncaab",
        leagueKey: "ncaab",
        providerReason,
      });
    }

    console.log(`  NCAAB: ${events.length} UCI events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  NCAAB: Error processing events:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeNcaabEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
