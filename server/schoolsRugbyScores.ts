import type { ScoreData } from "./liveScores";

// SA Schools Rugby has no live-score API. We track only Paarl Boys' High
// fixtures (see scripts/updateSchoolsRugby.ts), so a single school results page
// on schoolrugby.co.za covers every fixture. We scrape its "Latest Results"
// list and match completed games back to our fixtures by date.
const PAARL_SID = "456";
const RESULTS_URL = `http://www.schoolrugby.co.za/school.aspx?s=${PAARL_SID}`;
const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 9000;

export interface SchoolsRugbyEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTimeLocal?: string;
}

interface ParsedResult {
  date: string; // YYYY-MM-DD as printed on the site (SAST local date)
  paarlScore: number;
  oppScore: number;
  oppName: string;
}

let cache: { results: ParsedResult[]; ts: number } = { results: [], ts: 0 };

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// Lowercase, strip diacritics and punctuation -> space-separated tokens.
function norm(s: string): string {
  return decodeEntities(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Generic schools tokens that don't uniquely identify an opponent.
const STOPWORDS = new Set([
  "boys", "girls", "high", "school", "hoer", "hoerskool", "seunskool",
  "college", "landbouskool", "rugby", "the", "of", "pta",
]);

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function opponentMatches(ourOpp: string, scrapedOpp: string): boolean {
  const a = tokens(ourOpp);
  const b = new Set(tokens(scrapedOpp));
  return a.some((t) => b.has(t));
}

function parseResults(html: string): ParsedResult[] {
  const out: ParsedResult[] = [];
  const tiles = html.split("ResultTile");
  for (const tile of tiles) {
    const yearM = tile.match(/class="rotate year">\s*(\d{4})/);
    const monthM = tile.match(/class="month">\s*([A-Za-z]{3})/);
    const dayM = tile.match(/class="day">\s*(\d{1,2})/);
    if (!yearM || !monthM || !dayM) continue;
    const mon = MONTHS[monthM[1].toUpperCase()];
    if (!mon) continue;
    const date = `${yearM[1]}-${mon}-${dayM[1].padStart(2, "0")}`;

    const matchupM = tile.match(
      /<a href='\/school\.aspx\?s=(\d+)'>([^<]+)<\/a>\s*(?:<strong>)?\s*(\d+)\s*(?:<\/strong>)?\s*[-\u2013]\s*(?:<strong>)?\s*(\d+)\s*(?:<\/strong>)?\s*<a href='\/school\.aspx\?s=(\d+)'>([^<]+)<\/a>/
    );
    if (!matchupM) continue;
    const [, sidA, nameA, scoreAStr, scoreBStr, sidB, nameB] = matchupM;
    const scoreA = parseInt(scoreAStr, 10);
    const scoreB = parseInt(scoreBStr, 10);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) continue;

    let paarlScore: number;
    let oppScore: number;
    let oppName: string;
    if (sidA === PAARL_SID) {
      paarlScore = scoreA;
      oppScore = scoreB;
      oppName = decodeEntities(nameB);
    } else if (sidB === PAARL_SID) {
      paarlScore = scoreB;
      oppScore = scoreA;
      oppName = decodeEntities(nameA);
    } else {
      continue;
    }
    out.push({ date, paarlScore, oppScore, oppName });
  }
  return out;
}

async function loadResults(): Promise<ParsedResult[]> {
  if (Date.now() - cache.ts < CACHE_TTL_MS && cache.results.length > 0) {
    return cache.results;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RESULTS_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    if (!res.ok) return cache.results;
    const html = await res.text();
    const results = parseResults(html);
    if (results.length > 0) {
      cache = { results, ts: Date.now() };
    }
    return results.length > 0 ? results : cache.results;
  } catch {
    return cache.results;
  } finally {
    clearTimeout(timer);
  }
}

// Candidate date strings (YYYY-MM-DD) for a fixture: its UTC date and its
// SAST (UTC+2) date, so afternoon/evening kickoffs match the site's local date.
function candidateDates(startTimeLocal?: string): string[] {
  if (!startTimeLocal) return [];
  const t = new Date(startTimeLocal).getTime();
  if (Number.isNaN(t)) return [];
  const utc = new Date(t).toISOString().slice(0, 10);
  const sast = new Date(t + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return utc === sast ? [utc] : [utc, sast];
}

export async function fetchSchoolsRugbyScores(
  events: SchoolsRugbyEvent[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (!events || events.length === 0) return scores;

  const results = await loadResults();
  if (results.length === 0) return scores;

  for (const event of events) {
    const dates = candidateDates(event.startTimeLocal);
    if (dates.length === 0) continue;

    let candidates = results.filter((r) => dates.includes(r.date));
    if (candidates.length === 0) continue;

    // When several results share a date (e.g. festival days, multiple grades),
    // disambiguate by opponent. If that doesn't narrow to exactly one result,
    // skip rather than risk attaching the wrong score to the fixture.
    const opponent =
      norm(event.homeTeam).includes("paarl boys") ? event.awayTeam : event.homeTeam;
    if (candidates.length > 1) {
      candidates = candidates.filter((r) => opponentMatches(opponent, r.oppName));
      if (candidates.length !== 1) continue;
    }
    const result = candidates[0];

    const isPaarlHome = norm(event.homeTeam).includes("paarl boys");
    const homeScore = isPaarlHome ? result.paarlScore : result.oppScore;
    const awayScore = isPaarlHome ? result.oppScore : result.paarlScore;

    scores[event.id] = {
      awayScore,
      homeScore,
      status: "final",
      period: "FT",
    };
  }

  return scores;
}
