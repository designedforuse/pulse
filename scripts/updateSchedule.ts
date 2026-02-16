import * as fs from "fs";
import * as path from "path";
import { fetchAhlEvents, mergeAhlEvents } from "./updateAhlSchedule";
import { fetchEchlEvents, mergeEchlEvents } from "./updateEchlSchedule";

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

function nhlGameToEvent(game: NHLGame): AppEvent {
  const startLocal = toUtcIso(game.startTimeUTC);
  return {
    id: `nhl_${game.id}`,
    sport: "hockey",
    league: "NHL",
    awayTeam: buildTeamName(game.awayTeam),
    homeTeam: buildTeamName(game.homeTeam),
    startTimeLocal: startLocal,
    endTimeLocal: addDuration(game.startTimeUTC, 165),
    providerId: "youtubetv",
    isLive: game.gameState === "LIVE" || game.gameState === "CRIT",
    source: "nhl",
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
  console.log(`Existing cached AHL events: ${existingAhl.length}`);
  console.log(`Existing cached ECHL events: ${existingEchl.length}`);

  const [nhlEvents, ahlFetchResult, echlFetchResult] = await Promise.all([
    fetchNHLEvents(days),
    fetchAhlEvents(),
    fetchEchlEvents(),
  ]);

  const now = new Date();
  const ahlResult = mergeAhlEvents(existingAhl, ahlFetchResult.events, now);
  const echlResult = mergeEchlEvents(existingEchl, echlFetchResult.events, now);

  const ahlSourceLabel = ahlFetchResult.sourceUsed === "hockeytech"
    ? "HockeyTech"
    : ahlFetchResult.sourceUsed === "odds"
      ? "Odds API"
      : "none";
  console.log(`  AHL source: ${ahlSourceLabel} (${ahlFetchResult.hockeyTechCount} from HockeyTech, ${ahlFetchResult.oddsCount} from Odds)`);
  console.log(`  AHL merge: +${ahlResult.added} added, ~${ahlResult.updated} updated, -${ahlResult.pruned} pruned → ${ahlResult.merged.length} total`);
  console.log(`  ECHL merge: +${echlResult.added} added, ~${echlResult.updated} updated, -${echlResult.pruned} pruned → ${echlResult.merged.length} total`);
  console.log(`  ECHL source: ${echlFetchResult.sourceUsed}${echlFetchResult.webCount > 0 ? ` (${echlFetchResult.webCount} from web)` : ""}`);

  const allEvents = [...nhlEvents, ...ahlResult.merged, ...echlResult.merged].sort(
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
    },
  };

  const output = {
    lastUpdated: nowIso,
    sources: ["NHL API (api-web.nhle.com)", "AHL (HockeyTech / Odds API fallback)", "ECHL (API-Hockey / HockeyTech web)"],
    ahlSourceUsed: ahlFetchResult.sourceUsed,
    ahlOddsKeyUsed: ahlFetchResult.detectedOddsKey,
    echlSourceUsed: echlFetchResult.sourceUsed,
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
    generatedMeta,
    events: allEvents,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `\nWrote ${allEvents.length} events (${nhlEvents.length} NHL + ${ahlResult.merged.length} AHL + ${echlResult.merged.length} ECHL) to ${OUTPUT_PATH}`
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
