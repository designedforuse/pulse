import * as fs from "fs";
import * as path from "path";
import { fetchAhlEvents, mergeAhlEvents } from "./updateAhlSchedule";
import { fetchEchlEvents, mergeEchlEvents } from "./updateEchlSchedule";
import { fetchBuEvents, mergeBuEvents } from "./updateBuHockey";
import { fetchRugbyEvents, mergeRugbyEvents } from "./updateRugby";
import { fetchCricketEvents, mergeCricketEvents } from "./updateCricket";
import { fetchIccT20WcEvents, mergeIccT20WcEvents } from "./updateIccT20Wc";
import { fetchOlympicHockeyEvents, mergeOlympicHockeyEvents } from "./updateOlympicHockey2026";
import { fetchEplEvents, mergeEplEvents } from "./updateEpl";
import { fetchMlsEvents, mergeMlsEvents } from "./updateMls";

const NHL_API_BASE = "https://api-web.nhle.com/v1";
const OUTPUT_PATH = path.resolve(__dirname, "../data/generatedEvents.json");

interface NHLGame {
  id: number;
  season: number;
  gameType: number;
  startTimeUTC: string;
  gameState: string;
  gameScheduleState: string;
  awayTeam: {
    commonName?: { default: string };
    placeName?: { default: string };
    abbrev: string;
  };
  homeTeam: {
    commonName?: { default: string };
    placeName?: { default: string };
    abbrev: string;
  };
  tvBroadcasts?: Array<{
    network: string;
    countryCode: string;
    market: string;
  }>;
}

interface NHLScheduleResponse {
  gameWeek: Array<{
    date: string;
    games: NHLGame[];
  }>;
  nextStartDate?: string;
}

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
  broadcastNetworks?: string[];
  isNational?: boolean;
  providerReason?: string;
  leagueKey?: string;
}

function buildTeamName(team: { commonName?: { default: string }; placeName?: { default: string }; abbrev: string }): string {
  const place = team.placeName?.default || "";
  const common = team.commonName?.default || "";
  if (place && common && place !== common) {
    return `${place} ${common}`;
  }
  return common || place || team.abbrev;
}

function toUtcIso(utcString: string): string {
  const date = new Date(utcString);
  return date.toISOString();
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

async function fetchNHLSchedule(dateStr: string): Promise<NHLScheduleResponse> {
  const url = `${NHL_API_BASE}/schedule/${dateStr}`;
  console.log(`  NHL: Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NHL API returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<NHLScheduleResponse>;
}

const NATIONAL_NETWORKS_EXACT = new Set(["TNT", "TBS", "ABC"]);

function isNationalNetwork(raw: string): boolean {
  const upper = raw.trim().toUpperCase();
  if (NATIONAL_NETWORKS_EXACT.has(upper)) return true;
  if (upper.includes("ESPN") && upper !== "ESPN+") return true;
  return false;
}

function extractBroadcasts(game: NHLGame): string[] {
  if (!game.tvBroadcasts || game.tvBroadcasts.length === 0) return [];
  return game.tvBroadcasts.map((b) => b.network.trim());
}

function resolveNhlProvider(
  homeTeam: string,
  awayTeam: string,
  broadcasts: string[]
): { providerId: string; isNational: boolean; providerReason: string } {
  const isNational = broadcasts.some(isNationalNetwork);

  if (isNational) {
    return { providerId: "youtubetv", isNational: true, providerReason: "national" };
  }

  const teams = [homeTeam, awayTeam];
  const isDucks = teams.some((t) => t.includes("Anaheim") || t.includes("Ducks"));
  if (isDucks) {
    return { providerId: "victoryplus", isNational: false, providerReason: "ducks-rsn" };
  }

  const isKings = teams.some((t) => t.includes("Los Angeles") || t.includes("LA Kings") || t.includes("Kings"));
  if (isKings) {
    return { providerId: "primevideo", isNational: false, providerReason: "kings-rsn" };
  }

  return { providerId: "disneyplus", isNational: false, providerReason: "espnplus-default" };
}

function nhlGameToEvent(game: NHLGame): AppEvent {
  const startLocal = toUtcIso(game.startTimeUTC);
  const homeTeam = buildTeamName(game.homeTeam);
  const awayTeam = buildTeamName(game.awayTeam);
  const broadcasts = extractBroadcasts(game);
  const { providerId, isNational, providerReason } = resolveNhlProvider(homeTeam, awayTeam, broadcasts);

  return {
    id: `nhl_${game.id}`,
    sport: "hockey",
    league: "NHL",
    awayTeam,
    homeTeam,
    startTimeLocal: startLocal,
    endTimeLocal: addDuration(game.startTimeUTC, 165),
    providerId,
    isLive: game.gameState === "LIVE" || game.gameState === "CRIT",
    source: "nhl",
    broadcastNetworks: broadcasts,
    isNational,
    providerReason,
  };
}

async function fetchNHLEvents(days: number): Promise<AppEvent[]> {
  console.log(`Fetching NHL schedule for ${days} days...`);
  const allEvents: AppEvent[] = [];
  const seenIds = new Set<string>();
  const today = new Date();
  let currentDate = new Date(today);
  const fetched = new Set<string>();

  while (currentDate.getTime() - today.getTime() < days * 86400000) {
    const dateStr = currentDate.toISOString().split("T")[0];

    if (fetched.has(dateStr)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    try {
      const schedule = await fetchNHLSchedule(dateStr);

      for (const week of schedule.gameWeek) {
        fetched.add(week.date);
        const regularGames = week.games.filter((g) => g.gameType === 2);
        for (const game of regularGames) {
          const event = nhlGameToEvent(game);
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            allEvents.push(event);
          }
        }
      }

      if (schedule.nextStartDate && !fetched.has(schedule.nextStartDate)) {
        currentDate = new Date(schedule.nextStartDate + "T00:00:00");
      } else {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } catch (err) {
      console.error(`  NHL error fetching ${dateStr}:`, err);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  console.log(`  NHL: Found ${allEvents.length} events`);
  return allEvents;
}


function loadExistingByPrefix(prefix: string): AppEvent[] {
  try {
    if (!fs.existsSync(OUTPUT_PATH)) return [];
    const raw = fs.readFileSync(OUTPUT_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.events || !Array.isArray(data.events)) return [];
    return data.events.filter((e: AppEvent) => e.id.startsWith(prefix));
  } catch {
    return [];
  }
}

function loadExistingMeta(): any {
  try {
    if (!fs.existsSync(OUTPUT_PATH)) return null;
    const raw = fs.readFileSync(OUTPUT_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data.generatedMeta || null;
  } catch {
    return null;
  }
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 7;

  const existingAhl = loadExistingByPrefix("ahl-");
  const existingEchl = loadExistingByPrefix("echl-");
  const existingBu = loadExistingByPrefix("ncaa-bu-");
  const existingRugby = loadExistingByPrefix("rugby-");
  const existingCricket = loadExistingByPrefix("cricket-").filter((e: AppEvent) => !e.id.startsWith("cricket-t20wc-"));
  const existingT20Wc = loadExistingByPrefix("cricket-t20wc-");
  const existingOlympicHockey = loadExistingByPrefix("olympic-hockey-2026-");
  const existingEpl = loadExistingByPrefix("soccer-epl-");
  const existingMls = loadExistingByPrefix("soccer-mls-");
  console.log(`Existing cached AHL events: ${existingAhl.length}`);
  console.log(`Existing cached ECHL events: ${existingEchl.length}`);
  console.log(`Existing cached BU events: ${existingBu.length}`);
  console.log(`Existing cached Rugby events: ${existingRugby.length}`);
  console.log(`Existing cached Cricket events: ${existingCricket.length}`);
  console.log(`Existing cached T20 WC events: ${existingT20Wc.length}`);
  console.log(`Existing cached Olympic Hockey events: ${existingOlympicHockey.length}`);
  console.log(`Existing cached EPL events: ${existingEpl.length}`);
  console.log(`Existing cached MLS events: ${existingMls.length}`);

  const t20WcFetchResult = fetchIccT20WcEvents();
  const olympicHockeyFetchResult = fetchOlympicHockeyEvents();

  const [nhlEvents, ahlFetchResult, echlFetchResult, buFetchResult, rugbyFetchResult, cricketFetchResult, eplFetchResult, mlsFetchResult] = await Promise.all([
    fetchNHLEvents(days),
    fetchAhlEvents(),
    fetchEchlEvents(),
    fetchBuEvents(),
    fetchRugbyEvents(),
    fetchCricketEvents(),
    fetchEplEvents(),
    fetchMlsEvents(),
  ]);

  const now = new Date();
  const ahlResult = mergeAhlEvents(existingAhl, ahlFetchResult.events, now);
  const echlResult = mergeEchlEvents(existingEchl, echlFetchResult.events, now);
  const buResult = mergeBuEvents(existingBu, buFetchResult.events, now);
  const rugbyResult = mergeRugbyEvents(existingRugby, rugbyFetchResult.events, now);
  const cricketResultRaw = mergeCricketEvents(existingCricket, cricketFetchResult.events, now);
  const t20WcResult = mergeIccT20WcEvents(existingT20Wc, t20WcFetchResult.events, now);
  const olympicHockeyResult = mergeOlympicHockeyEvents(existingOlympicHockey, olympicHockeyFetchResult.events, now);
  const eplResult = mergeEplEvents(existingEpl, eplFetchResult.events, now);
  const mlsResult = mergeMlsEvents(existingMls, mlsFetchResult.events, now);

  function toPtDate(iso: string): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format(new Date(iso));
  }

  function normalizeTeam(t: string): string {
    return t.trim().toLowerCase();
  }

  function teamsMatch(a1: string, a2: string, b1: string, b2: string): boolean {
    const setA = new Set([normalizeTeam(a1), normalizeTeam(a2)]);
    const setB = new Set([normalizeTeam(b1), normalizeTeam(b2)]);
    if (setA.size !== 2 || setB.size !== 2) return false;
    let matches = 0;
    for (const t of setA) {
      if (setB.has(t)) matches++;
    }
    return matches === 2;
  }

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  let t20wcDedupedCount = 0;
  const dedupedCricket = cricketResultRaw.merged.filter((ce) => {
    const isDup = t20WcResult.merged.some((wc) => {
      if (toPtDate(ce.startTimeLocal) !== toPtDate(wc.startTimeLocal)) return false;
      if (!teamsMatch(ce.awayTeam, ce.homeTeam, wc.awayTeam, wc.homeTeam)) return false;
      const diff = Math.abs(new Date(ce.startTimeLocal).getTime() - new Date(wc.startTimeLocal).getTime());
      return diff <= TWO_HOURS_MS;
    });
    if (isDup) {
      console.log(`  T20WC dedup: dropped CricAPI "${ce.awayTeam} vs ${ce.homeTeam}" (${ce.startTimeLocal}) — covered by hardcoded schedule`);
      t20wcDedupedCount++;
    }
    return !isDup;
  });
  const cricketResult = { ...cricketResultRaw, merged: dedupedCricket };
  if (t20wcDedupedCount > 0) {
    console.log(`  T20WC dedup: removed ${t20wcDedupedCount} duplicate CricAPI events`);
  }

  const ahlSourceLabel = ahlFetchResult.sourceUsed === "hockeytech"
    ? "HockeyTech"
    : ahlFetchResult.sourceUsed === "odds"
      ? "Odds API"
      : "none";
  console.log(`  AHL source: ${ahlSourceLabel} (${ahlFetchResult.hockeyTechCount} from HockeyTech, ${ahlFetchResult.oddsCount} from Odds)`);
  console.log(`  AHL merge: +${ahlResult.added} added, ~${ahlResult.updated} updated, -${ahlResult.pruned} pruned → ${ahlResult.merged.length} total`);
  console.log(`  ECHL merge: +${echlResult.added} added, ~${echlResult.updated} updated, -${echlResult.pruned} pruned → ${echlResult.merged.length} total`);
  console.log(`  ECHL source: ${echlFetchResult.sourceUsed}${echlFetchResult.webCount > 0 ? ` (${echlFetchResult.webCount} from web)` : ""}`);
  console.log(`  BU source: ${buFetchResult.sourceUsed} (${buFetchResult.totalParsed} parsed)`);
  console.log(`  BU merge: +${buResult.added} added, ~${buResult.updated} updated, -${buResult.pruned} pruned → ${buResult.merged.length} total`);
  console.log(`  Rugby source: ${rugbyFetchResult.sourceUsed} (${JSON.stringify(rugbyFetchResult.counts)})`);
  console.log(`  Rugby merge: +${rugbyResult.added} added, ~${rugbyResult.updated} updated, -${rugbyResult.pruned} pruned → ${rugbyResult.merged.length} total`);
  console.log(`  Cricket source: ${cricketFetchResult.sourceUsed} (${JSON.stringify(cricketFetchResult.counts)})`);
  console.log(`  Cricket merge: +${cricketResult.added} added, ~${cricketResult.updated} updated, -${cricketResult.pruned} pruned → ${cricketResult.merged.length} total`);
  console.log(`  ICC T20 WC source: ${t20WcFetchResult.sourceUsed} (${t20WcFetchResult.count} matches)`);
  console.log(`  ICC T20 WC merge: +${t20WcResult.added} added, ~${t20WcResult.updated} updated, -${t20WcResult.pruned} pruned → ${t20WcResult.merged.length} total`);
  console.log(`  Olympic Hockey source: ${olympicHockeyFetchResult.sourceUsed} (${olympicHockeyFetchResult.count} events)`);
  console.log(`  Olympic Hockey merge: +${olympicHockeyResult.added} added, ~${olympicHockeyResult.updated} updated, -${olympicHockeyResult.pruned} pruned → ${olympicHockeyResult.merged.length} total`);
  console.log(`  EPL source: ${eplFetchResult.sourceUsed} (${eplFetchResult.count} events)`);
  console.log(`  EPL merge: +${eplResult.added} added, ~${eplResult.updated} updated, -${eplResult.pruned} pruned → ${eplResult.merged.length} total`);
  console.log(`  MLS source: ${mlsFetchResult.sourceUsed} (${mlsFetchResult.count} events)`);
  console.log(`  MLS merge: +${mlsResult.added} added, ~${mlsResult.updated} updated, -${mlsResult.pruned} pruned → ${mlsResult.merged.length} total`);

  const allEvents = [...nhlEvents, ...ahlResult.merged, ...echlResult.merged, ...buResult.merged, ...rugbyResult.merged, ...cricketResult.merged, ...t20WcResult.merged, ...olympicHockeyResult.merged, ...eplResult.merged, ...mlsResult.merged].sort(
    (a, b) =>
      new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  const prevMeta = loadExistingMeta();
  const nowIso = now.toISOString();

  const echlSourceName = echlFetchResult.sourceUsed === "web"
    ? "HockeyTech"
    : echlFetchResult.sourceUsed === "api-hockey"
      ? "API-Hockey"
      : "none";

  const generatedMeta = {
    lastRefreshAt: nowIso,
    sources: {
      nhl: {
        count: nhlEvents.length,
        lastFetchAt: nhlEvents.length > 0 ? nowIso : (prevMeta?.sources?.nhl?.lastFetchAt || nowIso),
        sourceName: "NHL API",
      },
      ahl: {
        count: ahlResult.merged.length,
        lastFetchAt: ahlFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.ahl?.lastFetchAt || nowIso),
        sourceName: ahlSourceLabel,
        ahlSource: ahlFetchResult.sourceUsed,
      },
      echl: {
        count: echlResult.merged.length,
        lastFetchAt: echlFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.echl?.lastFetchAt || nowIso),
        sourceName: echlSourceName,
        teamFilter: "Tulsa Oilers",
      },
      ncaa: {
        count: buResult.merged.length,
        lastFetchAt: buFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.ncaa?.lastFetchAt || nowIso),
        sourceName: "College Hockey News",
        teamFilter: "Boston University",
      },
      rugby: {
        count: rugbyResult.merged.length,
        lastFetchAt: rugbyFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.rugby?.lastFetchAt || nowIso),
        sourceName: "iCal Feeds",
        leagueCounts: rugbyFetchResult.counts,
      },
      cricket: {
        count: cricketResult.merged.length,
        lastFetchAt: cricketFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.cricket?.lastFetchAt || nowIso),
        sourceName: "CricAPI",
        leagueCounts: cricketFetchResult.counts,
      },
      iccT20Wc: {
        count: t20WcResult.merged.length,
        lastFetchAt: nowIso,
        sourceName: "Hardcoded Schedule",
      },
      olympicHockey: {
        count: olympicHockeyResult.merged.length,
        lastFetchAt: nowIso,
        sourceName: "Hardcoded Schedule",
      },
      epl: {
        count: eplResult.merged.length,
        lastFetchAt: eplFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.epl?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
      mls: {
        count: mlsResult.merged.length,
        lastFetchAt: mlsFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.mls?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
    },
  };

  const output = {
    lastUpdated: nowIso,
    sources: ["NHL API (api-web.nhle.com)", "AHL (HockeyTech / Odds API fallback)", "ECHL (API-Hockey / HockeyTech web)", "NCAA (College Hockey News)", "Rugby (iCal feeds)", "Cricket (CricAPI)", "Olympic Hockey (hardcoded)", "EPL (iCal feed)", "MLS (iCal feed)"],
    ahlSourceUsed: ahlFetchResult.sourceUsed,
    ahlOddsKeyUsed: ahlFetchResult.detectedOddsKey,
    echlSourceUsed: echlFetchResult.sourceUsed,
    buSourceUsed: buFetchResult.sourceUsed,
    rugbySourceUsed: rugbyFetchResult.sourceUsed,
    cricketSourceUsed: cricketFetchResult.sourceUsed,
    nhlCount: nhlEvents.length,
    ahlCount: ahlResult.merged.length,
    ahlAdded: ahlResult.added,
    ahlUpdated: ahlResult.updated,
    ahlPruned: ahlResult.pruned,
    echlCount: echlResult.merged.length,
    echlAdded: echlResult.added,
    echlUpdated: echlResult.updated,
    echlPruned: echlResult.pruned,
    echlWebCount: echlFetchResult.webCount,
    buCount: buResult.merged.length,
    buAdded: buResult.added,
    buUpdated: buResult.updated,
    buPruned: buResult.pruned,
    rugbyCount: rugbyResult.merged.length,
    rugbyAdded: rugbyResult.added,
    rugbyUpdated: rugbyResult.updated,
    rugbyPruned: rugbyResult.pruned,
    rugbyCounts: rugbyFetchResult.counts,
    cricketCount: cricketResult.merged.length,
    cricketAdded: cricketResult.added,
    cricketUpdated: cricketResult.updated,
    cricketPruned: cricketResult.pruned,
    cricketCounts: cricketFetchResult.counts,
    iccT20WcCount: t20WcResult.merged.length,
    iccT20WcAdded: t20WcResult.added,
    iccT20WcUpdated: t20WcResult.updated,
    iccT20WcPruned: t20WcResult.pruned,
    iccT20WcSourceUsed: t20WcFetchResult.sourceUsed,
    t20wcDedupedCount,
    olympicHockeyCount: olympicHockeyResult.merged.length,
    olympicHockeyAdded: olympicHockeyResult.added,
    olympicHockeyUpdated: olympicHockeyResult.updated,
    olympicHockeyPruned: olympicHockeyResult.pruned,
    olympicHockeySourceUsed: olympicHockeyFetchResult.sourceUsed,
    eplCount: eplResult.merged.length,
    eplAdded: eplResult.added,
    eplUpdated: eplResult.updated,
    eplPruned: eplResult.pruned,
    eplSourceUsed: eplFetchResult.sourceUsed,
    mlsCount: mlsResult.merged.length,
    mlsAdded: mlsResult.added,
    mlsUpdated: mlsResult.updated,
    mlsPruned: mlsResult.pruned,
    mlsSourceUsed: mlsFetchResult.sourceUsed,
    generatedMeta,
    events: allEvents,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `\nWrote ${allEvents.length} events (${nhlEvents.length} NHL + ${ahlResult.merged.length} AHL + ${echlResult.merged.length} ECHL + ${buResult.merged.length} NCAA + ${rugbyResult.merged.length} Rugby + ${cricketResult.merged.length} Cricket + ${t20WcResult.merged.length} T20WC + ${olympicHockeyResult.merged.length} Olympic Hockey + ${eplResult.merged.length} EPL + ${mlsResult.merged.length} MLS) to ${OUTPUT_PATH}`
  );
  console.log(`AHL source: ${ahlSourceLabel}`);
  if (allEvents.length > 0) {
    console.log(`Date range: ${allEvents[0].startTimeLocal} — ${allEvents[allEvents.length - 1].startTimeLocal}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
