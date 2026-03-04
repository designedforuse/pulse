import * as fs from "node:fs";
import * as path from "node:path";

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
}

function loadLiveEventIds(): LiveEventIdBuckets {
  const nhl: string[] = [];
  const ahl: string[] = [];
  const echl: string[] = [];
  const ncaa: { id: string; homeTeam: string; awayTeam: string; startTime: string }[] = [];
  const soccer = new Map<string, string[]>();
  const rugby = new Map<string, { id: string; homeTeam: string; awayTeam: string }[]>();
  const cricket: { id: string; homeTeam: string; awayTeam: string }[] = [];

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
      }
    }
  } catch {
  }

  return { nhl, ahl, echl, ncaa, soccer, rugby, cricket };
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
              const period = statusDetail || "Live";
              scores[eventId] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period,
                clock: clock !== period ? clock : undefined,
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
            const period = statusDetail || "Live";
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
const CRICKET_CACHE_TTL = 120_000;

async function fetchCricketScores(
  events: { id: string; homeTeam: string; awayTeam: string }[]
): Promise<Record<string, ScoreData>> {
  const scores: Record<string, ScoreData> = {};
  if (events.length === 0) return scores;

  if (Date.now() - cricketScoreCache.ts < CRICKET_CACHE_TTL && Object.keys(cricketScoreCache.data).length > 0) {
    for (const ev of events) {
      if (cricketScoreCache.data[ev.id]) scores[ev.id] = cricketScoreCache.data[ev.id];
    }
    if (Object.keys(scores).length > 0) return scores;
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

export async function fetchAllLiveScores(): Promise<ScoresResponse> {
  const { nhl, ahl, echl, ncaa, soccer, rugby, cricket } = loadLiveEventIds();

  const japanLeagueOne = rugby.get("Japan League One") || [];
  const [nhlScores, ahlScores, echlScores, ncaaScores, soccerScores, rugbyScores, jlOneScores, cricketScores] = await Promise.all([
    fetchNhlScores(nhl),
    fetchAhlScores(ahl),
    fetchEchlScores(echl),
    fetchNcaaHockeyScores(ncaa),
    fetchSoccerScores(soccer),
    fetchRugbyScores(rugby),
    fetchJapanLeagueOneScores(japanLeagueOne),
    fetchCricketScores(cricket),
  ]);

  return {
    scores: { ...nhlScores, ...ahlScores, ...echlScores, ...ncaaScores, ...soccerScores, ...rugbyScores, ...jlOneScores, ...cricketScores },
    fetchedAt: new Date().toISOString(),
  };
}
