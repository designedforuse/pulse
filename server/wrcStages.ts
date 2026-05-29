// Live WRC stage winners sourced from eWRC-Results' public JSON API
// (api-next.ewrc-results.com). The data is fully open (no API key) and far more
// robust than scraping eWRC's client-rendered HTML. Two endpoints are used:
//   - /event/{id}/event-page      -> entries (crews) + timetable (stages w/ leg)
//   - /event/{id}/live-aggregate/{stageId} -> per-stage results (r:1 = winner)
//
// Internal WRC rounds are keyed by their base id (e.g. "racing-wrc-japan-2026").
// eWRC numeric event ids are not predictable, so each round must be mapped here
// once its eWRC event page exists. Add new rounds as they approach.

const EWRC_API_BASE = "https://api-next.ewrc-results.com";

// Maps internal WRC round id (the per-day card id with the "-dayN" suffix
// stripped) to the eWRC numeric event id.
const WRC_EWRC_EVENT_IDS: Record<string, number> = {
  "racing-wrc-japan-2026": 96261,
};

export interface WrcStageWinner {
  name: string;
  carNumber: number | null;
  flag: string | null; // ISO-ish country code from eWRC (e.g. "gb")
  time: string; // pretty stage time, e.g. "10:42.9"
}

export interface WrcStage {
  stageNumber: number;
  legNumber: number;
  name: string;
  distance: number | null;
  cancelled: boolean;
  startTime: string; // event-local "YYYY-MM-DD HH:mm:ss"
  winner: WrcStageWinner | null;
}

export interface WrcStagesResult {
  roundId: string;
  eventName: string;
  totalStages: number;
  completedStages: number;
  stages: WrcStage[];
  fetchedAt: string;
}

interface CacheEntry {
  data: WrcStagesResult;
  fetchedAt: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 60_000;

function emptyResult(roundId: string): WrcStagesResult {
  return {
    roundId,
    eventName: "",
    totalStages: 0,
    completedStages: 0,
    stages: [],
    fetchedAt: new Date().toISOString(),
  };
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[wrc-stages] fetch failed ${url}:`, err);
    return null;
  }
}

export function getWrcRoundBaseId(eventId: string): string {
  return eventId.replace(/-day\d+$/, "");
}

export function hasWrcStageMapping(roundId: string): boolean {
  return roundId in WRC_EWRC_EVENT_IDS;
}

export async function fetchWrcStages(roundId: string): Promise<WrcStagesResult> {
  const cached = cache[roundId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const ewrcId = WRC_EWRC_EVENT_IDS[roundId];
  if (!ewrcId) {
    // Negative-cache unmapped rounds so repeated card requests don't re-run this.
    const empty = emptyResult(roundId);
    cache[roundId] = { data: empty, fetchedAt: Date.now() };
    return empty;
  }

  const eventPage = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/event-page`);
  if (!eventPage) {
    return cached?.data ?? emptyResult(roundId);
  }

  // Map crew entry id -> driver display info.
  const id2driver: Record<number, { name: string; no: number | null; flag: string | null }> = {};
  const entries = eventPage?.entries?.entries;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      const eid = e?.entry?.id;
      if (eid == null) continue;
      const d = e?.driver ?? {};
      const name = `${d?.firstname ?? ""} ${d?.lastname ?? ""}`.trim();
      id2driver[eid] = {
        name: name || "Unknown",
        no: e?.entry?.no ?? null,
        flag: d?.flag ?? null,
      };
    }
  }

  const rawStages = eventPage?.timetable?.stages;
  if (!Array.isArray(rawStages)) {
    return emptyResult(roundId);
  }

  const stageMeta = rawStages
    .map((s: any) => s?.stage)
    .filter((s: any) => s && typeof s.id === "number");

  // Fetch every stage's results in parallel. Cancelled stages are skipped.
  const results = await Promise.all(
    stageMeta.map(async (st: any) => {
      if (st.cancelled) return { st, winner: null as WrcStageWinner | null };
      const la = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/live-aggregate/${st.id}`);
      const stageBlock = la?.results?.stage;
      const rows = stageBlock && !Array.isArray(stageBlock) ? stageBlock.results : null;
      let winner: WrcStageWinner | null = null;
      if (Array.isArray(rows)) {
        const top = rows.find((r: any) => r?.r === 1);
        if (top) {
          const drv = id2driver[top.id] ?? { name: "Unknown", no: null, flag: null };
          winner = {
            name: drv.name,
            carNumber: drv.no,
            flag: drv.flag,
            time: top?.time?.pretty ?? "",
          };
        }
      }
      return { st, winner };
    })
  );

  const stages: WrcStage[] = results.map(({ st, winner }) => ({
    stageNumber: st.stage_number,
    legNumber: st.leg_number,
    name: st.name ?? "",
    distance: typeof st.distance === "number" ? st.distance : null,
    cancelled: !!st.cancelled,
    startTime: st.first_car_time ?? "",
    winner,
  }));

  const completedStages = stages.filter((s) => s.winner != null).length;

  const result: WrcStagesResult = {
    roundId,
    eventName: eventPage?.event?.name ?? "",
    totalStages: stages.length,
    completedStages,
    stages,
    fetchedAt: new Date().toISOString(),
  };

  cache[roundId] = { data: result, fetchedAt: Date.now() };
  console.log(`[wrc-stages] ${roundId} (eWRC ${ewrcId}): ${completedStages}/${stages.length} stages completed`);
  return result;
}
