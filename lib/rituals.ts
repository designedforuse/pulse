import type { SportEvent, Favorites } from "@/lib/data";
import { isEventLive } from "@/utils/time";
import { getEventEnd } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import type { Ionicons } from "@expo/vector-icons";

const TZ = "America/Los_Angeles";

export interface Ritual {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  sports: string[];
  days: number[];
  startHour: number;
  endHour: number;
  context: string;
  concurrency: "single" | "multi";
}

export const RITUALS: Ritual[] = [
  {
    id: "friday_lights",
    label: "Friday Lights",
    icon: "moon",
    sports: ["hockey", "basketball", "soccer"],
    days: [5],
    startHour: 18,
    endHour: 21,
    context: "w/ kids",
    concurrency: "single",
  },
  {
    id: "friday_after_hours",
    label: "Friday After Hours",
    icon: "moon",
    sports: ["rugby", "cricket"],
    days: [5],
    startHour: 21,
    endHour: 24,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "saturday_sunrise",
    label: "Saturday Sunrise",
    icon: "sunny",
    sports: ["rugby", "cricket", "soccer"],
    days: [6],
    startHour: 6,
    endHour: 12,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "saturday_spotlight",
    label: "Saturday Spotlight",
    icon: "partly-sunny",
    sports: ["hockey", "basketball", "soccer"],
    days: [6],
    startHour: 16,
    endHour: 20,
    context: "w/ family",
    concurrency: "multi",
  },
  {
    id: "saturday_after_hours",
    label: "Saturday After Hours",
    icon: "moon",
    sports: ["hockey", "basketball", "soccer", "rugby", "cricket"],
    days: [6],
    startHour: 20,
    endHour: 24,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "sunday_session",
    label: "Sunday Session",
    icon: "sunny",
    sports: ["rugby", "cricket", "soccer"],
    days: [0],
    startHour: 6,
    endHour: 12,
    context: "alone",
    concurrency: "single",
  },
];

export function getRitualById(id: string): Ritual | undefined {
  return RITUALS.find((r) => r.id === id);
}

function getLocalParts(d: Date): { year: number; month: number; day: number; dow: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const hourVal = parseInt(get("hour"), 10);
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    dow: dayMap[get("weekday")] ?? 0,
    hour: hourVal === 24 ? 0 : hourVal,
    minute: parseInt(get("minute"), 10),
  };
}

function midnightInTZ(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(guess);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  const localH = get("hour") === 24 ? 0 : get("hour");
  const localM = get("minute");
  const localS = get("second");

  const offsetMs = (localH * 3600 + localM * 60 + localS) * 1000;
  const candidate = new Date(guess.getTime() - offsetMs);

  const verify = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(candidate);

  const verifyDay = parseInt(verify.find((p) => p.type === "day")?.value || "0", 10);
  const verifyHour = parseInt(verify.find((p) => p.type === "hour")?.value || "0", 10);

  if (verifyDay !== day) {
    return new Date(candidate.getTime() + (verifyDay < day ? 86400000 : -86400000));
  }
  if (verifyHour !== 0 && verifyHour !== 24) {
    return new Date(candidate.getTime() - verifyHour * 3600000);
  }

  return candidate;
}

export interface GuideDayWindow {
  dayStartUtc: Date;
  dayEndUtc: Date;
  windowStartUtc: Date;
  windowEndUtc: Date;
  ptDate: string;
}

export function getGuideDayWindow(
  targetDow: number,
  startHour: number,
  endHour: number,
  now: Date,
): GuideDayWindow {
  const local = getLocalParts(now);
  const currentDow = local.dow;

  let daysAhead = targetDow - currentDow;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0) {
    const effectiveEndHour = endHour <= 24 ? endHour : 24;
    if (local.hour >= effectiveEndHour) {
      daysAhead = 7;
    }
  }

  const targetDate = new Date(Date.UTC(local.year, local.month - 1, local.day + daysAhead, 12));
  const targetParts = getLocalParts(targetDate);

  const dayStart = midnightInTZ(targetParts.year, targetParts.month, targetParts.day);
  const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);

  const windowStart = new Date(dayStart.getTime() + startHour * 3600000);
  const effectiveEnd = Math.min(endHour, 24);
  const windowEnd = new Date(dayStart.getTime() + effectiveEnd * 3600000);

  const ptDate = `${targetParts.year}-${String(targetParts.month).padStart(2, "0")}-${String(targetParts.day).padStart(2, "0")}`;

  return {
    dayStartUtc: dayStart,
    dayEndUtc: dayEnd,
    windowStartUtc: windowStart,
    windowEndUtc: windowEnd,
    ptDate,
  };
}

export type ExcludeReason = "wrong-sport" | "wrong-day" | "no-overlap";

export function classifyEventForRitual(
  event: SportEvent,
  ritual: Ritual,
  now: Date,
): { included: boolean; reason?: ExcludeReason } {
  if (!ritual.sports.includes(event.sport)) {
    return { included: false, reason: "wrong-sport" };
  }

  const targetDow = ritual.days[0];
  const w = getGuideDayWindow(targetDow, ritual.startHour, ritual.endHour, now);

  const eventStartMs = new Date(event.startTimeLocal).getTime();
  const eventEndMs = getEventEnd(event).getTime();

  const eventStartParts = getLocalParts(new Date(eventStartMs));
  const onTargetDay = eventStartMs >= w.dayStartUtc.getTime() && eventStartMs <= w.dayEndUtc.getTime();

  if (!onTargetDay) {
    return { included: false, reason: "wrong-day" };
  }

  const overlaps = eventStartMs < w.windowEndUtc.getTime() && eventEndMs > w.windowStartUtc.getTime();

  if (!overlaps) {
    return { included: false, reason: "no-overlap" };
  }

  return { included: true };
}

const SPORT_WEIGHT: Record<string, number> = {
  rugby: 1,
  cricket: 2,
};

function getSportWeight(sport: string): number {
  return SPORT_WEIGHT[sport] ?? 3;
}

function featuredSort(
  a: SportEvent,
  b: SportEvent,
  favorites: Favorites,
  now: Date,
): number {
  const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
  const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
  if (aFav !== bFav) return aFav - bFav;

  const aSport = getSportWeight(a.sport);
  const bSport = getSportWeight(b.sport);
  if (aSport !== bSport) return aSport - bSport;

  const aLive = isEventLive(a, now) ? 0 : 1;
  const bLive = isEventLive(b, now) ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
}

export interface RitualFilterDebug {
  ritualId: string;
  totalEvents: number;
  afterSportFilter: number;
  afterDayFilter: number;
  afterOverlapFilter: number;
  window: {
    ptDate: string;
    windowStartUtc: string;
    windowEndUtc: string;
  };
}

export function getEventsForRitual(
  allEvents: SportEvent[],
  ritual: Ritual,
  favorites: Favorites,
  now: Date,
): { featured: SportEvent | null; rest: SportEvent[]; debug: RitualFilterDebug } {
  const targetDow = ritual.days[0];
  const w = getGuideDayWindow(targetDow, ritual.startHour, ritual.endHour, now);

  const sportMatched = allEvents.filter((e) => ritual.sports.includes(e.sport));

  const dayMatched = sportMatched.filter((e) => {
    const eventMs = new Date(e.startTimeLocal).getTime();
    return eventMs >= w.dayStartUtc.getTime() && eventMs <= w.dayEndUtc.getTime();
  });

  const overlapMatched = dayMatched.filter((e) => {
    const eventStartMs = new Date(e.startTimeLocal).getTime();
    const eventEndMs = getEventEnd(e).getTime();
    return eventStartMs < w.windowEndUtc.getTime() && eventEndMs > w.windowStartUtc.getTime();
  });

  const debug: RitualFilterDebug = {
    ritualId: ritual.id,
    totalEvents: allEvents.length,
    afterSportFilter: sportMatched.length,
    afterDayFilter: dayMatched.length,
    afterOverlapFilter: overlapMatched.length,
    window: {
      ptDate: w.ptDate,
      windowStartUtc: w.windowStartUtc.toISOString(),
      windowEndUtc: w.windowEndUtc.toISOString(),
    },
  };

  if (overlapMatched.length === 0) return { featured: null, rest: [], debug };

  const sorted = [...overlapMatched].sort((a, b) => featuredSort(a, b, favorites, now));

  const featured = sorted[0];
  const rest = sorted.slice(1);

  return { featured, rest, debug };
}

export function formatRitualTimeWindow(ritual: Ritual): string {
  const dayNames: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
  const days = ritual.days.map((d) => dayNames[d]).join(", ");
  const fmtH = (h: number) => {
    const h12 = h % 12 || 12;
    const ampm = h < 12 || h === 24 ? "AM" : "PM";
    return `${h12} ${ampm}`;
  };
  return `${days} ${fmtH(ritual.startHour)}–${fmtH(ritual.endHour)} PT`;
}

export function formatRitualSports(ritual: Ritual): string {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return ritual.sports.map(capitalize).join(", ");
}
