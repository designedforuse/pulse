import type { SportEvent, Favorites } from "@/lib/data";
import { getEventEnd, isEventLive } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import { computeFeaturedScore, type FeaturedScore } from "@/lib/rituals";

const CHAOS_WINDOW_MS = 90 * 60 * 1000;

export interface ChaosCandidate {
  event: SportEvent;
  score: FeaturedScore;
  isFavorite: boolean;
  isLive: boolean;
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

    const live = isEventLive(event, now) || scoreLive;
    const isFav = favoriteInvolved(event, favorites);
    const score = computeFeaturedScore(event, favorites, now);

    candidates.push({ event, score, isFavorite: isFav, isLive: live });
  }

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

export interface ChaosSetup {
  primary: SportEvent | null;
  secondary: SportEvent[];
  generatedAt: number;
  candidateCount: number;
}

export function buildChaosSetup(
  allEvents: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreStatus?: (id: string) => string | undefined,
): ChaosSetup {
  const pool = getCandidatePool(allEvents, favorites, now, getScoreStatus);

  if (pool.length === 0) {
    return { primary: null, secondary: [], generatedAt: now.getTime(), candidateCount: 0 };
  }

  pool.sort(chaosSort);

  const selected: ChaosCandidate[] = [];
  const usedIds = new Set<string>();

  selected.push(pool[0]);
  usedIds.add(pool[0].event.id);

  const hasFavoriteInFirst = pool[0].isFavorite;
  const remaining = pool.filter((c) => !usedIds.has(c.event.id));

  if (!hasFavoriteInFirst) {
    const favCandidate = remaining.find((c) => c.isFavorite);
    if (favCandidate) {
      selected.push(favCandidate);
      usedIds.add(favCandidate.event.id);
    }
  }

  const usedSports = new Set(selected.map((c) => c.event.sport));
  const diverseRemaining = remaining
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

  if (selected.length < 4) {
    for (const candidate of remaining) {
      if (selected.length >= 4) break;
      if (usedIds.has(candidate.event.id)) continue;
      selected.push(candidate);
      usedIds.add(candidate.event.id);
    }
  }

  return {
    primary: selected[0]?.event ?? null,
    secondary: selected.slice(1).map((c) => c.event),
    generatedAt: now.getTime(),
    candidateCount: pool.length,
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
