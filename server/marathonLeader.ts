import type { ScoreData } from "./liveScores";

interface MarathonRaceConfig {
  eventIdPrefix: string;
  baseUrl: string;
  label: string;
}

const MARATHON_RACES: Record<string, MarathonRaceConfig> = {
  "athletics-marathon-boston-marathon": {
    eventIdPrefix: "athletics-marathon-boston-marathon",
    baseUrl: "https://results.baa.org/2026",
    label: "Boston",
  },
};

interface CacheEntry {
  ts: number;
  data: ScoreData | null;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

function flipName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.split(",").map(p => p.trim());
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  return fullName;
}

function normalizeSplitLabel(name: string): string {
  if (!name) return "";
  const upper = name.toUpperCase();
  if (upper === "HALF") return "Half";
  if (upper === "FINISH") return "Finish";
  return name;
}

async function fetchBostonLeader(baseUrl: string): Promise<ScoreData | null> {
  const url = `${baseUrl}/?content=ajax2&func=getLeaderboard`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Pulse Sports App)",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json() as any;

  const containers = Array.isArray(data?.containers) ? data.containers : [];
  const menContainer = containers.find((c: any) =>
    typeof c?.title === "string" && /top\s+men/i.test(c.title)
  );
  if (!menContainer) return null;
  const rows = menContainer?.data?.rows;
  const subSelector = menContainer?.data?.sub_selector;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let latestIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (Array.isArray(row) && row[0]?.__fullname && row[0]?.actual_split_time) {
      latestIdx = i;
      break;
    }
  }
  if (latestIdx < 0) return null;

  const leaderboard = rows[latestIdx];
  const leader = leaderboard[0];
  const runnerUp = leaderboard[1];
  if (!leader?.__fullname) return null;

  const splitName = Array.isArray(subSelector) && subSelector[latestIdx]?.name
    ? String(subSelector[latestIdx].name)
    : "";
  const splitLabel = normalizeSplitLabel(splitName);

  const leaderName = flipName(leader.__fullname);
  const splitTime = String(leader.actual_split_time || "").trim();

  let leadGap = "";
  if (runnerUp?.diff_time) {
    leadGap = String(runnerUp.diff_time).replace(/^\+/, "");
    if (leadGap === "00:00") leadGap = "";
  }

  const isFinished = splitLabel.toLowerCase() === "finish";

  return {
    awayScore: 0,
    homeScore: 0,
    marathonLeader: leaderName,
    marathonLeaderSplit: splitLabel,
    marathonLeaderSplitTime: splitTime,
    marathonLeaderGap: leadGap,
    marathonRaceStatus: isFinished ? "finished" : "active",
  };
}

export async function fetchMarathonLeaderScores(
  eventIds: string[]
): Promise<Record<string, ScoreData>> {
  const out: Record<string, ScoreData> = {};
  if (eventIds.length === 0) return out;

  for (const eventId of eventIds) {
    const config = MARATHON_RACES[eventId];
    if (!config) continue;

    const cached = CACHE.get(eventId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      if (cached.data) out[eventId] = cached.data;
      continue;
    }

    try {
      const data = await fetchBostonLeader(config.baseUrl);
      CACHE.set(eventId, { ts: Date.now(), data });
      if (data) out[eventId] = data;
    } catch (err) {
      console.error(`[marathonLeader] ${config.label} fetch failed:`, err);
      CACHE.set(eventId, { ts: Date.now(), data: null });
    }
  }

  return out;
}
