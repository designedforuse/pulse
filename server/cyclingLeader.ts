import fs from "fs";
import path from "path";
import type { ScoreData } from "./liveScores";
import { getGiroLeader, isGiroEventId, extractGiroStageNumber, giroLeaderToScoreData } from "./giroScraper";

const OVERRIDES_PATH = path.resolve(process.cwd(), "data", "cyclingLeader.json");

interface LeaderEntry {
  eventId: string;
  rider?: string;
  team?: string;
  country?: string;
  gap?: string;
  stageNumber?: number | null;
}

interface OverridesFile {
  leaders?: LeaderEntry[];
}

interface CacheEntry {
  mtimeMs: number;
  data: Record<string, ScoreData>;
}

let CACHE: CacheEntry | null = null;

function loadOverrides(): Record<string, ScoreData> {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(OVERRIDES_PATH);
  } catch {
    return {};
  }
  if (CACHE && CACHE.mtimeMs === stat.mtimeMs) return CACHE.data;

  let parsed: OverridesFile;
  try {
    parsed = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8")) as OverridesFile;
  } catch (err) {
    console.error("[cyclingLeader] failed to parse overrides:", err);
    return {};
  }

  const out: Record<string, ScoreData> = {};
  for (const entry of parsed.leaders || []) {
    if (!entry.eventId || !entry.rider || !entry.rider.trim()) continue;
    const score: ScoreData = {
      cyclingLeader: entry.rider.trim(),
    };
    if (entry.team && entry.team.trim()) score.cyclingLeaderTeam = entry.team.trim();
    if (entry.country && entry.country.trim()) score.cyclingLeaderCountry = entry.country.trim();
    if (entry.gap && entry.gap.trim()) score.cyclingLeaderGap = entry.gap.trim();
    if (typeof entry.stageNumber === "number") score.cyclingStageNumber = entry.stageNumber;
    out[entry.eventId] = score;
  }

  CACHE = { mtimeMs: stat.mtimeMs, data: out };
  return out;
}

function lookupOverride(id: string, overrides: Record<string, ScoreData>, overrideKeys: string[]): ScoreData | null {
  if (overrides[id]) return overrides[id];
  const prefixMatch = overrideKeys.find((k) => id.startsWith(k + "-") || id === k);
  return prefixMatch ? overrides[prefixMatch] : null;
}

export async function fetchCyclingLeaderScores(eventIds: string[]): Promise<Record<string, ScoreData>> {
  if (eventIds.length === 0) return {};
  const overrides = loadOverrides();
  const overrideKeys = Object.keys(overrides);

  // Prefer scraped data for the Giro; fall back to the manual override if the scrape fails.
  const hasGiro = eventIds.some(isGiroEventId);
  const giroLeader = hasGiro ? await getGiroLeader().catch(() => null) : null;

  const out: Record<string, ScoreData> = {};
  for (const id of eventIds) {
    if (isGiroEventId(id) && giroLeader) {
      out[id] = giroLeaderToScoreData(giroLeader, extractGiroStageNumber(id));
      continue;
    }
    // Manual override (prefix match: a tour-level entry applies to every stage event).
    const fallback = lookupOverride(id, overrides, overrideKeys);
    if (fallback) out[id] = fallback;
  }
  return out;
}
