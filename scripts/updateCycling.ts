interface AppEvent {
  id: string;
  sport: string;
  league: string;
  awayTeam: string;
  homeTeam: string;
  startTimeLocal: string;
  endTimeLocal?: string;
  providerId: string;
  isLive: boolean;
  source: string;
  leagueKey?: string;
  providerReason?: string;
  eventType?: string;
  sessionTitle?: string;
  competitionType?: string;
  tournamentName?: string;
  cyclingRoute?: string;
  cyclingTotalStages?: number;
  cyclingRestDays?: string[];
}

export interface CyclingFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  tourCounts: Record<string, number>;
}

export interface CyclingMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface GrandTour {
  name: string;
  route: string;
  startUtc: string;
  endUtc: string;
  providerId: string;
  providerReason: string;
  totalStages: number;
  restDays: string[];
}

const GRAND_TOURS: GrandTour[] = [
  {
    name: "Giro d'Italia",
    route: "Nessebar, Bulgaria → Rome, Italy",
    startUtc: "2026-05-08T12:00:00.000Z",
    endUtc: "2026-05-31T22:00:00.000Z",
    providerId: "flosports",
    providerReason: "flosports-broadcast",
    totalStages: 21,
    restDays: ["2026-05-11", "2026-05-18", "2026-05-25"],
  },
  {
    name: "Tour de France",
    route: "Barcelona, Spain → Paris, France",
    startUtc: "2026-07-04T12:00:00.000Z",
    endUtc: "2026-07-26T22:00:00.000Z",
    providerId: "flosports",
    providerReason: "flosports-broadcast",
    totalStages: 21,
    restDays: ["2026-07-13", "2026-07-20"],
  },
  {
    name: "Vuelta a España",
    route: "Monaco → Madrid, Spain",
    startUtc: "2026-08-22T12:00:00.000Z",
    endUtc: "2026-09-13T22:00:00.000Z",
    providerId: "flosports",
    providerReason: "flosports-broadcast",
    totalStages: 21,
    restDays: ["2026-08-31", "2026-09-07"],
  },
  {
    // Renamed from the Critérium du Dauphiné. The marquee final warm-up stage
    // race before the Tour de France. 8 stages, no rest days.
    name: "Tour Auvergne-Rhône-Alpes",
    route: "Vizille → Plateau de Solaison, France",
    startUtc: "2026-06-07T12:00:00.000Z",
    endUtc: "2026-06-14T22:00:00.000Z",
    providerId: "flosports",
    providerReason: "flosports-broadcast",
    totalStages: 8,
    restDays: [],
  },
];

// Each daily stage is modeled as its own event (mirrors the per-round golf
// pattern). Stages broadcast windows vary, but a 5h default gives a sensible
// LIVE window that matches how golf rounds are handled.
const STAGE_DURATION_MIN = 5 * 60;

function tourSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function stageId(tour: GrandTour, dateIso: string, stageNumber: number): string {
  return `cycling-grand-tour-${tourSlug(tour.name)}-2026-${dateIso}-stage-${stageNumber}`;
}

function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildStageEvents(tour: GrandTour): AppEvent[] {
  const events: AppEvent[] = [];
  const start = new Date(tour.startUtc);
  const end = new Date(tour.endUtc);
  const restSet = new Set(tour.restDays);

  let stageNumber = 0;
  let cursor = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
    0,
    0,
  ));

  while (cursor <= end && stageNumber < tour.totalStages) {
    const dateIso = isoDateUtc(cursor);
    if (restSet.has(dateIso)) {
      cursor = addDaysUtc(cursor, 1);
      continue;
    }

    stageNumber += 1;
    const stageStart = new Date(cursor);
    const stageEnd = new Date(stageStart.getTime() + STAGE_DURATION_MIN * 60_000);
    const isFinalStage = stageNumber === tour.totalStages;
    const stageLabel = `Stage ${stageNumber}${isFinalStage ? " — Final" : ""}`;

    events.push({
      id: stageId(tour, dateIso, stageNumber),
      sport: "cycling",
      league: "Grand Tour",
      awayTeam: stageLabel,
      homeTeam: tour.name,
      startTimeLocal: stageStart.toISOString(),
      endTimeLocal: stageEnd.toISOString(),
      providerId: tour.providerId,
      isLive: false,
      source: "cycling-hardcoded",
      leagueKey: "grand-tour",
      providerReason: tour.providerReason,
      eventType: "session",
      sessionTitle: `${tour.name} 2026 — ${stageLabel}`,
      competitionType: "international",
      tournamentName: tour.name,
      cyclingRoute: tour.route,
      cyclingTotalStages: tour.totalStages,
      cyclingRestDays: tour.restDays,
    });

    cursor = addDaysUtc(cursor, 1);
  }

  return events;
}

export function fetchCyclingEvents(): CyclingFetchResult {
  console.log(`  Cycling: Generating Grand Tour stage schedule (${GRAND_TOURS.length} races)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 180 * 86400000);

  const events: AppEvent[] = [];
  const tourCounts: Record<string, number> = {};

  for (const tour of GRAND_TOURS) {
    const tourStart = new Date(tour.startUtc);
    const tourEnd = new Date(tour.endUtc);
    // Skip tours whose entire window sits outside the retention range.
    if (tourEnd < windowStart || tourStart > windowEnd) continue;

    const stages = buildStageEvents(tour);
    let kept = 0;
    for (const stage of stages) {
      const stageStart = new Date(stage.startTimeLocal);
      if (stageStart < windowStart || stageStart > windowEnd) continue;
      events.push(stage);
      kept += 1;
    }
    tourCounts[tour.name] = kept;
  }

  console.log(`  Cycling: ${events.length} stage events in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length, tourCounts };
}

export function mergeCyclingEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): CyclingMergeResult {
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 180 * 86400000);

  // Authoritative-feed pruning. The hardcoded GRAND_TOURS schedule is the
  // source of truth for cycling. Any existing cycling-grand-tour-* event
  // inside the retention window that's missing from `fresh` is stale
  // (route changes, rest-day shifts, or the old monolithic tour-as-one-event
  // model that's been replaced by per-stage events) and must be removed.
  // Only prune when fresh is non-empty so a transient failure can't wipe
  // the cache.
  const freshById = new Map<string, AppEvent>();
  for (const e of fresh) freshById.set(e.id, e);

  const index = new Map<string, AppEvent>();
  let pruned = 0;

  for (const e of existing) {
    const isCycling = typeof e.id === "string" && e.id.startsWith("cycling-grand-tour-");
    if (!isCycling) {
      index.set(e.id, e);
      continue;
    }
    const start = new Date(e.startTimeLocal);
    const inWindow = start >= windowStart && start <= windowEnd;
    if (inWindow && freshById.size > 0 && !freshById.has(e.id)) {
      pruned++;
      continue;
    }
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of fresh) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const isCycling = typeof e.id === "string" && e.id.startsWith("cycling-grand-tour-");
    if (!isCycling) {
      merged.push(e);
      continue;
    }
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    } else {
      pruned++;
    }
  }

  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
