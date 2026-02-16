import * as fs from "fs";
import * as path from "path";

const HOCKEYTECH_BASE = "https://lscluster.hockeytech.com/feed/index.php";
const HOCKEYTECH_KEY = "ccb91f29d6744675";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const HOCKEY_DURATION_MIN = 165;

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

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

interface OddsSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
}

export interface AhlFetchResult {
  events: AppEvent[];
  sourceUsed: "hockeytech" | "odds" | "none";
  hockeyTechCount: number;
  oddsCount: number;
  detectedOddsKey: string | null;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

async function fetchAhlFromHockeyTech(): Promise<AppEvent[]> {
  console.log("  AHL: Trying HockeyTech scorebar API...");

  const url = `${HOCKEYTECH_BASE}?feed=modulekit&view=scorebar&numberofdaysback=7&numberofdaysahead=21&key=${HOCKEYTECH_KEY}&client_code=ahl&lang=en&fmt=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  AHL HockeyTech: returned ${res.status}`);
      return [];
    }

    const rawText = await res.text();
    const jsonStr = rawText.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(jsonStr);
    const games: any[] = data.SiteKit?.Scorebar || [];

    console.log(`  AHL HockeyTech: Received ${games.length} total games`);

    const events: AppEvent[] = [];
    for (const g of games) {
      try {
        const iso = g.GameDateISO8601;
        if (!iso) continue;

        const startUtc = new Date(iso).toISOString();
        const endUtc = addDuration(startUtc, HOCKEY_DURATION_MIN);

        const homeTeam = g.HomeLongName || `${g.HomeCity || ""} ${g.HomeNickname || ""}`.trim();
        const awayTeam = g.VisitorLongName || `${g.VisitorCity || ""} ${g.VisitorNickname || ""}`.trim();

        const gameStatus = parseInt(g.GameStatus || "0", 10);
        const isLive = gameStatus === 2 || gameStatus === 3;

        const gameId = g.ID || `${g.Date}-${g.HomeCode}-${g.VisitorCode}`;

        events.push({
          id: `ahl-${gameId}`,
          sport: "hockey",
          league: "AHL",
          homeTeam,
          awayTeam,
          startTimeLocal: startUtc,
          endTimeLocal: endUtc,
          providerId: "flosports",
          isLive,
          source: "ahl-hockeytech",
        });
      } catch (err) {
        console.warn(`  AHL HockeyTech: Failed to parse game:`, err);
      }
    }

    console.log(`  AHL HockeyTech: Parsed ${events.length} events`);
    return events;
  } catch (err) {
    console.error("  AHL HockeyTech: Failed to fetch scorebar:", err);
    return [];
  }
}

async function detectAHLKey(apiKey: string): Promise<string | null> {
  const url = `${ODDS_API_BASE}/sports?apiKey=${apiKey}`;
  console.log(`  AHL Odds: Fetching sports list to detect AHL key...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  AHL Odds: Sports list returned ${res.status}: ${res.statusText}`);
      return null;
    }
    const sports: OddsSport[] = (await res.json()) as OddsSport[];
    const match = sports.find((s) => {
      const titleLower = s.title.toLowerCase();
      const descLower = (s.description || "").toLowerCase();
      if (titleLower.includes("ahl")) return true;
      if (descLower.includes("american hockey league")) return true;
      return false;
    });
    if (match) {
      console.log(`  AHL Odds: Detected key="${match.key}" (title="${match.title}", active=${match.active})`);
      return match.key;
    }
    console.log(`  AHL Odds: No AHL sport key found`);
    return null;
  } catch (err) {
    console.error("  AHL Odds: Failed to fetch sports list:", err);
    return null;
  }
}

async function fetchAhlFromOdds(): Promise<{ events: AppEvent[]; keyUsed: string | null }> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("  AHL Odds: ODDS_API_KEY not set — skipping.");
    return { events: [], keyUsed: null };
  }

  const ahlKey = await detectAHLKey(apiKey);
  if (!ahlKey) {
    console.warn("  AHL Odds: Could not find AHL sport key. Skipping.");
    return { events: [], keyUsed: null };
  }

  const url = `${ODDS_API_BASE}/sports/${ahlKey}/events?apiKey=${apiKey}`;
  console.log(`  AHL Odds: Fetching events using key="${ahlKey}"...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  AHL Odds: returned ${res.status}: ${res.statusText}`);
      return { events: [], keyUsed: ahlKey };
    }

    const rawEvents: OddsApiEvent[] = (await res.json()) as OddsApiEvent[];
    console.log(`  AHL Odds: Received ${rawEvents.length} events`);

    const events = rawEvents.map((e) => ({
      id: `ahl-odds-${e.id}`,
      sport: "hockey" as const,
      league: "AHL" as const,
      awayTeam: e.away_team,
      homeTeam: e.home_team,
      startTimeLocal: new Date(e.commence_time).toISOString(),
      endTimeLocal: addDuration(e.commence_time, HOCKEY_DURATION_MIN),
      providerId: "flosports" as const,
      isLive: false,
      source: "ahl-odds" as const,
    }));

    return { events, keyUsed: ahlKey };
  } catch (err) {
    console.error("  AHL Odds: Failed to fetch:", err);
    return { events: [], keyUsed: ahlKey };
  }
}

export async function fetchAhlEvents(): Promise<AhlFetchResult> {
  const htEvents = await fetchAhlFromHockeyTech();

  if (htEvents.length > 0) {
    console.log(`  AHL: Using HockeyTech as source (${htEvents.length} events)`);
    return {
      events: htEvents,
      sourceUsed: "hockeytech",
      hockeyTechCount: htEvents.length,
      oddsCount: 0,
      detectedOddsKey: null,
    };
  }

  console.log("  AHL: HockeyTech returned 0 events, falling back to Odds API...");
  const oddsResult = await fetchAhlFromOdds();

  if (oddsResult.events.length > 0) {
    return {
      events: oddsResult.events,
      sourceUsed: "odds",
      hockeyTechCount: 0,
      oddsCount: oddsResult.events.length,
      detectedOddsKey: oddsResult.keyUsed,
    };
  }

  return {
    events: [],
    sourceUsed: "none",
    hockeyTechCount: 0,
    oddsCount: 0,
    detectedOddsKey: oddsResult.keyUsed,
  };
}

export function mergeAhlEvents(
  existingAhl: AppEvent[],
  freshAhl: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existingAhl) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of freshAhl) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const RETENTION_PAST_DAYS = 14;
  const RETENTION_FUTURE_DAYS = 21;
  const windowStart = new Date(now.getTime() - RETENTION_PAST_DAYS * 86400000);
  const windowEnd = new Date(now.getTime() + RETENTION_FUTURE_DAYS * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;

  merged.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
