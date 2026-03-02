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
    label: "Friday Family Game Night",
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
    label: "Friday Night Mode",
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
    label: "Saturday Warm-Up",
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
    label: "Saturday Game Day",
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
    label: "Saturday Extra Time",
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
    label: "Sunday Morning Coffee",
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

export interface RitualOccurrence {
  ritual: Ritual;
  isActive: boolean;
  nextStartAt: Date;
  nextEndAt: Date;
}

function computeOccurrence(ritual: Ritual, now: Date): RitualOccurrence {
  const local = getLocalParts(now);
  const targetDow = ritual.days[0];
  const startH = ritual.startHour;
  const endH = ritual.endHour;
  const crossMidnight = endH <= startH;

  const daysBack = (local.dow - targetDow + 7) % 7;
  const currentOccDate = new Date(
    Date.UTC(local.year, local.month - 1, local.day - daysBack, 12),
  );
  const currentOccParts = getLocalParts(currentOccDate);
  const currentDayMidnight = midnightInTZ(
    currentOccParts.year,
    currentOccParts.month,
    currentOccParts.day,
  );
  const occStart = new Date(currentDayMidnight.getTime() + startH * 3600000);
  let occEnd: Date;
  if (crossMidnight) {
    occEnd = new Date(currentDayMidnight.getTime() + 86400000 + endH * 3600000);
  } else {
    const effectiveEnd = Math.min(endH, 24);
    occEnd = new Date(currentDayMidnight.getTime() + effectiveEnd * 3600000);
  }

  const nowMs = now.getTime();
  if (nowMs >= occStart.getTime() && nowMs < occEnd.getTime()) {
    return { ritual, isActive: true, nextStartAt: occStart, nextEndAt: occEnd };
  }

  if (nowMs >= occEnd.getTime()) {
    const nextDate = new Date(currentDayMidnight.getTime() + 7 * 86400000);
    const nextParts = getLocalParts(nextDate);
    const nextMidnight = midnightInTZ(nextParts.year, nextParts.month, nextParts.day);
    const nextStart = new Date(nextMidnight.getTime() + startH * 3600000);
    let nextEnd: Date;
    if (crossMidnight) {
      nextEnd = new Date(nextMidnight.getTime() + 86400000 + endH * 3600000);
    } else {
      nextEnd = new Date(nextMidnight.getTime() + Math.min(endH, 24) * 3600000);
    }
    return { ritual, isActive: false, nextStartAt: nextStart, nextEndAt: nextEnd };
  }

  return { ritual, isActive: false, nextStartAt: occStart, nextEndAt: occEnd };
}

export function getSortedRituals(now: Date): RitualOccurrence[] {
  const occurrences = RITUALS.map((r) => computeOccurrence(r, now));

  occurrences.sort((a, b) => {
    const aActive = a.isActive ? 0 : 1;
    const bActive = b.isActive ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    const aStart = a.nextStartAt.getTime();
    const bStart = b.nextStartAt.getTime();
    if (aStart !== bStart) return aStart - bStart;

    return a.ritual.id < b.ritual.id ? -1 : a.ritual.id > b.ritual.id ? 1 : 0;
  });

  if (__DEV__) {
    const fmtPT = (d: Date) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    console.log(
      "[RITUALS] Sorted order:",
      occurrences.map((o) => ({
        name: o.ritual.label,
        isActive: o.isActive,
        startAtPT: fmtPT(o.nextStartAt),
        endAtPT: fmtPT(o.nextEndAt),
      })),
    );
  }

  return occurrences;
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

const SPORT_RANK: Record<string, number> = {
  rugby: 1,
  cricket: 2,
  hockey: 3,
  soccer: 4,
};

function getSportRank(sport: string): number {
  return SPORT_RANK[sport] ?? 9;
}

const RUGBY_LADDER: { rank: number; match: (e: SportEvent) => boolean }[] = [
  { rank: 1, match: (e) => teamContains(e, "springboks") || teamContains(e, "south africa") },
  { rank: 2, match: (e) => isInternational(e, "rugby") },
  { rank: 3, match: (e) => teamContains(e, "stormers") },
  { rank: 4, match: (e) => leagueIs(e, "URC") },
  { rank: 5, match: (e) => leagueIs(e, "Top 14") },
  { rank: 6, match: (e) => leagueIs(e, "Japan League One") },
  { rank: 7, match: (e) => leagueIs(e, "Super Rugby") || leagueContains(e, "super rugby") },
  { rank: 8, match: (e) => leagueIs(e, "English Premiership") || leagueIs(e, "Premiership") || leagueContains(e, "premiership") },
];

const CRICKET_LADDER: { rank: number; match: (e: SportEvent) => boolean }[] = [
  { rank: 1, match: (e) => teamContains(e, "south africa") },
  { rank: 2, match: (e) => isInternational(e, "cricket") },
  { rank: 3, match: (e) => teamContains(e, "paarl royals") },
  { rank: 4, match: (e) => teamContains(e, "mi cape town") },
  { rank: 5, match: (e) => leagueContains(e, "sa20") || leagueContains(e, "sa t20") || leagueContains(e, "t20") },
  { rank: 6, match: (e) => leagueIs(e, "MLC") || leagueContains(e, "major league cricket") },
  { rank: 7, match: (e) => leagueContains(e, "caribbean") || leagueContains(e, "cpl") },
  { rank: 8, match: (e) => leagueIs(e, "IPL") || leagueContains(e, "indian premier") },
];

const HOCKEY_LADDER: { rank: number; match: (e: SportEvent) => boolean }[] = [
  { rank: 1, match: (e) => teamContains(e, "usa") || teamContains(e, "united states") },
  { rank: 2, match: (e) => teamContains(e, "anaheim") || (teamContains(e, "ducks") && leagueIs(e, "NHL")) },
  { rank: 3, match: (e) => teamContains(e, "san diego gulls") || (teamContains(e, "gulls") && leagueIs(e, "AHL")) },
  { rank: 4, match: (e) => teamContains(e, "tulsa oilers") || (teamContains(e, "oilers") && leagueIs(e, "ECHL")) },
  { rank: 5, match: (e) => leagueIs(e, "NHL") },
  { rank: 6, match: (e) => leagueIs(e, "AHL") },
  { rank: 7, match: (e) => leagueIs(e, "ECHL") },
  { rank: 8, match: (e) => leagueIs(e, "NCAA Hockey") || leagueIs(e, "NCAA") || leagueContains(e, "ncaa") },
];

const SOCCER_LADDER: { rank: number; match: (e: SportEvent) => boolean }[] = [
  { rank: 1, match: (e) => teamContains(e, "south africa") || teamContains(e, "bafana") },
  { rank: 2, match: (e) => teamContains(e, "tottenham") || teamContains(e, "spurs") },
  { rank: 3, match: (e) => leagueIs(e, "EPL") || leagueContains(e, "premier league") },
  { rank: 4, match: (e) => leagueIs(e, "Serie A") || leagueContains(e, "serie a") },
  { rank: 5, match: (e) => leagueIs(e, "La Liga") || leagueContains(e, "la liga") },
  { rank: 6, match: (e) => leagueIs(e, "Bundesliga") || leagueContains(e, "bundesliga") },
  { rank: 7, match: (e) => leagueIs(e, "Ligue 1") || leagueContains(e, "ligue 1") },
  { rank: 8, match: (e) => leagueIs(e, "MLS") },
  { rank: 9, match: (e) => leagueIs(e, "USL") || leagueContains(e, "usl") },
];

const SPORT_LADDERS: Record<string, { rank: number; match: (e: SportEvent) => boolean }[]> = {
  rugby: RUGBY_LADDER,
  cricket: CRICKET_LADDER,
  hockey: HOCKEY_LADDER,
  soccer: SOCCER_LADDER,
};

function teamContains(e: SportEvent, needle: string): boolean {
  const h = (e.homeTeam || "").toLowerCase();
  const a = (e.awayTeam || "").toLowerCase();
  return h.includes(needle) || a.includes(needle);
}

function leagueIs(e: SportEvent, name: string): boolean {
  return (e.league || "") === name;
}

function leagueContains(e: SportEvent, needle: string): boolean {
  return (e.league || "").toLowerCase().includes(needle);
}

function isInternational(e: SportEvent, sport: string): boolean {
  if (e.competitionType === "international") return true;
  const l = (e.league || "").toLowerCase();
  if (sport === "rugby") {
    return l.includes("six nations") || l.includes("rugby championship") || l.includes("test") || l.includes("international");
  }
  if (sport === "cricket") {
    return l.includes("international") || l.includes("test") || l.includes("odi") || l.includes("t20i");
  }
  return false;
}

function getLadderRank(e: SportEvent): number {
  const ladder = SPORT_LADDERS[e.sport];
  if (!ladder) return 99;
  for (const rung of ladder) {
    if (rung.match(e)) return rung.rank;
  }
  return 99;
}

export interface FeaturedScore {
  sportRank: number;
  ladderRank: number;
  isFavorite: boolean;
  isLive: boolean;
  startTime: string;
  id: string;
}

export function computeFeaturedScore(e: SportEvent, favorites: Favorites, now: Date): FeaturedScore {
  return {
    sportRank: getSportRank(e.sport),
    ladderRank: getLadderRank(e),
    isFavorite: favoriteInvolved(e, favorites),
    isLive: isEventLive(e, now),
    startTime: e.startTimeLocal,
    id: e.id,
  };
}

function featuredSort(
  a: SportEvent,
  b: SportEvent,
  favorites: Favorites,
  now: Date,
): number {
  const sa = computeFeaturedScore(a, favorites, now);
  const sb = computeFeaturedScore(b, favorites, now);

  if (sa.sportRank !== sb.sportRank) return sa.sportRank - sb.sportRank;
  if (sa.ladderRank !== sb.ladderRank) return sa.ladderRank - sb.ladderRank;

  const aFav = sa.isFavorite ? 0 : 1;
  const bFav = sb.isFavorite ? 0 : 1;
  if (aFav !== bFav) return aFav - bFav;

  const aLive = sa.isLive ? 0 : 1;
  const bLive = sb.isLive ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  const aStart = new Date(sa.startTime).getTime();
  const bStart = new Date(sb.startTime).getTime();
  if (aStart !== bStart) return aStart - bStart;

  return sa.id < sb.id ? -1 : sa.id > sb.id ? 1 : 0;
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

export function isNowInAnyRitualWindow(now: Date): { inRitual: boolean; ritualId: string | null } {
  for (const ritual of RITUALS) {
    const occ = computeOccurrence(ritual, now);
    if (occ.isActive) {
      return { inRitual: true, ritualId: ritual.id };
    }
  }
  return { inRitual: false, ritualId: null };
}
