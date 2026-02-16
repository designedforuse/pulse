import * as fs from "fs";
import * as path from "path";

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
  providerId: string;
  isLive: boolean;
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

async function fetchNHLSchedule(dateStr: string): Promise<NHLScheduleResponse> {
  const url = `${NHL_API_BASE}/schedule/${dateStr}`;
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NHL API returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<NHLScheduleResponse>;
}

function nhlGameToEvent(game: NHLGame): AppEvent {
  return {
    id: `nhl_${game.id}`,
    sport: "hockey",
    league: "NHL",
    awayTeam: buildTeamName(game.awayTeam),
    homeTeam: buildTeamName(game.homeTeam),
    startTimeLocal: utcToLocal(game.startTimeUTC),
    providerId: "youtubetv",
    isLive: game.gameState === "LIVE" || game.gameState === "CRIT",
  };
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 7;

  console.log(`Fetching NHL schedule for ${days} days...`);

  const allEvents: AppEvent[] = [];
  const seenIds = new Set<string>();

  const today = new Date();
  let currentDate = new Date(today);

  const fetched = new Set<string>();
  let dateStr = currentDate.toISOString().split("T")[0];

  while (currentDate.getTime() - today.getTime() < days * 86400000) {
    dateStr = currentDate.toISOString().split("T")[0];

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
      console.error(`Error fetching ${dateStr}:`, err);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  allEvents.sort(
    (a, b) =>
      new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  const output = {
    lastUpdated: new Date().toISOString(),
    source: "NHL API (api-web.nhle.com)",
    events: allEvents,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `Wrote ${allEvents.length} NHL events to ${OUTPUT_PATH}`
  );
  console.log(`Date range: ${allEvents[0]?.startTimeLocal || "none"} — ${allEvents[allEvents.length - 1]?.startTimeLocal || "none"}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
