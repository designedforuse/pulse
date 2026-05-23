import type { ScoreData } from "./liveScores";

const GIRO_URL = "https://www.giroditalia.it/classifiche/";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface ScrapedLeader {
  rider: string;
  team: string;
}

let cache: { data: ScrapedLeader | null; ts: number } = { data: null, ts: 0 };
let inflight: Promise<ScrapedLeader | null> | null = null;

function parseMagliaRosa(html: string): ScrapedLeader | null {
  // The classifiche page renders each jersey summary as:
  //   <a ... data-tab="tab-classifica-CLGEN"> ... <h5>SURNAME Firstname</h5> ... <div class="p-4 mt-0">TEAM</div> ... </a>
  // CLGEN = general classification (maglia rosa).
  const anchorRe = /<a[^>]*data-tab="tab-classifica-CLGEN"[^>]*>([\s\S]*?)<\/a>/i;
  const anchorMatch = html.match(anchorRe);
  if (!anchorMatch) return null;
  const block = anchorMatch[1];

  const nameMatch = block.match(/<h5[^>]*>([^<]+)<\/h5>/i);
  const teamMatch = block.match(/<div[^>]*class="[^"]*p-4[^"]*"[^>]*>([^<]+)<\/div>/i);

  const rider = nameMatch?.[1]?.trim();
  const team = teamMatch?.[1]?.trim();
  if (!rider) return null;

  return { rider, team: team || "" };
}

async function fetchGiroLeaderUncached(): Promise<ScrapedLeader | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(GIRO_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PulseSports/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[giroScraper] HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const parsed = parseMagliaRosa(html);
    if (!parsed) {
      console.warn("[giroScraper] could not parse maglia rosa block");
    } else {
      console.log(`[giroScraper] maglia rosa: ${parsed.rider} (${parsed.team})`);
    }
    return parsed;
  } catch (err: any) {
    console.warn("[giroScraper] fetch error:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getGiroLeader(): Promise<ScrapedLeader | null> {
  const age = Date.now() - cache.ts;
  if (cache.ts > 0 && age < CACHE_TTL_MS) return cache.data;

  if (inflight) return inflight;
  inflight = (async () => {
    const result = await fetchGiroLeaderUncached();
    // Always stamp cache so a transient failure doesn't hammer the site.
    cache = { data: result ?? cache.data, ts: Date.now() };
    inflight = null;
    return cache.data;
  })();
  return inflight;
}

const GIRO_EVENT_PREFIX = "cycling-grand-tour-giro-d-italia-";

export function isGiroEventId(id: string): boolean {
  return id.startsWith(GIRO_EVENT_PREFIX);
}

// Best-effort extraction of stage number from event id, e.g.
//   cycling-grand-tour-giro-d-italia-2026-2026-05-23-stage-14  -> 14
export function extractGiroStageNumber(id: string): number | null {
  const m = id.match(/-stage-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  // The maglia rosa as shown on the live page reflects standings AFTER the previous stage.
  return n > 1 ? n - 1 : null;
}

export function giroLeaderToScoreData(leader: ScrapedLeader, stageNumber: number | null): ScoreData {
  const score: ScoreData = { cyclingLeader: leader.rider };
  if (leader.team) score.cyclingLeaderTeam = leader.team;
  if (stageNumber !== null) score.cyclingStageNumber = stageNumber;
  return score;
}
