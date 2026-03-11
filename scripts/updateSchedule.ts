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
import { fetchSerieAEvents, mergeSerieAEvents } from "./updateSerieA";
import { fetchLaLigaEvents, mergeLaLigaEvents } from "./updateLaLiga";
import { fetchBundesligaEvents, mergeBundesligaEvents } from "./updateBundesliga";
import { fetchLigue1Events, mergeLigue1Events } from "./updateLigue1";
import { fetchNwslEvents, mergeNwslEvents } from "./updateNwsl";
import { fetchUslEvents, mergeUslEvents } from "./updateUsl";
import { fetchChampionsCupEvents, mergeChampionsCupEvents } from "./updateChampionsCup";
import { fetchMlrEvents, mergeMlrEvents } from "./updateMlr";
import { fetchChampionsLeagueEvents, mergeChampionsLeagueEvents } from "./updateChampionsLeague";
import { fetchEuropaLeagueEvents, mergeEuropaLeagueEvents } from "./updateEuropaLeague";
import { fetchFaCupEvents, mergeFaCupEvents } from "./updateFaCup";
import { fetchTennisEvents, mergeTennisEvents } from "./updateTennis";
import { fetchF1Events, mergeF1Events } from "./updateF1";
import { fetchGolfEvents, mergeGolfEvents } from "./updateGolf";
import { fetchNbaEvents, mergeNbaEvents } from "./updateNba";

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
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 1);
  let currentDate = new Date(startDate);
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
  const existingRugby = loadExistingByPrefix("rugby-").filter((e: AppEvent) => !e.id.startsWith("rugby-championscup-") && !e.id.startsWith("rugby-mlr-"));
  const existingChampionsCup = loadExistingByPrefix("rugby-championscup-");
  const existingMlr = loadExistingByPrefix("rugby-mlr-");
  const existingCricket = loadExistingByPrefix("cricket-").filter((e: AppEvent) => !e.id.startsWith("cricket-t20wc-"));
  const existingT20Wc = loadExistingByPrefix("cricket-t20wc-");
  const existingOlympicHockey = loadExistingByPrefix("olympic-hockey-2026-");
  const existingEpl = loadExistingByPrefix("soccer-epl-");
  const existingMls = loadExistingByPrefix("soccer-mls-");
  const existingSerieA = loadExistingByPrefix("soccer-seriea-");
  const existingLaLiga = loadExistingByPrefix("soccer-laliga-");
  const existingBundesliga = loadExistingByPrefix("soccer-bundesliga-");
  const existingLigue1 = loadExistingByPrefix("soccer-ligue1-");
  const existingNwsl = loadExistingByPrefix("soccer-nwsl-");
  const existingUsl = loadExistingByPrefix("soccer-usl-");
  const existingChampionsLeague = loadExistingByPrefix("soccer-championsleague-");
  const existingEuropaLeague = loadExistingByPrefix("soccer-europaleague-");
  const existingFaCup = loadExistingByPrefix("soccer-facup-");
  const existingTennis = loadExistingByPrefix("tennis-");
  const existingF1 = loadExistingByPrefix("f1-");
  const existingGolf = loadExistingByPrefix("golf-");
  const existingNba = loadExistingByPrefix("basketball-nba-");
  console.log(`Existing cached AHL events: ${existingAhl.length}`);
  console.log(`Existing cached ECHL events: ${existingEchl.length}`);
  console.log(`Existing cached BU events: ${existingBu.length}`);
  console.log(`Existing cached Rugby events: ${existingRugby.length}`);
  console.log(`Existing cached Champions Cup events: ${existingChampionsCup.length}`);
  console.log(`Existing cached MLR events: ${existingMlr.length}`);
  console.log(`Existing cached Cricket events: ${existingCricket.length}`);
  console.log(`Existing cached T20 WC events: ${existingT20Wc.length}`);
  console.log(`Existing cached Olympic Hockey events: ${existingOlympicHockey.length}`);
  console.log(`Existing cached EPL events: ${existingEpl.length}`);
  console.log(`Existing cached MLS events: ${existingMls.length}`);
  console.log(`Existing cached Serie A events: ${existingSerieA.length}`);
  console.log(`Existing cached La Liga events: ${existingLaLiga.length}`);
  console.log(`Existing cached Bundesliga events: ${existingBundesliga.length}`);
  console.log(`Existing cached Ligue 1 events: ${existingLigue1.length}`);
  console.log(`Existing cached NWSL events: ${existingNwsl.length}`);
  console.log(`Existing cached USL events: ${existingUsl.length}`);
  console.log(`Existing cached Champions League events: ${existingChampionsLeague.length}`);
  console.log(`Existing cached Europa League events: ${existingEuropaLeague.length}`);
  console.log(`Existing cached FA Cup events: ${existingFaCup.length}`);
  console.log(`Existing cached Tennis events: ${existingTennis.length}`);
  console.log(`Existing cached F1 events: ${existingF1.length}`);
  console.log(`Existing cached Golf events: ${existingGolf.length}`);
  console.log(`Existing cached NBA events: ${existingNba.length}`);

  const t20WcFetchResult = fetchIccT20WcEvents();
  const olympicHockeyFetchResult = fetchOlympicHockeyEvents();
  const mlrFetchResult = fetchMlrEvents();
  const golfFetchResult = fetchGolfEvents();
  const tennisFetchResult = await fetchTennisEvents();

  const [nhlEvents, ahlFetchResult, echlFetchResult, buFetchResult, rugbyFetchResult, cricketFetchResult, eplFetchResult, mlsFetchResult, serieAFetchResult, laLigaFetchResult, bundesligaFetchResult, ligue1FetchResult, nwslFetchResult, uslFetchResult, championsCupFetchResult, championsLeagueFetchResult, europaLeagueFetchResult, faCupFetchResult, f1FetchResult, nbaFetchResult] = await Promise.all([
    fetchNHLEvents(days),
    fetchAhlEvents(),
    fetchEchlEvents(),
    fetchBuEvents(),
    fetchRugbyEvents(),
    fetchCricketEvents(),
    fetchEplEvents(),
    fetchMlsEvents(),
    fetchSerieAEvents(),
    fetchLaLigaEvents(),
    fetchBundesligaEvents(),
    fetchLigue1Events(),
    fetchNwslEvents(),
    fetchUslEvents(),
    fetchChampionsCupEvents(),
    fetchChampionsLeagueEvents(),
    fetchEuropaLeagueEvents(),
    fetchFaCupEvents(),
    fetchF1Events(),
    fetchNbaEvents(),
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
  const serieAResult = mergeSerieAEvents(existingSerieA, serieAFetchResult.events, now);
  const laLigaResult = mergeLaLigaEvents(existingLaLiga, laLigaFetchResult.events, now);
  const bundesligaResult = mergeBundesligaEvents(existingBundesliga, bundesligaFetchResult.events, now);
  const ligue1Result = mergeLigue1Events(existingLigue1, ligue1FetchResult.events, now);
  const nwslResult = mergeNwslEvents(existingNwsl, nwslFetchResult.events, now);
  const uslResult = mergeUslEvents(existingUsl, uslFetchResult.events, now);
  const championsCupResult = mergeChampionsCupEvents(existingChampionsCup, championsCupFetchResult.events, now);
  const mlrResult = mergeMlrEvents(existingMlr, mlrFetchResult.events, now);
  const championsLeagueResult = mergeChampionsLeagueEvents(existingChampionsLeague, championsLeagueFetchResult.events, now);
  const europaLeagueResult = mergeEuropaLeagueEvents(existingEuropaLeague, europaLeagueFetchResult.events, now);
  const faCupResult = mergeFaCupEvents(existingFaCup, faCupFetchResult.events, now);
  const tennisResult = mergeTennisEvents(existingTennis, tennisFetchResult.events, now, tennisFetchResult.espnActiveTournaments);
  const f1Result = mergeF1Events(existingF1, f1FetchResult.events);
  const golfResult = mergeGolfEvents(existingGolf, golfFetchResult.events, now);
  const nbaResult = mergeNbaEvents(existingNba, nbaFetchResult.events, now);

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
  console.log(`  Champions Cup source: ${championsCupFetchResult.sourceUsed} (${championsCupFetchResult.count} events)`);
  console.log(`  Champions Cup merge: +${championsCupResult.added} added, ~${championsCupResult.updated} updated, -${championsCupResult.pruned} pruned → ${championsCupResult.merged.length} total`);
  console.log(`  MLR source: ${mlrFetchResult.sourceUsed} (${mlrFetchResult.count} events)`);
  console.log(`  MLR merge: +${mlrResult.added} added, ~${mlrResult.updated} updated, -${mlrResult.pruned} pruned → ${mlrResult.merged.length} total`);
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
  console.log(`  Serie A source: ${serieAFetchResult.sourceUsed} (${serieAFetchResult.count} events)`);
  console.log(`  Serie A merge: +${serieAResult.added} added, ~${serieAResult.updated} updated, -${serieAResult.pruned} pruned → ${serieAResult.merged.length} total`);
  console.log(`  La Liga source: ${laLigaFetchResult.sourceUsed} (${laLigaFetchResult.count} events)`);
  console.log(`  La Liga merge: +${laLigaResult.added} added, ~${laLigaResult.updated} updated, -${laLigaResult.pruned} pruned → ${laLigaResult.merged.length} total`);
  console.log(`  Bundesliga source: ${bundesligaFetchResult.sourceUsed} (${bundesligaFetchResult.count} events)`);
  console.log(`  Bundesliga merge: +${bundesligaResult.added} added, ~${bundesligaResult.updated} updated, -${bundesligaResult.pruned} pruned → ${bundesligaResult.merged.length} total`);
  console.log(`  Ligue 1 source: ${ligue1FetchResult.sourceUsed} (${ligue1FetchResult.count} events)`);
  console.log(`  Ligue 1 merge: +${ligue1Result.added} added, ~${ligue1Result.updated} updated, -${ligue1Result.pruned} pruned → ${ligue1Result.merged.length} total`);
  console.log(`  NWSL source: ${nwslFetchResult.sourceUsed} (${nwslFetchResult.count} events)`);
  console.log(`  NWSL merge: +${nwslResult.added} added, ~${nwslResult.updated} updated, -${nwslResult.pruned} pruned → ${nwslResult.merged.length} total`);
  console.log(`  USL source: ${uslFetchResult.sourceUsed} (${uslFetchResult.count} events)`);
  console.log(`  USL merge: +${uslResult.added} added, ~${uslResult.updated} updated, -${uslResult.pruned} pruned → ${uslResult.merged.length} total`);
  console.log(`  Champions League source: ${championsLeagueFetchResult.sourceUsed} (${championsLeagueFetchResult.count} events)`);
  console.log(`  Champions League merge: +${championsLeagueResult.added} added, ~${championsLeagueResult.updated} updated, -${championsLeagueResult.pruned} pruned → ${championsLeagueResult.merged.length} total`);
  console.log(`  Europa League source: ${europaLeagueFetchResult.sourceUsed} (${europaLeagueFetchResult.count} events)`);
  console.log(`  Europa League merge: +${europaLeagueResult.added} added, ~${europaLeagueResult.updated} updated, -${europaLeagueResult.pruned} pruned → ${europaLeagueResult.merged.length} total`);
  console.log(`  FA Cup source: ${faCupFetchResult.sourceUsed} (${faCupFetchResult.count} events)`);
  console.log(`  FA Cup merge: +${faCupResult.added} added, ~${faCupResult.updated} updated, -${faCupResult.pruned} pruned → ${faCupResult.merged.length} total`);
  console.log(`  Tennis source: ${tennisFetchResult.sourceUsed} (${tennisFetchResult.count} matches)`);
  console.log(`  Tennis merge: +${tennisResult.added} added, ~${tennisResult.updated} updated, -${tennisResult.pruned} pruned → ${tennisResult.merged.length} total`);
  console.log(`  F1 source: ${f1FetchResult.sourceUsed} (${f1FetchResult.count} sessions across ${Object.keys(f1FetchResult.raceCounts).length} GPs)`);
  console.log(`  F1 merge: +${f1Result.added} added, ~${f1Result.updated} updated, -${f1Result.pruned} pruned → ${f1Result.merged.length} total`);
  console.log(`  Golf source: ${golfFetchResult.sourceUsed} (${golfFetchResult.count} sessions across ${Object.keys(golfFetchResult.tournamentCounts).length} tournaments)`);
  console.log(`  Golf merge: +${golfResult.added} added, ~${golfResult.updated} updated, -${golfResult.pruned} pruned → ${golfResult.merged.length} total`);
  console.log(`  NBA source: ${nbaFetchResult.sourceUsed} (${nbaFetchResult.count} events)`);
  console.log(`  NBA merge: +${nbaResult.added} added, ~${nbaResult.updated} updated, -${nbaResult.pruned} pruned → ${nbaResult.merged.length} total`);

  const allEvents = [...nhlEvents, ...ahlResult.merged, ...echlResult.merged, ...buResult.merged, ...rugbyResult.merged, ...championsCupResult.merged, ...mlrResult.merged, ...cricketResult.merged, ...t20WcResult.merged, ...olympicHockeyResult.merged, ...eplResult.merged, ...mlsResult.merged, ...serieAResult.merged, ...laLigaResult.merged, ...bundesligaResult.merged, ...ligue1Result.merged, ...nwslResult.merged, ...uslResult.merged, ...championsLeagueResult.merged, ...europaLeagueResult.merged, ...faCupResult.merged, ...tennisResult.merged, ...f1Result.merged, ...golfResult.merged, ...nbaResult.merged].sort(
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
      serieA: {
        count: serieAResult.merged.length,
        lastFetchAt: serieAFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.serieA?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
      laLiga: {
        count: laLigaResult.merged.length,
        lastFetchAt: laLigaFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.laLiga?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
      bundesliga: {
        count: bundesligaResult.merged.length,
        lastFetchAt: bundesligaFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.bundesliga?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
      ligue1: {
        count: ligue1Result.merged.length,
        lastFetchAt: ligue1FetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.ligue1?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
      },
      nwsl: {
        count: nwslResult.merged.length,
        lastFetchAt: nwslFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.nwsl?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
        firstMatchDate: (nwslFetchResult as any).firstMatchDate || prevMeta?.sources?.nwsl?.firstMatchDate || null,
      },
      usl: {
        count: uslResult.merged.length,
        lastFetchAt: uslFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.usl?.lastFetchAt || nowIso),
        sourceName: "ESPN API",
        firstMatchDate: (uslFetchResult as any).firstMatchDate || prevMeta?.sources?.usl?.firstMatchDate || null,
      },
      championsCup: {
        count: championsCupResult.merged.length,
        lastFetchAt: championsCupFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.championsCup?.lastFetchAt || nowIso),
        sourceName: "iCal Feed",
        firstMatchDate: championsCupFetchResult.firstMatchDate || prevMeta?.sources?.championsCup?.firstMatchDate || null,
      },
      mlr: {
        count: mlrResult.merged.length,
        lastFetchAt: nowIso,
        sourceName: "Hardcoded Schedule",
        firstMatchDate: mlrFetchResult.firstMatchDate || prevMeta?.sources?.mlr?.firstMatchDate || null,
      },
      championsLeague: {
        count: championsLeagueResult.merged.length,
        lastFetchAt: championsLeagueFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.championsLeague?.lastFetchAt || nowIso),
        sourceName: "ESPN API",
      },
      europaLeague: {
        count: europaLeagueResult.merged.length,
        lastFetchAt: europaLeagueFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.europaLeague?.lastFetchAt || nowIso),
        sourceName: "ESPN API",
      },
      faCup: {
        count: faCupResult.merged.length,
        lastFetchAt: faCupFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.faCup?.lastFetchAt || nowIso),
        sourceName: "ESPN API",
        firstMatchDate: (faCupFetchResult as any).firstMatchDate || prevMeta?.sources?.faCup?.firstMatchDate || null,
      },
      tennis: {
        count: tennisResult.merged.length,
        lastFetchAt: nowIso,
        sourceName: "Hardcoded Schedule",
        tournamentCounts: tennisFetchResult.tournamentCounts,
      },
      f1: {
        count: f1Result.merged.length,
        lastFetchAt: f1FetchResult.count > 0 ? nowIso : (prevMeta?.sources?.f1?.lastFetchAt || nowIso),
        sourceName: "ESPN F1 API",
        raceCounts: f1FetchResult.raceCounts,
      },
      golf: {
        count: golfResult.merged.length,
        lastFetchAt: nowIso,
        sourceName: "Hardcoded Schedule",
        tournamentCounts: golfFetchResult.tournamentCounts,
      },
      nba: {
        count: nbaResult.merged.length,
        lastFetchAt: nbaFetchResult.events.length > 0 ? nowIso : (prevMeta?.sources?.nba?.lastFetchAt || nowIso),
        sourceName: "ESPN API",
      },
    },
  };

  const output = {
    lastUpdated: nowIso,
    sources: ["NHL API (api-web.nhle.com)", "AHL (HockeyTech / Odds API fallback)", "ECHL (API-Hockey / HockeyTech web)", "NCAA (College Hockey News)", "Rugby (iCal feeds)", "Champions Cup (iCal feed)", "MLR (hardcoded)", "Cricket (CricAPI)", "Olympic Hockey (hardcoded)", "EPL (iCal feed)", "MLS (iCal feed)", "Serie A (iCal feed)", "La Liga (iCal feed)", "Bundesliga (iCal feed)", "Ligue 1 (iCal feed)", "NWSL (iCal feed)", "USL (ESPN API)", "Champions League (ESPN API)", "Europa League (ESPN API)", "FA Cup (ESPN API)", "Tennis (hardcoded)", "F1 (ESPN API)", "NBA (ESPN API)"],
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
    serieaCount: serieAResult.merged.length,
    serieaAdded: serieAResult.added,
    serieaUpdated: serieAResult.updated,
    serieaPruned: serieAResult.pruned,
    serieaSourceUsed: serieAFetchResult.sourceUsed,
    laligaCount: laLigaResult.merged.length,
    laligaAdded: laLigaResult.added,
    laligaUpdated: laLigaResult.updated,
    laligaPruned: laLigaResult.pruned,
    laligaSourceUsed: laLigaFetchResult.sourceUsed,
    bundesligaCount: bundesligaResult.merged.length,
    bundesligaAdded: bundesligaResult.added,
    bundesligaUpdated: bundesligaResult.updated,
    bundesligaPruned: bundesligaResult.pruned,
    bundesligaSourceUsed: bundesligaFetchResult.sourceUsed,
    ligue1Count: ligue1Result.merged.length,
    ligue1Added: ligue1Result.added,
    ligue1Updated: ligue1Result.updated,
    ligue1Pruned: ligue1Result.pruned,
    ligue1SourceUsed: ligue1FetchResult.sourceUsed,
    nwslCount: nwslResult.merged.length,
    nwslAdded: nwslResult.added,
    nwslUpdated: nwslResult.updated,
    nwslPruned: nwslResult.pruned,
    nwslSourceUsed: nwslFetchResult.sourceUsed,
    uslCount: uslResult.merged.length,
    uslAdded: uslResult.added,
    uslUpdated: uslResult.updated,
    uslPruned: uslResult.pruned,
    uslSourceUsed: uslFetchResult.sourceUsed,
    championsCupCount: championsCupResult.merged.length,
    championsCupAdded: championsCupResult.added,
    championsCupUpdated: championsCupResult.updated,
    championsCupPruned: championsCupResult.pruned,
    championsCupSourceUsed: championsCupFetchResult.sourceUsed,
    mlrCount: mlrResult.merged.length,
    mlrAdded: mlrResult.added,
    mlrUpdated: mlrResult.updated,
    mlrPruned: mlrResult.pruned,
    mlrSourceUsed: mlrFetchResult.sourceUsed,
    championsLeagueCount: championsLeagueResult.merged.length,
    championsLeagueAdded: championsLeagueResult.added,
    championsLeagueUpdated: championsLeagueResult.updated,
    championsLeaguePruned: championsLeagueResult.pruned,
    championsLeagueSourceUsed: championsLeagueFetchResult.sourceUsed,
    europaLeagueCount: europaLeagueResult.merged.length,
    europaLeagueAdded: europaLeagueResult.added,
    europaLeagueUpdated: europaLeagueResult.updated,
    europaLeaguePruned: europaLeagueResult.pruned,
    europaLeagueSourceUsed: europaLeagueFetchResult.sourceUsed,
    faCupCount: faCupResult.merged.length,
    faCupAdded: faCupResult.added,
    faCupUpdated: faCupResult.updated,
    faCupPruned: faCupResult.pruned,
    faCupSourceUsed: faCupFetchResult.sourceUsed,
    tennisCount: tennisResult.merged.length,
    tennisAdded: tennisResult.added,
    tennisUpdated: tennisResult.updated,
    tennisPruned: tennisResult.pruned,
    tennisSourceUsed: tennisFetchResult.sourceUsed,
    tennisTournamentCounts: tennisFetchResult.tournamentCounts,
    f1Count: f1Result.merged.length,
    f1Added: f1Result.added,
    f1Updated: f1Result.updated,
    f1Pruned: f1Result.pruned,
    f1SourceUsed: f1FetchResult.sourceUsed,
    f1RaceCounts: f1FetchResult.raceCounts,
    golfCount: golfResult.merged.length,
    golfAdded: golfResult.added,
    golfUpdated: golfResult.updated,
    golfPruned: golfResult.pruned,
    golfSourceUsed: golfFetchResult.sourceUsed,
    golfTournamentCounts: golfFetchResult.tournamentCounts,
    nbaCount: nbaResult.merged.length,
    nbaAdded: nbaResult.added,
    nbaUpdated: nbaResult.updated,
    nbaPruned: nbaResult.pruned,
    nbaSourceUsed: nbaFetchResult.sourceUsed,
    generatedMeta,
    events: allEvents,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `\nWrote ${allEvents.length} events (${nhlEvents.length} NHL + ${ahlResult.merged.length} AHL + ${echlResult.merged.length} ECHL + ${buResult.merged.length} NCAA + ${rugbyResult.merged.length} Rugby + ${championsCupResult.merged.length} Champions Cup + ${mlrResult.merged.length} MLR + ${cricketResult.merged.length} Cricket + ${t20WcResult.merged.length} T20WC + ${olympicHockeyResult.merged.length} Olympic Hockey + ${eplResult.merged.length} EPL + ${mlsResult.merged.length} MLS + ${serieAResult.merged.length} Serie A + ${laLigaResult.merged.length} La Liga + ${bundesligaResult.merged.length} Bundesliga + ${ligue1Result.merged.length} Ligue 1 + ${nwslResult.merged.length} NWSL + ${uslResult.merged.length} USL + ${championsLeagueResult.merged.length} UCL + ${europaLeagueResult.merged.length} UEL + ${faCupResult.merged.length} FA Cup + ${tennisResult.merged.length} Tennis + ${f1Result.merged.length} F1 + ${golfResult.merged.length} Golf + ${nbaResult.merged.length} NBA) to ${OUTPUT_PATH}`
  );
  console.log(`AHL source: ${ahlSourceLabel}`);
  if (allEvents.length > 0) {
    console.log(`Date range: ${allEvents[0].startTimeLocal} — ${allEvents[allEvents.length - 1].startTimeLocal}`);
  }

  try {
    const { generateAndSave } = await import("./exploreNarratives");
    await generateAndSave();
  } catch (err: any) {
    console.error("Narrative generation failed (non-fatal):", err.message);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
