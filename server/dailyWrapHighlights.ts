import * as fs from "fs";
import * as path from "path";
import type { DailyWrapEntry } from "./dailyWrap";

export interface HighlightVideo {
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  title: string;
  channel?: string;
}

const CACHE_PATH = path.resolve(process.cwd(), "data", "dailyWrapVideoCache.json");
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // keep a found highlight for a week
const NOTFOUND_TTL_MS = 6 * 3600 * 1000; // retry a miss after 6h
const PER_SEARCH_TIMEOUT_MS = 6000;
const MAX_AGE_DAYS = 7; // only very recent uploads (games are within ~48h)

interface CacheEntry {
  video: HighlightVideo | null;
  imageUrl?: string | null;
  fetchedAt: string;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error("[daily-wrap-video] Failed to save cache:", (err as Error).message);
  }
}

const TRUSTED_CHANNELS = [
  "nhl", "espn", "sportsnet", "tsn", "atp tour", "tennis tv", "wta",
  "rugbypass", "sky sports", "nbc sports", "fox sports", "bt sport",
  "dazn", "premier league", "major league soccer", "mls", "supersport",
  "roland garros", "wimbledon", "us open tennis", "australian open tv",
  "formula 1", "nba", "icc", "bcci", "world rugby",
];

function parseDurationText(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function parsePublishedAge(text: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    second: 1 / 86400, minute: 1 / 1440, hour: 1 / 24,
    day: 1, week: 7, month: 30, year: 365,
  };
  return n * (mult[unit] || 1);
}

function isTrusted(channel: string): boolean {
  const lower = channel.toLowerCase();
  return TRUSTED_CHANNELS.some((tc) => lower.includes(tc));
}

const THUMB_PROBE_TIMEOUT_MS = 2500;
const THUMB_TOTAL_BUDGET_MS = 3500; // overall cap for thumbnail probing per search

// Pick the highest-resolution thumbnail YouTube actually has for this video.
// maxresdefault (1280x720) and sddefault (640x480) are not always generated,
// so probe with a cheap HEAD and fall back to hqdefault (always present).
// `deadline` (absolute ms) bounds the total probing time so a search's overall
// latency budget stays predictable on the cold path.
async function bestThumbnailUrl(videoId: string, deadline: number): Promise<string> {
  for (const quality of ["maxresdefault", "sddefault"]) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const url = `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(THUMB_PROBE_TIMEOUT_MS, remaining)
    );
    try {
      const resp = await fetch(url, { method: "HEAD", signal: controller.signal });
      if (resp.ok) return url;
    } catch {
      // network/timeout — fall through to the next quality
    } finally {
      clearTimeout(timer);
    }
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// Real highlight clips are short-form; reject full replays, live streams, etc.
const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 20 * 60;

// Non-highlight content classes we never want to surface as "highlights".
const REJECT_TITLE_RE =
  /\b(press conference|presser|reaction|reacts?|interview|preview|live stream|livestream|watch live|full match|full game|full replay|extended replay|post.?match|pre.?match|analysis|podcast|press|conference)\b/i;
const HIGHLIGHT_HINT_RE = /\b(highlights?|recap|top plays|best of|goals?|tries|wickets|key moments)\b/i;

interface SearchResult {
  video: HighlightVideo | null;
  imageUrl: string | null;
}

const EMPTY_RESULT: SearchResult = { video: null, imageUrl: null };

async function searchHighlight(query: string): Promise<SearchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_SEARCH_TIMEOUT_MS);
  try {
    const sp = "CAISBAgCEAE%3D"; // sort by upload date, video filter
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) return EMPTY_RESULT;

    const html = await resp.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!match) return EMPTY_RESULT;

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const currentYear = new Date().getFullYear();
    const recentYearCutoff = currentYear - 1;

    interface Candidate {
      videoId: string;
      ageDays: number | null;
      channel: string;
      trusted: boolean;
      isHighlight: boolean;
      title: string;
      durationSeconds: number;
      hasLength: boolean;
      rejected: boolean;
    }
    const candidates: Candidate[] = [];

    for (const c of contents) {
      const r = c?.videoRenderer;
      if (!r?.videoId) continue;
      const published = r?.publishedTimeText?.simpleText || "";
      const ageDays = parsePublishedAge(published);
      const title = r?.title?.runs?.[0]?.text || "";
      const channel =
        r?.ownerText?.runs?.[0]?.text || r?.longBylineText?.runs?.[0]?.text || "";
      const lengthText = r?.lengthText?.simpleText || "";
      const durationSeconds = parseDurationText(lengthText);

      // Recency gates apply to every candidate (clip or still image).
      const oldYear = title.match(/\b(19\d{2}|20\d{2})\b/);
      if (oldYear && parseInt(oldYear[1], 10) < recentYearCutoff) continue;
      if (ageDays !== null && ageDays > MAX_AGE_DAYS) continue;
      if (/\d+\s+years?\s+ago/i.test(published)) continue;

      candidates.push({
        videoId: r.videoId,
        ageDays,
        channel,
        trusted: isTrusted(channel),
        isHighlight: HIGHLIGHT_HINT_RE.test(title),
        title,
        durationSeconds,
        hasLength: !!lengthText,
        rejected: REJECT_TITLE_RE.test(title),
      });
    }

    if (candidates.length === 0) return EMPTY_RESULT;

    // Highlight clip: short-form, not a live stream / full replay / presser.
    const clips = candidates.filter(
      (c) =>
        c.hasLength &&
        !c.rejected &&
        c.durationSeconds >= MIN_DURATION_SECONDS &&
        c.durationSeconds <= MAX_DURATION_SECONDS
    );
    clips.sort((a, b) => {
      if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
      if (a.trusted !== b.trusted) return a.trusted ? -1 : 1;
      return (a.ageDays ?? 999) - (b.ageDays ?? 999);
    });

    // The YouTube search/parse is done; bound the remaining thumbnail probing
    // with its own explicit budget so total search latency stays predictable.
    const thumbDeadline = Date.now() + THUMB_TOTAL_BUDGET_MS;

    const clip = clips[0];
    const video: HighlightVideo | null = clip
      ? {
          url: `https://www.youtube.com/watch?v=${clip.videoId}`,
          thumbnailUrl: await bestThumbnailUrl(clip.videoId, thumbDeadline),
          durationSeconds: clip.durationSeconds,
          title: clip.title,
          channel: clip.channel,
        }
      : null;

    // Fallback still image: a relevant recent thumbnail (real action photo).
    // Prefer real video thumbnails over pressers/talking-heads when possible.
    let imageUrl: string | null = video ? video.thumbnailUrl : null;
    if (!imageUrl) {
      const imagePool = candidates.filter((c) => c.hasLength && !c.rejected);
      const pool = imagePool.length > 0 ? imagePool : candidates;
      pool.sort((a, b) => {
        if (a.trusted !== b.trusted) return a.trusted ? -1 : 1;
        return (a.ageDays ?? 999) - (b.ageDays ?? 999);
      });
      imageUrl = await bestThumbnailUrl(pool[0].videoId, thumbDeadline);
    }

    return { video, imageUrl };
  } catch {
    return EMPTY_RESULT;
  } finally {
    clearTimeout(timer);
  }
}

function buildHighlightQuery(entry: DailyWrapEntry): string | null {
  const now = new Date();
  const monthYear = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  const away = (entry.awayTeam || "").trim();
  const home = (entry.homeTeam || "").trim();
  const league = (entry.league || "").trim();
  const sport = (entry.sport || "").trim();

  if (away && home && away.toLowerCase() !== home.toLowerCase()) {
    return `${away} vs ${home} ${league} highlights ${monthYear}`;
  }
  const subject = (home || away || entry.winner || league || "").trim();
  if (!subject) return null;
  return `${subject} ${sport} highlights ${monthYear}`;
}

/**
 * Attaches a recent highlights video (with a real thumbnail image) to each
 * entry. Results are cached on disk by eventId so only cache-misses hit the
 * network, and those run in parallel (each with its own per-search timeout
 * + abort).
 */
export async function enrichWithHighlights(
  entries: DailyWrapEntry[]
): Promise<DailyWrapEntry[]> {
  const cache = loadCache();
  const now = Date.now();
  const toSearch: { entry: DailyWrapEntry; query: string }[] = [];

  for (const entry of entries) {
    const cached = cache[entry.eventId];
    if (cached) {
      // A hit is anything we resolved (clip or still image); only a true
      // empty result uses the shorter retry TTL.
      const resolved = !!cached.video || !!cached.imageUrl;
      const ttl = resolved ? CACHE_TTL_MS : NOTFOUND_TTL_MS;
      if (now - new Date(cached.fetchedAt).getTime() < ttl) {
        entry.video = cached.video || undefined;
        entry.fallbackImageUrl = cached.video ? undefined : cached.imageUrl || undefined;
        continue;
      }
    }
    const query = buildHighlightQuery(entry);
    if (query) toSearch.push({ entry, query });
  }

  if (toSearch.length > 0) {
    const found = await Promise.all(
      toSearch.map(async ({ entry, query }) => ({
        entry,
        result: await searchHighlight(query),
      }))
    );
    const stamp = new Date().toISOString();
    for (const { entry, result } of found) {
      entry.video = result.video || undefined;
      entry.fallbackImageUrl = result.video ? undefined : result.imageUrl || undefined;
      cache[entry.eventId] = {
        video: result.video || null,
        imageUrl: result.imageUrl || null,
        fetchedAt: stamp,
      };
    }
    saveCache(cache);
  }

  return entries;
}
