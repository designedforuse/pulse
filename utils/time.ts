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

export function isEventLive(event: SportEvent, now: Date): boolean {
  const start = new Date(event.startTimeLocal);
  const end = getEventEnd(event);
  return now >= start && now <= end;
}

export function isEventCompleted(event: SportEvent, now: Date): boolean {
  const end = getEventEnd(event);
  return now > end;
}

export function isEventUpNext(event: SportEvent, now: Date): boolean {
  const start = new Date(event.startTimeLocal);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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
