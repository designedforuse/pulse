import * as fs from "fs";
import * as path from "path";

const NHL_API_BASE = "https://api-web.nhle.com/v1";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
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

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
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

function utcToLocal(utcString: string): string {
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return utcToLocal(date.toISOString());
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
  const startLocal = utcToLocal(game.startTimeUTC);
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

async function fetchAHLEvents(): Promise<AppEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("ODDS_API_KEY not set — skipping AHL schedule fetch.");
    return [];
  }

  const url = `${ODDS_API_BASE}/sports/icehockey_ahl/events?apiKey=${apiKey}`;
  console.log(`  AHL: Fetching from The Odds API...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  AHL: Odds API returned ${res.status}: ${res.statusText}`);
      return [];
    }

    const events: OddsApiEvent[] = await res.json() as OddsApiEvent[];
    console.log(`  AHL: Received ${events.length} events from API`);

    const HOCKEY_DURATION_MIN = 165;

    return events.map((e) => {
      const startLocal = utcToLocal(e.commence_time);
      return {
        id: `ahl_${e.id}`,
        sport: "hockey",
        league: "AHL",
        awayTeam: e.away_team,
        homeTeam: e.home_team,
        startTimeLocal: startLocal,
        endTimeLocal: addDuration(e.commence_time, HOCKEY_DURATION_MIN),
        providerId: "flosports",
        isLive: false,
        source: "ahl",
      };
    });
  } catch (err) {
    console.error("  AHL: Failed to fetch from Odds API:", err);
    return [];
  }
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 7;

  const [nhlEvents, ahlEvents] = await Promise.all([
    fetchNHLEvents(days),
    fetchAHLEvents(),
  ]);

  const allEvents = [...nhlEvents, ...ahlEvents].sort(
    (a, b) =>
      new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  const output = {
    lastUpdated: new Date().toISOString(),
    sources: ["NHL API (api-web.nhle.com)", "The Odds API (AHL)"],
    events: allEvents,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `\nWrote ${allEvents.length} events (${nhlEvents.length} NHL + ${ahlEvents.length} AHL) to ${OUTPUT_PATH}`
  );
  if (allEvents.length > 0) {
    console.log(`Date range: ${allEvents[0].startTimeLocal} — ${allEvents[allEvents.length - 1].startTimeLocal}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
