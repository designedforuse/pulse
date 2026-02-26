import * as fs from "node:fs";
import * as path from "node:path";

export interface ScoreData {
  awayScore: number;
  homeScore: number;
  period?: string;
  clock?: string;
  status?: string;
}

export interface ScoresResponse {
  scores: Record<string, ScoreData>;
  fetchedAt: string;
}

const GENERATED_EVENTS_PATH = path.resolve(process.cwd(), "data", "generatedEvents.json");

function loadLiveEventIds(): { nhl: string[]; ahl: string[]; echl: string[]; soccer: Map<string, string[]> } {
  const nhl: string[] = [];
  const ahl: string[] = [];
  const echl: string[] = [];
  const soccer = new Map<string, string[]>();

  try {
    const raw = fs.readFileSync(GENERATED_EVENTS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const now = Date.now();

    for (const event of data.events || []) {
      const start = new Date(event.startTimeLocal).getTime();
      const sportDurations: Record<string, number> = {
        hockey: 165 * 60 * 1000,
        soccer: 135 * 60 * 1000,
        rugby: 135 * 60 * 1000,
        cricket: 480 * 60 * 1000,
      };
      const duration = sportDurations[event.sport] ?? 120 * 60 * 1000;
      const end = start + duration;

      if (now < start - 30 * 60 * 1000 || now > end + 60 * 60 * 1000) continue;

      if (event.id.startsWith("nhl_")) {
        nhl.push(event.id);
      } else if (event.id.startsWith("ahl-")) {
        ahl.push(event.id);
      } else if (event.id.startsWith("echl-")) {
        echl.push(event.id);
      } else if (event.id.startsWith("soccer-")) {
        const league = event.league as string;
        if (!soccer.has(league)) soccer.set(league, []);
        soccer.get(league)!.push(event.id);
      }
    }
  } catch {
  }

  return { nhl, ahl, echl, soccer };
}

async function fetchNhlScores(eventIds: string[]): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (eventIds.length === 0) return scores;

  try {
    const res = await fetch("https://api-web.nhle.com/v1/score/now");
    if (!res.ok) return scores;
    const data = await res.json() as any;

    const gameIdMap = new Map<number, string>();
    for (const id of eventIds) {
      const numPart = id.replace("nhl_", "");
      gameIdMap.set(parseInt(numPart, 10), id);
    }

    for (const game of data.games || []) {
      const eventId = gameIdMap.get(game.id);
      if (!eventId) continue;

      const state = game.gameState;
      if (state === "FUT" || state === "PRE") continue;

      let period = "";
      if (game.periodDescriptor) {
        const pNum = game.periodDescriptor.number;
        const pType = game.periodDescriptor.periodType;
        if (pType === "OT") {
          period = pNum > 1 ? `${pNum}OT` : "OT";
        } else if (pType === "SO") {
          period = "SO";
        } else {
          period = `P${pNum}`;
        }
      }

      let clock = "";
      if (game.clock) {
        clock = game.clock.timeRemaining || "";
        if (game.clock.inIntermission) {
          period = `${period} INT`;
        }
      }

      let status = "live";
      if (state === "FINAL" || state === "OFF") {
        status = "final";
        clock = "";
        if (game.periodDescriptor?.periodType === "OT") {
          period = "F/OT";
        } else if (game.periodDescriptor?.periodType === "SO") {
          period = "F/SO";
        } else {
          period = "Final";
        }
      }

      scores[eventId] = {
        awayScore: game.awayTeam?.score ?? 0,
        homeScore: game.homeTeam?.score ?? 0,
        period,
        clock,
        status,
      };
    }
  } catch (err) {
    console.error("[liveScores] NHL fetch error:", err);
  }

  return scores;
}

async function fetchAhlScores(eventIds: string[]): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (eventIds.length === 0) return scores;

  const apiKey = process.env.API_HOCKEY_KEY;
  if (!apiKey) return scores;

  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(
      `https://v1.hockey.api-sports.io/games?league=57&season=2025&date=${today}`,
      { headers: { "x-apisports-key": apiKey } }
    );
    if (!res.ok) return scores;
    const data = await res.json() as any;

    const idMap = new Map<string, string>();
    for (const id of eventIds) {
      const numPart = id.replace("ahl-", "");
      idMap.set(numPart, id);
    }

    for (const game of data.response || []) {
      const gameId = String(game.id);
      const eventId = idMap.get(gameId);
      if (!eventId) continue;

      const statusShort = game.status?.short || "";
      const liveStatuses = ["LIVE", "P1", "P2", "P3", "OT", "BT"];

      if (liveStatuses.includes(statusShort)) {
        scores[eventId] = {
          awayScore: game.scores?.away ?? 0,
          homeScore: game.scores?.home ?? 0,
          period: statusShort === "LIVE" ? "Live" : statusShort,
          status: "live",
        };
      } else if (statusShort === "FT" || statusShort === "AOT" || statusShort === "AP") {
        let period = "Final";
        if (statusShort === "AOT") period = "F/OT";
        if (statusShort === "AP") period = "F/SO";
        scores[eventId] = {
          awayScore: game.scores?.away ?? 0,
          homeScore: game.scores?.home ?? 0,
          period,
          status: "final",
        };
      }
    }
  } catch (err) {
    console.error("[liveScores] AHL fetch error:", err);
  }

  return scores;
}

async function fetchEchlScores(eventIds: string[]): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (eventIds.length === 0) return scores;

  const apiKey = process.env.API_HOCKEY_KEY;
  if (!apiKey) return scores;

  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(
      `https://v1.hockey.api-sports.io/games?league=59&season=2025&date=${today}`,
      { headers: { "x-apisports-key": apiKey } }
    );
    if (!res.ok) return scores;
    const data = await res.json() as any;

    const idMap = new Map<string, string>();
    for (const id of eventIds) {
      const numPart = id.replace("echl-web-", "").replace("echl-", "");
      idMap.set(numPart, id);
    }

    for (const game of data.response || []) {
      const gameId = String(game.id);
      let eventId = idMap.get(gameId);

      if (!eventId) {
        for (const [key, val] of idMap.entries()) {
          if (val.includes(gameId)) {
            eventId = val;
            break;
          }
        }
      }
      if (!eventId) continue;

      const statusShort = game.status?.short || "";
      const liveStatuses = ["LIVE", "P1", "P2", "P3", "OT", "BT"];

      if (liveStatuses.includes(statusShort)) {
        scores[eventId] = {
          awayScore: game.scores?.away ?? 0,
          homeScore: game.scores?.home ?? 0,
          period: statusShort === "LIVE" ? "Live" : statusShort,
          status: "live",
        };
      } else if (statusShort === "FT" || statusShort === "AOT" || statusShort === "AP") {
        let period = "Final";
        if (statusShort === "AOT") period = "F/OT";
        if (statusShort === "AP") period = "F/SO";
        scores[eventId] = {
          awayScore: game.scores?.away ?? 0,
          homeScore: game.scores?.home ?? 0,
          period,
          status: "final",
        };
      }
    }
  } catch (err) {
    console.error("[liveScores] ECHL fetch error:", err);
  }

  return scores;
}

const ESPN_LEAGUE_PATHS: Record<string, string> = {
  "EPL": "eng.1",
  "La Liga": "esp.1",
  "Serie A": "ita.1",
  "Bundesliga": "ger.1",
  "Ligue 1": "fra.1",
  "MLS": "usa.1",
  "NWSL": "usa.nwsl",
  "USL": "usa.usl.1",
  "Champions League": "uefa.champions",
  "FA Cup": "eng.fa",
};

async function fetchSoccerScores(soccerMap: Map<string, string[]>): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (soccerMap.size === 0) return scores;

  const leaguesToFetch = new Set<string>();
  for (const [league] of soccerMap) {
    if (ESPN_LEAGUE_PATHS[league]) {
      leaguesToFetch.add(league);
    }
  }

  const fetches = Array.from(leaguesToFetch).map(async (league) => {
    const espnPath = ESPN_LEAGUE_PATHS[league];
    const eventIds = soccerMap.get(league) || [];
    if (eventIds.length === 0) return;

    try {
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnPath}/scoreboard?dates=${today}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as any;

      for (const espnEvent of data.events || []) {
        const comp = espnEvent.competitions?.[0];
        if (!comp) continue;

        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");
        if (!homeComp || !awayComp) continue;

        const homeName = (homeComp.team?.shortDisplayName || homeComp.team?.displayName || "").toLowerCase();
        const awayName = (awayComp.team?.shortDisplayName || awayComp.team?.displayName || "").toLowerCase();

        for (const eventId of eventIds) {
          const idLower = eventId.toLowerCase();
          const homeSlug = homeName.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
          const awaySlug = awayName.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

          if (idLower.includes(homeSlug.substring(0, 6)) || idLower.includes(awaySlug.substring(0, 6))) {
            const statusState = comp.status?.type?.state;
            const statusDetail = comp.status?.type?.shortDetail || comp.status?.displayClock || "";

            if (statusState === "in") {
              const clock = comp.status?.displayClock || "";
              const period = statusDetail || "Live";
              scores[eventId] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period,
                clock,
                status: "live",
              };
            } else if (statusState === "post") {
              scores[eventId] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period: "Final",
                status: "final",
              };
            }
            break;
          }
        }
      }
    } catch (err) {
      console.error(`[liveScores] Soccer ${league} fetch error:`, err);
    }
  });

  await Promise.all(fetches);
  return scores;
}

export async function fetchAllLiveScores(): Promise<ScoresResponse> {
  const { nhl, ahl, echl, soccer } = loadLiveEventIds();

  const [nhlScores, ahlScores, echlScores, soccerScores] = await Promise.all([
    fetchNhlScores(nhl),
    fetchAhlScores(ahl),
    fetchEchlScores(echl),
    fetchSoccerScores(soccer),
  ]);

  return {
    scores: { ...nhlScores, ...ahlScores, ...echlScores, ...soccerScores },
    fetchedAt: new Date().toISOString(),
  };
}
