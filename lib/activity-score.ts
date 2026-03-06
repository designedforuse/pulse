import type { SportEvent } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";

export interface ActivitySignal {
  name: string;
  points: number;
  reason: string;
}

export interface ActivityScore {
  total: number;
  signals: ActivitySignal[];
}

const SIGNAL_REASONS: Record<string, string> = {
  "Goal scored": "Goal just scored",
  "Overtime": "Overtime started",
  "Match point": "Match point",
  "Upset Alert": "Upset brewing",
  "Red card": "Red card",
  "Late close game": "One-goal game late",
  "Power play": "Power play",
  "Goalie pulled": "Goalie pulled",
};

function detectGoalScored(
  event: SportEvent,
  current: ScoreData | undefined,
  previous: ScoreData | undefined,
): boolean {
  if (!current || !previous) return false;
  const sport = event.sport.toLowerCase();
  if (sport === "tennis" || sport === "cricket") return false;
  const prevTotal = (previous.awayScore ?? 0) + (previous.homeScore ?? 0);
  const curTotal = (current.awayScore ?? 0) + (current.homeScore ?? 0);
  return curTotal > prevTotal;
}

function detectOvertime(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  const sport = event.sport.toLowerCase();
  const status = (current.status || "").toLowerCase();
  const period = (current.period || "").toLowerCase();
  const periodType = (current.periodType || "").toUpperCase();

  if (sport === "hockey") {
    return periodType === "OT" || periodType === "SO"
      || period.includes("ot") || period.includes("overtime") || period.includes("shootout");
  }
  if (sport === "soccer") {
    return status.includes("extra") || period.includes("extra")
      || status.includes("penalty") || period.includes("penalty");
  }
  if (sport === "rugby") {
    return status.includes("extra") || period.includes("extra");
  }
  return false;
}

function detectMatchPoint(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  if (event.sport.toLowerCase() !== "tennis") return false;
  const status = (current.status || "").toLowerCase();
  const period = (current.period || "").toLowerCase();
  if (status.includes("match point") || period.includes("match point")) return true;
  if (status.includes("championship point") || period.includes("championship point")) return true;

  const away = current.awayScore ?? 0;
  const home = current.homeScore ?? 0;
  const setsToWin = 2;
  if ((away === setsToWin - 1 && home < away) || (home === setsToWin - 1 && away < home)) {
    return true;
  }
  return false;
}

function detectUpsetSituation(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  const sport = event.sport.toLowerCase();

  if (sport === "tennis") {
    const p1Rank = event.tennisPlayer1Rank ?? 999;
    const p2Rank = event.tennisPlayer2Rank ?? 999;
    const seedGap = Math.abs(p1Rank - p2Rank);
    if (seedGap < 5) return false;
    const favoriteIsP1 = p1Rank < p2Rank;
    const awayScore = current.awayScore ?? 0;
    const homeScore = current.homeScore ?? 0;
    if (favoriteIsP1 && homeScore > awayScore) return true;
    if (!favoriteIsP1 && awayScore > homeScore) return true;
    return false;
  }

  return false;
}

function detectLateCloseGame(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  const sport = event.sport.toLowerCase();
  const status = (current.status || "").toLowerCase();
  const period = (current.period || "").toLowerCase();
  const periodNumber = current.periodNumber ?? 0;
  const secondsRemaining = current.secondsRemaining;
  const diff = Math.abs((current.awayScore ?? 0) - (current.homeScore ?? 0));

  if (sport === "hockey") {
    const isP3 = periodNumber >= 3 || period.includes("3rd") || period === "3";
    const isLate = secondsRemaining !== undefined ? secondsRemaining <= 600 : false;
    return isP3 && isLate && diff <= 1;
  }

  if (sport === "soccer") {
    const isSecondHalf = period.includes("2nd") || period.includes("second")
      || periodNumber >= 2 || status.includes("2nd half");
    const isLate = secondsRemaining !== undefined ? secondsRemaining <= 900 : isSecondHalf;
    return isSecondHalf && diff <= 1;
  }

  if (sport === "rugby") {
    const isSecondHalf = period.includes("2nd") || period.includes("second")
      || periodNumber >= 2 || status.includes("2nd half");
    return isSecondHalf && diff <= 7;
  }

  if (sport === "tennis") {
    const away = current.awayScore ?? 0;
    const home = current.homeScore ?? 0;
    if (away >= 1 && home >= 1 && Math.abs(away - home) <= 1) return true;
  }

  return false;
}

function detectPowerPlay(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  if (event.sport.toLowerCase() !== "hockey") return false;
  if (current.lastGoalStrength === "pp" || current.lastGoalStrength === "sh") return true;
  return false;
}

function detectGoaliePulled(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current) return false;
  if (event.sport.toLowerCase() !== "hockey") return false;
  return !!(current as any).goaliePulled;
}

export function computeActivityScore(
  event: SportEvent,
  currentScore: ScoreData | undefined,
  previousScore: ScoreData | undefined,
): ActivityScore {
  const signals: ActivitySignal[] = [];

  if (!currentScore || (currentScore.status || "").toLowerCase() === "final") {
    return { total: 0, signals };
  }

  if (detectGoalScored(event, currentScore, previousScore)) {
    signals.push({ name: "Goal scored", points: 40, reason: SIGNAL_REASONS["Goal scored"] });
  }

  if (detectOvertime(event, currentScore)) {
    signals.push({ name: "Overtime", points: 35, reason: SIGNAL_REASONS["Overtime"] });
  }

  if (detectMatchPoint(event, currentScore)) {
    signals.push({ name: "Match point", points: 35, reason: SIGNAL_REASONS["Match point"] });
  }

  if (detectUpsetSituation(event, currentScore)) {
    signals.push({ name: "Upset Alert", points: 30, reason: SIGNAL_REASONS["Upset Alert"] });
  }

  if (detectGoaliePulled(event, currentScore)) {
    signals.push({ name: "Goalie pulled", points: 25, reason: SIGNAL_REASONS["Goalie pulled"] });
  }

  if (detectPowerPlay(event, currentScore)) {
    signals.push({ name: "Power play", points: 20, reason: SIGNAL_REASONS["Power play"] });
  }

  if (detectLateCloseGame(event, currentScore)) {
    signals.push({ name: "Late close game", points: 20, reason: SIGNAL_REASONS["Late close game"] });
  }

  const total = signals.reduce((sum, s) => sum + s.points, 0);
  return { total, signals };
}

export function getPromotionReason(signals: ActivitySignal[]): string {
  if (signals.length === 0) return "Live momentum spike";
  const sorted = [...signals].sort((a, b) => b.points - a.points);
  return sorted[0].reason;
}
