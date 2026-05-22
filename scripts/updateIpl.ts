// Authoritative IPL schedule fetcher — sources from the official iplt20.com data feed.
// CricAPI's free tier is unreliable for IPL coverage (missing games, late "TBC" entries
// for playoffs). The official feed returns the full season's 70+ matches with real team
// names, ground info, and accurate GMT kickoff times.

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
  leagueKey?: string;
  competitionName?: string;
  competitionType?: string;
  format?: string;
  hostCountry?: string;
  seriesName?: string;
  cricketMatchId?: string;
}

export interface IplFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  totalFromApi: number;
}

export interface IplMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface IplCompetition {
  CompetitionID: number;
  CompetitionName: string;
  feedsource: string;
  live: number;
  SeasonID: number;
}

interface IplMatch {
  MatchID: number;
  MatchStatus: string;
  MatchDate: string;
  GMTMatchDate: string;
  GMTMatchTime: string;
  GMTMatchEndDate?: string;
  GMTMatchEndTime?: string;
  HomeTeamName: string;
  AwayTeamName: string;
  GroundName?: string;
  city?: string;
  CompetitionName?: string;
}

const COMPETITION_URL = "https://scores.iplt20.com/ipl/mc/competition.js";
const IPL_DURATION_MIN = 240; // ~4 hours for a T20 incl. innings break + over rate slack

function parseGmtToIso(date: string, time: string): string | null {
  // date: "2026-05-22", time: "14:00 GMT" or "14:00"
  if (!date || !time) return null;
  const hhmm = time.replace(/\s*GMT\s*/i, "").trim();
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  return `${date}T${hh}:${mm}:00.000Z`;
}

function addDuration(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

async function fetchActiveCompetition(): Promise<IplCompetition | null> {
  try {
    const res = await fetch(COMPETITION_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.error(`  IPL: competition feed HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    const match = text.match(/oncomptetion\((.+)\)/s);
    if (!match) return null;
    const json = JSON.parse(match[1]) as { competition?: IplCompetition[] };
    const comps = json.competition || [];
    const live = comps.find((c) => c.live === 1 && (c.CompetitionName || "").toUpperCase().includes("IPL"));
    const latest = [...comps].sort((a, b) => b.SeasonID - a.SeasonID)[0];
    return live || latest || null;
  } catch (err) {
    console.error(`  IPL: competition fetch error: ${(err as Error).message}`);
    return null;
  }
}

export async function fetchIplEvents(): Promise<IplFetchResult> {
  console.log("Fetching IPL schedule from iplt20.com official feed...");
  const comp = await fetchActiveCompetition();
  if (!comp) {
    console.warn("  IPL: no active competition found");
    return { events: [], sourceUsed: "iplt20.com", totalFromApi: 0 };
  }
  console.log(`  IPL: Using competition ${comp.CompetitionName} (ID ${comp.CompetitionID})`);

  let matches: IplMatch[] = [];
  try {
    const url = `${comp.feedsource}/${comp.CompetitionID}-matchschedule.js`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.error(`  IPL: schedule feed HTTP ${res.status}`);
      return { events: [], sourceUsed: "iplt20.com", totalFromApi: 0 };
    }
    const text = await res.text();
    const m = text.match(/MatchSchedule\((.+)\)/s);
    if (!m) {
      console.error("  IPL: could not parse MatchSchedule wrapper");
      return { events: [], sourceUsed: "iplt20.com", totalFromApi: 0 };
    }
    const json = JSON.parse(m[1]) as { Matchsummary?: IplMatch[] };
    matches = json.Matchsummary || [];
  } catch (err) {
    console.error(`  IPL: schedule fetch error: ${(err as Error).message}`);
    return { events: [], sourceUsed: "iplt20.com", totalFromApi: 0 };
  }

  const events: AppEvent[] = [];
  let skipped = 0;
  for (const match of matches) {
    const startIso = parseGmtToIso(match.GMTMatchDate || match.MatchDate, match.GMTMatchTime);
    if (!startIso) {
      skipped++;
      continue;
    }
    const homeTeam = (match.HomeTeamName || "").trim();
    const awayTeam = (match.AwayTeamName || "").trim();
    if (!homeTeam || !awayTeam) {
      skipped++;
      continue;
    }

    const endIso =
      match.GMTMatchEndDate && match.GMTMatchEndTime
        ? parseGmtToIso(match.GMTMatchEndDate, match.GMTMatchEndTime) || addDuration(startIso, IPL_DURATION_MIN)
        : addDuration(startIso, IPL_DURATION_MIN);

    events.push({
      id: `cricket-ipl-${match.MatchID}`,
      cricketMatchId: String(match.MatchID),
      sport: "cricket",
      league: "IPL",
      awayTeam,
      homeTeam,
      startTimeLocal: startIso,
      endTimeLocal: endIso,
      providerId: "willowtv",
      isLive: match.MatchStatus === "Live",
      source: "ipl-official",
      leagueKey: "ipl",
      competitionName: "IPL",
      competitionType: "league",
      format: "T20",
      hostCountry: "India",
      seriesName: comp.CompetitionName,
    });
  }

  console.log(`  IPL: ${events.length} matches kept, ${skipped} skipped (from ${matches.length} total)`);
  return { events, sourceUsed: "iplt20.com", totalFromApi: matches.length };
}

export function mergeIplEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): IplMergeResult {
  const RETAIN_PAST_MS = 14 * 24 * 3600000;
  const RETAIN_FUTURE_MS = 90 * 24 * 3600000;
  const windowStart = new Date(now.getTime() - RETAIN_PAST_MS);
  const windowEnd = new Date(now.getTime() + RETAIN_FUTURE_MS);

  // The official IPL feed is authoritative — when it returns matches, replace the
  // in-window IPL cache entirely. This drops stale CricAPI-sourced IPL entries
  // (old hash-based IDs, "TBC @ TBC" playoff placeholders) in one pass.
  const freshInWindow = fresh.filter((e) => {
    const start = new Date(e.startTimeLocal);
    return start >= windowStart && start <= windowEnd;
  });

  let pruned = 0;
  if (freshInWindow.length === 0) {
    // Upstream hiccup — keep existing
    const kept = existing.filter((e) => {
      const start = new Date(e.startTimeLocal);
      if (start < windowStart || start > windowEnd) {
        pruned++;
        return false;
      }
      return true;
    });
    return { merged: kept.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()), added: 0, updated: 0, pruned };
  }

  const existingIds = new Set(existing.map((e) => e.id));
  let added = 0;
  let updated = 0;
  for (const e of freshInWindow) {
    if (existingIds.has(e.id)) updated++;
    else added++;
  }
  pruned = existing.filter((e) => {
    const start = new Date(e.startTimeLocal);
    return start >= windowStart && start <= windowEnd;
  }).length - updated;

  const merged = freshInWindow.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned: Math.max(0, pruned) };
}
