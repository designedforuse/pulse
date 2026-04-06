import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_MLB_API = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const MLB_DURATION_MIN = 180;

const SOCAL_HOME_TEAMS = new Set([
  "Los Angeles Dodgers",
  "Los Angeles Angels",
  "Anaheim Angels",
]);

interface EspnCompetitor {
  team: { displayName: string; abbreviation: string; id: string };
  homeAway: string;
}

interface EspnBroadcast {
  market?: string;
  names?: string[];
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
  broadcasts?: EspnBroadcast[];
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
  return `baseball-mlb-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(end)}`;
}

function resolveProvider(
  broadcasts: EspnBroadcast[] | undefined,
  homeTeam: string,
): { providerId: string; providerReason: string; broadcastNetworks: string } {
  if (!broadcasts || broadcasts.length === 0) {
    return { providerId: "mlbtv", providerReason: "mlb-regional", broadcastNetworks: "" };
  }

  const national = broadcasts.find((b) => b.market === "national");
  const allBroadcasts = broadcasts.flatMap((b) => b.names || []);
  const natNames = (national?.names || []).map((n) => n.toLowerCase());
  const networksStr = allBroadcasts.join(", ");

  if (natNames.some((n) => n.includes("apple tv"))) {
    return { providerId: "appletv", providerReason: "mlb-appletv", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n === "fox")) {
    return { providerId: "youtubetv", providerReason: "mlb-fox", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("fs1") || n.includes("fox sports 1"))) {
    return { providerId: "youtubetv", providerReason: "mlb-fs1", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n === "tbs")) {
    return { providerId: "youtubetv", providerReason: "mlb-tbs", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("peacock"))) {
    return { providerId: "youtubetv", providerReason: "mlb-peacock", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("prime video") || n.includes("amazon"))) {
    return { providerId: "primevideo", providerReason: "mlb-prime", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("espn") && !n.includes("espn+"))) {
    return { providerId: "disneyplus", providerReason: "mlb-espn", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("espn+"))) {
    return { providerId: "disneyplus", providerReason: "mlb-espnplus", broadcastNetworks: networksStr };
  }
  if (natNames.some((n) => n.includes("mlb net"))) {
    return { providerId: "mlbtv", providerReason: "mlb-mlbnet", broadcastNetworks: networksStr };
  }

  if (SOCAL_HOME_TEAMS.has(homeTeam)) {
    return { providerId: "mlbtv", providerReason: "mlb-socal-rsn", broadcastNetworks: networksStr };
  }

  return { providerId: "mlbtv", providerReason: "mlb-regional", broadcastNetworks: networksStr };
}

async function fetchEspnPage(dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_MLB_API}?dates=${dateRange}&limit=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
  });
  if (!res.ok) {
    console.error(`  MLB: ESPN API returned ${res.status} for ${dateRange}`);
    return [];
  }
  const data = await res.json() as any;
  return (data.events || []) as EspnEvent[];
}

export async function fetchMlbEvents(): Promise<SoccerFetchResult> {
  console.log(`  MLB: Fetching from ESPN API...`);
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 7 * 86400000);

    const allEspnEvents: EspnEvent[] = [];
    let cursor = new Date(windowStart);
    while (cursor < windowEnd) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + 7 * 86400000, windowEnd.getTime()));
      const range = formatDateRange(cursor, chunkEnd);
      const events = await fetchEspnPage(range);
      allEspnEvents.push(...events);
      cursor = new Date(chunkEnd.getTime() + 86400000);
    }

    console.log(`  MLB: Fetched ${allEspnEvents.length} ESPN events`);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    for (const espnEvent of allEspnEvents) {
      const startUtc = new Date(espnEvent.date).toISOString();
      const startDate = new Date(startUtc);

      if (startDate < windowStart || startDate > windowEnd) continue;

      const comp = espnEvent.competitions?.[0];
      if (!comp?.competitors || comp.competitors.length < 2) continue;

      const homeComp = comp.competitors.find((c) => c.homeAway === "home");
      const awayComp = comp.competitors.find((c) => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;

      const homeTeam = homeComp.team.displayName;
      const awayTeam = awayComp.team.displayName;
      const endUtc = addDuration(startUtc, MLB_DURATION_MIN);

      const id = stableId(startUtc, awayTeam, homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const { providerId, providerReason, broadcastNetworks } = resolveProvider(
        comp.broadcasts,
        homeTeam,
      );

      events.push({
        id,
        sport: "baseball",
        league: "MLB",
        awayTeam,
        homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId,
        isLive: false,
        source: "baseball-mlb",
        leagueKey: "mlb",
        providerReason,
        ...(broadcastNetworks ? { broadcastNetworks } : {}),
      });
    }

    console.log(`  MLB: ${events.length} events in retention window`);
    return { events, sourceUsed: "espn", count: events.length };
  } catch (err: any) {
    console.error(`  MLB: Error fetching ESPN API:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeMlbEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
