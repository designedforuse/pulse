import * as fs from "fs";
import * as path from "path";
import { fetchAllLiveScores } from "./liveScores";
import type { ScoreData } from "./liveScores";

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
  priorityScore: number;
  startTimeLocal: string;
}

export interface DailyWrapResponse {
  date: string;
  hasResults: boolean;
  results: DailyWrapEntry[];
}

// tz = getTimezoneOffset() from client (minutes, positive = west, e.g. 300 for EST)
function getTodayBounds(tz: number): { start: Date; end: Date } {
  const utcNow = Date.now();
  const localNowMs = utcNow - tz * 60000;
  const localMidnightMs = Math.floor(localNowMs / 86400000) * 86400000;
  const utcStartMs = localMidnightMs + tz * 60000;
  const utcEndMs = utcStartMs + 86400000 - 1;
  return { start: new Date(utcStartMs), end: new Date(utcEndMs) };
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

  for (const event of todayEvents) {
    const score = scores[event.id];
    if (!score || !isFinalScore(score)) continue;

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
      priorityScore: priority,
      startTimeLocal: event.startTimeLocal,
    });
  }

  results.sort((a, b) => b.priorityScore - a.priorityScore);

  return { date: dateLabel, hasResults: results.length > 0, results };
}
