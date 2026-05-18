import type { SportEvent } from "@/lib/data";

const DEFAULT_DURATIONS: Record<string, number> = {
  hockey: 2 * 60 + 45,
  soccer: 2 * 60 + 15,
  rugby: 2 * 60 + 15,
  cricket: 8 * 60,
  golf: 10 * 60,
  tennis: 4 * 60,
  athletics: 4 * 60,
  racing: 4 * 60,
  baseball: 3 * 60 + 30,
  basketball: 2 * 60 + 30,
};

function getDefaultDurationMs(sport: string): number {
  const minutes = DEFAULT_DURATIONS[sport] ?? 120;
  return minutes * 60 * 1000;
}

export function getEventEnd(event: SportEvent): Date {
  if (event.endTimeLocal) {
    return new Date(event.endTimeLocal);
  }
  const start = new Date(event.startTimeLocal);
  return new Date(start.getTime() + getDefaultDurationMs(event.sport));
}

// Events whose end-to-start span exceeds this are treated as multi-day
// tournaments (cycling Grand Tours, marathon weekends, etc). For these,
// the time-based LIVE window is restricted to a daily "stage window"
// derived from the start-of-day time, so the LIVE badge doesn't stay on
// for the entire multi-week event.
const MULTI_DAY_THRESHOLD_MS = 36 * 60 * 60 * 1000;
const DAILY_STAGE_WINDOW_MS = 5 * 60 * 60 * 1000;

function isMultiDayEvent(start: Date, end: Date): boolean {
  return end.getTime() - start.getTime() > MULTI_DAY_THRESHOLD_MS;
}

function isWithinDailyStageWindow(start: Date, end: Date, now: Date): boolean {
  if (now < start || now > end) return false;
  // Build today's stage window using the start-of-tour UTC time-of-day.
  const todayStageStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
    0,
    0,
  ));
  const todayStageEnd = new Date(todayStageStart.getTime() + DAILY_STAGE_WINDOW_MS);
  return now >= todayStageStart && now <= todayStageEnd;
}

function isCyclingRestDay(event: SportEvent, now: Date): boolean {
  const restDays = (event as SportEvent & { cyclingRestDays?: string[] }).cyclingRestDays;
  if (!Array.isArray(restDays) || restDays.length === 0) return false;
  const todayIso = now.toISOString().slice(0, 10);
  return restDays.includes(todayIso);
}

export function isEventLive(event: SportEvent, now: Date): boolean {
  const start = new Date(event.startTimeLocal);
  const end = getEventEnd(event);
  if (isMultiDayEvent(start, end)) {
    if (isCyclingRestDay(event, now)) return false;
    return isWithinDailyStageWindow(start, end, now);
  }
  return now >= start && now <= end;
}

export function isMultiDayLiveEvent(event: SportEvent): boolean {
  const start = new Date(event.startTimeLocal);
  const end = getEventEnd(event);
  return isMultiDayEvent(start, end);
}

export function isEventCompleted(event: SportEvent, now: Date): boolean {
  const end = getEventEnd(event);
  return now > end;
}

export function isEventUpNext(event: SportEvent, now: Date): boolean {
  const start = new Date(event.startTimeLocal);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return start > now && start <= windowEnd;
}

export function getLiveEventsNow(events: SportEvent[], now: Date): SportEvent[] {
  return events.filter((e) => isEventLive(e, now));
}

export function getUpNextEvents(events: SportEvent[], now: Date): SportEvent[] {
  return events
    .filter((e) => isEventUpNext(e, now))
    .sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
}

export function formatLastUpdated(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes}:${seconds} ${ampm}`;
}

export function formatTimeUntilStart(startTimeLocal: string, now: Date): string {
  const start = new Date(startTimeLocal);
  const diffMs = start.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) {
    return `in ${diffMin}m`;
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
}

export function formatTimeSinceStart(startTimeLocal: string, now: Date): string {
  const start = new Date(startTimeLocal);
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return "";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just started";
  if (diffMin < 60) return `Started ${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `Started ${hours}h ${mins}m ago` : `Started ${hours}h ago`;
}
