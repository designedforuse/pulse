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
  "Red Flag": "Red Flag deployed",
  "Safety Car": "Safety Car deployed",
  "Final laps": "Final laps of race",
};

function getScoringReason(sport: string, current: ScoreData | undefined, previous: ScoreData | undefined): string {
  const s = sport.toLowerCase();
  if (s === "rugby") {
    const prevTotal = (previous?.awayScore ?? 0) + (previous?.homeScore ?? 0);
    const curTotal = (current?.awayScore ?? 0) + (current?.homeScore ?? 0);
    const diff = curTotal - prevTotal;
    if (diff >= 5) return "Try scored";
    if (diff === 3) return "Penalty scored";
    return "Score update";
  }
  if (s === "soccer") return "Goal just scored";
  if (s === "hockey") return "Goal just scored";
  if (s === "basketball") return "Points scored";
  return "Score update";
}

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
  const detail = (current.tennisStatusDetail || "").toLowerCase();
  if (status.includes("match point") || period.includes("match point") || detail.includes("match point")) return true;
  if (status.includes("championship point") || period.includes("championship point") || detail.includes("championship point")) return true;

  const setsToWin = 2;
  const p1Sets = current.awayScore ?? 0;
  const p2Sets = current.homeScore ?? 0;
  const gameScore = current.tennisGameScore;
  const setScores = current.tennisSetScores;
  if (!gameScore || !setScores) return false;

  const currentSet = setScores[setScores.length - 1];
  if (!currentSet) return false;
  const p1Games = currentSet.p1;
  const p2Games = currentSet.p2;

  const g1 = parseInt(gameScore.p1, 10);
  const g2 = parseInt(gameScore.p2, 10);
  const isAd1 = gameScore.p1.toLowerCase() === "ad";
  const isAd2 = gameScore.p2.toLowerCase() === "ad";

  const p1HasGamePoint = (g1 >= 40 && g1 > g2) || isAd1;
  const p2HasGamePoint = (g2 >= 40 && g2 > g1) || isAd2;

  const isTiebreak = p1Games >= 6 && p2Games >= 6;

  if (p1Sets === setsToWin - 1 && p1HasGamePoint) {
    if (isTiebreak && p1Games > p2Games) return true;
    if (!isTiebreak && p1Games >= 5 && p1Games > p2Games) return true;
  }
  if (p2Sets === setsToWin - 1 && p2HasGamePoint) {
    if (isTiebreak && p2Games > p1Games) return true;
    if (!isTiebreak && p2Games >= 5 && p2Games > p1Games) return true;
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

function detectRacingRedFlag(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current || event.sport.toLowerCase() !== "racing") return false;
  const status = (current.racingStatus || "").toLowerCase();
  return status.includes("red flag");
}

function detectRacingSafetyCar(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current || event.sport.toLowerCase() !== "racing") return false;
  const status = (current.racingStatus || "").toLowerCase();
  return status.includes("safety car") || status === "sc" || status.includes("vsc");
}

function detectRacingFinalLaps(
  event: SportEvent,
  current: ScoreData | undefined,
): boolean {
  if (!current || event.sport.toLowerCase() !== "racing") return false;
  if (current.racingLapNum == null || current.racingTotalLaps == null || current.racingTotalLaps === 0) return false;
  return current.racingLapNum / current.racingTotalLaps >= 0.85;
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
    signals.push({ name: "Goal scored", points: 40, reason: getScoringReason(event.sport, currentScore, previousScore) });
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

  if (detectRacingRedFlag(event, currentScore)) {
    signals.push({ name: "Red Flag", points: 30, reason: SIGNAL_REASONS["Red Flag"] });
  }

  if (detectGoaliePulled(event, currentScore)) {
    signals.push({ name: "Goalie pulled", points: 25, reason: SIGNAL_REASONS["Goalie pulled"] });
  }

  if (detectRacingSafetyCar(event, currentScore)) {
    signals.push({ name: "Safety Car", points: 20, reason: SIGNAL_REASONS["Safety Car"] });
  }

  if (detectPowerPlay(event, currentScore)) {
    signals.push({ name: "Power play", points: 20, reason: SIGNAL_REASONS["Power play"] });
  }

  if (detectLateCloseGame(event, currentScore)) {
    const sp = event.sport.toLowerCase();
    let lateReason = "Close game late";
    if (sp === "hockey" || sp === "soccer") lateReason = "One-goal game late";
    else if (sp === "basketball") lateReason = "One-possession game";
    else if (sp === "tennis") lateReason = "Final set battle";
    signals.push({ name: "Late close game", points: 20, reason: lateReason });
  }

  if (detectRacingFinalLaps(event, currentScore)) {
    signals.push({ name: "Final laps", points: 25, reason: SIGNAL_REASONS["Final laps"] });
  }

  const total = signals.reduce((sum, s) => sum + s.points, 0);
  return { total, signals };
}

export function getPromotionReason(signals: ActivitySignal[]): string {
  if (signals.length === 0) return "Live momentum spike";
  const sorted = [...signals].sort((a, b) => b.points - a.points);
  return sorted[0].reason;
}
