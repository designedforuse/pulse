import * as fs from "fs";
import * as path from "path";
import { fetchAllLiveScores } from "./liveScores";
import type { ScoreData } from "./liveScores";
import { enrichWithHighlights, type HighlightVideo } from "./dailyWrapHighlights";
import { fetchSvnsMatches } from "./svnsMatches";

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

function hockeyEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
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

  let verb = "beat";
  if (away === 0 || home === 0) verb = "shut out";
  else if (margin === 1) verb = "edged";
  else if (margin >= 4) verb = "dominated";

  const suffix = isSO ? " in a shootout" : isOT ? " in overtime" : "";
  const editorial = `${winner} ${verb} ${loser} ${ws}–${ls}${suffix}`;
  const detail = `${event.league} · ${ws}–${ls} Final${isSO ? " (SO)" : isOT ? " (OT)" : ""}`;
  return { editorial, detail, winner, loser, winnerScore: ws, loserScore: ls };
}

function soccerEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;

  if (home === away) {
    const editorial = `${event.homeTeam} and ${event.awayTeam} draw ${home}–${away}`;
    return { editorial, detail: `${event.league} · ${home}–${away} Full Time` };
  }

  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);

  let verb = "beat";
  if (away === 0 || home === 0) verb = "kept a clean sheet against";
  else if (margin === 1) verb = "edged";
  else if (margin >= 3) verb = "hammered";

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

  let verb = "beat";
  if (margin <= 5) verb = "edged";
  else if (margin >= 20) verb = "dominated";
  else if (home === 0 || away === 0) verb = "shut out";

  return {
    editorial: `${winner} ${verb} ${loser} ${ws}–${ls}`,
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
  return {
    editorial: `${f ? f + " " : ""}${leader} leads the ${tour}`,
    detail: `${event.league}${stage ? ` · After Stage ${stage}` : ""}${team}`,
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

  const champ = (m: any) => (m.team1Score >= m.team2Score ? m.team1 : m.team2);
  const scoreLine = (m: any) =>
    `${Math.max(m.team1Score, m.team2Score)}–${Math.min(m.team1Score, m.team2Score)}`;

  const mens = finals.find((m) => m.gender === "mens");
  const womens = finals.find((m) => m.gender === "womens");
  const primary = mens || womens;
  if (!primary) return null;

  const editorial = mens
    ? `${champ(mens)} win the ${city} SVNS`
    : `${champ(womens!)} win the ${city} SVNS (women's)`;

  const parts: string[] = [];
  if (mens) parts.push(`Men: ${champ(mens)} ${scoreLine(mens)}`);
  if (womens) parts.push(`Women: ${champ(womens)} ${scoreLine(womens)}`);

  return { editorial, detail: `${event.league} · ${parts.join(" · ")}`, winner: champ(primary) };
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

function tennisEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  if (!score.tennisWinner) return null;
  const p1 = event.tennisPlayer1 || "Player 1";
  const p2 = event.tennisPlayer2 || "Player 2";
  const p1f = flag(event.tennisPlayer1Flag || "");
  const p2f = flag(event.tennisPlayer2Flag || "");
  const winner = score.tennisWinner === 1 ? p1 : p2;
  const loser = score.tennisWinner === 1 ? p2 : p1;
  const winnerFlag = score.tennisWinner === 1 ? p1f : p2f;
  const tournament = event.tournamentName || "the tournament";
  const round = event.tennisRound || "";
  const setStr = score.tennisSetScores
    ? score.tennisSetScores.map((s: any) => `${s.p1}–${s.p2}`).join(", ")
    : "";
  const verbs = ["beats", "defeats", "wins over"];
  const verb = verbs[winner.length % verbs.length];
  const editorial = `${winnerFlag ? winnerFlag + " " : ""}${winner} ${verb} ${loser} at ${tournament}`;
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

function buildEditorial(event: any, score: ScoreData): Partial<DailyWrapEntry> | null {
  const sport = (event.sport || "").toLowerCase();
  switch (sport) {
    case "hockey":    return hockeyEditorial(event, score);
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
  try {
    const sr = await fetchAllLiveScores();
    scores = sr.scores;
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

    const editorial = buildEditorial(event, score);
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
