import * as fs from "fs";
import * as path from "path";
import { fetchAllLiveScores } from "./liveScores";
import type { ScoreData, SeriesStatus } from "./liveScores";
import { enrichWithHighlights, type HighlightVideo } from "./dailyWrapHighlights";
import { fetchSvnsMatches } from "./svnsMatches";
import { fetchDiamondLeagueSummary, type DLAthleteResult } from "./diamondLeagueResults";

export interface SvnsFinal {
  gender: "mens" | "womens";
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}

// A single athletics result row for the Diamond League story card.
export interface AthleticsResult {
  discipline: string; // formatted, e.g. "men's 200m"
  athlete: string;
  nation: string; // 3-letter IOC code
  rank: number;
  performance: string;
  record?: string; // expanded record name, e.g. "season best"
}

export interface DailyWrapEntry {
  eventId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  editorial: string;
  detail: string;
  winner?: string;
  loser?: string;
  winnerScore?: string;
  loserScore?: string;
  // HSBC SVNS finals-day card carries the Cup Final result(s) so the story can
  // render a proper score card (men's first, then women's) instead of a plain
  // detail line.
  svnsFinals?: SvnsFinal[];
  // Diamond League (athletics) result rows + meet context, so the story can
  // render a results card instead of a plain detail line.
  athleticsResults?: AthleticsResult[];
  athleticsMeet?: { city: string; scope: "sa" | "top" };
  // Final score captured at wrap-generation time. Live scores expire once a
  // game leaves the live window, so the story card relies on this snapshot to
  // render set/score details consistently rather than the volatile live feed.
  scoreSnapshot?: ScoreData;
  priorityScore: number;
  startTimeLocal: string;
  video?: HighlightVideo;
}

export interface DailyWrapResponse {
  date: string;
  hasResults: boolean;
  results: DailyWrapEntry[];
}

// tz = getTimezoneOffset() from client (minutes, positive = west, e.g. 300 for EST)
// Window spans the local "today" plus a 24h look-back so results from
// yesterday still show in the small hours before today's games wrap up.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
function getTodayBounds(tz: number): { start: Date; end: Date } {
  const utcNow = Date.now();
  const localNowMs = utcNow - tz * 60000;
  const localMidnightMs = Math.floor(localNowMs / 86400000) * 86400000;
  const utcStartMs = localMidnightMs + tz * 60000;
  const utcEndMs = utcStartMs + 86400000 - 1;
  return { start: new Date(utcStartMs - LOOKBACK_MS), end: new Date(utcEndMs) };
}

function formatDate(tz: number): string {
  const utcNow = Date.now();
  const localNowMs = utcNow - tz * 60000;
  const d = new Date(localNowMs);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const FINAL_KEYWORDS = ["final", "ft", "ended", "full time", "completed", "f/ot", "f/so", "game over", "post"];

function isFinalScore(score: ScoreData | undefined): boolean {
  if (!score) return false;
  const s = (score.status || "").toLowerCase().trim();
  return FINAL_KEYWORDS.some((kw) => s === kw || s.startsWith(kw));
}

function getPriorityScore(sport: string, league: string, score: ScoreData | undefined): number {
  const sportLower = sport.toLowerCase();
  const leagueLower = league.toLowerCase();

  if (sportLower === "racing") {
    if (score?.racingSessionType === "Race") return 100;
    if (score?.racingSessionType === "Sprint") return 60;
    return 5;
  }
  if (sportLower === "golf") return 90;
  if (sportLower === "athletics") return 68;
  if (sportLower === "tennis") {
    if (leagueLower.includes("grand slam") || leagueLower.includes("wimbledon") ||
        leagueLower.includes("us open") || leagueLower.includes("australian") ||
        leagueLower.includes("french open") || leagueLower.includes("roland")) return 85;
    if (leagueLower.includes("masters") || leagueLower.includes("1000")) return 75;
    return 65;
  }
  if (sportLower === "rugby" && leagueLower.includes("svns")) return 78;
  if (sportLower === "soccer") {
    if (leagueLower.includes("world cup")) return 88;
    if (leagueLower.includes("champions") || leagueLower.includes("ucl")) return 58;
    if (leagueLower.includes("premier") || leagueLower.includes("epl")) return 52;
    if (leagueLower.includes("europa")) return 48;
    if (leagueLower.includes("fa cup") || leagueLower.includes("facup")) return 46;
    if (leagueLower.includes("serie a") || leagueLower.includes("la liga") ||
        leagueLower.includes("bundesliga") || leagueLower.includes("ligue 1")) return 45;
    if (leagueLower.includes("mls")) return 38;
    return 35;
  }
  if (sportLower === "rugby") {
    if (leagueLower.includes("six nations") || leagueLower.includes("six_nations")) return 55;
    if (leagueLower.includes("urc") || leagueLower.includes("premiership") ||
        leagueLower.includes("top 14") || leagueLower.includes("top14")) return 36;
    if (leagueLower.includes("super rugby") || leagueLower.includes("super_rugby")) return 34;
    return 30;
  }
  if (sportLower === "hockey") {
    if (leagueLower === "nhl") return 48;
    if (leagueLower === "ahl") return 28;
    return 20;
  }
  if (sportLower === "basketball") {
    if (leagueLower === "nba") return 44;
    return 22;
  }
  if (sportLower === "cricket") return 32;
  return 15;
}

const COUNTRY_FLAGS: Record<string, string> = {
  Netherlands: "🇳🇱", Germany: "🇩🇪", "United Kingdom": "🇬🇧", "Great Britain": "🇬🇧",
  France: "🇫🇷", Spain: "🇪🇸", Italy: "🇮🇹", Australia: "🇦🇺",
  "United States": "🇺🇸", USA: "🇺🇸", Canada: "🇨🇦", Brazil: "🇧🇷",
  Mexico: "🇲🇽", Japan: "🇯🇵", China: "🇨🇳", "South Korea": "🇰🇷",
  Argentina: "🇦🇷", Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰",
  Finland: "🇫🇮", Switzerland: "🇨🇭", Austria: "🇦🇹", Belgium: "🇧🇪",
  Poland: "🇵🇱", Portugal: "🇵🇹", Greece: "🇬🇷", Turkey: "🇹🇷",
  Russia: "🇷🇺", Ukraine: "🇺🇦", "New Zealand": "🇳🇿", "South Africa": "🇿🇦",
  Ireland: "🇮🇪", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  India: "🇮🇳", Pakistan: "🇵🇰", "Sri Lanka": "🇱🇰", Bangladesh: "🇧🇩",
  Thailand: "🇹🇭", Singapore: "🇸🇬", Nigeria: "🇳🇬", Kenya: "🇰🇪",
  Ethiopia: "🇪🇹", Morocco: "🇲🇦", Egypt: "🇪🇬", Colombia: "🇨🇴",
  Chile: "🇨🇱", Peru: "🇵🇪", Venezuela: "🇻🇪", Cuba: "🇨🇺",
  Jamaica: "🇯🇲", "Trinidad and Tobago": "🇹🇹",
  Denmark2: "🇩🇰", Croatia: "🇭🇷", Serbia: "🇷🇸", Romania: "🇷🇴",
};

function flag(country: string): string {
  return COUNTRY_FLAGS[country] || "";
}

// --- Editorial builders ---

// Playoff series context for the headline. When the data source attributes the
// as-of wins to this game's winner/loser (lastGameWinnerWins/lastGameLoserWins),
// we can state lead/elimination outcomes precisely. Otherwise we fall back to a
// seed-agnostic mode that only claims unambiguous outcomes — a clinch, levelling
// the series, or forcing the decider — and stays silent on a simple lead (e.g.
// 3–2), which could mean the winner took the lead OR merely cut a deficit.
function hockeySeriesPhrase(s: SeriesStatus | undefined): string | null {
  if (!s) return null;
  const a = s.topSeedWins ?? 0;
  const b = s.bottomSeedWins ?? 0;
  if (a === 0 && b === 0) return null;
  const need = s.neededToWin ?? 4;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi >= need) return `to win the series ${hi}–${lo}`;

  // When the data source attributes the wins to this game's winner/loser, we can
  // state unambiguous outcomes that seed-agnostic counts can't: a team taking the
  // lead, or staving off elimination when the opponent was at match point.
  const wW = s.lastGameWinnerWins;
  const lW = s.lastGameLoserWins;
  if (wW != null && lW != null) {
    if (wW === lW) {
      if (wW === need - 1) return `to force Game ${need * 2 - 1}`;
      return `to level the series ${wW}–${wW}`;
    }
    if (lW === need - 1 && wW < lW) return `to stay alive in the series`;
    if (wW > lW) return `to take a ${wW}–${lW} series lead`;
    return null;
  }

  if (a === b) {
    if (a === need - 1) return `to force Game ${need * 2 - 1}`;
    return `to level the series ${a}–${a}`;
  }
  return null;
}

// Seed-agnostic series state for the detail line (never names who leads).
function hockeySeriesDetail(s: SeriesStatus | undefined): string | null {
  if (!s) return null;
  const a = s.topSeedWins ?? 0;
  const b = s.bottomSeedWins ?? 0;
  if (a === 0 && b === 0) return null;
  const need = s.neededToWin ?? 4;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const round = (s.seriesTitle || "").trim() || (s.round ? `Round ${s.round}` : "Playoffs");
  if (hi >= need) return `${round} · Series over ${hi}–${lo}`;
  if (a === b) return `${round} · Series tied ${a}–${a}`;
  return `${round} · Series ${hi}–${lo}`;
}

function hockeyEditorial(event: any, score: ScoreData, series?: SeriesStatus): Partial<DailyWrapEntry> | null {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;

  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);

  const period = (score.period || "").toUpperCase();
  const isSO = period.includes("SO") || period.includes("SHOOTOUT");
  const isOT = !isSO && (period.includes("OT") || period === "3OT" || period === "4OT");

  // Hockey voice: "blanked" for a shutout (distinct from rugby's "shut out"),
  // "cruised past" for a runaway (distinct from basketball's "dominated").
  let verb = "beat";
  if (away === 0 || home === 0) verb = "blanked";
  else if (margin === 1) verb = "edged";
  else if (margin >= 4) verb = "cruised past";

  const suffix = isSO ? " in a shootout" : isOT ? " in overtime" : "";
  const seriesPhrase = hockeySeriesPhrase(series);
  const editorial = `${winner} ${verb} ${loser} ${ws}–${ls}${suffix}${seriesPhrase ? ` ${seriesPhrase}` : ""}`;

  const seriesDetail = hockeySeriesDetail(series);
  const otTag = isSO ? " (SO)" : isOT ? " (OT)" : "";
  const detail = seriesDetail
    ? `${event.league} · ${ws}–${ls} Final${otTag} · ${seriesDetail}`
    : `${event.league} · ${ws}–${ls} Final${otTag}`;
  return { editorial, detail, winner, loser, winnerScore: ws, loserScore: ls };
}

function soccerEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;

  if (home === away) {
    // Soccer voice leans on the goals story: name a goalless stalemate, and
    // flag a high-scoring share-out, rather than a flat "draw 2–2".
    let editorial: string;
    if (home === 0) {
      editorial = `${event.homeTeam} and ${event.awayTeam} play out a goalless draw`;
    } else if (home + away >= 4) {
      editorial = `${event.homeTeam} and ${event.awayTeam} share ${home + away} goals in a ${home}–${away} draw`;
    } else {
      editorial = `${event.homeTeam} and ${event.awayTeam} draw ${home}–${away}`;
    }
    return { editorial, detail: `${event.league} · ${home}–${away} Full Time` };
  }

  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);

  // Soccer verbs: distinct from rugby/hockey. A goals-margin scale only.
  let verb = "beat";
  if (margin >= 4) verb = "thrashed";
  else if (margin === 3) verb = "swept aside";
  else if (margin === 1) verb = "edged";

  return {
    editorial: `${winner} ${verb} ${loser} ${ws}–${ls}`,
    detail: `${event.league} · ${ws}–${ls} Full Time`,
    winner, loser, winnerScore: ws, loserScore: ls,
  };
}

function basketballEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;

  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);

  let verb = "beat";
  if (margin <= 3) verb = "edged";
  else if (margin >= 20) verb = "dominated";

  return {
    editorial: `${winner} ${verb} ${loser} ${ws}–${ls}`,
    detail: `${event.league} · ${ws}–${ls} Final`,
    winner, loser, winnerScore: ws, loserScore: ls,
  };
}

function rugbyEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;

  if (home === away) {
    return {
      editorial: `${event.homeTeam} and ${event.awayTeam} draw ${home}–${away}`,
      detail: `${event.league} · ${home}–${away} Full Time`,
    };
  }

  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);

  // Rugby voice: a points-margin scale. "thumped"/"outclassed" for blowouts,
  // "shut out" reserved for a nil (distinct from hockey's "blanked"), and the
  // tightest results get the exact margin ("by a point" / "by N").
  let verb = "beat";
  if (margin >= 20) verb = "thumped";
  else if (home === 0 || away === 0) verb = "shut out";
  else if (margin >= 13) verb = "outclassed";
  else if (margin <= 5) verb = "edged";

  let editorial = `${winner} ${verb} ${loser} ${ws}–${ls}`;
  if (verb === "edged") {
    editorial += margin === 1 ? " by a point" : ` by ${margin}`;
  }

  return {
    editorial,
    detail: `${event.league} · ${ws}–${ls} Full Time`,
    winner, loser, winnerScore: ws, loserScore: ls,
  };
}

// --- SA Schools rugby score-agnostic fallback ---
// The schools score source is scrape-only and unreliable. When a tracked Paarl
// Boys' High fixture has finished but no score came through, we still surface it
// with a headline built from score-agnostic context (rivalry / venue) rather
// than dropping the game from the wrap entirely.
const SCHOOLS_FALLBACK_PRIORITY = 18;
// Grace period after a game's end before we fall back to a score-agnostic
// headline. This lets a slightly-late scraped score win over the fallback, and
// guards a little against a game that simply ran long.
const SCHOOLS_FALLBACK_GRACE_MS = 90 * 60 * 1000;

// Known schoolboy rivalries (key = both schools sorted, joined by "|").
const SCHOOLS_RIVALRIES: Record<string, string> = {
  "Paarl Boys' High|Paarl Gimnasium": "the Paarl derby",
};

function isSchoolsRugby(event: any): boolean {
  return event?.league === "SA Schools Rugby" || event?.leagueKey === "schools-rugby";
}

// A game counts as concluded once its end time (explicit, or kickoff + ~110min)
// plus an optional buffer has passed, so the wrap never previews an unplayed
// fixture. Note: hardcoded schools fixtures carry no postponed/cancelled signal,
// so a postponed game could still surface once wall-clock passes its slot.
function hasConcluded(event: any, nowMs: number, bufferMs = 0): boolean {
  const start = new Date(event.startTimeLocal).getTime();
  if (Number.isNaN(start)) return false;
  const end = event.endTimeLocal
    ? new Date(event.endTimeLocal).getTime()
    : start + 110 * 60 * 1000;
  return nowMs >= end + bufferMs;
}

function schoolsRugbyFallbackEditorial(event: any): Partial<DailyWrapEntry> | null {
  const home = (event.homeTeam || "").trim();
  const away = (event.awayTeam || "").trim();
  if (!home || !away) return null;

  const rivalry = SCHOOLS_RIVALRIES[[home, away].sort().join("|")];
  const editorial = rivalry
    ? `${home} and ${away} renewed ${rivalry}`
    : `${home} hosted ${away} in schoolboy rugby`;

  const detail = event.venue ? `${event.league} · ${event.venue}` : event.league;

  return { editorial, detail };
}

// --- Cycling grand tour (Giro etc.) ---
// The cycling feed only carries the overall (GC) leader — there is no per-stage
// winner and no "final" score status — so the wrap surfaces the race leader,
// gated on the stage having concluded rather than on isFinalScore().
const CYCLING_PRIORITY = 42;

function isCyclingGrandTour(event: any): boolean {
  return typeof event?.id === "string" && event.id.startsWith("cycling-grand-tour-");
}

// The leader scrape returns "SURNAME Firstname" (surname in all-caps). Reorder to
// "Firstname Surname" with normal casing for display.
function formatCyclistName(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length < 2) return raw.trim();
  const surname: string[] = [];
  const given: string[] = [];
  for (const t of tokens) {
    if (given.length === 0 && t === t.toUpperCase() && /[A-Z]/.test(t)) surname.push(t);
    else given.push(t);
  }
  if (surname.length === 0 || given.length === 0) return raw.trim();
  const tc = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return `${given.join(" ")} ${surname.map(tc).join(" ")}`;
}

// The GC gap arrives in varied shapes ("+1:23", "1:23", "same time", "0:00").
// Normalise to a bare "1:23" and reject anything that isn't a real time lead so
// we don't print "by same time" or "by 0:00".
function normalizeCyclingGap(raw?: string): string | null {
  const g = (raw || "").trim().replace(/^\+/, "");
  if (!g) return null;
  if (/^(s\.?t\.?|same\s*time)$/i.test(g)) return null;
  if (/^0+([:.]0+)*$/.test(g)) return null;
  if (!/\d/.test(g)) return null;
  return g;
}

function cyclingEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const leaderRaw = (score.cyclingLeader || "").trim();
  if (!leaderRaw) return null;
  const leader = formatCyclistName(leaderRaw);
  const tour = event.homeTeam || "the race";
  const f = flag(score.cyclingLeaderCountry || "");
  const team = score.cyclingLeaderTeam ? ` · ${score.cyclingLeaderTeam}` : "";
  // The final stage's GC leader is the overall champion.
  const isFinalStage = /final/i.test(event.sessionTitle || "");
  if (isFinalStage) {
    return {
      editorial: `${f ? f + " " : ""}${leader} wins the ${tour}`,
      detail: `${event.league} · General Classification${team}`,
      winner: leader,
    };
  }
  // Use the stage number from the event itself (the scraped GC number can lag).
  const m = /stage\s*(\d+)/i.exec(event.sessionTitle || "") || /stage-(\d+)/i.exec(event.id || "");
  const stage = m ? parseInt(m[1], 10) : null;
  // Cycling voice: a leaderboard story, not a head-to-head. Lead with the GC
  // margin and stage so the headline carries real standings info.
  const gap = normalizeCyclingGap(score.cyclingLeaderGap);
  const stagePart = stage ? ` after Stage ${stage}` : "";
  const gapPart = gap ? ` by ${gap}` : "";
  return {
    editorial: `${f ? f + " " : ""}${leader} leads the ${tour}${gapPart}${stagePart}`,
    detail: `${event.league} · General Classification${team}`,
    winner: leader,
  };
}

// --- HSBC SVNS (rugby sevens tournament) ---
// SVNS results live in a separate per-city World Rugby feed, not in the keyed
// live-scores map. On the tournament's final day we surface the Cup Final
// champions (men's + women's). Scoping the Cup Final to the day's event window
// ensures only the finals-day card fires (not Day 1 / Day 2).
const SVNS_PRIORITY = 78;

function isSvns(event: any): boolean {
  return event?.league === "HSBC SVNS" ||
    (typeof event?.id === "string" && event.id.startsWith("rugby-svns-"));
}

async function svnsFinalEditorial(event: any): Promise<Partial<DailyWrapEntry> | null> {
  const city = (event.homeTeam || "").replace(/^SVNS\s+/i, "").trim();
  if (!city) return null;

  let res;
  try {
    res = await fetchSvnsMatches(city);
  } catch {
    return null;
  }

  const startMs = new Date(event.startTimeLocal).getTime();
  const endMs = (event.endTimeLocal
    ? new Date(event.endTimeLocal).getTime()
    : startMs + 10 * 60 * 60 * 1000) + 2 * 60 * 60 * 1000;

  const finals = (res?.allMatches || []).filter(
    (m) => m.status === "C" && /cup final/i.test(m.phase) && m.time >= startMs && m.time <= endMs,
  );
  if (finals.length === 0) return null;

  const toFinal = (m: any): SvnsFinal => {
    const team1Win = m.team1Score >= m.team2Score;
    return {
      gender: m.gender,
      winner: team1Win ? m.team1 : m.team2,
      loser: team1Win ? m.team2 : m.team1,
      winnerScore: Math.max(m.team1Score, m.team2Score),
      loserScore: Math.min(m.team1Score, m.team2Score),
    };
  };

  const mensMatch = finals.find((m) => m.gender === "mens");
  const womensMatch = finals.find((m) => m.gender === "womens");
  const primaryMatch = mensMatch || womensMatch;
  if (!primaryMatch) return null;
  const primary = toFinal(primaryMatch);

  // Men's first, then women's, so the score card and detail line stay ordered.
  const svnsFinals: SvnsFinal[] = [];
  if (mensMatch) svnsFinals.push(toFinal(mensMatch));
  if (womensMatch) svnsFinals.push(toFinal(womensMatch));

  // Specific headline that names the beaten side and the scoreline, e.g.
  // "Australia beat South Africa 19–5 to win the Valladolid SVNS".
  const editorial =
    `${primary.winner} beat ${primary.loser} ${primary.winnerScore}–${primary.loserScore} to win the ${city} SVNS` +
    (mensMatch ? "" : " (women's)");

  const parts = svnsFinals.map(
    (f) => `${f.gender === "mens" ? "Men" : "Women"}: ${f.winner} ${f.winnerScore}–${f.loserScore} ${f.loser}`,
  );

  return {
    editorial,
    detail: `${event.league} · ${parts.join(" · ")}`,
    winner: primary.winner,
    loser: primary.loser,
    winnerScore: String(primary.winnerScore),
    loserScore: String(primary.loserScore),
    svnsFinals,
  };
}

// --- Wanda Diamond League (athletics) ---
// Athletics has no keyed live score, so concluded Diamond League meets are
// surfaced from the Swiss Timing results feed. The headline leads with the best
// South African result when one exists, otherwise the meet's most newsworthy
// outcome (world record > world lead > area/national/meeting record > marquee win).
const DIAMOND_LEAGUE_PRIORITY = 68;

function isDiamondLeague(event: any): boolean {
  return event?.leagueKey === "diamond-league" || event?.league === "Diamond League";
}

// Event ids look like "athletics-diamond-league-rabat-2026" or
// "athletics-diamond-league-brussels-final-day-1-2026"; the Swiss Timing meeting
// key is the leading city token.
function diamondLeagueMeetKey(event: any): { meeting: string; season: string } | null {
  const m = /^athletics-diamond-league-(.+)-(\d{4})$/.exec(event?.id || "");
  if (!m) return null;
  const meeting = m[1].split("-")[0];
  if (!meeting) return null;
  return { meeting, season: m[2] };
}

const RECORD_NAMES: Record<string, string> = {
  WR: "world record",
  WL: "world lead",
  AR: "area record",
  NR: "national record",
  MR: "meeting record",
  SB: "season best",
  PB: "personal best",
};

function expandRecordFlag(flag: string): string | null {
  for (const token of (flag || "").toUpperCase().replace(/=/g, "").split(",")) {
    const name = RECORD_NAMES[token.trim()];
    if (name) return name;
  }
  return null;
}

// "200m Men" -> "men's 200m"; "100m Hurdles Women" -> "women's 100m hurdles".
function formatDiscipline(name: string): string {
  let gender = "";
  let d = name;
  if (/\bMen\b/.test(name)) {
    gender = "men's";
    d = name.replace(/\s*\bMen\b/, "");
  } else if (/\bWomen\b/.test(name)) {
    gender = "women's";
    d = name.replace(/\s*\bWomen\b/, "");
  }
  d = d.trim().toLowerCase();
  return gender ? `${gender} ${d}` : d;
}

function placeWord(rank: number): string {
  if (rank === 1) return "wins";
  if (rank === 2) return "takes second in";
  if (rank === 3) return "takes third in";
  const ord =
    rank >= 11 && rank <= 13
      ? `${rank}th`
      : `${rank}${["th", "st", "nd", "rd"][rank % 10] || "th"}`;
  return `finishes ${ord} in`;
}

function saHeadline(r: DLAthleteResult, city: string): string {
  return `${r.athlete} ${placeWord(r.rank)} the ${formatDiscipline(r.discipline)} at Diamond League ${city}`;
}

function notableHeadline(r: DLAthleteResult, city: string): string {
  const disc = formatDiscipline(r.discipline);
  const sig = expandRecordFlag(r.recordFlag);
  const nat = r.nation ? ` (${r.nation})` : "";
  if (sig === "world record") {
    return `🌍 ${r.athlete}${nat} breaks the world record in the ${disc} at Diamond League ${city}`;
  }
  if (sig === "world lead") {
    return `${r.athlete}${nat} posts a world-leading ${r.performance} to win the ${disc} at Diamond League ${city}`;
  }
  if (sig) {
    return `${r.athlete}${nat} sets a ${sig} in the ${disc} at Diamond League ${city}`;
  }
  return `${r.athlete}${nat} wins the ${disc} at Diamond League ${city}`;
}

async function diamondLeagueEditorial(event: any): Promise<Partial<DailyWrapEntry> | null> {
  const key = diamondLeagueMeetKey(event);
  if (!key) return null;

  let summary;
  try {
    summary = await fetchDiamondLeagueSummary(key.meeting, key.season);
  } catch {
    return null;
  }
  if (!summary) return null;

  const city = key.meeting.charAt(0).toUpperCase() + key.meeting.slice(1);

  const sa = summary.saResults[0];
  if (sa) {
    const bits = [`Diamond League`, city, formatDiscipline(sa.discipline)];
    if (sa.performance) bits.push(sa.performance);
    const rec = expandRecordFlag(sa.recordFlag);
    if (rec) bits.push(rec);
    const moreSa = summary.saResults.length - 1;
    if (moreSa > 0) bits.push(`+${moreSa} more SA athlete${moreSa > 1 ? "s" : ""}`);
    return {
      editorial: saHeadline(sa, city),
      detail: bits.join(" · "),
      winner: sa.rank === 1 ? sa.athlete : undefined,
      athleticsResults: summary.saResults.slice(0, 6).map(toAthleticsResult),
      athleticsMeet: { city, scope: "sa" },
    };
  }

  const n = summary.notable[0];
  if (n) {
    const bits = [`Diamond League`, city, formatDiscipline(n.discipline)];
    if (n.performance) bits.push(n.performance);
    return {
      editorial: notableHeadline(n, city),
      detail: bits.join(" · "),
      winner: n.rank === 1 ? n.athlete : undefined,
      athleticsResults: summary.notable.slice(0, 5).map(toAthleticsResult),
      athleticsMeet: { city, scope: "top" },
    };
  }

  return null;
}

function toAthleticsResult(r: DLAthleteResult): AthleticsResult {
  return {
    discipline: formatDiscipline(r.discipline),
    athlete: r.athlete,
    nation: r.nation,
    rank: r.rank,
    performance: r.performance,
    record: expandRecordFlag(r.recordFlag) || undefined,
  };
}

function golfEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  if (!score.golfLeader) return null;
  const f = flag(score.golfLeaderCountry || "");
  const player = score.golfLeader;
  const sc = score.golfLeaderScore || "";
  const tournament = event.tournamentName || event.homeTeam || "the tournament";
  const verbs = ["captures", "wins", "claims", "takes"];
  const verb = verbs[player.length % verbs.length];
  const editorial = `${f ? f + " " : ""}${player} ${verb} ${tournament}${sc ? " at " + sc : ""}`;
  const thru = score.golfLeaderThru === "F" ? "Final" : (score.golfLeaderThru || "");
  const detail = `Round ${score.golfRound || 4} · ${sc}${thru ? " · " + thru : ""}`;
  return { editorial, detail, winner: player };
}

function racingEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  if (!score.racingLeader) return null;
  if (score.racingSessionType !== "Race" && score.racingSessionType !== "Sprint") return null;
  const f = flag(score.racingLeaderCountry || "");
  const driver = score.racingLeader;
  const team = score.racingLeaderTeam || "";
  const raceName = event.sessionTitle || event.homeTeam || "the Grand Prix";
  const isSprint = score.racingSessionType === "Sprint";
  const editorial = `${f ? f + " " : ""}${driver} wins${isSprint ? " the Sprint at" : ""} the ${raceName}`;
  const detail = `${isSprint ? "Sprint" : "Race"} · P1${team ? " · " + team : ""}`;
  return { editorial, detail, winner: driver };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Readable round names for grand-slam style draws.
const TENNIS_ROUND_PHRASE: Record<string, string> = {
  "Round of 128": "first round",
  "Round of 64": "second round",
  "Round of 32": "third round",
  "Round of 16": "round of 16",
  Quarterfinals: "quarterfinals",
  Semifinals: "semifinals",
  Final: "final",
};
const TENNIS_EARLY_ROUNDS = new Set(["Round of 128", "Round of 64", "Round of 32"]);

function tennisEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  if (!score.tennisWinner) return null;
  const p1 = event.tennisPlayer1 || "Player 1";
  const p2 = event.tennisPlayer2 || "Player 2";
  const winnerIsP1 = score.tennisWinner === 1;
  const winner = winnerIsP1 ? p1 : p2;
  const loser = winnerIsP1 ? p2 : p1;
  const winnerSeed: number | undefined =
    (winnerIsP1 ? event.tennisPlayer1Rank : event.tennisPlayer2Rank) ?? undefined;
  const loserSeed: number | undefined =
    (winnerIsP1 ? event.tennisPlayer2Rank : event.tennisPlayer1Rank) ?? undefined;
  const tournament = event.tournamentName || "";
  const round = event.tennisRound || "";

  const sets = score.tennisSetScores || [];
  const setStr = sets.length ? sets.map((s: any) => `${s.p1}–${s.p2}`).join(", ") : "";

  // Tally sets won by the winner so we can spot straight-sets and five-setters.
  const winnerWonSet = (s: any): boolean => {
    if (s.winner === 1) return winnerIsP1;
    if (s.winner === 2) return !winnerIsP1;
    const wGames = winnerIsP1 ? s.p1 : s.p2;
    const lGames = winnerIsP1 ? s.p2 : s.p1;
    return wGames > lGames;
  };
  let loserSets = 0;
  for (const s of sets) if (!winnerWonSet(s)) loserSets++;
  const totalSets = sets.length;
  const straightSets = totalSets > 0 && loserSets === 0;
  const fiveSetter = totalSets === 5;
  const cameBackFromTwoDown =
    fiveSetter && !winnerWonSet(sets[0]) && !winnerWonSet(sets[1]);

  // Upset = winner is the lower seed (bigger number), or unseeded over a seed.
  const isUpset =
    loserSeed !== undefined &&
    (winnerSeed === undefined || winnerSeed > loserSeed);
  const seedGap =
    loserSeed !== undefined && winnerSeed !== undefined ? winnerSeed - loserSeed : 99;
  const earlyRound = TENNIS_EARLY_ROUNDS.has(round);
  const roundPhrase = TENNIS_ROUND_PHRASE[round] || "";
  const at = tournament ? ` at ${tournament}` : "";

  let core: string;
  if (isUpset && loserSeed !== undefined) {
    const verb = winnerSeed === undefined || seedGap >= 6 ? "stuns" : "upsets";
    core = `${winner} ${verb} ${ordinal(loserSeed)} seed ${loser}`;
    if (cameBackFromTwoDown) core += " after fighting back from two sets down";
    else if (fiveSetter) core += " in a five-set epic";
    else if (straightSets) core += " in straight sets";
    else if (earlyRound && roundPhrase) core += ` in the ${roundPhrase}`;
  } else if (cameBackFromTwoDown) {
    core = `${winner} fights back from two sets down to beat ${loser}`;
  } else if (fiveSetter) {
    core = `${winner} outlasts ${loser} in a five-set marathon`;
  } else if (straightSets && winnerSeed !== undefined && winnerSeed <= 8) {
    core = `${ordinal(winnerSeed)} seed ${winner} cruises past ${loser} in straight sets`;
  } else if (straightSets) {
    core = `${winner} sees off ${loser} in straight sets`;
  } else {
    const verbs = ["beats", "defeats", "gets past"];
    const verb = verbs[winner.length % verbs.length];
    core = `${winner} ${verb} ${loser}`;
  }

  const editorial = `${core}${at}`;
  const detail = `${round ? round + " · " : ""}${setStr || "Tennis"}`;
  return { editorial, detail, winner };
}

// CricAPI result text comes through loosely formatted, e.g.
// "Royal Challengers Bengaluru Won by 5  Wickets (Winners)". Tidy the casing of
// the connector words, drop the trailing "(Winners)" tag, and collapse spaces.
function cleanCricketResult(s: string): string {
  return s
    .replace(/\s*\(winners?\)\s*/i, " ")
    .replace(/\b(Won|Beat|Tied|Drawn|Wickets?|Runs?)\b/g, (m) => m.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

// Turn a knockout stage into a dramatic, accurate headline. The competition
// label is the full series name when available (e.g. "IPL 2026").
function knockoutCricketHeadline(winner: string, round: string, comp: string): string {
  switch (round) {
    case "Final":
      return `${winner} are the ${comp} champions`;
    case "Qualifier 1":
      return `${winner} storm into the ${comp} final`;
    case "Qualifier 2":
      return `${winner} book their place in the ${comp} final`;
    case "Eliminator":
      return `${winner} survive the ${comp} Eliminator`;
    default:
      return `${winner} win the ${comp} ${round}`;
  }
}

function cricketEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  // CricAPI result rows carry the human-readable outcome in `period`
  // (e.g. "Royal Challengers Bengaluru won by 5 wickets") rather than numeric
  // scores, with the innings totals in cricketHome/cricketAway.
  const resultText = cleanCricketResult((score.period || "").trim());
  const hasResult = !!resultText && !/^final$/i.test(resultText);
  const scoreLine = [score.cricketHome, score.cricketAway].filter(Boolean).join(" · ");
  if (!hasResult && !scoreLine) return null;

  // Identify the winner (for highlight matching) when the result text names a team.
  let winner: string | undefined;
  const rt = resultText.toLowerCase();
  if (rt && rt.includes((event.homeTeam || "").toLowerCase())) winner = event.homeTeam;
  else if (rt && rt.includes((event.awayTeam || "").toLowerCase())) winner = event.awayTeam;

  // Knockout fixtures (IPL playoffs) carry a `roundName`. Lead with a punchy
  // stage-aware headline so the wrap reads like a result, not just a scoreline.
  const round = (event.roundName || "").trim();
  const comp = (event.seriesName || event.league || "IPL").trim();

  let editorial: string;
  if (round && winner) {
    editorial = knockoutCricketHeadline(winner, round, comp);
  } else if (round) {
    editorial = `${comp} ${round}: ${event.homeTeam} vs ${event.awayTeam}`;
  } else {
    editorial = hasResult ? resultText : `${event.homeTeam} vs ${event.awayTeam}`;
  }

  const detailLabel = round ? `${comp} ${round}` : event.league;
  const detail = scoreLine ? `${detailLabel} · ${scoreLine}` : detailLabel;
  return { editorial, detail, winner };
}

function buildEditorial(event: any, score: ScoreData, series?: SeriesStatus): Partial<DailyWrapEntry> | null {
  const sport = (event.sport || "").toLowerCase();
  switch (sport) {
    case "hockey":    return hockeyEditorial(event, score, series);
    case "soccer":    return soccerEditorial(event, score);
    case "basketball":return basketballEditorial(event, score);
    case "rugby":     return rugbyEditorial(event, score);
    case "racing":    return racingEditorial(event, score);
    case "golf":      return golfEditorial(event, score);
    case "tennis":    return tennisEditorial(event, score);
    case "cricket":   return cricketEditorial(event, score);
    default:          return null;
  }
}

const GENERATED_EVENTS_PATH = path.resolve(process.cwd(), "data", "generatedEvents.json");

export async function fetchDailyWrap(tz: number): Promise<DailyWrapResponse> {
  const dateLabel = formatDate(tz);
  const { start, end } = getTodayBounds(tz);

  let allEvents: any[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(GENERATED_EVENTS_PATH, "utf-8"));
    allEvents = raw.events || [];
  } catch {
    return { date: dateLabel, hasResults: false, results: [] };
  }

  const todayEvents = allEvents.filter((e: any) => {
    const s = new Date(e.startTimeLocal);
    return s >= start && s <= end;
  });

  if (todayEvents.length === 0) {
    return { date: dateLabel, hasResults: false, results: [] };
  }

  let scores: Record<string, ScoreData> = {};
  let seriesStatuses: Record<string, SeriesStatus> = {};
  try {
    const sr = await fetchAllLiveScores();
    scores = sr.scores;
    seriesStatuses = sr.seriesStatuses || {};
  } catch {}

  const results: DailyWrapEntry[] = [];
  const nowMs = Date.now();
  // Score-agnostic fallback cards have no real result, so we skip highlight
  // enrichment for them to avoid attaching a mismatched clip.
  const fallbackIds = new Set<string>();

  // The cycling feed only exposes the live overall (GC) leader, which would
  // attach to every stage event in the window. Keep just the latest concluded
  // stage per tour so a grand tour contributes a single wrap card.
  const cyclingLatestByTour: Record<string, any> = {};
  for (const e of todayEvents) {
    if (!isCyclingGrandTour(e)) continue;
    const key = e.homeTeam || e.id;
    const cur = cyclingLatestByTour[key];
    if (!cur || new Date(e.startTimeLocal) > new Date(cur.startTimeLocal)) {
      cyclingLatestByTour[key] = e;
    }
  }
  const cyclingKeepIds = new Set<string>(
    Object.values(cyclingLatestByTour).map((e: any) => e.id),
  );

  // A Diamond League meet can span multiple events (e.g. Brussels final day 1 &
  // day 2), but the Swiss Timing feed returns a single combined results file per
  // meeting. Keep only the latest concluded event per meeting so the meet
  // contributes a single wrap card instead of duplicate storylines.
  const diamondLeagueLatestByMeet: Record<string, any> = {};
  for (const e of todayEvents) {
    if (!isDiamondLeague(e)) continue;
    // Only concluded events are candidates: for a multi-day meet whose later day
    // hasn't finished yet, the earlier concluded day must still surface a card.
    if (!hasConcluded(e, nowMs)) continue;
    const k = diamondLeagueMeetKey(e);
    const key = k ? `${k.season}/${k.meeting}` : e.id;
    const cur = diamondLeagueLatestByMeet[key];
    if (!cur || new Date(e.startTimeLocal) > new Date(cur.startTimeLocal)) {
      diamondLeagueLatestByMeet[key] = e;
    }
  }
  const diamondLeagueKeepIds = new Set<string>(
    Object.values(diamondLeagueLatestByMeet).map((e: any) => e.id),
  );

  for (const event of todayEvents) {
    const score = scores[event.id];
    if (!score || !isFinalScore(score)) {
      // SA Schools rugby uses an unreliable scrape-only score source. When a
      // tracked game has finished but no score came through, still surface it
      // with a score-agnostic (rivalry / venue) headline so it isn't dropped.
      if (isSchoolsRugby(event) && hasConcluded(event, nowMs, SCHOOLS_FALLBACK_GRACE_MS)) {
        const fb = schoolsRugbyFallbackEditorial(event);
        if (fb) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: fb.editorial || "",
            detail: fb.detail || "",
            priorityScore: SCHOOLS_FALLBACK_PRIORITY,
            startTimeLocal: event.startTimeLocal,
          });
        }
      } else if (isCyclingGrandTour(event) && cyclingKeepIds.has(event.id) && score?.cyclingLeader && hasConcluded(event, nowMs)) {
        const ce = cyclingEditorial(event, score);
        if (ce) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: ce.editorial || "",
            detail: ce.detail || "",
            winner: ce.winner,
            priorityScore: CYCLING_PRIORITY,
            startTimeLocal: event.startTimeLocal,
          });
        }
      } else if (isDiamondLeague(event) && diamondLeagueKeepIds.has(event.id) && hasConcluded(event, nowMs)) {
        const de = await diamondLeagueEditorial(event);
        if (de) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: de.editorial || "",
            detail: de.detail || "",
            winner: de.winner,
            athleticsResults: de.athleticsResults,
            athleticsMeet: de.athleticsMeet,
            priorityScore: DIAMOND_LEAGUE_PRIORITY,
            startTimeLocal: event.startTimeLocal,
          });
        }
      } else if (isSvns(event) && hasConcluded(event, nowMs)) {
        const se = await svnsFinalEditorial(event);
        if (se) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: se.editorial || "",
            detail: se.detail || "",
            winner: se.winner,
            loser: se.loser,
            winnerScore: se.winnerScore,
            loserScore: se.loserScore,
            svnsFinals: se.svnsFinals,
            priorityScore: SVNS_PRIORITY,
            startTimeLocal: event.startTimeLocal,
          });
        }
      }
      continue;
    }

    // Skip non-Race/Sprint F1 sessions from the wrap
    if (event.sport?.toLowerCase() === "racing" &&
        score.racingSessionType &&
        score.racingSessionType !== "Race" &&
        score.racingSessionType !== "Sprint") continue;

    const editorial = buildEditorial(event, score, seriesStatuses[event.id]);
    if (!editorial) continue;

    const priority = getPriorityScore(event.sport, event.league, score);

    results.push({
      eventId: event.id,
      sport: event.sport,
      league: event.league,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      editorial: editorial.editorial || "",
      detail: editorial.detail || "",
      winner: editorial.winner,
      loser: editorial.loser,
      winnerScore: editorial.winnerScore,
      loserScore: editorial.loserScore,
      scoreSnapshot: score,
      priorityScore: priority,
      startTimeLocal: event.startTimeLocal,
    });
  }

  results.sort((a, b) => b.priorityScore - a.priorityScore);

  // enrichWithHighlights mutates entries in place, so enriching only the
  // non-fallback subset still updates the shared objects kept in `results`.
  await enrichWithHighlights(results.filter((r) => !fallbackIds.has(r.eventId)));

  return { date: dateLabel, hasResults: results.length > 0, results };
}
