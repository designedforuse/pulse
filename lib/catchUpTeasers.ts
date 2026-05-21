import type { SportEvent } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";

export type TeaserMood = "high" | "medium" | "low";

export interface CatchUpTeaser {
  headline: string;
  mood: TeaserMood;
}

const HIGH = (headline: string): CatchUpTeaser => ({ headline, mood: "high" });
const MED = (headline: string): CatchUpTeaser => ({ headline, mood: "medium" });
const LOW = (headline: string): CatchUpTeaser => ({ headline, mood: "low" });

function parseCricketRuns(str: string | undefined): number | null {
  if (!str) return null;
  const m = str.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Spoiler-safe teaser for a finished event. Never reveals the winner or final score.
 * Uses score metadata only to hint at drama (overtime, close margin, set count, etc.).
 */
export function getCatchUpTeaser(
  event: SportEvent,
  score: ScoreData | undefined
): CatchUpTeaser {
  const sport = event.sport;
  const period = (score?.period || "").toLowerCase();
  const home = typeof score?.homeScore === "number" ? score!.homeScore : null;
  const away = typeof score?.awayScore === "number" ? score!.awayScore : null;
  const margin = home !== null && away !== null ? Math.abs(home - away) : null;
  const total = home !== null && away !== null ? home + away : null;

  if (sport === "hockey") {
    if (period.includes("so") || period.includes("shootout")) return HIGH("Decided in a shootout");
    if (period.includes("ot") || period.includes("overtime")) return HIGH("Went to overtime");
    if (margin === 1) return HIGH("One-goal thriller");
    if (margin === 2) return MED("Close down the stretch");
    if (margin === 0) return MED("Ended level");
    if (total !== null && total >= 8) return MED("Goals at both ends");
    return LOW("Replay worth your time");
  }

  if (sport === "soccer") {
    if (period.includes("pk") || period.includes("penalt")) return HIGH("Decided on penalties");
    if (period.includes("et") || period.includes("extra")) return HIGH("Pushed to extra time");
    if (margin === 0) return MED("Honors even");
    if (total !== null && total >= 5) return HIGH("End-to-end goals");
    if (margin === 1) return HIGH("One-goal margin");
    if (margin === 2) return MED("Late drama");
    return LOW("Replay worth your time");
  }

  if (sport === "cricket") {
    const homeRuns = parseCricketRuns(score?.cricketHome);
    const awayRuns = parseCricketRuns(score?.cricketAway);
    if (homeRuns !== null && awayRuns !== null) {
      const runMargin = Math.abs(homeRuns - awayRuns);
      if (runMargin === 0) return HIGH("Tied — Super Over territory");
      if (runMargin <= 6) return HIGH("Down to the final over");
      if (runMargin <= 15) return HIGH("Tight finish");
      if (runMargin <= 30) return MED("Close run chase");
    }
    return MED("A finish worth a watch");
  }

  if (sport === "basketball") {
    if (period.includes("ot") || period.includes("overtime")) return HIGH("Went to overtime");
    if (margin !== null) {
      if (margin <= 3) return HIGH("Last-shot thriller");
      if (margin <= 7) return HIGH("Close in the fourth");
      if (margin <= 12) return MED("Tight late");
    }
    if (total !== null && total >= 230) return MED("Shootout pace");
    return LOW("Replay worth your time");
  }

  if (sport === "rugby") {
    if (margin === 0) return MED("Ended level");
    if (margin !== null && margin <= 3) return HIGH("Decided by a kick");
    if (margin !== null && margin <= 7) return HIGH("One-score game");
    if (total !== null && total >= 60) return MED("Try-scoring spectacle");
    return LOW("Replay worth your time");
  }

  if (sport === "tennis") {
    const sets = score?.tennisSetScores;
    if (sets && sets.length >= 5) return HIGH("Went all five sets");
    if (sets && sets.length >= 3) return HIGH("Went the distance");
    return LOW("Worth a watch");
  }

  if (sport === "f1" || sport === "racing" || sport === "motorsport") {
    return MED("Recap worth your time");
  }

  if (sport === "athletics" || sport === "marathon") {
    return MED("Race recap worth watching");
  }

  if (sport === "cycling") {
    return MED("Stage worth replaying");
  }

  if (sport === "golf") {
    return MED("Closing holes worth a look");
  }

  return LOW("Replay worth your time");
}
