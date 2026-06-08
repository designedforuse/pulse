import * as fs from "fs";
import * as path from "path";

// ICC Full Members. International cricket fixtures default to Full-Member-vs-
// Full-Member only. Associate nations (Nepal, UAE, Scotland, Netherlands,
// Namibia, Oman, USA, Canada, PNG, Uganda, etc.) are normally filtered out
// — even when playing each other in ICC qualifying competitions.
const FEATURED_CRICKET_NATIONS = new Set([
  "india", "australia", "england", "south africa", "new zealand",
  "pakistan", "sri lanka", "west indies", "bangladesh", "afghanistan",
  "zimbabwe", "ireland",
]);

// Carve-out: these Full Members are also allowed to appear in fixtures against
// Associate teams (their Associate-tour bilaterals are kept).
const ASSOCIATE_CARVE_OUT_TEAMS = new Set([
  "south africa",
]);

const ASSOCIATE_TEAM_ALIASES = new Set([
  "scotland", "netherlands", "nepal", "uae", "united arab emirates",
  "namibia", "oman", "usa", "united states", "united states of america",
  "canada", "papua new guinea", "uganda",
  "hong kong", "singapore", "malaysia", "kuwait", "bahrain", "qatar",
  "jersey", "guernsey", "italy", "germany", "denmark", "kenya",
  "bermuda", "cayman islands",
]);

function passesNationFilter(event: { homeTeam: string; awayTeam: string; competitionType?: string; isIccT20Wc?: boolean }): boolean {
  if (event.competitionType !== "international") return true;
  const teams = [event.homeTeam, event.awayTeam].map((t) => t.toLowerCase());
  if (teams.every((t) => FEATURED_CRICKET_NATIONS.has(t))) return true;
  // Carve-out: one team is a carve-out Full Member AND the other is a
  // recognised Associate (or any other team). We allow a carve-out team to
  // face anyone — Full Member or Associate.
  const hasCarveOut = teams.some((t) => ASSOCIATE_CARVE_OUT_TEAMS.has(t));
  if (!hasCarveOut) return false;
  const other = teams.find((t) => !ASSOCIATE_CARVE_OUT_TEAMS.has(t)) ?? teams[0];
  return FEATURED_CRICKET_NATIONS.has(other) || ASSOCIATE_TEAM_ALIASES.has(other);
}

const CRICAPI_BASE = "https://api.cricapi.com/v1";
const CRICKET_DURATION_MIN: Record<string, number> = {
  t20: 210,
  odi: 480,
  // A Test is scheduled over 5 days. It is split into one event per day (see
  // splitTestMatchDays), so this base duration is only a placeholder for the
  // un-split event before expansion.
  test: 5 * 24 * 60,
};

// A Test match is split into one card per day so each day shows independently
// and a single 5-day window doesn't read as "live" continuously. Mirrors the
// WRC per-day pattern (scripts/updateWrc.ts).
const TEST_MATCH_TOTAL_DAYS = 5;
const DAY_MS = 86400000;
// A day's play (incl. lunch/tea breaks and a little extra time) is ~8h. Cap the
// per-day window so the card stops reading "live" overnight between days.
const TEST_DAY_DURATION_MIN = 8 * 60;

const ALLOWED_DOMESTIC_LEAGUES: Record<string, { league: string; country: string }> = {
  ipl: { league: "IPL", country: "India" },
  "indian premier league": { league: "IPL", country: "India" },
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
  cricketMatchId?: string;
  dayNumber?: number;
  totalDays?: number;
  isFinalDay?: boolean;
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
      league: classifyInternationalLeague(resolveMatchType(match), seriesName),
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
      league: classifyInternationalLeague(resolveMatchType(match), seriesName),
      country,
      seriesName,
      isIccT20Wc: false,
    };
  }

  return { type: "skip", league: "", country: "", seriesName, isIccT20Wc: false };
}

// CricAPI's /matches endpoint frequently returns an empty matchType. Without it
// a Test can't be detected, so it never splits into per-day cards and the Daily
// Wrap Test handling never engages. CricAPI does reliably include the format in
// the match name (e.g. "England vs New Zealand, 1st Test"), so fall back to that.
function resolveMatchType(match: CricApiMatch): string {
  const raw = (match.matchType || "").trim().toLowerCase();
  if (raw) return raw;
  const hay = (match.name || "").toLowerCase();
  if (/\btest\b/.test(hay)) return "test";
  if (/\bt20i?\b|\btwenty[- ]?20\b/.test(hay)) return "t20";
  if (/\bodi\b|\bone[- ]day\b/.test(hay)) return "odi";
  return "";
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
  // All cricket is exclusive to Willow TV — no ESPN/Disney+ routing.
  return "willowtv";
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

  // IPL matches are played in India (IST = UTC+5:30). CricAPI often provides
  // IST times mislabeled as GMT, or omits the time entirely (midnight fallback).
  // Valid IPL UTC start times: 10:00 (3:30 PM IST weekend) or 14:00 (7:30 PM IST evening).
  // Any UTC hour < 10 is invalid for an India match — correct to 14:00 UTC.
  if (classification.league === "IPL") {
    const utcHour = new Date(startTime).getUTCHours();
    if (utcHour < 10) {
      const datePart = startTime.substring(0, 10);
      startTime = datePart + "T14:00:00.000Z";
    }
  }

  const durationMin = CRICKET_DURATION_MIN[resolveMatchType(match)] || 210;
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
    format: resolveMatchType(match),
    hostCountry: classification.country,
    seriesName: classification.seriesName,
    gender: inferCricketGender(match, classification),
    isIccT20Wc: classification.isIccT20Wc,
  };
}

// Expand a single Test-match event into one event per scheduled day. Each day
// gets a bounded ~8h window and carries dayNumber/totalDays so the card can show
// "Day N of M". The cricketMatchId is shared across all days so live scores still
// resolve to the same CricAPI match. The last emitted day is flagged isFinalDay
// (the day the result is surfaced).
//
// Tests routinely end before day 5 (a result inside 3-4 days is common). CricAPI
// doesn't report how many days were actually played, so when the match has ended
// we approximate the last day from elapsed time and don't emit cards for days
// that never happened (e.g. a 3-day finish shouldn't show Day 4 / Day 5).
function splitTestMatchDays(base: AppEvent, matchEnded: boolean, nowMs: number): AppEvent[] {
  const startMs = new Date(base.startTimeLocal).getTime();
  if (Number.isNaN(startMs)) return [base];

  let lastDay = TEST_MATCH_TOTAL_DAYS;
  if (matchEnded) {
    const elapsedDays = Math.floor((nowMs - startMs) / DAY_MS) + 1;
    lastDay = Math.min(TEST_MATCH_TOTAL_DAYS, Math.max(1, elapsedDays));
  }

  const days: AppEvent[] = [];
  for (let i = 0; i < lastDay; i++) {
    const dayStartMs = startMs + i * DAY_MS;
    const dayEndMs = dayStartMs + TEST_DAY_DURATION_MIN * 60000;
    days.push({
      ...base,
      id: `${base.id}-day${i + 1}`,
      startTimeLocal: new Date(dayStartMs).toISOString(),
      endTimeLocal: new Date(dayEndMs).toISOString(),
      isLive: false,
      dayNumber: i + 1,
      totalDays: TEST_MATCH_TOTAL_DAYS,
      isFinalDay: i + 1 === lastDay,
    });
  }
  return days;
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
      matchType: resolveMatchType(match),
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
  // 10 pages × 25 = 250 matches scanned. 2 runs/day = 20 hits, stays within 100/day budget.
  const MAX_PAGES = 10;

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

    // IPL is sourced from the authoritative iplt20.com feed (updateIpl.ts).
    // CricAPI's free tier misses games and serves "TBC @ TBC" for playoffs.
    if (classification.league === "IPL") {
      skipped++;
      continue;
    }

    const gender = inferCricketGender(match, classification);
    if (gender === "women") {
      womenFiltered++;
      continue;
    }

    if (classification.type === "international") {
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
    // Test matches are multi-day — emit one event per day so they show as a
    // series of five cards that make up the Test.
    if (String(event.format).toLowerCase() === "test") {
      events.push(...splitTestMatchDays(event, match.matchEnded === true, Date.now()));
    } else {
      events.push(event);
    }

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

  // Tests that the fresh feed split into per-day events, indexed two ways:
  //  - base id (legacy single-event id == fresh per-day base id) for the migration
  //    of old un-split Test events whose stored ids predate cricketMatchId.
  //  - cricketMatchId (stable per match) to supersede ANY older representation of
  //    the same match: a legacy single 5-day event, an undefined-format single
  //    event from before format inference, or a later day removed by an early
  //    finish. The stable match id catches forms whose synthetic id has changed
  //    (e.g. leagueKey moved from "intl" to "test" once the format was detected).
  const testDayBaseId = (id: string) => id.replace(/-day\d+$/, "");
  const freshTestBaseIds = new Set<string>();
  const freshTestMatchIds = new Set<string>();
  for (const e of fresh) {
    if ((e as any).dayNumber != null && String((e as any).format).toLowerCase() === "test") {
      freshTestBaseIds.add(testDayBaseId(e.id));
      if ((e as any).cricketMatchId) freshTestMatchIds.add((e as any).cricketMatchId);
    }
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
    // Migration: legacy Test matches were stored as a single 5-day event. Tests
    // are now generated as one event per day, so drop the old un-split form
    // (format "test" with no dayNumber) — but ONLY when the fresh feed actually
    // provides per-day replacements for that match (its base id == the legacy id).
    // If the match is missing from this refresh (quota out, aged out of CricAPI),
    // keep the legacy event and let the normal retention window age it out, rather
    // than deleting the match entirely with no replacement.
    if (String((e as any).format).toLowerCase() === "test" && (e as any).dayNumber == null) {
      if (freshTestBaseIds.has(e.id)) {
        pruned++;
        continue;
      }
    }
    // A Test now split into per-day events supersedes any older representation of
    // the same match: an undefined-format single event from before format inference,
    // a legacy single 5-day Test, or a later day removed by an early finish. Match
    // on the stable cricketMatchId (the synthetic id may have changed) and only when
    // the match's per-day events are present in the fresh feed — so concluded Tests
    // that have aged out of CricAPI keep their retained cards.
    if (
      (e as any).cricketMatchId &&
      freshTestMatchIds.has((e as any).cricketMatchId) &&
      !freshMap.has(e.id)
    ) {
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

// ─── ESPN keyless cricket FIXTURES (schedule source) ────────────────────────
// CricAPI's free tier (~100 hits/day, shared dev+prod) keeps exhausting and
// breaking the *schedule*. We pull cricket FIXTURES from ESPN's keyless public
// API (the same site.api source already trusted for concluded-score fallback)
// and reserve CricAPI for LIVE SCORES only. The live-score path binds CricAPI
// rows to events by team name (not just cricketMatchId), so ESPN fixtures with
// no CricAPI id still receive live scores.
//
// ESPN structure (verified): no global scoreboard — each competition is a numeric
// league id. `cricket/{leagueId}/scoreboard?dates=<YEAR>` returns the WHOLE season
// in one call (date ranges return nothing). Current bilateral series are discovered
// via the search API (uid carries `…l:<id>`). Match format (Test/ODI/T20) is not in
// the scoreboard — it comes from the per-event summary endpoint.
const ESPN_CRICKET_BASE = "https://site.api.espn.com/apis/site/v2/sports/cricket";
const ESPN_CRICKET_SEARCH = "https://site.web.api.espn.com/apis/search/v2";

// Marquee domestic competitions Pulse features. Resolved dynamically via search so
// season-specific ids self-heal; IPL is intentionally excluded (sourced from the
// authoritative iplt20.com feed in updateIpl.ts).
const ESPN_DOMESTIC_SEARCH_TERMS = [
  "Major League Cricket",
  "Big Bash League",
  "SA20",
  "Caribbean Premier League",
  "Super Smash",
];

// Full Members whose bilateral tours we want to discover. Searching each nation
// surfaces "X tour of Y <year>" league entries with resolvable ids.
const ESPN_DISCOVERY_NATIONS = [
  "India", "Australia", "England", "South Africa", "New Zealand",
  "Pakistan", "Sri Lanka", "West Indies", "Bangladesh", "Afghanistan",
  "Zimbabwe", "Ireland",
];

interface EspnLeagueHit {
  id: number;
  name: string;
}

function espnSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function espnFetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Resolve `type:"league"` hits for a search query into {id,name} pairs.
async function espnSearchLeagues(query: string): Promise<EspnLeagueHit[]> {
  const url = `${ESPN_CRICKET_SEARCH}?query=${encodeURIComponent(query)}&sport=cricket&limit=12`;
  const data = await espnFetchJson(url);
  const hits: EspnLeagueHit[] = [];
  for (const r of data?.results || []) {
    if (r.type !== "league") continue;
    for (const it of r.contents || []) {
      const m = /l:(\d+)/.exec(it.uid || "");
      if (m) hits.push({ id: parseInt(m[1], 10), name: it.displayName || "" });
    }
  }
  return hits;
}

// Keep only leagues whose name references the current or next year/season, so we
// don't waste season-scoreboard calls on historical tours that search also returns.
function espnLeagueIsCurrent(name: string, year: number): boolean {
  const y = String(year);
  const ny = String(year + 1);
  const seasonThis = `${year}/${String((year + 1) % 100).padStart(2, "0")}`; // e.g. 2026/27
  const seasonPrev = `${year - 1}/${String(year % 100).padStart(2, "0")}`;   // e.g. 2025/26
  return (
    name.includes(y) ||
    name.includes(ny) ||
    name.includes(seasonThis) ||
    name.includes(seasonPrev)
  );
}

// Pull match format from the per-event summary endpoint. ESPN encodes it in the
// notes array (matchnumber "ODI no. 4974" / "Test no. …" / "T20I no. …", and
// matchdays "(50-over match)" / "(20-over match)"). Returns "" if unknown.
async function espnFetchFormat(leagueId: number, eventId: string): Promise<string> {
  const url = `${ESPN_CRICKET_BASE}/${leagueId}/summary?event=${eventId}`;
  // One retry: keeps Test day-splitting stable across runs by not silently losing
  // format on a transient summary 4xx/5xx (an unresolved Test would render unsplit).
  let data = await espnFetchJson(url);
  if (!data) {
    await espnSleep(300);
    data = await espnFetchJson(url);
  }
  const notes: any[] = data?.notes || data?.gameInfo?.notes || [];
  for (const n of notes) {
    const t = String(n?.text || "").toLowerCase();
    if (n?.type === "matchnumber") {
      if (t.includes("test")) return "test";
      if (t.includes("odi")) return "odi";
      if (t.includes("t20")) return "t20";
    }
  }
  for (const n of notes) {
    const t = String(n?.text || "").toLowerCase();
    if (n?.type === "matchdays") {
      if (t.includes("50-over")) return "odi";
      if (t.includes("20-over")) return "t20";
      if (/\bday \d\b|\d-day|day's play|test/.test(t)) return "test";
    }
  }
  return "";
}

// Adapt an ESPN scoreboard event into the CricApiMatch shape so the existing
// classify → filter → matchToEvent → splitTestMatchDays pipeline can be reused
// unchanged. name is built as "<away> vs <home>, <seriesName>" so parseSeriesName
// (which keeps everything after the first comma) recovers the real ESPN series.
function espnEventToCricApiMatch(
  ev: any,
  seriesName: string,
  format: string,
): CricApiMatch | null {
  const comp = (ev.competitions || [])[0];
  if (!comp) return null;
  const competitors = comp.competitors || [];
  if (competitors.length < 2) return null;

  const homeC = competitors.find((c: any) => c.homeAway === "home") || competitors[1];
  const awayC = competitors.find((c: any) => c.homeAway === "away") || competitors[0];
  const homeTeam = homeC?.team?.displayName || homeC?.team?.name || "";
  const awayTeam = awayC?.team?.displayName || awayC?.team?.name || "";
  if (!homeTeam || !awayTeam) return null;

  const iso = ev.date || comp.date || "";
  if (!iso) return null;
  const dateOnly = iso.slice(0, 10);
  const state = comp.status?.type?.state || "pre";
  const venue = comp.venue?.fullName || comp.venue?.address?.city || "";

  return {
    id: String(ev.id || ev.uid || `${dateOnly}-${homeTeam}-${awayTeam}`),
    // teams[0] = away, teams[1] = home (CricAPI ordering used by matchToEvent).
    name: `${awayTeam} vs ${homeTeam}, ${seriesName}`,
    matchType: format || "",
    status: comp.status?.type?.detail || state,
    venue,
    date: dateOnly,
    dateTimeGMT: iso,
    teams: [awayTeam, homeTeam],
    series_id: String(comp.id || ev.id || ""),
    matchStarted: state === "in" || state === "post",
    matchEnded: state === "post",
  };
}

export async function fetchEspnCricketFixtures(): Promise<CricketFetchResult> {
  console.log("  Cricket: Fetching fixtures from ESPN (keyless)...");
  const now = new Date();
  const year = now.getUTCFullYear();
  const windowStart = now.getTime() - 14 * 24 * 3600000;
  const windowEnd = now.getTime() + 21 * 24 * 3600000;

  // 1. Discover candidate league ids (domestic marquee + current bilateral tours).
  const leagueMap = new Map<number, string>();
  const discoveryQueries = [
    ...ESPN_DOMESTIC_SEARCH_TERMS,
    ...ESPN_DISCOVERY_NATIONS,
    `tour of ${year}`,
  ];
  const domesticIds = new Set<number>();
  for (const q of discoveryQueries) {
    const hits = await espnSearchLeagues(q);
    const isDomesticTerm = ESPN_DOMESTIC_SEARCH_TERMS.includes(q);
    for (const h of hits) {
      // Domestic terms: take the first (best) hit as the comp id regardless of year.
      // Tour discovery: keep only current/next-season leagues to limit scoreboard calls.
      if (isDomesticTerm) {
        domesticIds.add(h.id);
        if (!leagueMap.has(h.id)) leagueMap.set(h.id, h.name);
      } else if (espnLeagueIsCurrent(h.name, year)) {
        if (!leagueMap.has(h.id)) leagueMap.set(h.id, h.name);
      }
    }
    await espnSleep(120);
  }
  console.log(`  Cricket: ESPN discovered ${leagueMap.size} candidate leagues (${domesticIds.size} domestic)`);

  // 2. Enumerate each league's season and collect events inside the retention window.
  type Pending = { ev: any; leagueId: number; seriesName: string };
  const pending: Pending[] = [];
  const seenEventIds = new Set<string>();
  for (const [leagueId, leagueName] of leagueMap) {
    const sb = await espnFetchJson(`${ESPN_CRICKET_BASE}/${leagueId}/scoreboard?dates=${year}`);
    const seriesName = sb?.leagues?.[0]?.name || leagueName;
    for (const ev of sb?.events || []) {
      const iso = ev.date || ev.competitions?.[0]?.date;
      if (!iso) continue;
      const t = new Date(iso).getTime();
      if (Number.isNaN(t) || t < windowStart || t > windowEnd) continue;
      const id = String(ev.id || ev.uid || "");
      if (id && seenEventIds.has(id)) continue;
      if (id) seenEventIds.add(id);
      pending.push({ ev, leagueId, seriesName });
    }
    await espnSleep(120);
  }
  console.log(`  Cricket: ESPN ${pending.length} fixtures in window across ${leagueMap.size} leagues`);

  // 3. Resolve format (per-event summary) + run through the shared pipeline.
  const events: AppEvent[] = [];
  const counts: Record<string, number> = {};
  let skipped = 0;
  let womenFiltered = 0;
  let intlNationFiltered = 0;
  const MAX_FORMAT_LOOKUPS = 150;
  let formatLookups = 0;

  for (const { ev, leagueId, seriesName } of pending) {
    let format = "";
    if (formatLookups < MAX_FORMAT_LOOKUPS) {
      format = await espnFetchFormat(leagueId, String(ev.id));
      formatLookups++;
      await espnSleep(100);
    }

    const match = espnEventToCricApiMatch(ev, seriesName, format);
    if (!match) { skipped++; continue; }

    const classification = classifyMatch(match);
    if (classification.type === "skip") { skipped++; continue; }
    // IPL comes from the authoritative iplt20.com feed — never from ESPN here.
    if (classification.league === "IPL") { skipped++; continue; }

    if (inferCricketGender(match, classification) === "women") { womenFiltered++; continue; }

    if (classification.type === "international") {
      const teams = (match.teams || []).map((t) => t.toLowerCase());
      if (!teams.some((t) => FEATURED_CRICKET_NATIONS.has(t))) { intlNationFiltered++; continue; }
    }

    const baseEvent = matchToEvent(match, classification as {
      type: "international" | "domestic";
      league: string;
      country: string;
      seriesName: string;
      isIccT20Wc: boolean;
    });
    if (!baseEvent) continue;

    // ESPN-sourced: tag the source. Keep the ESPN event id in cricketMatchId — it's
    // a stable, keyless identity (constant across runs) that lets mergeCricketEvents
    // supersede older representations (e.g. a Test that gains/loses its day-split when
    // a format lookup transiently fails). It never equals a CricAPI cricScore id
    // (numeric vs uuid), so live scores still bind via the team-name fallback.
    const tagEspn = (e: AppEvent): AppEvent => ({ ...e, source: "cricket-espn" });

    if (String(baseEvent.format).toLowerCase() === "test") {
      for (const day of splitTestMatchDays(baseEvent, match.matchEnded === true, Date.now())) {
        events.push(tagEspn(day));
      }
    } else {
      events.push(tagEspn(baseEvent));
    }
    counts[classification.league] = (counts[classification.league] || 0) + 1;
  }

  console.log(`  Cricket: ESPN ${events.length} kept, ${skipped} skipped, ${womenFiltered} women's, ${intlNationFiltered} intl nation-filtered (${formatLookups} format lookups)`);
  console.log(`  Cricket ESPN counts: ${JSON.stringify(counts)}`);

  return {
    events,
    sourceUsed: "espn",
    totalFromApi: pending.length,
    filteredCount: events.length,
    counts,
  };
}

// Orchestrator entry point: ESPN is the primary fixture source (keyless, no quota).
// CricAPI is used only as a fallback when ESPN yields nothing (e.g. ESPN outage),
// keeping the schedule resilient without spending CricAPI's quota on the happy path.
export async function fetchCricketFixtures(): Promise<CricketFetchResult> {
  const espn = await fetchEspnCricketFixtures();
  if (espn.events.length > 0) return espn;

  if (process.env.CRICAPI_KEY) {
    console.log("  Cricket: ESPN returned 0 fixtures — falling back to CricAPI");
    const cricapi = await fetchCricketEvents();
    return { ...cricapi, sourceUsed: cricapi.events.length > 0 ? "cricapi-fallback" : "none" };
  }
  return espn;
}
