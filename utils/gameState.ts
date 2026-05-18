import type { SportEvent } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { isEventLive, isEventCompleted, getEventEnd, formatTimeSinceStart, isMultiDayLiveEvent } from "@/utils/time";
import { getRugbyClockDisplay } from "@/utils/rugbyClock";

export type GameState = "FINAL" | "LIVE" | "UPCOMING";

export interface NormalizedGameState {
  gameState: GameState;
  displayClockText: string | null;
  displayStatusText: string | null;
}

const FINAL_KEYWORDS = [
  "final",
  "ft",
  "ended",
  "full time",
  "completed",
  "f/ot",
  "f/so",
  "game over",
];

const LIVE_KEYWORDS = [
  "live",
  "in progress",
  "in-progress",
  "started",
  "active",
];

function matchesKeywords(value: string | undefined, keywords: string[]): boolean {
  if (!value) return false;
  const lower = value.trim().toLowerCase();
  return keywords.some((kw) => lower === kw || lower.startsWith(kw));
}

export function normalizeGameState(
  event: SportEvent,
  score: ScoreData | undefined,
  now: Date,
): NormalizedGameState {
  if (score) {
    if (matchesKeywords(score.status, FINAL_KEYWORDS) || matchesKeywords(score.period, FINAL_KEYWORDS)) {
      const statusText = score.period || "FT";
      return { gameState: "FINAL", displayClockText: null, displayStatusText: statusText };
    }

    // Hockey: P3 at 00:00 with a non-tied score is effectively final — the API
    // sometimes stays "live" for a brief window after the buzzer.
    const isHockey = event.sport === "hockey" || event.sport === "Hockey";
    const clockIsZero = score.clock === "00:00" || score.secondsRemaining === 0;
    const inRegulationThird = score.periodNumber === 3 || score.period === "P3";
    const scoresNotTied = score.awayScore !== score.homeScore;
    if (isHockey && clockIsZero && inRegulationThird && scoresNotTied) {
      return { gameState: "FINAL", displayClockText: null, displayStatusText: "Final" };
    }

    // Trust an explicit "live" score status regardless of the event's scheduled end time.
    // Time-based completion is only a fallback; real-time score data takes priority.
    const hasExplicitLiveStatus = matchesKeywords(score.status, LIVE_KEYWORDS);
    if (hasExplicitLiveStatus || (!isEventCompleted(event, now) && (score.clock || score.period))) {
      let clockText: string | null = null;

      if (event.sport === "rugby" || event.sport === "Rugby") {
        clockText = getRugbyClockDisplay(score) || null;
      } else if (event.sport === "cricket") {
        const elapsed = formatTimeSinceStart(event.startTimeLocal, now);
        clockText = elapsed || null;
      } else if (score.period || score.clock) {
        clockText = [score.period, score.clock].filter(Boolean).join(" · ");
      }

      if (!clockText && event.sport !== "cricket") {
        const elapsed = formatTimeSinceStart(event.startTimeLocal, now);
        clockText = elapsed || null;
      }

      return { gameState: "LIVE", displayClockText: clockText, displayStatusText: null };
    }
  }

  if (isEventLive(event, now)) {
    // Multi-day events (cycling Grand Tours, marathon weekends) shouldn't show
    // an "elapsed since tour start" counter — that would read "Started 240h ago"
    // mid-tour. Show a simple "Live stage" label instead.
    if (isMultiDayLiveEvent(event)) {
      return { gameState: "LIVE", displayClockText: null, displayStatusText: "Live stage" };
    }
    const elapsed = formatTimeSinceStart(event.startTimeLocal, now);
    return { gameState: "LIVE", displayClockText: elapsed || null, displayStatusText: null };
  }

  const end = getEventEnd(event);
  if (now > end) {
    return { gameState: "FINAL", displayClockText: null, displayStatusText: "FT" };
  }

  return { gameState: "UPCOMING", displayClockText: null, displayStatusText: null };
}
