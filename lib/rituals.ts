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

function getLocalPT(d: Date): { dow: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const hourVal = parseInt(get("hour"), 10);
  return {
    dow: dayMap[get("weekday")] ?? 0,
    hour: hourVal === 24 ? 0 : hourVal,
    minute: parseInt(get("minute"), 10),
  };
}

export function isEventInRitual(event: SportEvent, ritual: Ritual): boolean {
  if (!ritual.sports.includes(event.sport)) return false;

  const startDate = new Date(event.startTimeLocal);
  const local = getLocalPT(startDate);

  if (!ritual.days.includes(local.dow)) return false;

  if (ritual.endHour <= 24) {
    if (local.hour < ritual.startHour || local.hour >= ritual.endHour) return false;
  } else {
    const endNorm = ritual.endHour - 24;
    if (local.hour < ritual.startHour && local.hour >= endNorm) return false;
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

export function getEventsForRitual(
  allEvents: SportEvent[],
  ritual: Ritual,
  favorites: Favorites,
  now: Date,
): { featured: SportEvent | null; rest: SportEvent[] } {
  const matching = allEvents.filter((e) => isEventInRitual(e, ritual));

  if (matching.length === 0) return { featured: null, rest: [] };

  const scored = matching.map((e) => ({
    event: e,
    score: scoreEvent(e, favorites, now),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.event.startTimeLocal).getTime() - new Date(b.event.startTimeLocal).getTime();
  });

  const featured = scored[0].event;
  const rest = scored.slice(1).map((s) => s.event);

  return { featured, rest };
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
