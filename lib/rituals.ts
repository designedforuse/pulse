import type { SportEvent, Favorites } from "@/lib/data";
import { isEventLive } from "@/utils/time";
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
    id: "friday_bonding",
    label: "Friday Bonding",
    icon: "moon",
    sports: ["hockey", "basketball", "soccer"],
    days: [5],
    startHour: 18,
    endHour: 21,
    context: "w/ kids",
    concurrency: "single",
  },
  {
    id: "friday_lean_in",
    label: "Friday Lean In",
    icon: "moon",
    sports: ["rugby", "cricket"],
    days: [5],
    startHour: 21,
    endHour: 24,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "saturday_lean_in",
    label: "Saturday Lean In",
    icon: "sunny",
    sports: ["rugby", "cricket", "soccer"],
    days: [6],
    startHour: 6,
    endHour: 12,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "saturday_bonding",
    label: "Saturday Bonding",
    icon: "partly-sunny",
    sports: ["hockey", "basketball", "soccer"],
    days: [6],
    startHour: 14,
    endHour: 19,
    context: "w/ family",
    concurrency: "multi",
  },
  {
    id: "sunday_funday",
    label: "Sunday Funday",
    icon: "sunny",
    sports: ["rugby", "cricket", "soccer"],
    days: [0],
    startHour: 6,
    endHour: 9,
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
  timeWindowStartUtc: Date;
  timeWindowEndUtc: Date;
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

  const timeStart = new Date(dayStart.getTime() + startHour * 3600000);
  const effectiveEnd = Math.min(endHour, 24);
  const timeEnd = new Date(dayStart.getTime() + effectiveEnd * 3600000 - 1);

  const ptDate = `${targetParts.year}-${String(targetParts.month).padStart(2, "0")}-${String(targetParts.day).padStart(2, "0")}`;

  return {
    dayStartUtc: dayStart,
    dayEndUtc: dayEnd,
    timeWindowStartUtc: timeStart,
    timeWindowEndUtc: timeEnd,
    ptDate,
  };
}

export function isEventInRitual(event: SportEvent, ritual: Ritual, now: Date): boolean {
  if (!ritual.sports.includes(event.sport)) return false;

  const targetDow = ritual.days[0];
  const window = getGuideDayWindow(targetDow, ritual.startHour, ritual.endHour, now);

  const eventMs = new Date(event.startTimeLocal).getTime();

  if (eventMs < window.timeWindowStartUtc.getTime() || eventMs > window.timeWindowEndUtc.getTime()) {
    return false;
  }

  return true;
}

const LEAGUE_PRIORITY: Record<string, number> = {
  NHL: 15,
  EPL: 15,
  "Serie A": 12,
  "La Liga": 12,
  Bundesliga: 10,
  "Ligue 1": 10,
  URC: 12,
  "Top 14": 10,
  "Six Nations": 15,
  "Super Rugby": 8,
  MLS: 8,
  AHL: 5,
  ECHL: 3,
  "NCAA Hockey": 5,
  "T20 World Cup": 15,
};

export function scoreEvent(
  event: SportEvent,
  favorites: Favorites,
  now: Date,
): number {
  let score = 0;

  if (favoriteInvolved(event, favorites)) score += 100;

  if (isEventLive(event, now)) score += 50;

  const startMs = new Date(event.startTimeLocal).getTime();
  const diffMs = startMs - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 0 && diffHours <= 2) score += 25;
  else if (diffHours > 2 && diffHours <= 6) score += 10;

  score += LEAGUE_PRIORITY[event.league] ?? 0;

  return score;
}

export interface RitualFilterDebug {
  ritualId: string;
  totalEvents: number;
  afterSportFilter: number;
  afterDayFilter: number;
  afterTimeFilter: number;
  window: {
    ptDate: string;
    timeWindowStartUtc: string;
    timeWindowEndUtc: string;
  };
}

export function getEventsForRitual(
  allEvents: SportEvent[],
  ritual: Ritual,
  favorites: Favorites,
  now: Date,
): { featured: SportEvent | null; rest: SportEvent[]; debug: RitualFilterDebug } {
  const targetDow = ritual.days[0];
  const window = getGuideDayWindow(targetDow, ritual.startHour, ritual.endHour, now);

  const sportMatched = allEvents.filter((e) => ritual.sports.includes(e.sport));

  const dayMatched = sportMatched.filter((e) => {
    const eventMs = new Date(e.startTimeLocal).getTime();
    return eventMs >= window.dayStartUtc.getTime() && eventMs <= window.dayEndUtc.getTime();
  });

  const timeMatched = dayMatched.filter((e) => {
    const eventMs = new Date(e.startTimeLocal).getTime();
    return eventMs >= window.timeWindowStartUtc.getTime() && eventMs <= window.timeWindowEndUtc.getTime();
  });

  const debug: RitualFilterDebug = {
    ritualId: ritual.id,
    totalEvents: allEvents.length,
    afterSportFilter: sportMatched.length,
    afterDayFilter: dayMatched.length,
    afterTimeFilter: timeMatched.length,
    window: {
      ptDate: window.ptDate,
      timeWindowStartUtc: window.timeWindowStartUtc.toISOString(),
      timeWindowEndUtc: window.timeWindowEndUtc.toISOString(),
    },
  };

  if (timeMatched.length === 0) return { featured: null, rest: [], debug };

  const scored = timeMatched.map((e) => ({
    event: e,
    score: scoreEvent(e, favorites, now),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.event.startTimeLocal).getTime() - new Date(b.event.startTimeLocal).getTime();
  });

  const featured = scored[0].event;
  const rest = scored.slice(1).map((s) => s.event);

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
