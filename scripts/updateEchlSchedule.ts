import * as fs from "fs";
import * as path from "path";

const API_HOCKEY_BASE = "https://v1.hockey.api-sports.io";
const HOCKEYTECH_BASE = "https://lscluster.hockeytech.com/feed/index.php";
const HOCKEYTECH_KEY = "2c2b89ea7345cae8";
const LEAGUE_CACHE_PATH = path.resolve(__dirname, "../data/leagueIds.json");
const HOCKEY_DURATION_MIN = 165;
const TULSA_TEAM_NAME = "Tulsa Oilers";

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
}

interface LeagueCache {
  echlLeagueId?: number;
  echlCurrentSeason?: number;
  lastResolved?: string;
}

interface ApiHockeyGame {
  id: number;
  date: string;
  time: string;
  timestamp: number;
  timezone: string;
  status: {
    long: string;
    short: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  scores: {
    home: number | null;
    away: number | null;
  };
}

export interface EchlFetchResult {
  events: AppEvent[];
  sourceUsed: "api-hockey" | "web" | "none";
  webCount: number;
}

function loadLeagueCache(): LeagueCache {
  try {
    if (fs.existsSync(LEAGUE_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(LEAGUE_CACHE_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

function saveLeagueCache(cache: LeagueCache): void {
  fs.writeFileSync(LEAGUE_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function toUtcIso(utcString: string): string {
  const date = new Date(utcString);
  return date.toISOString();
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface ApiHockeyFetchResult {
  games: ApiHockeyGame[];
  planError: boolean;
}

async function fetchEchlGamesForDate(apiKey: string, leagueId: number, season: number, date: string): Promise<ApiHockeyFetchResult> {
  const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&season=${season}&date=${date}`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) {
      return { games: [], planError: false };
    }
    const data: any = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errMsg = Object.values(data.errors).join("; ");
      const isPlanError = errMsg.toLowerCase().includes("free plan") || errMsg.toLowerCase().includes("plan");
      if (isPlanError) {
        return { games: [], planError: true };
      }
      return { games: [], planError: false };
    }
    return { games: (data.response || []) as ApiHockeyGame[], planError: false };
  } catch {
    return { games: [], planError: false };
  }
}

function apiHockeyGameToEvent(game: ApiHockeyGame): AppEvent {
  const startUtc = new Date(game.timestamp * 1000).toISOString();
  const isLive = game.status.short === "LIVE" || game.status.short === "P1" ||
    game.status.short === "P2" || game.status.short === "P3" ||
    game.status.short === "OT" || game.status.short === "BT";

  return {
    id: `echl-${game.id}`,
    sport: "hockey",
    league: "ECHL",
    awayTeam: game.teams.away.name,
    homeTeam: game.teams.home.name,
    startTimeLocal: startUtc,
    endTimeLocal: addDuration(startUtc, HOCKEY_DURATION_MIN),
    providerId: "flosports",
    isLive,
    source: "echl",
  };
}

async function tryApiHockey(): Promise<AppEvent[] | null> {
  const apiKey = process.env.API_HOCKEY_KEY;
  if (!apiKey) {
    console.log("  ECHL: API_HOCKEY_KEY not set — skipping API-Hockey.");
    return null;
  }

  const cache = loadLeagueCache();
  let leagueId = cache.echlLeagueId || 59;
  let season = cache.echlCurrentSeason || 2025;

  const today = formatDate(new Date());
  const probe = await fetchEchlGamesForDate(apiKey, leagueId, season, today);
  if (probe.planError) {
    console.log(`  ECHL: API-Hockey season ${season} blocked by free plan. Falling back to web.`);
    return null;
  }

  console.log(`  ECHL: API-Hockey season ${season} accessible. Fetching full date range...`);

  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 86400000);
  const endDate = new Date(now.getTime() + 21 * 86400000);

  const allGames: ApiHockeyGame[] = [];
  if (probe.games.length > 0) allGames.push(...probe.games);

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
    if (dateStr !== today) {
      const result = await fetchEchlGamesForDate(apiKey, leagueId, season, dateStr);
      if (result.planError) {
        console.warn(`  ECHL: Hit plan limit mid-fetch. Falling back to web.`);
        return null;
      }
      if (result.games.length > 0) allGames.push(...result.games);
    }
    current.setDate(current.getDate() + 1);
  }

  const events = allGames.map(apiHockeyGameToEvent);
  const unique = new Map<string, AppEvent>();
  for (const e of events) unique.set(e.id, e);

  const result = Array.from(unique.values());
  console.log(`  ECHL: API-Hockey returned ${result.length} unique events`);
  return result;
}

async function fetchViaHockeyTech(): Promise<AppEvent[]> {
  console.log("  ECHL: Using HockeyTech scorebar API (web fallback)...");

  const url = `${HOCKEYTECH_BASE}?feed=modulekit&view=scorebar&numberofdaysback=14&numberofdaysahead=21&key=${HOCKEYTECH_KEY}&client_code=echl&lang=en&fmt=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ECHL web: HockeyTech returned ${res.status}`);
      return [];
    }

    const rawText = await res.text();
    const jsonStr = rawText.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(jsonStr);
    const games: any[] = data.SiteKit?.Scorebar || [];

    console.log(`  ECHL web: Received ${games.length} total league games`);

    const tulsaGames = games.filter((g: any) =>
      (g.HomeLongName || "").includes("Tulsa") ||
      (g.VisitorLongName || "").includes("Tulsa") ||
      (g.HomeCity || "") === "Tulsa" ||
      (g.VisitorCity || "") === "Tulsa"
    );

    console.log(`  ECHL web: ${tulsaGames.length} Tulsa Oilers games found`);

    const events: AppEvent[] = [];
    for (const g of tulsaGames) {
      try {
        const iso = g.GameDateISO8601;
        if (!iso) continue;

        const startTimeLocal = new Date(iso).toISOString();
        const endTimeLocal = addDuration(iso, HOCKEY_DURATION_MIN);

        const homeTeam = g.HomeLongName || `${g.HomeCity} ${g.HomeNickname}`;
        const awayTeam = g.VisitorLongName || `${g.VisitorCity} ${g.VisitorNickname}`;

        const gameStatus = parseInt(g.GameStatus || "0", 10);
        const isLive = gameStatus === 2 || gameStatus === 3;

        const gameId = g.ID || `${g.Date}-${g.HomeCode}-${g.VisitorCode}`;

        events.push({
          id: `echl-web-${gameId}`,
          sport: "hockey",
          league: "ECHL",
          homeTeam,
          awayTeam,
          startTimeLocal,
          endTimeLocal,
          providerId: "flosports",
          isLive,
          source: "echl",
        });
      } catch (err) {
        console.warn(`  ECHL web: Failed to parse game:`, err);
      }
    }

    console.log(`  ECHL web: Parsed ${events.length} events`);
    return events;
  } catch (err) {
    console.error("  ECHL web: Failed to fetch HockeyTech scorebar:", err);
    return [];
  }
}

export async function fetchEchlEvents(): Promise<EchlFetchResult> {
  const apiResult = await tryApiHockey();
  if (apiResult !== null && apiResult.length > 0) {
    return { events: apiResult, sourceUsed: "api-hockey", webCount: 0 };
  }

  const webEvents = await fetchViaHockeyTech();
  if (webEvents.length > 0) {
    return { events: webEvents, sourceUsed: "web", webCount: webEvents.length };
  }

  if (apiResult !== null) {
    return { events: apiResult, sourceUsed: "api-hockey", webCount: 0 };
  }

  return { events: [], sourceUsed: "none", webCount: 0 };
}

export function mergeEchlEvents(
  existingEchl: AppEvent[],
  freshEchl: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existingEchl) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of freshEchl) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const RETENTION_PAST_DAYS = 14;
  const RETENTION_FUTURE_DAYS = 21;
  const windowStart = new Date(now.getTime() - RETENTION_PAST_DAYS * 86400000);
  const windowEnd = new Date(now.getTime() + RETENTION_FUTURE_DAYS * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;

  merged.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
