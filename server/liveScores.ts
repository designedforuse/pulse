import * as fs from "node:fs";
import * as path from "node:path";

export interface TennisSetScore {
  p1: number;
  p2: number;
  tiebreak?: string;
  winner?: 1 | 2;
}

export interface ScoreData {
  awayScore: number;
  homeScore: number;
  period?: string;
  clock?: string;
  status?: string;
  cricketAway?: string;
  cricketHome?: string;
  secondsRemaining?: number;
  periodNumber?: number;
  periodType?: string;
  inIntermission?: boolean;
  gameState?: string;
  awaySog?: number;
  homeSog?: number;
  lastGoalTimeInPeriod?: string;
  lastGoalPeriod?: number;
  lastGoalStrength?: string;
  lastGoalTeam?: string;
  goalCount?: number;
  tennisSetScores?: TennisSetScore[];
  tennisGameScore?: { p1: string; p2: string };
  tennisServer?: 1 | 2;
  tennisStatusDetail?: string;
  tennisWinner?: 1 | 2;
  racingStatus?: string;
  racingLap?: string;
  racingLeader?: string;
  racingLeaderCountry?: string;
  racingLeaderTeam?: string;
  racingLeaderPosition?: number;
  racingLeaderNumber?: number;
  racingLeaderGrid?: number;
  racingLapNum?: number;
  racingTotalLaps?: number;
  racingSessionType?: string;
}

export interface ScoresResponse {
  scores: Record<string, ScoreData>;
  fetchedAt: string;
}

const GENERATED_EVENTS_PATH = path.resolve(process.cwd(), "data", "generatedEvents.json");

interface LiveEventIdBuckets {
  nhl: string[];
  ahl: string[];
  echl: string[];
  ncaa: { id: string; homeTeam: string; awayTeam: string; startTime: string }[];
  soccer: Map<string, string[]>;
  rugby: Map<string, { id: string; homeTeam: string; awayTeam: string }[]>;
  cricket: { id: string; homeTeam: string; awayTeam: string }[];
  tennis: { id: string; espnId: string }[];
  f1: { id: string; espnCompId: string; sessionTitle: string }[];
}

function loadLiveEventIds(): LiveEventIdBuckets {
  const nhl: string[] = [];
  const ahl: string[] = [];
  const echl: string[] = [];
  const ncaa: { id: string; homeTeam: string; awayTeam: string; startTime: string }[] = [];
  const soccer = new Map<string, string[]>();
  const rugby = new Map<string, { id: string; homeTeam: string; awayTeam: string }[]>();
  const cricket: { id: string; homeTeam: string; awayTeam: string }[] = [];
  const tennis: { id: string; espnId: string }[] = [];
  const f1: { id: string; espnCompId: string; sessionTitle: string }[] = [];

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
        racing: 180 * 60 * 1000,
      };
      const duration = sportDurations[event.sport] ?? 120 * 60 * 1000;
      const end = start + duration;

      const lookbackMs = 18 * 60 * 60 * 1000;
      if (now < start - 30 * 60 * 1000 || now > start + lookbackMs) continue;

      if (event.id.startsWith("nhl_")) {
        nhl.push(event.id);
      } else if (event.id.startsWith("ahl-")) {
        ahl.push(event.id);
      } else if (event.id.startsWith("echl-")) {
        echl.push(event.id);
      } else if (event.id.startsWith("ncaa-")) {
        ncaa.push({
          id: event.id,
          homeTeam: event.homeTeam || "",
          awayTeam: event.awayTeam || "",
          startTime: event.startTimeLocal || "",
        });
      } else if (event.id.startsWith("soccer-")) {
        const league = event.league as string;
        if (!soccer.has(league)) soccer.set(league, []);
        soccer.get(league)!.push(event.id);
      } else if (event.id.startsWith("rugby-")) {
        const league = event.league as string;
        if (!rugby.has(league)) rugby.set(league, []);
        rugby.get(league)!.push({
          id: event.id,
          homeTeam: event.homeTeam || "",
          awayTeam: event.awayTeam || "",
        });
      } else if (event.id.startsWith("cricket-")) {
        cricket.push({
          id: event.id,
          homeTeam: event.homeTeam || "",
          awayTeam: event.awayTeam || "",
        });
      } else if (event.id.startsWith("tennis-espn-")) {
        const espnId = event.id.replace("tennis-espn-", "");
        tennis.push({ id: event.id, espnId });
      } else if (event.id.startsWith("f1-espn-")) {
        const espnCompId = event.id.replace("f1-espn-", "");
        f1.push({ id: event.id, espnCompId, sessionTitle: event.sessionTitle || event.awayTeam || "" });
      }
    }
  } catch {
  }

  return { nhl, ahl, echl, ncaa, soccer, rugby, cricket, tennis, f1 };
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

      let lastGoalTimeInPeriod: string | undefined;
      let lastGoalPeriod: number | undefined;
      let lastGoalStrength: string | undefined;
      let lastGoalTeam: string | undefined;
      const goals = game.goals || [];
      if (goals.length > 0) {
        const last = goals[goals.length - 1];
        lastGoalTimeInPeriod = last.timeInPeriod;
        lastGoalPeriod = last.period ?? last.periodDescriptor?.number;
        lastGoalStrength = last.strength;
        lastGoalTeam = last.teamAbbrev;
      }

      scores[eventId] = {
        awayScore: game.awayTeam?.score ?? 0,
        homeScore: game.homeTeam?.score ?? 0,
        period,
        clock,
        status,
        secondsRemaining: game.clock?.secondsRemaining,
        periodNumber: game.periodDescriptor?.number,
        periodType: game.periodDescriptor?.periodType,
        inIntermission: game.clock?.inIntermission ?? false,
        gameState: state,
        awaySog: game.awayTeam?.sog,
        homeSog: game.homeTeam?.sog,
        lastGoalTimeInPeriod,
        lastGoalPeriod,
        lastGoalStrength,
        lastGoalTeam,
        goalCount: goals.length,
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

  try {
    const url = "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&numberofdaysback=1&numberofdaysahead=1&key=ccb91f29d6744675&client_code=ahl&lang=en&fmt=json";
    const res = await fetch(url);
    if (!res.ok) return scores;
    let text = await res.text();
    text = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(text);
    const games: any[] = data.SiteKit?.Scorebar || [];

    const idMap = new Map<string, string>();
    for (const id of eventIds) {
      const numPart = id.replace("ahl-", "");
      idMap.set(numPart, id);
    }

    for (const g of games) {
      const gameId = String(g.ID || "");
      const eventId = idMap.get(gameId);
      if (!eventId) continue;

      const gameStatus = parseInt(g.GameStatus || "0", 10);
      const homeScore = parseInt(g.HomeGoals || "0", 10);
      const awayScore = parseInt(g.VisitorGoals || "0", 10);
      const periodNum = g.Period || "";
      const clock = g.GameClock || "";

      const isLive = gameStatus === 2 || gameStatus === 3 || gameStatus === 10;
      if (isLive) {
        let period = periodNum ? `P${periodNum}` : "Live";
        let displayClock = clock;
        if (gameStatus === 10) {
          period = `P${periodNum} INT`;
          displayClock = "";
        }
        scores[eventId] = { awayScore, homeScore, period, clock: displayClock, status: "live" };
      } else if (gameStatus === 4) {
        let period = "Final";
        const lastPeriod = parseInt(periodNum || "3", 10);
        if (lastPeriod > 3) period = "F/OT";
        if (g.Shootout === "1") period = "F/SO";
        scores[eventId] = { awayScore, homeScore, period, status: "final" };
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

  try {
    const url = "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&numberofdaysback=1&numberofdaysahead=1&key=2c2b89ea7345cae8&client_code=echl&lang=en&fmt=json";
    const res = await fetch(url);
    if (!res.ok) return scores;
    let text = await res.text();
    text = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(text);
    const games: any[] = data.SiteKit?.Scorebar || [];

    const idMap = new Map<string, string>();
    for (const id of eventIds) {
      const numPart = id.replace("echl-web-", "").replace("echl-", "");
      idMap.set(numPart, id);
    }

    for (const g of games) {
      const gameId = String(g.ID || "");
      const eventId = idMap.get(gameId);
      if (!eventId) continue;

      const gameStatus = parseInt(g.GameStatus || "0", 10);
      const homeScore = parseInt(g.HomeGoals || "0", 10);
      const awayScore = parseInt(g.VisitorGoals || "0", 10);
      const periodNum = g.Period || "";
      const clock = g.GameClock || "";

      const isLive = gameStatus === 2 || gameStatus === 3 || gameStatus === 10;
      if (isLive) {
        let period = periodNum ? `P${periodNum}` : "Live";
        let displayClock = clock;
        if (gameStatus === 10) {
          period = `P${periodNum} INT`;
          displayClock = "";
        }
        scores[eventId] = { awayScore, homeScore, period, clock: displayClock, status: "live" };
      } else if (gameStatus === 4) {
        let period = "Final";
        const lastPeriod = parseInt(periodNum || "3", 10);
        if (lastPeriod > 3) period = "F/OT";
        if (g.Shootout === "1") period = "F/SO";
        scores[eventId] = { awayScore, homeScore, period, status: "final" };
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
  "Europa League": "uefa.europa",
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
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0].replace(/-/g, "");
      const allEspnEvents: any[] = [];

      for (const dateStr of [today, yesterday]) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnPath}/scoreboard?dates=${dateStr}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json() as any;
        allEspnEvents.push(...(data.events || []));
      }

      for (const espnEvent of allEspnEvents) {
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
              const periodNum = comp.status?.period || 0;
              let period = "Live";
              if (periodNum === 1) period = "1H";
              else if (periodNum === 2) period = "2H";
              else if (periodNum === 3) period = "ET1";
              else if (periodNum === 4) period = "ET2";
              else if (periodNum === 5) period = "PK";
              const shortDetail = (statusDetail || "").toLowerCase();
              if (shortDetail.includes("halftime") || shortDetail === "ht") period = "HT";
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

const ESPN_RUGBY_LEAGUE_PATHS: Record<string, string> = {
  "URC": "270557",
  "Super Rugby": "242041",
  "Top 14": "270559",
  "Six Nations": "180659",
  "English Premiership": "267979",
  "European Champions Cup": "271937",
};

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+(rugby|super|fc|rfc)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function teamsMatch(espnName: string, ourName: string): boolean {
  const a = normalizeTeamName(espnName);
  const b = normalizeTeamName(ourName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4)))) return true;
  return false;
}

async function fetchRugbyScores(
  rugbyMap: Map<string, { id: string; homeTeam: string; awayTeam: string }[]>
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (rugbyMap.size === 0) return scores;

  const leaguesToFetch = new Set<string>();
  for (const [league] of rugbyMap) {
    if (ESPN_RUGBY_LEAGUE_PATHS[league]) {
      leaguesToFetch.add(league);
    }
  }

  const fetches = Array.from(leaguesToFetch).map(async (league) => {
    const espnPath = ESPN_RUGBY_LEAGUE_PATHS[league];
    const events = rugbyMap.get(league) || [];
    if (events.length === 0) return;

    try {
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0].replace(/-/g, "");
      const dates = [today, yesterday];
      const allEspnEvents: any[] = [];

      for (const dateStr of dates) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/rugby/${espnPath}/scoreboard?dates=${dateStr}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json() as any;
        allEspnEvents.push(...(data.events || []));
      }

      for (const espnEvent of allEspnEvents) {
        const comp = espnEvent.competitions?.[0];
        if (!comp) continue;

        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");
        if (!homeComp || !awayComp) continue;

        const espnHome = homeComp.team?.displayName || homeComp.team?.shortDisplayName || "";
        const espnAway = awayComp.team?.displayName || awayComp.team?.shortDisplayName || "";

        for (const ourEvent of events) {
          if (scores[ourEvent.id]) continue;

          if (teamsMatch(espnHome, ourEvent.homeTeam) && teamsMatch(espnAway, ourEvent.awayTeam)) {
            const statusState = comp.status?.type?.state;
            const statusDetail = comp.status?.type?.shortDetail || "";

            if (statusState === "in") {
              const detail = statusDetail || "";
              const description = comp.status?.type?.description || "";
              const periodNum = comp.status?.period || 0;

              let period = "";

              if (/half\s*time/i.test(detail) || detail === "HT" || /half\s*time/i.test(description)) {
                period = "HT";
              } else if (periodNum === 1 || /first\s*half/i.test(description)) {
                period = "1st Half";
              } else if (periodNum === 2 || /second\s*half/i.test(description)) {
                period = "2nd Half";
              }

              scores[ourEvent.id] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period: period || undefined,
                status: "live",
              };
            } else if (statusState === "post") {
              scores[ourEvent.id] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period: "FT",
                status: "final",
              };
            }
            break;
          }
        }
      }
    } catch (err) {
      console.error(`[liveScores] Rugby ${league} fetch error:`, err);
    }
  });

  await Promise.all(fetches);
  return scores;
}

const JL_TEAM_MAP: Record<string, string> = {
  "東芝ブレイブルーパス東京": "Brave Lupus Tokyo",
  "ブラックラムズ東京": "Black Rams Tokyo",
  "コベルコ神戸スティーラーズ": "Kobelco Kobe Steelers",
  "埼玉ワイルドナイツ": "Saitama Wild Knights",
  "クボタスピアーズ船橋・東京ベイ": "Tokyo-Bay Urayasu D-Rocks",
  "クボタスピアーズ船橋": "Tokyo-Bay Urayasu D-Rocks",
  "浦安D-Rocks": "Urayasu D-Rocks",
  "トヨタヴェルブリッツ": "Toyota Verblitz",
  "三重ホンダヒート": "Mie Honda Heat",
  "東京サンゴリアス": "Tokyo Sungoliath",
  "横浜キヤノンイーグルス": "Yokohama Canon Eagles",
  "三菱重工相模原ダイナボアーズ": "Sagamihara Dynaboars",
  "静岡ブルーレヴズ": "Shizuoka Blue Revs",
};

function resolveJlTeam(jpName: string): string {
  const trimmed = jpName.trim();
  if (JL_TEAM_MAP[trimmed]) return JL_TEAM_MAP[trimmed];
  for (const [jp, en] of Object.entries(JL_TEAM_MAP)) {
    if (trimmed.includes(jp) || jp.includes(trimmed)) return en;
  }
  return trimmed;
}

async function fetchJapanLeagueOneScores(
  events: { id: string; homeTeam: string; awayTeam: string }[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  try {
    const res = await fetch("https://league-one.jp/schedule/", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return scores;
    const html = await res.text();

    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = `${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}.${String(jstNow.getUTCDate()).padStart(2, "0")}`;
    const jstYesterday = new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000);
    const yesterdayStr = `${String(jstYesterday.getUTCMonth() + 1).padStart(2, "0")}.${String(jstYesterday.getUTCDate()).padStart(2, "0")}`;

    const scheduleBlocks = html.split(/<div class="c-schedule">/);
    for (const block of scheduleBlocks) {
      const detailM = block.match(/<a href="\/match\/(\d+)" class="btn-match-detail">([^<]+)<\/a>/);
      if (!detailM) continue;
      const statusText = detailM[2];
      const isLive = statusText.includes("試合中");
      const isFinal = statusText.includes("試合終了");
      if (!isLive && !isFinal) continue;

      const dateM = block.match(/<p class="date">\s*([\d.]+)/);
      const matchDate = dateM?.[1]?.trim() || "";
      if (matchDate !== todayStr && matchDate !== yesterdayStr) continue;

      const homeM = block.match(/<li class="home"[^>]*>[\s\S]*?<p class="name only-pc">([^<]+)<\/p>[\s\S]*?<p class="score">([^<]*)<\/p>/);
      const awayM = block.match(/<li class="away"[^>]*>[\s\S]*?<p class="name only-pc">([^<]+)<\/p>[\s\S]*?<p class="score">([^<]*)<\/p>/);
      if (!homeM || !awayM) continue;

      const rawHome = homeM[1].trim();
      const rawAway = awayM[1].trim();
      const scrapedHome = resolveJlTeam(rawHome);
      const scrapedAway = resolveJlTeam(rawAway);
      if (scrapedHome === rawHome || scrapedAway === rawAway) continue;
      const homeScore = parseInt((homeM[2] || "").replace(/&nbsp;/g, "").trim(), 10);
      const awayScore = parseInt((awayM[2] || "").replace(/&nbsp;/g, "").trim(), 10);
      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      for (const ourEvent of events) {
        if (scores[ourEvent.id]) continue;
        const normalMatch = teamsMatch(scrapedHome, ourEvent.homeTeam) && teamsMatch(scrapedAway, ourEvent.awayTeam);
        const swappedMatch = teamsMatch(scrapedHome, ourEvent.awayTeam) && teamsMatch(scrapedAway, ourEvent.homeTeam);
        if (normalMatch || swappedMatch) {
          scores[ourEvent.id] = {
            homeScore: swappedMatch ? awayScore : homeScore,
            awayScore: swappedMatch ? homeScore : awayScore,
            period: isLive ? undefined : "FT",
            status: isLive ? "live" : "final",
          };
          break;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] Japan League One fetch error:", err);
  }

  return scores;
}

async function fetchNcaaHockeyScores(
  events: { id: string; homeTeam: string; awayTeam: string; startTime: string }[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  try {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0].replace(/-/g, "");
    const allEspnEvents: any[] = [];

    for (const dateStr of [today, yesterday]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard?dates=${dateStr}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json() as any;
      allEspnEvents.push(...(data.events || []));
    }

    for (const espnEvent of allEspnEvents) {
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;

      const espnHome = homeComp.team?.displayName || homeComp.team?.shortDisplayName || "";
      const espnAway = awayComp.team?.displayName || awayComp.team?.shortDisplayName || "";

      const espnDateStr = espnEvent.date || comp.date || "";
      const espnStartMs = espnDateStr ? new Date(espnDateStr).getTime() : 0;

      for (const ourEvent of events) {
        if (scores[ourEvent.id]) continue;

        if (teamsMatch(espnHome, ourEvent.homeTeam) && teamsMatch(espnAway, ourEvent.awayTeam)) {
          if (ourEvent.startTime && espnStartMs) {
            const ourStartMs = new Date(ourEvent.startTime).getTime();
            const diffHours = Math.abs(espnStartMs - ourStartMs) / (1000 * 60 * 60);
            if (diffHours > 6) continue;
          }

          const statusState = comp.status?.type?.state;
          const statusDetail = comp.status?.type?.shortDetail || "";

          if (statusState === "in") {
            const displayClock = comp.status?.displayClock || "";
            const periodNum = comp.status?.period || 0;
            let period = "Live";
            if (periodNum === 1) period = "1st";
            else if (periodNum === 2) period = "2nd";
            else if (periodNum === 3) period = "3rd";
            else if (periodNum > 3) period = "OT";
            scores[ourEvent.id] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period,
              clock: displayClock,
              status: "live",
            };
          } else if (statusState === "post") {
            scores[ourEvent.id] = {
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
    console.error("[liveScores] NCAA Hockey fetch error:", err);
  }

  return scores;
}

let cricketScoreCache: { data: Record<string, ScoreData>; ts: number } = { data: {}, ts: 0 };
const CRICKET_CACHE_TTL = 300_000;

async function fetchCricketScores(
  events: { id: string; homeTeam: string; awayTeam: string }[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  const cacheAge = Date.now() - cricketScoreCache.ts;
  if (cacheAge < CRICKET_CACHE_TTL) {
    for (const ev of events) {
      if (cricketScoreCache.data[ev.id]) scores[ev.id] = cricketScoreCache.data[ev.id];
    }
    return scores;
  }

  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return scores;

  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    if (!res.ok) return { ...cricketScoreCache.data };
    const data = await res.json() as any;
    if (data.status !== "success") {
      console.warn("[liveScores] CricAPI non-success:", data.status, data.reason || "");
      return { ...cricketScoreCache.data };
    }

    const matches = data.data || [];
    console.log(`[liveScores] CricAPI returned ${matches.length} matches for ${events.length} cricket events`);

    for (const ourEvent of events) {
      if (scores[ourEvent.id]) continue;

      for (const match of matches) {
        const matchTeams = (match.teams || []) as string[];
        const matchName = (match.name || "") as string;

        const homeInMatch = matchTeams.some((t: string) => teamsMatch(t, ourEvent.homeTeam)) ||
          matchName.toLowerCase().includes(ourEvent.homeTeam.toLowerCase());
        const awayInMatch = matchTeams.some((t: string) => teamsMatch(t, ourEvent.awayTeam)) ||
          matchName.toLowerCase().includes(ourEvent.awayTeam.toLowerCase());

        if (!homeInMatch || !awayInMatch) continue;

        const scoreEntries = (match.score || []) as any[];
        const matchStarted = match.matchStarted === true;
        const matchEnded = match.matchEnded === true;
        const statusText = (match.status || "") as string;

        if (!matchStarted && !matchEnded) continue;

        let cricketHome = "";
        let cricketAway = "";

        for (const s of scoreEntries) {
          const inning = (s.inning || "").toLowerCase();
          if (inning.includes(ourEvent.homeTeam.toLowerCase())) {
            cricketHome = `${s.r}/${s.w} (${s.o})`;
          } else if (inning.includes(ourEvent.awayTeam.toLowerCase())) {
            cricketAway = `${s.r}/${s.w} (${s.o})`;
          }
        }

        if (matchEnded) {
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: statusText || "Final",
            status: "final",
            cricketAway: cricketAway || undefined,
            cricketHome: cricketHome || undefined,
          };
        } else if (matchStarted) {
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: statusText || "In Progress",
            status: "live",
            cricketAway: cricketAway || "Yet to bat",
            cricketHome: cricketHome || "Yet to bat",
          };
        }
        break;
      }
    }
  } catch (err) {
    console.error("[liveScores] Cricket fetch error:", err);
    return { ...cricketScoreCache.data };
  }

  if (Object.keys(scores).length > 0) {
    cricketScoreCache = { data: { ...scores }, ts: Date.now() };
  }

  return scores;
}

const ESPN_TENNIS_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard";

async function fetchTennisScores(
  events: { id: string; espnId: string }[],
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  try {
    const res = await fetch(ESPN_TENNIS_SCOREBOARD);
    if (!res.ok) return scores;
    const data = (await res.json()) as any;

    const espnIdToLocal = new Map<string, string>();
    for (const e of events) espnIdToLocal.set(e.espnId, e.id);

    for (const ev of data.events || []) {
      for (const g of ev.groupings || []) {
        if (g.grouping?.slug !== "mens-singles") continue;
        for (const comp of g.competitions || []) {
          const localId = espnIdToLocal.get(String(comp.id));
          if (!localId) continue;

          const c1 = comp.competitors?.[0];
          const c2 = comp.competitors?.[1];
          if (!c1 || !c2) continue;

          const state = comp.status?.type?.state;
          const isLive = state === "in";
          const isPost = state === "post";
          if (!isLive && !isPost) continue;

          const ls1: any[] = c1.linescores || [];
          const ls2: any[] = c2.linescores || [];
          const maxSets = Math.max(ls1.length, ls2.length);

          const tennisSetScores: TennisSetScore[] = [];
          let p1SetsWon = 0;
          let p2SetsWon = 0;

          for (let i = 0; i < maxSets; i++) {
            const s1 = ls1[i]?.value ?? 0;
            const s2 = ls2[i]?.value ?? 0;
            const tb1 = ls1[i]?.tiebreak;
            const tb2 = ls2[i]?.tiebreak;
            const setEntry: TennisSetScore = { p1: s1, p2: s2 };

            if (tb1 !== undefined || tb2 !== undefined) {
              const loserTb = Math.min(tb1 ?? 0, tb2 ?? 0);
              setEntry.tiebreak = String(loserTb);
            }

            const p1Won = ls1[i]?.winner === true;
            const p2Won = ls2[i]?.winner === true;
            const isCompleted =
              (i < maxSets - 1) ||
              isPost ||
              (p1Won || p2Won);
            if (isCompleted) {
              if (p1Won || p2Won) {
                setEntry.winner = p1Won ? 1 : 2;
              } else if (s1 !== s2) {
                setEntry.winner = s1 > s2 ? 1 : 2;
              } else if (tb1 !== undefined && tb2 !== undefined) {
                setEntry.winner = tb1 > tb2 ? 1 : 2;
              } else {
                setEntry.winner = 1;
              }
              if (setEntry.winner === 1) p1SetsWon++;
              else p2SetsWon++;
            }

            tennisSetScores.push(setEntry);
          }

          let tennisGameScore: { p1: string; p2: string } | undefined;
          if (isLive) {
            const detail = comp.status?.type?.detail || comp.status?.type?.shortDetail || "";
            const gameMatch = detail.match(/(\d+|AD|Ad)-(\d+|AD|Ad)\s*$/);
            if (gameMatch) {
              tennisGameScore = { p1: gameMatch[1], p2: gameMatch[2] };
            }
          }

          let tennisServer: 1 | 2 | undefined;
          if (c1.isServing) tennisServer = 1;
          else if (c2.isServing) tennisServer = 2;

          const statusDetail = comp.status?.type?.description || comp.status?.type?.detail || "";

          let tennisWinner: 1 | 2 | undefined;
          if (isPost) {
            if (c1.winner) tennisWinner = 1;
            else if (c2.winner) tennisWinner = 2;
          }

          scores[localId] = {
            awayScore: p1SetsWon,
            homeScore: p2SetsWon,
            period: isLive ? `Set ${comp.status?.period || tennisSetScores.length}` : "Final",
            status: isLive ? "live" : "final",
            tennisSetScores,
            tennisGameScore,
            tennisServer,
            tennisStatusDetail: statusDetail || undefined,
            tennisWinner,
          };
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] Tennis fetch error:", err);
  }

  return scores;
}

const ESPN_F1_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard";

async function fetchF1Scores(
  events: { id: string; espnCompId: string; sessionTitle: string }[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  try {
    const res = await fetch(ESPN_F1_SCOREBOARD);
    if (!res.ok) return scores;
    const data = await res.json() as any;

    const compIdToLocal = new Map<string, { id: string; sessionTitle: string }>();
    for (const e of events) compIdToLocal.set(e.espnCompId, { id: e.id, sessionTitle: e.sessionTitle });

    for (const ev of data.events || []) {
      const competitions = ev.competitions || [];
      for (const comp of competitions) {
        const localInfo = compIdToLocal.get(String(comp.id));
        if (!localInfo) continue;

        const statusType = comp.status?.type;
        const state = statusType?.state;
        const isLive = state === "in";
        const isPost = state === "post";
        if (!isLive && !isPost) continue;

        const statusDetail = statusType?.shortDetail || statusType?.detail || "";
        const description = statusType?.description || "";

        let racingLap: string | undefined;
        let racingLeader: string | undefined;
        let racingLeaderCountry: string | undefined;
        let racingLeaderTeam: string | undefined;
        let racingLeaderPosition: number | undefined;
        let racingLeaderNumber: number | undefined;
        let racingLeaderGrid: number | undefined;
        let racingLapNum: number | undefined;
        let racingTotalLaps: number | undefined;
        let racingStatus: string | undefined;

        if (isLive) {
          const lapMatch = statusDetail.match(/Lap\s+(\d+)\s*(?:of|\/)\s*(\d+)/i);
          if (lapMatch) {
            racingLap = `Lap ${lapMatch[1]}/${lapMatch[2]}`;
            racingLapNum = parseInt(lapMatch[1], 10) || undefined;
            racingTotalLaps = parseInt(lapMatch[2], 10) || undefined;
          }

          if (/red\s*flag/i.test(statusDetail) || /red\s*flag/i.test(description)) {
            racingStatus = "Red Flag";
          } else if (/safety\s*car/i.test(statusDetail) || /caution/i.test(statusDetail)) {
            racingStatus = "Safety Car";
          } else if (/virtual\s*safety/i.test(statusDetail)) {
            racingStatus = "VSC";
          } else if (/delay/i.test(statusDetail)) {
            racingStatus = "Delayed";
          } else {
            racingStatus = statusDetail || "In Progress";
          }
        }

        const competitors = comp.competitors || [];
        if (competitors.length > 0) {
          const sorted = [...competitors].sort((a: any, b: any) => {
            const orderA = a.order ?? a.position ?? 999;
            const orderB = b.order ?? b.position ?? 999;
            return orderA - orderB;
          });
          const leader = sorted[0];
          const leaderPos = leader?.order ?? leader?.position;
          if (leaderPos != null) racingLeaderPosition = typeof leaderPos === "number" ? leaderPos : parseInt(leaderPos, 10) || undefined;
          if (leader?.athlete?.displayName) {
            racingLeader = leader.athlete.displayName;
            const flagAlt = leader.athlete?.flag?.alt;
            if (flagAlt) racingLeaderCountry = flagAlt;
            if (leader.athlete?.jersey) racingLeaderNumber = parseInt(leader.athlete.jersey, 10) || undefined;
          } else if (leader?.team?.displayName) {
            racingLeader = leader.team.displayName;
          }
          if (leader?.team?.displayName) {
            racingLeaderTeam = leader.team.displayName;
          }
          if (leader?.order != null || leader?.position != null) {
            const gridPos = leader?.statistics?.find?.((s: any) => s.name === "gridPosition")?.displayValue;
            if (gridPos) racingLeaderGrid = parseInt(gridPos, 10) || undefined;
          }
        }

        const period = isPost
          ? "Final"
          : racingLap || racingStatus || "Live";

        scores[localInfo.id] = {
          awayScore: 0,
          homeScore: 0,
          period,
          status: isPost ? "final" : "live",
          racingStatus: isPost ? "Complete" : racingStatus,
          racingLap,
          racingLeader,
          racingLeaderCountry,
          racingLeaderTeam,
          racingLeaderPosition,
          racingLeaderNumber,
          racingLeaderGrid,
          racingLapNum,
          racingTotalLaps,
          racingSessionType: localInfo.sessionTitle,
        };
      }
    }
  } catch (err) {
    console.error("[liveScores] F1 fetch error:", err);
  }

  return scores;
}

export async function fetchAllLiveScores(): Promise<ScoresResponse> {
  const { nhl, ahl, echl, ncaa, soccer, rugby, cricket, tennis, f1 } = loadLiveEventIds();

  const japanLeagueOne = rugby.get("Japan League One") || [];
  const [nhlScores, ahlScores, echlScores, ncaaScores, soccerScores, rugbyScores, jlOneScores, cricketScores, tennisScores, f1Scores] = await Promise.all([
    fetchNhlScores(nhl),
    fetchAhlScores(ahl),
    fetchEchlScores(echl),
    fetchNcaaHockeyScores(ncaa),
    fetchSoccerScores(soccer),
    fetchRugbyScores(rugby),
    fetchJapanLeagueOneScores(japanLeagueOne),
    fetchCricketScores(cricket),
    fetchTennisScores(tennis),
    fetchF1Scores(f1),
  ]);

  return {
    scores: { ...nhlScores, ...ahlScores, ...echlScores, ...ncaaScores, ...soccerScores, ...rugbyScores, ...jlOneScores, ...cricketScores, ...tennisScores, ...f1Scores },
    fetchedAt: new Date().toISOString(),
  };
}
