import * as fs from "fs";
import * as path from "path";

const CRICAPI_BASE = "https://api.cricapi.com/v1";
const CRICKET_DURATION_MIN: Record<string, number> = {
  t20: 210,
  odi: 480,
  test: 480,
};

const ALLOWED_DOMESTIC_LEAGUES: Record<string, { league: string; country: string }> = {
  ipl: { league: "IPL", country: "India" },
  bbl: { league: "BBL", country: "Australia" },
  "super smash": { league: "Super Smash", country: "New Zealand" },
  sa20: { league: "SA20", country: "South Africa" },
  mlc: { league: "MLC", country: "United States" },
  "major league cricket": { league: "MLC", country: "United States" },
  cpl: { league: "CPL", country: "Caribbean" },
  "caribbean premier league": { league: "CPL", country: "Caribbean" },
};

const INTERNATIONAL_KEYWORDS = [
  "icc",
  "world cup",
  "world test championship",
  "champions trophy",
  "tour of",
  "trophy",
  "test series",
  "odi series",
  "t20i series",
  "bilateral",
];

const VENUE_COUNTRY_MAP: Record<string, string> = {
  mumbai: "India",
  delhi: "India",
  kolkata: "India",
  chennai: "India",
  bangalore: "India",
  bengaluru: "India",
  hyderabad: "India",
  ahmedabad: "India",
  mohali: "India",
  jaipur: "India",
  lucknow: "India",
  pune: "India",
  dharamsala: "India",
  guwahati: "India",
  ranchi: "India",
  indore: "India",
  nagpur: "India",
  visakhapatnam: "India",
  thiruvananthapuram: "India",
  rajkot: "India",
  cuttack: "India",
  kanpur: "India",
  "wankhede": "India",
  "eden gardens": "India",
  "m. chinnaswamy": "India",
  "narendra modi": "India",
  sydney: "Australia",
  melbourne: "Australia",
  brisbane: "Australia",
  adelaide: "Australia",
  perth: "Australia",
  hobart: "Australia",
  canberra: "Australia",
  london: "England",
  birmingham: "England",
  manchester: "England",
  leeds: "England",
  nottingham: "England",
  southampton: "England",
  lords: "England",
  "the oval": "England",
  "lord's": "England",
  trent: "England",
  headingley: "England",
  edgbaston: "England",
  chester: "England",
  "old trafford": "England",
  cape: "South Africa",
  johannesburg: "South Africa",
  durban: "South Africa",
  centurion: "South Africa",
  pretoria: "South Africa",
  port: "South Africa",
  bloemfontein: "South Africa",
  potchefstroom: "South Africa",
  paarl: "South Africa",
  kimberley: "South Africa",
  benoni: "South Africa",
  newlands: "South Africa",
  wanderers: "South Africa",
  auckland: "New Zealand",
  wellington: "New Zealand",
  christchurch: "New Zealand",
  hamilton: "New Zealand",
  napier: "New Zealand",
  dunedin: "New Zealand",
  "basin reserve": "New Zealand",
  seddon: "New Zealand",
  colombo: "Sri Lanka",
  kandy: "Sri Lanka",
  galle: "Sri Lanka",
  dambulla: "Sri Lanka",
  pallekele: "Sri Lanka",
  hambantota: "Sri Lanka",
  lahore: "Pakistan",
  karachi: "Pakistan",
  rawalpindi: "Pakistan",
  multan: "Pakistan",
  faisalabad: "Pakistan",
  dhaka: "Bangladesh",
  chittagong: "Bangladesh",
  sylhet: "Bangladesh",
  mirpur: "Bangladesh",
  harare: "Zimbabwe",
  bulawayo: "Zimbabwe",
  "queen's park": "Caribbean",
  "sabina park": "Caribbean",
  kingston: "Caribbean",
  bridgetown: "Caribbean",
  trinidad: "Caribbean",
  barbados: "Caribbean",
  antigua: "Caribbean",
  grenada: "Caribbean",
  "warner park": "Caribbean",
  lauderhill: "United States",
  dallas: "United States",
  "grand prairie": "United States",
  "nassau county": "United States",
  morrisville: "United States",
};

const NATIONAL_TEAMS = new Set([
  "india",
  "australia",
  "england",
  "south africa",
  "new zealand",
  "pakistan",
  "sri lanka",
  "bangladesh",
  "west indies",
  "zimbabwe",
  "afghanistan",
  "ireland",
  "scotland",
  "netherlands",
  "namibia",
  "nepal",
  "oman",
  "uae",
  "usa",
  "canada",
  "papua new guinea",
  "uganda",
  "united arab emirates",
  "united states",
  "united states of america",
]);

interface CricApiMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo?: Array<{ name: string; shortname: string; img: string }>;
  series_id: string;
  matchStarted: boolean;
  matchEnded: boolean;
}

interface CricApiResponse {
  status: string;
  data: CricApiMatch[];
  info: {
    hitsToday: number;
    hitsUsed: number;
    hitsLimit: number;
    credits: number;
    server: number;
    offsetRows: number;
    totalRows: number;
    queryTime: number;
  };
}

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
  leagueKey?: string;
  competitionName?: string;
  competitionType?: "international" | "domestic" | "unknown";
  format?: string;
  hostCountry?: string;
  seriesName?: string;
}

export interface CricketFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  totalFromApi: number;
  filteredCount: number;
  counts: Record<string, number>;
}

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function parseSeriesName(matchName: string): string {
  const parts = matchName.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    return parts.slice(1).join(", ");
  }
  return matchName;
}

function classifyMatch(match: CricApiMatch): {
  type: "international" | "domestic" | "skip";
  league: string;
  country: string;
  seriesName: string;
} {
  const nameLower = match.name.toLowerCase();
  const seriesName = parseSeriesName(match.name);
  const seriesLower = seriesName.toLowerCase();

  for (const [key, info] of Object.entries(ALLOWED_DOMESTIC_LEAGUES)) {
    if (nameLower.includes(key) || seriesLower.includes(key)) {
      return {
        type: "domestic",
        league: info.league,
        country: info.country,
        seriesName,
      };
    }
  }

  const isInternational = INTERNATIONAL_KEYWORDS.some((kw) => seriesLower.includes(kw));

  if (isInternational) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: classifyInternationalLeague(match.matchType, seriesName),
      country,
      seriesName,
    };
  }

  const teamsLower = match.teams.map((t) => t.toLowerCase());
  const bothNational = teamsLower.every((t) => NATIONAL_TEAMS.has(t));

  if (bothNational) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: classifyInternationalLeague(match.matchType, seriesName),
      country,
      seriesName,
    };
  }

  return { type: "skip", league: "", country: "", seriesName };
}

function classifyInternationalLeague(matchType: string, seriesName: string): string {
  const lower = seriesName.toLowerCase();
  if (lower.includes("world cup") || lower.includes("icc") || lower.includes("champions trophy")) {
    return "ICC";
  }
  switch (matchType) {
    case "test":
      return "Test Cricket";
    case "odi":
      return "ODI Cricket";
    case "t20":
    case "t20i":
      return "T20I Cricket";
    default:
      return "International Cricket";
  }
}

function resolveHostCountry(venue: string, teams: string[]): string {
  const venueLower = venue.toLowerCase();
  for (const [key, country] of Object.entries(VENUE_COUNTRY_MAP)) {
    if (venueLower.includes(key)) {
      return country;
    }
  }

  if (teams.length >= 2) {
    const home = teams[1]?.toLowerCase() || "";
    if (NATIONAL_TEAMS.has(home)) {
      const countryMap: Record<string, string> = {
        india: "India",
        australia: "Australia",
        england: "England",
        "south africa": "South Africa",
        "new zealand": "New Zealand",
        pakistan: "Pakistan",
        "sri lanka": "Sri Lanka",
        bangladesh: "Bangladesh",
        "west indies": "Caribbean",
        zimbabwe: "Zimbabwe",
        afghanistan: "Afghanistan",
        ireland: "Ireland",
        usa: "United States",
        "united states": "United States",
      };
      const mapped = countryMap[home];
      if (mapped) return mapped;
    }
  }

  return "Unknown";
}

function getProvider(league: string, country: string): string {
  const providerMap: Record<string, string> = {
    IPL: "disneyplus",
    BBL: "primevideo",
    "Super Smash": "primevideo",
    SA20: "disneyplus",
    "The Hundred": "disneyplus",
    MLC: "disneyplus",
    CPL: "primevideo",
    ICC: "disneyplus",
    "Test Cricket": "disneyplus",
    "ODI Cricket": "disneyplus",
    "T20I Cricket": "disneyplus",
    "International Cricket": "disneyplus",
  };
  return providerMap[league] || "disneyplus";
}

function getLeagueKey(league: string): string {
  const keyMap: Record<string, string> = {
    IPL: "ipl",
    BBL: "bbl",
    "Super Smash": "supersmash",
    SA20: "sa20",
    "The Hundred": "hundred",
    MLC: "mlc",
    CPL: "cpl",
    ICC: "icc",
    "Test Cricket": "test",
    "ODI Cricket": "odi",
    "T20I Cricket": "t20i",
    "International Cricket": "intl",
  };
  return keyMap[league] || league.toLowerCase().replace(/\s+/g, "");
}

function matchToEvent(match: CricApiMatch, classification: {
  type: "international" | "domestic";
  league: string;
  country: string;
  seriesName: string;
}): AppEvent {
  const teams = match.teams || [];
  const awayTeam = teams[0] || "TBD";
  const homeTeam = teams[1] || "TBD";

  let startTime: string;
  if (match.dateTimeGMT) {
    const raw = match.dateTimeGMT;
    startTime = raw.endsWith("Z") ? raw : raw + "Z";
    const parsed = new Date(startTime);
    if (isNaN(parsed.getTime())) {
      startTime = new Date(match.date + "T00:00:00Z").toISOString();
    } else {
      startTime = parsed.toISOString();
    }
  } else {
    startTime = new Date(match.date + "T00:00:00Z").toISOString();
  }

  const durationMin = CRICKET_DURATION_MIN[match.matchType] || 210;
  const leagueKey = getLeagueKey(classification.league);

  return {
    id: `cricket-${leagueKey}-${stableHash(match.id)}`,
    sport: "cricket",
    league: classification.league,
    awayTeam,
    homeTeam,
    startTimeLocal: startTime,
    endTimeLocal: addDuration(startTime, durationMin),
    providerId: getProvider(classification.league, classification.country),
    isLive: match.matchStarted && !match.matchEnded,
    source: "cricket-cricapi",
    leagueKey,
    competitionName: classification.league,
    competitionType: classification.type,
    format: match.matchType,
    hostCountry: classification.country,
    seriesName: classification.seriesName,
  };
}

async function fetchMatchesPage(apiKey: string, offset: number): Promise<CricApiResponse | null> {
  const url = `${CRICAPI_BASE}/matches?apikey=${apiKey}&offset=${offset}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  CricAPI HTTP ${res.status}: ${res.statusText}`);
      return null;
    }
    const data = await res.json() as CricApiResponse;
    if (data.status !== "success") {
      console.error(`  CricAPI status: ${data.status}`);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error(`  CricAPI fetch error: ${err.message}`);
    return null;
  }
}

export async function fetchCricketEvents(): Promise<CricketFetchResult> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    console.log("  Cricket: CRICAPI_KEY not configured, skipping");
    return { events: [], sourceUsed: "none", totalFromApi: 0, filteredCount: 0, counts: {} };
  }

  console.log("  Cricket: Fetching from CricAPI...");
  const allMatches: CricApiMatch[] = [];
  let offset = 0;
  let totalRows = 0;
  let pagesRead = 0;
  const MAX_PAGES = 6;

  while (pagesRead < MAX_PAGES) {
    const page = await fetchMatchesPage(apiKey, offset);
    if (!page || !page.data || page.data.length === 0) break;

    allMatches.push(...page.data);
    totalRows = page.info.totalRows;
    pagesRead++;

    console.log(`  Cricket: Page ${pagesRead}, offset=${offset}, got ${page.data.length} matches (total in API: ${totalRows})`);

    if (allMatches.length >= totalRows) break;
    offset += page.data.length;

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`  Cricket: Fetched ${allMatches.length} total matches from ${pagesRead} pages`);

  const events: AppEvent[] = [];
  const counts: Record<string, number> = {};
  let skipped = 0;

  for (const match of allMatches) {
    const classification = classifyMatch(match);
    if (classification.type === "skip") {
      skipped++;
      continue;
    }

    const event = matchToEvent(match, classification as {
      type: "international" | "domestic";
      league: string;
      country: string;
      seriesName: string;
    });
    events.push(event);

    const key = classification.league;
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log(`  Cricket: ${events.length} kept, ${skipped} skipped`);
  console.log(`  Cricket counts: ${JSON.stringify(counts)}`);

  return {
    events,
    sourceUsed: "cricapi",
    totalFromApi: allMatches.length,
    filteredCount: events.length,
    counts,
  };
}

export function mergeCricketEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const RETAIN_PAST_MS = 14 * 24 * 3600000;
  const RETAIN_FUTURE_MS = 21 * 24 * 3600000;
  const windowStart = new Date(now.getTime() - RETAIN_PAST_MS);
  const windowEnd = new Date(now.getTime() + RETAIN_FUTURE_MS);

  const freshMap = new Map<string, AppEvent>();
  for (const e of fresh) {
    freshMap.set(e.id, e);
  }

  const mergedMap = new Map<string, AppEvent>();
  let added = 0;
  let updated = 0;
  let pruned = 0;

  for (const e of existing) {
    const start = new Date(e.startTimeLocal);
    if (start < windowStart || start > windowEnd) {
      pruned++;
      continue;
    }
    mergedMap.set(e.id, e);
  }

  for (const [id, e] of freshMap) {
    const start = new Date(e.startTimeLocal);
    if (start < windowStart || start > windowEnd) continue;

    if (mergedMap.has(id)) {
      updated++;
    } else {
      added++;
    }
    mergedMap.set(id, e);
  }

  const merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
