const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const SHL_SPORT_KEY = "icehockey_sweden_hockey_league";
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
  providerReason: string;
  isLive: boolean;
  source: string;
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

interface OddsApiScore {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores: Array<{ name: string; score: string }> | null;
}

export interface ShlFetchResult {
  events: AppEvent[];
  sourceUsed: "odds" | "none";
  count: number;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function stableId(commenceTime: string, away: string, home: string): string {
  const d = new Date(commenceTime);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `shl-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function eventFromOdds(e: OddsApiEvent | OddsApiScore): AppEvent {
  const start = new Date(e.commence_time).toISOString();
  return {
    id: stableId(e.commence_time, e.away_team, e.home_team),
    sport: "hockey",
    league: "SHL",
    awayTeam: e.away_team,
    homeTeam: e.home_team,
    startTimeLocal: start,
    endTimeLocal: addDuration(e.commence_time, HOCKEY_DURATION_MIN),
    providerId: "flosports",
    providerReason: "shl-flosports",
    isLive: false,
    source: "shl-odds",
  };
}

export async function fetchShlEvents(): Promise<ShlFetchResult> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("  SHL: ODDS_API_KEY not set — skipping.");
    return { events: [], sourceUsed: "none", count: 0 };
  }

  console.log("  SHL: Fetching events from Odds API...");

  const seenIds = new Set<string>();
  const events: AppEvent[] = [];

  // Fetch upcoming events
  try {
    const upcomingUrl = `${ODDS_API_BASE}/sports/${SHL_SPORT_KEY}/events?apiKey=${apiKey}`;
    const res = await fetch(upcomingUrl);
    if (res.ok) {
      const raw: OddsApiEvent[] = await res.json();
      console.log(`  SHL: Got ${raw.length} upcoming events`);
      for (const e of raw) {
        const ev = eventFromOdds(e);
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          events.push(ev);
        }
      }
    } else {
      console.warn(`  SHL: Upcoming events returned ${res.status}`);
    }
  } catch (err) {
    console.error("  SHL: Failed to fetch upcoming events:", err);
  }

  // Fetch recent scores (past 3 days — max supported on free tier)
  try {
    const scoresUrl = `${ODDS_API_BASE}/sports/${SHL_SPORT_KEY}/scores?apiKey=${apiKey}&daysFrom=3`;
    const res = await fetch(scoresUrl);
    if (res.ok) {
      const raw: OddsApiScore[] = await res.json();
      console.log(`  SHL: Got ${raw.length} score records`);
      for (const e of raw) {
        const ev = eventFromOdds(e);
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          events.push(ev);
        }
      }
    } else {
      console.warn(`  SHL: Scores returned ${res.status}`);
    }
  } catch (err) {
    console.error("  SHL: Failed to fetch scores:", err);
  }

  console.log(`  SHL: Total unique events: ${events.length}`);

  if (events.length === 0) {
    return { events: [], sourceUsed: "none", count: 0 };
  }

  return { events, sourceUsed: "odds", count: events.length };
}

export function mergeShlEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existing) index.set(e.id, e);

  let added = 0;
  let updated = 0;

  for (const e of fresh) {
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
    if (start >= windowStart && start <= windowEnd) merged.push(e);
  }

  const pruned = beforePrune - merged.length;
  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
