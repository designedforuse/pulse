import * as fs from "fs";
import * as path from "path";

const EVENTS_PATH = path.resolve(__dirname, "..", "data", "generatedEvents.json");
const NARRATIVES_PATH = path.resolve(__dirname, "..", "data", "generatedNarratives.json");
const MOVEMENT_CACHE_PATH = path.resolve(__dirname, "..", "data", "playerMovementCache.json");

export interface NarrativeImpact {
  label: string;
  ritualId?: string;
  tabHint?: "Watch" | "Rituals";
}

export type Region = "SouthAfrica" | "SoCal" | "NewEngland" | "Other";

export interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch";
  region: Region;
  regionPriority: number;
  regionLabel: string;
  meta?: Record<string, any>;
}

const REGION_CONFIG: Record<Region, { priority: number; label: string }> = {
  SouthAfrica: { priority: 1, label: "South Africa" },
  SoCal: { priority: 2, label: "SoCal" },
  NewEngland: { priority: 3, label: "New England" },
  Other: { priority: 99, label: "Other" },
};

const TEAM_REGION_MAP: Record<string, Region> = {
  "anaheim ducks": "SoCal",
  "san diego gulls": "SoCal",
  "tulsa oilers": "SoCal",
  "san diego fc": "SoCal",
  "san diego wave": "SoCal",
  "orange county sc": "SoCal",
  "la galaxy": "SoCal",
  "lafc": "SoCal",
  "california legion": "SoCal",

  "boston bruins": "NewEngland",
  "boston university": "NewEngland",
  "new england revolution": "NewEngland",
  "new england free jacks": "NewEngland",

  "stormers": "SouthAfrica",
  "south africa": "SouthAfrica",
  "mi cape town": "SouthAfrica",
  "paarl royals": "SouthAfrica",
  "springboks": "SouthAfrica",
};

const LEAGUE_REGION_MAP: Record<string, Region> = {
  "SA20": "SouthAfrica",
};

function getRegionForTeam(teamName: string): Region {
  const norm = teamName.toLowerCase().trim();
  for (const [key, region] of Object.entries(TEAM_REGION_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return region;
  }
  return "Other";
}

function getRegionForLeague(league: string): Region {
  return LEAGUE_REGION_MAP[league] || "Other";
}

function resolveRegion(teamName: string, league?: string): Region {
  const teamRegion = getRegionForTeam(teamName);
  if (teamRegion !== "Other") return teamRegion;
  if (league) {
    const leagueRegion = getRegionForLeague(league);
    if (leagueRegion !== "Other") return leagueRegion;
  }
  return "Other";
}

function getRegionPriority(region: Region): number {
  return REGION_CONFIG[region].priority;
}

function getRegionLabel(region: Region): string {
  return REGION_CONFIG[region].label;
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
  isLive?: boolean;
  source?: string;
  leagueKey?: string;
  olympicRound?: string;
  t20WcMatchLabel?: string;
  competitionType?: string;
  sessionTitle?: string;
}

interface Favorites {
  [sport: string]: Record<string, string[]> | undefined;
}

interface RitualDef {
  id: string;
  label: string;
  sports: string[];
  days: number[];
  startHour: number;
  endHour: number;
}

const RITUALS: RitualDef[] = [
  { id: "friday_lights", label: "Family Game Night", sports: ["hockey", "basketball", "soccer"], days: [5], startHour: 18, endHour: 21 },
  { id: "friday_after_hours", label: "Friday Night Mode", sports: ["rugby", "cricket"], days: [5], startHour: 21, endHour: 24 },
  { id: "saturday_sunrise", label: "Saturday Warm-Up", sports: ["rugby", "cricket", "soccer"], days: [6], startHour: 6, endHour: 12 },
  { id: "saturday_spotlight", label: "Saturday Game Day", sports: ["hockey", "basketball", "soccer"], days: [6], startHour: 16, endHour: 20 },
  { id: "saturday_after_hours", label: "Saturday Extra Time", sports: ["hockey", "basketball", "soccer", "rugby", "cricket"], days: [6], startHour: 20, endHour: 24 },
  { id: "sunday_session", label: "Sunday Coffee & Chill", sports: ["rugby", "cricket", "soccer"], days: [0], startHour: 6, endHour: 12 },
];

const RIVALRY_PAIRS: { teams: [string, string]; label: string; sport: string }[] = [
  { teams: ["Anaheim Ducks", "Los Angeles Kings"], label: "Freeway Faceoff", sport: "hockey" },
  { teams: ["Boston Bruins", "Montréal Canadiens"], label: "Original Six Clash", sport: "hockey" },
  { teams: ["Boston Bruins", "Montreal Canadiens"], label: "Original Six Clash", sport: "hockey" },
  { teams: ["New York Rangers", "New York Islanders"], label: "Battle of New York", sport: "hockey" },
  { teams: ["Chicago Blackhawks", "Detroit Red Wings"], label: "Original Six Rivalry", sport: "hockey" },
  { teams: ["Pittsburgh Penguins", "Philadelphia Flyers"], label: "Keystone State Rivalry", sport: "hockey" },
  { teams: ["Tottenham Hotspur", "Arsenal"], label: "North London Derby", sport: "soccer" },
  { teams: ["Tottenham Hotspur", "Chelsea"], label: "London Derby", sport: "soccer" },
  { teams: ["Arsenal", "Chelsea"], label: "London Derby", sport: "soccer" },
  { teams: ["Liverpool", "Manchester United"], label: "Northwest Derby", sport: "soccer" },
  { teams: ["Liverpool", "Everton"], label: "Merseyside Derby", sport: "soccer" },
  { teams: ["Manchester City", "Manchester United"], label: "Manchester Derby", sport: "soccer" },
  { teams: ["Real Madrid", "Barcelona"], label: "El Clásico", sport: "soccer" },
  { teams: ["Real Madrid", "Atlético Madrid"], label: "Madrid Derby", sport: "soccer" },
  { teams: ["Internazionale", "AC Milan"], label: "Derby della Madonnina", sport: "soccer" },
  { teams: ["AS Roma", "Lazio"], label: "Derby della Capitale", sport: "soccer" },
  { teams: ["Borussia Dortmund", "Bayern Munich"], label: "Der Klassiker", sport: "soccer" },
  { teams: ["Paris Saint-Germain", "Marseille"], label: "Le Classique", sport: "soccer" },
  { teams: ["LA Galaxy", "LAFC"], label: "El Tráfico", sport: "soccer" },
];

const DERBY_KEYWORDS = ["derby", "clásico", "clasico", "rivalry", "el tráfico", "el trafico"];

const TOURNAMENT_KEYWORDS = ["final", "semifinal", "semi-final", "quarter-final", "quarterfinal", "knockout", "playoff", "elimination"];

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function teamMatchesFavorite(teamName: string, favTeams: string[]): boolean {
  const norm = normalizeTeamName(teamName);
  return favTeams.some(f => {
    const normF = normalizeTeamName(f);
    return norm.includes(normF) || normF.includes(norm);
  });
}

function getAllFavoriteTeams(favorites: Favorites): { team: string; sport: string; league: string }[] {
  const result: { team: string; sport: string; league: string }[] = [];
  for (const [sport, leagues] of Object.entries(favorites)) {
    if (!leagues) continue;
    for (const [league, teams] of Object.entries(leagues)) {
      for (const team of teams) {
        result.push({ team, sport, league });
      }
    }
  }
  return result;
}

function findBestRitual(events: AppEvent[]): RitualDef | null {
  for (const event of events) {
    const startDate = new Date(event.startTimeLocal);
    const ptStr = startDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false, weekday: "short" });
    const parts = ptStr.split(", ");
    const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = dowMap[parts[0]] ?? startDate.getDay();
    const hour = parseInt(startDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }));

    for (const ritual of RITUALS) {
      if (ritual.days.includes(dow) && ritual.sports.includes(event.sport) && hour >= ritual.startHour && hour < ritual.endHour) {
        return ritual;
      }
    }
  }
  return null;
}

function teamNamesMatch(candidate: string, target: string): boolean {
  const a = normalizeTeamName(candidate);
  const b = normalizeTeamName(target);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function getEventsForTeam(events: AppEvent[], teamName: string, nextDays: number, now: Date, league?: string): AppEvent[] {
  const windowEnd = new Date(now.getTime() + nextDays * 86400000);
  return events.filter(e => {
    const start = new Date(e.startTimeLocal);
    if (start < now || start > windowEnd) return false;
    if (league && e.league !== league) return false;
    return teamNamesMatch(e.homeTeam, teamName) || teamNamesMatch(e.awayTeam, teamName);
  }).sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
}

function hasBackToBack(events: AppEvent[]): boolean {
  for (let i = 0; i < events.length - 1; i++) {
    const d1 = new Date(events[i].startTimeLocal);
    const d2 = new Date(events[i + 1].startTimeLocal);
    const diffHours = (d2.getTime() - d1.getTime()) / 3600000;
    if (diffHours <= 28) return true;
  }
  return false;
}

interface PushCandidate {
  team: string;
  league: string;
  sport: string;
  shortName: string;
  gamesInNext7Days: number;
  gamesInNext5Days: number;
  hasBackToBack: boolean;
  windowStart: string;
  windowEnd: string;
  eventIds: string[];
  reason: string;
  events: AppEvent[];
}

function isTeamFavoriteOrTracked(teamName: string, favorites: Favorites): boolean {
  const favTeams = getAllFavoriteTeams(favorites);
  if (favTeams.some(f => {
    const normFav = normalizeTeamName(f.team);
    const normTeam = normalizeTeamName(teamName);
    return normFav.includes(normTeam) || normTeam.includes(normFav);
  })) return true;
  return TRACKED_PUSH_TEAMS.some(t => {
    const normT = normalizeTeamName(t);
    const normTeam = normalizeTeamName(teamName);
    return normT.includes(normTeam) || normTeam.includes(normT);
  });
}

interface PushDebugInfo {
  rawCandidates: number;
  afterThresholdFilter: number;
  candidatesByRegion: Record<string, number>;
  combinedByRegion: Record<string, boolean>;
}

const PUSH_TITLE_MAP: Record<Region, string> = {
  SouthAfrica: "Home Push Week",
  SoCal: "SoCal Push Week",
  NewEngland: "Boston Push Week",
  Other: "Push Week",
};

function generatePlayoffPush(events: AppEvent[], favorites: Favorites, now: Date): {
  cards: ExploreNarrativeCard[];
  debugInfo: PushDebugInfo;
} {
  const favTeams = getAllFavoriteTeams(favorites);
  const hockeyFavs = favTeams.filter(f => f.sport === "hockey");

  const candidatePool = new Map<string, { team: string; league: string; sport: string }>();
  for (const fav of hockeyFavs) {
    candidatePool.set(normalizeTeamName(fav.team), { team: fav.team, league: fav.league, sport: fav.sport });
  }
  for (const tracked of TRACKED_PUSH_TEAMS) {
    const key = normalizeTeamName(tracked);
    if (!candidatePool.has(key)) {
      const league = tracked.includes("Gulls") ? "AHL" : tracked.includes("Oilers") ? "ECHL" : "NHL";
      candidatePool.set(key, { team: tracked, league, sport: "hockey" });
    }
  }

  const allTeamsToEvaluate = Array.from(candidatePool.values());
  const rawCandidateCount = allTeamsToEvaluate.length;
  const qualifiedCandidates: (PushCandidate & { region: Region })[] = [];

  for (const fav of allTeamsToEvaluate) {
    const teamEvents7 = getEventsForTeam(events, fav.team, 7, now, fav.league);
    const teamEvents5 = getEventsForTeam(events, fav.team, 5, now, fav.league);
    const b2b = hasBackToBack(teamEvents7);
    const gamesIn7 = teamEvents7.length;
    const gamesIn5 = teamEvents5.length;

    const condition1 = gamesIn5 >= 4;
    const condition2 = b2b && gamesIn7 >= 4;
    if (!condition1 && !condition2) continue;

    const shortName = fav.team.split(" ").pop() || fav.team;
    const reasonParts: string[] = [];
    if (condition1) reasonParts.push(`${gamesIn5} games in 5 days`);
    if (condition2) reasonParts.push(`back-to-back + ${gamesIn7} games in 7 days`);

    qualifiedCandidates.push({
      team: fav.team,
      league: fav.league,
      sport: fav.sport,
      shortName,
      gamesInNext7Days: gamesIn7,
      gamesInNext5Days: gamesIn5,
      hasBackToBack: b2b,
      windowStart: now.toISOString(),
      windowEnd: new Date(now.getTime() + 7 * 86400000).toISOString(),
      eventIds: teamEvents7.map(e => e.id),
      reason: `${fav.team}: ${reasonParts.join(", ")}`,
      events: teamEvents7,
      region: getRegionForTeam(fav.team),
    });
  }

  const regionGroups = new Map<Region, (PushCandidate & { region: Region })[]>();
  for (const c of qualifiedCandidates) {
    const group = regionGroups.get(c.region) || [];
    group.push(c);
    regionGroups.set(c.region, group);
  }

  const candidatesByRegion: Record<string, number> = {};
  const combinedByRegion: Record<string, boolean> = {};
  for (const [region, group] of regionGroups) {
    candidatesByRegion[region] = group.length;
    combinedByRegion[region] = group.length > 1;
  }

  const cards: ExploreNarrativeCard[] = [];

  for (const [region, group] of regionGroups) {
    const regionEvents = group.flatMap(c => c.events);
    const ritual = findBestRitual(regionEvents);
    const allRituals: RitualDef[] = [];
    for (const c of group) {
      const r = findBestRitual(c.events);
      if (r && !allRituals.some(ar => ar.id === r.id)) allRituals.push(r);
    }
    const impact: NarrativeImpact = ritual
      ? { label: `Impacts: ${allRituals.map(r => r.label).join(", ") || ritual.label}`, ritualId: ritual.id, tabHint: "Rituals" }
      : { label: "Feeds: Watch", tabHint: "Watch" };

    const allEventIds = [...new Set(group.flatMap(c => c.eventIds))];
    const title = group.length === 1
      ? `${group[0].shortName} Push Week`
      : PUSH_TITLE_MAP[region];

    const subtitle = group.map(c => {
      const best = c.gamesInNext5Days >= 4 ? `${c.gamesInNext5Days} in 5` : `${c.gamesInNext7Days} in 7`;
      return group.length === 1
        ? [best, c.hasBackToBack ? "back-to-back" : ""].filter(Boolean).join(" · ")
        : `${c.shortName} (${best})`;
    }).join(" · ");

    cards.push({
      id: `playoff_push_${region.toLowerCase()}`,
      title,
      subtitle,
      impact,
      priority: 100,
      triggeredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      kind: "playoff_push",
      region,
      regionPriority: getRegionPriority(region),
      regionLabel: getRegionLabel(region),
      meta: {
        teams: group.map(c => ({
          team: c.team,
          league: c.league,
          gamesInNext7Days: c.gamesInNext7Days,
          gamesInNext5Days: c.gamesInNext5Days,
          hasBackToBack: c.hasBackToBack,
          reason: c.reason,
        })),
        eventIds: allEventIds.slice(0, 8),
        combinedTeamCount: group.length,
        windowStart: now.toISOString(),
        windowEnd: new Date(now.getTime() + 7 * 86400000).toISOString(),
        reason: group.map(c => c.reason).join("; "),
      },
    });
  }

  return {
    cards,
    debugInfo: {
      rawCandidates: rawCandidateCount,
      afterThresholdFilter: qualifiedCandidates.length,
      candidatesByRegion,
      combinedByRegion,
    },
  };
}

async function fetchNhlStandings(): Promise<any | null> {
  try {
    const res = await fetch("https://api-web.nhle.com/v1/standings/now", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchNhlRecentGames(teamAbbrev: string): Promise<any[]> {
  try {
    const url = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbrev}/20252026`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return data.games || [];
  } catch {
    return [];
  }
}

const NHL_TEAM_ABBREVS: Record<string, string> = {
  "Anaheim Ducks": "ANA",
  "Boston Bruins": "BOS",
};

function generateMomentum(events: AppEvent[], favorites: Favorites, now: Date, nhlGames: Map<string, any[]>): ExploreNarrativeCard[] {
  const cards: ExploreNarrativeCard[] = [];
  const favTeams = getAllFavoriteTeams(favorites).filter(f => f.sport === "hockey" && f.league === "NHL");

  for (const fav of favTeams) {
    const abbrev = NHL_TEAM_ABBREVS[fav.team];
    if (!abbrev) continue;

    const allGames = nhlGames.get(abbrev) || [];
    const completedGames = allGames.filter((g: any) => {
      const gameDate = new Date(g.startTimeUTC || g.gameDate);
      return gameDate < now && (g.gameState === "OFF" || g.gameState === "FINAL" || g.gameState === "7");
    }).sort((a: any, b: any) => new Date(b.startTimeUTC || b.gameDate).getTime() - new Date(a.startTimeUTC || a.gameDate).getTime());

    const recent = completedGames.slice(0, 5);
    if (recent.length < 3) continue;

    let winStreak = 0;
    let pointStreak = 0;
    let goalDiff = 0;
    const last3 = recent.slice(0, 3);

    for (const game of recent) {
      const isHome = game.homeTeam?.abbrev === abbrev;
      const homeScore = game.homeTeam?.score ?? 0;
      const awayScore = game.awayTeam?.score ?? 0;
      const won = isHome ? homeScore > awayScore : awayScore > homeScore;
      const otLoss = !won && (game.periodDescriptor?.periodType === "OT" || game.periodDescriptor?.periodType === "SO");

      if (won) winStreak++;
      else break;
    }

    for (const game of recent) {
      const isHome = game.homeTeam?.abbrev === abbrev;
      const homeScore = game.homeTeam?.score ?? 0;
      const awayScore = game.awayTeam?.score ?? 0;
      const won = isHome ? homeScore > awayScore : awayScore > homeScore;
      const otLoss = !won && (game.periodDescriptor?.periodType === "OT" || game.periodDescriptor?.periodType === "SO");

      if (won || otLoss) pointStreak++;
      else break;
    }

    for (const game of last3) {
      const isHome = game.homeTeam?.abbrev === abbrev;
      const homeScore = game.homeTeam?.score ?? 0;
      const awayScore = game.awayTeam?.score ?? 0;
      goalDiff += isHome ? (homeScore - awayScore) : (awayScore - homeScore);
    }

    const triggered = winStreak >= 3 || pointStreak >= 3 || goalDiff >= 4;
    if (!triggered) continue;

    const shortName = fav.team.split(" ").pop() || fav.team;
    const subtitleParts: string[] = [];
    if (winStreak >= 3) subtitleParts.push(`${winStreak}-game win streak`);
    else if (pointStreak >= 3) subtitleParts.push(`${pointStreak}-game point streak`);
    if (goalDiff > 0) subtitleParts.push(`+${goalDiff} goal diff`);

    const teamEvents = getEventsForTeam(events, fav.team, 7, now, fav.league);
    const ritual = findBestRitual(teamEvents);
    const impact: NarrativeImpact = ritual
      ? { label: `Feeds: ${ritual.label}`, ritualId: ritual.id, tabHint: "Rituals" }
      : { label: "Feeds: Watch", tabHint: "Watch" };

    const teamRegion = resolveRegion(fav.team, fav.league);
    cards.push({
      id: `momentum_${abbrev.toLowerCase()}`,
      title: `${shortName} Heating Up`,
      subtitle: subtitleParts.join(" · "),
      impact,
      priority: 60,
      triggeredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3 * 86400000).toISOString(),
      kind: "momentum",
      region: teamRegion,
      regionPriority: getRegionPriority(teamRegion),
      regionLabel: getRegionLabel(teamRegion),
      meta: {
        team: fav.team,
        league: fav.league,
        abbrev,
        winStreak,
        pointStreak,
        goalDiff,
        recentGames: last3.map((g: any) => ({
          date: g.startTimeUTC || g.gameDate,
          opponent: g.homeTeam?.abbrev === abbrev ? g.awayTeam?.placeName?.default : g.homeTeam?.placeName?.default,
          score: `${g.homeTeam?.score ?? "?"}-${g.awayTeam?.score ?? "?"}`,
          result: (() => {
            const isHome = g.homeTeam?.abbrev === abbrev;
            const won = isHome ? (g.homeTeam?.score > g.awayTeam?.score) : (g.awayTeam?.score > g.homeTeam?.score);
            return won ? "W" : "L";
          })(),
        })),
        eventIds: teamEvents.map(e => e.id),
        reason: winStreak >= 3
          ? `${fav.team} is on a ${winStreak}-game win streak`
          : pointStreak >= 3
            ? `${fav.team} has earned points in ${pointStreak} straight games`
            : `${fav.team} has a +${goalDiff} goal differential over last 3 games`,
      },
    });
  }

  return cards;
}

function generateLeagueMoments(events: AppEvent[], now: Date): ExploreNarrativeCard[] {
  const cards: ExploreNarrativeCard[] = [];
  const windowEnd = new Date(now.getTime() + 7 * 86400000);
  const upcoming = events.filter(e => {
    const start = new Date(e.startTimeLocal);
    return start >= now && start <= windowEnd;
  });

  const rivalryMatches: { event: AppEvent; label: string }[] = [];
  for (const event of upcoming) {
    for (const rivalry of RIVALRY_PAIRS) {
      const homeNorm = normalizeTeamName(event.homeTeam);
      const awayNorm = normalizeTeamName(event.awayTeam);
      const r0 = normalizeTeamName(rivalry.teams[0]);
      const r1 = normalizeTeamName(rivalry.teams[1]);
      if ((homeNorm.includes(r0) || r0.includes(homeNorm)) && (awayNorm.includes(r1) || r1.includes(awayNorm)) ||
          (homeNorm.includes(r1) || r1.includes(homeNorm)) && (awayNorm.includes(r0) || r0.includes(awayNorm))) {
        rivalryMatches.push({ event, label: rivalry.label });
      }
    }

    const nameFields = [event.homeTeam, event.awayTeam, event.sessionTitle || "", event.t20WcMatchLabel || ""].join(" ").toLowerCase();
    for (const kw of DERBY_KEYWORDS) {
      if (nameFields.includes(kw) && !rivalryMatches.some(r => r.event.id === event.id)) {
        rivalryMatches.push({ event, label: "Derby Day" });
      }
    }
  }

  const tournamentMatches: AppEvent[] = [];
  for (const event of upcoming) {
    const nameFields = [
      event.olympicRound || "",
      event.t20WcMatchLabel || "",
      event.sessionTitle || "",
      event.competitionType || "",
    ].join(" ").toLowerCase();
    if (TOURNAMENT_KEYWORDS.some(kw => nameFields.includes(kw))) {
      tournamentMatches.push(event);
    }
  }

  if (rivalryMatches.length > 0) {
    const uniqueLabels = [...new Set(rivalryMatches.map(r => r.label))];
    const subtitle = rivalryMatches.length === 1
      ? `${rivalryMatches[0].label}: ${rivalryMatches[0].event.awayTeam} @ ${rivalryMatches[0].event.homeTeam}`
      : `${rivalryMatches.length} rivalry matchups in the next 7 days`;

    const rivalryRegion = resolveRegion(rivalryMatches[0].event.homeTeam, rivalryMatches[0].event.league);
    cards.push({
      id: "league_moment_rivalry",
      title: rivalryMatches.length === 1 ? rivalryMatches[0].label : "Rivalry Weekend",
      subtitle,
      impact: { label: "Feeds: Watch", tabHint: "Watch" },
      priority: 70,
      triggeredAt: now.toISOString(),
      expiresAt: windowEnd.toISOString(),
      kind: "league_moment",
      region: rivalryRegion,
      regionPriority: getRegionPriority(rivalryRegion),
      regionLabel: getRegionLabel(rivalryRegion),
      meta: {
        type: "rivalry",
        matchCount: rivalryMatches.length,
        rivalries: uniqueLabels,
        matches: rivalryMatches.map(r => ({
          label: r.label,
          away: r.event.awayTeam,
          home: r.event.homeTeam,
          league: r.event.league,
          startTime: r.event.startTimeLocal,
        })),
        eventIds: rivalryMatches.map(r => r.event.id),
        reason: `${rivalryMatches.length} known rivalry matchup(s) found: ${uniqueLabels.join(", ")}`,
      },
    });
  }

  if (tournamentMatches.length > 0) {
    const tournamentRegion = resolveRegion(tournamentMatches[0].homeTeam, tournamentMatches[0].league);
    cards.push({
      id: "league_moment_tournament",
      title: "Big Stage",
      subtitle: `${tournamentMatches.length} tournament/knockout match${tournamentMatches.length > 1 ? "es" : ""} this week`,
      impact: { label: "Feeds: Watch", tabHint: "Watch" },
      priority: 70,
      triggeredAt: now.toISOString(),
      expiresAt: windowEnd.toISOString(),
      kind: "league_moment",
      region: tournamentRegion,
      regionPriority: getRegionPriority(tournamentRegion),
      regionLabel: getRegionLabel(tournamentRegion),
      meta: {
        type: "tournament",
        matchCount: tournamentMatches.length,
        matches: tournamentMatches.slice(0, 5).map(e => ({
          away: e.awayTeam,
          home: e.homeTeam,
          league: e.league,
          round: e.olympicRound || e.t20WcMatchLabel || e.sessionTitle || "",
          startTime: e.startTimeLocal,
        })),
        eventIds: tournamentMatches.map(e => e.id),
        reason: `Found ${tournamentMatches.length} tournament stage match(es) in the next 7 days`,
      },
    });
  }

  return cards;
}

interface PlayerSighting {
  teamAbbrev: string;
  gameId: string;
  seenAt: string;
}

interface PlayerMovementEntry {
  playerId: string;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  detectedAt: string;
  lastSeenFrom: string;
  firstSeenTo: string;
}

interface PlayerMovementCache {
  history: Record<string, { name: string; sightings: PlayerSighting[] }>;
  movements: PlayerMovementEntry[];
  lastUpdated: string;
  lastRunMeta?: MovementRunMeta;
}

interface MovementRunMeta {
  observedTeams: string[];
  skippedTeams: { team: string; league: string; reason: string }[];
  playersIngested: number;
  movementsDetectedThisRun: PlayerMovementEntry[];
  timestamp: string;
}

interface PlayerAppearance {
  playerId: string;
  playerName: string;
  teamAbbrev: string;
  gameId: string;
  league: string;
}

interface BoxscoreProvider {
  league: string;
  fetch(teamAbbrev: string, now: Date): Promise<PlayerAppearance[]>;
}

const MAX_SIGHTING_HISTORY = 10;

function loadMovementCache(): PlayerMovementCache {
  try {
    if (fs.existsSync(MOVEMENT_CACHE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(MOVEMENT_CACHE_PATH, "utf8"));
      if (raw.lastSeen && !raw.history) {
        const history: PlayerMovementCache["history"] = {};
        for (const [id, entry] of Object.entries(raw.lastSeen as Record<string, any>)) {
          history[id] = {
            name: id,
            sightings: [{ teamAbbrev: entry.team?.replace(/ \(.*\)/, "") || "UNK", gameId: "migrated", seenAt: entry.lastDate || new Date().toISOString() }],
          };
        }
        return { history, movements: raw.movements || [], lastUpdated: raw.lastUpdated || new Date().toISOString() };
      }
      return raw;
    }
  } catch {}
  return { history: {}, movements: [], lastUpdated: new Date().toISOString() };
}

function saveMovementCache(cache: PlayerMovementCache): void {
  fs.writeFileSync(MOVEMENT_CACHE_PATH, JSON.stringify(cache, null, 2));
}

const MOVEMENT_PRIMARY_TEAMS = ["ANA"];

const MOVEMENT_OBSERVED_NHL_TEAMS = [
  "ANA", "BOS", "LAK", "SJS", "SEA", "VGK", "CGY", "EDM", "VAN",
];

const MOVEMENT_TRACKED_NONHL: { team: string; league: string; abbrev: string }[] = [
  { team: "San Diego Gulls", league: "AHL", abbrev: "SDG" },
  { team: "Tulsa Oilers", league: "ECHL", abbrev: "TUL" },
];

const TRACKED_PUSH_TEAMS = ["Anaheim Ducks", "San Diego Gulls", "Tulsa Oilers"];
const TRACKED_TEAM_NAMES = ["Anaheim Ducks", "San Diego Gulls", "Tulsa Oilers"];

function buildObservedTeamSet(events: AppEvent[], now: Date): string[] {
  const teamSet = new Set(MOVEMENT_OBSERVED_NHL_TEAMS);

  const fourteenDaysOut = new Date(now.getTime() + 14 * 86400000);
  for (const event of events) {
    if (event.league !== "NHL") continue;
    const start = new Date(event.startTimeLocal);
    if (start < now || start > fourteenDaysOut) continue;
    const homeNorm = normalizeTeamName(event.homeTeam);
    const awayNorm = normalizeTeamName(event.awayTeam);
    const primaryInvolved = MOVEMENT_PRIMARY_TEAMS.some(abbr => {
      const lower = abbr.toLowerCase();
      return homeNorm.includes(lower) || awayNorm.includes(lower);
    });
    if (!primaryInvolved) continue;
    for (const [fullName, abbr] of Object.entries(ALL_NHL_ABBREVS)) {
      if (normalizeTeamName(fullName) === homeNorm || normalizeTeamName(fullName) === awayNorm) {
        teamSet.add(abbr);
      }
    }
  }

  return [...teamSet];
}

const ALL_NHL_ABBREVS: Record<string, string> = {
  "Anaheim Ducks": "ANA", "Arizona Coyotes": "ARI", "Boston Bruins": "BOS",
  "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR",
  "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL", "Columbus Blue Jackets": "CBJ",
  "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM",
  "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN",
  "Montréal Canadiens": "MTL", "Nashville Predators": "NSH", "New Jersey Devils": "NJD",
  "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT",
  "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS",
  "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL",
  "Toronto Maple Leafs": "TOR", "Utah Hockey Club": "UTA", "Vancouver Canucks": "VAN",
  "Vegas Golden Knights": "VGK", "Washington Capitals": "WSH", "Winnipeg Jets": "WPG",
};

const nhlBoxscoreProvider: BoxscoreProvider = {
  league: "NHL",
  async fetch(teamAbbrev: string, now: Date): Promise<PlayerAppearance[]> {
    const appearances: PlayerAppearance[] = [];
    try {
      const schedUrl = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbrev}/20252026`;
      const res = await fetch(schedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return appearances;
      const data = await res.json() as any;
      const games = (data.games || [])
        .filter((g: any) => (g.gameState === "OFF" || g.gameState === "FINAL" || g.gameState === "7"))
        .sort((a: any, b: any) => new Date(b.startTimeUTC || b.gameDate).getTime() - new Date(a.startTimeUTC || a.gameDate).getTime())
        .slice(0, 3);

      for (const game of games) {
        try {
          const boxUrl = `https://api-web.nhle.com/v1/gamecenter/${game.id}/boxscore`;
          const boxRes = await fetch(boxUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
            signal: AbortSignal.timeout(10000),
          });
          if (!boxRes.ok) continue;
          const box = await boxRes.json() as any;

          const processTeam = (teamData: any, abbrev: string) => {
            if (!teamData) return;
            for (const pos of ["forwards", "defense", "goalies"]) {
              const group = teamData[pos] || [];
              for (const p of group) {
                if (p.playerId && p.name?.default) {
                  appearances.push({
                    playerId: String(p.playerId),
                    playerName: p.name.default,
                    teamAbbrev: abbrev,
                    gameId: String(game.id),
                    league: "NHL",
                  });
                }
              }
            }
          };

          const homeAbbrev = box.homeTeam?.abbrev || "";
          const awayAbbrev = box.awayTeam?.abbrev || "";
          processTeam(box.playerByGameStats?.homeTeam, homeAbbrev);
          processTeam(box.playerByGameStats?.awayTeam, awayAbbrev);
        } catch {
          continue;
        }
      }
    } catch (err) {
      console.log(`  Player movement: NHL boxscore fetch failed for ${teamAbbrev}:`, (err as Error).message);
    }
    return appearances;
  },
};

function getProviderForLeague(league: string): BoxscoreProvider | null {
  if (league === "NHL") return nhlBoxscoreProvider;
  return null;
}

async function detectPlayerMovements(
  events: AppEvent[],
  now: Date,
  simulateMovement = false,
): Promise<{ cache: PlayerMovementCache; newMovements: PlayerMovementEntry[]; runMeta: MovementRunMeta }> {
  const cache = loadMovementCache();
  const newMovements: PlayerMovementEntry[] = [];

  const observedTeams = buildObservedTeamSet(events, now);
  const skippedTeams: MovementRunMeta["skippedTeams"] = [];

  for (const entry of MOVEMENT_TRACKED_NONHL) {
    const provider = getProviderForLeague(entry.league);
    if (!provider) {
      skippedTeams.push({ team: entry.team, league: entry.league, reason: "LEAGUE_NOT_SUPPORTED" });
      console.log(`  Player movement: skipped ${entry.team} (${entry.league}) — LEAGUE_NOT_SUPPORTED`);
    }
  }

  const allAppearances: PlayerAppearance[] = [];
  const teamsFetched: string[] = [];
  for (const abbrev of observedTeams) {
    const appearances = await nhlBoxscoreProvider.fetch(abbrev, now);
    if (appearances.length > 0) teamsFetched.push(abbrev);
    allAppearances.push(...appearances);
  }
  console.log(`  Player movement: fetched boxscores for ${teamsFetched.length}/${observedTeams.length} NHL teams (${allAppearances.length} player appearances)`);

  const latestByPlayer = new Map<string, PlayerAppearance>();
  for (const app of allAppearances) {
    const existing = latestByPlayer.get(app.playerId);
    if (!existing) {
      latestByPlayer.set(app.playerId, app);
    }
  }

  for (const [playerId, app] of latestByPlayer) {
    const entry = cache.history[playerId] || { name: app.playerName, sightings: [] };
    entry.name = app.playerName;

    const alreadySeen = entry.sightings.some(s => s.gameId === app.gameId && s.teamAbbrev === app.teamAbbrev);
    if (!alreadySeen) {
      entry.sightings.push({
        teamAbbrev: app.teamAbbrev,
        gameId: app.gameId,
        seenAt: now.toISOString(),
      });
      if (entry.sightings.length > MAX_SIGHTING_HISTORY) {
        entry.sightings = entry.sightings.slice(-MAX_SIGHTING_HISTORY);
      }
    }

    cache.history[playerId] = entry;
  }

  if (simulateMovement) {
    console.log("  Player movement: [SIMULATE] injecting fake ANA → BOS transition");
    const fakeId = "SIM_99999";
    const fakeName = "Test Simulated Player";
    cache.history[fakeId] = {
      name: fakeName,
      sightings: [
        { teamAbbrev: "ANA", gameId: "sim_old", seenAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
        { teamAbbrev: "BOS", gameId: "sim_new", seenAt: now.toISOString() },
      ],
    };
  }

  const cutoff = new Date(now.getTime() - 14 * 86400000);
  const dedupeWindow = new Date(now.getTime() - 7 * 86400000);
  const existingTransitions = new Set(
    cache.movements
      .filter(m => new Date(m.detectedAt) > dedupeWindow)
      .map(m => `${m.playerId}::${m.fromTeam}::${m.toTeam}`)
  );

  for (const [playerId, entry] of Object.entries(cache.history)) {
    const { sightings, name } = entry;
    if (sightings.length < 2) continue;

    const sorted = [...sightings].sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime());
    const latest = sorted[sorted.length - 1];
    const previous = sorted.slice(0, -1).reverse().find(s => s.teamAbbrev !== latest.teamAbbrev);
    if (!previous) continue;

    const prevDate = new Date(previous.seenAt);
    if (prevDate < cutoff) continue;

    const dedupeKey = `${playerId}::${previous.teamAbbrev}::${latest.teamAbbrev}`;
    if (existingTransitions.has(dedupeKey)) continue;

    const movement: PlayerMovementEntry = {
      playerId,
      playerName: name,
      fromTeam: previous.teamAbbrev,
      toTeam: latest.teamAbbrev,
      detectedAt: now.toISOString(),
      lastSeenFrom: previous.seenAt,
      firstSeenTo: latest.seenAt,
    };
    newMovements.push(movement);
    cache.movements.push(movement);
  }

  cache.movements = cache.movements.filter(m => new Date(m.detectedAt) > dedupeWindow);
  cache.lastUpdated = now.toISOString();

  const runMeta: MovementRunMeta = {
    observedTeams,
    skippedTeams,
    playersIngested: latestByPlayer.size,
    movementsDetectedThisRun: newMovements,
    timestamp: now.toISOString(),
  };
  cache.lastRunMeta = runMeta;

  saveMovementCache(cache);
  return { cache, newMovements, runMeta };
}

function generatePlayerMovement(cache: PlayerMovementCache, now: Date): ExploreNarrativeCard[] {
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const recentMovements = cache.movements.filter(m => new Date(m.detectedAt) > weekAgo);
  if (recentMovements.length === 0) return [];

  const teamMentions = new Set<string>();
  for (const m of recentMovements) {
    teamMentions.add(m.fromTeam);
    teamMentions.add(m.toTeam);
  }

  const primaryTeam = recentMovements.find(m =>
    MOVEMENT_PRIMARY_TEAMS.includes(m.fromTeam) || MOVEMENT_PRIMARY_TEAMS.includes(m.toTeam)
  );
  const regionTeam = primaryTeam?.toTeam || primaryTeam?.fromTeam || recentMovements[0]?.toTeam || "";
  const abbrevToName = Object.entries(ALL_NHL_ABBREVS).reduce((acc, [name, abbr]) => { acc[abbr] = name; return acc; }, {} as Record<string, string>);
  const movementRegion = resolveRegion(abbrevToName[regionTeam] || regionTeam);

  return [{
    id: "player_movement_system",
    title: "System Shuffle",
    subtitle: `${recentMovements.length} player move${recentMovements.length > 1 ? "s" : ""} detected (${[...teamMentions].join(" ↔ ")})`,
    impact: { label: "Feeds: Watch", tabHint: "Watch" },
    priority: 90,
    triggeredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    kind: "player_movement",
    region: movementRegion,
    regionPriority: getRegionPriority(movementRegion),
    regionLabel: getRegionLabel(movementRegion),
    meta: {
      movements: recentMovements.map(m => ({
        player: m.playerName,
        from: m.fromTeam,
        to: m.toTeam,
        detected: m.detectedAt,
        lastSeenFrom: m.lastSeenFrom,
        firstSeenTo: m.firstSeenTo,
      })),
      count: recentMovements.length,
      reason: `${recentMovements.length} player(s) detected moving between tracked teams in the last 7 days`,
    },
  }];
}

const NHL_TRADE_DEADLINE = "2026-03-07T15:00:00-05:00";
const DEADLINE_WINDOW_HOURS = 72;

interface DeadlinePlayer {
  name: string;
  status: string;
}

interface DeadlineTeamConfig {
  team: string;
  abbrev: string;
  tradeWatch: boolean;
  expiringContracts: number;
  playoffBubble: boolean;
  players: DeadlinePlayer[];
}

const DEADLINE_TEAMS: DeadlineTeamConfig[] = [
  {
    team: "Anaheim Ducks", abbrev: "ANA", tradeWatch: true, expiringContracts: 3, playoffBubble: false,
    players: [
      { name: "Adam Henrique", status: "UFA" },
      { name: "Frank Vatrano", status: "UFA" },
      { name: "Radko Gudas", status: "Trade interest" },
    ],
  },
  {
    team: "Boston Bruins", abbrev: "BOS", tradeWatch: true, expiringContracts: 2, playoffBubble: true,
    players: [
      { name: "Jake DeBrusk", status: "UFA" },
      { name: "Matt Grzelcyk", status: "UFA" },
    ],
  },
  {
    team: "San Diego Gulls", abbrev: "SDG", tradeWatch: false, expiringContracts: 0, playoffBubble: false,
    players: [],
  },
];

function buildDeadlineNarrative(cfg: DeadlineTeamConfig, teamShort: string, movementAbbrevs: Set<string>): string {
  const parts: string[] = [];

  if (cfg.expiringContracts > 0 && cfg.tradeWatch) {
    const contractWord = cfg.expiringContracts === 1 ? "an expiring contract" : `${cfg.expiringContracts} expiring contracts`;
    parts.push(`${cfg.team.split(" ").slice(0, -1).join(" ")} has ${contractWord} heading into the trade deadline and has appeared on multiple trade-watch lists.`);
  } else if (cfg.expiringContracts > 0) {
    const contractWord = cfg.expiringContracts === 1 ? "an expiring contract" : `${cfg.expiringContracts} expiring contracts`;
    parts.push(`${cfg.team.split(" ").slice(0, -1).join(" ")} has ${contractWord} to address before the deadline.`);
  } else if (cfg.tradeWatch) {
    parts.push(`${cfg.team.split(" ").slice(0, -1).join(" ")} has been generating trade buzz in recent weeks.`);
  }

  if (cfg.playoffBubble) {
    parts.push(`Sitting on the playoff bubble, the ${teamShort} may look to add — or could become sellers if things don't turn around.`);
  }

  if (cfg.players.length > 0) {
    const playerNames = cfg.players.map(p => p.name);
    const nameList = playerNames.length <= 2 ? playerNames.join(" and ") : `${playerNames.slice(0, -1).join(", ")}, and ${playerNames[playerNames.length - 1]}`;
    parts.push(`Players like ${nameList} could attract interest if the ${teamShort} decide to move assets.`);
  }

  if (movementAbbrevs.has(cfg.abbrev)) {
    parts.push(`Recent roster activity suggests the front office is already exploring its options.`);
  }

  return parts.join("\n\n");
}

function generateDeadlineWatch(
  events: AppEvent[],
  favorites: Favorites,
  now: Date,
  recentMovements: PlayerMovementEntry[]
): { cards: ExploreNarrativeCard[]; debug: { active: boolean; hoursUntil: number; teamsEvaluated: number; triggers: Record<string, string[]> } } {
  const deadlineDate = new Date(NHL_TRADE_DEADLINE);
  const hoursUntil = (deadlineDate.getTime() - now.getTime()) / 3600000;
  const debug = { active: false, hoursUntil, teamsEvaluated: 0, triggers: {} as Record<string, string[]> };

  if (hoursUntil < -24 || hoursUntil > DEADLINE_WINDOW_HOURS) {
    return { cards: [], debug };
  }
  debug.active = true;

  const movementAbbrevs72h = new Set<string>();
  const recentCutoff = new Date(now.getTime() - 72 * 3600000);
  for (const m of recentMovements) {
    if (new Date(m.detectedAt) > recentCutoff) {
      movementAbbrevs72h.add(m.fromTeam);
      movementAbbrevs72h.add(m.toTeam);
    }
  }

  const cards: ExploreNarrativeCard[] = [];

  for (const cfg of DEADLINE_TEAMS) {
    if (!isTeamFavoriteOrTracked(cfg.team, favorites)) continue;
    debug.teamsEvaluated++;

    const triggers: string[] = [];
    if (cfg.tradeWatch) triggers.push("trade-watch list");
    if (cfg.expiringContracts > 0) triggers.push(`${cfg.expiringContracts} expiring contract${cfg.expiringContracts > 1 ? "s" : ""}`);
    if (cfg.playoffBubble) triggers.push("playoff bubble");
    if (movementAbbrevs72h.has(cfg.abbrev)) triggers.push("recent trade activity");

    if (triggers.length === 0) continue;

    debug.triggers[cfg.team] = triggers;

    const teamShort = cfg.team.split(" ").pop() || cfg.team;
    const title = `${teamShort} on Deadline Watch`;

    let subtitle = "";
    if (cfg.expiringContracts > 0) {
      const playerLastNames = cfg.players.map(p => p.name.split(" ").pop()).filter(Boolean);
      const namesSuffix = playerLastNames.length > 0 ? ` (${playerLastNames.join(", ")})` : "";
      subtitle = `${cfg.expiringContracts} contract${cfg.expiringContracts > 1 ? "s" : ""} expiring before the trade deadline${namesSuffix}`;
    } else if (cfg.tradeWatch) {
      subtitle = "On the trade-watch radar heading into the deadline";
    } else {
      subtitle = "Monitoring ahead of the trade deadline";
    }

    const narrative = buildDeadlineNarrative(cfg, teamShort, movementAbbrevs72h);

    let priority = 80;
    if (isTeamFavoriteOrTracked(cfg.team, favorites)) priority += 10;
    if (cfg.playoffBubble) priority += 5;
    if (movementAbbrevs72h.has(cfg.abbrev)) priority += 8;
    priority += Math.min(cfg.expiringContracts * 2, 6);

    const hasConfirmedTrade = recentMovements.some(m =>
      (m.fromTeam === cfg.abbrev || m.toTeam === cfg.abbrev) && new Date(m.detectedAt) > recentCutoff
    );
    if (hasConfirmedTrade) continue;

    const region = resolveRegion(cfg.team);
    const teamEvents = getEventsForTeam(events, cfg.team, 7, now, "NHL");

    cards.push({
      id: `deadline_watch_${cfg.abbrev.toLowerCase()}`,
      title,
      subtitle,
      impact: { label: "Feeds: Watch", tabHint: "Watch" },
      priority,
      triggeredAt: now.toISOString(),
      expiresAt: new Date(deadlineDate.getTime() + 24 * 3600000).toISOString(),
      kind: "deadline_watch",
      region,
      regionPriority: getRegionPriority(region),
      regionLabel: getRegionLabel(region),
      meta: {
        team: cfg.team,
        abbrev: cfg.abbrev,
        deadlineDate: NHL_TRADE_DEADLINE,
        hoursUntil: Math.round(hoursUntil * 10) / 10,
        triggers,
        tradeWatch: cfg.tradeWatch,
        expiringContracts: cfg.expiringContracts,
        playoffBubble: cfg.playoffBubble,
        recentTradeActivity: movementAbbrevs72h.has(cfg.abbrev),
        reason: narrative,
        players: cfg.players,
        eventIds: teamEvents.map(e => e.id),
      },
    });
  }

  return { cards, debug };
}

interface DroppedCandidate {
  id: string;
  kind: string;
  region: string;
  title: string;
  reason: string;
}

export async function generateNarratives(events: AppEvent[], favorites: Favorites, now: Date, options?: { simulateMovement?: boolean }): Promise<{
  cards: ExploreNarrativeCard[];
  debug: {
    rawCandidatesByKindAndRegion: Record<string, Record<string, number>>;
    combinedPushByRegion: Record<string, boolean>;
    finalFeedByRegion: Record<string, string[]>;
    droppedCandidatesReasons: DroppedCandidate[];
    totalBeforeCap: number;
    totalAfterCap: number;
    playerMovement: any;
    deadlineWatch: any;
  };
}> {
  console.log("\n=== Generating Explore Narratives ===");

  const pushResult = generatePlayoffPush(events, favorites, now);
  console.log(`  Playoff Push: ${pushResult.cards.length} card(s) by region`);
  for (const c of pushResult.cards) {
    console.log(`    [${c.region}] ${c.title}: ${c.subtitle}`);
  }

  const nhlGames = new Map<string, any[]>();
  for (const [team, abbrev] of Object.entries(NHL_TEAM_ABBREVS)) {
    const games = await fetchNhlRecentGames(abbrev);
    nhlGames.set(abbrev, games);
    console.log(`  NHL games fetched for ${abbrev}: ${games.length}`);
  }

  const momentum = generateMomentum(events, favorites, now, nhlGames);
  console.log(`  Momentum: ${momentum.length} card(s)`);

  const leagueMoments = generateLeagueMoments(events, now);
  console.log(`  League Moments: ${leagueMoments.length} card(s)`);

  let playerMovementCards: ExploreNarrativeCard[] = [];
  let movementRunMeta: MovementRunMeta | null = null;
  let movementError: string | null = null;
  let movementCacheHistoryCount = 0;
  try {
    const { cache, runMeta } = await detectPlayerMovements(events, now, options?.simulateMovement ?? false);
    playerMovementCards = generatePlayerMovement(cache, now);
    movementRunMeta = runMeta;
    movementCacheHistoryCount = Object.keys(cache.history).length;
    console.log(`  Player Movement: ${playerMovementCards.length} card(s) (${cache.movements.length} recent movements, ${movementCacheHistoryCount} players tracked in cache)`);
    if (runMeta.skippedTeams.length > 0) {
      for (const s of runMeta.skippedTeams) {
        console.log(`    Skipped: ${s.team} (${s.league}) — ${s.reason}`);
      }
    }
  } catch (err) {
    movementError = (err as Error).message;
    console.log(`  Player Movement: skipped (${movementError})`);
  }

  const movementCache = loadMovementCache();
  const deadlineResult = generateDeadlineWatch(events, favorites, now, movementCache.movements);
  console.log(`  Deadline Watch: ${deadlineResult.cards.length} card(s) (active: ${deadlineResult.debug.active}, ${deadlineResult.debug.hoursUntil.toFixed(1)}h until deadline)`);
  for (const c of deadlineResult.cards) {
    console.log(`    [${c.region}] ${c.title}: ${c.subtitle}`);
    console.log(`      triggers: ${c.meta?.triggers?.join(", ")}`);
  }

  const allCandidates = [...pushResult.cards, ...momentum, ...leagueMoments, ...playerMovementCards, ...deadlineResult.cards];

  const rawCandidatesByKindAndRegion: Record<string, Record<string, number>> = {};
  for (const c of allCandidates) {
    if (!rawCandidatesByKindAndRegion[c.kind]) rawCandidatesByKindAndRegion[c.kind] = {};
    rawCandidatesByKindAndRegion[c.kind][c.region] = (rawCandidatesByKindAndRegion[c.kind][c.region] || 0) + 1;
  }

  allCandidates.sort((a, b) => {
    if (a.regionPriority !== b.regionPriority) return a.regionPriority - b.regionPriority;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  const dropped: DroppedCandidate[] = [];
  const kindRegionCount = new Map<string, number>();
  const selected: ExploreNarrativeCard[] = [];

  for (const card of allCandidates) {
    const key = `${card.kind}::${card.region}`;

    if ((kindRegionCount.get(key) || 0) >= 1) {
      dropped.push({ id: card.id, kind: card.kind, region: card.region, title: card.title, reason: `max 1 ${card.kind} per region (${card.region})` });
      continue;
    }

    if (selected.length >= 4) {
      dropped.push({ id: card.id, kind: card.kind, region: card.region, title: card.title, reason: "feed cap (max 4)" });
      continue;
    }

    selected.push(card);
    kindRegionCount.set(key, (kindRegionCount.get(key) || 0) + 1);
  }

  const finalFeedByRegion: Record<string, string[]> = {};
  for (const c of selected) {
    if (!finalFeedByRegion[c.region]) finalFeedByRegion[c.region] = [];
    finalFeedByRegion[c.region].push(`${c.kind}: ${c.title}`);
  }

  const movementDropped = dropped.filter(d => d.kind === "player_movement");
  const movementInFeed = selected.filter(c => c.kind === "player_movement").length;

  const debug = {
    rawCandidatesByKindAndRegion,
    combinedPushByRegion: pushResult.debugInfo.combinedByRegion,
    finalFeedByRegion,
    droppedCandidatesReasons: dropped,
    totalBeforeCap: allCandidates.length,
    totalAfterCap: selected.length,
    playerMovement: {
      rawMovementCandidates: playerMovementCards.length,
      movementAfterRegionFilter: playerMovementCards.length,
      movementAfterCap: movementInFeed,
      movementFinalCount: movementInFeed,
      movementDroppedReasons: movementDropped.map(d => d.reason),
      runMeta: movementRunMeta,
      cacheHistoryCount: movementCacheHistoryCount,
      error: movementError,
    },
    deadlineWatch: deadlineResult.debug,
  };

  console.log(`  Total: ${allCandidates.length} → selected ${selected.length}`);
  for (const c of selected) {
    console.log(`    [${c.region}/${c.kind}] ${c.title}: ${c.subtitle}`);
  }
  if (dropped.length > 0) {
    console.log(`  Dropped ${dropped.length} candidate(s):`);
    for (const d of dropped) {
      console.log(`    ✗ ${d.title} (${d.reason})`);
    }
  }
  console.log("=== Narratives Complete ===\n");

  return { cards: selected, debug };
}

export async function generateAndSave(options?: { simulateMovement?: boolean }): Promise<ExploreNarrativeCard[]> {
  let events: AppEvent[] = [];
  let favorites: Favorites = {};

  try {
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
    events = eventsData.events || [];
  } catch (err) {
    console.error("Failed to load events:", (err as Error).message);
  }

  try {
    const guideData = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "..", "data", "masterGuide.json"), "utf8")
    );
    favorites = guideData.favorites || {};
  } catch (err) {
    console.error("Failed to load favorites:", (err as Error).message);
  }

  const now = new Date();
  const { cards, debug } = await generateNarratives(events, favorites, now, options);

  const output = {
    lastUpdated: now.toISOString(),
    debug,
    cards,
  };

  fs.writeFileSync(NARRATIVES_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${cards.length} narrative cards to ${NARRATIVES_PATH}`);

  return cards;
}

if (require.main === module) {
  const simulate = process.argv.includes("--simulate-movement");
  generateAndSave({ simulateMovement: simulate }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
