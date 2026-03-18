import type { SportEvent, Favorites } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { getEventEnd, isEventLive } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import { computeFeaturedScore, isNowInAnyRitualWindow, type FeaturedScore } from "@/lib/rituals";
import { computeHockeyChaosScore, type ChaosScoreResult } from "@/lib/chaos-score";
import { computeActivityScore, getPromotionReason, type ActivityScore } from "@/lib/activity-score";

const CHAOS_WINDOW_MS = 90 * 60 * 1000;
const CHAOS_DEBUG = __DEV__;

const FOCUS_SPORTS = new Set(["rugby", "cricket", "hockey", "soccer", "basketball", "racing"]);

const SPORT_PRIORITY: Record<string, number> = { rugby: 4, cricket: 3, hockey: 2, racing: 2, basketball: 2, soccer: 1 };

function getSportPriority(sport: string): number {
  return SPORT_PRIORITY[sport] ?? 0;
}

function isAtBreak(event: SportEvent, getScoreData?: (id: string) => ScoreData | undefined): boolean {
  const score = getScoreData?.(event.id);
  if (!score) return false;

  if (score.inIntermission) return true;

  const period = (score.period || "").toLowerCase().trim();
  const status = (score.status || "").toLowerCase().trim();

  // Halftime, period intervals, intermission, break patterns
  const breakRe = /^(ht|half[\s-]?time|halftime|intermission|int|break)$|^\d(st|nd|rd|th)\s*(int|intermission)|period\s*(int|break)/i;
  if (breakRe.test(period) || breakRe.test(status)) return true;

  // Generic lone "INT" token (e.g. "P1 INT")
  if (/\bint\b/.test(period) || /\bint\b/.test(status)) return true;

  return false;
}

export function getEmotionRank(event: SportEvent, favorites: Favorites): number {
  if (favoriteInvolved(event, favorites)) return 3;
  const league = (event.league || "").toLowerCase();
  const favLeagues = new Set<string>();
  for (const sportFavs of Object.values(favorites)) {
    if (sportFavs && typeof sportFavs === "object") {
      for (const leagueName of Object.keys(sportFavs)) {
        favLeagues.add(leagueName.toLowerCase());
      }
    }
  }
  if (favLeagues.has(league)) return 2;
  if (FOCUS_SPORTS.has(event.sport)) return 1;
  return 0;
}

export function getTensionRank(
  event: SportEvent,
  isLive: boolean,
  getScoreData?: (id: string) => ScoreData | undefined,
): number {
  if (!isLive) return 0;

  const score = getScoreData?.(event.id);
  if (!score) return 1;

  let rank = 1;
  const diff = Math.abs(score.homeScore - score.awayScore);
  const sport = event.sport.toLowerCase();

  if (sport === "hockey" || sport === "soccer") {
    if (diff <= 1) rank = 3;
    else if (diff <= 2) rank = 2;
  } else if (sport === "rugby") {
    if (diff <= 7) rank = 3;
    else if (diff <= 14) rank = 2;
  } else if (sport === "cricket") {
    rank = 1;
  } else if (sport === "racing") {
    const sessionTitle = (event.sessionTitle || event.awayTeam || "").toLowerCase();
    if (/\brace\b/.test(sessionTitle)) rank = 3;
    else if (/\bsprint\b/.test(sessionTitle)) rank = 2;
    else if (/\bqualifying\b/.test(sessionTitle)) rank = 2;
    else rank = 1;
  } else {
    if (diff <= 1) rank = 3;
    else if (diff <= 2) rank = 2;
  }

  const status = (score.status || "").toLowerCase();
  const period = (score.period || "").toLowerCase();
  const isOT = status.includes("ot") || status.includes("overtime") || status.includes("extra")
    || status.includes("shootout") || status.includes("penalty")
    || period.includes("ot") || period.includes("overtime") || period.includes("extra")
    || period.includes("shootout") || period.includes("penalty");
  if (isOT) rank = Math.min(rank + 2, 5);

  return rank;
}

const F1_SESSION_PRIORITY: Record<string, number> = {
  race: 80,
  sprint: 40,
  qualifying: 15,
  "sprint qualifying": 10,
  "sprint shootout": 10,
};

export interface RacingChaosScoreResult {
  total: number;
  sessionScore: number;
  situationBoosts: number;
  favoritesBoost: number;
  reasons: string[];
}

export function getF1SessionType(event: SportEvent): string {
  const title = (event.sessionTitle || event.awayTeam || "").toLowerCase().trim();
  if (/\brace\b/.test(title)) return "race";
  if (/\bsprint qualifying\b/.test(title) || /\bsprint shootout\b/.test(title)) return "sprint qualifying";
  if (/\bsprint\b/.test(title)) return "sprint";
  if (/\bqualifying\b/.test(title)) return "qualifying";
  if (/\bpractice\b/.test(title) || /\bfp\d/i.test(title)) return "practice";
  return title;
}

function isF1ChaosEligible(sessionType: string): boolean {
  return sessionType === "race" || sessionType === "sprint" || sessionType === "qualifying";
}

export function computeRacingChaosScore(
  event: SportEvent,
  scoreData: ScoreData | undefined,
  favorites: Favorites,
): RacingChaosScoreResult {
  const reasons: string[] = [];
  const sessionType = getF1SessionType(event);
  const sessionScore = F1_SESSION_PRIORITY[sessionType] ?? 0;

  if (!isF1ChaosEligible(sessionType)) {
    return { total: 0, sessionScore: 0, situationBoosts: 0, favoritesBoost: 0, reasons: [`${sessionType || "Unknown"} session — not eligible for Chaos Mode`] };
  }

  reasons.push(`${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} session`);

  let situationBoosts = 0;

  if (scoreData) {
    const status = (scoreData.racingStatus || "").toLowerCase();
    if (status.includes("red flag")) {
      situationBoosts += 25;
      reasons.push("Red Flag");
    } else if (status.includes("safety car") || status === "sc") {
      situationBoosts += 15;
      reasons.push("Safety Car");
    } else if (status.includes("vsc")) {
      situationBoosts += 10;
      reasons.push("Virtual Safety Car");
    }

    if (scoreData.racingLapNum != null && scoreData.racingTotalLaps != null && scoreData.racingTotalLaps > 0) {
      const progress = scoreData.racingLapNum / scoreData.racingTotalLaps;
      if (progress >= 0.85) {
        situationBoosts += 20;
        reasons.push("Final laps");
      } else if (progress >= 0.65) {
        situationBoosts += 10;
        reasons.push("Late race");
      }
    }
  }

  let favoritesBoost = 0;
  if (favoriteInvolved(event, favorites)) {
    favoritesBoost = 8;
    reasons.push("Favorite team/driver");
  }

  const total = sessionScore + situationBoosts + favoritesBoost;
  return { total, sessionScore, situationBoosts, favoritesBoost, reasons };
}

const TERMINAL_STATUSES = [
  "final", "ft", "ended", "full time", "completed",
  "f/ot", "f/so", "game over", "post", "finished",
];

function isTerminalEvent(
  event: SportEvent,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
): boolean {
  const status = getScoreStatus?.(event.id);
  if (status) {
    const lower = status.trim().toLowerCase();
    if (TERMINAL_STATUSES.some((t) => lower === t || lower.startsWith(t))) return true;
  }
  const end = getEventEnd(event);
  const scoreLive = status?.trim().toLowerCase() === "live";
  if (now > end && !scoreLive) return true;
  return false;
}

const ANCHOR_TEAMS = [
  { team: "anaheim ducks", sport: "hockey", league: "NHL" },
  { team: "san diego gulls", sport: "hockey", league: "AHL" },
];

const ANCHOR_ALIASES: Record<string, string[]> = {
  "anaheim ducks": ["ducks", "anaheim"],
  "san diego gulls": ["gulls", "sd gulls"],
};

function normalizeTeam(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isAnchorTeam(event: SportEvent): boolean {
  const home = normalizeTeam(event.homeTeam);
  const away = normalizeTeam(event.awayTeam);
  for (const anchor of ANCHOR_TEAMS) {
    const names = [anchor.team, ...(ANCHOR_ALIASES[anchor.team] || [])];
    for (const name of names) {
      if (home === name || away === name || home.includes(name) || away.includes(name)) {
        return true;
      }
    }
  }
  return false;
}

export interface ChaosCandidate {
  event: SportEvent;
  score: FeaturedScore;
  isFavorite: boolean;
  isLive: boolean;
  isAnchor: boolean;
  isBackfill: boolean;
  emotionRank: number;
  tensionRank: number;
  hockeyChaosScore?: ChaosScoreResult;
  racingChaosScore?: RacingChaosScoreResult;
}

function getCandidatePool(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
  getScoreData?: (id: string) => ScoreData | undefined,
): ChaosCandidate[] {
  const windowEnd = new Date(now.getTime() + CHAOS_WINDOW_MS);

  const candidates: ChaosCandidate[] = [];

  for (const event of allEvents) {
    const start = new Date(event.startTimeLocal);
    const end = getEventEnd(event);

    const overlaps = start < windowEnd && end > now;
    const scoreLive = getScoreStatus?.(event.id) === "live";

    if (!overlaps && !scoreLive) continue;
    if (isTerminalEvent(event, now, getScoreStatus)) continue;

    const live = isEventLive(event, now) || scoreLive;
    const isFav = favoriteInvolved(event, favorites);
    const score = computeFeaturedScore(event, favorites, now);
    const anchor = isAnchorTeam(event);
    const emotion = getEmotionRank(event, favorites);
    const tension = getTensionRank(event, live, getScoreData);

    let hockeyChaosScore: ChaosScoreResult | undefined;
    if (event.sport === "hockey" && live) {
      const scoreData = getScoreData?.(event.id);
      hockeyChaosScore = computeHockeyChaosScore(event, scoreData, favorites, now);
    }

    let racingChaosScore: RacingChaosScoreResult | undefined;
    if (event.sport === "racing" && live) {
      const scoreData = getScoreData?.(event.id);
      racingChaosScore = computeRacingChaosScore(event, scoreData, favorites);
    }

    candidates.push({ event, score, isFavorite: isFav, isLive: live, isAnchor: anchor, isBackfill: false, emotionRank: emotion, tensionRank: tension, hockeyChaosScore, racingChaosScore });
  }

  return candidates;
}

function getTodayBoundsPT(now: Date): { todayStart: Date; todayEnd: Date } {
  const ptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = ptFormatter.formatToParts(now);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;

  const pstMidnight = new Date(`${y}-${m}-${d}T00:00:00-08:00`);
  const pdtMidnight = new Date(`${y}-${m}-${d}T00:00:00-07:00`);
  const pstHour = Number(pstMidnight.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }));
  const todayStart = pstHour === 0 ? pstMidnight : pdtMidnight;
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart, todayEnd };
}

function getBackfillCandidates(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  usedIds: Set<string>,
): ChaosCandidate[] {
  const { todayEnd } = getTodayBoundsPT(now);

  const candidates: ChaosCandidate[] = [];

  for (const event of allEvents) {
    if (usedIds.has(event.id)) continue;
    const start = new Date(event.startTimeLocal);
    if (start <= now) continue;
    if (start > todayEnd) continue;

    const isFav = favoriteInvolved(event, favorites);
    const score = computeFeaturedScore(event, favorites, now);

    candidates.push({
      event,
      score,
      isFavorite: isFav,
      isLive: false,
      isAnchor: isAnchorTeam(event),
      isBackfill: true,
      emotionRank: getEmotionRank(event, favorites),
      tensionRank: 0,
    });
  }

  candidates.sort((a, b) => {
    const aFav = a.isFavorite ? 0 : 1;
    const bFav = b.isFavorite ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;

    if (a.score.sportRank !== b.score.sportRank) return a.score.sportRank - b.score.sportRank;
    if (a.score.ladderRank !== b.score.ladderRank) return a.score.ladderRank - b.score.ladderRank;

    const aStart = new Date(a.event.startTimeLocal).getTime();
    const bStart = new Date(b.event.startTimeLocal).getTime();
    return aStart - bStart;
  });

  return candidates;
}

function chaosSort(a: ChaosCandidate, b: ChaosCandidate, ritualMode: boolean): number {
  const aLive = a.isLive ? 0 : 1;
  const bLive = b.isLive ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  const aHCS = a.hockeyChaosScore?.total ?? 0;
  const bHCS = b.hockeyChaosScore?.total ?? 0;
  const bothHockey = a.event.sport === "hockey" && b.event.sport === "hockey" && aHCS > 0 && bHCS > 0;

  if (bothHockey) {
    if (Math.abs(bHCS - aHCS) > 3) return bHCS - aHCS;
    const aStatus = a.hockeyChaosScore?.statusScore ?? 0;
    const bStatus = b.hockeyChaosScore?.statusScore ?? 0;
    if (aStatus !== bStatus) return bStatus - aStatus;
    const aDiff = a.hockeyChaosScore?.closenessScore ?? 0;
    const bDiff = b.hockeyChaosScore?.closenessScore ?? 0;
    if (aDiff !== bDiff) return bDiff - aDiff;
    const aTP = a.hockeyChaosScore?.timePressure ?? 0;
    const bTP = b.hockeyChaosScore?.timePressure ?? 0;
    if (aTP !== bTP) return bTP - aTP;
    if (a.hockeyChaosScore!.situationBoosts !== b.hockeyChaosScore!.situationBoosts) {
      return b.hockeyChaosScore!.situationBoosts - a.hockeyChaosScore!.situationBoosts;
    }
    return b.hockeyChaosScore!.favoritesBoost - a.hockeyChaosScore!.favoritesBoost;
  }

  if (a.event.sport === "hockey" && a.hockeyChaosScore && a.hockeyChaosScore.total > 0 && b.event.sport !== "hockey") {
    return -1;
  }
  if (b.event.sport === "hockey" && b.hockeyChaosScore && b.hockeyChaosScore.total > 0 && a.event.sport !== "hockey") {
    return 1;
  }

  const aRCS = a.racingChaosScore?.total ?? 0;
  const bRCS = b.racingChaosScore?.total ?? 0;
  const bothRacing = a.event.sport === "racing" && b.event.sport === "racing" && aRCS > 0 && bRCS > 0;
  if (bothRacing) {
    if (bRCS !== aRCS) return bRCS - aRCS;
  }
  if (a.event.sport === "racing" && aRCS >= 40 && b.event.sport !== "racing" && b.event.sport !== "hockey") {
    return -1;
  }
  if (b.event.sport === "racing" && bRCS >= 40 && a.event.sport !== "racing" && a.event.sport !== "hockey") {
    return 1;
  }

  if (b.emotionRank !== a.emotionRank) return b.emotionRank - a.emotionRank;

  if (ritualMode) {
    const aSP = getSportPriority(a.event.sport);
    const bSP = getSportPriority(b.event.sport);
    if (bSP !== aSP) return bSP - aSP;

    if (b.tensionRank !== a.tensionRank) return b.tensionRank - a.tensionRank;
  } else {
    if (b.tensionRank !== a.tensionRank) return b.tensionRank - a.tensionRank;

    const aSP = getSportPriority(a.event.sport);
    const bSP = getSportPriority(b.event.sport);
    if (bSP !== aSP) return bSP - aSP;
  }

  const aStart = new Date(a.score.startTime).getTime();
  const bStart = new Date(b.score.startTime).getTime();
  if (aStart !== bStart) return aStart - bStart;

  return a.score.id < b.score.id ? -1 : a.score.id > b.score.id ? 1 : 0;
}

function anchorSort(a: ChaosCandidate, b: ChaosCandidate): number {
  const aLive = a.isLive ? 0 : 1;
  const bLive = b.isLive ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  const aStart = new Date(a.event.startTimeLocal).getTime();
  const bStart = new Date(b.event.startTimeLocal).getTime();
  return aStart - bStart;
}

export interface ChaosSetup {
  primary: SportEvent | null;
  secondary: SportEvent[];
  generatedAt: number;
  candidateCount: number;
  debug?: ChaosDebug;
  promotedEventId?: string;
  promotionReason?: string;
  promotedAt?: number;
  originalSlot4?: SportEvent;
  slot4ActivityScore?: number;
  slot4ActivitySignals?: string[];
}

const PROMOTION_THRESHOLD = 15;

export interface ChaosDebug {
  anchorFound: boolean;
  anchorIds: string[];
  liveCount: number;
  soonCount: number;
  backfillCount: number;
  selectedIds: string[];
  ritualMode: boolean;
  activeRitualId: string | null;
  selectedRanks?: {
    id: string;
    emotion: number;
    tension: number;
    sportPri: number;
    isLive: boolean;
    isFav: boolean;
    isAnchor: boolean;
    isBackfill: boolean;
    hockeyChaosTotal?: number;
    hockeyChaosReasons?: string[];
    racingChaosTotal?: number;
    racingChaosReasons?: string[];
    racingSessionType?: string;
  }[];
}

export function buildChaosSetup(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
  getScoreData?: (id: string) => ScoreData | undefined,
): ChaosSetup {
  const { inRitual, ritualId } = isNowInAnyRitualWindow(now);
  const pool = getCandidatePool(allEvents, favorites, now, getScoreStatus, getScoreData);

  const selected: ChaosCandidate[] = [];
  const usedIds = new Set<string>();

  const livePool = pool.filter((c) => c.isLive);
  const liveCount = livePool.length;
  const soonCount = pool.length - liveCount;
  const hasLive = liveCount > 0;

  const selectionPool = hasLive ? livePool : pool;

  const anchors = selectionPool.filter((c) => c.isAnchor).sort(anchorSort);
  for (const anchor of anchors) {
    if (selected.length >= 4) break;
    selected.push(anchor);
    usedIds.add(anchor.event.id);
  }

  const nonAnchors = selectionPool.filter((c) => !usedIds.has(c.event.id));
  nonAnchors.sort((a, b) => chaosSort(a, b, inRitual));

  if (selected.length < 4) {
    const hasAnchorsOrFavs = selected.some((c) => c.isFavorite);
    if (!hasAnchorsOrFavs) {
      const favCandidate = nonAnchors.find((c) => c.isFavorite);
      if (favCandidate) {
        selected.push(favCandidate);
        usedIds.add(favCandidate.event.id);
      }
    }
  }

  if (selected.length < 4) {
    const usedSports = new Set(selected.map((c) => c.event.sport));
    const remaining = nonAnchors.filter((c) => !usedIds.has(c.event.id));

    while (selected.length < 4 && remaining.length > 0) {
      remaining.sort((a, b) => {
        const aSportNew = usedSports.has(a.event.sport) ? 1 : 0;
        const bSportNew = usedSports.has(b.event.sport) ? 1 : 0;
        if (aSportNew !== bSportNew) return aSportNew - bSportNew;
        return chaosSort(a, b, inRitual);
      });
      const pick = remaining.shift()!;
      selected.push(pick);
      usedIds.add(pick.event.id);
      usedSports.add(pick.event.sport);
    }
  }

  if (selected.length < 4) {
    for (const candidate of nonAnchors) {
      if (selected.length >= 4) break;
      if (usedIds.has(candidate.event.id)) continue;
      selected.push(candidate);
      usedIds.add(candidate.event.id);
    }
  }

  let backfillCount = 0;

  if (selected.length < 4 && !hasLive) {
    const backfill = getBackfillCandidates(allEvents, favorites, now, usedIds);
    for (const candidate of backfill) {
      if (selected.length >= 4) break;
      selected.push(candidate);
      usedIds.add(candidate.event.id);
      backfillCount++;
    }
  }

  if (selected.length === 0) {
    const nextUp = getNextUpCandidate(allEvents, favorites, now);
    if (nextUp) {
      const score = computeFeaturedScore(nextUp, favorites, now);
      selected.push({
        event: nextUp,
        score,
        isFavorite: favoriteInvolved(nextUp, favorites),
        isLive: false,
        isAnchor: isAnchorTeam(nextUp),
        isBackfill: true,
        emotionRank: getEmotionRank(nextUp, favorites),
        tensionRank: 0,
      });
      backfillCount++;
    }
  }

  selected.sort((a, b) => chaosSort(a, b, inRitual));

  const debug: ChaosDebug = {
    anchorFound: anchors.length > 0,
    anchorIds: anchors.map((a) => a.event.id),
    liveCount,
    soonCount,
    backfillCount,
    selectedIds: selected.map((c) => c.event.id),
    ritualMode: inRitual,
    activeRitualId: ritualId,
    selectedRanks: selected.map((c) => ({
      id: c.event.id,
      emotion: c.emotionRank,
      tension: c.tensionRank,
      sportPri: getSportPriority(c.event.sport),
      isLive: c.isLive,
      isFav: c.isFavorite,
      isAnchor: c.isAnchor,
      isBackfill: c.isBackfill,
      hockeyChaosTotal: c.hockeyChaosScore?.total,
      hockeyChaosReasons: c.hockeyChaosScore?.reasons,
      racingChaosTotal: c.racingChaosScore?.total,
      racingChaosReasons: c.racingChaosScore?.reasons,
      racingSessionType: c.event.sport === "racing" ? getF1SessionType(c.event) : undefined,
    })),
  };

  if (CHAOS_DEBUG) {
    const fmtPT = (d: Date) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    console.log(
      `[CHAOS] mode=${inRitual ? "RITUAL" : "FREE"}${ritualId ? ` (${ritualId})` : ""} | nowPT=${fmtPT(now)} | pool=${pool.length} selectionPool=${selectionPool.length}(${hasLive ? "LIVE-ONLY" : "all"}) anchors=${anchors.length} live=${liveCount} soon=${soonCount} backfill=${backfillCount} selected=${selected.length}`,
    );
    for (const c of selected) {
      const start = new Date(c.event.startTimeLocal);
      const hcs = c.hockeyChaosScore;
      const hcsStr = hcs ? ` chaosScore=${hcs.total}(st=${hcs.statusScore}+cl=${hcs.closenessScore}+tp=${hcs.timePressure}+sit=${hcs.situationBoosts}+fav=${hcs.favoritesBoost}+mom=${hcs.momentum}) [${hcs.reasons.join(", ")}]` : "";
      const rcs = c.racingChaosScore;
      const rcsStr = rcs ? ` racingScore=${rcs.total}(session=${rcs.sessionScore}+sit=${rcs.situationBoosts}+fav=${rcs.favoritesBoost}) [${rcs.reasons.join(", ")}]` : "";
      console.log(
        `  [CHAOS]  ${c.event.id}: live=${c.isLive} fav=${c.isFavorite} anchor=${c.isAnchor} backfill=${c.isBackfill} emotion=${c.emotionRank} tension=${c.tensionRank} sportPri=${getSportPriority(c.event.sport)} start=${fmtPT(start)} ${c.event.awayTeam} @ ${c.event.homeTeam}${hcsStr}${rcsStr}`,
      );
    }
    const topPool = pool
      .slice()
      .sort((a, b) => chaosSort(a, b, inRitual))
      .slice(0, 10);
    if (topPool.length > selected.length) {
      console.log(`  [CHAOS] Top 10 pool (for comparison):`);
      for (const c of topPool) {
        const start = new Date(c.event.startTimeLocal);
        console.log(
          `    [CHAOS]  ${c.event.id}: live=${c.isLive} fav=${c.isFavorite} emotion=${c.emotionRank} tension=${c.tensionRank} sportPri=${getSportPriority(c.event.sport)} start=${fmtPT(start)} ${c.event.awayTeam} @ ${c.event.homeTeam}`,
        );
      }
    }
  }

  // Skip break-state games (halftime, intermission, period interval) for the hero slot
  const primaryIdx = selected.findIndex((c) => !isAtBreak(c.event, getScoreData));
  const primaryCandidate = primaryIdx >= 0 ? selected[primaryIdx] : selected[0];
  const secondaryCandidates = selected.filter((_, i) => i !== (primaryIdx >= 0 ? primaryIdx : 0));

  return {
    primary: primaryCandidate?.event ?? null,
    secondary: secondaryCandidates.map((c) => c.event),
    generatedAt: now.getTime(),
    candidateCount: pool.length,
    debug,
  };
}

function getNextUpCandidate(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
): SportEvent | null {
  const { todayEnd } = getTodayBoundsPT(now);
  const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = allEvents
    .filter((e) => {
      const start = new Date(e.startTimeLocal);
      return start > now && start <= tomorrowEnd;
    })
    .sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  const favUpcoming = upcoming.find((e) => favoriteInvolved(e, favorites));
  if (favUpcoming) return favUpcoming;

  return upcoming[0] ?? null;
}

export function selfHealChaosSetup(
  setup: ChaosSetup,
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
  getScoreData?: (id: string) => ScoreData | undefined,
): ChaosSetup | null {
  if (!setup.primary) return null;

  const allSelected = [setup.primary, ...setup.secondary];
  const terminalIds = new Set<string>();

  for (const event of allSelected) {
    if (isTerminalEvent(event, now, getScoreStatus)) {
      terminalIds.add(event.id);
    }
  }

  if (terminalIds.size === 0) return null;

  if (terminalIds.size === allSelected.length) {
    if (CHAOS_DEBUG) console.log("[CHAOS] self-heal: all terminal → full rebuild");
    return buildChaosSetup(allEvents, favorites, now, getScoreStatus, getScoreData);
  }

  const { inRitual } = isNowInAnyRitualWindow(now);
  const kept = allSelected.filter((e) => !terminalIds.has(e.id));
  const usedIds = new Set(kept.map((e) => e.id));
  const slotsNeeded = 4 - kept.length;

  if (CHAOS_DEBUG) {
    console.log(
      `[CHAOS] self-heal: ${terminalIds.size} terminal, keeping ${kept.length}, need ${slotsNeeded} replacements`,
      { terminalIds: [...terminalIds], keptIds: kept.map((e) => e.id) },
    );
  }

  const fullPool = getCandidatePool(allEvents, favorites, now, getScoreStatus, getScoreData)
    .filter((c) => !usedIds.has(c.event.id) && !isTerminalEvent(c.event, now, getScoreStatus));

  const liveReplacements = fullPool.filter((c) => c.isLive);
  const hasLiveReplacements = liveReplacements.length > 0;
  const pool = hasLiveReplacements ? liveReplacements : fullPool;

  const anchors = pool.filter((c) => c.isAnchor).sort(anchorSort);
  const nonAnchors = pool.filter((c) => !c.isAnchor).sort((a, b) => chaosSort(a, b, inRitual));

  const replacements: SportEvent[] = [];
  const replacementIds = new Set<string>();

  for (const a of anchors) {
    if (replacements.length >= slotsNeeded) break;
    replacements.push(a.event);
    replacementIds.add(a.event.id);
  }

  const usedSports = new Set([...kept, ...replacements].map((e) => e.sport));
  const diverseSorted = nonAnchors
    .filter((c) => !replacementIds.has(c.event.id))
    .sort((a, b) => {
      const aSportNew = usedSports.has(a.event.sport) ? 1 : 0;
      const bSportNew = usedSports.has(b.event.sport) ? 1 : 0;
      if (aSportNew !== bSportNew) return aSportNew - bSportNew;
      return chaosSort(a, b, inRitual);
    });

  for (const c of diverseSorted) {
    if (replacements.length >= slotsNeeded) break;
    replacements.push(c.event);
    replacementIds.add(c.event.id);
    usedSports.add(c.event.sport);
  }

  if (replacements.length < slotsNeeded && !hasLiveReplacements) {
    const allUsed = new Set([...usedIds, ...replacementIds]);
    const backfill = getBackfillCandidates(allEvents, favorites, now, allUsed);
    for (const c of backfill) {
      if (replacements.length >= slotsNeeded) break;
      if (isTerminalEvent(c.event, now, getScoreStatus)) continue;
      replacements.push(c.event);
    }
  }

  const merged = [...kept, ...replacements];
  const mergedCandidates = merged.map((e) => {
    const live = isEventLive(e, now) || getScoreStatus?.(e.id) === "live";
    return {
      event: e,
      score: computeFeaturedScore(e, favorites, now),
      isFavorite: favoriteInvolved(e, favorites),
      isLive: !!live,
      isAnchor: isAnchorTeam(e),
      isBackfill: false,
      emotionRank: getEmotionRank(e, favorites),
      tensionRank: getTensionRank(e, !!live, getScoreData),
    } as ChaosCandidate;
  });
  mergedCandidates.sort((a, b) => chaosSort(a, b, inRitual));
  const finalList = mergedCandidates.map((c) => c.event);

  if (CHAOS_DEBUG) {
    console.log(
      `[CHAOS] self-heal result: ${finalList.length} events`,
      finalList.map((e) => e.id),
    );
  }

  return {
    primary: finalList[0] ?? null,
    secondary: finalList.slice(1),
    generatedAt: now.getTime(),
    candidateCount: setup.candidateCount,
    debug: setup.debug,
  };
}

export function shouldAutoRegenerate(
  setup: ChaosSetup,
  allEvents: SportEvent[],
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
): boolean {
  if (!setup.primary) return false;

  const allSelected = [setup.primary, ...setup.secondary];

  const allEnded = allSelected.every((e) => {
    const end = getEventEnd(e);
    const scoreLive = getScoreStatus?.(e.id) === "live";
    return now > end && !scoreLive;
  });

  if (allEnded) return true;

  return false;
}

export function findHigherPriorityAlert(
  setup: ChaosSetup,
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
): SportEvent | null {
  if (!setup.primary) return null;

  const selectedIds = new Set([setup.primary.id, ...setup.secondary.map((e) => e.id)]);

  for (const event of allEvents) {
    if (selectedIds.has(event.id)) continue;

    const live = isEventLive(event, now) || getScoreStatus?.(event.id) === "live";
    if (!live) continue;

    if (isAnchorTeam(event)) return event;
  }

  const primaryScore = computeFeaturedScore(setup.primary, favorites, now);

  for (const event of allEvents) {
    if (selectedIds.has(event.id)) continue;

    const live = isEventLive(event, now) || getScoreStatus?.(event.id) === "live";
    if (!live) continue;

    const score = computeFeaturedScore(event, favorites, now);

    if (score.sportRank < primaryScore.sportRank) return event;
    if (score.sportRank === primaryScore.sportRank && score.ladderRank < primaryScore.ladderRank) return event;
  }

  return null;
}

export function evaluateSlot4Promotion(
  setup: ChaosSetup,
  allEvents: SportEvent[],
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
  getScoreData?: (id: string) => ScoreData | undefined,
  previousScores?: Record<string, ScoreData>,
): ChaosSetup | null {
  if (!setup.primary) return null;
  if (setup.secondary.length === 0) return null;

  const stableSlots = [setup.primary, ...setup.secondary.slice(0, 2)];
  const stableIds = new Set(stableSlots.map((e) => e.id));

  const currentSlot4 = setup.secondary.length >= 3 ? setup.secondary[2] : null;
  const slot4Event = currentSlot4 ?? setup.originalSlot4 ?? null;

  const slot4IsLive = slot4Event
    ? (isEventLive(slot4Event, now) || getScoreStatus?.(slot4Event.id) === "live")
    : false;

  const slot4Score = (slot4Event && slot4IsLive)
    ? computeActivityScore(
        slot4Event,
        getScoreData?.(slot4Event.id),
        previousScores?.[slot4Event.id],
      )
    : { total: 0, signals: [] } as ActivityScore;

  let bestCandidate: SportEvent | null = null;
  let bestScore: ActivityScore = { total: 0, signals: [] };

  for (const event of allEvents) {
    if (stableIds.has(event.id)) continue;
    if (currentSlot4 && event.id === currentSlot4.id) continue;

    const live = isEventLive(event, now) || getScoreStatus?.(event.id) === "live";
    if (!live) continue;

    if (isTerminalEvent(event, now, getScoreStatus)) continue;

    const score = computeActivityScore(
      event,
      getScoreData?.(event.id),
      previousScores?.[event.id],
    );

    if (score.total > bestScore.total) {
      bestScore = score;
      bestCandidate = event;
    }
  }

  if (!bestCandidate) return null;
  if (bestScore.total - slot4Score.total < PROMOTION_THRESHOLD) return null;

  if (CHAOS_DEBUG) {
    const sortedSignals = [...bestScore.signals].sort((a, b) => b.points - a.points);
    console.log(
      `[CHAOS] Slot 4 promotion: ${bestCandidate.awayTeam} @ ${bestCandidate.homeTeam} (activity=${bestScore.total} [${sortedSignals.map(s => s.name).join(", ")}]) replaces ${slot4Event ? `${slot4Event.awayTeam} @ ${slot4Event.homeTeam}` : "empty"} (activity=${slot4Score.total})`,
    );
  }

  const newSecondary = [
    ...setup.secondary.slice(0, 2),
    bestCandidate,
  ];

  const sortedSignals = [...bestScore.signals].sort((a, b) => b.points - a.points);
  const sortedSignalNames = sortedSignals.map((s) => s.name);
  const reason = getPromotionReason(bestScore.signals);

  return {
    ...setup,
    secondary: newSecondary,
    promotedEventId: bestCandidate.id,
    promotionReason: reason,
    promotedAt: now.getTime(),
    originalSlot4: setup.originalSlot4 ?? currentSlot4 ?? undefined,
    slot4ActivityScore: bestScore.total,
    slot4ActivitySignals: sortedSignalNames,
    generatedAt: now.getTime(),
  };
}
