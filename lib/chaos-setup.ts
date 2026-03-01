import type { SportEvent, Favorites } from "@/lib/data";
import { getEventEnd, isEventLive } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import { computeFeaturedScore, type FeaturedScore } from "@/lib/rituals";

const CHAOS_WINDOW_MS = 90 * 60 * 1000;
const CHAOS_DEBUG = __DEV__;

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
}

function getCandidatePool(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
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

    candidates.push({ event, score, isFavorite: isFav, isLive: live, isAnchor: anchor, isBackfill: false });
  }

  return candidates;
}

function getBackfillCandidates(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  usedIds: Set<string>,
): ChaosCandidate[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

  const candidates: ChaosCandidate[] = [];

  for (const event of allEvents) {
    if (usedIds.has(event.id)) continue;
    const start = new Date(event.startTimeLocal);
    if (start <= now) continue;
    if (start > tomorrowEnd) continue;

    const isFav = favoriteInvolved(event, favorites);
    const score = computeFeaturedScore(event, favorites, now);

    candidates.push({
      event,
      score,
      isFavorite: isFav,
      isLive: false,
      isAnchor: isAnchorTeam(event),
      isBackfill: true,
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

function chaosSort(a: ChaosCandidate, b: ChaosCandidate): number {
  if (a.score.sportRank !== b.score.sportRank) return a.score.sportRank - b.score.sportRank;
  if (a.score.ladderRank !== b.score.ladderRank) return a.score.ladderRank - b.score.ladderRank;

  const aFav = a.isFavorite ? 0 : 1;
  const bFav = b.isFavorite ? 0 : 1;
  if (aFav !== bFav) return aFav - bFav;

  const aLive = a.isLive ? 0 : 1;
  const bLive = b.isLive ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

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
}

export interface ChaosDebug {
  anchorFound: boolean;
  anchorIds: string[];
  liveCount: number;
  soonCount: number;
  backfillCount: number;
  selectedIds: string[];
}

export function buildChaosSetup(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
): ChaosSetup {
  const pool = getCandidatePool(allEvents, favorites, now, getScoreStatus);

  const selected: ChaosCandidate[] = [];
  const usedIds = new Set<string>();

  const anchors = pool.filter((c) => c.isAnchor).sort(anchorSort);
  for (const anchor of anchors) {
    if (selected.length >= 4) break;
    selected.push(anchor);
    usedIds.add(anchor.event.id);
  }

  const nonAnchors = pool.filter((c) => !usedIds.has(c.event.id));
  nonAnchors.sort(chaosSort);

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
    const diverseRemaining = nonAnchors
      .filter((c) => !usedIds.has(c.event.id))
      .sort((a, b) => {
        const aSportNew = usedSports.has(a.event.sport) ? 1 : 0;
        const bSportNew = usedSports.has(b.event.sport) ? 1 : 0;
        if (aSportNew !== bSportNew) return aSportNew - bSportNew;
        return chaosSort(a, b);
      });

    for (const candidate of diverseRemaining) {
      if (selected.length >= 4) break;
      selected.push(candidate);
      usedIds.add(candidate.event.id);
      usedSports.add(candidate.event.sport);
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

  const liveCount = pool.filter((c) => c.isLive).length;
  const soonCount = pool.filter((c) => !c.isLive).length;
  let backfillCount = 0;

  if (selected.length < 4) {
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
      });
      backfillCount++;
    }
  }

  const debug: ChaosDebug = {
    anchorFound: anchors.length > 0,
    anchorIds: anchors.map((a) => a.event.id),
    liveCount,
    soonCount,
    backfillCount,
    selectedIds: selected.map((c) => c.event.id),
  };

  if (CHAOS_DEBUG) {
    console.log(
      `[CHAOS] anchors=${anchors.length} live=${liveCount} soon=${soonCount} backfill=${backfillCount} selected=${selected.length}`,
      debug.selectedIds,
    );
  }

  return {
    primary: selected[0]?.event ?? null,
    secondary: selected.slice(1).map((c) => c.event),
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
  const upcoming = allEvents
    .filter((e) => new Date(e.startTimeLocal) > now)
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
    return buildChaosSetup(allEvents, favorites, now, getScoreStatus);
  }

  const kept = allSelected.filter((e) => !terminalIds.has(e.id));
  const usedIds = new Set(kept.map((e) => e.id));
  const slotsNeeded = 4 - kept.length;

  if (CHAOS_DEBUG) {
    console.log(
      `[CHAOS] self-heal: ${terminalIds.size} terminal, keeping ${kept.length}, need ${slotsNeeded} replacements`,
      { terminalIds: [...terminalIds], keptIds: kept.map((e) => e.id) },
    );
  }

  const pool = getCandidatePool(allEvents, favorites, now, getScoreStatus)
    .filter((c) => !usedIds.has(c.event.id) && !isTerminalEvent(c.event, now, getScoreStatus));

  const anchors = pool.filter((c) => c.isAnchor).sort(anchorSort);
  const nonAnchors = pool.filter((c) => !c.isAnchor).sort(chaosSort);

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
      return chaosSort(a, b);
    });

  for (const c of diverseSorted) {
    if (replacements.length >= slotsNeeded) break;
    replacements.push(c.event);
    replacementIds.add(c.event.id);
    usedSports.add(c.event.sport);
  }

  if (replacements.length < slotsNeeded) {
    const allUsed = new Set([...usedIds, ...replacementIds]);
    const backfill = getBackfillCandidates(allEvents, favorites, now, allUsed);
    for (const c of backfill) {
      if (replacements.length >= slotsNeeded) break;
      if (isTerminalEvent(c.event, now, getScoreStatus)) continue;
      replacements.push(c.event);
    }
  }

  const merged = [...kept, ...replacements];
  const anchorFirst = merged.filter((e) => isAnchorTeam(e));
  const nonAnchor = merged.filter((e) => !isAnchorTeam(e));
  const finalList = [...anchorFirst, ...nonAnchor];

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
