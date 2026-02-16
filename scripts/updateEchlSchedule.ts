import * as fs from "fs";
import * as path from "path";

const API_HOCKEY_BASE = "https://v1.hockey.api-sports.io";
const LEAGUE_CACHE_PATH = path.resolve(__dirname, "../data/leagueIds.json");
const HOCKEY_DURATION_MIN = 165;

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
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
    season: number;
    country: {
      name: string;
      code: string;
      flag: string;
    };
  };
  country: {
    id: number;
    name: string;
    code: string;
    flag: string;
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

function utcToLocal(utcString: string): string {
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return utcToLocal(date.toISOString());
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface EchlLeagueInfo {
  leagueId: number;
  currentSeason: number;
}

async function resolveEchlLeagueInfo(apiKey: string): Promise<EchlLeagueInfo | null> {
  const cache = loadLeagueCache();
  if (cache.echlLeagueId && cache.echlCurrentSeason) {
    console.log(`  ECHL: Using cached league ID: ${cache.echlLeagueId}, season: ${cache.echlCurrentSeason}`);
    return { leagueId: cache.echlLeagueId, currentSeason: cache.echlCurrentSeason };
  }

  console.log(`  ECHL: Searching for ECHL league ID...`);
  const url = `${API_HOCKEY_BASE}/leagues?search=ECHL`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) {
      console.error(`  ECHL: Leagues search returned ${res.status}: ${res.statusText}`);
      return null;
    }
    const data: any = await res.json();
    const leagues = data.response || [];

    const echl = leagues.find((l: any) => {
      const name = (l.name || "").toUpperCase();
      return name === "ECHL" || name.includes("ECHL");
    });

    if (echl) {
      const seasons = echl.seasons || [];
      const currentSeason = seasons.find((s: any) => s.current === true);
      const season = currentSeason?.season || seasons[seasons.length - 1]?.season;
      console.log(`  ECHL: Found league: id=${echl.id}, name="${echl.name}", currentSeason=${season}`);
      cache.echlLeagueId = echl.id;
      cache.echlCurrentSeason = season;
      cache.lastResolved = new Date().toISOString();
      saveLeagueCache(cache);
      return { leagueId: echl.id, currentSeason: season };
    }

    console.log(`  ECHL: No ECHL league found. Available leagues: ${JSON.stringify(leagues.slice(0, 5).map((l: any) => ({ id: l.id, name: l.name })))}`);
    return null;
  } catch (err) {
    console.error("  ECHL: Failed to search leagues:", err);
    return null;
  }
}

interface FetchResult {
  games: ApiHockeyGame[];
  planError: boolean;
}

async function fetchEchlGamesForDate(apiKey: string, leagueId: number, season: number, date: string): Promise<FetchResult> {
  const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&season=${season}&date=${date}`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) {
      console.error(`  ECHL: Games API returned ${res.status} for date=${date}`);
      return { games: [], planError: false };
    }
    const data: any = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errMsg = Object.values(data.errors).join("; ");
      const isPlanError = errMsg.toLowerCase().includes("free plan") || errMsg.toLowerCase().includes("plan");
      if (isPlanError) {
        console.warn(`  ECHL: Plan limitation: ${errMsg}`);
        return { games: [], planError: true };
      }
      console.warn(`  ECHL: API error for ${date}: ${errMsg}`);
      return { games: [], planError: false };
    }
    return { games: (data.response || []) as ApiHockeyGame[], planError: false };
  } catch (err) {
    console.error(`  ECHL: Failed to fetch games for ${date}:`, err);
    return { games: [], planError: false };
  }
}

function gameToEvent(game: ApiHockeyGame): AppEvent {
  const startUtc = new Date(game.timestamp * 1000).toISOString();
  const startLocal = utcToLocal(startUtc);
  const isLive = game.status.short === "LIVE" || game.status.short === "P1" ||
    game.status.short === "P2" || game.status.short === "P3" ||
    game.status.short === "OT" || game.status.short === "BT";

  return {
    id: `echl-${game.id}`,
    sport: "hockey",
    league: "ECHL",
    awayTeam: game.teams.away.name,
    homeTeam: game.teams.home.name,
    startTimeLocal: startLocal,
    endTimeLocal: addDuration(startUtc, HOCKEY_DURATION_MIN),
    providerId: "flosports",
    isLive,
    source: "echl",
  };
}

async function probeBestSeason(apiKey: string, leagueId: number, cachedSeason: number): Promise<number | null> {
  const today = formatDate(new Date());
  const seasonsToTry = [cachedSeason, cachedSeason - 1, cachedSeason + 1].filter(
    (s, i, arr) => arr.indexOf(s) === i
  );

  console.log(`  ECHL: Probing seasons ${seasonsToTry.join(", ")} for date ${today}...`);

  for (const season of seasonsToTry) {
    const result = await fetchEchlGamesForDate(apiKey, leagueId, season, today);
    if (result.planError) {
      console.log(`  ECHL: Season ${season} — blocked by plan`);
      continue;
    }
    if (result.games.length > 0) {
      console.log(`  ECHL: Season ${season} — ${result.games.length} games found!`);
      return season;
    }
    console.log(`  ECHL: Season ${season} — accessible but 0 games on ${today}`);
  }

  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = formatDate(yesterdayDate);
  for (const season of seasonsToTry) {
    const result = await fetchEchlGamesForDate(apiKey, leagueId, season, yesterday);
    if (result.planError) continue;
    if (result.games.length > 0) {
      console.log(`  ECHL: Season ${season} — ${result.games.length} games found on ${yesterday}!`);
      return season;
    }
  }

  return null;
}

export async function fetchEchlEvents(): Promise<AppEvent[]> {
  const apiKey = process.env.API_HOCKEY_KEY;
  if (!apiKey) {
    console.warn("  ECHL: API_HOCKEY_KEY not set — skipping ECHL schedule fetch.");
    return [];
  }

  const info = await resolveEchlLeagueInfo(apiKey);
  if (!info) {
    console.warn("  ECHL: Could not resolve league info. Skipping.");
    return [];
  }

  let { leagueId, currentSeason } = info;

  const probedSeason = await probeBestSeason(apiKey, leagueId, currentSeason);
  if (probedSeason !== null && probedSeason !== currentSeason) {
    console.log(`  ECHL: Switching from cached season ${currentSeason} to probed season ${probedSeason}`);
    currentSeason = probedSeason;
    const cache = loadLeagueCache();
    cache.echlCurrentSeason = probedSeason;
    cache.lastResolved = new Date().toISOString();
    saveLeagueCache(cache);
  } else if (probedSeason === null) {
    console.warn(`  ECHL: No accessible season with games found. Will attempt fetch with season ${currentSeason} anyway.`);
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 86400000);
  const endDate = new Date(now.getTime() + 21 * 86400000);

  console.log(`  ECHL: Fetching games (league=${leagueId}, season=${currentSeason}) from ${formatDate(startDate)} to ${formatDate(endDate)}...`);

  const allGames: ApiHockeyGame[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = formatDate(current);
    const result = await fetchEchlGamesForDate(apiKey, leagueId, currentSeason, dateStr);
    if (result.planError) {
      console.warn(`  ECHL: Stopping date iteration due to plan limitation (season ${currentSeason} not available on free plan).`);
      break;
    }
    if (result.games.length > 0) {
      allGames.push(...result.games);
    }
    current.setDate(current.getDate() + 1);
  }

  if (allGames.length === 0) {
    console.warn(`  ECHL: No games found. If using a free API plan, upgrade to access season ${currentSeason}.`);
  } else {
    console.log(`  ECHL: Fetched ${allGames.length} total games`);
  }

  const events = allGames.map(gameToEvent);
  const unique = new Map<string, AppEvent>();
  for (const e of events) {
    unique.set(e.id, e);
  }

  const result = Array.from(unique.values());
  console.log(`  ECHL: ${result.length} unique events after dedup`);
  return result;
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
