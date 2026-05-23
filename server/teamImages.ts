const API_KEY = "3";
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEG_TTL_MS = 24 * 60 * 60 * 1000;

const SPORT_MAP: Record<string, string> = {
  hockey: "Ice Hockey",
  soccer: "Soccer",
  rugby: "Rugby",
  cricket: "Cricket",
  basketball: "Basketball",
  racing: "Motorsport",
  tennis: "Tennis",
  golf: "Golf",
  athletics: "Athletics",
};

export interface TeamImage {
  fanart: string | null;
  badge: string | null;
  stadium: string | null;
  source: "team" | "league" | null;
}

interface CacheEntry {
  value: TeamImage | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<TeamImage | null>>();

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

class TransientError extends Error {}

function pickImage(team: any): TeamImage {
  const fanart =
    team.strFanart1 ||
    team.strFanart2 ||
    team.strFanart3 ||
    team.strFanart4 ||
    team.strTeamFanart1 ||
    team.strTeamFanart2 ||
    null;
  const badge = team.strBadge || team.strTeamBadge || null;
  const stadium = team.strStadiumThumb || null;
  return { fanart, badge, stadium, source: "team" };
}

async function searchTeam(
  team: string,
  sport: string | null
): Promise<TeamImage | null> {
  const url = `${BASE}/searchteams.php?t=${encodeURIComponent(team)}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch {
    throw new TransientError("team fetch failed");
  }
  if (res.status >= 500 || res.status === 429) {
    throw new TransientError(`team fetch status ${res.status}`);
  }
  if (!res.ok) return null;
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new TransientError("team parse failed");
  }
  const teams: any[] = Array.isArray(json?.teams) ? json.teams : [];
  if (teams.length === 0) return null;

  const sportName = sport ? SPORT_MAP[sport.toLowerCase()] : null;
  const matched = sportName
    ? teams.find((t) => (t.strSport || "").toLowerCase() === sportName.toLowerCase())
    : null;
  const chosen = matched || teams[0];
  const img = pickImage(chosen);
  if (!img.fanart && !img.badge && !img.stadium) return null;
  return img;
}

async function searchLeague(league: string): Promise<TeamImage | null> {
  const url = `${BASE}/search_all_leagues.php?l=${encodeURIComponent(league)}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch {
    throw new TransientError("league fetch failed");
  }
  if (res.status >= 500 || res.status === 429) {
    throw new TransientError(`league fetch status ${res.status}`);
  }
  if (!res.ok) return null;
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new TransientError("league parse failed");
  }
  const leagues: any[] = Array.isArray(json?.countries) ? json.countries : [];
  if (leagues.length === 0) return null;
  const lg = leagues[0];
  const fanart =
    lg.strFanart1 || lg.strFanart2 || lg.strFanart3 || lg.strFanart4 || null;
  const badge = lg.strBadge || lg.strLogo || null;
  if (!fanart && !badge) return null;
  return { fanart, badge, stadium: null, source: "league" };
}

const TRANSIENT_BACKOFF_MS = 2 * 60 * 1000;

export async function getTeamImage(
  team: string | null | undefined,
  sport: string | null | undefined,
  league: string | null | undefined
): Promise<TeamImage | null> {
  const teamKey = (team || "").trim().toLowerCase();
  const sportKey = (sport || "").trim().toLowerCase();
  const leagueKey = (league || "").trim().toLowerCase();
  const key = `${teamKey}|${sportKey}|${leagueKey}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return cached.value;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<TeamImage | null> => {
    let result: TeamImage | null = null;
    let transient = false;
    try {
      if (team && team.trim().length > 0) {
        result = await searchTeam(team.trim(), sport ?? null);
      }
      if (!result && league && league.trim().length > 0) {
        result = await searchLeague(league.trim());
      }
    } catch (err) {
      if (err instanceof TransientError) {
        transient = true;
      } else {
        throw err;
      }
    }
    const ttl = result ? TTL_MS : transient ? TRANSIENT_BACKOFF_MS : NEG_TTL_MS;
    cache.set(key, { value: result, expires: now + ttl });
    return result;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
