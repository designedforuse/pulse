import type { ScoreData } from "@/lib/scores-context";

export function getRugbyClockDisplay(score: ScoreData): string {
  let period = score.period || "";
  let clock = score.clock || "";

  if (/^live$/i.test(clock)) {
    clock = "";
  }
  if (period && clock && period.trim() === clock.trim()) {
    period = "";
  }

  if (period === "HT" || period === "FT") return period;
  if (period && clock) return `${period} ${clock}`;
  if (clock) return clock;
  return "";
}
