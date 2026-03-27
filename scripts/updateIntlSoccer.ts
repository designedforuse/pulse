import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const DURATION_MIN = 120;

interface EspnCompetitor {
  team: { displayName: string; abbreviation: string };
  homeAway: string;
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
  broadcasts?: { market?: string; names?: string[] }[];
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  competitions: EspnCompetition[];
  notes?: { headline?: string }[];
}

function addDuration(isoString: string, minutes: number): string {
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function stableId(league: string, startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = league.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `soccer-${slug}-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function formatDateRange(start: Date, end: Date): string {
  return `${start.toISOString().slice(0,10).replace(/-/g,"")}` +
         `-${end.toISOString().slice(0,10).replace(/-/g,"")}`;
}

function resolveBroadcast(names: string[]): { brandId: string; providerId: string } {
  const bc = names.map(n => n.toLowerCase());
  if (bc.some(n => n.includes("fox") && !n.includes("fs"))) return { brandId: "fox", providerId: "youtubetv" };
  if (bc.some(n => n === "fs1" || n === "fox sports 1")) return { brandId: "fs1", providerId: "youtubetv" };
  if (bc.some(n => n === "fs2" || n === "fox sports 2")) return { brandId: "fs1", providerId: "youtubetv" };
  if (bc.some(n => n.includes("tnt") || n.includes("truetv") || n.includes("trutv") || n.includes("hbo max") || n.includes("max"))) return { brandId: "tnt", providerId: "tnt" };
  if (bc.some(n => n.includes("peacock"))) return { brandId: "nbcsn", providerId: "youtubetv" };
  if (bc.some(n => n.includes("espn2"))) return { brandId: "espn2", providerId: "disneyplus" };
  if (bc.some(n => n.includes("espn"))) return { brandId: "espn", providerId: "disneyplus" };
  if (bc.some(n => n.includes("cbs"))) return { brandId: "cbs", providerId: "youtubetv" };
  return { brandId: "", providerId: "youtubetv" };
}

async function fetchPage(endpoint: string, dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_BASE}/${endpoint}/scoreboard?dates=${dateRange}&limit=200`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.events || []) as EspnEvent[];
  } catch {
    return [];
  }
}

async function fetchWindow(endpoint: string, windowStart: Date, windowEnd: Date): Promise<EspnEvent[]> {
  const all: EspnEvent[] = [];
  let cursor = new Date(windowStart);
  while (cursor < windowEnd) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + 31 * 86400000, windowEnd.getTime()));
    const range = formatDateRange(cursor, chunkEnd);
    const events = await fetchPage(endpoint, range);
    all.push(...events);
    cursor = new Date(chunkEnd.getTime() + 86400000);
  }
  return all;
}

function parseEvents(
  espnEvents: EspnEvent[],
  league: string,
  leagueKey: string,
  windowStart: Date,
  windowEnd: Date,
  requireBroadcast = false,
): AppEvent[] {
  const events: AppEvent[] = [];
  const seenIds = new Set<string>();

  for (const e of espnEvents) {
    const startUtc = new Date(e.date).toISOString();
    const startDate = new Date(startUtc);
    if (startDate < windowStart || startDate > windowEnd) continue;

    const comp = e.competitions?.[0];
    if (!comp?.competitors || comp.competitors.length < 2) continue;

    const homeComp = comp.competitors.find(c => c.homeAway === "home");
    const awayComp = comp.competitors.find(c => c.homeAway === "away");
    if (!homeComp || !awayComp) continue;

    const broadcastNames = comp.broadcasts?.flatMap(b => b.names || []) ?? [];
    if (requireBroadcast && broadcastNames.length === 0) continue;

    const { brandId, providerId } = resolveBroadcast(broadcastNames);
    if (requireBroadcast && !brandId) continue;

    const homeTeam = homeComp.team.displayName;
    const awayTeam = awayComp.team.displayName;
    const endUtc = addDuration(startUtc, DURATION_MIN);

    const id = stableId(leagueKey, startUtc, awayTeam, homeTeam);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const roundLabel = e.notes?.[0]?.headline?.trim();

    events.push({
      id,
      sport: "soccer",
      league,
      awayTeam,
      homeTeam,
      startTimeLocal: startUtc,
      endTimeLocal: endUtc,
      providerId: providerId || "youtubetv",
      isLive: false,
      source: `intl-soccer-${leagueKey}`,
      leagueKey,
      providerReason: brandId ? `${leagueKey}-${brandId}` : `${leagueKey}-default`,
      broadcastNetworks: broadcastNames.join(", "),
      ...(roundLabel && roundLabel.length <= 20 ? { roundLabel } : {}),
    });
  }
  return events;
}

export async function fetchIntlSoccerEvents(): Promise<SoccerFetchResult> {
  console.log("  Intl Soccer: Fetching World Cup + Friendlies from ESPN...");
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 14 * 86400000);
    // World Cup: June 2026 – Aug 2026 (also fetch from now for any qualifying/pre-tourney)
    const wcStart = new Date(Math.min(past.getTime(), new Date("2026-06-01").getTime()));
    const wcEnd = new Date("2026-08-15");
    // Friendlies: 14 days past → 60 days future
    const fStart = past;
    const fEnd = new Date(now.getTime() + 60 * 86400000);

    const [wcRaw, friendlyRaw] = await Promise.all([
      fetchWindow("soccer/fifa.world", wcStart, wcEnd),
      fetchWindow("soccer/fifa.friendly", fStart, fEnd),
    ]);

    console.log(`  Intl Soccer: ${wcRaw.length} WC events, ${friendlyRaw.length} friendly events`);

    const wcEvents = parseEvents(wcRaw, "FIFA World Cup", "fifa-world-cup", wcStart, wcEnd, false);
    const friendlyEvents = parseEvents(friendlyRaw, "International Friendly", "intl-friendly", fStart, fEnd, true);

    const total = [...wcEvents, ...friendlyEvents];
    console.log(`  Intl Soccer: ${wcEvents.length} WC + ${friendlyEvents.length} friendlies = ${total.length} total`);
    return { events: total, sourceUsed: "espn", count: total.length };
  } catch (err: any) {
    console.error("  Intl Soccer: Error:", err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeIntlSoccerEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
