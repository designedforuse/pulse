import * as fs from "node:fs";
import * as path from "node:path";

export interface PlayerProfile {
  playerId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  headshot: string | null;
  birthDate: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  shootsCatches: string | null;
  isActive: boolean;
  currentTeamAbbrev: string | null;
  currentTeamName: string | null;
  draftDetails: {
    year: number;
    round: number;
    pickOverall: number;
    team: string;
  } | null;
}

export interface CareerStop {
  season: number;
  seasonLabel: string;
  leagueAbbrev: string;
  teamName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  phase: "REG" | "PO" | "UNK";
}

export interface PlayerJourneyResponse {
  upstreamSource: "nhl-api-web";
  fetchedAt: string;
  profile: PlayerProfile;
  careerStops: CareerStop[];
  derived: {
    lastRecordedLevel: string | null;
    lastRecordedSeason: string | null;
  };
  summary: {
    leaguesPlayed: string[];
    teamsPlayed: string[];
    nhlDebut: string | null;
    totalNhlGames: number;
    totalAhlGames: number;
    totalEchlGames: number;
  };
  nextGame: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    startTime: string;
  } | null;
}

export interface DebugPlayerJourneyResponse extends PlayerJourneyResponse {
  debug: {
    upstreamBytes: number;
    missingFields: string[];
    careerStopsCount: number;
    derivedExplanation: string;
    nextGameMatchReason: string;
    nextGameCandidates: Array<{
      id: string;
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
    }>;
  };
}

export function formatSeasonLabel(season: number): string {
  const str = String(season);
  if (str.length !== 8) return str;
  const startYear = str.slice(0, 4);
  const endYear = str.slice(6, 8);
  return `${startYear}-${endYear}`;
}

const NHL_TEAM_ABBREV_MAP: Record<string, string[]> = {
  ANA: ["Anaheim Ducks", "Ducks"],
  ARI: ["Arizona Coyotes", "Coyotes"],
  BOS: ["Boston Bruins", "Bruins"],
  BUF: ["Buffalo Sabres", "Sabres"],
  CGY: ["Calgary Flames", "Flames"],
  CAR: ["Carolina Hurricanes", "Hurricanes"],
  CHI: ["Chicago Blackhawks", "Blackhawks"],
  COL: ["Colorado Avalanche", "Avalanche"],
  CBJ: ["Columbus Blue Jackets", "Blue Jackets"],
  DAL: ["Dallas Stars", "Stars"],
  DET: ["Detroit Red Wings", "Red Wings"],
  EDM: ["Edmonton Oilers", "Oilers"],
  FLA: ["Florida Panthers", "Panthers"],
  LAK: ["Los Angeles Kings", "Kings"],
  MIN: ["Minnesota Wild", "Wild"],
  MTL: ["Montreal Canadiens", "Canadiens", "Montréal Canadiens"],
  NSH: ["Nashville Predators", "Predators"],
  NJD: ["New Jersey Devils", "Devils"],
  NYI: ["New York Islanders", "Islanders"],
  NYR: ["New York Rangers", "Rangers"],
  OTT: ["Ottawa Senators", "Senators"],
  PHI: ["Philadelphia Flyers", "Flyers"],
  PIT: ["Pittsburgh Penguins", "Penguins"],
  SJS: ["San Jose Sharks", "Sharks"],
  SEA: ["Seattle Kraken", "Kraken"],
  STL: ["St. Louis Blues", "Blues"],
  TBL: ["Tampa Bay Lightning", "Lightning"],
  TOR: ["Toronto Maple Leafs", "Maple Leafs"],
  UTA: ["Utah Hockey Club", "Utah HC"],
  VAN: ["Vancouver Canucks", "Canucks"],
  VGK: ["Vegas Golden Knights", "Golden Knights"],
  WSH: ["Washington Capitals", "Capitals"],
  WPG: ["Winnipeg Jets", "Jets"],
};

const AHL_TEAM_NAME_MAP: Record<string, string[]> = {
  "San Diego Gulls": ["Gulls", "SD Gulls"],
  "Bakersfield Condors": ["Condors"],
  "Charlotte Checkers": ["Checkers"],
  "Grand Rapids Griffins": ["Griffins"],
  "Providence Bruins": ["P-Bruins"],
  "Wilkes-Barre/Scranton Penguins": ["WBS Penguins", "WB/S Penguins"],
  "Chicago Wolves": ["Wolves"],
  "San Antonio Rampage": ["Rampage"],
  "Toronto Marlies": ["Marlies"],
};

function normalizeTeamName(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function teamMatchesAbbrev(eventTeam: string, abbrev: string): boolean {
  const names = NHL_TEAM_ABBREV_MAP[abbrev];
  if (!names) return false;
  const norm = normalizeTeamName(eventTeam);
  return names.some(n => normalizeTeamName(n) === norm || norm.includes(normalizeTeamName(n)));
}

function teamMatchesName(eventTeam: string, teamName: string): boolean {
  const normEvent = normalizeTeamName(eventTeam);
  const normTarget = normalizeTeamName(teamName);
  if (normEvent === normTarget || normEvent.includes(normTarget) || normTarget.includes(normEvent)) return true;
  const ahlAliases = AHL_TEAM_NAME_MAP[teamName];
  if (ahlAliases) {
    return ahlAliases.some(a => normalizeTeamName(a) === normEvent || normEvent.includes(normalizeTeamName(a)));
  }
  return false;
}

const REQUIRED_PROFILE_FIELDS = ["playerId", "fullName", "position", "isActive", "currentTeamAbbrev"];
const REQUIRED_DERIVED_FIELDS = ["lastRecordedLevel", "lastRecordedSeason"];
const REQUIRED_CAREER_STOP_FIELDS = ["season", "seasonLabel", "leagueAbbrev", "teamName", "gamesPlayed", "phase"];

function checkMissingFields(response: PlayerJourneyResponse): string[] {
  const missing: string[] = [];
  if (!response.profile.playerId) missing.push("profile.playerId");
  if (!response.profile.fullName) missing.push("profile.fullName");
  if (!response.profile.position) missing.push("profile.position");
  if (response.profile.isActive === undefined || response.profile.isActive === null) missing.push("profile.isActive");
  if (!response.profile.currentTeamAbbrev) missing.push("profile.currentTeamAbbrev");
  if (!response.derived.lastRecordedLevel) missing.push("derived.lastRecordedLevel");
  if (!response.derived.lastRecordedSeason) missing.push("derived.lastRecordedSeason");
  if (response.careerStops.length > 0) {
    const first = response.careerStops[0];
    if (!first.season) missing.push("careerStops[0].season");
    if (!first.seasonLabel) missing.push("careerStops[0].seasonLabel");
    if (!first.leagueAbbrev) missing.push("careerStops[0].leagueAbbrev");
    if (!first.teamName) missing.push("careerStops[0].teamName");
    if (first.gamesPlayed === undefined || first.gamesPlayed === null) missing.push("careerStops[0].gamesPlayed");
    if (!first.phase) missing.push("careerStops[0].phase");
  }
  return missing;
}

function determinePhase(entry: any, allEntries: any[], index: number): "REG" | "PO" | "UNK" {
  if (entry.gameTypeId !== undefined && entry.gameTypeId !== null) {
    if (entry.gameTypeId === 2) return "REG";
    if (entry.gameTypeId === 3) return "PO";
    return "UNK";
  }
  for (let i = 0; i < index; i++) {
    const prev = allEntries[i];
    if (
      prev.season === entry.season &&
      prev.leagueAbbrev === entry.leagueAbbrev &&
      (prev.teamName?.default || prev.teamName) === (entry.teamName?.default || entry.teamName)
    ) {
      const prevGP = prev.gamesPlayed ?? 0;
      const curGP = entry.gamesPlayed ?? 0;
      if (curGP <= prevGP) return "PO";
      return "UNK";
    }
  }
  return "UNK";
}

export function transformUpstreamToJourney(upstream: any, upstreamBytes: number): { journey: PlayerJourneyResponse; upstreamBytes: number } {
  const firstName = upstream.firstName?.default ?? "";
  const lastName = upstream.lastName?.default ?? "";

  const profile: PlayerProfile = {
    playerId: upstream.playerId ?? 0,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    position: upstream.position ?? "",
    headshot: upstream.headshot ?? null,
    birthDate: upstream.birthDate ?? null,
    birthCity: upstream.birthCity?.default ?? null,
    birthCountry: upstream.birthCountry ?? null,
    shootsCatches: upstream.shootsCatches ?? null,
    isActive: upstream.isActive ?? false,
    currentTeamAbbrev: upstream.currentTeamAbbrev ?? null,
    currentTeamName: upstream.fullTeamName?.default ?? null,
    draftDetails: upstream.draftDetails
      ? {
          year: upstream.draftDetails.year,
          round: upstream.draftDetails.round,
          pickOverall: upstream.draftDetails.pickOverall,
          team: upstream.draftDetails.teamAbbrev,
        }
      : null,
  };

  const seasonTotals: any[] = upstream.seasonTotals ?? [];
  const careerStops: CareerStop[] = seasonTotals.map((entry: any, idx: number) => {
    const phase = determinePhase(entry, seasonTotals, idx);
    return {
      season: entry.season ?? 0,
      seasonLabel: formatSeasonLabel(entry.season ?? 0),
      leagueAbbrev: entry.leagueAbbrev ?? "",
      teamName: entry.teamName?.default ?? "",
      gamesPlayed: entry.gamesPlayed ?? 0,
      goals: entry.goals ?? 0,
      assists: entry.assists ?? 0,
      points: entry.points ?? 0,
      phase,
    };
  });

  const TARGET_LEAGUES = ["NHL", "AHL", "ECHL"];
  let lastRecordedLevel: string | null = null;
  let lastRecordedSeason: string | null = null;
  for (let i = careerStops.length - 1; i >= 0; i--) {
    if (TARGET_LEAGUES.includes(careerStops[i].leagueAbbrev)) {
      lastRecordedLevel = careerStops[i].leagueAbbrev;
      lastRecordedSeason = careerStops[i].seasonLabel;
      break;
    }
  }

  const leaguesPlayed = [...new Set(careerStops.map(s => s.leagueAbbrev))];
  const teamsPlayed = [...new Set(careerStops.map(s => s.teamName))];
  const nhlStops = careerStops.filter(s => s.leagueAbbrev === "NHL" && s.phase === "REG");
  const nhlDebut = nhlStops.length > 0 ? nhlStops[0].seasonLabel : null;
  const totalNhlGames = careerStops.filter(s => s.leagueAbbrev === "NHL").reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalAhlGames = careerStops.filter(s => s.leagueAbbrev === "AHL").reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalEchlGames = careerStops.filter(s => s.leagueAbbrev === "ECHL").reduce((sum, s) => sum + s.gamesPlayed, 0);

  const journey: PlayerJourneyResponse = {
    upstreamSource: "nhl-api-web",
    fetchedAt: new Date().toISOString(),
    profile,
    careerStops,
    derived: {
      lastRecordedLevel,
      lastRecordedSeason,
    },
    summary: {
      leaguesPlayed,
      teamsPlayed,
      nhlDebut,
      totalNhlGames,
      totalAhlGames,
      totalEchlGames,
    },
    nextGame: null,
  };

  return { journey, upstreamBytes };
}

function loadGeneratedEvents(): any[] {
  try {
    const eventsPath = path.resolve(process.cwd(), "data", "generatedEvents.json");
    if (!fs.existsSync(eventsPath)) return [];
    const raw = fs.readFileSync(eventsPath, "utf-8");
    const data = JSON.parse(raw);
    return data.events ?? [];
  } catch {
    return [];
  }
}

export interface NextGameResult {
  matched: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    startTime: string;
  } | null;
  matchReason: string;
  candidates: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    startTime: string;
  }>;
}

export function findNextGame(profile: PlayerProfile, lastRecordedLevel: string | null): NextGameResult {
  const events = loadGeneratedEvents();
  const now = Date.now();
  const upcoming = events
    .filter((e: any) => new Date(e.startTimeLocal).getTime() >= now)
    .sort((a: any, b: any) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  const teamAbbrev = profile.currentTeamAbbrev;
  const teamName = profile.currentTeamName;

  let matchedEvents: any[] = [];
  let matchReason = "no_match";

  if (teamAbbrev) {
    matchedEvents = upcoming.filter((e: any) =>
      teamMatchesAbbrev(e.homeTeam, teamAbbrev) || teamMatchesAbbrev(e.awayTeam, teamAbbrev)
    );
    if (matchedEvents.length > 0) {
      matchReason = `matched_by_teamAbbrev:${teamAbbrev}`;
    }
  }

  if (matchedEvents.length === 0 && teamName) {
    matchedEvents = upcoming.filter((e: any) =>
      teamMatchesName(e.homeTeam, teamName) || teamMatchesName(e.awayTeam, teamName)
    );
    if (matchedEvents.length > 0) {
      matchReason = `matched_by_teamName:${teamName}`;
    }
  }

  if (matchedEvents.length === 0 && lastRecordedLevel === "AHL") {
    const lastTeamFromStops = findLastTeamForLevel(profile, "AHL");
    if (lastTeamFromStops) {
      matchedEvents = upcoming.filter((e: any) =>
        teamMatchesName(e.homeTeam, lastTeamFromStops) || teamMatchesName(e.awayTeam, lastTeamFromStops)
      );
      if (matchedEvents.length > 0) {
        matchReason = `matched_by_ahlTeamName:${lastTeamFromStops}`;
      }
    }
  }

  const candidates = matchedEvents.slice(0, 3).map((e: any) => ({
    id: e.id ?? "",
    homeTeam: e.homeTeam ?? "",
    awayTeam: e.awayTeam ?? "",
    league: e.league ?? "",
    startTime: e.startTimeLocal ?? "",
  }));

  return {
    matched: candidates.length > 0 ? candidates[0] : null,
    matchReason,
    candidates,
  };
}

function findLastTeamForLevel(_profile: PlayerProfile, _level: string): string | null {
  return null;
}

const cache = new Map<number, { data: PlayerJourneyResponse; timestamp: number; upstreamBytes: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function fetchPlayerJourney(playerId: number): Promise<{ journey: PlayerJourneyResponse; upstreamBytes: number }> {
  const cached = cache.get(playerId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { journey: { ...cached.data, fetchedAt: cached.data.fetchedAt }, upstreamBytes: cached.upstreamBytes };
  }

  const url = `https://api-web.nhle.com/v1/player/${playerId}/landing`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`NHL API returned ${resp.status} for player ${playerId}`);
  }
  const rawText = await resp.text();
  const upstreamBytes = Buffer.byteLength(rawText, "utf-8");
  const upstream = JSON.parse(rawText);

  const { journey } = transformUpstreamToJourney(upstream, upstreamBytes);

  const nextGameResult = findNextGame(journey.profile, journey.derived.lastRecordedLevel);
  journey.nextGame = nextGameResult.matched;

  cache.set(playerId, { data: journey, timestamp: Date.now(), upstreamBytes });

  return { journey, upstreamBytes };
}

export async function fetchPlayerJourneyDebug(playerId: number): Promise<DebugPlayerJourneyResponse> {
  const { journey, upstreamBytes } = await fetchPlayerJourney(playerId);

  const missingFields = checkMissingFields(journey);
  const nextGameResult = findNextGame(journey.profile, journey.derived.lastRecordedLevel);

  let derivedExplanation = "";
  if (journey.derived.lastRecordedLevel) {
    derivedExplanation = `lastRecordedLevel="${journey.derived.lastRecordedLevel}" determined from final careerStop with leagueAbbrev in [NHL,AHL,ECHL]. lastRecordedSeason="${journey.derived.lastRecordedSeason}" from same entry.`;
  } else {
    derivedExplanation = "No NHL/AHL/ECHL entries found in careerStops. lastRecordedLevel and lastRecordedSeason are null.";
  }

  return {
    ...journey,
    debug: {
      upstreamBytes,
      missingFields,
      careerStopsCount: journey.careerStops.length,
      derivedExplanation,
      nextGameMatchReason: nextGameResult.matchReason,
      nextGameCandidates: nextGameResult.candidates,
    },
  };
}

export function transformFixtureToJourney(fixturePath: string): { journey: PlayerJourneyResponse; upstreamBytes: number } {
  const raw = fs.readFileSync(fixturePath, "utf-8");
  const upstreamBytes = Buffer.byteLength(raw, "utf-8");
  const upstream = JSON.parse(raw);
  return transformUpstreamToJourney(upstream, upstreamBytes);
}
