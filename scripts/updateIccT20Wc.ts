import * as crypto from "crypto";

interface T20WcMatch {
  matchNum: number;
  date: string;
  timeIST: string;
  team1: string;
  team2: string;
  venue: string;
  group: string;
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
  leagueKey?: string;
  competitionName?: string;
  competitionType?: "international" | "domestic" | "unknown";
  format?: string;
  hostCountry?: string;
  seriesName?: string;
  isIccT20Wc?: boolean;
  t20WcMatchLabel?: string;
  t20WcVenue?: string;
}

export interface T20WcFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istToUtc(dateStr: string, timeIST: string): string {
  const [hours, minutes] = timeIST.split(":").map(Number);
  const localDate = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  const utcMs = localDate.getTime() - IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function addDuration(isoString: string, minutes: number): string {
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function stableHash(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 10);
}

const VENUE_COUNTRY: Record<string, string> = {
  "Sinhalese Sports Club, Colombo": "Sri Lanka",
  "R. Premadasa Stadium, Colombo": "Sri Lanka",
  "Pallekele International Stadium": "Sri Lanka",
  "Eden Gardens, Kolkata": "India",
  "Wankhede Stadium, Mumbai": "India",
  "MA Chidambaram Stadium, Chennai": "India",
  "Narendra Modi Stadium, Ahmedabad": "India",
  "Arun Jaitley Stadium, Delhi": "India",
};

const T20_DURATION_MIN = 210;

const GROUP_STAGE: T20WcMatch[] = [
  { matchNum: 1, date: "2026-02-07", timeIST: "11:00", team1: "Netherlands", team2: "Pakistan", venue: "Sinhalese Sports Club, Colombo", group: "Group A" },
  { matchNum: 2, date: "2026-02-07", timeIST: "15:00", team1: "Scotland", team2: "West Indies", venue: "Eden Gardens, Kolkata", group: "Group C" },
  { matchNum: 3, date: "2026-02-07", timeIST: "19:00", team1: "USA", team2: "India", venue: "Wankhede Stadium, Mumbai", group: "Group A" },
  { matchNum: 4, date: "2026-02-08", timeIST: "11:00", team1: "Afghanistan", team2: "New Zealand", venue: "MA Chidambaram Stadium, Chennai", group: "Group D" },
  { matchNum: 5, date: "2026-02-08", timeIST: "15:00", team1: "Nepal", team2: "England", venue: "Wankhede Stadium, Mumbai", group: "Group C" },
  { matchNum: 6, date: "2026-02-08", timeIST: "19:00", team1: "Ireland", team2: "Sri Lanka", venue: "R. Premadasa Stadium, Colombo", group: "Group B" },
  { matchNum: 7, date: "2026-02-09", timeIST: "11:00", team1: "Italy", team2: "Scotland", venue: "Eden Gardens, Kolkata", group: "Group C" },
  { matchNum: 8, date: "2026-02-09", timeIST: "15:00", team1: "Oman", team2: "Zimbabwe", venue: "Sinhalese Sports Club, Colombo", group: "Group B" },
  { matchNum: 9, date: "2026-02-09", timeIST: "19:00", team1: "Canada", team2: "South Africa", venue: "Narendra Modi Stadium, Ahmedabad", group: "Group D" },
  { matchNum: 10, date: "2026-02-10", timeIST: "11:00", team1: "Namibia", team2: "Netherlands", venue: "Arun Jaitley Stadium, Delhi", group: "Group A" },
  { matchNum: 11, date: "2026-02-10", timeIST: "15:00", team1: "UAE", team2: "New Zealand", venue: "MA Chidambaram Stadium, Chennai", group: "Group D" },
  { matchNum: 12, date: "2026-02-10", timeIST: "19:00", team1: "USA", team2: "Pakistan", venue: "Sinhalese Sports Club, Colombo", group: "Group A" },
  { matchNum: 13, date: "2026-02-11", timeIST: "11:00", team1: "Afghanistan", team2: "South Africa", venue: "Narendra Modi Stadium, Ahmedabad", group: "Group D" },
  { matchNum: 14, date: "2026-02-11", timeIST: "15:00", team1: "Ireland", team2: "Australia", venue: "R. Premadasa Stadium, Colombo", group: "Group B" },
  { matchNum: 15, date: "2026-02-11", timeIST: "19:00", team1: "West Indies", team2: "England", venue: "Wankhede Stadium, Mumbai", group: "Group C" },
  { matchNum: 16, date: "2026-02-12", timeIST: "11:00", team1: "Oman", team2: "Sri Lanka", venue: "Pallekele International Stadium", group: "Group B" },
  { matchNum: 17, date: "2026-02-12", timeIST: "15:00", team1: "Italy", team2: "Nepal", venue: "Wankhede Stadium, Mumbai", group: "Group C" },
  { matchNum: 18, date: "2026-02-12", timeIST: "19:00", team1: "Namibia", team2: "India", venue: "Arun Jaitley Stadium, Delhi", group: "Group A" },
  { matchNum: 19, date: "2026-02-13", timeIST: "11:00", team1: "Zimbabwe", team2: "Australia", venue: "R. Premadasa Stadium, Colombo", group: "Group B" },
  { matchNum: 20, date: "2026-02-13", timeIST: "15:00", team1: "UAE", team2: "Canada", venue: "Arun Jaitley Stadium, Delhi", group: "Group D" },
  { matchNum: 21, date: "2026-02-13", timeIST: "19:00", team1: "Netherlands", team2: "USA", venue: "MA Chidambaram Stadium, Chennai", group: "Group A" },
  { matchNum: 22, date: "2026-02-14", timeIST: "11:00", team1: "Oman", team2: "Ireland", venue: "Sinhalese Sports Club, Colombo", group: "Group B" },
  { matchNum: 23, date: "2026-02-14", timeIST: "15:00", team1: "Scotland", team2: "England", venue: "Eden Gardens, Kolkata", group: "Group C" },
  { matchNum: 24, date: "2026-02-14", timeIST: "19:00", team1: "South Africa", team2: "New Zealand", venue: "Narendra Modi Stadium, Ahmedabad", group: "Group D" },
  { matchNum: 25, date: "2026-02-15", timeIST: "11:00", team1: "Nepal", team2: "West Indies", venue: "Wankhede Stadium, Mumbai", group: "Group C" },
  { matchNum: 26, date: "2026-02-15", timeIST: "15:00", team1: "Namibia", team2: "USA", venue: "MA Chidambaram Stadium, Chennai", group: "Group A" },
  { matchNum: 27, date: "2026-02-15", timeIST: "19:00", team1: "Pakistan", team2: "India", venue: "R. Premadasa Stadium, Colombo", group: "Group A" },
  { matchNum: 28, date: "2026-02-16", timeIST: "11:00", team1: "UAE", team2: "Afghanistan", venue: "Arun Jaitley Stadium, Delhi", group: "Group D" },
  { matchNum: 29, date: "2026-02-16", timeIST: "15:00", team1: "Italy", team2: "England", venue: "Eden Gardens, Kolkata", group: "Group C" },
  { matchNum: 30, date: "2026-02-16", timeIST: "19:00", team1: "Sri Lanka", team2: "Australia", venue: "Pallekele International Stadium", group: "Group B" },
  { matchNum: 31, date: "2026-02-17", timeIST: "11:00", team1: "Canada", team2: "New Zealand", venue: "MA Chidambaram Stadium, Chennai", group: "Group D" },
  { matchNum: 32, date: "2026-02-17", timeIST: "15:00", team1: "Zimbabwe", team2: "Ireland", venue: "Pallekele International Stadium", group: "Group B" },
  { matchNum: 33, date: "2026-02-17", timeIST: "19:00", team1: "Nepal", team2: "Scotland", venue: "Wankhede Stadium, Mumbai", group: "Group C" },
  { matchNum: 34, date: "2026-02-18", timeIST: "11:00", team1: "UAE", team2: "South Africa", venue: "Arun Jaitley Stadium, Delhi", group: "Group D" },
  { matchNum: 35, date: "2026-02-18", timeIST: "15:00", team1: "Namibia", team2: "Pakistan", venue: "Sinhalese Sports Club, Colombo", group: "Group A" },
  { matchNum: 36, date: "2026-02-18", timeIST: "19:00", team1: "Netherlands", team2: "India", venue: "Narendra Modi Stadium, Ahmedabad", group: "Group A" },
  { matchNum: 37, date: "2026-02-19", timeIST: "11:00", team1: "Italy", team2: "West Indies", venue: "Eden Gardens, Kolkata", group: "Group C" },
  { matchNum: 38, date: "2026-02-19", timeIST: "15:00", team1: "Zimbabwe", team2: "Sri Lanka", venue: "R. Premadasa Stadium, Colombo", group: "Group B" },
  { matchNum: 39, date: "2026-02-19", timeIST: "19:00", team1: "Canada", team2: "Afghanistan", venue: "MA Chidambaram Stadium, Chennai", group: "Group D" },
  { matchNum: 40, date: "2026-02-20", timeIST: "19:00", team1: "Oman", team2: "Australia", venue: "Pallekele International Stadium", group: "Group B" },
];

const SUPER_8: T20WcMatch[] = [
  { matchNum: 41, date: "2026-02-21", timeIST: "19:00", team1: "Pakistan", team2: "New Zealand", venue: "R. Premadasa Stadium, Colombo", group: "Super 8 – Group 2" },
  { matchNum: 42, date: "2026-02-22", timeIST: "15:00", team1: "Sri Lanka", team2: "England", venue: "Pallekele International Stadium", group: "Super 8 – Group 2" },
  { matchNum: 43, date: "2026-02-22", timeIST: "19:00", team1: "India", team2: "South Africa", venue: "Narendra Modi Stadium, Ahmedabad", group: "Super 8 – Group 1" },
  { matchNum: 44, date: "2026-02-23", timeIST: "19:00", team1: "Zimbabwe", team2: "West Indies", venue: "Wankhede Stadium, Mumbai", group: "Super 8 – Group 1" },
  { matchNum: 45, date: "2026-02-24", timeIST: "19:00", team1: "England", team2: "Pakistan", venue: "Pallekele International Stadium", group: "Super 8 – Group 2" },
  { matchNum: 46, date: "2026-02-25", timeIST: "19:00", team1: "Sri Lanka", team2: "New Zealand", venue: "R. Premadasa Stadium, Colombo", group: "Super 8 – Group 2" },
  { matchNum: 47, date: "2026-02-26", timeIST: "15:00", team1: "West Indies", team2: "South Africa", venue: "Narendra Modi Stadium, Ahmedabad", group: "Super 8 – Group 1" },
  { matchNum: 48, date: "2026-02-26", timeIST: "19:00", team1: "India", team2: "Zimbabwe", venue: "MA Chidambaram Stadium, Chennai", group: "Super 8 – Group 1" },
  { matchNum: 49, date: "2026-02-27", timeIST: "19:00", team1: "England", team2: "New Zealand", venue: "R. Premadasa Stadium, Colombo", group: "Super 8 – Group 2" },
  { matchNum: 50, date: "2026-02-28", timeIST: "19:00", team1: "Pakistan", team2: "Sri Lanka", venue: "Pallekele International Stadium", group: "Super 8 – Group 2" },
  { matchNum: 51, date: "2026-03-01", timeIST: "15:00", team1: "Zimbabwe", team2: "South Africa", venue: "Arun Jaitley Stadium, Delhi", group: "Super 8 – Group 1" },
  { matchNum: 52, date: "2026-03-01", timeIST: "19:00", team1: "West Indies", team2: "India", venue: "Eden Gardens, Kolkata", group: "Super 8 – Group 1" },
];

const KNOCKOUTS: T20WcMatch[] = [
  { matchNum: 53, date: "2026-03-04", timeIST: "19:00", team1: "TBC", team2: "TBC", venue: "Eden Gardens, Kolkata", group: "Semi-Final 1" },
  { matchNum: 54, date: "2026-03-05", timeIST: "19:00", team1: "TBC", team2: "TBC", venue: "Wankhede Stadium, Mumbai", group: "Semi-Final 2" },
  { matchNum: 55, date: "2026-03-08", timeIST: "19:00", team1: "TBC", team2: "TBC", venue: "Narendra Modi Stadium, Ahmedabad", group: "Final" },
];

const ALL_MATCHES: T20WcMatch[] = [...GROUP_STAGE, ...SUPER_8, ...KNOCKOUTS];

function matchToEvent(match: T20WcMatch): AppEvent {
  const startUtc = istToUtc(match.date, match.timeIST);
  const country = VENUE_COUNTRY[match.venue] || "India";
  const hashInput = `t20wc-2026-m${match.matchNum}-${match.team1}-${match.team2}-${match.date}`;

  const hasTbc = match.team1 === "TBC" || match.team2 === "TBC";

  let t20WcMatchLabel: string | undefined;
  if (hasTbc) {
    const groupLabel = match.group.replace("Super 8 – ", "S8 ");
    t20WcMatchLabel = `T20 WC ${groupLabel} – Match ${match.matchNum}`;
  }

  const venue = match.venue;

  return {
    id: `cricket-t20wc-${stableHash(hashInput)}`,
    sport: "cricket",
    league: "ICC",
    awayTeam: match.team1,
    homeTeam: match.team2,
    startTimeLocal: startUtc,
    endTimeLocal: addDuration(startUtc, T20_DURATION_MIN),
    providerId: "youtubetv",
    isLive: false,
    source: "cricket-t20wc-schedule",
    leagueKey: "icc",
    competitionName: "ICC Men's T20 World Cup 2026",
    competitionType: "international",
    format: "t20",
    hostCountry: country,
    seriesName: "ICC Men's T20 World Cup 2026",
    isIccT20Wc: true,
    t20WcMatchLabel,
    t20WcVenue: venue,
  };
}

export function fetchIccT20WcEvents(): T20WcFetchResult {
  const now = new Date();
  const pastCutoff = new Date(now.getTime() - 14 * 24 * 3600000);
  const futureCutoff = new Date(now.getTime() + 30 * 24 * 3600000);

  const events: AppEvent[] = [];
  for (const match of ALL_MATCHES) {
    const event = matchToEvent(match);
    const startDate = new Date(event.startTimeLocal);
    if (startDate >= pastCutoff && startDate <= futureCutoff) {
      events.push(event);
    }
  }

  console.log(`  ICC T20 WC: Generated ${events.length} events from hardcoded schedule (${ALL_MATCHES.length} total matches)`);

  return {
    events,
    sourceUsed: "hardcoded-schedule",
    count: events.length,
  };
}

export function mergeIccT20WcEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const RETAIN_PAST_MS = 14 * 24 * 3600000;
  const RETAIN_FUTURE_MS = 30 * 24 * 3600000;
  const windowStart = new Date(now.getTime() - RETAIN_PAST_MS);
  const windowEnd = new Date(now.getTime() + RETAIN_FUTURE_MS);

  const freshMap = new Map<string, AppEvent>();
  for (const e of fresh) freshMap.set(e.id, e);

  const mergedMap = new Map<string, AppEvent>();
  let added = 0;
  let updated = 0;
  let pruned = 0;

  for (const e of existing) {
    const start = new Date(e.startTimeLocal);
    if (start < windowStart || start > windowEnd) {
      pruned++;
      continue;
    }
    mergedMap.set(e.id, e);
  }

  for (const [id, e] of freshMap) {
    const start = new Date(e.startTimeLocal);
    if (start < windowStart || start > windowEnd) continue;
    if (mergedMap.has(id)) {
      updated++;
    } else {
      added++;
    }
    mergedMap.set(id, e);
  }

  const merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
