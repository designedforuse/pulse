import * as fs from "fs";
import * as path from "path";

const FEATURED_CRICKET_NATIONS = new Set([
  "south africa", "india", "west indies", "new zealand",
  "australia", "england", "pakistan", "sri lanka",
]);

function passesNationFilter(event: { homeTeam: string; awayTeam: string; competitionType?: string; isIccT20Wc?: boolean }): boolean {
  if (event.isIccT20Wc) return true;
  if (event.competitionType !== "international") return true;
  const teams = [event.homeTeam, event.awayTeam].map((t) => t.toLowerCase());
  return teams.some((t) => FEATURED_CRICKET_NATIONS.has(t));
}

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
  gender?: "men" | "women" | "unknown";
  isIccT20Wc?: boolean;
}

const STRONG_WOMEN_MARKERS = [
  "women", "womens", "women's", "woman",
  "wpl", "wbbl", "wt20", "wt20i",
  "w-odi", "wodi", "w-t20", "w-t20i",
  "w t20", "w t20i",
  "the hundred women", "women's hundred",
  "icc women's", "icc womens",
  "w championship", "w-",
];

function inferCricketGender(
  match: CricApiMatch,
  classification: { league: string; type: string; seriesName: string }
): "men" | "women" | "unknown" {
  const parts = [
    match.name,
    classification.seriesName,
    classification.league,
    (match as any).category || "",
    (match as any).gender || "",
  ];
  const searchStr = parts.join(" ").toLowerCase();

  for (const token of STRONG_WOMEN_MARKERS) {
    if (searchStr.includes(token)) return "women";
  }

  if (match.teams?.some(t =>
    / women$/i.test(t) || / women /i.test(t) || / women's$/i.test(t) ||
    /\bwomen\b/i.test(t)
  )) {
    return "women";
  }

  return "men";
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

const ICC_T20_WC_KEYWORDS = [
  "icc t20 world cup",
  "t20 world cup",
  "icc men's t20 world cup",
  "icc mens t20 world cup",
  "t20wc",
];

const MAJOR_ICC_TOURNAMENT_KEYWORDS = [
  "t20 world cup", "t20 wc", "t20wc",
  "icc t20", "icc men's t20", "icc mens t20",
  "icc men's t20 world cup", "icc mens t20 world cup",
  "world cup t20",
  "odi world cup", "cricket world cup",
  "champions trophy", "icc champions trophy",
  "world test championship",
];

const ICC_T20_WC_SERIES_IDS = new Set<string>();

const NON_TARGET_EXCLUSIONS = [
  "u19", "under-19", "under 19",
  "warm up", "warm-up",
  "practice", "friendly",
];

function isNonTargetMatch(match: CricApiMatch, seriesName: string): boolean {
  const searchStr = [match.name, seriesName, (match as any).category || ""].join(" ").toLowerCase();
  return NON_TARGET_EXCLUSIONS.some(kw => searchStr.includes(kw));
}

function isIccT20WorldCup(match: CricApiMatch, seriesName: string): boolean {
  const searchStr = [match.name, seriesName].join(" ").toLowerCase();
  if (ICC_T20_WC_KEYWORDS.some(kw => searchStr.includes(kw))) return true;
  if (match.series_id && ICC_T20_WC_SERIES_IDS.has(match.series_id)) return true;
  return false;
}

function isMajorIccTournament(match: CricApiMatch, seriesName: string): boolean {
  const searchStr = [match.name, seriesName, (match as any).category || ""].join(" ").toLowerCase();
  return MAJOR_ICC_TOURNAMENT_KEYWORDS.some(kw => searchStr.includes(kw));
}

function classifyMatch(match: CricApiMatch): {
  type: "international" | "domestic" | "skip";
  league: string;
  country: string;
  seriesName: string;
  isIccT20Wc: boolean;
} {
  const nameLower = match.name.toLowerCase();
  const seriesName = parseSeriesName(match.name);
  const seriesLower = seriesName.toLowerCase();

  if (isNonTargetMatch(match, seriesName)) {
    return { type: "skip", league: "", country: "", seriesName, isIccT20Wc: false };
  }

  const t20Wc = isIccT20WorldCup(match, seriesName);
  if (t20Wc) {
    if (match.series_id && !ICC_T20_WC_SERIES_IDS.has(match.series_id)) {
      ICC_T20_WC_SERIES_IDS.add(match.series_id);
      console.log(`  Cricket: Discovered ICC T20 WC series_id: ${match.series_id}`);
    }
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: "ICC",
      country,
      seriesName,
      isIccT20Wc: true,
    };
  }

  if (isMajorIccTournament(match, seriesName)) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: "ICC",
      country,
      seriesName,
      isIccT20Wc: false,
    };
  }

  for (const [key, info] of Object.entries(ALLOWED_DOMESTIC_LEAGUES)) {
    if (nameLower.includes(key) || seriesLower.includes(key)) {
      return {
        type: "domestic",
        league: info.league,
        country: info.country,
        seriesName,
        isIccT20Wc: false,
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
      isIccT20Wc: false,
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
      isIccT20Wc: false,
    };
  }

  return { type: "skip", league: "", country: "", seriesName, isIccT20Wc: false };
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
  const disneyCountries = ["New Zealand", "Caribbean"];
  if (disneyCountries.includes(country)) return "disneyplus";
  return "youtubetv";
}

function getLeagueKey(league: string): string {
  const keyMap: Record<string, string> = {
    IPL: "ipl",
    BBL: "bbl",
    "Super Smash": "supersmash",
    SA20: "sa20",
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
  isIccT20Wc: boolean;
}): AppEvent | null {
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
    const fallback = new Date(match.date + "T00:00:00Z");
    if (isNaN(fallback.getTime())) {
      return null;
    }
    startTime = fallback.toISOString();
  }

  const durationMin = CRICKET_DURATION_MIN[match.matchType] || 210;
  const leagueKey = getLeagueKey(classification.league);

  return {
    id: `cricket-${leagueKey}-${stableHash(match.id)}`,
    cricketMatchId: match.id,
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
    gender: inferCricketGender(match, classification),
    isIccT20Wc: classification.isIccT20Wc,
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

export interface CricketRawDiagnostic {
  id: string;
  competitionName: string;
  seriesName: string;
  matchName: string;
  teams: string[];
  startTime: string;
  matchType: string;
  venue: string;
  isInternational: boolean;
  inferredGender: string;
  includeReason: string;
  excludedReason: string;
}

export async function fetchRawCricketMatches(limit: number = 50): Promise<CricketRawDiagnostic[]> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return [];

  const allMatches: CricApiMatch[] = [];
  let offset = 0;
  let pagesRead = 0;
  const MAX_PAGES = 20; // scan broadly — API pagination is non-chronological

  while (pagesRead < MAX_PAGES) {
    const page = await fetchMatchesPage(apiKey, offset);
    if (!page || !page.data || page.data.length === 0) break;
    allMatches.push(...page.data);
    pagesRead++;
    if (allMatches.length >= page.info.totalRows) break;
    offset += page.data.length;
    await new Promise((r) => setTimeout(r, 200));
  }

  const results: CricketRawDiagnostic[] = [];
  for (const match of allMatches.slice(0, limit)) {
    const seriesName = parseSeriesName(match.name);
    const classification = classifyMatch(match);
    const gender = classification.type !== "skip"
      ? inferCricketGender(match, classification)
      : inferCricketGender(match, { league: "", type: "skip", seriesName });

    let includeReason = "";
    let excludedReason = "";

    if (classification.type === "skip") {
      const sn = parseSeriesName(match.name);
      excludedReason = isNonTargetMatch(match, sn)
        ? "non-target (u19/warmup/practice/friendly)"
        : "not international or allowed domestic league";
    } else if (gender === "women") {
      excludedReason = "inferred women's cricket";
    } else {
      if (classification.isIccT20Wc) {
        includeReason = "ICC T20 World Cup match";
      } else if (isMajorIccTournament(match, seriesName)) {
        includeReason = "major ICC tournament";
      } else if (classification.type === "international") {
        includeReason = "international match";
      } else {
        includeReason = `domestic league: ${classification.league}`;
      }
    }

    results.push({
      id: match.id,
      competitionName: classification.league || "(none)",
      seriesName,
      matchName: match.name,
      teams: match.teams || [],
      startTime: match.dateTimeGMT || match.date,
      matchType: match.matchType,
      venue: match.venue || "",
      isInternational: classification.type === "international",
      inferredGender: gender,
      includeReason,
      excludedReason,
    });
  }

  return results;
}

export async function searchRawCricketMatches(query: string): Promise<CricketRawDiagnostic[]> {
  const all = await fetchRawCricketMatches(500);
  const q = query.toLowerCase();
  return all.filter(m =>
    m.competitionName.toLowerCase().includes(q) ||
    m.seriesName.toLowerCase().includes(q) ||
    m.matchName.toLowerCase().includes(q) ||
    m.teams.some(t => t.toLowerCase().includes(q))
  );
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
  // API pagination is non-chronological so featured matches can be anywhere.
  // 20 pages × 25 = 500 matches scanned. 2 runs/day = 40 hits, well within 100/day limit.
  const MAX_PAGES = 20;

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

  const seenIds = new Map<string, CricApiMatch>();
  for (const match of allMatches) {
    if (!seenIds.has(match.id)) {
      seenIds.set(match.id, match);
    }
  }
  const uniqueMatches = Array.from(seenIds.values());
  if (uniqueMatches.length < allMatches.length) {
    console.log(`  Cricket: Deduped ${allMatches.length} → ${uniqueMatches.length} unique matches`);
  }

  const events: AppEvent[] = [];
  const counts: Record<string, number> = {};
  let skipped = 0;
  let womenFiltered = 0;
  let intlNationFiltered = 0;

  for (const match of uniqueMatches) {
    const classification = classifyMatch(match);
    if (classification.type === "skip") {
      skipped++;
      continue;
    }

    const gender = inferCricketGender(match, classification);
    if (gender === "women") {
      womenFiltered++;
      continue;
    }

    if (classification.type === "international" && !classification.isIccT20Wc) {
      const teams = (match.teams || []).map((t) => t.toLowerCase());
      const hasFeatured = teams.some((t) => FEATURED_CRICKET_NATIONS.has(t));
      if (!hasFeatured) {
        intlNationFiltered++;
        continue;
      }
    }

    const event = matchToEvent(match, classification as {
      type: "international" | "domestic";
      league: string;
      country: string;
      seriesName: string;
      isIccT20Wc: boolean;
    });
    if (!event) continue;
    events.push(event);

    const key = classification.league;
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log(`  Cricket: ${events.length} kept, ${skipped} skipped, ${womenFiltered} women's filtered, ${intlNationFiltered} intl nation-filtered`);
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
    if (!passesNationFilter(e as any)) {
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

  const teamTimeKeys = new Set<string>();
  const deduped: AppEvent[] = [];
  for (const e of Array.from(mergedMap.values())) {
    const ttKey = `${(e.homeTeam || "").toLowerCase()}|${(e.awayTeam || "").toLowerCase()}|${e.startTimeLocal}`;
    if (teamTimeKeys.has(ttKey)) {
      pruned++;
      continue;
    }
    teamTimeKeys.add(ttKey);
    deduped.push(e);
  }

  const merged = deduped.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
