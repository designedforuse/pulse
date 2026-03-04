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
  tennisRound?: string;
  tennisPlayer1?: string;
  tennisPlayer2?: string;
  tennisPlayer1Rank?: number;
  tennisPlayer2Rank?: number;
  tournamentName?: string;
}

export interface TennisFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  tournamentCounts: Record<string, number>;
}

export interface TennisMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

interface TopPlayerDef {
  name: string;
  lastName: string;
  rank: number;
  country: string;
}

const ATP_TOP_10: TopPlayerDef[] = [
  { name: "Jannik Sinner", lastName: "Sinner", rank: 1, country: "ITA" },
  { name: "Alexander Zverev", lastName: "Zverev", rank: 2, country: "GER" },
  { name: "Carlos Alcaraz", lastName: "Alcaraz", rank: 3, country: "ESP" },
  { name: "Novak Djokovic", lastName: "Djokovic", rank: 4, country: "SRB" },
  { name: "Taylor Fritz", lastName: "Fritz", rank: 5, country: "USA" },
  { name: "Casper Ruud", lastName: "Ruud", rank: 6, country: "NOR" },
  { name: "Daniil Medvedev", lastName: "Medvedev", rank: 7, country: "RUS" },
  { name: "Alex de Minaur", lastName: "de Minaur", rank: 8, country: "AUS" },
  { name: "Andrey Rublev", lastName: "Rublev", rank: 9, country: "RUS" },
  { name: "Grigor Dimitrov", lastName: "Dimitrov", rank: 10, country: "BUL" },
];

const OUTSIDE_TOP_10: TopPlayerDef[] = [
  { name: "Holger Rune", lastName: "Rune", rank: 13, country: "DEN" },
  { name: "Tommy Paul", lastName: "Paul", rank: 14, country: "USA" },
  { name: "Frances Tiafoe", lastName: "Tiafoe", rank: 16, country: "USA" },
  { name: "Jack Draper", lastName: "Draper", rank: 18, country: "GBR" },
  { name: "Ben Shelton", lastName: "Shelton", rank: 19, country: "USA" },
  { name: "Felix Auger-Aliassime", lastName: "Auger-Aliassime", rank: 22, country: "CAN" },
  { name: "Stefanos Tsitsipas", lastName: "Tsitsipas", rank: 12, country: "GRE" },
  { name: "Hubert Hurkacz", lastName: "Hurkacz", rank: 15, country: "POL" },
];

interface TennisTournament {
  name: string;
  shortName: string;
  league: string;
  leagueKey: string;
  location: string;
  country: string;
  startDate: string;
  endDate: string;
  providerId: string;
  providerReason: string;
  rounds: { name: string; startDay: number; endDay: number; matchesPerDay: number }[];
}

const GRAND_SLAM_ROUNDS = [
  { name: "Round of 128", startDay: 0, endDay: 1, matchesPerDay: 3 },
  { name: "Round of 64", startDay: 2, endDay: 3, matchesPerDay: 3 },
  { name: "Round of 32", startDay: 4, endDay: 5, matchesPerDay: 2 },
  { name: "Round of 16", startDay: 6, endDay: 7, matchesPerDay: 2 },
  { name: "Quarterfinals", startDay: 8, endDay: 9, matchesPerDay: 2 },
  { name: "Semifinals", startDay: 10, endDay: 11, matchesPerDay: 1 },
  { name: "Final", startDay: 13, endDay: 14, matchesPerDay: 1 },
];

const MASTERS_ROUNDS = [
  { name: "Round of 64", startDay: 0, endDay: 1, matchesPerDay: 2 },
  { name: "Round of 32", startDay: 2, endDay: 3, matchesPerDay: 2 },
  { name: "Round of 16", startDay: 4, endDay: 5, matchesPerDay: 2 },
  { name: "Quarterfinals", startDay: 6, endDay: 7, matchesPerDay: 2 },
  { name: "Semifinals", startDay: 8, endDay: 9, matchesPerDay: 1 },
  { name: "Final", startDay: 10, endDay: 11, matchesPerDay: 1 },
];

const TOURNAMENTS: TennisTournament[] = [
  {
    name: "Australian Open",
    shortName: "AUS Open",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "Melbourne",
    country: "Australia",
    startDate: "2026-01-12",
    endDate: "2026-02-01",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "French Open",
    shortName: "Roland Garros",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "Paris",
    country: "France",
    startDate: "2026-05-24",
    endDate: "2026-06-07",
    providerId: "youtubetv",
    providerReason: "tnt-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "Wimbledon",
    shortName: "Wimbledon",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "London",
    country: "England",
    startDate: "2026-06-29",
    endDate: "2026-07-12",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "US Open",
    shortName: "US Open",
    league: "Grand Slam",
    leagueKey: "grand-slam",
    location: "New York",
    country: "USA",
    startDate: "2026-08-23",
    endDate: "2026-09-13",
    providerId: "youtubetv",
    providerReason: "espn-broadcast",
    rounds: GRAND_SLAM_ROUNDS,
  },
  {
    name: "Indian Wells Masters",
    shortName: "Indian Wells",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Indian Wells",
    country: "USA",
    startDate: "2026-03-01",
    endDate: "2026-03-15",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Miami Masters",
    shortName: "Miami Open",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Miami",
    country: "USA",
    startDate: "2026-03-15",
    endDate: "2026-03-29",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Monte-Carlo Masters",
    shortName: "Monte-Carlo",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Monte-Carlo",
    country: "Monaco",
    startDate: "2026-04-02",
    endDate: "2026-04-12",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Madrid Open",
    shortName: "Madrid",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Madrid",
    country: "Spain",
    startDate: "2026-04-29",
    endDate: "2026-05-10",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Italian Open",
    shortName: "Rome",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Rome",
    country: "Italy",
    startDate: "2026-05-06",
    endDate: "2026-05-17",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Canadian Open",
    shortName: "Canada",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Montreal",
    country: "Canada",
    startDate: "2026-08-04",
    endDate: "2026-08-10",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Cincinnati Open",
    shortName: "Cincinnati",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Cincinnati",
    country: "USA",
    startDate: "2026-08-10",
    endDate: "2026-08-17",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Shanghai Masters",
    shortName: "Shanghai",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Shanghai",
    country: "China",
    startDate: "2026-10-07",
    endDate: "2026-10-18",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
  {
    name: "Paris Masters",
    shortName: "Paris",
    league: "ATP Masters 1000",
    leagueKey: "atp-masters",
    location: "Paris",
    country: "France",
    startDate: "2026-11-02",
    endDate: "2026-11-08",
    providerId: "tennischannel",
    providerReason: "tennis-channel",
    rounds: MASTERS_ROUNDS,
  },
];

function stableId(tournamentName: string, date: string, matchIdx: number): string {
  const slug = tournamentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `tennis-${slug}-${date}-m${matchIdx}`;
}

function getRoundForDay(tournament: TennisTournament, dayIndex: number): { name: string; matchesPerDay: number } {
  for (const round of tournament.rounds) {
    if (dayIndex >= round.startDay && dayIndex <= round.endDay) {
      return { name: round.name, matchesPerDay: round.matchesPerDay };
    }
  }
  return { name: "Early Rounds", matchesPerDay: 2 };
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateLocal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const SESSION_START_HOURS: Record<string, number[]> = {
  "Australia": [19, 11, 15],
  "France": [11, 14, 17],
  "England": [11, 14, 17],
  "USA": [11, 13, 16],
  "Monaco": [11, 14],
  "Spain": [11, 14],
  "Italy": [11, 14],
  "Canada": [11, 13],
  "China": [11, 14],
};

const SESSION_START_TZ_OFFSET: Record<string, string> = {
  "Australia": "+11:00",
  "France": "+02:00",
  "England": "+01:00",
  "USA": "-04:00",
  "Monaco": "+02:00",
  "Spain": "+02:00",
  "Italy": "+02:00",
  "Canada": "-04:00",
  "China": "+08:00",
};

const MATCH_DURATION_MIN = 150;

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateMatchups(round: string, dayDateStr: string, matchCount: number): { p1: TopPlayerDef; p2: TopPlayerDef }[] {
  const seed = dayDateStr.split("-").map(Number).reduce((a, b) => a * 31 + b, 0);
  const shuffledTop = seededShuffle(ATP_TOP_10, seed);
  const shuffledOther = seededShuffle(OUTSIDE_TOP_10, seed + 7);
  const matches: { p1: TopPlayerDef; p2: TopPlayerDef }[] = [];

  if (round === "Final") {
    matches.push({ p1: shuffledTop[0], p2: shuffledTop[1] });
  } else if (round === "Semifinals") {
    matches.push({ p1: shuffledTop[0], p2: shuffledTop[2] });
    if (matchCount > 1) {
      matches.push({ p1: shuffledTop[1], p2: shuffledTop[3] });
    }
  } else if (round === "Quarterfinals") {
    for (let i = 0; i < Math.min(matchCount, 4); i++) {
      const opponent = i < shuffledTop.length - 1 ? shuffledTop[i + 1] : shuffledOther[i];
      matches.push({ p1: shuffledTop[i], p2: opponent || shuffledOther[0] });
    }
  } else if (round === "Round of 16") {
    for (let i = 0; i < Math.min(matchCount, 4); i++) {
      matches.push({ p1: shuffledTop[i], p2: shuffledOther[i] || shuffledOther[0] });
    }
  } else {
    for (let i = 0; i < Math.min(matchCount, 3); i++) {
      matches.push({ p1: shuffledTop[i], p2: shuffledOther[i] || shuffledOther[0] });
    }
  }

  return matches;
}

export function fetchTennisEvents(): TennisFetchResult {
  console.log(`  Tennis: Loading hardcoded schedule (${TOURNAMENTS.length} tournaments)...`);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 30 * 86400000);

  const events: AppEvent[] = [];
  const tournamentCounts: Record<string, number> = {};
  const seenIds = new Set<string>();

  for (const tournament of TOURNAMENTS) {
    const tStart = new Date(tournament.startDate + "T00:00:00Z");
    const tEnd = new Date(tournament.endDate + "T23:59:59Z");
    let count = 0;

    const totalDays = Math.ceil((tEnd.getTime() - tStart.getTime()) / 86400000);

    for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
      const dayDate = addDays(tournament.startDate, dayIdx);
      const dateStr = formatDateLocal(dayDate);

      if (dayDate < windowStart || dayDate > windowEnd) continue;

      const { name: round, matchesPerDay } = getRoundForDay(tournament, dayIdx);
      const tzOffset = SESSION_START_TZ_OFFSET[tournament.country] ?? "+00:00";
      const startHours = SESSION_START_HOURS[tournament.country] ?? [11];

      const sessionsPerDay = Math.min(startHours.length, 2);

      for (let si = 0; si < sessionsPerDay; si++) {
        const hour = startHours[si % startHours.length];
        const startIso = `${dateStr}T${String(hour).padStart(2, "0")}:00:00${tzOffset}`;
        const startUtc = new Date(startIso).toISOString();
        const endUtc = new Date(new Date(startUtc).getTime() + MATCH_DURATION_MIN * 60000).toISOString();

        const id = stableId(tournament.name, dateStr, si);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        events.push({
          id,
          sport: "tennis",
          league: tournament.league,
          awayTeam: "TBD",
          homeTeam: "TBD",
          startTimeLocal: startUtc,
          endTimeLocal: endUtc,
          providerId: tournament.providerId,
          isLive: false,
          source: "tennis-hardcoded",
          leagueKey: tournament.leagueKey,
          providerReason: tournament.providerReason,
          eventType: "session",
          sessionTitle: `${tournament.shortName} — ${round}`,
          competitionType: tournament.league === "Grand Slam" ? "international" : "domestic",
          tennisRound: round,
          tournamentName: tournament.name,
        });
        count++;
      }
    }

    if (count > 0) {
      tournamentCounts[tournament.name] = count;
    }
  }

  console.log(`  Tennis: ${events.length} matches in retention window`);
  if (Object.keys(tournamentCounts).length > 0) {
    console.log(`  Tennis tournaments: ${JSON.stringify(tournamentCounts)}`);
  }

  return { events, sourceUsed: "hardcoded", count: events.length, tournamentCounts };
}

export function mergeTennisEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): TennisMergeResult {
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
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
  const windowEnd = new Date(now.getTime() + 30 * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;
  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
