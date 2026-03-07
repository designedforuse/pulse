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
    label: "Family Game Night",
    icon: "game-controller",
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
    icon: "partly-sunny",
    sports: ["rugby", "cricket", "soccer", "racing"],
    days: [6],
    startHour: 6,
    endHour: 12,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "saturday_spotlight",
    label: "Saturday Game Day",
    icon: "sunny",
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
    sports: ["hockey", "basketball", "soccer", "rugby", "cricket", "racing"],
    days: [6],
    startHour: 20,
    endHour: 24,
    context: "w/ friends",
    concurrency: "multi",
  },
  {
    id: "sunday_session",
    label: "Sunday Coffee & Chill",
    icon: "cafe",
    sports: ["rugby", "cricket", "soccer", "racing"],
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
  const y = currentOccParts.year;
  const mo = currentOccParts.month;
  const da = currentOccParts.day;
  const occStart = localHourToUtc(y, mo, da, startH);
  let occEnd: Date;
  if (crossMidnight) {
    const nextD = new Date(Date.UTC(y, mo - 1, da + 1, 12));
    const np = getLocalParts(nextD);
    occEnd = localHourToUtc(np.year, np.month, np.day, endH);
  } else {
    const effectiveEnd = Math.min(endH, 24);
    if (effectiveEnd === 24) {
      const nextD = new Date(Date.UTC(y, mo - 1, da + 1, 12));
      const np = getLocalParts(nextD);
      occEnd = midnightInTZ(np.year, np.month, np.day);
    } else {
      occEnd = localHourToUtc(y, mo, da, effectiveEnd);
    }
  }

  const nowMs = now.getTime();
  if (nowMs >= occStart.getTime() && nowMs < occEnd.getTime()) {
    return { ritual, isActive: true, nextStartAt: occStart, nextEndAt: occEnd };
  }

  if (nowMs >= occEnd.getTime()) {
    const nextDate = new Date(Date.UTC(y, mo - 1, da + 7, 12));
    const nextParts = getLocalParts(nextDate);
    const ny = nextParts.year;
    const nm = nextParts.month;
    const nd = nextParts.day;
    const nextStart = localHourToUtc(ny, nm, nd, startH);
    let nextEnd: Date;
    if (crossMidnight) {
      const dayAfter = new Date(Date.UTC(ny, nm - 1, nd + 1, 12));
      const dap = getLocalParts(dayAfter);
      nextEnd = localHourToUtc(dap.year, dap.month, dap.day, endH);
    } else {
      const eEnd = Math.min(endH, 24);
      if (eEnd === 24) {
        const dayAfter = new Date(Date.UTC(ny, nm - 1, nd + 1, 12));
        const dap = getLocalParts(dayAfter);
        nextEnd = midnightInTZ(dap.year, dap.month, dap.day);
      } else {
        nextEnd = localHourToUtc(ny, nm, nd, eEnd);
      }
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

function localHourToUtc(year: number, month: number, day: number, hour: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour + 8, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(guess);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  const localH = get("hour") === 24 ? 0 : get("hour");
  const diff = localH - hour;
  if (diff === 0) return guess;
  return new Date(guess.getTime() - diff * 3600000);
}

function midnightInTZ(year: number, month: number, day: number): Date {
  return localHourToUtc(year, month, day, 0);
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
  const nextDayStart = midnightInTZ(
    targetParts.month === 12 && targetParts.day === 31 ? targetParts.year + 1 : targetParts.year,
    targetParts.month === 12 && targetParts.day === 31 ? 1 : targetParts.month,
    targetParts.month === 12 && targetParts.day === 31 ? 1 : targetParts.day + 1,
  );
  const dayEnd = new Date(nextDayStart.getTime() - 1);

  const windowStart = localHourToUtc(targetParts.year, targetParts.month, targetParts.day, startHour);
  const effectiveEnd = Math.min(endHour, 24);
  const windowEnd = effectiveEnd === 24
    ? nextDayStart
    : localHourToUtc(targetParts.year, targetParts.month, targetParts.day, effectiveEnd);

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
  const eventEndMs = getEffectiveEventEnd(event, now).getTime();

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
  racing: 5,
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

const RACING_LADDER: { rank: number; match: (e: SportEvent) => boolean }[] = [
  { rank: 1, match: (e) => teamContains(e, "race") },
  { rank: 2, match: (e) => teamContains(e, "sprint") },
  { rank: 3, match: (e) => teamContains(e, "qualifying") },
  { rank: 4, match: (e) => teamContains(e, "practice") },
];

const SPORT_LADDERS: Record<string, { rank: number; match: (e: SportEvent) => boolean }[]> = {
  rugby: RUGBY_LADDER,
  cricket: CRICKET_LADDER,
  hockey: HOCKEY_LADDER,
  soccer: SOCCER_LADDER,
  racing: RACING_LADDER,
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

function getEffectiveEventEnd(event: SportEvent, now: Date): Date {
  const estimatedEnd = getEventEnd(event);
  if (now > estimatedEnd && isEventLive(event, now)) {
    return new Date(now.getTime() + 30 * 60 * 1000);
  }
  return estimatedEnd;
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

  const maxLookback = 12 * 3600000;
  const candidateStart = w.windowStartUtc.getTime() - maxLookback;
  const candidateEnd = w.windowEndUtc.getTime();
  const dayMatched = sportMatched.filter((e) => {
    const eventMs = new Date(e.startTimeLocal).getTime();
    return eventMs >= candidateStart && eventMs < candidateEnd;
  });

  const overlapMatched = dayMatched.filter((e) => {
    const eventStartMs = new Date(e.startTimeLocal).getTime();
    const eventEndMs = getEffectiveEventEnd(e, now).getTime();
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
