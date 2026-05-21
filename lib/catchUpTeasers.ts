import type { SportEvent } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { displayTeamName } from "@/utils/teams";

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

function teamNames(event: SportEvent): { away: string; home: string; hasBoth: boolean } {
  const away = displayTeamName(event.awayTeam || "") || event.awayTeam || "";
  const home = displayTeamName(event.homeTeam || "") || event.homeTeam || "";
  return { away, home, hasBoth: !!(away && home) };
}

/**
 * Spoiler-safe narrative teaser for a finished event. Weaves team names into a
 * complete sentence that hints at the drama without revealing the winner or score.
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
  const { away: a, home: h, hasBoth } = teamNames(event);
  const matchup = hasBoth ? `${a} vs ${h}` : event.title || event.league;
  const pair = hasBoth ? `${a} and ${h}` : event.title || event.league;
  const tookOn = hasBoth ? `${a} took on ${h}` : `${event.title || event.league}`;
  const eventName = event.title || event.league;

  if (sport === "hockey") {
    if (period.includes("so") || period.includes("shootout"))
      return HIGH(`${matchup} was settled by a shootout`);
    if (period.includes("ot") || period.includes("overtime"))
      return HIGH(`${pair} needed overtime to settle it`);
    if (margin === 1) return HIGH(`${pair} traded a one-goal thriller`);
    if (margin === 2) return MED(`${pair} stayed tight down the stretch`);
    if (margin === 0) return MED(`${pair} couldn't be separated`);
    if (total !== null && total >= 8) return MED(`${pair} traded goals at both ends`);
    return LOW(`${matchup} — replay worth your time`);
  }

  if (sport === "soccer") {
    if (period.includes("pk") || period.includes("penalt"))
      return HIGH(`${matchup} was decided on penalties`);
    if (period.includes("et") || period.includes("extra"))
      return HIGH(`${pair} pushed it to extra time`);
    if (margin === 0) return MED(`${pair} couldn't be separated`);
    if (total !== null && total >= 5) return HIGH(`${pair} delivered end-to-end goals`);
    if (margin === 1) return HIGH(`${pair} settled it by a single goal`);
    if (margin === 2) return MED(`${pair} stayed tight late on`);
    return LOW(`${matchup} — replay worth your time`);
  }

  if (sport === "cricket") {
    const homeRuns = parseCricketRuns(score?.cricketHome);
    const awayRuns = parseCricketRuns(score?.cricketAway);
    if (homeRuns !== null && awayRuns !== null) {
      const runMargin = Math.abs(homeRuns - awayRuns);
      if (runMargin === 0) return HIGH(`${tookOn} in a tied match that went to a Super Over`);
      if (runMargin <= 6) return HIGH(`${tookOn} in a tense match that went down to the final over`);
      if (runMargin <= 15) return HIGH(`${tookOn} in a tight finish that came down to the closing overs`);
      if (runMargin <= 30) return MED(`${tookOn} in a close run chase`);
    }
    return MED(`${tookOn} in a finish worth a watch`);
  }

  if (sport === "basketball") {
    if (period.includes("ot") || period.includes("overtime"))
      return HIGH(`${pair} needed overtime to settle it`);
    if (margin !== null) {
      if (margin <= 3) return HIGH(`${pair} traded a last-shot thriller`);
      if (margin <= 7) return HIGH(`${pair} stayed close into the fourth`);
      if (margin <= 12) return MED(`${pair} were tight late`);
    }
    if (total !== null && total >= 230) return MED(`${pair} played at a shootout pace`);
    return LOW(`${matchup} — replay worth your time`);
  }

  if (sport === "rugby") {
    if (margin === 0) return MED(`${pair} couldn't be separated`);
    if (margin !== null && margin <= 3) return HIGH(`${pair} were decided by a single kick`);
    if (margin !== null && margin <= 7) return HIGH(`${pair} settled it inside one score`);
    if (total !== null && total >= 60) return MED(`${pair} put on a try-scoring spectacle`);
    return LOW(`${matchup} — replay worth your time`);
  }

  if (sport === "tennis") {
    const sets = score?.tennisSetScores;
    if (sets && sets.length >= 5) return HIGH(`${matchup} went the full five sets`);
    if (sets && sets.length >= 3) return HIGH(`${matchup} went the distance`);
    return LOW(`${matchup} — worth a watch`);
  }

  if (sport === "f1" || sport === "racing" || sport === "motorsport") {
    return MED(`${eventName} — race recap worth your time`);
  }

  if (sport === "athletics" || sport === "marathon") {
    return MED(`${eventName} — race recap worth watching`);
  }

  if (sport === "cycling") {
    return MED(`${eventName} — stage worth replaying`);
  }

  if (sport === "golf") {
    return MED(`${eventName} — closing holes worth a look`);
  }

  return LOW(`${matchup} — replay worth your time`);
}
