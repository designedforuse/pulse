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

export interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement";
  meta?: Record<string, any>;
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

function getEventsForTeam(events: AppEvent[], teamName: string, nextDays: number, now: Date): AppEvent[] {
  const windowEnd = new Date(now.getTime() + nextDays * 86400000);
  return events.filter(e => {
    const start = new Date(e.startTimeLocal);
    if (start < now || start > windowEnd) return false;
    return normalizeTeamName(e.homeTeam).includes(normalizeTeamName(teamName)) ||
           normalizeTeamName(e.awayTeam).includes(normalizeTeamName(teamName)) ||
           normalizeTeamName(teamName).includes(normalizeTeamName(e.homeTeam)) ||
           normalizeTeamName(teamName).includes(normalizeTeamName(e.awayTeam));
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

function generatePlayoffPush(events: AppEvent[], favorites: Favorites, now: Date): ExploreNarrativeCard[] {
  const cards: ExploreNarrativeCard[] = [];
  const favTeams = getAllFavoriteTeams(favorites);
  const hockeyFavs = favTeams.filter(f => f.sport === "hockey");

  for (const fav of hockeyFavs) {
    const teamEvents = getEventsForTeam(events, fav.team, 7, now);
    if (teamEvents.length < 3 && !hasBackToBack(teamEvents)) continue;

    const shortName = fav.team.split(" ").pop() || fav.team;
    const b2b = hasBackToBack(teamEvents);
    const daysSpan = teamEvents.length >= 2
      ? Math.ceil((new Date(teamEvents[teamEvents.length - 1].startTimeLocal).getTime() - new Date(teamEvents[0].startTimeLocal).getTime()) / 86400000)
      : 0;

    const subtitleParts: string[] = [];
    if (teamEvents.length >= 3) subtitleParts.push(`${teamEvents.length} games in ${daysSpan} days`);
    if (b2b) subtitleParts.push("back-to-back");

    const ritual = findBestRitual(teamEvents);
    const impact: NarrativeImpact = ritual
      ? { label: `Impacts: ${ritual.label}`, ritualId: ritual.id, tabHint: "Rituals" }
      : { label: "Feeds: Watch", tabHint: "Watch" };

    cards.push({
      id: `playoff_push_${fav.league.toLowerCase().replace(/\s/g, "")}_${normalizeTeamName(fav.team).replace(/\s/g, "_")}`,
      title: `${shortName} Push Week`,
      subtitle: subtitleParts.join(" · ") || "Dense schedule ahead",
      impact,
      priority: 100,
      triggeredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      kind: "playoff_push",
      meta: {
        team: fav.team,
        league: fav.league,
        sport: fav.sport,
        gamesInWindow: teamEvents.length,
        hasBackToBack: b2b,
        daysSpan,
        eventIds: teamEvents.map(e => e.id),
        reason: teamEvents.length >= 3
          ? `${fav.team} has ${teamEvents.length} games in the next 7 days`
          : `${fav.team} has back-to-back games`,
      },
    });
  }

  return cards;
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

    const teamEvents = getEventsForTeam(events, fav.team, 7, now);
    const ritual = findBestRitual(teamEvents);
    const impact: NarrativeImpact = ritual
      ? { label: `Feeds: ${ritual.label}`, ritualId: ritual.id, tabHint: "Rituals" }
      : { label: "Feeds: Watch", tabHint: "Watch" };

    cards.push({
      id: `momentum_${abbrev.toLowerCase()}`,
      title: `${shortName} Heating Up`,
      subtitle: subtitleParts.join(" · "),
      impact,
      priority: 60,
      triggeredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3 * 86400000).toISOString(),
      kind: "momentum",
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

    cards.push({
      id: "league_moment_rivalry",
      title: rivalryMatches.length === 1 ? rivalryMatches[0].label : "Rivalry Weekend",
      subtitle,
      impact: { label: "Feeds: Watch", tabHint: "Watch" },
      priority: 70,
      triggeredAt: now.toISOString(),
      expiresAt: windowEnd.toISOString(),
      kind: "league_moment",
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
    cards.push({
      id: "league_moment_tournament",
      title: "Big Stage",
      subtitle: `${tournamentMatches.length} tournament/knockout match${tournamentMatches.length > 1 ? "es" : ""} this week`,
      impact: { label: "Feeds: Watch", tabHint: "Watch" },
      priority: 70,
      triggeredAt: now.toISOString(),
      expiresAt: windowEnd.toISOString(),
      kind: "league_moment",
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
  lastSeen: Record<string, { team: string; lastDate: string; playerId?: string }>;
  movements: PlayerMovementEntry[];
  lastUpdated: string;
}

function loadMovementCache(): PlayerMovementCache {
  try {
    if (fs.existsSync(MOVEMENT_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(MOVEMENT_CACHE_PATH, "utf8"));
    }
  } catch {}
  return { lastSeen: {}, movements: [], lastUpdated: new Date().toISOString() };
}

function saveMovementCache(cache: PlayerMovementCache): void {
  fs.writeFileSync(MOVEMENT_CACHE_PATH, JSON.stringify(cache, null, 2));
}

const TRACKED_TEAMS = ["ANA", "SDG"];
const TRACKED_TEAM_NAMES = ["Anaheim Ducks", "San Diego Gulls", "Tulsa Oilers"];

async function fetchNhlBoxscorePlayers(teamAbbrev: string, now: Date): Promise<{ name: string; id: string; team: string }[]> {
  const players: { name: string; id: string; team: string }[] = [];
  try {
    const schedUrl = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbrev}/20252026`;
    const res = await fetch(schedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return players;
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

        const processTeam = (teamData: any, teamName: string) => {
          if (!teamData) return;
          for (const pos of ["forwards", "defense", "goalies"]) {
            const group = teamData[pos] || [];
            for (const p of group) {
              if (p.playerId && p.name?.default) {
                players.push({
                  name: p.name.default,
                  id: String(p.playerId),
                  team: teamName,
                });
              }
            }
          }
        };

        const homeAbbrev = box.homeTeam?.abbrev || "";
        const awayAbbrev = box.awayTeam?.abbrev || "";
        if (homeAbbrev === teamAbbrev) {
          processTeam(box.playerByGameStats?.homeTeam, `${teamAbbrev} (NHL)`);
        }
        if (awayAbbrev === teamAbbrev) {
          processTeam(box.playerByGameStats?.awayTeam, `${teamAbbrev} (NHL)`);
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.log(`  Player movement: NHL boxscore fetch failed for ${teamAbbrev}:`, (err as Error).message);
  }
  return players;
}

async function detectPlayerMovements(now: Date): Promise<{ cache: PlayerMovementCache; newMovements: PlayerMovementEntry[] }> {
  const cache = loadMovementCache();
  const newMovements: PlayerMovementEntry[] = [];

  const allPlayers: { name: string; id: string; team: string }[] = [];
  for (const abbrev of TRACKED_TEAMS) {
    const players = await fetchNhlBoxscorePlayers(abbrev, now);
    allPlayers.push(...players);
  }

  const playerMap = new Map<string, { name: string; team: string }>();
  for (const p of allPlayers) {
    const key = p.id || normalizeTeamName(p.name);
    if (!playerMap.has(key)) {
      playerMap.set(key, { name: p.name, team: p.team });
    }
  }

  const cutoff = new Date(now.getTime() - 14 * 86400000);
  for (const [key, { name, team }] of playerMap) {
    const prev = cache.lastSeen[key];
    if (prev && prev.team !== team) {
      const lastDate = new Date(prev.lastDate);
      if (lastDate > cutoff) {
        const movement: PlayerMovementEntry = {
          playerId: key,
          playerName: name,
          fromTeam: prev.team,
          toTeam: team,
          detectedAt: now.toISOString(),
          lastSeenFrom: prev.lastDate,
          firstSeenTo: now.toISOString(),
        };
        newMovements.push(movement);
        cache.movements.push(movement);
      }
    }
    cache.lastSeen[key] = { team, lastDate: now.toISOString(), playerId: key };
  }

  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  cache.movements = cache.movements.filter(m => new Date(m.detectedAt) > weekAgo);
  cache.lastUpdated = now.toISOString();
  saveMovementCache(cache);

  return { cache, newMovements };
}

function generatePlayerMovement(cache: PlayerMovementCache, now: Date): ExploreNarrativeCard[] {
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const recentMovements = cache.movements.filter(m => new Date(m.detectedAt) > weekAgo);
  if (recentMovements.length === 0) return [];

  const teamMentions = new Set<string>();
  for (const m of recentMovements) {
    teamMentions.add(m.fromTeam.replace(/ \(.*\)/, ""));
    teamMentions.add(m.toTeam.replace(/ \(.*\)/, ""));
  }

  return [{
    id: "player_movement_system",
    title: "System Shuffle",
    subtitle: `${recentMovements.length} player move${recentMovements.length > 1 ? "s" : ""} detected (${[...teamMentions].join(" ↔ ")})`,
    impact: { label: "Feeds: Watch", tabHint: "Watch" },
    priority: 90,
    triggeredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    kind: "player_movement",
    meta: {
      movements: recentMovements.map(m => ({
        player: m.playerName,
        from: m.fromTeam,
        to: m.toTeam,
        detected: m.detectedAt,
      })),
      count: recentMovements.length,
      reason: `${recentMovements.length} player(s) detected moving between tracked teams in the last 7 days`,
    },
  }];
}

export async function generateNarratives(events: AppEvent[], favorites: Favorites, now: Date): Promise<{
  cards: ExploreNarrativeCard[];
  debug: {
    playoffPushCount: number;
    momentumCount: number;
    leagueMomentCount: number;
    playerMovementCount: number;
    totalBeforeCap: number;
  };
}> {
  console.log("\n=== Generating Explore Narratives ===");

  const playoffPush = generatePlayoffPush(events, favorites, now);
  console.log(`  Playoff Push: ${playoffPush.length} card(s)`);

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
  try {
    const { cache } = await detectPlayerMovements(now);
    playerMovementCards = generatePlayerMovement(cache, now);
    console.log(`  Player Movement: ${playerMovementCards.length} card(s) (${cache.movements.length} recent movements in cache)`);
  } catch (err) {
    console.log(`  Player Movement: skipped (${(err as Error).message})`);
  }

  const allCards = [...playoffPush, ...momentum, ...leagueMoments, ...playerMovementCards];
  allCards.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  const capped = allCards.slice(0, 5);

  const debug = {
    playoffPushCount: playoffPush.length,
    momentumCount: momentum.length,
    leagueMomentCount: leagueMoments.length,
    playerMovementCount: playerMovementCards.length,
    totalBeforeCap: allCards.length,
  };

  console.log(`  Total: ${allCards.length} → capped to ${capped.length}`);
  for (const c of capped) {
    console.log(`    [${c.kind}] ${c.title}: ${c.subtitle}`);
  }
  console.log("=== Narratives Complete ===\n");

  return { cards: capped, debug };
}

export async function generateAndSave(): Promise<ExploreNarrativeCard[]> {
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
  const { cards, debug } = await generateNarratives(events, favorites, now);

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
  generateAndSave().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
