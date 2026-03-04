import type { SportEvent, Favorites } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { favoriteInvolved } from "@/utils/favorites";

export interface ChaosScoreResult {
  total: number;
  statusScore: number;
  closenessScore: number;
  timePressure: number;
  situationBoosts: number;
  favoritesBoost: number;
  momentum: number;
  reasons: string[];
}

type HockeyStatus = "LIVE" | "INTERMISSION" | "OT" | "SHOOTOUT" | "FINAL" | "UPCOMING";

function detectHockeyStatus(score: ScoreData | undefined, event: SportEvent, now: Date): HockeyStatus {
  if (!score) {
    const start = new Date(event.startTimeLocal).getTime();
    const elapsed = now.getTime() - start;
    if (elapsed > 0 && elapsed < 4 * 60 * 60 * 1000) return "LIVE";
    return "UPCOMING";
  }

  const status = (score.status || "").toLowerCase();
  if (status === "final" || status.startsWith("f/")) return "FINAL";

  const periodType = (score.periodType || "").toUpperCase();
  if (periodType === "SO") return "SHOOTOUT";
  if (periodType === "OT") return "OT";

  if (score.inIntermission) return "INTERMISSION";

  const gameState = (score.gameState || "").toUpperCase();
  if (gameState === "LIVE" || gameState === "CRIT") return "LIVE";
  if (gameState === "FINAL" || gameState === "OFF") return "FINAL";

  if (status === "live") return "LIVE";

  return "UPCOMING";
}

const STATUS_WEIGHTS: Record<HockeyStatus, number> = {
  SHOOTOUT: 80,
  OT: 70,
  LIVE: 50,
  INTERMISSION: 45,
  FINAL: 0,
  UPCOMING: 0,
};

function computeCloseness(score: ScoreData | undefined): { value: number; diff: number } {
  if (!score) return { value: 0, diff: 99 };
  const diff = Math.abs(score.homeScore - score.awayScore);
  if (diff === 0) return { value: 25, diff };
  if (diff === 1) return { value: 20, diff };
  if (diff === 2) return { value: 10, diff };
  return { value: 0, diff };
}

function computeTimePressure(score: ScoreData | undefined): number {
  if (!score) return 0;

  const periodNum = score.periodNumber ?? 0;
  const periodType = (score.periodType || "").toUpperCase();

  if (periodType === "OT" || periodType === "SO") return 25;

  if (score.inIntermission) {
    if (periodNum >= 2) return Math.round(15 * (periodNum / 3));
    return 5;
  }

  const secsRemaining = score.secondsRemaining;
  if (secsRemaining == null) return 0;

  const totalRegulationSeconds = 3 * 20 * 60;
  const secsElapsed = (periodNum - 1) * 20 * 60 + (20 * 60 - secsRemaining);
  const minutesRemaining = Math.max(0, (totalRegulationSeconds - secsElapsed) / 60);
  const late = Math.max(0, Math.min(1, 1 - minutesRemaining / 60));
  return Math.round(late * 25);
}

function computeSituationBoosts(score: ScoreData | undefined): { value: number; reasons: string[] } {
  if (!score) return { value: 0, reasons: [] };

  let boosts = 0;
  const reasons: string[] = [];
  const diff = Math.abs(score.homeScore - score.awayScore);

  if (score.lastGoalStrength === "pp" || score.lastGoalStrength === "sh") {
    boosts += 15;
    reasons.push("Power play action");
  }

  if (score.lastGoalStrength === "ps") {
    boosts += 25;
    reasons.push("Penalty shot scored");
  }

  const periodNum = score.periodNumber ?? 0;
  const secsRemaining = score.secondsRemaining;
  if (periodNum === 3 && secsRemaining != null && secsRemaining <= 120 && diff <= 1) {
    boosts += 25;
    reasons.push("Final 2 min, one-goal game");
  }

  if (score.lastGoalPeriod != null && score.lastGoalTimeInPeriod) {
    const goalPeriod = score.lastGoalPeriod;
    const [goalMin] = score.lastGoalTimeInPeriod.split(":").map(Number);
    if (goalPeriod === periodNum && secsRemaining != null) {
      const goalElapsed = goalMin * 60;
      const currentElapsed = 20 * 60 - secsRemaining;
      const secsSinceGoal = currentElapsed - goalElapsed;
      if (secsSinceGoal >= 0 && secsSinceGoal <= 120) {
        boosts += 18;
        reasons.push("Goal in last 2 minutes");
      }
    }
  }

  const gameState = (score.gameState || "").toUpperCase();
  if (gameState === "CRIT") {
    if (!reasons.some(r => r.includes("Final 2 min"))) {
      boosts += 10;
      reasons.push("Critical game moment");
    }
  }

  return { value: boosts, reasons };
}

function computeFavoritesBoost(event: SportEvent, favorites: Favorites): { value: number; reason: string | null } {
  if (favoriteInvolved(event, favorites)) {
    return { value: 8, reason: "Favorite team playing" };
  }
  return { value: 0, reason: null };
}

function computeMomentum(score: ScoreData | undefined): { value: number; reason: string | null } {
  if (!score) return { value: 0, reason: null };
  const awaySog = score.awaySog ?? 0;
  const homeSog = score.homeSog ?? 0;
  if (awaySog === 0 && homeSog === 0) return { value: 0, reason: null };

  const sogDiff = Math.abs(awaySog - homeSog);
  const val = Math.min(sogDiff * 2, 10);
  if (val > 0) {
    const leader = awaySog > homeSog ? "away" : "home";
    return { value: val, reason: `Shot advantage (${leader} ${Math.max(awaySog, homeSog)}-${Math.min(awaySog, homeSog)})` };
  }
  return { value: 0, reason: null };
}

export function computeHockeyChaosScore(
  event: SportEvent,
  score: ScoreData | undefined,
  favorites: Favorites,
  now: Date,
): ChaosScoreResult {
  const hockeyStatus = detectHockeyStatus(score, event, now);

  if (hockeyStatus === "UPCOMING" || hockeyStatus === "FINAL") {
    return {
      total: 0,
      statusScore: 0,
      closenessScore: 0,
      timePressure: 0,
      situationBoosts: 0,
      favoritesBoost: 0,
      momentum: 0,
      reasons: [hockeyStatus === "FINAL" ? "Game ended" : "Not yet started"],
    };
  }

  const statusScore = STATUS_WEIGHTS[hockeyStatus];
  const { value: closenessScore, diff } = computeCloseness(score);
  const timePressure = computeTimePressure(score);
  const { value: situationBoosts, reasons: sitReasons } = computeSituationBoosts(score);
  const { value: rawFavBoost, reason: favReason } = computeFavoritesBoost(event, favorites);
  const favoritesBoost = Math.min(rawFavBoost, 10);
  const { value: momentum, reason: momReason } = computeMomentum(score);

  const total = statusScore + closenessScore + timePressure + situationBoosts + favoritesBoost + momentum;

  const reasons: string[] = [];

  if (hockeyStatus === "SHOOTOUT") reasons.push("Shootout!");
  else if (hockeyStatus === "OT") reasons.push("Overtime!");
  else if (hockeyStatus === "INTERMISSION") reasons.push("Intermission");

  if (diff === 0) reasons.push("Tied game");
  else if (diff === 1) reasons.push("One-goal game");
  else if (diff === 2) reasons.push("Two-goal game");

  if (timePressure >= 20) reasons.push("Late in regulation");
  else if (timePressure >= 10) reasons.push("Midgame intensity");

  reasons.push(...sitReasons);
  if (favReason) reasons.push(favReason);
  if (momReason) reasons.push(momReason);

  return { total, statusScore, closenessScore, timePressure, situationBoosts, favoritesBoost, momentum, reasons };
}

export interface ChaosRankedGame {
  event: SportEvent;
  chaosScore: ChaosScoreResult;
  hockeyStatus: HockeyStatus;
  score: ScoreData | undefined;
}

export function chaosScoreTiebreak(a: ChaosRankedGame, b: ChaosRankedGame): number {
  const scoreDiff = b.chaosScore.total - a.chaosScore.total;
  if (Math.abs(scoreDiff) > 3) return scoreDiff;

  const statusOrder: Record<HockeyStatus, number> = {
    SHOOTOUT: 0, OT: 1, LIVE: 2, INTERMISSION: 3, FINAL: 4, UPCOMING: 5,
  };
  const statusCmp = statusOrder[a.hockeyStatus] - statusOrder[b.hockeyStatus];
  if (statusCmp !== 0) return statusCmp;

  const aDiff = a.score ? Math.abs(a.score.homeScore - a.score.awayScore) : 99;
  const bDiff = b.score ? Math.abs(b.score.homeScore - b.score.awayScore) : 99;
  if (aDiff !== bDiff) return aDiff - bDiff;

  const aSecs = a.score?.secondsRemaining ?? 9999;
  const bSecs = b.score?.secondsRemaining ?? 9999;
  if (aSecs !== bSecs) return aSecs - bSecs;

  if (a.chaosScore.situationBoosts !== b.chaosScore.situationBoosts) {
    return b.chaosScore.situationBoosts - a.chaosScore.situationBoosts;
  }

  return b.chaosScore.favoritesBoost - a.chaosScore.favoritesBoost;
}

export function rankHockeyGamesForChaos(
  events: SportEvent[],
  favorites: Favorites,
  now: Date,
  getScoreData?: (id: string) => ScoreData | undefined,
): ChaosRankedGame[] {
  const hockeyEvents = events.filter(e => e.sport === "hockey");

  const ranked: ChaosRankedGame[] = [];

  for (const event of hockeyEvents) {
    const score = getScoreData?.(event.id);
    const chaosScore = computeHockeyChaosScore(event, score, favorites, now);
    const hockeyStatus = detectHockeyStatus(score, event, now);

    if (hockeyStatus === "UPCOMING" || hockeyStatus === "FINAL") continue;

    ranked.push({ event, chaosScore, hockeyStatus, score });
  }

  ranked.sort(chaosScoreTiebreak);

  return ranked;
}

export function selectChaosCarousel(
  ranked: ChaosRankedGame[],
  favorites: Favorites,
  maxSecondary: number = 3,
): { hero: ChaosRankedGame | null; secondary: ChaosRankedGame[] } {
  if (ranked.length === 0) return { hero: null, secondary: [] };

  const hero = ranked[0];
  const remaining = ranked.slice(1);

  const secondary: ChaosRankedGame[] = [];
  const usedFavTeams = new Set<string>();

  const heroFavAway = favoriteInvolved({ ...hero.event, homeTeam: "" } as any, favorites);
  const heroFavHome = favoriteInvolved({ ...hero.event, awayTeam: "" } as any, favorites);
  if (heroFavAway) usedFavTeams.add(hero.event.awayTeam.toLowerCase());
  if (heroFavHome) usedFavTeams.add(hero.event.homeTeam.toLowerCase());

  for (const game of remaining) {
    if (secondary.length >= maxSecondary) break;

    const isFav = favoriteInvolved(game.event, favorites);
    if (isFav) {
      const awayLower = game.event.awayTeam.toLowerCase();
      const homeLower = game.event.homeTeam.toLowerCase();
      const duplicateFav = usedFavTeams.has(awayLower) || usedFavTeams.has(homeLower);

      if (duplicateFav) {
        const bestAlt = remaining.find(r =>
          r !== game &&
          !secondary.includes(r) &&
          !favoriteInvolved(r.event, favorites)
        );
        if (bestAlt && game.chaosScore.total - bestAlt.chaosScore.total < 5) {
          continue;
        }
      }
      if (favoriteInvolved(game.event, favorites)) {
        usedFavTeams.add(awayLower);
        usedFavTeams.add(homeLower);
      }
    }

    secondary.push(game);
  }

  return { hero, secondary };
}

export function isHockeyEligibleForChaos(score: ScoreData | undefined, event: SportEvent, now: Date): boolean {
  const status = detectHockeyStatus(score, event, now);
  return status !== "UPCOMING" && status !== "FINAL";
}
