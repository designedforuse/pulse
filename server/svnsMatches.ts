const WR_API_BASE = "https://api.wr-rims-prod.pulselive.com/rugby/v3";

interface SvnsEventIds {
  mens: string;
  womens: string;
}

const SVNS_EVENT_IDS: Record<string, SvnsEventIds> = {
  Dubai: {
    mens: "835d93ac-ba9e-4d53-b704-417ca85ae129",
    womens: "55671206-ca67-46f6-90f8-00866f23ce71",
  },
  "Cape Town": {
    mens: "9e2d4625-9e44-470b-8b7a-232b800ae969",
    womens: "",
  },
  Singapore: {
    mens: "2dcbf587-13b5-4aef-ad20-d1d533f9cb07",
    womens: "23dd7def-56c1-44a1-a830-cffa99148c66",
  },
  Perth: {
    mens: "e5065fab-87d4-4037-ae12-cd532a44ec0e",
    womens: "a36c424f-a02c-4d5d-8c43-b27c8809cf62",
  },
  Vancouver: {
    mens: "845e1c8f-c661-4bb9-a507-79b377691739",
    womens: "7ca63f08-fb29-413b-88f2-ab1ccea429b7",
  },
  "New York": {
    mens: "cfe84ffe-82ac-4861-9ca4-f825353ea199",
    womens: "9800a9dd-f1a1-47bc-9cdb-b8a76c2f3367",
  },
  "Hong Kong": {
    mens: "ab7b277c-7e3d-4c65-99b0-b2f82daa0b6c",
    womens: "0ba019f2-fc92-4ff3-98bc-979b9488b4ff",
  },
  Valladolid: {
    mens: "067e2c0a-71c5-4133-843f-1ab7d6354ecc",
    womens: "22bc64d9-d11e-43eb-b275-31fe00c6358e",
  },
  Bordeaux: {
    mens: "39fdda12-ab80-4f68-97ff-1f30744d5895",
    womens: "cf1f0f65-25f9-4d97-81c0-20d5d09ec2ff",
  },
};

export interface SvnsMatch {
  matchId: string;
  description: string;
  phase: string;
  status: string;
  time: number;
  team1: string;
  team1Abbr: string;
  team1Score: number;
  team2: string;
  team2Abbr: string;
  team2Score: number;
  gender: "mens" | "womens";
}

export interface SvnsMatchesResult {
  city: string;
  liveMatch: SvnsMatch | null;
  nextMatch: SvnsMatch | null;
  lastCompletedMatch: SvnsMatch | null;
  allMatches: SvnsMatch[];
  fetchedAt: string;
}

interface CacheEntry {
  data: SvnsMatchesResult;
  fetchedAt: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 60_000;

function cleanTeamName(name: string): string {
  return name.replace(/ 7s$/i, "").trim();
}

async function fetchEventSchedule(eventId: string, gender: "mens" | "womens"): Promise<SvnsMatch[]> {
  const url = `${WR_API_BASE}/event/${eventId}/schedule?language=en`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const matches = data.matches || [];
    return matches.map((m: any) => ({
      matchId: m.matchId || "",
      description: m.description || "",
      phase: m.eventPhase || "",
      status: m.status || "U",
      time: m.time?.millis || 0,
      team1: cleanTeamName(m.teams?.[0]?.name || "TBD"),
      team1Abbr: m.teams?.[0]?.abbreviation || "?",
      team1Score: m.scores?.[0] ?? 0,
      team2: cleanTeamName(m.teams?.[1]?.name || "TBD"),
      team2Abbr: m.teams?.[1]?.abbreviation || "?",
      team2Score: m.scores?.[1] ?? 0,
      gender,
    }));
  } catch (err) {
    console.error(`[svns] Failed to fetch ${gender} schedule for event ${eventId}:`, err);
    return [];
  }
}

export async function fetchSvnsMatches(city: string): Promise<SvnsMatchesResult> {
  const cached = cache[city];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const ids = SVNS_EVENT_IDS[city];
  if (!ids) {
    return { city, liveMatch: null, nextMatch: null, lastCompletedMatch: null, allMatches: [], fetchedAt: new Date().toISOString() };
  }

  const [mensMatches, womensMatches] = await Promise.all([
    ids.mens ? fetchEventSchedule(ids.mens, "mens") : Promise.resolve([]),
    ids.womens ? fetchEventSchedule(ids.womens, "womens") : Promise.resolve([]),
  ]);

  const allMatches = [...mensMatches, ...womensMatches].sort((a, b) => a.time - b.time);

  const now = Date.now();

  const liveMatches = allMatches.filter((m) => m.status.startsWith("L"));
  const liveMatch = liveMatches.length > 0
    ? liveMatches.reduce((latest, m) => (m.time > latest.time ? m : latest), liveMatches[0])
    : null;

  const upcomingMatches = allMatches.filter((m) => m.status === "U");
  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

  const completedMatches = allMatches.filter((m) => m.status === "C");
  const lastCompletedMatch = completedMatches.length > 0
    ? completedMatches[completedMatches.length - 1]
    : null;

  const result: SvnsMatchesResult = {
    city,
    liveMatch,
    nextMatch,
    lastCompletedMatch,
    allMatches,
    fetchedAt: new Date().toISOString(),
  };

  cache[city] = { data: result, fetchedAt: now };
  console.log(`[svns] Fetched ${allMatches.length} matches for ${city} (${liveMatches.length} live, ${upcomingMatches.length} upcoming)`);

  return result;
}

export function getSvnsCities(): string[] {
  return Object.keys(SVNS_EVENT_IDS);
}
