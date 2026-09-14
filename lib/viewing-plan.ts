import type { SportEvent } from "@/lib/data";
import {
  getSerieAMatchIdentity,
  getSerieAMatchIdentityAliases,
  getSerieATeamSeasonIdentity,
  isSerieAEvent,
  type SerieAMatchLike,
} from "@/lib/serie-a-identity";

export type ViewingPlanChoice = "live" | "highlights";

export interface ViewingPlanSnapshot {
  eventId: string;
  matchKey: string;
  identityAliases: string[];
  choice: ViewingPlanChoice;
  sport: "soccer";
  league: "Serie A";
  leagueKey: "seriea";
  awayTeam: string;
  homeTeam: string;
  startTimeLocal: string;
  endTimeLocal?: string;
  providerId: string;
  providerReason?: string;
  savedAt: string;
  detailsUpdatedAt: string;
  detailsAvailable: boolean;
}

export interface ViewingPlanPersistedState {
  version: 1;
  items: ViewingPlanSnapshot[];
}

export interface LocalCalendarWeekBounds {
  start: Date;
  endExclusive: Date;
}

/**
 * Return the local-calendar Monday boundary for the week containing `value`.
 * This deliberately uses local Date setters so a Sunday/Monday boundary is
 * based on the viewer's device timezone rather than UTC.
 */
export function getLocalMondayWeekBounds(value: Date | number): LocalCalendarWeekBounds {
  const date = new Date(value);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 7);
  return { start, endExclusive };
}

export type ViewingPlanTab = "week" | "upcoming";

/**
 * Keep unavailable snapshots discoverable even when their old kickoff falls
 * outside the selected range or the user has selected a different team.
 */
export function isViewingPlanItemVisible(
  item: ViewingPlanSnapshot,
  tab: ViewingPlanTab,
  now: Date | number,
  week: LocalCalendarWeekBounds,
  teamFilter: string | null,
  isLive: boolean,
): boolean {
  if (!item.detailsAvailable) return true;

  const nowMs = new Date(now).getTime();
  const startMs = new Date(item.startTimeLocal).getTime();
  if (!Number.isFinite(startMs)) return tab === "upcoming";

  const inTab =
    tab === "week"
      ? startMs >= week.start.getTime() && startMs < week.endExclusive.getTime()
      : isLive || startMs >= nowMs;
  if (!inTab) return false;

  return !teamFilter || item.awayTeam === teamFilter || item.homeTeam === teamFilter;
}

const MAX_PERSISTED_ITEMS = 100;

function validChoice(value: unknown): value is ViewingPlanChoice {
  return value === "live" || value === "highlights";
}

function asMatchLike(item: ViewingPlanSnapshot): SerieAMatchLike {
  return {
    id: item.eventId,
    league: item.league,
    leagueKey: item.leagueKey,
    homeTeam: item.homeTeam,
    awayTeam: item.awayTeam,
    startTimeLocal: item.startTimeLocal,
  };
}

function aliasesForItem(item: ViewingPlanSnapshot): string[] {
  return [
    ...(Array.isArray(item.identityAliases) ? item.identityAliases : []),
    item.matchKey,
    ...getSerieAMatchIdentityAliases(asMatchLike(item)),
  ].filter((key): key is string => typeof key === "string" && key.length > 0);
}

function toSnapshot(
  event: SportEvent,
  choice: ViewingPlanChoice,
  previous?: ViewingPlanSnapshot,
): ViewingPlanSnapshot {
  const now = new Date().toISOString();
  const identityAliases = getSerieAMatchIdentityAliases(event);
  const matchKey = getSerieAMatchIdentity(event);
  return {
    eventId: event.id,
    matchKey,
    identityAliases,
    choice,
    sport: "soccer",
    league: "Serie A",
    leagueKey: "seriea",
    awayTeam: event.awayTeam,
    homeTeam: event.homeTeam,
    startTimeLocal: event.startTimeLocal,
    endTimeLocal: event.endTimeLocal,
    providerId: event.providerId,
    providerReason: event.providerReason,
    savedAt: previous?.savedAt || now,
    detailsUpdatedAt: now,
    detailsAvailable: true,
  };
}

export function createViewingPlanItem(
  event: SportEvent,
  choice: ViewingPlanChoice,
  previous?: ViewingPlanSnapshot,
): ViewingPlanSnapshot | null {
  if (!isSerieAEvent(event) || event.sport !== "soccer" || !validChoice(choice)) return null;
  return toSnapshot(event, choice, previous);
}

function sameIdentity(a: ViewingPlanSnapshot, b: ViewingPlanSnapshot): boolean {
  const bAliases = new Set(aliasesForItem(b));
  return aliasesForItem(a).some((key) => bAliases.has(key));
}

/**
 * De-duplicate persisted values without discarding a user's intent. The
 * latest item wins when an old kickoff id and a current ESPN id both exist.
 */
export function normalizeViewingPlanItems(items: unknown): ViewingPlanSnapshot[] {
  if (!Array.isArray(items)) return [];

  const normalized: ViewingPlanSnapshot[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<ViewingPlanSnapshot>;
    if (
      typeof candidate.eventId !== "string" ||
      typeof candidate.matchKey !== "string" ||
      !validChoice(candidate.choice) ||
      typeof candidate.awayTeam !== "string" ||
      typeof candidate.homeTeam !== "string" ||
      typeof candidate.startTimeLocal !== "string"
    ) {
      continue;
    }

    const item: ViewingPlanSnapshot = {
      eventId: candidate.eventId,
      matchKey: candidate.matchKey,
      identityAliases: Array.isArray(candidate.identityAliases)
        ? candidate.identityAliases.filter((key): key is string => typeof key === "string")
        : [],
      choice: candidate.choice,
      sport: "soccer",
      league: "Serie A",
      leagueKey: "seriea",
      awayTeam: candidate.awayTeam,
      homeTeam: candidate.homeTeam,
      startTimeLocal: candidate.startTimeLocal,
      endTimeLocal: typeof candidate.endTimeLocal === "string" ? candidate.endTimeLocal : undefined,
      providerId: typeof candidate.providerId === "string" ? candidate.providerId : "",
      providerReason: typeof candidate.providerReason === "string" ? candidate.providerReason : undefined,
      savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : new Date(0).toISOString(),
      detailsUpdatedAt:
        typeof candidate.detailsUpdatedAt === "string"
          ? candidate.detailsUpdatedAt
          : typeof candidate.savedAt === "string"
            ? candidate.savedAt
            : new Date(0).toISOString(),
      detailsAvailable: candidate.detailsAvailable !== false,
    };

    const existingIndex = normalized.findIndex((existing) => sameIdentity(existing, item));
    if (existingIndex === -1) {
      normalized.push(item);
    } else {
      // Newer details are preferable, but either value represents the same
      // fixture. Keep the latest saved choice to avoid a silent intent loss.
      const existing = normalized[existingIndex];
      const existingTime = Date.parse(existing.detailsUpdatedAt);
      const candidateTime = Date.parse(item.detailsUpdatedAt);
      if (!Number.isFinite(existingTime) || candidateTime >= existingTime) {
        normalized[existingIndex] = {
          ...existing,
          ...item,
          identityAliases: [...new Set([...aliasesForItem(existing), ...aliasesForItem(item)])],
        };
      } else {
        normalized[existingIndex] = {
          ...item,
          ...existing,
          identityAliases: [...new Set([...aliasesForItem(existing), ...aliasesForItem(item)])],
        };
      }
    }
  }

  return normalized.slice(-MAX_PERSISTED_ITEMS);
}

export function parseViewingPlan(raw: string | null): ViewingPlanSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<ViewingPlanPersistedState> | ViewingPlanSnapshot[];
    const items = Array.isArray(parsed) ? parsed : parsed?.items;
    return normalizeViewingPlanItems(items);
  } catch {
    return [];
  }
}

export function serializeViewingPlan(items: ViewingPlanSnapshot[]): string {
  const state: ViewingPlanPersistedState = {
    version: 1,
    items: normalizeViewingPlanItems(items),
  };
  return JSON.stringify(state);
}

export function upsertViewingPlanItem(
  items: ViewingPlanSnapshot[],
  event: SportEvent,
  choice: ViewingPlanChoice,
): ViewingPlanSnapshot[] {
  const existing = items.find((item) => {
    const eventAliases = new Set(getSerieAMatchIdentityAliases(event));
    return aliasesForItem(item).some((key) => eventAliases.has(key));
  });
  const next = createViewingPlanItem(event, choice, existing);
  if (!next) return items;
  const withoutMatch = items.filter((item) => !sameIdentity(item, next));
  return normalizeViewingPlanItems([...withoutMatch, next]);
}

export function removeViewingPlanItem(
  items: ViewingPlanSnapshot[],
  itemOrEvent: ViewingPlanSnapshot | SportEvent,
): ViewingPlanSnapshot[] {
  const aliases = new Set(
    "choice" in itemOrEvent
      ? aliasesForItem(itemOrEvent)
      : getSerieAMatchIdentityAliases(itemOrEvent),
  );
  return items.filter((item) => !aliasesForItem(item).some((key) => aliases.has(key)));
}

export interface ReconciledViewingPlan {
  items: ViewingPlanSnapshot[];
  changed: boolean;
}

/**
 * Refresh event details without pruning saved fixtures. Missing feed rows are
 * marked unavailable and retain their last known snapshot and choice.
 */
export function reconcileViewingPlan(
  items: ViewingPlanSnapshot[],
  events: readonly SportEvent[],
): ReconciledViewingPlan {
  const serieAEvents = events.filter((event) => isSerieAEvent(event) && event.sport === "soccer");
  const eventEntries = serieAEvents.map((event) => ({
    event,
    aliases: new Set(getSerieAMatchIdentityAliases(event)),
  }));

  let changed = false;
  const reconciled = normalizeViewingPlanItems(items).map((item) => {
    const match = eventEntries.find(({ aliases }) =>
      aliasesForItem(item).some((key) => aliases.has(key)),
    );
    if (!match) {
      if (!item.detailsAvailable) return item;
      changed = true;
      return { ...item, detailsAvailable: false };
    }

    const next = toSnapshot(match.event, item.choice, item);
    const same =
      item.eventId === next.eventId &&
      item.matchKey === next.matchKey &&
      item.awayTeam === next.awayTeam &&
      item.homeTeam === next.homeTeam &&
      item.startTimeLocal === next.startTimeLocal &&
      item.endTimeLocal === next.endTimeLocal &&
      item.providerId === next.providerId &&
      item.detailsAvailable;
    if (same) return item;
    changed = true;
    return {
      ...next,
      identityAliases: [...new Set([...aliasesForItem(item), ...next.identityAliases])],
    };
  });

  const deduped = normalizeViewingPlanItems(reconciled);
  if (deduped.length !== reconciled.length) changed = true;
  return { items: deduped, changed };
}

export {
  getSerieAMatchIdentityAliases,
  getSerieATeamSeasonIdentity,
  isSerieAEvent,
};