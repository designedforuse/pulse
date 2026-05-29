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
  providerReason?: string;
  eventType?: string;
  sessionTitle?: string;
  competitionType?: string;
  tournamentName?: string;
  venue?: string;
}

export interface SchoolsRugbyFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface SchoolsRugbyMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

// Western Cape schools whose first XV fixtures we track. Used as a reference
// list when entering fixtures below — keep names consistent so the same school
// always renders identically on cards.
export const TRACKED_SCHOOLS = [
  "Paarl Boys' High",
  "Paarl Gimnasium",
  "SACS",
  "Bishops",
  "Paul Roos",
  "Wynberg",
  "Rondebosch",
  "Boland Landbou",
  "Stellenberg",
];

const ID_PREFIX = "rugby-schools-";
const LEAGUE = "SA Schools Rugby";
const LEAGUE_KEY = "schools-rugby";
// SuperSport Schools (free app + web stream) carries all of these.
const PROVIDER_ID = "supersportschools";
const PROVIDER_REASON = "schools-supersport";

// A single school-vs-school fixture (team-matchup card).
interface SchoolFixture {
  id: string;
  home: string;
  away: string;
  // ISO UTC kickoff. SAST is UTC+2, so a 15:00 SAST kickoff = 13:00 UTC.
  startUtc: string;
  // Optional explicit end; defaults to +110 min (a schools match + breaks).
  endUtc?: string;
  venue?: string;
}

// A multi-day tournament / festival (session card, e.g. Craven Week).
interface SchoolTournament {
  id: string;
  name: string;
  startUtc: string;
  endUtc: string;
  venue?: string;
}

// ---------------------------------------------------------------------------
// Fixtures from the user-supplied 2026 Western Cape schoolboy list. Only matches
// involving a tracked school are included (purely untracked games like
// "Drostdy vs Worcester Gim" are skipped). Kick-off times were NOT in the source
// list, so Saturday games use a placeholder 13:00 SAST (11:00 UTC) main-game slot
// and Friday games 19:00 SAST (17:00 UTC). Re-verify exact kick-offs nearer each
// match. "Home" reflects the host per the source list.
const FIXTURES: SchoolFixture[] = [
  // Sat 30 May 2026
  { id: `${ID_PREFIX}paulroos-bishops-2026-05-30`, home: "Paul Roos", away: "Bishops", startUtc: "2026-05-30T11:00:00.000Z" },
  { id: `${ID_PREFIX}sacs-paarlboys-2026-05-30`, home: "SACS", away: "Paarl Boys' High", startUtc: "2026-05-30T11:00:00.000Z" },
  { id: `${ID_PREFIX}wynberg-paarlgim-2026-05-30`, home: "Wynberg", away: "Paarl Gimnasium", startUtc: "2026-05-30T11:00:00.000Z" },

  // Sat 6 Jun 2026
  { id: `${ID_PREFIX}stellenberg-bishops-2026-06-06`, home: "Stellenberg", away: "Bishops", startUtc: "2026-06-06T11:00:00.000Z" },
  { id: `${ID_PREFIX}boland-paarlboys-2026-06-06`, home: "Boland Landbou", away: "Paarl Boys' High", startUtc: "2026-06-06T11:00:00.000Z" },
  // "Paul Roos vs Paarl Gimnasium (Hosted in Paarl)" → Paarl Gim hosts.
  { id: `${ID_PREFIX}paarlgim-paulroos-2026-06-06`, home: "Paarl Gimnasium", away: "Paul Roos", startUtc: "2026-06-06T11:00:00.000Z" },

  // Fri 12 Jun 2026 (night game)
  { id: `${ID_PREFIX}boland-stellenberg-2026-06-12`, home: "Boland Landbou", away: "Stellenberg", startUtc: "2026-06-12T17:00:00.000Z" },

  // Sat 13 Jun 2026
  { id: `${ID_PREFIX}bishops-rondebosch-2026-06-13`, home: "Bishops", away: "Rondebosch", startUtc: "2026-06-13T11:00:00.000Z" },
  { id: `${ID_PREFIX}drostdy-paarlgim-2026-06-13`, home: "Drostdy", away: "Paarl Gimnasium", startUtc: "2026-06-13T11:00:00.000Z" },

  // Sat 25 Jul 2026
  { id: `${ID_PREFIX}boland-wynberg-2026-07-25`, home: "Boland Landbou", away: "Wynberg", startUtc: "2026-07-25T11:00:00.000Z" },

  // Thu 30 Jul 2026 — Paarl Interschools derby (Paarl Boys' vs Paarl Gim).
  // Date + 16:00 SAST (14:00 UTC) kick-off confirmed by the user. NB: 30 Jul
  // 2026 is a Thursday despite "Saturday" in the source message — re-confirm.
  { id: `${ID_PREFIX}paarl-derby-2026`, home: "Paarl Boys' High", away: "Paarl Gimnasium", startUtc: "2026-07-30T14:00:00.000Z", venue: "Faure Street Stadium, Paarl" },

  // Sat 1 Aug 2026
  { id: `${ID_PREFIX}paulroos-boland-2026-08-01`, home: "Paul Roos", away: "Boland Landbou", startUtc: "2026-08-01T11:00:00.000Z" },
  { id: `${ID_PREFIX}wynberg-bishops-2026-08-01`, home: "Wynberg", away: "Bishops", startUtc: "2026-08-01T11:00:00.000Z" },

  // Sat 8 Aug 2026
  { id: `${ID_PREFIX}boland-oakdale-2026-08-08`, home: "Boland Landbou", away: "Oakdale", startUtc: "2026-08-08T11:00:00.000Z" },

  // Sat 15 Aug 2026
  { id: `${ID_PREFIX}bishops-sacs-2026-08-15`, home: "Bishops", away: "SACS", startUtc: "2026-08-15T11:00:00.000Z" },
  { id: `${ID_PREFIX}paulroos-greycollege-2026-08-15`, home: "Paul Roos", away: "Grey College", startUtc: "2026-08-15T11:00:00.000Z" },

  // Sat 22 Aug 2026
  { id: `${ID_PREFIX}rondebosch-bishops-2026-08-22`, home: "Rondebosch", away: "Bishops", startUtc: "2026-08-22T11:00:00.000Z" },
];

const TOURNAMENTS: SchoolTournament[] = [
  {
    // U16 Grant Khomo Week — national youth week (WP & Boland compete).
    id: `${ID_PREFIX}grant-khomo-2026`,
    name: "U16 Grant Khomo Week",
    startUtc: "2026-06-29T07:00:00.000Z",
    endUtc: "2026-07-03T16:00:00.000Z",
    venue: "Kearsney College, Durban",
  },
  {
    // FNB U18 Craven Week & Academy Week — premier interprovincial schools week.
    // 6–11 Jul 2026 at Grey High School, Gqeberha (per supplied list).
    id: `${ID_PREFIX}craven-week-2026`,
    name: "FNB U18 Craven Week",
    startUtc: "2026-07-06T07:00:00.000Z",
    endUtc: "2026-07-11T16:00:00.000Z",
    venue: "Grey High School, Gqeberha",
  },
];

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function fetchSchoolsRugbyEvents(): SchoolsRugbyFetchResult {
  console.log(
    `  SA Schools Rugby: Generating schedule (${FIXTURES.length} fixtures, ${TOURNAMENTS.length} tournaments)...`
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 200 * 86400000);

  const events: AppEvent[] = [];

  for (const f of FIXTURES) {
    const start = new Date(f.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    events.push({
      id: f.id,
      sport: "rugby",
      league: LEAGUE,
      awayTeam: f.away,
      homeTeam: f.home,
      startTimeLocal: f.startUtc,
      endTimeLocal: f.endUtc || addMinutes(f.startUtc, 110),
      providerId: PROVIDER_ID,
      providerReason: PROVIDER_REASON,
      isLive: false,
      source: "schools-rugby-hardcoded",
      leagueKey: LEAGUE_KEY,
      competitionType: "domestic",
      venue: f.venue,
    });
  }

  for (const t of TOURNAMENTS) {
    const start = new Date(t.startUtc);
    if (start < windowStart || start > windowEnd) continue;

    events.push({
      id: t.id,
      sport: "rugby",
      league: LEAGUE,
      awayTeam: "",
      homeTeam: t.name,
      startTimeLocal: t.startUtc,
      endTimeLocal: t.endUtc,
      providerId: PROVIDER_ID,
      providerReason: PROVIDER_REASON,
      isLive: false,
      source: "schools-rugby-hardcoded",
      leagueKey: LEAGUE_KEY,
      eventType: "session",
      sessionTitle: t.name,
      tournamentName: t.name,
      competitionType: "domestic",
      venue: t.venue,
    });
  }

  console.log(`  SA Schools Rugby: ${events.length} events in retention window`);

  return { events, sourceUsed: "hardcoded", count: events.length };
}

export function mergeSchoolsRugbyEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): SchoolsRugbyMergeResult {
  const freshIds = new Set(fresh.map((e) => e.id));
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    // Drop stale schools-rugby cache entries not in the fresh schedule
    // (handles removed/renamed/rescheduled fixtures).
    if (e.id.startsWith(ID_PREFIX) && !freshIds.has(e.id)) continue;
    index.set(e.id, e);
  }

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

  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 200 * 86400000);

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
    (a, b) =>
      new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
