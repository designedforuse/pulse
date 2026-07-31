// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import * as fs7 from "node:fs";
import * as path7 from "node:path";
import { execFile } from "node:child_process";

// scripts/updateCricket.ts
var CRICAPI_BASE = "https://api.cricapi.com/v1";
var CRICKET_DURATION_MIN = {
  t20: 210,
  odi: 480,
  // A Test is scheduled over 5 days. It is split into one event per day (see
  // splitTestMatchDays), so this base duration is only a placeholder for the
  // un-split event before expansion.
  test: 5 * 24 * 60
};
var TEST_DAY_DURATION_MIN = 8 * 60;
var ALLOWED_DOMESTIC_LEAGUES = {
  ipl: { league: "IPL", country: "India" },
  "indian premier league": { league: "IPL", country: "India" },
  bbl: { league: "BBL", country: "Australia" },
  "super smash": { league: "Super Smash", country: "New Zealand" },
  sa20: { league: "SA20", country: "South Africa" },
  mlc: { league: "MLC", country: "United States" },
  "major league cricket": { league: "MLC", country: "United States" },
  cpl: { league: "CPL", country: "Caribbean" },
  "caribbean premier league": { league: "CPL", country: "Caribbean" }
};
var INTERNATIONAL_KEYWORDS = [
  "icc",
  "world cup",
  "world test championship",
  "champions trophy",
  "tour of",
  "trophy",
  "test series",
  "odi series",
  "t20i series",
  "bilateral"
];
var VENUE_COUNTRY_MAP = {
  mumbai: "India",
  delhi: "India",
  kolkata: "India",
  chennai: "India",
  bangalore: "India",
  bengaluru: "India",
  hyderabad: "India",
  ahmedabad: "India",
  mohali: "India",
  jaipur: "India",
  lucknow: "India",
  pune: "India",
  dharamsala: "India",
  guwahati: "India",
  ranchi: "India",
  indore: "India",
  nagpur: "India",
  visakhapatnam: "India",
  thiruvananthapuram: "India",
  rajkot: "India",
  cuttack: "India",
  kanpur: "India",
  "wankhede": "India",
  "eden gardens": "India",
  "m. chinnaswamy": "India",
  "narendra modi": "India",
  sydney: "Australia",
  melbourne: "Australia",
  brisbane: "Australia",
  adelaide: "Australia",
  perth: "Australia",
  hobart: "Australia",
  canberra: "Australia",
  london: "England",
  birmingham: "England",
  manchester: "England",
  leeds: "England",
  nottingham: "England",
  southampton: "England",
  lords: "England",
  "the oval": "England",
  "lord's": "England",
  trent: "England",
  headingley: "England",
  edgbaston: "England",
  chester: "England",
  "old trafford": "England",
  cape: "South Africa",
  johannesburg: "South Africa",
  durban: "South Africa",
  centurion: "South Africa",
  pretoria: "South Africa",
  port: "South Africa",
  bloemfontein: "South Africa",
  potchefstroom: "South Africa",
  paarl: "South Africa",
  kimberley: "South Africa",
  benoni: "South Africa",
  newlands: "South Africa",
  wanderers: "South Africa",
  auckland: "New Zealand",
  wellington: "New Zealand",
  christchurch: "New Zealand",
  hamilton: "New Zealand",
  napier: "New Zealand",
  dunedin: "New Zealand",
  "basin reserve": "New Zealand",
  seddon: "New Zealand",
  colombo: "Sri Lanka",
  kandy: "Sri Lanka",
  galle: "Sri Lanka",
  dambulla: "Sri Lanka",
  pallekele: "Sri Lanka",
  hambantota: "Sri Lanka",
  lahore: "Pakistan",
  karachi: "Pakistan",
  rawalpindi: "Pakistan",
  multan: "Pakistan",
  faisalabad: "Pakistan",
  dhaka: "Bangladesh",
  chittagong: "Bangladesh",
  sylhet: "Bangladesh",
  mirpur: "Bangladesh",
  harare: "Zimbabwe",
  bulawayo: "Zimbabwe",
  "queen's park": "Caribbean",
  "sabina park": "Caribbean",
  kingston: "Caribbean",
  bridgetown: "Caribbean",
  trinidad: "Caribbean",
  barbados: "Caribbean",
  antigua: "Caribbean",
  grenada: "Caribbean",
  "warner park": "Caribbean",
  lauderhill: "United States",
  dallas: "United States",
  "grand prairie": "United States",
  "nassau county": "United States",
  morrisville: "United States"
};
var NATIONAL_TEAMS = /* @__PURE__ */ new Set([
  "india",
  "australia",
  "england",
  "south africa",
  "new zealand",
  "pakistan",
  "sri lanka",
  "bangladesh",
  "west indies",
  "zimbabwe",
  "afghanistan",
  "ireland",
  "scotland",
  "netherlands",
  "namibia",
  "nepal",
  "oman",
  "uae",
  "usa",
  "canada",
  "papua new guinea",
  "uganda",
  "united arab emirates",
  "united states",
  "united states of america"
]);
var STRONG_WOMEN_MARKERS = [
  "women",
  "womens",
  "women's",
  "woman",
  "wpl",
  "wbbl",
  "wt20",
  "wt20i",
  "w-odi",
  "wodi",
  "w-t20",
  "w-t20i",
  "w t20",
  "w t20i",
  "the hundred women",
  "women's hundred",
  "icc women's",
  "icc womens",
  "w championship",
  "w-"
];
function inferCricketGender(match, classification) {
  const parts = [
    match.name,
    classification.seriesName,
    classification.league,
    match.category || "",
    match.gender || ""
  ];
  const searchStr = parts.join(" ").toLowerCase();
  for (const token of STRONG_WOMEN_MARKERS) {
    if (searchStr.includes(token)) return "women";
  }
  if (match.teams?.some(
    (t) => / women$/i.test(t) || / women /i.test(t) || / women's$/i.test(t) || /\bwomen\b/i.test(t)
  )) {
    return "women";
  }
  return "men";
}
function parseSeriesName(matchName) {
  const parts = matchName.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    return parts.slice(1).join(", ");
  }
  return matchName;
}
var ICC_T20_WC_KEYWORDS = [
  "icc t20 world cup",
  "t20 world cup",
  "icc men's t20 world cup",
  "icc mens t20 world cup",
  "t20wc"
];
var MAJOR_ICC_TOURNAMENT_KEYWORDS = [
  "t20 world cup",
  "t20 wc",
  "t20wc",
  "icc t20",
  "icc men's t20",
  "icc mens t20",
  "icc men's t20 world cup",
  "icc mens t20 world cup",
  "world cup t20",
  "odi world cup",
  "cricket world cup",
  "champions trophy",
  "icc champions trophy",
  "world test championship"
];
var ICC_T20_WC_SERIES_IDS = /* @__PURE__ */ new Set();
var NON_TARGET_EXCLUSIONS = [
  "u19",
  "under-19",
  "under 19",
  "warm up",
  "warm-up",
  "practice",
  "friendly"
];
function isNonTargetMatch(match, seriesName) {
  const searchStr = [match.name, seriesName, match.category || ""].join(" ").toLowerCase();
  return NON_TARGET_EXCLUSIONS.some((kw) => searchStr.includes(kw));
}
function isIccT20WorldCup(match, seriesName) {
  const searchStr = [match.name, seriesName].join(" ").toLowerCase();
  if (ICC_T20_WC_KEYWORDS.some((kw) => searchStr.includes(kw))) return true;
  if (match.series_id && ICC_T20_WC_SERIES_IDS.has(match.series_id)) return true;
  return false;
}
function isMajorIccTournament(match, seriesName) {
  const searchStr = [match.name, seriesName, match.category || ""].join(" ").toLowerCase();
  return MAJOR_ICC_TOURNAMENT_KEYWORDS.some((kw) => searchStr.includes(kw));
}
function classifyMatch(match) {
  const nameLower = match.name.toLowerCase();
  const seriesName = parseSeriesName(match.name);
  const seriesLower = seriesName.toLowerCase();
  if (isNonTargetMatch(match, seriesName)) {
    return { type: "skip", league: "", country: "", seriesName, isIccT20Wc: false };
  }
  const t20Wc = isIccT20WorldCup(match, seriesName);
  if (t20Wc) {
    if (match.series_id && !ICC_T20_WC_SERIES_IDS.has(match.series_id)) {
      ICC_T20_WC_SERIES_IDS.add(match.series_id);
      console.log(`  Cricket: Discovered ICC T20 WC series_id: ${match.series_id}`);
    }
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: "ICC",
      country,
      seriesName,
      isIccT20Wc: true
    };
  }
  if (isMajorIccTournament(match, seriesName)) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: "ICC",
      country,
      seriesName,
      isIccT20Wc: false
    };
  }
  for (const [key, info] of Object.entries(ALLOWED_DOMESTIC_LEAGUES)) {
    if (nameLower.includes(key) || seriesLower.includes(key)) {
      return {
        type: "domestic",
        league: info.league,
        country: info.country,
        seriesName,
        isIccT20Wc: false
      };
    }
  }
  const isInternational = INTERNATIONAL_KEYWORDS.some((kw) => seriesLower.includes(kw));
  if (isInternational) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: classifyInternationalLeague(resolveMatchType(match), seriesName),
      country,
      seriesName,
      isIccT20Wc: false
    };
  }
  const teamsLower = match.teams.map((t) => t.toLowerCase());
  const bothNational = teamsLower.every((t) => NATIONAL_TEAMS.has(t));
  if (bothNational) {
    const country = resolveHostCountry(match.venue, match.teams);
    return {
      type: "international",
      league: classifyInternationalLeague(resolveMatchType(match), seriesName),
      country,
      seriesName,
      isIccT20Wc: false
    };
  }
  return { type: "skip", league: "", country: "", seriesName, isIccT20Wc: false };
}
function resolveMatchType(match) {
  const raw = (match.matchType || "").trim().toLowerCase();
  if (raw) return raw;
  const hay = (match.name || "").toLowerCase();
  if (/\btest\b/.test(hay)) return "test";
  if (/\bt20i?\b|\btwenty[- ]?20\b/.test(hay)) return "t20";
  if (/\bodi\b|\bone[- ]day\b/.test(hay)) return "odi";
  return "";
}
function classifyInternationalLeague(matchType, seriesName) {
  const lower = seriesName.toLowerCase();
  if (lower.includes("world cup") || lower.includes("icc") || lower.includes("champions trophy")) {
    return "ICC";
  }
  switch (matchType) {
    case "test":
      return "Test Cricket";
    case "odi":
      return "ODI Cricket";
    case "t20":
    case "t20i":
      return "T20I Cricket";
    default:
      return "International Cricket";
  }
}
function resolveHostCountry(venue, teams) {
  const venueLower = venue.toLowerCase();
  for (const [key, country] of Object.entries(VENUE_COUNTRY_MAP)) {
    if (venueLower.includes(key)) {
      return country;
    }
  }
  if (teams.length >= 2) {
    const home = teams[1]?.toLowerCase() || "";
    if (NATIONAL_TEAMS.has(home)) {
      const countryMap = {
        india: "India",
        australia: "Australia",
        england: "England",
        "south africa": "South Africa",
        "new zealand": "New Zealand",
        pakistan: "Pakistan",
        "sri lanka": "Sri Lanka",
        bangladesh: "Bangladesh",
        "west indies": "Caribbean",
        zimbabwe: "Zimbabwe",
        afghanistan: "Afghanistan",
        ireland: "Ireland",
        usa: "United States",
        "united states": "United States"
      };
      const mapped = countryMap[home];
      if (mapped) return mapped;
    }
  }
  return "Unknown";
}
async function fetchMatchesPage(apiKey, offset) {
  const url = `${CRICAPI_BASE}/matches?apikey=${apiKey}&offset=${offset}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  CricAPI HTTP ${res.status}: ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    if (data.status !== "success") {
      console.error(`  CricAPI status: ${data.status}`);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`  CricAPI fetch error: ${err.message}`);
    return null;
  }
}
async function fetchRawCricketMatches(limit = 50) {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return [];
  const allMatches = [];
  let offset = 0;
  let pagesRead = 0;
  const MAX_PAGES = 20;
  while (pagesRead < MAX_PAGES) {
    const page = await fetchMatchesPage(apiKey, offset);
    if (!page || !page.data || page.data.length === 0) break;
    allMatches.push(...page.data);
    pagesRead++;
    if (allMatches.length >= page.info.totalRows) break;
    offset += page.data.length;
    await new Promise((r) => setTimeout(r, 200));
  }
  const results = [];
  for (const match of allMatches.slice(0, limit)) {
    const seriesName = parseSeriesName(match.name);
    const classification = classifyMatch(match);
    const gender = classification.type !== "skip" ? inferCricketGender(match, classification) : inferCricketGender(match, { league: "", type: "skip", seriesName });
    let includeReason = "";
    let excludedReason = "";
    if (classification.type === "skip") {
      const sn = parseSeriesName(match.name);
      excludedReason = isNonTargetMatch(match, sn) ? "non-target (u19/warmup/practice/friendly)" : "not international or allowed domestic league";
    } else if (gender === "women") {
      excludedReason = "inferred women's cricket";
    } else {
      if (classification.isIccT20Wc) {
        includeReason = "ICC T20 World Cup match";
      } else if (isMajorIccTournament(match, seriesName)) {
        includeReason = "major ICC tournament";
      } else if (classification.type === "international") {
        includeReason = "international match";
      } else {
        includeReason = `domestic league: ${classification.league}`;
      }
    }
    results.push({
      id: match.id,
      competitionName: classification.league || "(none)",
      seriesName,
      matchName: match.name,
      teams: match.teams || [],
      startTime: match.dateTimeGMT || match.date,
      matchType: resolveMatchType(match),
      venue: match.venue || "",
      isInternational: classification.type === "international",
      inferredGender: gender,
      includeReason,
      excludedReason
    });
  }
  return results;
}
async function searchRawCricketMatches(query) {
  const all = await fetchRawCricketMatches(500);
  const q = query.toLowerCase();
  return all.filter(
    (m) => m.competitionName.toLowerCase().includes(q) || m.seriesName.toLowerCase().includes(q) || m.matchName.toLowerCase().includes(q) || m.teams.some((t) => t.toLowerCase().includes(q))
  );
}

// server/playerJourney.ts
import * as fs from "node:fs";
import * as path from "node:path";
function formatSeasonLabel(season) {
  const str = String(season);
  if (str.length !== 8) return str;
  const startYear = str.slice(0, 4);
  const endYear = str.slice(6, 8);
  return `${startYear}-${endYear}`;
}
var NHL_TEAM_ABBREV_MAP = {
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
  MTL: ["Montreal Canadiens", "Canadiens", "Montr\xE9al Canadiens"],
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
  WPG: ["Winnipeg Jets", "Jets"]
};
var AHL_TEAM_NAME_MAP = {
  "San Diego Gulls": ["Gulls", "SD Gulls"],
  "Bakersfield Condors": ["Condors"],
  "Charlotte Checkers": ["Checkers"],
  "Grand Rapids Griffins": ["Griffins"],
  "Providence Bruins": ["P-Bruins"],
  "Wilkes-Barre/Scranton Penguins": ["WBS Penguins", "WB/S Penguins"],
  "Chicago Wolves": ["Wolves"],
  "San Antonio Rampage": ["Rampage"],
  "Toronto Marlies": ["Marlies"]
};
function normalizeTeamName(s) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function teamMatchesAbbrev(eventTeam, abbrev) {
  const names = NHL_TEAM_ABBREV_MAP[abbrev];
  if (!names) return false;
  const norm2 = normalizeTeamName(eventTeam);
  return names.some((n) => normalizeTeamName(n) === norm2 || norm2.includes(normalizeTeamName(n)));
}
function teamMatchesName(eventTeam, teamName) {
  const normEvent = normalizeTeamName(eventTeam);
  const normTarget = normalizeTeamName(teamName);
  if (normEvent === normTarget || normEvent.includes(normTarget) || normTarget.includes(normEvent)) return true;
  const ahlAliases = AHL_TEAM_NAME_MAP[teamName];
  if (ahlAliases) {
    return ahlAliases.some((a) => normalizeTeamName(a) === normEvent || normEvent.includes(normalizeTeamName(a)));
  }
  return false;
}
function checkMissingFields(response) {
  const missing = [];
  if (!response.profile.playerId) missing.push("profile.playerId");
  if (!response.profile.fullName) missing.push("profile.fullName");
  if (!response.profile.position) missing.push("profile.position");
  if (response.profile.isActive === void 0 || response.profile.isActive === null) missing.push("profile.isActive");
  if (!response.profile.currentTeamAbbrev) missing.push("profile.currentTeamAbbrev");
  if (!response.derived.lastRecordedLevel) missing.push("derived.lastRecordedLevel");
  if (!response.derived.lastRecordedSeason) missing.push("derived.lastRecordedSeason");
  if (response.careerStops.length > 0) {
    const first = response.careerStops[0];
    if (!first.season) missing.push("careerStops[0].season");
    if (!first.seasonLabel) missing.push("careerStops[0].seasonLabel");
    if (!first.leagueAbbrev) missing.push("careerStops[0].leagueAbbrev");
    if (!first.teamName) missing.push("careerStops[0].teamName");
    if (first.gamesPlayed === void 0 || first.gamesPlayed === null) missing.push("careerStops[0].gamesPlayed");
    if (!first.phase) missing.push("careerStops[0].phase");
  }
  return missing;
}
function determinePhase(entry, allEntries, index) {
  if (entry.gameTypeId !== void 0 && entry.gameTypeId !== null) {
    if (entry.gameTypeId === 2) return "REG";
    if (entry.gameTypeId === 3) return "PO";
    return "UNK";
  }
  for (let i = 0; i < index; i++) {
    const prev = allEntries[i];
    if (prev.season === entry.season && prev.leagueAbbrev === entry.leagueAbbrev && (prev.teamName?.default || prev.teamName) === (entry.teamName?.default || entry.teamName)) {
      const prevGP = prev.gamesPlayed ?? 0;
      const curGP = entry.gamesPlayed ?? 0;
      if (curGP <= prevGP) return "PO";
      return "UNK";
    }
  }
  return "UNK";
}
function transformUpstreamToJourney(upstream, upstreamBytes) {
  const firstName = upstream.firstName?.default ?? "";
  const lastName = upstream.lastName?.default ?? "";
  const profile = {
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
    draftDetails: upstream.draftDetails ? {
      year: upstream.draftDetails.year,
      round: upstream.draftDetails.round,
      pickOverall: upstream.draftDetails.pickOverall,
      team: upstream.draftDetails.teamAbbrev
    } : null
  };
  const seasonTotals = upstream.seasonTotals ?? [];
  const careerStops = seasonTotals.map((entry, idx) => {
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
      phase
    };
  });
  const TARGET_LEAGUES = ["NHL", "AHL", "ECHL"];
  let lastRecordedLevel = null;
  let lastRecordedSeason = null;
  for (let i = careerStops.length - 1; i >= 0; i--) {
    if (TARGET_LEAGUES.includes(careerStops[i].leagueAbbrev)) {
      lastRecordedLevel = careerStops[i].leagueAbbrev;
      lastRecordedSeason = careerStops[i].seasonLabel;
      break;
    }
  }
  const leaguesPlayed = [...new Set(careerStops.map((s) => s.leagueAbbrev))];
  const teamsPlayed = [...new Set(careerStops.map((s) => s.teamName))];
  const nhlStops = careerStops.filter((s) => s.leagueAbbrev === "NHL" && s.phase === "REG");
  const nhlDebut = nhlStops.length > 0 ? nhlStops[0].seasonLabel : null;
  const totalNhlGames = careerStops.filter((s) => s.leagueAbbrev === "NHL").reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalAhlGames = careerStops.filter((s) => s.leagueAbbrev === "AHL").reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalEchlGames = careerStops.filter((s) => s.leagueAbbrev === "ECHL").reduce((sum, s) => sum + s.gamesPlayed, 0);
  const journey = {
    upstreamSource: "nhl-api-web",
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    profile,
    careerStops,
    derived: {
      lastRecordedLevel,
      lastRecordedSeason
    },
    summary: {
      leaguesPlayed,
      teamsPlayed,
      nhlDebut,
      totalNhlGames,
      totalAhlGames,
      totalEchlGames
    },
    nextGame: null
  };
  return { journey, upstreamBytes };
}
function loadGeneratedEvents() {
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
function findNextGame(profile, lastRecordedLevel) {
  const events = loadGeneratedEvents();
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.startTimeLocal).getTime() >= now).sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
  const teamAbbrev = profile.currentTeamAbbrev;
  const teamName = profile.currentTeamName;
  let matchedEvents = [];
  let matchReason = "no_match";
  if (teamAbbrev) {
    matchedEvents = upcoming.filter(
      (e) => teamMatchesAbbrev(e.homeTeam, teamAbbrev) || teamMatchesAbbrev(e.awayTeam, teamAbbrev)
    );
    if (matchedEvents.length > 0) {
      matchReason = `matched_by_teamAbbrev:${teamAbbrev}`;
    }
  }
  if (matchedEvents.length === 0 && teamName) {
    matchedEvents = upcoming.filter(
      (e) => teamMatchesName(e.homeTeam, teamName) || teamMatchesName(e.awayTeam, teamName)
    );
    if (matchedEvents.length > 0) {
      matchReason = `matched_by_teamName:${teamName}`;
    }
  }
  if (matchedEvents.length === 0 && lastRecordedLevel === "AHL") {
    const lastTeamFromStops = findLastTeamForLevel(profile, "AHL");
    if (lastTeamFromStops) {
      matchedEvents = upcoming.filter(
        (e) => teamMatchesName(e.homeTeam, lastTeamFromStops) || teamMatchesName(e.awayTeam, lastTeamFromStops)
      );
      if (matchedEvents.length > 0) {
        matchReason = `matched_by_ahlTeamName:${lastTeamFromStops}`;
      }
    }
  }
  const candidates = matchedEvents.slice(0, 3).map((e) => ({
    id: e.id ?? "",
    homeTeam: e.homeTeam ?? "",
    awayTeam: e.awayTeam ?? "",
    league: e.league ?? "",
    startTime: e.startTimeLocal ?? ""
  }));
  return {
    matched: candidates.length > 0 ? candidates[0] : null,
    matchReason,
    candidates
  };
}
function findLastTeamForLevel(_profile, _level) {
  return null;
}
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 10 * 60 * 1e3;
async function fetchPlayerJourney(playerId) {
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
async function fetchPlayerJourneyDebug(playerId) {
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
      nextGameCandidates: nextGameResult.candidates
    }
  };
}

// server/liveScores.ts
import * as fs3 from "node:fs";
import * as path3 from "node:path";

// server/marathonLeader.ts
var MARATHON_RACES = {
  "athletics-marathon-boston-marathon": {
    eventIdPrefix: "athletics-marathon-boston-marathon",
    baseUrl: "https://results.baa.org/2026",
    label: "Boston"
  }
};
var CACHE = /* @__PURE__ */ new Map();
var CACHE_TTL_MS2 = 60 * 1e3;
function flipName(fullName) {
  if (!fullName) return "";
  const parts = fullName.split(",").map((p) => p.trim());
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  return fullName;
}
function normalizeSplitLabel(name) {
  if (!name) return "";
  const upper = name.toUpperCase();
  if (upper === "HALF") return "Half";
  if (upper === "FINISH") return "Finish";
  return name;
}
async function fetchBostonLeader(baseUrl) {
  const url = `${baseUrl}/?content=ajax2&func=getLeaderboard`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Pulse Sports App)",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(1e4)
  });
  if (!res.ok) return null;
  const data = await res.json();
  const containers = Array.isArray(data?.containers) ? data.containers : [];
  const menContainer = containers.find(
    (c) => typeof c?.title === "string" && /top\s+men/i.test(c.title)
  );
  if (!menContainer) return null;
  const rows = menContainer?.data?.rows;
  const subSelector = menContainer?.data?.sub_selector;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let latestIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (Array.isArray(row) && row[0]?.__fullname && row[0]?.actual_split_time) {
      latestIdx = i;
      break;
    }
  }
  if (latestIdx < 0) return null;
  const leaderboard = rows[latestIdx];
  const leader = leaderboard[0];
  const runnerUp = leaderboard[1];
  if (!leader?.__fullname) return null;
  const splitName = Array.isArray(subSelector) && subSelector[latestIdx]?.name ? String(subSelector[latestIdx].name) : "";
  const splitLabel = normalizeSplitLabel(splitName);
  const leaderName = flipName(leader.__fullname);
  const splitTime = String(leader.actual_split_time || "").trim();
  let leadGap = "";
  if (runnerUp?.diff_time) {
    leadGap = String(runnerUp.diff_time).replace(/^\+/, "");
    if (leadGap === "00:00") leadGap = "";
  }
  const isFinished = splitLabel.toLowerCase() === "finish";
  return {
    awayScore: 0,
    homeScore: 0,
    marathonLeader: leaderName,
    marathonLeaderSplit: splitLabel,
    marathonLeaderSplitTime: splitTime,
    marathonLeaderGap: leadGap,
    marathonRaceStatus: isFinished ? "finished" : "active"
  };
}
async function fetchMarathonLeaderScores(eventIds) {
  const out = {};
  if (eventIds.length === 0) return out;
  for (const eventId of eventIds) {
    const config = MARATHON_RACES[eventId];
    if (!config) continue;
    const cached = CACHE.get(eventId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS2) {
      if (cached.data) out[eventId] = cached.data;
      continue;
    }
    try {
      const data = await fetchBostonLeader(config.baseUrl);
      CACHE.set(eventId, { ts: Date.now(), data });
      if (data) out[eventId] = data;
    } catch (err) {
      console.error(`[marathonLeader] ${config.label} fetch failed:`, err);
      CACHE.set(eventId, { ts: Date.now(), data: null });
    }
  }
  return out;
}

// server/cyclingLeader.ts
import fs2 from "fs";
import path2 from "path";

// server/giroScraper.ts
var GIRO_URL = "https://www.giroditalia.it/classifiche/";
var CACHE_TTL_MS3 = 5 * 60 * 1e3;
var FETCH_TIMEOUT_MS = 8e3;
var cache2 = { data: null, ts: 0 };
var inflight = null;
function parseMagliaRosa(html) {
  const anchorRe = /<a[^>]*data-tab="tab-classifica-CLGEN"[^>]*>([\s\S]*?)<\/a>/i;
  const anchorMatch = html.match(anchorRe);
  if (!anchorMatch) return null;
  const block = anchorMatch[1];
  const nameMatch = block.match(/<h5[^>]*>([^<]+)<\/h5>/i);
  const teamMatch = block.match(/<div[^>]*class="[^"]*p-4[^"]*"[^>]*>([^<]+)<\/div>/i);
  const rider = nameMatch?.[1]?.trim();
  const team = teamMatch?.[1]?.trim();
  if (!rider) return null;
  return { rider, team: team || "" };
}
async function fetchGiroLeaderUncached() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(GIRO_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PulseSports/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: ctrl.signal
    });
    if (!res.ok) {
      console.warn(`[giroScraper] HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const parsed = parseMagliaRosa(html);
    if (!parsed) {
      console.warn("[giroScraper] could not parse maglia rosa block");
    } else {
      console.log(`[giroScraper] maglia rosa: ${parsed.rider} (${parsed.team})`);
    }
    return parsed;
  } catch (err) {
    console.warn("[giroScraper] fetch error:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function getGiroLeader() {
  const age = Date.now() - cache2.ts;
  if (cache2.ts > 0 && age < CACHE_TTL_MS3) return cache2.data;
  if (inflight) return inflight;
  inflight = (async () => {
    const result = await fetchGiroLeaderUncached();
    cache2 = { data: result ?? cache2.data, ts: Date.now() };
    inflight = null;
    return cache2.data;
  })();
  return inflight;
}
var GIRO_EVENT_PREFIX = "cycling-grand-tour-giro-d-italia-";
function isGiroEventId(id) {
  return id.startsWith(GIRO_EVENT_PREFIX);
}
function extractGiroStageNumber(id) {
  const m = id.match(/-stage-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n - 1 : null;
}
function giroLeaderToScoreData(leader, stageNumber) {
  const score = { cyclingLeader: leader.rider };
  if (leader.team) score.cyclingLeaderTeam = leader.team;
  if (stageNumber !== null) score.cyclingStageNumber = stageNumber;
  return score;
}

// server/cyclingLeader.ts
var OVERRIDES_PATH = path2.resolve(process.cwd(), "data", "cyclingLeader.json");
var CACHE2 = null;
function loadOverrides() {
  let stat;
  try {
    stat = fs2.statSync(OVERRIDES_PATH);
  } catch {
    return {};
  }
  if (CACHE2 && CACHE2.mtimeMs === stat.mtimeMs) return CACHE2.data;
  let parsed;
  try {
    parsed = JSON.parse(fs2.readFileSync(OVERRIDES_PATH, "utf-8"));
  } catch (err) {
    console.error("[cyclingLeader] failed to parse overrides:", err);
    return {};
  }
  const out = {};
  for (const entry of parsed.leaders || []) {
    if (!entry.eventId || !entry.rider || !entry.rider.trim()) continue;
    const score = {
      cyclingLeader: entry.rider.trim()
    };
    if (entry.team && entry.team.trim()) score.cyclingLeaderTeam = entry.team.trim();
    if (entry.country && entry.country.trim()) score.cyclingLeaderCountry = entry.country.trim();
    if (entry.gap && entry.gap.trim()) score.cyclingLeaderGap = entry.gap.trim();
    if (typeof entry.stageNumber === "number") score.cyclingStageNumber = entry.stageNumber;
    out[entry.eventId] = score;
  }
  CACHE2 = { mtimeMs: stat.mtimeMs, data: out };
  return out;
}
function lookupOverride(id, overrides, overrideKeys) {
  if (overrides[id]) return overrides[id];
  const prefixMatch = overrideKeys.find((k) => id.startsWith(k + "-") || id === k);
  return prefixMatch ? overrides[prefixMatch] : null;
}
async function fetchCyclingLeaderScores(eventIds) {
  if (eventIds.length === 0) return {};
  const overrides = loadOverrides();
  const overrideKeys = Object.keys(overrides);
  const hasGiro = eventIds.some(isGiroEventId);
  const giroLeader = hasGiro ? await getGiroLeader().catch(() => null) : null;
  const out = {};
  for (const id of eventIds) {
    if (isGiroEventId(id) && giroLeader) {
      out[id] = giroLeaderToScoreData(giroLeader, extractGiroStageNumber(id));
      continue;
    }
    const fallback = lookupOverride(id, overrides, overrideKeys);
    if (fallback) out[id] = fallback;
  }
  return out;
}

// server/schoolsRugbyScores.ts
var PAARL_SID = "456";
var RESULTS_URL = `http://www.schoolrugby.co.za/school.aspx?s=${PAARL_SID}`;
var CACHE_TTL_MS4 = 15 * 60 * 1e3;
var FETCH_TIMEOUT_MS2 = 9e3;
var cache3 = { results: [], ts: 0 };
var MONTHS = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12"
};
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function norm(s) {
  return decodeEntities(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
var STOPWORDS = /* @__PURE__ */ new Set([
  "boys",
  "girls",
  "high",
  "school",
  "hoer",
  "hoerskool",
  "seunskool",
  "college",
  "landbouskool",
  "rugby",
  "the",
  "of",
  "pta"
]);
function tokens(s) {
  return norm(s).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}
function opponentMatches(ourOpp, scrapedOpp) {
  const a = tokens(ourOpp);
  const b = new Set(tokens(scrapedOpp));
  return a.some((t) => b.has(t));
}
function parseResults(html) {
  const out = [];
  const tiles = html.split("ResultTile");
  for (const tile of tiles) {
    const yearM = tile.match(/class="rotate year">\s*(\d{4})/);
    const monthM = tile.match(/class="month">\s*([A-Za-z]{3})/);
    const dayM = tile.match(/class="day">\s*(\d{1,2})/);
    if (!yearM || !monthM || !dayM) continue;
    const mon = MONTHS[monthM[1].toUpperCase()];
    if (!mon) continue;
    const date = `${yearM[1]}-${mon}-${dayM[1].padStart(2, "0")}`;
    const matchupM = tile.match(
      /<a href='\/school\.aspx\?s=(\d+)'>([^<]+)<\/a>\s*(?:<strong>)?\s*(\d+)\s*(?:<\/strong>)?\s*[-\u2013]\s*(?:<strong>)?\s*(\d+)\s*(?:<\/strong>)?\s*<a href='\/school\.aspx\?s=(\d+)'>([^<]+)<\/a>/
    );
    if (!matchupM) continue;
    const [, sidA, nameA, scoreAStr, scoreBStr, sidB, nameB] = matchupM;
    const scoreA = parseInt(scoreAStr, 10);
    const scoreB = parseInt(scoreBStr, 10);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) continue;
    let paarlScore;
    let oppScore;
    let oppName;
    if (sidA === PAARL_SID) {
      paarlScore = scoreA;
      oppScore = scoreB;
      oppName = decodeEntities(nameB);
    } else if (sidB === PAARL_SID) {
      paarlScore = scoreB;
      oppScore = scoreA;
      oppName = decodeEntities(nameA);
    } else {
      continue;
    }
    out.push({ date, paarlScore, oppScore, oppName });
  }
  return out;
}
async function loadResults() {
  if (Date.now() - cache3.ts < CACHE_TTL_MS4 && cache3.results.length > 0) {
    return cache3.results;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS2);
  try {
    const res = await fetch(RESULTS_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });
    if (!res.ok) return cache3.results;
    const html = await res.text();
    const results = parseResults(html);
    if (results.length > 0) {
      cache3 = { results, ts: Date.now() };
    }
    return results.length > 0 ? results : cache3.results;
  } catch {
    return cache3.results;
  } finally {
    clearTimeout(timer);
  }
}
function candidateDates(startTimeLocal) {
  if (!startTimeLocal) return [];
  const t = new Date(startTimeLocal).getTime();
  if (Number.isNaN(t)) return [];
  const utc = new Date(t).toISOString().slice(0, 10);
  const sast = new Date(t + 2 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  return utc === sast ? [utc] : [utc, sast];
}
async function fetchSchoolsRugbyScores(events) {
  const scores = {};
  if (!events || events.length === 0) return scores;
  const results = await loadResults();
  if (results.length === 0) return scores;
  for (const event of events) {
    const dates = candidateDates(event.startTimeLocal);
    if (dates.length === 0) continue;
    let candidates = results.filter((r) => dates.includes(r.date));
    if (candidates.length === 0) continue;
    const opponent = norm(event.homeTeam).includes("paarl boys") ? event.awayTeam : event.homeTeam;
    if (candidates.length > 1) {
      candidates = candidates.filter((r) => opponentMatches(opponent, r.oppName));
      if (candidates.length !== 1) continue;
    }
    const result = candidates[0];
    const isPaarlHome = norm(event.homeTeam).includes("paarl boys");
    const homeScore = isPaarlHome ? result.paarlScore : result.oppScore;
    const awayScore = isPaarlHome ? result.oppScore : result.paarlScore;
    scores[event.id] = {
      awayScore,
      homeScore,
      status: "final",
      period: "FT"
    };
  }
  return scores;
}

// server/liveScores.ts
var GENERATED_EVENTS_PATH = path3.resolve(process.cwd(), "data", "generatedEvents.json");
function loadLiveEventIds() {
  const nhl = [];
  const ahl = [];
  const echl = [];
  const ncaa = [];
  const soccer = /* @__PURE__ */ new Map();
  const rugby = /* @__PURE__ */ new Map();
  const cricket = [];
  const tennis = [];
  const f1 = [];
  const nba = [];
  const ncaabBasketball = [];
  const golf = [];
  const mlb = [];
  const marathon = [];
  const cycling = [];
  try {
    const raw = fs3.readFileSync(GENERATED_EVENTS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const now = Date.now();
    for (const event of data.events || []) {
      const start = new Date(event.startTimeLocal).getTime();
      const sportDurations = {
        hockey: 165 * 60 * 1e3,
        soccer: 135 * 60 * 1e3,
        rugby: 135 * 60 * 1e3,
        cricket: 480 * 60 * 1e3,
        racing: 180 * 60 * 1e3,
        basketball: 165 * 60 * 1e3
      };
      const duration = sportDurations[event.sport] ?? 120 * 60 * 1e3;
      const end = start + duration;
      const lookbackMs = event.id.startsWith("cycling-grand-tour-") ? 25 * 24 * 60 * 60 * 1e3 : 18 * 60 * 60 * 1e3;
      if (now < start - 30 * 60 * 1e3 || now > start + lookbackMs) continue;
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
          startTime: event.startTimeLocal || ""
        });
      } else if (event.id.startsWith("soccer-")) {
        const league = event.league;
        if (!soccer.has(league)) soccer.set(league, []);
        soccer.get(league).push(event.id);
      } else if (event.id.startsWith("rugby-")) {
        const league = event.league;
        if (!rugby.has(league)) rugby.set(league, []);
        rugby.get(league).push({
          id: event.id,
          homeTeam: event.homeTeam || "",
          awayTeam: event.awayTeam || "",
          startTimeLocal: event.startTimeLocal || ""
        });
      } else if (event.id.startsWith("cricket-")) {
        cricket.push({
          id: event.id,
          homeTeam: event.homeTeam || "",
          awayTeam: event.awayTeam || "",
          cricketMatchId: event.cricketMatchId || void 0
        });
      } else if (event.id.startsWith("tennis-espn-")) {
        const espnId = event.id.replace("tennis-espn-", "");
        tennis.push({ id: event.id, espnId });
      } else if (event.id.startsWith("f1-espn-")) {
        const espnCompId = event.id.replace("f1-espn-", "");
        f1.push({ id: event.id, espnCompId, sessionTitle: event.sessionTitle || event.awayTeam || "" });
      } else if (event.id.startsWith("basketball-nba-")) {
        nba.push(event.id);
      } else if (event.id.startsWith("basketball-ncaab-")) {
        ncaabBasketball.push(event.id);
      } else if (event.id.startsWith("golf-")) {
        golf.push({ id: event.id, tournamentName: event.homeTeam || "" });
      } else if (event.id.startsWith("baseball-mlb-")) {
        mlb.push(event.id);
      } else if (event.id.startsWith("athletics-marathon-")) {
        marathon.push(event.id);
      } else if (event.id.startsWith("cycling-")) {
        cycling.push(event.id);
      }
    }
  } catch {
  }
  return { nhl, ahl, echl, ncaa, soccer, rugby, cricket, tennis, f1, nba, ncaabBasketball, golf, mlb, marathon, cycling };
}
async function fetchNhlSeriesStatuses() {
  const idMap = /* @__PURE__ */ new Map();
  try {
    const raw = fs3.readFileSync(GENERATED_EVENTS_PATH, "utf-8");
    const data = JSON.parse(raw);
    for (const ev of data.events || []) {
      if (typeof ev.id === "string" && ev.id.startsWith("nhl_")) {
        const num = parseInt(ev.id.replace("nhl_", ""), 10);
        if (Number.isFinite(num)) idMap.set(num, ev.id);
      }
    }
  } catch {
    return {};
  }
  if (idMap.size === 0) return {};
  const dates = [];
  const start = /* @__PURE__ */ new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const results = {};
  await Promise.all(dates.map(async (date) => {
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/score/${date}`);
      if (!res.ok) return;
      const data = await res.json();
      for (const game of data.games || []) {
        const ss = game.seriesStatus;
        if (!ss || !ss.topSeedTeamAbbrev || !ss.bottomSeedTeamAbbrev) continue;
        const eventId = idMap.get(game.id);
        if (!eventId) continue;
        const topW = ss.topSeedWins ?? 0;
        const botW = ss.bottomSeedWins ?? 0;
        let lastGameWinnerWins;
        let lastGameLoserWins;
        const state = game.gameState;
        const hs = game.homeTeam?.score;
        const as = game.awayTeam?.score;
        if ((state === "FINAL" || state === "OFF") && typeof hs === "number" && typeof as === "number" && hs !== as) {
          const winnerAbbrev = hs > as ? game.homeTeam?.abbrev : game.awayTeam?.abbrev;
          if (winnerAbbrev === ss.topSeedTeamAbbrev) {
            lastGameWinnerWins = topW;
            lastGameLoserWins = botW;
          } else if (winnerAbbrev === ss.bottomSeedTeamAbbrev) {
            lastGameWinnerWins = botW;
            lastGameLoserWins = topW;
          }
        }
        results[eventId] = {
          round: ss.round,
          seriesAbbrev: ss.seriesAbbrev,
          seriesTitle: ss.seriesTitle,
          topSeedTeamAbbrev: ss.topSeedTeamAbbrev,
          topSeedWins: topW,
          bottomSeedTeamAbbrev: ss.bottomSeedTeamAbbrev,
          bottomSeedWins: botW,
          gameNumberOfSeries: ss.gameNumberOfSeries,
          neededToWin: ss.neededToWin ?? 4,
          lastGameWinnerWins,
          lastGameLoserWins
        };
      }
    } catch (err) {
      console.error(`[liveScores] NHL series fetch error ${date}:`, err);
    }
  }));
  return results;
}
async function fetchHockeyTechSeriesStatuses(clientCode, key, eventIds) {
  const results = {};
  if (eventIds.length === 0) return results;
  const idMap = /* @__PURE__ */ new Map();
  for (const id of eventIds) {
    const numPart = id.replace(/^[a-z]+-(?:web-)?/i, "");
    idMap.set(numPart, id);
  }
  try {
    const url = `https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=brackets&key=${key}&client_code=${clientCode}&lang=en&fmt=json`;
    const res = await fetch(url);
    if (!res.ok) return results;
    let text = await res.text();
    text = text.replace(/^[^({]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(text);
    const br = data?.SiteKit?.Brackets;
    if (!br) return results;
    const teams = br.teams || {};
    const codeOf = (tid) => teams[tid]?.team_code || tid;
    for (const rd of br.rounds || []) {
      const roundNum = parseInt(rd.round || "0", 10) || void 0;
      for (const m of rd.matchups || []) {
        const t1 = String(m.team1 || "");
        const t2 = String(m.team2 || "");
        if (!t1 || !t2 || t1 === "0" || t2 === "0") continue;
        const games = Array.isArray(m.games) ? m.games : [];
        const sorted = [...games].sort((a, b) => {
          const da = a.GameDateISO8601 || a.date_time || "";
          const db = b.GameDateISO8601 || b.date_time || "";
          if (da !== db) return da < db ? -1 : 1;
          return parseInt(a.game_id || "0", 10) - parseInt(b.game_id || "0", 10);
        });
        const finals = sorted.filter((g) => String(g.status) === "4");
        let finalW1 = 0;
        let finalW2 = 0;
        for (const g of finals) {
          const hg = parseInt(g.home_goal_count || "0", 10);
          const vg = parseInt(g.visiting_goal_count || "0", 10);
          if (hg === vg) continue;
          const wTeam = hg > vg ? String(g.home_team) : String(g.visiting_team);
          if (wTeam === t1) finalW1++;
          else if (wTeam === t2) finalW2++;
        }
        const neededToWin = Math.max(
          Math.max(finalW1, finalW2),
          Math.floor(games.length / 2) + 1
        );
        let w1 = 0;
        let w2 = 0;
        let gameNum = 0;
        for (const g of finals) {
          const hg = parseInt(g.home_goal_count || "0", 10);
          const vg = parseInt(g.visiting_goal_count || "0", 10);
          if (hg === vg) continue;
          gameNum++;
          const homeWon = hg > vg;
          const wTeam = homeWon ? String(g.home_team) : String(g.visiting_team);
          if (wTeam === t1) w1++;
          else if (wTeam === t2) w2++;
          const eventId = idMap.get(String(g.game_id || ""));
          if (!eventId) continue;
          const winnerWins = wTeam === t1 ? w1 : w2;
          const loserWins = wTeam === t1 ? w2 : w1;
          results[eventId] = {
            round: roundNum,
            seriesTitle: (m.series_name || "").trim() || void 0,
            topSeedTeamAbbrev: codeOf(t1),
            topSeedWins: w1,
            bottomSeedTeamAbbrev: codeOf(t2),
            bottomSeedWins: w2,
            gameNumberOfSeries: gameNum,
            neededToWin,
            lastGameWinnerWins: winnerWins,
            lastGameLoserWins: loserWins
          };
        }
      }
    }
  } catch (err) {
    console.error(`[liveScores] ${clientCode} series fetch error:`, err);
  }
  return results;
}
async function fetchNhlScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const res = await fetch("https://api-web.nhle.com/v1/score/now");
    if (!res.ok) return scores;
    const data = await res.json();
    const gameIdMap = /* @__PURE__ */ new Map();
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
      let lastGoalTimeInPeriod;
      let lastGoalPeriod;
      let lastGoalStrength;
      let lastGoalTeam;
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
        situationCode: game.situationCode ?? void 0
      };
    }
  } catch (err) {
    console.error("[liveScores] NHL fetch error:", err);
  }
  return scores;
}
async function fetchAhlScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const url = "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&numberofdaysback=1&numberofdaysahead=1&key=ccb91f29d6744675&client_code=ahl&lang=en&fmt=json";
    const res = await fetch(url);
    if (!res.ok) return scores;
    let text = await res.text();
    text = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(text);
    const games = data.SiteKit?.Scorebar || [];
    const idMap = /* @__PURE__ */ new Map();
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
async function fetchEchlScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const url = "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&numberofdaysback=1&numberofdaysahead=1&key=2c2b89ea7345cae8&client_code=echl&lang=en&fmt=json";
    const res = await fetch(url);
    if (!res.ok) return scores;
    let text = await res.text();
    text = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(text);
    const games = data.SiteKit?.Scorebar || [];
    const idMap = /* @__PURE__ */ new Map();
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
var ESPN_LEAGUE_PATHS = {
  "EPL": "eng.1",
  "La Liga": "esp.1",
  "Serie A": "ita.1",
  "Bundesliga": "ger.1",
  "Ligue 1": "fra.1",
  "MLS": "usa.1",
  "NWSL": "usa.nwsl",
  "USL": "usa.usl.1",
  "Champions League": "uefa.champions",
  "Europa League": "uefa.europa",
  "FA Cup": "eng.fa",
  "CAF Champions League": "caf.champions",
  "International Friendly": "fifa.friendly",
  "FIFA World Cup": "fifa.world"
};
function parseShootoutScore(raw) {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}
async function fetchSoccerScores(soccerMap) {
  const scores = {};
  if (soccerMap.size === 0) return scores;
  const leaguesToFetch = /* @__PURE__ */ new Set();
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
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
      const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
      const allEspnEvents = [];
      for (const dateStr of [today, yesterday]) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnPath}/scoreboard?dates=${dateStr}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        allEspnEvents.push(...data.events || []);
      }
      for (const espnEvent of allEspnEvents) {
        const comp = espnEvent.competitions?.[0];
        if (!comp) continue;
        const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
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
              const periodNum = comp.status?.period || 0;
              let period = "Live";
              if (periodNum === 1) period = "H1";
              else if (periodNum === 2) period = "H2";
              else if (periodNum === 3) period = "ET1";
              else if (periodNum === 4) period = "ET2";
              else if (periodNum === 5) period = "PK";
              const shortDetail = (statusDetail || "").toLowerCase();
              if (shortDetail.includes("halftime") || shortDetail === "ht") period = "HT";
              const awaySO = parseShootoutScore(awayComp.shootoutScore);
              const homeSO = parseShootoutScore(homeComp.shootoutScore);
              scores[eventId] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                ...awaySO != null && homeSO != null ? { awayShootoutScore: awaySO, homeShootoutScore: homeSO } : {},
                period,
                clock,
                status: "live"
              };
            } else if (statusState === "post") {
              const awaySO = parseShootoutScore(awayComp.shootoutScore);
              const homeSO = parseShootoutScore(homeComp.shootoutScore);
              scores[eventId] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                ...awaySO != null && homeSO != null ? { awayShootoutScore: awaySO, homeShootoutScore: homeSO } : {},
                period: "Final",
                status: "final"
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
var ESPN_RUGBY_LEAGUE_PATHS = {
  "URC": "270557",
  "Top 14": "270559",
  "Six Nations": "180659",
  "English Premiership": "267979",
  "Champions Cup": "271937",
  "MLR": "289262",
  // International tests — same keyless ESPN feed used for the fixtures
  // (scripts/updateRugby.ts). Covers live + final scores for tier-1 tests.
  "Test Rugby": "289234"
};
var WR_API_BASE = "https://api.wr-rims-prod.pulselive.com/rugby/v3";
var PULSELIVE_RUGBY_EVENT_IDS = {
  "Super Rugby": "af9ef6cd-4a14-469d-83da-dd85b9882636",
  // Super Rugby Pacific 2026
  "URC": "3c5cab4f-1933-4181-8907-4bed6d2fd9c6",
  // URC 2026
  "Top 14": "d72547e0-d76e-4612-9f1c-a3f60d320074",
  // Top 14 2026
  "English Premiership": "65f66693-9ccb-4784-bc3c-7b5b3cabecc3",
  // English Premiership 2026
  "Champions Cup": "770bfb2a-2947-45fc-b54c-9afd2f14a9f5",
  // Investec Champions Cup 2026
  "Challenge Cup": "acd1f126-cea9-4723-9343-e3b4e8d806f4",
  // EPCR Challenge Cup 2026
  "MLR": "2c6f3289-6eca-4b4c-80b7-4adc26d86368",
  // MLR 2026
  "Six Nations": "b6832e99-0c73-4d56-ba57-725935c2f1dd"
  // 2026 Six Nations
};
var pulseliveScheduleCache = {};
var PULSELIVE_CACHE_TTL = 6e4;
var PULSELIVE_MATCH_WINDOW_MS = 18 * 60 * 60 * 1e3;
async function getPulseliveSchedule(eventId) {
  const now = Date.now();
  const cached = pulseliveScheduleCache[eventId];
  if (cached && now - cached.fetchedAt < PULSELIVE_CACHE_TTL) {
    return cached.matches;
  }
  try {
    const res = await fetch(
      `${WR_API_BASE}/event/${eventId}/schedule?language=en`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8e3) }
    );
    if (!res.ok) return cached?.matches ?? [];
    const data = await res.json();
    const matches = data.matches || [];
    pulseliveScheduleCache[eventId] = { matches, fetchedAt: now };
    return matches;
  } catch (err) {
    console.error(`[liveScores] Pulselive event ${eventId} fetch error:`, err);
    return cached?.matches ?? [];
  }
}
function pulseliveMatchToScore(wrMatch) {
  const status = wrMatch.status || "";
  const isLive = status.startsWith("L") && status !== "C";
  const isFinal = status === "C";
  if (!isLive && !isFinal) return null;
  if (isFinal) {
    return {
      homeScore: wrMatch.scores?.[0] ?? 0,
      awayScore: wrMatch.scores?.[1] ?? 0,
      period: "FT",
      status: "final"
    };
  }
  let period;
  if (/^L1$/i.test(status)) period = "H1";
  else if (/^L2$/i.test(status)) period = "H2";
  else if (/^LHT$/i.test(status)) period = "HT";
  else if (/^L3$/i.test(status)) period = "ET1";
  else if (/^L4$/i.test(status)) period = "ET2";
  const clockSecs = wrMatch.clock?.secs ?? 0;
  const clockMin = clockSecs > 0 ? `${Math.floor(clockSecs / 60)}'` : void 0;
  return {
    homeScore: wrMatch.scores?.[0] ?? 0,
    awayScore: wrMatch.scores?.[1] ?? 0,
    period,
    clock: clockMin,
    status: "live"
  };
}
var MLR_HOME = "https://www.majorleague.rugby";
var mlrBuildId = null;
var MLR_BUILD_ID_TTL = 6 * 60 * 60 * 1e3;
var mlrSlugList = null;
var MLR_SLUG_TTL = 6e4;
var mlrMatchCache = {};
var MLR_MATCH_TTL = 3e4;
async function getMlrBuildIdAndSlugs() {
  const now = Date.now();
  if (mlrBuildId && now - mlrBuildId.fetchedAt < MLR_BUILD_ID_TTL && mlrSlugList && now - mlrSlugList.fetchedAt < MLR_SLUG_TTL) {
    return { buildId: mlrBuildId.value, slugs: mlrSlugList.slugs };
  }
  try {
    const res = await fetch(MLR_HOME, {
      headers: { "User-Agent": "Mozilla/5.0 (PulseSportsApp)" },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return mlrBuildId && mlrSlugList ? { buildId: mlrBuildId.value, slugs: mlrSlugList.slugs } : null;
    const html = await res.text();
    const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
    const slugMatches = [...html.matchAll(/\/matches\/(season-\d+-major-league-rugby-\d+-[a-z0-9-]+-vs-[a-z0-9-]+)/g)];
    const slugs = [...new Set(slugMatches.map((m) => m[1]))];
    if (!buildIdMatch) return null;
    mlrBuildId = { value: buildIdMatch[1], fetchedAt: now };
    mlrSlugList = { slugs, fetchedAt: now };
    return { buildId: buildIdMatch[1], slugs };
  } catch (err) {
    console.error("[liveScores] MLR homepage fetch error:", err);
    return mlrBuildId && mlrSlugList ? { buildId: mlrBuildId.value, slugs: mlrSlugList.slugs } : null;
  }
}
async function getMlrMatchData(buildId, slug) {
  const now = Date.now();
  const cached = mlrMatchCache[slug];
  if (cached && now - cached.fetchedAt < MLR_MATCH_TTL) {
    return cached.data;
  }
  try {
    const res = await fetch(
      `${MLR_HOME}/_next/data/${buildId}/matches/${slug}.json`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8e3) }
    );
    if (!res.ok) return cached?.data ?? null;
    const json = await res.json();
    const game = json?.pageProps?.data?.game;
    if (!game) return cached?.data ?? null;
    mlrMatchCache[slug] = { data: game, fetchedAt: now };
    return game;
  } catch (err) {
    console.error(`[liveScores] MLR match ${slug} fetch error:`, err);
    return cached?.data ?? null;
  }
}
function mlrGameToScore(game) {
  const periodType = game?.period?.type || "";
  const periodShort = game?.period?.shortName || "";
  const homeScore = Number(game?.homeScore ?? 0);
  const awayScore = Number(game?.awayScore ?? 0);
  const gameTime = game?.gameTime != null ? Number(game.gameTime) : null;
  if (periodType === "PostMatch") {
    return { homeScore, awayScore, period: "FT", status: "final" };
  }
  let period;
  if (periodType === "FirstHalf") period = "H1";
  else if (periodType === "HalfTime") period = "HT";
  else if (periodType === "SecondHalf") period = "H2";
  else if (periodType === "ExtraTimeFirstHalf") period = "ET1";
  else if (periodType === "ExtraTimeSecondHalf") period = "ET2";
  else if (periodShort && periodShort !== "PreMatch") period = periodShort;
  else return null;
  const clock = gameTime != null && gameTime > 0 ? `${gameTime}'` : void 0;
  return { homeScore, awayScore, period, clock, status: "live" };
}
function teamSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchMlrOfficialScores(mlrEvents) {
  const scores = {};
  if (!mlrEvents || mlrEvents.length === 0) return scores;
  const ctx = await getMlrBuildIdAndSlugs();
  if (!ctx) return scores;
  let matched = 0;
  for (const ev of mlrEvents) {
    const homeS = teamSlug(ev.homeTeam);
    const awayS = teamSlug(ev.awayTeam);
    const slug = ctx.slugs.find((s) => {
      const m = s.match(/-vs-(.+)$/);
      if (!m) return false;
      const fullLower = s;
      return fullLower.includes(`-${homeS}-vs-`) && fullLower.endsWith(`-vs-${awayS}`) || fullLower.includes(`-${awayS}-vs-`) && fullLower.endsWith(`-vs-${homeS}`);
    });
    if (!slug) continue;
    const game = await getMlrMatchData(ctx.buildId, slug);
    if (!game) continue;
    const score = mlrGameToScore(game);
    if (!score) continue;
    scores[ev.id] = score;
    matched++;
  }
  if (matched > 0) {
    console.log(`[liveScores] MLR official: matched ${matched}/${mlrEvents.length} events`);
  }
  return scores;
}
async function fetchPulseliveRugbyScores(rugbyMap) {
  const scores = {};
  const fetches = Object.entries(PULSELIVE_RUGBY_EVENT_IDS).map(async ([league, eventId]) => {
    const events = rugbyMap.get(league);
    if (!events || events.length === 0) return;
    const wrMatches = await getPulseliveSchedule(eventId);
    let matched = 0;
    const candidates = wrMatches.map((wrMatch) => ({
      score: pulseliveMatchToScore(wrMatch),
      t0: wrMatch.teams?.[0]?.name || "",
      t1: wrMatch.teams?.[1]?.name || "",
      kickoff: typeof wrMatch.time?.millis === "number" ? wrMatch.time.millis : NaN
    })).filter((c) => c.score !== null);
    for (const ev of events) {
      if (scores[ev.id]) continue;
      const evStart = ev.startTimeLocal ? new Date(ev.startTimeLocal).getTime() : NaN;
      let best = null;
      for (const c of candidates) {
        if (!teamsMatch(c.t0, ev.homeTeam) || !teamsMatch(c.t1, ev.awayTeam)) continue;
        const haveBothTimes = !Number.isNaN(evStart) && !Number.isNaN(c.kickoff);
        const delta = haveBothTimes ? Math.abs(c.kickoff - evStart) : 0;
        if (haveBothTimes && delta > PULSELIVE_MATCH_WINDOW_MS) continue;
        if (!best || delta < best.delta) best = { score: c.score, delta };
      }
      if (best) {
        scores[ev.id] = best.score;
        matched++;
      }
    }
    if (matched > 0) {
      console.log(`[liveScores] Pulselive ${league}: matched ${matched}/${events.length} events`);
    }
  });
  await Promise.all(fetches);
  return scores;
}
var RUGBY_TEAM_ALIASES = {
  "stadetoulousain": "toulouse",
  "bordeauxbegles": "bordeaux",
  "stadebordaissien": "bordeaux",
  "racing92": "racing",
  "racingmetro92": "racing",
  "stadefrancaisparis": "stadefrancais",
  "montpellierherault": "montpellier",
  "ubborrdeauxbegles": "bordeaux"
};
function normalizeTeamName2(name) {
  const base = name.toLowerCase().replace(/^the\s+/, "").replace(/\s+(rugby|super|fc|rfc)$/i, "").replace(/[^a-z0-9]/g, "");
  return RUGBY_TEAM_ALIASES[base] ?? base;
}
function teamsMatch(espnName, ourName) {
  const a = normalizeTeamName2(espnName);
  const b = normalizeTeamName2(ourName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4)))) return true;
  return false;
}
async function fetchRugbyScores(rugbyMap) {
  const scores = {};
  if (rugbyMap.size === 0) return scores;
  const leaguesToFetch = /* @__PURE__ */ new Set();
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
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
      const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
      const dates = [today, yesterday];
      const allEspnEvents = [];
      for (const dateStr of dates) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/rugby/${espnPath}/scoreboard?dates=${dateStr}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        allEspnEvents.push(...data.events || []);
      }
      for (const espnEvent of allEspnEvents) {
        const comp = espnEvent.competitions?.[0];
        if (!comp) continue;
        const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
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
              const statusName = comp.status?.type?.name || "";
              const periodNum = comp.status?.period || 0;
              const rawClock = comp.status?.displayClock || comp.status?.type?.detail || "";
              const rawTrimmed = rawClock.trim();
              let clock;
              if (/^\d+[''']?$/.test(rawTrimmed)) {
                clock = rawTrimmed.replace(/[''']/g, "") + "'";
              } else if (/^\d{1,3}:\d{2}$/.test(rawTrimmed) && !rawTrimmed.startsWith("0:")) {
                const mins = parseInt(rawTrimmed.split(":")[0], 10);
                if (mins > 0) clock = `${mins}'`;
              }
              let period = "";
              if (/half\s*time/i.test(detail) || detail === "HT" || /half\s*time/i.test(description) || /halftime/i.test(description) || /STATUS_HALFTIME/i.test(statusName)) {
                period = "HT";
              } else if (periodNum === 1 || /\b(1st|first)\s+half\b/i.test(description) || /\b(1st|first)\s+half\b/i.test(detail) || /STATUS_FIRST_HALF/i.test(statusName)) {
                period = "H1";
              } else if (periodNum === 2 || /\b(2nd|second)\s+half\b/i.test(description) || /\b(2nd|second)\s+half\b/i.test(detail) || /STATUS_SECOND_HALF/i.test(statusName)) {
                period = "H2";
              } else if (periodNum >= 1) {
                period = `H${periodNum}`;
              }
              scores[ourEvent.id] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period: period || void 0,
                clock,
                status: "live"
              };
            } else if (statusState === "post") {
              scores[ourEvent.id] = {
                awayScore: parseInt(awayComp.score || "0", 10),
                homeScore: parseInt(homeComp.score || "0", 10),
                period: "FT",
                status: "final"
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
var JL_TEAM_MAP = {
  "\u6771\u829D\u30D6\u30EC\u30A4\u30D6\u30EB\u30FC\u30D1\u30B9\u6771\u4EAC": "Brave Lupus Tokyo",
  "\u30D6\u30E9\u30C3\u30AF\u30E9\u30E0\u30BA\u6771\u4EAC": "Black Rams Tokyo",
  "\u30B3\u30D9\u30EB\u30B3\u795E\u6238\u30B9\u30C6\u30A3\u30FC\u30E9\u30FC\u30BA": "Kobelco Kobe Steelers",
  "\u57FC\u7389\u30EF\u30A4\u30EB\u30C9\u30CA\u30A4\u30C4": "Saitama Wild Knights",
  "\u30AF\u30DC\u30BF\u30B9\u30D4\u30A2\u30FC\u30BA\u8239\u6A4B\u30FB\u6771\u4EAC\u30D9\u30A4": "Kubota Spears",
  "\u30AF\u30DC\u30BF\u30B9\u30D4\u30A2\u30FC\u30BA\u8239\u6A4B": "Kubota Spears",
  "\u6D66\u5B89D-Rocks": "Urayasu D-Rocks",
  "\u30C8\u30E8\u30BF\u30F4\u30A7\u30EB\u30D6\u30EA\u30C3\u30C4": "Toyota Verblitz",
  "\u4E09\u91CD\u30DB\u30F3\u30C0\u30D2\u30FC\u30C8": "Mie Honda Heat",
  "\u6771\u4EAC\u30B5\u30F3\u30B4\u30EA\u30A2\u30B9": "Tokyo Sungoliath",
  "\u6A2A\u6D5C\u30AD\u30E4\u30CE\u30F3\u30A4\u30FC\u30B0\u30EB\u30B9": "Yokohama Canon Eagles",
  "\u4E09\u83F1\u91CD\u5DE5\u76F8\u6A21\u539F\u30C0\u30A4\u30CA\u30DC\u30A2\u30FC\u30BA": "Sagamihara Dynaboars",
  "\u9759\u5CA1\u30D6\u30EB\u30FC\u30EC\u30F4\u30BA": "Shizuoka Blue Revs"
};
function resolveJlTeam(jpName) {
  const trimmed = jpName.trim();
  if (JL_TEAM_MAP[trimmed]) return JL_TEAM_MAP[trimmed];
  for (const [jp, en] of Object.entries(JL_TEAM_MAP)) {
    if (trimmed.includes(jp) || jp.includes(trimmed)) return en;
  }
  return trimmed;
}
async function fetchJapanLeagueOneMatchDetail(matchId) {
  try {
    const res = await fetch(`https://league-one.jp/match/${matchId}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Encoding": "identity" }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const progressStart = html.indexOf('id="match-progress"');
    if (progressStart === -1) return null;
    const progressHtml = html.slice(progressStart, progressStart + 15e3);
    const eventRe = /<span>\s*(\d+)min\s*<\/span>\s*<br[^>]*>\s*(\d+)\s*-\s*(\d+)/g;
    const events = [];
    let m;
    while ((m = eventRe.exec(progressHtml)) !== null) {
      events.push({ minute: parseInt(m[1]), home: parseInt(m[2]), away: parseInt(m[3]) });
    }
    if (events.length === 0) return null;
    const htMarkerIndex = progressHtml.indexOf("\u524D\u534A\u7D42\u4E86");
    const last = events[events.length - 1];
    let period;
    let clock;
    if (htMarkerIndex === -1) {
      period = "H1";
      clock = `${last.minute}'`;
    } else {
      const htEventRe = /<span>\s*(\d+)min\s*<\/span>/g;
      let lastMinuteAfterHt = null;
      let re2;
      const postHtHtml = progressHtml.slice(htMarkerIndex);
      while ((re2 = htEventRe.exec(postHtHtml)) !== null) {
        lastMinuteAfterHt = parseInt(re2[1]);
      }
      if (lastMinuteAfterHt !== null) {
        period = "H2";
        clock = `${lastMinuteAfterHt}'`;
      } else {
        period = "HT";
      }
    }
    return { clock, period };
  } catch (err) {
    console.error("[liveScores] Japan League One detail fetch error:", err);
    return null;
  }
}
async function fetchJapanLeagueOneScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  try {
    const res = await fetch("https://league-one.jp/schedule/", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Encoding": "identity" }
    });
    if (!res.ok) return scores;
    const html = await res.text();
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1e3);
    const todayStr = `${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}.${String(jstNow.getUTCDate()).padStart(2, "0")}`;
    const jstYesterday = new Date(Date.now() + 9 * 60 * 60 * 1e3 - 864e5);
    const yesterdayStr = `${String(jstYesterday.getUTCMonth() + 1).padStart(2, "0")}.${String(jstYesterday.getUTCDate()).padStart(2, "0")}`;
    const scheduleBlocks = html.split(/<div class="c-schedule">/);
    const liveDetailFetches = [];
    for (const block of scheduleBlocks) {
      const detailM = block.match(/<a href="\/match\/(\d+)" class="btn-match-detail">([^<]+)<\/a>/);
      if (!detailM) continue;
      const matchId = detailM[1];
      const statusText = detailM[2];
      const isLive = statusText.includes("\u8A66\u5408\u4E2D");
      const isFinal = statusText.includes("\u8A66\u5408\u7D42\u4E86");
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
            period: isFinal ? "FT" : void 0,
            status: isLive ? "live" : "final"
          };
          if (isLive) {
            liveDetailFetches.push({ eventId: ourEvent.id, matchId, swapped: !!swappedMatch, homeScore, awayScore });
          }
          break;
        }
      }
    }
    if (liveDetailFetches.length > 0) {
      const details = await Promise.all(
        liveDetailFetches.map((f) => fetchJapanLeagueOneMatchDetail(f.matchId))
      );
      for (let i = 0; i < liveDetailFetches.length; i++) {
        const detail = details[i];
        const f = liveDetailFetches[i];
        if (detail && scores[f.eventId]) {
          scores[f.eventId].period = detail.period;
          scores[f.eventId].clock = detail.clock;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] Japan League One fetch error:", err);
  }
  return scores;
}
var NCAA_HOCKEY_ALIASES = {
  "UConn Huskies": "Connecticut",
  "UConn": "Connecticut",
  "Massachusetts Lowell River Hawks": "Mass.-Lowell",
  "UMass Lowell": "Mass.-Lowell",
  "Massachusetts Minutemen": "UMass",
  "UMass Minutemen": "UMass",
  "Northeastern Huskies": "Northeastern",
  "Boston University Terriers": "Boston University",
  "Boston College Eagles": "Boston College",
  "Maine Black Bears": "Maine",
  "Vermont Catamounts": "Vermont",
  "New Hampshire Wildcats": "New Hampshire",
  "Merrimack Warriors": "Merrimack",
  "Sacred Heart Pioneers": "Sacred Heart"
};
function resolveNcaaTeamName(espnName) {
  return NCAA_HOCKEY_ALIASES[espnName] || espnName;
}
async function fetchNcaaHockeyScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
    const allEspnEvents = [];
    for (const dateStr of [today, yesterday]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard?dates=${dateStr}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      allEspnEvents.push(...data.events || []);
    }
    for (const espnEvent of allEspnEvents) {
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
      const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;
      const espnHome = resolveNcaaTeamName(homeComp.team?.displayName || homeComp.team?.shortDisplayName || "");
      const espnAway = resolveNcaaTeamName(awayComp.team?.displayName || awayComp.team?.shortDisplayName || "");
      const espnDateStr = espnEvent.date || comp.date || "";
      const espnStartMs = espnDateStr ? new Date(espnDateStr).getTime() : 0;
      for (const ourEvent of events) {
        if (scores[ourEvent.id]) continue;
        if (teamsMatch(espnHome, ourEvent.homeTeam) && teamsMatch(espnAway, ourEvent.awayTeam)) {
          if (ourEvent.startTime && espnStartMs) {
            const ourStartMs = new Date(ourEvent.startTime).getTime();
            const diffHours = Math.abs(espnStartMs - ourStartMs) / (1e3 * 60 * 60);
            if (diffHours > 6) continue;
          }
          const statusState = comp.status?.type?.state;
          const statusDetail = comp.status?.type?.shortDetail || "";
          if (statusState === "in") {
            const displayClock = comp.status?.displayClock || "";
            const periodNum = comp.status?.period || 0;
            let period = "Live";
            if (periodNum === 1) period = "1st";
            else if (periodNum === 2) period = "2nd";
            else if (periodNum === 3) period = "3rd";
            else if (periodNum > 3) period = "OT";
            scores[ourEvent.id] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period,
              clock: displayClock,
              status: "live"
            };
          } else if (statusState === "post") {
            scores[ourEvent.id] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: "Final",
              status: "final"
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
var iplCompCache = null;
var IPL_COMP_CACHE_TTL = 24 * 60 * 60 * 1e3;
var iplScoreCache = { data: {}, ts: 0 };
var IPL_SCORE_CACHE_TTL = 60 * 1e3;
async function getIplCompetition() {
  const now = Date.now();
  if (iplCompCache && now - iplCompCache.ts < IPL_COMP_CACHE_TTL) {
    return { id: iplCompCache.id, feedsource: iplCompCache.feedsource };
  }
  try {
    const res = await fetch("https://scores.iplt20.com/ipl/mc/competition.js", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/oncomptetion\((.+)\)/s);
    if (!match) return null;
    const json = JSON.parse(match[1]);
    const comps = json.competition || [];
    const live = comps.find((c) => c.live === 1 && c.CompetitionName.toUpperCase().includes("IPL"));
    const latest = comps.sort((a, b) => b.SeasonID - a.SeasonID)[0];
    const chosen = live || latest;
    if (!chosen) return null;
    iplCompCache = { id: chosen.CompetitionID, feedsource: chosen.feedsource, ts: now };
    console.log(`[IPL] Competition: ${chosen.CompetitionName} (ID ${chosen.CompetitionID})`);
    return { id: chosen.CompetitionID, feedsource: chosen.feedsource };
  } catch (err) {
    console.error("[IPL] Failed to fetch competition list:", err);
    return null;
  }
}
async function fetchIplLiveScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  const cacheAge = Date.now() - iplScoreCache.ts;
  if (cacheAge < IPL_SCORE_CACHE_TTL) {
    for (const ev of events) {
      if (iplScoreCache.data[ev.id]) scores[ev.id] = iplScoreCache.data[ev.id];
    }
    return scores;
  }
  const comp = await getIplCompetition();
  if (!comp) return { ...iplScoreCache.data };
  try {
    const url = `${comp.feedsource}/${comp.id}-matchschedule.js`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { ...iplScoreCache.data };
    const text = await res.text();
    const m = text.match(/MatchSchedule\((.+)\)/s);
    if (!m) return { ...iplScoreCache.data };
    const json = JSON.parse(m[1]);
    const allMatches = json.Matchsummary || [];
    const relevantMatches = allMatches.filter(
      (m2) => m2.MatchStatus === "Live" || m2.MatchStatus === "Post"
    );
    console.log(
      `[IPL] Schedule feed: ${allMatches.length} total, ${relevantMatches.filter((m2) => m2.MatchStatus === "Live").length} live`
    );
    for (const ourEvent of events) {
      const homeLower = ourEvent.homeTeam.toLowerCase();
      const awayLower = ourEvent.awayTeam.toLowerCase();
      for (const match of relevantMatches) {
        const mHome = (match.HomeTeamName || "").toLowerCase();
        const mAway = (match.AwayTeamName || "").toLowerCase();
        const matchesHome = mHome === homeLower || homeLower.includes(mHome) || mHome.includes(homeLower);
        const matchesAway = mAway === awayLower || awayLower.includes(mAway) || mAway.includes(awayLower);
        if (!matchesHome || !matchesAway) continue;
        const firstIsHome = (match.FirstBattingTeamName || "").toLowerCase() === mHome;
        const homeScore = firstIsHome ? match.FirstBattingSummary : match.SecondBattingSummary;
        const awayScore = firstIsHome ? match.SecondBattingSummary : match.FirstBattingSummary;
        const hasSecondInnings = (match.SecondBattingSummary || "").trim().length > 0;
        const inningsLabel = hasSecondInnings ? "2nd Inns" : "1st Inns";
        if (match.MatchStatus === "Live") {
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: inningsLabel,
            status: "live",
            cricketHome: homeScore || void 0,
            cricketAway: awayScore || void 0
          };
        } else {
          const resultText = (match.Commentss || "").trim() || "Final";
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: resultText,
            status: "final",
            cricketHome: homeScore || void 0,
            cricketAway: awayScore || void 0
          };
        }
        break;
      }
    }
  } catch (err) {
    console.error("[IPL] Live score fetch error:", err);
    return { ...iplScoreCache.data };
  }
  iplScoreCache = { data: { ...scores }, ts: Date.now() };
  return scores;
}
var cricketScoreCache = { data: {}, ts: 0 };
var CRICKET_CACHE_TTL = 30 * 60 * 1e3;
var cricketRateLimitedUntil = 0;
function nextUtcMidnight() {
  const now = /* @__PURE__ */ new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5, 0);
}
function cricScoreTeamMatches(cricName, ourTeam) {
  const clean = cricName.replace(/\s*\[[^\]]*\]/g, "").trim().toLowerCase();
  const our = ourTeam.toLowerCase();
  return clean === our || clean.includes(our) || our.includes(clean);
}
async function fetchCricketScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  if (Date.now() < cricketRateLimitedUntil) {
    for (const ev of events) {
      if (cricketScoreCache.data[ev.id]) scores[ev.id] = cricketScoreCache.data[ev.id];
    }
    return scores;
  }
  const cacheAge = Date.now() - cricketScoreCache.ts;
  if (cacheAge < CRICKET_CACHE_TTL) {
    for (const ev of events) {
      if (cricketScoreCache.data[ev.id]) scores[ev.id] = cricketScoreCache.data[ev.id];
    }
    return scores;
  }
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return scores;
  try {
    const res = await fetch(`https://api.cricapi.com/v1/cricScore?apikey=${apiKey}`);
    if (!res.ok) {
      cricketScoreCache = { data: cricketScoreCache.data, ts: Date.now() };
      return { ...cricketScoreCache.data };
    }
    const data = await res.json();
    if (data.status !== "success") {
      const reason = data.reason || "";
      console.warn("[liveScores] CricAPI cricScore non-success:", data.status, reason);
      const info = data.info || {};
      const limit = typeof info.hitsLimit === "number" ? info.hitsLimit : 0;
      const used = typeof info.hitsToday === "number" ? info.hitsToday : 0;
      const limitReached = limit > 0 ? used >= limit : /hit/i.test(reason) && /limit/i.test(reason);
      if (limitReached) {
        cricketRateLimitedUntil = nextUtcMidnight();
        console.warn(
          `[liveScores] CricAPI daily limit reached (${used}/${limit || "?"}) \u2014 pausing cricket score polling until ${new Date(cricketRateLimitedUntil).toISOString()}`
        );
      }
      cricketScoreCache = { data: cricketScoreCache.data, ts: Date.now() };
      return { ...cricketScoreCache.data };
    }
    const matches = data.data || [];
    const liveOrResult = matches.filter((m) => m.ms === "live" || m.ms === "result");
    console.log(`[liveScores] CricAPI cricScore: ${matches.length} total, ${liveOrResult.length} live/result for ${events.length} cricket events`);
    for (const ourEvent of events) {
      if (scores[ourEvent.id]) continue;
      for (const match of liveOrResult) {
        const isLive = match.ms === "live";
        const isResult = match.ms === "result";
        const idMatches = ourEvent.cricketMatchId && ourEvent.cricketMatchId === match.id;
        const t1Name = match.t1 || "";
        const t2Name = match.t2 || "";
        const teamMatch = !idMatches && (cricScoreTeamMatches(t1Name, ourEvent.homeTeam) && cricScoreTeamMatches(t2Name, ourEvent.awayTeam) || cricScoreTeamMatches(t1Name, ourEvent.awayTeam) && cricScoreTeamMatches(t2Name, ourEvent.homeTeam));
        if (!idMatches && !teamMatch) continue;
        const rawStatus = match.status || "";
        const t1s = match.t1s || "";
        const t2s = match.t2s || "";
        const t1IsHome = cricScoreTeamMatches(t1Name, ourEvent.homeTeam);
        const cricketHome = t1IsHome ? t1s : t2s;
        const cricketAway = t1IsHome ? t2s : t1s;
        const isStaleStatus = /match starts at/i.test(rawStatus) || /^toss/i.test(rawStatus);
        if (isResult) {
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: rawStatus || "Final",
            status: "final",
            cricketAway: cricketAway || void 0,
            cricketHome: cricketHome || void 0
          };
        } else if (isLive) {
          const liveStatus = isStaleStatus ? "In Progress" : rawStatus || "In Progress";
          scores[ourEvent.id] = {
            awayScore: 0,
            homeScore: 0,
            period: liveStatus,
            status: "live",
            cricketAway: cricketAway || void 0,
            cricketHome: cricketHome || void 0
          };
        }
        break;
      }
    }
  } catch (err) {
    console.error("[liveScores] Cricket fetch error:", err);
    return { ...cricketScoreCache.data };
  }
  cricketScoreCache = { data: { ...scores }, ts: Date.now() };
  return scores;
}
var ESPN_CRICKET_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/cricket";
var ESPN_CRICKET_SEARCH = "https://site.web.api.espn.com/apis/search/v2";
var ESPN_CRICKET_STATIC_LEAGUES = [
  { match: /indian premier league|\bipl\b/i, id: 8048 },
  { match: /big bash|\bbbl\b/i, id: 8044 },
  { match: /major league cricket|\bmlc\b/i, id: 21266 },
  { match: /sheffield shield/i, id: 8043 },
  { match: /county championship/i, id: 8052 }
];
var ESPN_CRICKET_LEAGUE_TTL = 12 * 60 * 60 * 1e3;
var ESPN_CRICKET_LEAGUE_NULL_TTL = 30 * 60 * 1e3;
var espnCricketLeagueIdCache = /* @__PURE__ */ new Map();
var ESPN_CRICKET_SB_TTL = 30 * 60 * 1e3;
var espnCricketSbCache = /* @__PURE__ */ new Map();
function espnCricketTeamMatches(competitor, ourTeam) {
  const our = ourTeam.toLowerCase().trim();
  if (!our) return false;
  const t = competitor?.team || {};
  const candidates = [t.displayName, t.shortDisplayName, t.name, t.location, t.abbreviation].filter(Boolean).map((s) => String(s).toLowerCase().trim());
  return candidates.some((c) => c === our || c.includes(our) || our.includes(c));
}
function espnCricketSearchQuery(event) {
  const sn = (event.seriesName || "").trim();
  if (sn) {
    const parts = sn.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts[0].length <= 24 && /\b(odi|t20i?|test|match|final|semi|qualifier|eliminator)\b/i.test(parts[0])) {
      return parts.slice(1).join(" ");
    }
    return parts.join(" ");
  }
  return (event.league || "").trim();
}
async function resolveEspnCricketLeagueId(event) {
  const hay = `${event.league || ""} ${event.seriesName || ""}`;
  for (const s of ESPN_CRICKET_STATIC_LEAGUES) {
    if (s.match.test(hay)) return s.id;
  }
  const query = espnCricketSearchQuery(event);
  if (!query) return null;
  const key = query.toLowerCase();
  const cached = espnCricketLeagueIdCache.get(key);
  if (cached) {
    const ttl = cached.id == null ? ESPN_CRICKET_LEAGUE_NULL_TTL : ESPN_CRICKET_LEAGUE_TTL;
    if (Date.now() - cached.ts < ttl) return cached.id;
  }
  let found = null;
  try {
    const url = `${ESPN_CRICKET_SEARCH}?query=${encodeURIComponent(query)}&sport=cricket&limit=10`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      for (const r of data?.results || []) {
        if (r.type !== "league") continue;
        for (const it of r.contents || []) {
          const m = /l:(\d+)/.exec(it.uid || "");
          if (m) {
            found = parseInt(m[1], 10);
            break;
          }
        }
        if (found != null) break;
      }
    }
  } catch (err) {
    console.warn("[liveScores] ESPN cricket league search failed:", err);
  }
  espnCricketLeagueIdCache.set(key, { id: found, ts: Date.now() });
  return found;
}
async function fetchEspnCricketScoreboard(leagueId, yyyymmdd) {
  const key = `${leagueId}:${yyyymmdd}`;
  const cached = espnCricketSbCache.get(key);
  if (cached && Date.now() - cached.ts < ESPN_CRICKET_SB_TTL) return cached.data;
  let data = null;
  try {
    const url = `${ESPN_CRICKET_SCOREBOARD}/${leagueId}/scoreboard?dates=${yyyymmdd}`;
    const res = await fetch(url);
    if (res.ok) data = await res.json();
  } catch (err) {
    console.warn("[liveScores] ESPN cricket scoreboard failed:", err);
  }
  espnCricketSbCache.set(key, { data, ts: Date.now() });
  return data;
}
function espnCricketDateCandidates(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return [];
  const fmt = (dt) => `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
  return [fmt(d), fmt(new Date(d.getTime() - 864e5)), fmt(new Date(d.getTime() + 864e5))];
}
async function fetchEspnCricketResult(event) {
  const home = (event.homeTeam || "").trim();
  const away = (event.awayTeam || "").trim();
  if (!home || !away || !event.startTimeLocal) return null;
  const leagueId = await resolveEspnCricketLeagueId(event);
  if (leagueId == null) return null;
  for (const ymd of espnCricketDateCandidates(event.startTimeLocal)) {
    const sb = await fetchEspnCricketScoreboard(leagueId, ymd);
    for (const e of sb?.events || []) {
      const comp = (e.competitions || [])[0];
      if (!comp) continue;
      if (comp.status?.type?.state !== "post") continue;
      const competitors = comp.competitors || [];
      if (competitors.length < 2) continue;
      const homeComp = competitors.find((c) => espnCricketTeamMatches(c, home));
      const awayComp = competitors.find((c) => espnCricketTeamMatches(c, away));
      if (!homeComp || !awayComp || homeComp === awayComp) continue;
      const cricketHome = (homeComp.score || "").trim() || void 0;
      const cricketAway = (awayComp.score || "").trim() || void 0;
      let period = (comp.status?.summary || "").trim();
      if (!period) {
        const winner = competitors.find((c) => c.winner === true);
        const wn = winner?.team?.displayName;
        period = wn ? `${wn} won` : "Final";
      }
      return {
        awayScore: 0,
        homeScore: 0,
        period,
        status: "final",
        cricketHome,
        cricketAway
      };
    }
  }
  return null;
}
var ESPN_TENNIS_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard";
async function fetchTennisScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  try {
    const res = await fetch(ESPN_TENNIS_SCOREBOARD);
    if (!res.ok) return scores;
    const data = await res.json();
    const espnIdToLocal = /* @__PURE__ */ new Map();
    for (const e of events) espnIdToLocal.set(e.espnId, e.id);
    for (const ev of data.events || []) {
      for (const g of ev.groupings || []) {
        if (g.grouping?.slug !== "mens-singles") continue;
        for (const comp of g.competitions || []) {
          const localId = espnIdToLocal.get(String(comp.id));
          if (!localId) continue;
          const c1 = comp.competitors?.[0];
          const c2 = comp.competitors?.[1];
          if (!c1 || !c2) continue;
          const state = comp.status?.type?.state;
          const isLive = state === "in";
          const isPost = state === "post";
          if (!isLive && !isPost) continue;
          const ls1 = c1.linescores || [];
          const ls2 = c2.linescores || [];
          const maxSets = Math.max(ls1.length, ls2.length);
          const tennisSetScores = [];
          let p1SetsWon = 0;
          let p2SetsWon = 0;
          for (let i = 0; i < maxSets; i++) {
            const s1 = ls1[i]?.value ?? 0;
            const s2 = ls2[i]?.value ?? 0;
            const tb1 = ls1[i]?.tiebreak;
            const tb2 = ls2[i]?.tiebreak;
            const setEntry = { p1: s1, p2: s2 };
            if (tb1 !== void 0 || tb2 !== void 0) {
              const loserTb = Math.min(tb1 ?? 0, tb2 ?? 0);
              setEntry.tiebreak = String(loserTb);
            }
            const p1Won = ls1[i]?.winner === true;
            const p2Won = ls2[i]?.winner === true;
            const isCompleted = i < maxSets - 1 || isPost || (p1Won || p2Won);
            if (isCompleted) {
              if (p1Won || p2Won) {
                setEntry.winner = p1Won ? 1 : 2;
              } else if (s1 !== s2) {
                setEntry.winner = s1 > s2 ? 1 : 2;
              } else if (tb1 !== void 0 && tb2 !== void 0) {
                setEntry.winner = tb1 > tb2 ? 1 : 2;
              } else {
                setEntry.winner = 1;
              }
              if (setEntry.winner === 1) p1SetsWon++;
              else p2SetsWon++;
            }
            tennisSetScores.push(setEntry);
          }
          let tennisGameScore;
          if (isLive) {
            const detail = comp.status?.type?.detail || comp.status?.type?.shortDetail || "";
            const gameMatch = detail.match(/(\d+|AD|Ad)-(\d+|AD|Ad)\s*$/);
            if (gameMatch) {
              tennisGameScore = { p1: gameMatch[1], p2: gameMatch[2] };
            }
          }
          const statusDetail = comp.status?.type?.description || comp.status?.type?.detail || "";
          let tennisServer;
          if (c1.possession === true) tennisServer = 1;
          else if (c2.possession === true) tennisServer = 2;
          if (!tennisServer) {
            if (c1.isServing) tennisServer = 1;
            else if (c2.isServing) tennisServer = 2;
          }
          if (!tennisServer && isLive && statusDetail.includes("*")) {
            const asteriskMatch = statusDetail.match(/(\w+)\*/);
            if (asteriskMatch) {
              const surname = asteriskMatch[1].toLowerCase();
              const name1 = (c1.athlete?.displayName || c1.athlete?.shortName || "").toLowerCase();
              const name2 = (c2.athlete?.displayName || c2.athlete?.shortName || "").toLowerCase();
              if (name1.includes(surname)) tennisServer = 1;
              else if (name2.includes(surname)) tennisServer = 2;
            }
          }
          let tennisWinner;
          if (isPost) {
            if (c1.winner) tennisWinner = 1;
            else if (c2.winner) tennisWinner = 2;
          }
          scores[localId] = {
            awayScore: p1SetsWon,
            homeScore: p2SetsWon,
            period: isLive ? `Set ${comp.status?.period || tennisSetScores.length}` : "Final",
            status: isLive ? "live" : "final",
            tennisSetScores,
            tennisGameScore,
            tennisServer,
            tennisStatusDetail: statusDetail || void 0,
            tennisWinner
          };
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] Tennis fetch error:", err);
  }
  return scores;
}
var ESPN_F1_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard";
async function fetchF1Scores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  try {
    const res = await fetch(ESPN_F1_SCOREBOARD);
    if (!res.ok) return scores;
    const data = await res.json();
    const compIdToLocal = /* @__PURE__ */ new Map();
    for (const e of events) compIdToLocal.set(e.espnCompId, { id: e.id, sessionTitle: e.sessionTitle });
    for (const ev of data.events || []) {
      const competitions = ev.competitions || [];
      for (const comp of competitions) {
        const localInfo = compIdToLocal.get(String(comp.id));
        if (!localInfo) continue;
        const statusType = comp.status?.type;
        const state = statusType?.state;
        const isLive = state === "in";
        const isPost = state === "post";
        if (!isLive && !isPost) continue;
        const statusDetail = statusType?.shortDetail || statusType?.detail || "";
        const description = statusType?.description || "";
        let racingLap;
        let racingLeader;
        let racingLeaderCountry;
        let racingLeaderTeam;
        let racingLeaderPosition;
        let racingLeaderNumber;
        let racingLeaderGrid;
        let racingLapNum;
        let racingTotalLaps;
        let racingStatus;
        if (isLive) {
          const lapMatch = statusDetail.match(/Lap\s+(\d+)\s*(?:of|\/)\s*(\d+)/i);
          if (lapMatch) {
            racingLap = `Lap ${lapMatch[1]}/${lapMatch[2]}`;
            racingLapNum = parseInt(lapMatch[1], 10) || void 0;
            racingTotalLaps = parseInt(lapMatch[2], 10) || void 0;
          }
          if (/red\s*flag/i.test(statusDetail) || /red\s*flag/i.test(description)) {
            racingStatus = "Red Flag";
          } else if (/safety\s*car/i.test(statusDetail) || /caution/i.test(statusDetail)) {
            racingStatus = "Safety Car";
          } else if (/virtual\s*safety/i.test(statusDetail)) {
            racingStatus = "VSC";
          } else if (/delay/i.test(statusDetail)) {
            racingStatus = "Delayed";
          } else {
            racingStatus = statusDetail || "In Progress";
          }
        }
        const competitors = comp.competitors || [];
        if (competitors.length > 0) {
          const sorted = [...competitors].sort((a, b) => {
            const orderA = a.order ?? a.position ?? 999;
            const orderB = b.order ?? b.position ?? 999;
            return orderA - orderB;
          });
          const leader = sorted[0];
          const leaderPos = leader?.order ?? leader?.position;
          if (leaderPos != null) racingLeaderPosition = typeof leaderPos === "number" ? leaderPos : parseInt(leaderPos, 10) || void 0;
          if (leader?.athlete?.displayName) {
            racingLeader = leader.athlete.displayName;
            const flagAlt = leader.athlete?.flag?.alt;
            if (flagAlt) racingLeaderCountry = flagAlt;
            if (leader.athlete?.jersey) racingLeaderNumber = parseInt(leader.athlete.jersey, 10) || void 0;
          } else if (leader?.team?.displayName) {
            racingLeader = leader.team.displayName;
          }
          if (leader?.team?.displayName) {
            racingLeaderTeam = leader.team.displayName;
          }
          if (leader?.order != null || leader?.position != null) {
            const gridPos = leader?.statistics?.find?.((s) => s.name === "gridPosition")?.displayValue;
            if (gridPos) racingLeaderGrid = parseInt(gridPos, 10) || void 0;
          }
        }
        const period = isPost ? "Final" : racingLap || racingStatus || "Live";
        scores[localInfo.id] = {
          awayScore: 0,
          homeScore: 0,
          period,
          status: isPost ? "final" : "live",
          racingStatus: isPost ? "Complete" : racingStatus,
          racingLap,
          racingLeader,
          racingLeaderCountry,
          racingLeaderTeam,
          racingLeaderPosition,
          racingLeaderNumber,
          racingLeaderGrid,
          racingLapNum,
          racingTotalLaps,
          racingSessionType: localInfo.sessionTitle
        };
      }
    }
  } catch (err) {
    console.error("[liveScores] F1 fetch error:", err);
  }
  return scores;
}
async function fetchNbaScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
    const allEspnEvents = [];
    for (const dateStr of [today, yesterday]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      allEspnEvents.push(...data.events || []);
    }
    for (const espnEvent of allEspnEvents) {
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
      const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
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
            const periodNum = comp.status?.period || 0;
            let period = "Live";
            const quarters = ["", "Q1", "Q2", "Q3", "Q4"];
            if (periodNum >= 1 && periodNum <= 4) period = quarters[periodNum];
            else if (periodNum === 5) period = "OT";
            else if (periodNum > 5) period = `${periodNum - 4}OT`;
            const clockParts = clock.split(":");
            const secondsRem = clockParts.length === 2 ? parseInt(clockParts[0], 10) * 60 + parseInt(clockParts[1], 10) || void 0 : void 0;
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: clock ? `${period} \xB7 ${clock}` : period,
              status: "live",
              periodNumber: periodNum,
              secondsRemaining: secondsRem
            };
          } else if (statusState === "post") {
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: statusDetail || "Final",
              status: "final"
            };
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] NBA fetch error:", err);
  }
  return scores;
}
async function fetchNcaabBasketballScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
    const allEspnEvents = [];
    for (const dateStr of [today, yesterday]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=9&dates=${dateStr}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      allEspnEvents.push(...data.events || []);
    }
    for (const espnEvent of allEspnEvents) {
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
      const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
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
            const periodNum = comp.status?.period || 0;
            let period = "Live";
            if (periodNum === 1) period = "H1";
            else if (periodNum === 2) period = "H2";
            else if (periodNum === 3) period = "OT";
            else if (periodNum > 3) period = `${periodNum - 2}OT`;
            const clockParts = clock.split(":");
            const secondsRem = clockParts.length === 2 ? parseInt(clockParts[0], 10) * 60 + parseInt(clockParts[1], 10) || void 0 : void 0;
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: clock ? `${period} \xB7 ${clock}` : period,
              status: "live",
              periodNumber: periodNum,
              secondsRemaining: secondsRem
            };
          } else if (statusState === "post") {
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: statusDetail || "Final",
              status: "final"
            };
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] NCAAB fetch error:", err);
  }
  return scores;
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
}
function countGolfPlayedHoles(competitor, currentRound) {
  const roundEntry = (competitor.linescores || []).find((r) => r.period === currentRound);
  const holes = roundEntry?.linescores || [];
  return holes.filter(
    (h) => h.displayValue && h.displayValue !== "0" && h.displayValue !== "0.0" && h.displayValue !== "-"
  ).length;
}
function golfThruLabel(holesPlayed, lastHolePeriod) {
  if (holesPlayed === 18) return "F";
  if (holesPlayed > 0) return `Thru ${lastHolePeriod ?? holesPlayed}`;
  return "\u2022";
}
async function fetchGolfScores(events) {
  const scores = {};
  if (events.length === 0) return scores;
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard");
    if (!res.ok) return scores;
    const data = await res.json();
    for (const espnEvent of data.events || []) {
      const statusState = espnEvent.status?.type?.state || "";
      if (statusState === "pre") continue;
      const espnName = espnEvent.name || "";
      const espnSlug = slugify(espnName);
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;
      const competitors = comp.competitors || [];
      competitors.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      const leader = competitors[0];
      if (!leader) continue;
      const currentRound = comp.status?.period ?? 0;
      const golfLeader = leader.athlete?.displayName || "";
      const golfLeaderScore = leader.score || "";
      const golfLeaderCountry = leader.athlete?.flag?.alt || "";
      const leaderHolesPlayed = countGolfPlayedHoles(leader, currentRound);
      const leaderRoundEntry = (leader.linescores || []).find((r) => r.period === currentRound);
      const leaderRoundHoles = leaderRoundEntry?.linescores || [];
      const leaderPlayedHolesArr = leaderRoundHoles.filter(
        (h) => h.displayValue && h.displayValue !== "0" && h.displayValue !== "0.0" && h.displayValue !== "-"
      );
      const lastLeaderHole = leaderPlayedHolesArr[leaderPlayedHolesArr.length - 1];
      const golfLeaderThru = golfThruLabel(leaderHolesPlayed, lastLeaderHole?.period);
      let golfActiveLeader;
      let golfActiveLeaderScore;
      let golfActiveLeaderCountry;
      let golfActiveLeaderThru;
      for (const comp2 of competitors) {
        const holesPlayed = countGolfPlayedHoles(comp2, currentRound);
        const isOnCourse = holesPlayed > 0 && holesPlayed < 18;
        if (!isOnCourse) continue;
        const name = comp2.athlete?.displayName || "";
        if (name === golfLeader) continue;
        golfActiveLeader = name;
        golfActiveLeaderScore = comp2.score;
        golfActiveLeaderCountry = comp2.athlete?.flag?.alt;
        golfActiveLeaderThru = `Thru ${holesPlayed}`;
        break;
      }
      const leaderFinishedRound = leaderHolesPlayed === 18;
      const scorePayload = {
        awayScore: 0,
        homeScore: 0,
        status: statusState === "post" && leaderFinishedRound ? "final" : "live",
        golfLeader,
        golfLeaderScore,
        golfLeaderCountry,
        golfLeaderThru,
        golfRound: currentRound || void 0,
        golfActiveLeader,
        golfActiveLeaderScore,
        golfActiveLeaderCountry,
        golfActiveLeaderThru
      };
      for (const ev of events) {
        const evSlug = slugify(ev.tournamentName);
        const espnWords = espnSlug.split("-").filter((w) => w.length > 3);
        const matched = espnWords.length > 0 && espnWords.some((w) => evSlug.includes(w));
        if (matched) {
          scores[ev.id] = scorePayload;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] Golf fetch error:", err);
  }
  return scores;
}
async function fetchMlbScores(eventIds) {
  const scores = {};
  if (eventIds.length === 0) return scores;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, "");
    const allEspnEvents = [];
    for (const dateStr of [today, yesterday]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateStr}&limit=200`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      allEspnEvents.push(...data.events || []);
    }
    for (const espnEvent of allEspnEvents) {
      const comp = espnEvent.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
      const awayComp = comp.competitors?.find((c) => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;
      const homeName = (homeComp.team?.shortDisplayName || homeComp.team?.displayName || "").toLowerCase();
      const awayName = (awayComp.team?.shortDisplayName || awayComp.team?.displayName || "").toLowerCase();
      for (const eventId of eventIds) {
        const idLower = eventId.toLowerCase();
        const homeSlug = homeName.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const awaySlug = awayName.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        if (idLower.includes(homeSlug.substring(0, 6)) || idLower.includes(awaySlug.substring(0, 6))) {
          const statusState = comp.status?.type?.state;
          const statusDetail = comp.status?.type?.shortDetail || "";
          if (statusState === "in") {
            const periodNum = comp.status?.period || 1;
            const isTopHalf = statusDetail.toLowerCase().includes("top") || statusDetail.toLowerCase().includes("mid");
            const halfLabel = isTopHalf ? "Top" : "Bot";
            const ordinals = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
            const inningLabel = ordinals[periodNum] || `${periodNum}th`;
            const period = `${halfLabel} ${inningLabel}`;
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period,
              status: "live",
              periodNumber: periodNum
            };
          } else if (statusState === "post") {
            scores[eventId] = {
              awayScore: parseInt(awayComp.score || "0", 10),
              homeScore: parseInt(homeComp.score || "0", 10),
              period: statusDetail || "Final",
              status: "final"
            };
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("[liveScores] MLB fetch error:", err);
  }
  return scores;
}
async function fetchAllLiveScores() {
  const { nhl, ahl, echl, ncaa, soccer, rugby, cricket, tennis, f1, nba, ncaabBasketball, golf, mlb, marathon, cycling } = loadLiveEventIds();
  const iplEvents = cricket.filter((e) => e.id.startsWith("cricket-ipl-"));
  const nonIplCricket = cricket.filter((e) => !e.id.startsWith("cricket-ipl-"));
  const japanLeagueOne = rugby.get("Japan League One") || [];
  const mlrEvents = rugby.get("MLR") || [];
  const schoolsRugbyEvents = rugby.get("SA Schools Rugby") || [];
  const cyclingScoresPromise = fetchCyclingLeaderScores(cycling);
  const [nhlScores, nhlSeriesStatuses, ahlScores, ahlSeriesStatuses, echlScores, echlSeriesStatuses, ncaaScores, soccerScores, rugbyScores, pulseliveRugbyScores, mlrOfficialScores, jlOneScores, schoolsRugbyScores, iplScores, cricketScores, tennisScores, f1Scores, nbaScores, ncaabScores, golfScores, mlbScores, marathonScores, cyclingScores] = await Promise.all([
    fetchNhlScores(nhl),
    fetchNhlSeriesStatuses(),
    fetchAhlScores(ahl),
    fetchHockeyTechSeriesStatuses("ahl", "ccb91f29d6744675", ahl),
    fetchEchlScores(echl),
    fetchHockeyTechSeriesStatuses("echl", "2c2b89ea7345cae8", echl),
    fetchNcaaHockeyScores(ncaa),
    fetchSoccerScores(soccer),
    fetchRugbyScores(rugby),
    fetchPulseliveRugbyScores(rugby),
    fetchMlrOfficialScores(mlrEvents),
    fetchJapanLeagueOneScores(japanLeagueOne),
    fetchSchoolsRugbyScores(schoolsRugbyEvents),
    fetchIplLiveScores(iplEvents),
    fetchCricketScores(nonIplCricket),
    fetchTennisScores(tennis),
    fetchF1Scores(f1),
    fetchNbaScores(nba),
    fetchNcaabBasketballScores(ncaabBasketball),
    fetchGolfScores(golf),
    fetchMlbScores(mlb),
    fetchMarathonLeaderScores(marathon),
    cyclingScoresPromise
  ]);
  return {
    scores: { ...nhlScores, ...ahlScores, ...echlScores, ...ncaaScores, ...soccerScores, ...rugbyScores, ...pulseliveRugbyScores, ...mlrOfficialScores, ...jlOneScores, ...schoolsRugbyScores, ...iplScores, ...cricketScores, ...tennisScores, ...f1Scores, ...nbaScores, ...ncaabScores, ...golfScores, ...mlbScores, ...marathonScores, ...cyclingScores },
    seriesStatuses: { ...nhlSeriesStatuses, ...ahlSeriesStatuses, ...echlSeriesStatuses },
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/svnsMatches.ts
var WR_API_BASE2 = "https://api.wr-rims-prod.pulselive.com/rugby/v3";
var SVNS_EVENT_IDS = {
  Dubai: {
    mens: "835d93ac-ba9e-4d53-b704-417ca85ae129",
    womens: "55671206-ca67-46f6-90f8-00866f23ce71"
  },
  "Cape Town": {
    mens: "9e2d4625-9e44-470b-8b7a-232b800ae969",
    womens: ""
  },
  Singapore: {
    mens: "2dcbf587-13b5-4aef-ad20-d1d533f9cb07",
    womens: "23dd7def-56c1-44a1-a830-cffa99148c66"
  },
  Perth: {
    mens: "e5065fab-87d4-4037-ae12-cd532a44ec0e",
    womens: "a36c424f-a02c-4d5d-8c43-b27c8809cf62"
  },
  Vancouver: {
    mens: "845e1c8f-c661-4bb9-a507-79b377691739",
    womens: "7ca63f08-fb29-413b-88f2-ab1ccea429b7"
  },
  "New York": {
    mens: "cfe84ffe-82ac-4861-9ca4-f825353ea199",
    womens: "9800a9dd-f1a1-47bc-9cdb-b8a76c2f3367"
  },
  "Hong Kong": {
    mens: "ab7b277c-7e3d-4c65-99b0-b2f82daa0b6c",
    womens: "0ba019f2-fc92-4ff3-98bc-979b9488b4ff"
  },
  Valladolid: {
    mens: "067e2c0a-71c5-4133-843f-1ab7d6354ecc",
    womens: "22bc64d9-d11e-43eb-b275-31fe00c6358e"
  },
  Bordeaux: {
    mens: "39fdda12-ab80-4f68-97ff-1f30744d5895",
    womens: "cf1f0f65-25f9-4d97-81c0-20d5d09ec2ff"
  }
  // Note: Los Angeles previously hosted the SVNS Grand Final but was replaced
  // by New York for the 2025-26 season — no LA entry needed.
};
var cache4 = {};
var CACHE_TTL_MS5 = 6e4;
function cleanTeamName(name) {
  return name.replace(/ 7s$/i, "").trim();
}
async function fetchEventSchedule(eventId, gender) {
  const url = `${WR_API_BASE2}/event/${eventId}/schedule?language=en`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return [];
    const data = await res.json();
    const matches = data.matches || [];
    return matches.map((m) => ({
      matchId: m.matchId || "",
      description: m.description || "",
      phase: m.eventPhase || "",
      status: m.status || "U",
      time: m.time?.millis || 0,
      team1: cleanTeamName(m.teams?.[0]?.name || "TBD"),
      team1Abbr: m.teams?.[0]?.abbreviation || "?",
      team1Score: m.scores?.[0] ?? 0,
      team2: cleanTeamName(m.teams?.[1]?.name || "TBD"),
      team2Abbr: m.teams?.[1]?.abbreviation || "?",
      team2Score: m.scores?.[1] ?? 0,
      gender
    }));
  } catch (err) {
    console.error(`[svns] Failed to fetch ${gender} schedule for event ${eventId}:`, err);
    return [];
  }
}
async function fetchSvnsMatches(city) {
  const cached = cache4[city];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS5) {
    return cached.data;
  }
  const ids = SVNS_EVENT_IDS[city];
  if (!ids) {
    return { city, liveMatch: null, nextMatch: null, lastCompletedMatch: null, allMatches: [], fetchedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  const [mensMatches, womensMatches] = await Promise.all([
    ids.mens ? fetchEventSchedule(ids.mens, "mens") : Promise.resolve([]),
    ids.womens ? fetchEventSchedule(ids.womens, "womens") : Promise.resolve([])
  ]);
  const allMatches = [...mensMatches, ...womensMatches].sort((a, b) => a.time - b.time);
  const now = Date.now();
  const liveMatches = allMatches.filter((m) => m.status.startsWith("L"));
  const liveMatch = liveMatches.length > 0 ? liveMatches.reduce((latest, m) => m.time > latest.time ? m : latest, liveMatches[0]) : null;
  const upcomingMatches = allMatches.filter((m) => m.status === "U");
  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  const completedMatches = allMatches.filter((m) => m.status === "C");
  const lastCompletedMatch = completedMatches.length > 0 ? completedMatches[completedMatches.length - 1] : null;
  const result = {
    city,
    liveMatch,
    nextMatch,
    lastCompletedMatch,
    allMatches,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cache4[city] = { data: result, fetchedAt: now };
  console.log(`[svns] Fetched ${allMatches.length} matches for ${city} (${liveMatches.length} live, ${upcomingMatches.length} upcoming)`);
  return result;
}

// server/wrcStages.ts
var EWRC_API_BASE = "https://api-next.ewrc-results.com";
var WRC_EWRC_EVENT_IDS = {
  "racing-wrc-japan-2026": 96261
};
var cache5 = {};
var CACHE_TTL_MS6 = 6e4;
function emptyResult(roundId) {
  return {
    roundId,
    eventName: "",
    totalStages: 0,
    completedStages: 0,
    stages: [],
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[wrc-stages] fetch failed ${url}:`, err);
    return null;
  }
}
function getWrcRoundBaseId(eventId) {
  return eventId.replace(/-day\d+$/, "");
}
function hasWrcStageMapping(roundId) {
  return roundId in WRC_EWRC_EVENT_IDS;
}
var resultCache = {};
function emptyRallyResult(roundId) {
  return {
    roundId,
    eventName: "",
    finished: false,
    winner: null,
    runnerUp: null,
    marginPretty: null,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function formatGap(ms) {
  if (ms <= 0) return "0.0s";
  const totalTenths = Math.round(ms / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  if (totalSeconds < 60) return `${totalSeconds}.${tenths}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}.${tenths}`;
}
async function fetchWrcRallyResult(roundId) {
  const cached = resultCache[roundId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS6) {
    return cached.data;
  }
  const ewrcId = WRC_EWRC_EVENT_IDS[roundId];
  if (!ewrcId) {
    const empty2 = emptyRallyResult(roundId);
    resultCache[roundId] = { data: empty2, fetchedAt: Date.now() };
    return empty2;
  }
  const eventPage = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/event-page`);
  if (!eventPage) {
    return cached?.data ?? emptyRallyResult(roundId);
  }
  const id2driver = {};
  const entries = eventPage?.entries?.entries;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      const eid = e?.entry?.id;
      if (eid == null) continue;
      const d = e?.driver ?? {};
      const name = `${d?.firstname ?? ""} ${d?.lastname ?? ""}`.trim();
      id2driver[eid] = { name: name || "Unknown", no: e?.entry?.no ?? null, flag: d?.flag ?? null };
    }
  }
  const rawStages = eventPage?.timetable?.stages;
  const stageMeta = Array.isArray(rawStages) ? rawStages.map((s) => s?.stage).filter((s) => s && typeof s.id === "number") : [];
  stageMeta.sort((a, b) => (a.stage_number ?? 0) - (b.stage_number ?? 0));
  const toCrew = (row) => {
    if (!row) return null;
    const drv = id2driver[row.id] ?? { name: "Unknown", no: null, flag: null };
    return { name: drv.name, carNumber: drv.no, flag: drv.flag, totalTime: row?.total?.pretty ?? "" };
  };
  let attempts = 0;
  for (let i = stageMeta.length - 1; i >= 0 && attempts < 5; i--) {
    const st = stageMeta[i];
    if (st.cancelled) continue;
    attempts++;
    const la = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/live-aggregate/${st.id}`);
    const oaBlock = la?.results?.oa;
    const rows = oaBlock && !Array.isArray(oaBlock) ? oaBlock.results : null;
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const first = rows.find((r) => r?.r_oa === 1) || rows.find((r) => r?.r === 1);
    if (!first) continue;
    const second = rows.find((r) => r?.r_oa === 2) || rows.find((r) => r?.r === 2);
    const winner = toCrew(first);
    const runnerUp = toCrew(second);
    let marginPretty = null;
    const wRaw = first?.total?.raw;
    const sRaw = second?.total?.raw;
    if (typeof wRaw === "number" && typeof sRaw === "number" && sRaw > wRaw) {
      marginPretty = formatGap(sRaw - wRaw);
    }
    const result = {
      roundId,
      eventName: eventPage?.event?.name ?? "",
      finished: !!winner,
      winner,
      runnerUp,
      marginPretty,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    resultCache[roundId] = { data: result, fetchedAt: Date.now() };
    console.log(`[wrc-stages] ${roundId} (eWRC ${ewrcId}) overall winner: ${winner?.name ?? "?"}`);
    return result;
  }
  const empty = emptyRallyResult(roundId);
  resultCache[roundId] = { data: empty, fetchedAt: Date.now() };
  return empty;
}
async function fetchWrcStages(roundId) {
  const cached = cache5[roundId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS6) {
    return cached.data;
  }
  const ewrcId = WRC_EWRC_EVENT_IDS[roundId];
  if (!ewrcId) {
    const empty = emptyResult(roundId);
    cache5[roundId] = { data: empty, fetchedAt: Date.now() };
    return empty;
  }
  const eventPage = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/event-page`);
  if (!eventPage) {
    return cached?.data ?? emptyResult(roundId);
  }
  const id2driver = {};
  const entries = eventPage?.entries?.entries;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      const eid = e?.entry?.id;
      if (eid == null) continue;
      const d = e?.driver ?? {};
      const name = `${d?.firstname ?? ""} ${d?.lastname ?? ""}`.trim();
      id2driver[eid] = {
        name: name || "Unknown",
        no: e?.entry?.no ?? null,
        flag: d?.flag ?? null
      };
    }
  }
  const rawStages = eventPage?.timetable?.stages;
  if (!Array.isArray(rawStages)) {
    return emptyResult(roundId);
  }
  const stageMeta = rawStages.map((s) => s?.stage).filter((s) => s && typeof s.id === "number");
  const results = await Promise.all(
    stageMeta.map(async (st) => {
      if (st.cancelled) return { st, winner: null };
      const la = await getJson(`${EWRC_API_BASE}/event/${ewrcId}/live-aggregate/${st.id}`);
      const stageBlock = la?.results?.stage;
      const rows = stageBlock && !Array.isArray(stageBlock) ? stageBlock.results : null;
      let winner = null;
      if (Array.isArray(rows)) {
        const top = rows.find((r) => r?.r === 1);
        if (top) {
          const drv = id2driver[top.id] ?? { name: "Unknown", no: null, flag: null };
          winner = {
            name: drv.name,
            carNumber: drv.no,
            flag: drv.flag,
            time: top?.time?.pretty ?? ""
          };
        }
      }
      return { st, winner };
    })
  );
  const stages = results.map(({ st, winner }) => ({
    stageNumber: st.stage_number,
    legNumber: st.leg_number,
    name: st.name ?? "",
    distance: typeof st.distance === "number" ? st.distance : null,
    cancelled: !!st.cancelled,
    startTime: st.first_car_time ?? "",
    winner
  }));
  const completedStages = stages.filter((s) => s.winner != null).length;
  const result = {
    roundId,
    eventName: eventPage?.event?.name ?? "",
    totalStages: stages.length,
    completedStages,
    stages,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cache5[roundId] = { data: result, fetchedAt: Date.now() };
  console.log(`[wrc-stages] ${roundId} (eWRC ${ewrcId}): ${completedStages}/${stages.length} stages completed`);
  return result;
}

// server/dailyWrap.ts
import * as fs5 from "fs";
import * as path5 from "path";

// server/dailyWrapHighlights.ts
import * as fs4 from "fs";
import * as path4 from "path";
var CACHE_PATH = path4.resolve(process.cwd(), "data", "dailyWrapVideoCache.json");
var CACHE_TTL_MS7 = 7 * 24 * 3600 * 1e3;
var NOTFOUND_TTL_MS = 6 * 3600 * 1e3;
var PER_SEARCH_TIMEOUT_MS = 6e3;
var MAX_AGE_DAYS = 7;
function loadCache() {
  try {
    if (fs4.existsSync(CACHE_PATH)) {
      return JSON.parse(fs4.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch {
  }
  return {};
}
function saveCache(cache7) {
  try {
    fs4.writeFileSync(CACHE_PATH, JSON.stringify(cache7, null, 2));
  } catch (err) {
    console.error("[daily-wrap-video] Failed to save cache:", err.message);
  }
}
var TRUSTED_CHANNELS = [
  "nhl",
  "espn",
  "sportsnet",
  "tsn",
  "atp tour",
  "tennis tv",
  "wta",
  "rugbypass",
  "sky sports",
  "nbc sports",
  "fox sports",
  "bt sport",
  "dazn",
  "premier league",
  "major league soccer",
  "mls",
  "supersport",
  "roland garros",
  "wimbledon",
  "us open tennis",
  "australian open tv",
  "formula 1",
  "nba",
  "icc",
  "bcci",
  "world rugby"
];
function parseDurationText(text) {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function parsePublishedAge(text) {
  if (!text) return null;
  const m = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult = {
    second: 1 / 86400,
    minute: 1 / 1440,
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365
  };
  return n * (mult[unit] || 1);
}
function isTrusted(channel) {
  const lower = channel.toLowerCase();
  return TRUSTED_CHANNELS.some((tc) => lower.includes(tc));
}
function thumbnailUrlFor(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
var MIN_DURATION_SECONDS = 30;
var MAX_DURATION_SECONDS = 20 * 60;
var REJECT_TITLE_RE = /\b(press conference|presser|reaction|reacts?|interview|preview|live stream|livestream|watch live|full match|full game|full replay|extended replay|post.?match|pre.?match|analysis|podcast|press|conference)\b/i;
var HIGHLIGHT_HINT_RE = /\b(highlights?|recap|top plays|best of|goals?|tries|wickets|key moments)\b/i;
async function searchHighlight(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_SEARCH_TIMEOUT_MS);
  try {
    const sp = "CAISBAgCEAE%3D";
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const recentYearCutoff = currentYear - 1;
    const candidates = [];
    for (const c of contents) {
      const r = c?.videoRenderer;
      if (!r?.videoId) continue;
      const published = r?.publishedTimeText?.simpleText || "";
      const ageDays = parsePublishedAge(published);
      const title = r?.title?.runs?.[0]?.text || "";
      const channel = r?.ownerText?.runs?.[0]?.text || r?.longBylineText?.runs?.[0]?.text || "";
      const lengthText = r?.lengthText?.simpleText || "";
      const durationSeconds = parseDurationText(lengthText);
      const oldYear = title.match(/\b(19\d{2}|20\d{2})\b/);
      if (oldYear && parseInt(oldYear[1], 10) < recentYearCutoff) continue;
      if (ageDays !== null && ageDays > MAX_AGE_DAYS) continue;
      if (/\d+\s+years?\s+ago/i.test(published)) continue;
      candidates.push({
        videoId: r.videoId,
        ageDays,
        channel,
        trusted: isTrusted(channel),
        isHighlight: HIGHLIGHT_HINT_RE.test(title),
        title,
        durationSeconds,
        hasLength: !!lengthText,
        rejected: REJECT_TITLE_RE.test(title)
      });
    }
    if (candidates.length === 0) return null;
    const clips = candidates.filter(
      (c) => c.hasLength && !c.rejected && c.durationSeconds >= MIN_DURATION_SECONDS && c.durationSeconds <= MAX_DURATION_SECONDS
    );
    clips.sort((a, b) => {
      if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
      if (a.trusted !== b.trusted) return a.trusted ? -1 : 1;
      return (a.ageDays ?? 999) - (b.ageDays ?? 999);
    });
    const clip = clips[0];
    if (!clip) return null;
    return {
      url: `https://www.youtube.com/watch?v=${clip.videoId}`,
      thumbnailUrl: thumbnailUrlFor(clip.videoId),
      durationSeconds: clip.durationSeconds,
      title: clip.title,
      channel: clip.channel
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
function buildHighlightQuery(entry) {
  const now = /* @__PURE__ */ new Date();
  const monthYear = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  const away = (entry.awayTeam || "").trim();
  const home = (entry.homeTeam || "").trim();
  const league = (entry.league || "").trim();
  const sport = (entry.sport || "").trim();
  if (away && home && away.toLowerCase() !== home.toLowerCase()) {
    return `${away} vs ${home} ${league} highlights ${monthYear}`;
  }
  const subject = (home || away || entry.winner || league || "").trim();
  if (!subject) return null;
  return `${subject} ${sport} highlights ${monthYear}`;
}
async function enrichWithHighlights(entries) {
  const cache7 = loadCache();
  const now = Date.now();
  const toSearch = [];
  for (const entry of entries) {
    const cached = cache7[entry.eventId];
    if (cached) {
      const ttl = cached.video ? CACHE_TTL_MS7 : NOTFOUND_TTL_MS;
      if (now - new Date(cached.fetchedAt).getTime() < ttl) {
        entry.video = cached.video || void 0;
        continue;
      }
    }
    const query = buildHighlightQuery(entry);
    if (query) toSearch.push({ entry, query });
  }
  if (toSearch.length > 0) {
    const found = await Promise.all(
      toSearch.map(async ({ entry, query }) => ({
        entry,
        video: await searchHighlight(query)
      }))
    );
    const stamp = (/* @__PURE__ */ new Date()).toISOString();
    for (const { entry, video } of found) {
      entry.video = video || void 0;
      cache7[entry.eventId] = {
        video: video || null,
        fetchedAt: stamp
      };
    }
    saveCache(cache7);
  }
  return entries;
}

// server/diamondLeagueResults.ts
var BASE = "https://ath-wdl-archive.azureedge.net";
var CACHE_TTL_MS8 = 10 * 60 * 1e3;
var cache6 = /* @__PURE__ */ new Map();
function titleCase(word) {
  return word.split(/([\s-])/).map(
    (part) => /^[\s-]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join("");
}
function formatAthlete(r) {
  const first = (r.Firstname || "").trim();
  const last = (r.Lastname || "").trim();
  if (first && last) return `${titleCase(first)} ${titleCase(last)}`;
  const raw = (r.Athlete || "").trim();
  if (!raw) return "";
  const tokens2 = raw.split(/\s+/);
  const surname = [];
  const given = [];
  for (const t of tokens2) {
    if (t === t.toUpperCase() && /[A-Z]/.test(t)) surname.push(t);
    else given.push(t);
  }
  if (surname.length && given.length) {
    return `${given.map(titleCase).join(" ")} ${surname.map(titleCase).join(" ")}`;
  }
  return raw;
}
function toRank(v) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function recordSignificance(flag2) {
  const f = (flag2 || "").toUpperCase();
  if (f.includes("WR")) return 100;
  if (f.includes("WL")) return 80;
  if (f.includes("AR")) return 70;
  if (f.includes("NR")) return 60;
  if (f.includes("MR")) return 50;
  return 0;
}
function parseMeeting(raw, meeting, season) {
  const resultData = raw?.Data?.ResultData || {};
  const sa = [];
  const records = [];
  const winners = [];
  for (const disc of Object.values(resultData)) {
    const discipline = (disc?.Name || "").trim();
    const isDR = !!disc?.IsDiamondRace;
    for (const heat of Object.values(disc?.Data || {})) {
      for (const r of heat?.Results || []) {
        const rank = toRank(r.Rank);
        const athlete = formatAthlete(r);
        if (rank == null || !athlete) continue;
        const entry = {
          athlete,
          nation: (r.Nation || "").trim().toUpperCase(),
          discipline,
          rank,
          performance: (r.BestPerformance || "").trim(),
          recordFlag: (r.RecordFlag || "").trim(),
          isDiamondRace: isDR
        };
        if (entry.nation === "RSA") sa.push(entry);
        if (recordSignificance(entry.recordFlag) > 0) records.push(entry);
        if (rank === 1) winners.push(entry);
      }
    }
  }
  sa.sort(
    (a, b) => a.rank - b.rank || recordSignificance(b.recordFlag) - recordSignificance(a.recordFlag) || Number(b.isDiamondRace) - Number(a.isDiamondRace)
  );
  records.sort(
    (a, b) => recordSignificance(b.recordFlag) - recordSignificance(a.recordFlag) || a.rank - b.rank
  );
  winners.sort((a, b) => Number(b.isDiamondRace) - Number(a.isDiamondRace));
  const notable = [...records, ...winners.filter((w) => recordSignificance(w.recordFlag) === 0)];
  return { meeting, season, saResults: sa, notable };
}
async function fetchDiamondLeagueSummary(meeting, season) {
  const key = `${season}/${meeting}`;
  const cached = cache6.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS8) return cached.data;
  let data = null;
  try {
    const res = await fetch(`${BASE}/${season}/${meeting}.json`);
    if (res.ok) {
      const raw = await res.json();
      data = parseMeeting(raw, meeting, season);
    }
  } catch {
    data = null;
  }
  cache6.set(key, { ts: Date.now(), data });
  return data;
}

// server/dailyWrap.ts
var LOOKBACK_MS = 24 * 60 * 60 * 1e3;
function getTodayBounds(tz) {
  const utcNow = Date.now();
  const localNowMs = utcNow - tz * 6e4;
  const localMidnightMs = Math.floor(localNowMs / 864e5) * 864e5;
  const utcStartMs = localMidnightMs + tz * 6e4;
  const utcEndMs = utcStartMs + 864e5 - 1;
  return { start: new Date(utcStartMs - LOOKBACK_MS), end: new Date(utcEndMs) };
}
function formatDate(tz) {
  const utcNow = Date.now();
  const localNowMs = utcNow - tz * 6e4;
  const d = new Date(localNowMs);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}
var FINAL_KEYWORDS = ["final", "ft", "ended", "full time", "completed", "f/ot", "f/so", "game over", "post"];
function isFinalScore(score) {
  if (!score) return false;
  const s = (score.status || "").toLowerCase().trim();
  return FINAL_KEYWORDS.some((kw) => s === kw || s.startsWith(kw));
}
function getPriorityScore(sport, league, score) {
  const sportLower = sport.toLowerCase();
  const leagueLower = league.toLowerCase();
  if (sportLower === "racing") {
    if (score?.racingSessionType === "Race") return 100;
    if (score?.racingSessionType === "Sprint") return 60;
    return 5;
  }
  if (sportLower === "golf") return 90;
  if (sportLower === "athletics") return 68;
  if (sportLower === "tennis") {
    if (leagueLower.includes("grand slam") || leagueLower.includes("wimbledon") || leagueLower.includes("us open") || leagueLower.includes("australian") || leagueLower.includes("french open") || leagueLower.includes("roland")) return 85;
    if (leagueLower.includes("masters") || leagueLower.includes("1000")) return 75;
    return 65;
  }
  if (sportLower === "rugby" && leagueLower.includes("svns")) return 78;
  if (sportLower === "soccer") {
    if (leagueLower.includes("world cup")) return 88;
    if (leagueLower.includes("champions") || leagueLower.includes("ucl")) return 58;
    if (leagueLower.includes("premier") || leagueLower.includes("epl")) return 52;
    if (leagueLower.includes("europa")) return 48;
    if (leagueLower.includes("fa cup") || leagueLower.includes("facup")) return 46;
    if (leagueLower.includes("serie a") || leagueLower.includes("la liga") || leagueLower.includes("bundesliga") || leagueLower.includes("ligue 1")) return 45;
    if (leagueLower.includes("mls")) return 38;
    return 35;
  }
  if (sportLower === "rugby") {
    if (leagueLower.includes("six nations") || leagueLower.includes("six_nations")) return 55;
    if (leagueLower.includes("urc") || leagueLower.includes("premiership") || leagueLower.includes("top 14") || leagueLower.includes("top14")) return 36;
    if (leagueLower.includes("super rugby") || leagueLower.includes("super_rugby")) return 34;
    return 30;
  }
  if (sportLower === "hockey") {
    if (leagueLower === "nhl") return 48;
    if (leagueLower === "ahl") return 28;
    return 20;
  }
  if (sportLower === "basketball") {
    if (leagueLower === "nba") return 44;
    return 22;
  }
  if (sportLower === "cricket") return 32;
  return 15;
}
var MIN_STORIES = 5;
var LOOKAHEAD_MS = 48 * 60 * 60 * 1e3;
function lookAheadTimeLabel(startIso, tz) {
  const startMs = new Date(startIso).getTime();
  if (isNaN(startMs)) return "";
  const localStartMs = startMs - tz * 6e4;
  const localNowMs = Date.now() - tz * 6e4;
  const dayStart = Math.floor(localStartMs / 864e5);
  const dayNow = Math.floor(localNowMs / 864e5);
  const diff = dayStart - dayNow;
  const d = new Date(localStartMs);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
  const dayLabel = diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${dayLabel} \xB7 ${time}`;
}
var VENUE_SPORTS = /* @__PURE__ */ new Set([
  "hockey",
  "soccer",
  "football",
  "basketball",
  "baseball",
  "rugby"
]);
function lookAheadEditorial(e) {
  const home = e.homeTeam || "";
  const away = e.awayTeam || "";
  const hasMatchup = !!away && !!home && away !== home;
  const sport = (e.sport || "").toLowerCase();
  const id = String(e.id || "");
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = hash * 31 + id.charCodeAt(i) >>> 0;
  if (!hasMatchup) {
    const name = e.sessionTitle || home || away || e.league || "";
    if (!name) return e.league || "";
    const templates2 = [
      `${name} takes center stage`,
      `All eyes on ${name}`,
      `${name} headlines the day`,
      `${name} gets underway`
    ];
    return templates2[hash % templates2.length];
  }
  if (VENUE_SPORTS.has(sport)) {
    const templates2 = [
      `${home} host ${away}`,
      `${away} visit ${home}`,
      `${away} travel to face ${home}`,
      `${home} welcome ${away}`
    ];
    return templates2[hash % templates2.length];
  }
  const templates = [
    `${away} and ${home} square off`,
    `${away} and ${home} go head-to-head`,
    `${away} and ${home} meet`,
    `${away} and ${home} clash`
  ];
  return templates[hash % templates.length];
}
function buildLookAheadEntries(allEvents, excludeIds, nowMs, tz, need) {
  if (need <= 0) return [];
  const windowEnd = nowMs + LOOKAHEAD_MS;
  const candidates = allEvents.filter((e) => {
    if (!e?.id || excludeIds.has(e.id)) return false;
    const t = new Date(e.startTimeLocal).getTime();
    if (isNaN(t)) return false;
    return t > nowMs && t <= windowEnd;
  });
  candidates.sort((a, b) => {
    const pa = getPriorityScore(a.sport, a.league, void 0);
    const pb = getPriorityScore(b.sport, b.league, void 0);
    if (pb !== pa) return pb - pa;
    return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
  });
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const e of candidates) {
    const key = `${(e.sport || "").toLowerCase()}|${(e.league || "").toLowerCase()}|${(e.homeTeam || "").toLowerCase()}|${(e.awayTeam || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const editorial = lookAheadEditorial(e);
    out.push({
      eventId: e.id,
      sport: e.sport,
      league: e.league,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      editorial,
      detail: lookAheadTimeLabel(e.startTimeLocal, tz),
      priorityScore: getPriorityScore(e.sport, e.league, void 0),
      startTimeLocal: e.startTimeLocal,
      isLookAhead: true
    });
    if (out.length >= need) break;
  }
  return out;
}
var COUNTRY_FLAGS = {
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  "Great Britain": "\u{1F1EC}\u{1F1E7}",
  France: "\u{1F1EB}\u{1F1F7}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  "United States": "\u{1F1FA}\u{1F1F8}",
  USA: "\u{1F1FA}\u{1F1F8}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  Mexico: "\u{1F1F2}\u{1F1FD}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  China: "\u{1F1E8}\u{1F1F3}",
  "South Korea": "\u{1F1F0}\u{1F1F7}",
  Argentina: "\u{1F1E6}\u{1F1F7}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Austria: "\u{1F1E6}\u{1F1F9}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  Portugal: "\u{1F1F5}\u{1F1F9}",
  Greece: "\u{1F1EC}\u{1F1F7}",
  Turkey: "\u{1F1F9}\u{1F1F7}",
  Russia: "\u{1F1F7}\u{1F1FA}",
  Ukraine: "\u{1F1FA}\u{1F1E6}",
  "New Zealand": "\u{1F1F3}\u{1F1FF}",
  "South Africa": "\u{1F1FF}\u{1F1E6}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  Scotland: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  Wales: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  England: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  India: "\u{1F1EE}\u{1F1F3}",
  Pakistan: "\u{1F1F5}\u{1F1F0}",
  "Sri Lanka": "\u{1F1F1}\u{1F1F0}",
  Bangladesh: "\u{1F1E7}\u{1F1E9}",
  Thailand: "\u{1F1F9}\u{1F1ED}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  Nigeria: "\u{1F1F3}\u{1F1EC}",
  Kenya: "\u{1F1F0}\u{1F1EA}",
  Ethiopia: "\u{1F1EA}\u{1F1F9}",
  Morocco: "\u{1F1F2}\u{1F1E6}",
  Egypt: "\u{1F1EA}\u{1F1EC}",
  Colombia: "\u{1F1E8}\u{1F1F4}",
  Chile: "\u{1F1E8}\u{1F1F1}",
  Peru: "\u{1F1F5}\u{1F1EA}",
  Venezuela: "\u{1F1FB}\u{1F1EA}",
  Cuba: "\u{1F1E8}\u{1F1FA}",
  Jamaica: "\u{1F1EF}\u{1F1F2}",
  "Trinidad and Tobago": "\u{1F1F9}\u{1F1F9}",
  Denmark2: "\u{1F1E9}\u{1F1F0}",
  Croatia: "\u{1F1ED}\u{1F1F7}",
  Serbia: "\u{1F1F7}\u{1F1F8}",
  Romania: "\u{1F1F7}\u{1F1F4}"
};
function flag(country) {
  return COUNTRY_FLAGS[country] || "";
}
function isoFlag(code) {
  if (!code) return "";
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(
    ...[...cc].map((c) => 127462 + c.charCodeAt(0) - 65)
  );
}
function hockeySeriesPhrase(s) {
  if (!s) return null;
  const a = s.topSeedWins ?? 0;
  const b = s.bottomSeedWins ?? 0;
  if (a === 0 && b === 0) return null;
  const need = s.neededToWin ?? 4;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi >= need) return `to win the series ${hi}\u2013${lo}`;
  const wW = s.lastGameWinnerWins;
  const lW = s.lastGameLoserWins;
  if (wW != null && lW != null) {
    if (wW === lW) {
      if (wW === need - 1) return `to force Game ${need * 2 - 1}`;
      return `to level the series ${wW}\u2013${wW}`;
    }
    if (lW === need - 1 && wW < lW) return `to stay alive in the series`;
    if (wW > lW) return `to take a ${wW}\u2013${lW} series lead`;
    return null;
  }
  if (a === b) {
    if (a === need - 1) return `to force Game ${need * 2 - 1}`;
    return `to level the series ${a}\u2013${a}`;
  }
  return null;
}
function hockeySeriesDetail(s) {
  if (!s) return null;
  const a = s.topSeedWins ?? 0;
  const b = s.bottomSeedWins ?? 0;
  if (a === 0 && b === 0) return null;
  const need = s.neededToWin ?? 4;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const round = (s.seriesTitle || "").trim() || (s.round ? `Round ${s.round}` : "Playoffs");
  if (hi >= need) return `${round} \xB7 Series over ${hi}\u2013${lo}`;
  if (a === b) return `${round} \xB7 Series tied ${a}\u2013${a}`;
  return `${round} \xB7 Series ${hi}\u2013${lo}`;
}
function hockeyEditorial(event, score, series) {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;
  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);
  const period = (score.period || "").toUpperCase();
  const isSO = period.includes("SO") || period.includes("SHOOTOUT");
  const isOT = !isSO && (period.includes("OT") || period === "3OT" || period === "4OT");
  let verb = "beat";
  if (away === 0 || home === 0) verb = "blanked";
  else if (margin === 1) verb = "edged";
  else if (margin >= 4) verb = "cruised past";
  const suffix = isSO ? " in a shootout" : isOT ? " in overtime" : "";
  const seriesPhrase = hockeySeriesPhrase(series);
  const editorial = `${winner} ${verb} ${loser} ${ws}\u2013${ls}${suffix}${seriesPhrase ? ` ${seriesPhrase}` : ""}`;
  const seriesDetail = hockeySeriesDetail(series);
  const otTag = isSO ? " (SO)" : isOT ? " (OT)" : "";
  const detail = seriesDetail ? `${event.league} \xB7 ${ws}\u2013${ls} Final${otTag} \xB7 ${seriesDetail}` : `${event.league} \xB7 ${ws}\u2013${ls} Final${otTag}`;
  return { editorial, detail, winner, loser, winnerScore: ws, loserScore: ls };
}
function soccerEditorial(event, score) {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;
  if (home === away) {
    let editorial;
    if (home === 0) {
      editorial = `${event.homeTeam} and ${event.awayTeam} play out a goalless draw`;
    } else if (home + away >= 4) {
      editorial = `${event.homeTeam} and ${event.awayTeam} share ${home + away} goals in a ${home}\u2013${away} draw`;
    } else {
      editorial = `${event.homeTeam} and ${event.awayTeam} draw ${home}\u2013${away}`;
    }
    return { editorial, detail: `${event.league} \xB7 ${home}\u2013${away} Full Time` };
  }
  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);
  let verb = "beat";
  if (margin >= 4) verb = "thrashed";
  else if (margin === 3) verb = "swept aside";
  else if (margin === 1) verb = "edged";
  return {
    editorial: `${winner} ${verb} ${loser} ${ws}\u2013${ls}`,
    detail: `${event.league} \xB7 ${ws}\u2013${ls} Full Time`,
    winner,
    loser,
    winnerScore: ws,
    loserScore: ls
  };
}
function basketballEditorial(event, score) {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;
  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);
  let verb = "beat";
  if (margin <= 3) verb = "edged";
  else if (margin >= 20) verb = "dominated";
  return {
    editorial: `${winner} ${verb} ${loser} ${ws}\u2013${ls}`,
    detail: `${event.league} \xB7 ${ws}\u2013${ls} Final`,
    winner,
    loser,
    winnerScore: ws,
    loserScore: ls
  };
}
function rugbyEditorial(event, score) {
  const away = score.awayScore ?? -1;
  const home = score.homeScore ?? -1;
  if (away < 0 || home < 0) return null;
  if (home === away) {
    return {
      editorial: `${event.homeTeam} and ${event.awayTeam} draw ${home}\u2013${away}`,
      detail: `${event.league} \xB7 ${home}\u2013${away} Full Time`
    };
  }
  const isHomeWin = home > away;
  const winner = isHomeWin ? event.homeTeam : event.awayTeam;
  const loser = isHomeWin ? event.awayTeam : event.homeTeam;
  const ws = isHomeWin ? String(home) : String(away);
  const ls = isHomeWin ? String(away) : String(home);
  const margin = Math.abs(home - away);
  let verb = "beat";
  if (margin >= 20) verb = "thumped";
  else if (home === 0 || away === 0) verb = "shut out";
  else if (margin >= 13) verb = "outclassed";
  else if (margin <= 5) verb = "edged";
  let editorial = `${winner} ${verb} ${loser} ${ws}\u2013${ls}`;
  if (verb === "edged") {
    editorial += margin === 1 ? " by a point" : ` by ${margin}`;
  }
  return {
    editorial,
    detail: `${event.league} \xB7 ${ws}\u2013${ls} Full Time`,
    winner,
    loser,
    winnerScore: ws,
    loserScore: ls
  };
}
var SCHOOLS_FALLBACK_PRIORITY = 18;
var SCHOOLS_FALLBACK_GRACE_MS = 90 * 60 * 1e3;
var SCHOOLS_RIVALRIES = {
  "Paarl Boys' High|Paarl Gimnasium": "the Paarl derby"
};
function isSchoolsRugby(event) {
  return event?.league === "SA Schools Rugby" || event?.leagueKey === "schools-rugby";
}
function hasConcluded(event, nowMs, bufferMs = 0) {
  const start = new Date(event.startTimeLocal).getTime();
  if (Number.isNaN(start)) return false;
  const end = event.endTimeLocal ? new Date(event.endTimeLocal).getTime() : start + 110 * 60 * 1e3;
  return nowMs >= end + bufferMs;
}
function schoolsRugbyFallbackEditorial(event) {
  const home = (event.homeTeam || "").trim();
  const away = (event.awayTeam || "").trim();
  if (!home || !away) return null;
  const rivalry = SCHOOLS_RIVALRIES[[home, away].sort().join("|")];
  const editorial = rivalry ? `${home} and ${away} renewed ${rivalry}` : `${home} hosted ${away} in schoolboy rugby`;
  const detail = event.venue ? `${event.league} \xB7 ${event.venue}` : event.league;
  return { editorial, detail };
}
var CURRIE_CUP_FALLBACK_GRACE_MS = 60 * 60 * 1e3;
function isCurrieCup(event) {
  return event?.league === "Currie Cup" || event?.leagueKey === "curriecup";
}
function currieCupFallbackEditorial(event) {
  const home = (event.homeTeam || "").trim();
  const away = (event.awayTeam || "").trim();
  if (!home || !away) return null;
  return {
    editorial: `${home} hosted ${away} in the Currie Cup`,
    detail: event.venue ? `${event.league} \xB7 ${event.venue}` : event.league
  };
}
function isCricket(event) {
  return (event?.sport || "").toLowerCase() === "cricket";
}
var CRICKET_FALLBACK_GRACE_MS = 60 * 60 * 1e3;
function cricketMatchLabel(event) {
  const sn = (event.seriesName || "").trim();
  if (!sn) return "";
  const first = sn.split(",")[0].trim();
  return first && first.length <= 24 ? first : "";
}
function cricketFallbackEditorial(event) {
  const home = (event.homeTeam || "").trim();
  const away = (event.awayTeam || "").trim();
  if (!home || !away) return null;
  const label = cricketMatchLabel(event);
  const editorial = label ? `${away} and ${home} met in the ${label}` : `${away} and ${home} met in international cricket`;
  const detail = label ? `${event.league} \xB7 ${label}` : event.league;
  return { editorial, detail };
}
var HORSE_RACING_PRIORITY = 72;
var HORSE_RACING_FALLBACK_GRACE_MS = 30 * 60 * 1e3;
var TRIPLE_CROWN_LEG = {
  "Kentucky Derby": "First leg",
  "Preakness Stakes": "Second leg",
  "Belmont Stakes": "Final leg"
};
function isHorseRacing(event) {
  return (event?.sport || "").toLowerCase() === "horse-racing";
}
function horseRacingFallbackEditorial(event) {
  const race = (event.tournamentName || event.homeTeam || event.sessionTitle || "").trim();
  if (!race) return null;
  const track = (event.awayTeam || "").split(",")[0].trim();
  const leg = TRIPLE_CROWN_LEG[race];
  const horse = (event.winnerHorse || "").trim();
  const jockey = (event.winnerJockey || "").trim();
  const note = (event.winnerNote || "").trim();
  if (horse) {
    const editorial2 = `${horse} wins the ${race}`;
    const detailParts = [
      jockey ? `Ridden by ${jockey}` : "",
      leg ? `Triple Crown \xB7 ${leg}` : event.league
    ].filter(Boolean);
    return {
      editorial: editorial2,
      detail: detailParts.join(" \xB7 "),
      winner: horse,
      horseRacingResult: {
        horse,
        jockey: jockey || void 0,
        leg: leg || void 0,
        track: track || void 0,
        note: note || void 0
      }
    };
  }
  const editorial = track ? `The ${race} ran at ${track}` : `The ${race} is in the books`;
  const detail = leg ? `${event.league} \xB7 ${leg}` : event.league;
  return { editorial, detail };
}
var CYCLING_PRIORITY = 42;
function isCyclingGrandTour(event) {
  return typeof event?.id === "string" && event.id.startsWith("cycling-grand-tour-");
}
function formatCyclistName(raw) {
  const tokens2 = raw.trim().split(/\s+/);
  if (tokens2.length < 2) return raw.trim();
  const surname = [];
  const given = [];
  for (const t of tokens2) {
    if (given.length === 0 && t === t.toUpperCase() && /[A-Z]/.test(t)) surname.push(t);
    else given.push(t);
  }
  if (surname.length === 0 || given.length === 0) return raw.trim();
  const tc = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return `${given.join(" ")} ${surname.map(tc).join(" ")}`;
}
function normalizeCyclingGap(raw) {
  const g = (raw || "").trim().replace(/^\+/, "");
  if (!g) return null;
  if (/^(s\.?t\.?|same\s*time)$/i.test(g)) return null;
  if (/^0+([:.]0+)*$/.test(g)) return null;
  if (!/\d/.test(g)) return null;
  return g;
}
function cyclingEditorial(event, score) {
  const leaderRaw = (score.cyclingLeader || "").trim();
  if (!leaderRaw) return null;
  const leader = formatCyclistName(leaderRaw);
  const tour = event.homeTeam || "the race";
  const f = flag(score.cyclingLeaderCountry || "");
  const team = score.cyclingLeaderTeam ? ` \xB7 ${score.cyclingLeaderTeam}` : "";
  const isFinalStage = /final/i.test(event.sessionTitle || "");
  const nation = score.cyclingLeaderCountry?.trim() || void 0;
  if (isFinalStage) {
    return {
      editorial: `${f ? f + " " : ""}${leader} wins the ${tour}`,
      detail: `${event.league} \xB7 General Classification${team}`,
      winner: leader,
      cyclingResult: { name: leader, nation, isOverall: true }
    };
  }
  const m = /stage\s*(\d+)/i.exec(event.sessionTitle || "") || /stage-(\d+)/i.exec(event.id || "");
  const stage = m ? parseInt(m[1], 10) : null;
  const gap = normalizeCyclingGap(score.cyclingLeaderGap);
  const stagePart = stage ? ` after Stage ${stage}` : "";
  const gapPart = gap ? ` by ${gap}` : "";
  return {
    editorial: `${f ? f + " " : ""}${leader} leads the ${tour}${gapPart}${stagePart}`,
    detail: `${event.league} \xB7 General Classification${team}`,
    winner: leader,
    cyclingResult: { name: leader, nation, isOverall: false }
  };
}
var WRC_PRIORITY = 50;
function isWrc(event) {
  return event?.sport?.toLowerCase() === "racing" && (event?.leagueKey === "wrc" || typeof event?.id === "string" && event.id.startsWith("racing-wrc-"));
}
function isWrcFinalDay(event) {
  if (event?.totalDays != null && event?.dayNumber != null) {
    return event.dayNumber === event.totalDays;
  }
  return true;
}
async function wrcRallyEditorial(event) {
  const baseId = getWrcRoundBaseId(event.id);
  const r = await fetchWrcRallyResult(baseId);
  if (!r.finished || !r.winner) return null;
  const rallyName = event.tournamentName || event.homeTeam || r.eventName || "the rally";
  const f = isoFlag(r.winner.flag);
  const editorial = `${f ? f + " " : ""}${r.winner.name} wins ${rallyName}`;
  const parts = ["WRC"];
  if (r.marginPretty && r.runnerUp) {
    const runnerLast = r.runnerUp.name.trim().split(/\s+/).pop() || r.runnerUp.name;
    parts.push(`won by ${r.marginPretty} over ${runnerLast}`);
  } else {
    parts.push("Rally winner");
  }
  return { editorial, detail: parts.join(" \xB7 "), winner: r.winner.name };
}
var SVNS_PRIORITY = 78;
function isSvns(event) {
  return event?.league === "HSBC SVNS" || typeof event?.id === "string" && event.id.startsWith("rugby-svns-");
}
async function svnsFinalEditorial(event) {
  const city = (event.homeTeam || "").replace(/^SVNS\s+/i, "").trim();
  if (!city) return null;
  let res;
  try {
    res = await fetchSvnsMatches(city);
  } catch {
    return null;
  }
  const startMs = new Date(event.startTimeLocal).getTime();
  const endMs = (event.endTimeLocal ? new Date(event.endTimeLocal).getTime() : startMs + 10 * 60 * 60 * 1e3) + 2 * 60 * 60 * 1e3;
  const finals = (res?.allMatches || []).filter(
    (m) => m.status === "C" && /cup final/i.test(m.phase) && m.time >= startMs && m.time <= endMs
  );
  if (finals.length === 0) return null;
  const toFinal = (m) => {
    const team1Win = m.team1Score >= m.team2Score;
    return {
      gender: m.gender,
      winner: team1Win ? m.team1 : m.team2,
      loser: team1Win ? m.team2 : m.team1,
      winnerScore: Math.max(m.team1Score, m.team2Score),
      loserScore: Math.min(m.team1Score, m.team2Score)
    };
  };
  const mensMatch = finals.find((m) => m.gender === "mens");
  if (!mensMatch) return null;
  const primary = toFinal(mensMatch);
  const svnsFinals = [toFinal(mensMatch)];
  const editorial = `${primary.winner} beat ${primary.loser} ${primary.winnerScore}\u2013${primary.loserScore} to win the ${city} SVNS`;
  const parts = svnsFinals.map(
    (f) => `${f.winner} ${f.winnerScore}\u2013${f.loserScore} ${f.loser}`
  );
  return {
    editorial,
    detail: `${event.league} \xB7 ${parts.join(" \xB7 ")}`,
    winner: primary.winner,
    loser: primary.loser,
    winnerScore: String(primary.winnerScore),
    loserScore: String(primary.loserScore),
    svnsFinals
  };
}
var DIAMOND_LEAGUE_PRIORITY = 68;
function isDiamondLeague(event) {
  return event?.leagueKey === "diamond-league" || event?.league === "Diamond League";
}
function diamondLeagueMeetKey(event) {
  const m = /^athletics-diamond-league-(.+)-(\d{4})$/.exec(event?.id || "");
  if (!m) return null;
  const meeting = m[1].split("-")[0];
  if (!meeting) return null;
  return { meeting, season: m[2] };
}
var RECORD_NAMES = {
  WR: "world record",
  WL: "world lead",
  AR: "area record",
  NR: "national record",
  MR: "meeting record",
  SB: "season best",
  PB: "personal best"
};
function expandRecordFlag(flag2) {
  for (const token of (flag2 || "").toUpperCase().replace(/=/g, "").split(",")) {
    const name = RECORD_NAMES[token.trim()];
    if (name) return name;
  }
  return null;
}
function formatDiscipline(name) {
  let gender = "";
  let d = name;
  if (/\bMen\b/.test(name)) {
    gender = "men's";
    d = name.replace(/\s*\bMen\b/, "");
  } else if (/\bWomen\b/.test(name)) {
    gender = "women's";
    d = name.replace(/\s*\bWomen\b/, "");
  }
  d = d.trim().toLowerCase();
  return gender ? `${gender} ${d}` : d;
}
function spokenDiscipline(name) {
  return formatDiscipline(name).replace(/\b(\d)\s*x\s*(\d[\d,]*)m\b/gi, "$1 by $2 metres").replace(/\b(\d[\d,]*)m\b/g, "$1 metres");
}
function placeWord(rank) {
  if (rank === 1) return "wins";
  if (rank === 2) return "takes second in";
  if (rank === 3) return "takes third in";
  const ord = rank >= 11 && rank <= 13 ? `${rank}th` : `${rank}${["th", "st", "nd", "rd"][rank % 10] || "th"}`;
  return `finishes ${ord} in`;
}
function saHeadline(r) {
  return `${r.athlete} ${placeWord(r.rank)} the ${spokenDiscipline(r.discipline)}`;
}
function notableHeadline(r) {
  const disc = spokenDiscipline(r.discipline);
  const sig = expandRecordFlag(r.recordFlag);
  const nat = r.nation ? ` (${r.nation})` : "";
  if (sig === "world record") {
    return `\u{1F30D} ${r.athlete}${nat} breaks the world record in the ${disc}`;
  }
  if (sig === "world lead") {
    return `${r.athlete}${nat} posts a world-leading ${r.performance} to win the ${disc}`;
  }
  if (sig) {
    return `${r.athlete}${nat} sets a ${sig} in the ${disc}`;
  }
  return `${r.athlete}${nat} wins the ${disc}`;
}
async function diamondLeagueEditorial(event) {
  const key = diamondLeagueMeetKey(event);
  if (!key) return null;
  let summary;
  try {
    summary = await fetchDiamondLeagueSummary(key.meeting, key.season);
  } catch {
    return null;
  }
  if (!summary) return null;
  const city = key.meeting.charAt(0).toUpperCase() + key.meeting.slice(1);
  const sa = summary.saResults[0];
  if (sa) {
    const bits = [`Diamond League`, city, formatDiscipline(sa.discipline)];
    if (sa.performance) bits.push(sa.performance);
    const rec = expandRecordFlag(sa.recordFlag);
    if (rec) bits.push(rec);
    const moreSa = summary.saResults.length - 1;
    if (moreSa > 0) bits.push(`+${moreSa} more SA athlete${moreSa > 1 ? "s" : ""}`);
    return {
      editorial: saHeadline(sa),
      detail: bits.join(" \xB7 "),
      winner: sa.rank === 1 ? sa.athlete : void 0,
      // Only the headlined result is shown on the card.
      athleticsResults: [toAthleticsResult(sa)],
      athleticsMeet: { city, scope: "sa" }
    };
  }
  const n = summary.notable[0];
  if (n) {
    const bits = [`Diamond League`, city, formatDiscipline(n.discipline)];
    if (n.performance) bits.push(n.performance);
    return {
      editorial: notableHeadline(n),
      detail: bits.join(" \xB7 "),
      winner: n.rank === 1 ? n.athlete : void 0,
      // Only the headlined result is shown on the card.
      athleticsResults: [toAthleticsResult(n)],
      athleticsMeet: { city, scope: "top" }
    };
  }
  return null;
}
function toAthleticsResult(r) {
  return {
    discipline: formatDiscipline(r.discipline),
    athlete: r.athlete,
    nation: r.nation,
    rank: r.rank,
    performance: r.performance,
    record: expandRecordFlag(r.recordFlag) || void 0
  };
}
function golfEditorial(event, score) {
  if (!score.golfLeader) return null;
  const f = flag(score.golfLeaderCountry || "");
  const player = score.golfLeader;
  const sc = score.golfLeaderScore || "";
  const tournament = event.tournamentName || event.homeTeam || "the tournament";
  const verbs = ["captures", "wins", "claims", "takes"];
  const verb = verbs[player.length % verbs.length];
  const editorial = `${f ? f + " " : ""}${player} ${verb} ${tournament}${sc ? " at " + sc : ""}`;
  const thru = score.golfLeaderThru === "F" ? "Final" : score.golfLeaderThru || "";
  const detail = `Round ${score.golfRound || 4} \xB7 ${sc}${thru ? " \xB7 " + thru : ""}`;
  return { editorial, detail, winner: player };
}
function racingEditorial(event, score) {
  if (!score.racingLeader) return null;
  if (score.racingSessionType !== "Race" && score.racingSessionType !== "Sprint") return null;
  const f = flag(score.racingLeaderCountry || "");
  const driver = score.racingLeader;
  const team = score.racingLeaderTeam || "";
  const gpName = String(event.homeTeam || "").trim();
  const isSprint = score.racingSessionType === "Sprint";
  const venue = gpName && !/^(race|sprint)$/i.test(gpName) ? `the ${gpName}` : "the Grand Prix";
  const editorial = `${f ? f + " " : ""}${driver} wins${isSprint ? " the Sprint at" : ""} ${venue}`;
  const detail = `${isSprint ? "Sprint" : "Race"} \xB7 P1${team ? " \xB7 " + team : ""}`;
  return { editorial, detail, winner: driver };
}
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
var TENNIS_ROUND_PHRASE = {
  "Round of 128": "first round",
  "Round of 64": "second round",
  "Round of 32": "third round",
  "Round of 16": "round of 16",
  Quarterfinals: "quarterfinals",
  Semifinals: "semifinals",
  Final: "final"
};
var TENNIS_EARLY_ROUNDS = /* @__PURE__ */ new Set(["Round of 128", "Round of 64", "Round of 32"]);
function tennisEditorial(event, score) {
  if (!score.tennisWinner) return null;
  const p1 = event.tennisPlayer1 || "Player 1";
  const p2 = event.tennisPlayer2 || "Player 2";
  const winnerIsP1 = score.tennisWinner === 1;
  const winner = winnerIsP1 ? p1 : p2;
  const loser = winnerIsP1 ? p2 : p1;
  const winnerSeed = (winnerIsP1 ? event.tennisPlayer1Rank : event.tennisPlayer2Rank) ?? void 0;
  const loserSeed = (winnerIsP1 ? event.tennisPlayer2Rank : event.tennisPlayer1Rank) ?? void 0;
  const tournament = event.tournamentName || "";
  const round = event.tennisRound || "";
  const sets = score.tennisSetScores || [];
  const setStr = sets.length ? sets.map((s) => `${s.p1}\u2013${s.p2}`).join(", ") : "";
  const winnerWonSet = (s) => {
    if (s.winner === 1) return winnerIsP1;
    if (s.winner === 2) return !winnerIsP1;
    const wGames = winnerIsP1 ? s.p1 : s.p2;
    const lGames = winnerIsP1 ? s.p2 : s.p1;
    return wGames > lGames;
  };
  let loserSets = 0;
  for (const s of sets) if (!winnerWonSet(s)) loserSets++;
  const totalSets = sets.length;
  const straightSets = totalSets > 0 && loserSets === 0;
  const fiveSetter = totalSets === 5;
  const cameBackFromTwoDown = fiveSetter && !winnerWonSet(sets[0]) && !winnerWonSet(sets[1]);
  const isUpset = loserSeed !== void 0 && (winnerSeed === void 0 || winnerSeed > loserSeed);
  const seedGap = loserSeed !== void 0 && winnerSeed !== void 0 ? winnerSeed - loserSeed : 99;
  const earlyRound = TENNIS_EARLY_ROUNDS.has(round);
  const roundPhrase = TENNIS_ROUND_PHRASE[round] || "";
  const at = tournament ? ` at ${tournament}` : "";
  let core;
  if (isUpset && loserSeed !== void 0) {
    const verb = winnerSeed === void 0 || seedGap >= 6 ? "stuns" : "upsets";
    core = `${winner} ${verb} ${ordinal(loserSeed)} seed ${loser}`;
    if (cameBackFromTwoDown) core += " after fighting back from two sets down";
    else if (fiveSetter) core += " in a five-set epic";
    else if (straightSets) core += " in straight sets";
    else if (earlyRound && roundPhrase) core += ` in the ${roundPhrase}`;
  } else if (cameBackFromTwoDown) {
    core = `${winner} fights back from two sets down to beat ${loser}`;
  } else if (fiveSetter) {
    core = `${winner} outlasts ${loser} in a five-set marathon`;
  } else if (straightSets && winnerSeed !== void 0 && winnerSeed <= 8) {
    core = `${ordinal(winnerSeed)} seed ${winner} cruises past ${loser} in straight sets`;
  } else if (straightSets) {
    core = `${winner} sees off ${loser} in straight sets`;
  } else {
    const verbs = ["beats", "defeats", "gets past"];
    const verb = verbs[winner.length % verbs.length];
    core = `${winner} ${verb} ${loser}`;
  }
  const editorial = `${core}${at}`;
  const detail = `${round ? round + " \xB7 " : ""}${setStr || "Tennis"}`;
  return { editorial, detail, winner };
}
function cleanCricketResult(s) {
  return s.replace(/\s*\(winners?\)\s*/i, " ").replace(/\b(Won|Beat|Tied|Drawn|Wickets?|Runs?)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, " ").trim();
}
function knockoutCricketHeadline(winner, round, comp) {
  switch (round) {
    case "Final":
      return `${winner} are the ${comp} champions`;
    case "Qualifier 1":
      return `${winner} storm into the ${comp} final`;
    case "Qualifier 2":
      return `${winner} book their place in the ${comp} final`;
    case "Eliminator":
      return `${winner} survive the ${comp} Eliminator`;
    default:
      return `${winner} win the ${comp} ${round}`;
  }
}
function expandTeamCode(code, home, away) {
  const norm2 = code.trim();
  if (!norm2 || /\s/.test(norm2)) return norm2;
  const upper = norm2.toUpperCase().replace(/[^A-Z]/g, "");
  if (upper.length < 2) return norm2;
  for (const team of [home, away]) {
    if (!team) continue;
    if (team.toLowerCase() === norm2.toLowerCase()) return team;
    const inits = team.split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("");
    if (inits.startsWith(upper) || upper.startsWith(inits)) return team;
  }
  return norm2;
}
function expandCricketAbbreviations(text) {
  return text.replace(/(\d+)\s*b\b/gi, "$1 balls").replace(/\bwkts\b/gi, "wickets").replace(/\bwkt\b/gi, "wicket").replace(/\bovs\b/gi, "overs").replace(/\bov\b/gi, "over").replace(/\brem\b\.?/gi, "remaining").replace(/\bD\/?LS?\b/gi, "Duckworth-Lewis").replace(/\s+/g, " ").trim();
}
function expandCricketHeadline(text, home, away) {
  let s = text.trim();
  const m = s.match(/^(.+?)\s+(won|beat|tied|drew|drawn|lost)\b/i);
  if (m) {
    const expanded = expandTeamCode(m[1], home, away);
    s = expanded + s.slice(m[1].length);
  }
  return expandCricketAbbreviations(s);
}
function cricketEditorial(event, score) {
  const resultText = expandCricketHeadline(
    cleanCricketResult((score.period || "").trim()),
    event.homeTeam,
    event.awayTeam
  );
  const hasResult = !!resultText && !/^final$/i.test(resultText);
  const scoreLine = [score.cricketHome, score.cricketAway].filter(Boolean).join(" \xB7 ");
  if (!hasResult && !scoreLine) return null;
  let winner;
  const rt = resultText.toLowerCase();
  if (rt && rt.includes((event.homeTeam || "").toLowerCase())) winner = event.homeTeam;
  else if (rt && rt.includes((event.awayTeam || "").toLowerCase())) winner = event.awayTeam;
  const round = (event.roundName || "").trim();
  const comp = (event.seriesName || event.league || "IPL").trim();
  let editorial;
  if (round && winner) {
    editorial = knockoutCricketHeadline(winner, round, comp);
  } else if (round) {
    editorial = `${comp} ${round}: ${event.homeTeam} vs ${event.awayTeam}`;
  } else {
    editorial = hasResult ? resultText : `${event.homeTeam} vs ${event.awayTeam}`;
  }
  const detailLabel = round ? `${comp} ${round}` : event.league;
  const detail = scoreLine ? `${detailLabel} \xB7 ${scoreLine}` : detailLabel;
  return { editorial, detail, winner };
}
var CHAMPIONSHIP_FINALS = [
  {
    leagueKey: "leagueone",
    season: "2026",
    teams: ["Kobelco Kobe Steelers", "Kubota Spears"],
    competition: "Japan League One"
  }
];
function getChampionshipContext(event) {
  const round = `${event.roundName || event.stage || ""}`.trim();
  if (round && /\b(grand final|final|championship|title)\b/i.test(round) && // Exclude rounds that contain "final" but are NOT the title decider
  // (conference/division finals, the NCAA "Final Four" semifinal, etc.).
  !/semi|quarter|qualif|elimin|conference|division|final four|wild ?card|play.?in/i.test(round)) {
    return { competition: event.seriesName || event.league || "" };
  }
  const home = (event.homeTeam || "").toLowerCase();
  const away = (event.awayTeam || "").toLowerCase();
  let season = "";
  try {
    season = new Date(event.startTimeLocal).getUTCFullYear().toString();
  } catch {
  }
  for (const f of CHAMPIONSHIP_FINALS) {
    if (f.leagueKey !== event.leagueKey || f.season !== season) continue;
    const set = f.teams.map((t) => t.toLowerCase());
    if (set.includes(home) && set.includes(away)) {
      return { competition: f.competition };
    }
  }
  return null;
}
function applyChampionshipContext(entry, event) {
  const ctx = getChampionshipContext(event);
  if (!ctx) return entry;
  const comp = (ctx.competition || event.league || "").trim();
  if (entry.winner && entry.editorial && !/\b(final|champions?|title)\b/i.test(entry.editorial)) {
    entry.editorial = `${entry.editorial} to win the ${comp} title`;
  }
  if (entry.detail && comp && !/final/i.test(entry.detail)) {
    entry.detail = entry.detail.includes(comp) ? entry.detail.replace(comp, `${comp} Final`) : `${entry.detail} \xB7 Final`;
  }
  return entry;
}
function buildEditorial(event, score, series) {
  const sport = (event.sport || "").toLowerCase();
  let res;
  switch (sport) {
    case "hockey":
      res = hockeyEditorial(event, score, series);
      break;
    case "soccer":
      res = soccerEditorial(event, score);
      break;
    case "basketball":
      res = basketballEditorial(event, score);
      break;
    case "rugby":
      res = rugbyEditorial(event, score);
      break;
    case "racing":
      res = racingEditorial(event, score);
      break;
    case "golf":
      res = golfEditorial(event, score);
      break;
    case "tennis":
      res = tennisEditorial(event, score);
      break;
    case "cricket":
      res = cricketEditorial(event, score);
      break;
    default:
      res = null;
  }
  return res ? applyChampionshipContext(res, event) : res;
}
var GENERATED_EVENTS_PATH2 = path5.resolve(process.cwd(), "data", "generatedEvents.json");
async function fetchDailyWrap(tz) {
  const dateLabel = formatDate(tz);
  const { start, end } = getTodayBounds(tz);
  let allEvents = [];
  try {
    const raw = JSON.parse(fs5.readFileSync(GENERATED_EVENTS_PATH2, "utf-8"));
    allEvents = raw.events || [];
  } catch {
    return { date: dateLabel, hasResults: false, results: [] };
  }
  const todayEvents = allEvents.filter((e) => {
    const s = new Date(e.startTimeLocal);
    return s >= start && s <= end;
  });
  let scores = {};
  let seriesStatuses = {};
  if (todayEvents.length > 0) {
    try {
      const sr = await fetchAllLiveScores();
      scores = sr.scores;
      seriesStatuses = sr.seriesStatuses || {};
    } catch {
    }
  }
  const results = [];
  const nowMs = Date.now();
  const fallbackIds = /* @__PURE__ */ new Set();
  const cyclingLatestByTour = {};
  for (const e of todayEvents) {
    if (!isCyclingGrandTour(e)) continue;
    const key = e.homeTeam || e.id;
    const cur = cyclingLatestByTour[key];
    if (!cur || new Date(e.startTimeLocal) > new Date(cur.startTimeLocal)) {
      cyclingLatestByTour[key] = e;
    }
  }
  const cyclingKeepIds = new Set(
    Object.values(cyclingLatestByTour).map((e) => e.id)
  );
  const diamondLeagueLatestByMeet = {};
  for (const e of todayEvents) {
    if (!isDiamondLeague(e)) continue;
    if (!hasConcluded(e, nowMs)) continue;
    const k = diamondLeagueMeetKey(e);
    const key = k ? `${k.season}/${k.meeting}` : e.id;
    const cur = diamondLeagueLatestByMeet[key];
    if (!cur || new Date(e.startTimeLocal) > new Date(cur.startTimeLocal)) {
      diamondLeagueLatestByMeet[key] = e;
    }
  }
  const diamondLeagueKeepIds = new Set(
    Object.values(diamondLeagueLatestByMeet).map((e) => e.id)
  );
  const cricketTestStoryMatchIds = /* @__PURE__ */ new Set();
  for (const event of todayEvents) {
    let score = scores[event.id];
    if (isCricket(event) && (!score || !isFinalScore(score)) && event.endTimeLocal && hasConcluded(event, nowMs, CRICKET_FALLBACK_GRACE_MS)) {
      const espnScore = await fetchEspnCricketResult(event);
      if (espnScore) score = espnScore;
    }
    if (isCricket(event) && event.dayNumber != null && event.totalDays != null) {
      const matchId = event.cricketMatchId || event.id;
      if (score && isFinalScore(score)) {
        if (cricketTestStoryMatchIds.has(matchId)) continue;
        cricketTestStoryMatchIds.add(matchId);
      } else if (!event.isFinalDay) {
        continue;
      }
    }
    if (!score || !isFinalScore(score)) {
      if (isSchoolsRugby(event) && hasConcluded(event, nowMs, SCHOOLS_FALLBACK_GRACE_MS)) {
        const fb = schoolsRugbyFallbackEditorial(event);
        if (fb) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: fb.editorial || "",
            detail: fb.detail || "",
            priorityScore: SCHOOLS_FALLBACK_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isCyclingGrandTour(event) && cyclingKeepIds.has(event.id) && score?.cyclingLeader && hasConcluded(event, nowMs)) {
        const ce = cyclingEditorial(event, score);
        if (ce) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: ce.editorial || "",
            detail: ce.detail || "",
            winner: ce.winner,
            cyclingResult: ce.cyclingResult,
            priorityScore: CYCLING_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isDiamondLeague(event) && diamondLeagueKeepIds.has(event.id) && hasConcluded(event, nowMs)) {
        const de = await diamondLeagueEditorial(event);
        if (de) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: de.editorial || "",
            detail: de.detail || "",
            winner: de.winner,
            athleticsResults: de.athleticsResults,
            athleticsMeet: de.athleticsMeet,
            priorityScore: DIAMOND_LEAGUE_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isWrc(event) && isWrcFinalDay(event) && hasConcluded(event, nowMs) && hasWrcStageMapping(getWrcRoundBaseId(event.id))) {
        const we = await wrcRallyEditorial(event);
        if (we) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: we.editorial || "",
            detail: we.detail || "",
            winner: we.winner,
            priorityScore: WRC_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isSvns(event) && hasConcluded(event, nowMs)) {
        const se = await svnsFinalEditorial(event);
        if (se) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: se.editorial || "",
            detail: se.detail || "",
            winner: se.winner,
            loser: se.loser,
            winnerScore: se.winnerScore,
            loserScore: se.loserScore,
            svnsFinals: se.svnsFinals,
            priorityScore: SVNS_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isCurrieCup(event) && event.endTimeLocal && hasConcluded(event, nowMs, CURRIE_CUP_FALLBACK_GRACE_MS)) {
        const cc = currieCupFallbackEditorial(event);
        if (cc) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: cc.editorial || "",
            detail: cc.detail || "",
            priorityScore: getPriorityScore(event.sport, event.league, void 0),
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isCricket(event) && event.endTimeLocal && hasConcluded(event, nowMs, CRICKET_FALLBACK_GRACE_MS)) {
        const ce = cricketFallbackEditorial(event);
        if (ce) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: ce.editorial || "",
            detail: ce.detail || "",
            priorityScore: getPriorityScore(event.sport, event.league, void 0),
            startTimeLocal: event.startTimeLocal
          });
        }
      } else if (isHorseRacing(event) && hasConcluded(event, nowMs, HORSE_RACING_FALLBACK_GRACE_MS)) {
        const he = horseRacingFallbackEditorial(event);
        if (he) {
          fallbackIds.add(event.id);
          results.push({
            eventId: event.id,
            sport: event.sport,
            league: event.league,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            editorial: he.editorial || "",
            detail: he.detail || "",
            winner: he.winner,
            horseRacingResult: he.horseRacingResult,
            priorityScore: HORSE_RACING_PRIORITY,
            startTimeLocal: event.startTimeLocal
          });
        }
      }
      continue;
    }
    if (event.sport?.toLowerCase() === "racing" && score.racingSessionType && score.racingSessionType !== "Race" && score.racingSessionType !== "Sprint") continue;
    const editorial = buildEditorial(event, score, seriesStatuses[event.id]);
    if (!editorial) continue;
    const priority = getPriorityScore(event.sport, event.league, score);
    results.push({
      eventId: event.id,
      sport: event.sport,
      league: event.league,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      editorial: editorial.editorial || "",
      detail: editorial.detail || "",
      winner: editorial.winner,
      loser: editorial.loser,
      winnerScore: editorial.winnerScore,
      loserScore: editorial.loserScore,
      scoreSnapshot: score,
      priorityScore: priority,
      startTimeLocal: event.startTimeLocal
    });
  }
  results.sort((a, b) => b.priorityScore - a.priorityScore);
  if (results.length < MIN_STORIES) {
    const existingIds = new Set(results.map((r) => r.eventId));
    const lookAhead = buildLookAheadEntries(
      allEvents,
      existingIds,
      nowMs,
      tz,
      MIN_STORIES - results.length
    );
    for (const entry of lookAhead) {
      fallbackIds.add(entry.eventId);
      results.push(entry);
    }
  }
  await enrichWithHighlights(results.filter((r) => !fallbackIds.has(r.eventId)));
  return { date: dateLabel, hasResults: results.length > 0, results };
}

// server/tts.ts
import * as fs6 from "node:fs";
import * as os from "node:os";
import * as path6 from "node:path";
import * as crypto from "node:crypto";
var VOICE_ID = "nPczCjzI2devNBz1zQrb";
var MODEL_ID = "eleven_turbo_v2_5";
var OUTPUT_FORMAT = "mp3_44100_128";
var MAX_TEXT = 600;
var CACHE_DIR = path6.join(os.tmpdir(), "pulse-tts-cache");
var inflight2 = /* @__PURE__ */ new Map();
function cacheKey(text) {
  return crypto.createHash("sha1").update(`${VOICE_ID}:${MODEL_ID}:${OUTPUT_FORMAT}:${text}`).digest("hex");
}
function ttsConfigured() {
  return !!process.env.ELEVENLABS_API_KEY;
}
async function synthesizeHeadline(rawText) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const text = rawText.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT);
  if (!text) return null;
  fs6.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path6.join(CACHE_DIR, `${cacheKey(text)}.mp3`);
  if (fs6.existsSync(file) && fs6.statSync(file).size > 0) return file;
  const existing = inflight2.get(file);
  if (existing) return existing;
  const task = (async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          }
        })
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 200)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = `${file}.${process.pid}.tmp`;
    fs6.writeFileSync(tmp, buf);
    fs6.renameSync(tmp, file);
    return file;
  })().finally(() => inflight2.delete(file));
  inflight2.set(file, task);
  return task;
}

// server/routes.ts
var GENERATED_EVENTS_PATH3 = path7.resolve(
  process.cwd(),
  "data",
  "generatedEvents.json"
);
function loadGeneratedEvents2() {
  try {
    if (!fs7.existsSync(GENERATED_EVENTS_PATH3)) return null;
    const raw = fs7.readFileSync(GENERATED_EVENTS_PATH3, "utf-8");
    const data = JSON.parse(raw);
    return data;
  } catch {
    return null;
  }
}
async function registerRoutes(app2) {
  app2.get("/api/events", (req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events || generated.events.length === 0) {
      const fallbackPath = path7.resolve(
        process.cwd(),
        "data",
        "masterGuide.json"
      );
      try {
        const fallback = JSON.parse(fs7.readFileSync(fallbackPath, "utf-8"));
        return res.json({
          source: "fallback",
          lastUpdated: null,
          events: fallback.events || []
        });
      } catch {
        return res.json({ source: "fallback", lastUpdated: null, events: [] });
      }
    }
    const daysParam = parseInt(req.query.days, 10) || 30;
    const now = /* @__PURE__ */ new Date();
    const cutoff = new Date(now.getTime() + daysParam * 864e5);
    const startCutoff = new Date(now.getTime() - 14 * 864e5);
    const filtered = generated.events.filter((e) => {
      const start = new Date(e.startTimeLocal);
      return start >= startCutoff && start <= cutoff;
    });
    const nwslFirstMatchDate = generated.generatedMeta?.sources?.nwsl?.firstMatchDate || null;
    const uslFirstMatchDate = generated.generatedMeta?.sources?.usl?.firstMatchDate || null;
    const championsCupFirstMatchDate = generated.generatedMeta?.sources?.championsCup?.firstMatchDate || null;
    const mlrFirstMatchDate = generated.generatedMeta?.sources?.mlr?.firstMatchDate || null;
    const faCupFirstMatchDate = generated.generatedMeta?.sources?.faCup?.firstMatchDate || null;
    return res.json({
      source: "generated",
      lastUpdated: generated.lastUpdated,
      events: filtered,
      leagueSeasonStarts: {
        ...nwslFirstMatchDate ? { nwsl: nwslFirstMatchDate } : {},
        ...uslFirstMatchDate ? { usl: uslFirstMatchDate } : {},
        ...championsCupFirstMatchDate ? { championscup: championsCupFirstMatchDate } : {},
        ...mlrFirstMatchDate ? { mlr: mlrFirstMatchDate } : {},
        ...faCupFirstMatchDate ? { facup: faCupFirstMatchDate } : {}
      }
    });
  });
  app2.get("/api/scores", async (_req, res) => {
    try {
      const result = await fetchAllLiveScores();
      res.json(result);
    } catch (err) {
      console.error("[scores] Error fetching live scores:", err);
      res.status(500).json({ error: "Failed to fetch live scores" });
    }
  });
  app2.get("/api/daily-wrap", async (req, res) => {
    try {
      const tz = parseInt(req.query.tz, 10) || 0;
      const result = await fetchDailyWrap(tz);
      res.json(result);
    } catch (err) {
      console.error("[daily-wrap] Error:", err);
      res.status(500).json({ error: "Failed to build daily wrap" });
    }
  });
  const handleDailyWrapAudio = async (req, res) => {
    try {
      const text = req.query.text ?? "";
      if (!text.trim()) {
        res.status(400).json({ error: "text query param required" });
        return;
      }
      if (!ttsConfigured()) {
        res.status(503).json({ error: "voiceover not configured" });
        return;
      }
      const file = await synthesizeHeadline(text);
      if (!file) {
        res.status(500).json({ error: "voiceover unavailable" });
        return;
      }
      res.sendFile(file, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400"
        },
        acceptRanges: true
      }, (err) => {
        if (err && !res.headersSent) {
          console.error("[tts] sendFile error:", err);
          res.status(500).end();
        }
      });
    } catch (err) {
      console.error("[tts] Error:", err);
      res.status(502).json({ error: "voiceover failed" });
    }
  };
  app2.get("/api/daily-wrap/audio.mp3", handleDailyWrapAudio);
  app2.get("/api/daily-wrap/audio", handleDailyWrapAudio);
  app2.get("/api/debug/live-event", async (req, res) => {
    try {
      const eventId = req.query.id;
      if (!eventId) return res.status(400).json({ error: "id query param required" });
      const result = await fetchAllLiveScores();
      const raw = result.scores[eventId];
      if (!raw) return res.json({ eventId, found: false, availableIds: Object.keys(result.scores).filter((k) => k.includes("rugby") || k.includes("leagueone")).slice(0, 20) });
      const normalized = { ...raw };
      if (normalized.clock && /^live$/i.test(normalized.clock)) {
        normalized.clock = void 0;
      }
      if (normalized.period && normalized.clock && normalized.period.trim() === normalized.clock.trim()) {
        normalized.period = void 0;
      }
      let displayClockText = "";
      const p = normalized.period || "";
      const c = normalized.clock || "";
      if (p === "HT" || p === "FT") {
        displayClockText = p;
      } else if (p && c) {
        displayClockText = `${p} ${c}`;
      } else if (c) {
        displayClockText = c;
      }
      res.json({ eventId, rawLiveStatus: raw, normalizedLiveStatus: normalized, displayClockText });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app2.get("/api/svns-matches/:city", async (req, res) => {
    try {
      const city = decodeURIComponent(req.params.city);
      const result = await fetchSvnsMatches(city);
      return res.json(result);
    } catch (err) {
      console.error("[svns-matches] Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/wrc-stages/:roundId", async (req, res) => {
    try {
      const roundId = getWrcRoundBaseId(decodeURIComponent(req.params.roundId));
      const result = await fetchWrcStages(roundId);
      return res.json(result);
    } catch (err) {
      console.error("[wrc-stages] Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/odds/sports", async (_req, res) => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ODDS_API_KEY not configured" });
    }
    try {
      const url = `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`;
      console.log("[odds/sports] Fetching sports list...");
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Odds API returned ${response.status}: ${response.statusText}`
        });
      }
      const data = await response.json();
      const trimmed = data.map((s) => ({
        key: s.key,
        group: s.group,
        title: s.title,
        description: s.description,
        active: s.active
      }));
      return res.json({ count: trimmed.length, sports: trimmed });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/odds/test", async (req, res) => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ODDS_API_KEY not configured" });
    }
    const sportKey = req.query.sportKey;
    if (!sportKey) {
      return res.status(400).json({ error: "sportKey query param required" });
    }
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${apiKey}`;
      console.log(`[odds/test] Fetching events for sportKey=${sportKey}...`);
      const response = await fetch(url);
      if (!response.ok) {
        return res.json({
          sportKey,
          status: response.status,
          statusText: response.statusText,
          eventCount: 0,
          sample: []
        });
      }
      const events = await response.json();
      const sample = events.slice(0, 2).map((e) => ({
        id: e.id,
        commence_time: e.commence_time,
        home_team: e.home_team,
        away_team: e.away_team
      }));
      return res.json({
        sportKey,
        status: 200,
        eventCount: events.length,
        sample
      });
    } catch (err) {
      return res.status(500).json({ sportKey, error: err.message });
    }
  });
  app2.get("/logo-reference", (_req, res) => {
    const filePath = path7.resolve(process.cwd(), "server", "templates", "logo-reference.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(filePath);
  });
  app2.post("/api/refresh", (req, res) => {
    const daysParam = parseInt(req.query.days, 10) || 14;
    const scriptPath = path7.resolve(process.cwd(), "scripts", "updateSchedule.ts");
    console.log(`[refresh] Running updateSchedule.ts --days=${daysParam}...`);
    execFile(
      "npx",
      ["tsx", scriptPath, `--days=${daysParam}`],
      {
        cwd: process.cwd(),
        timeout: 6e4,
        env: { ...process.env }
      },
      (error, stdout, stderr) => {
        if (stdout) console.log("[refresh] stdout:", stdout);
        if (stderr) console.error("[refresh] stderr:", stderr);
        if (error) {
          console.error("[refresh] Script failed:", error.message);
          return res.status(500).json({
            success: false,
            error: error.message
          });
        }
        const generated = loadGeneratedEvents2();
        return res.json({
          success: true,
          lastUpdated: generated?.lastUpdated || null,
          eventCount: generated?.events?.length || 0,
          nhlCount: generated?.nhlCount ?? 0,
          ahlCount: generated?.ahlCount ?? 0,
          ahlSourceUsed: generated?.ahlSourceUsed ?? "unknown",
          ahlAdded: generated?.ahlAdded ?? 0,
          ahlUpdated: generated?.ahlUpdated ?? 0,
          ahlPruned: generated?.ahlPruned ?? 0,
          echlCount: generated?.echlCount ?? 0,
          echlAdded: generated?.echlAdded ?? 0,
          echlUpdated: generated?.echlUpdated ?? 0,
          echlPruned: generated?.echlPruned ?? 0,
          echlSourceUsed: generated?.echlSourceUsed ?? "unknown",
          echlWebCount: generated?.echlWebCount ?? 0,
          buCount: generated?.buCount ?? 0,
          buAdded: generated?.buAdded ?? 0,
          buUpdated: generated?.buUpdated ?? 0,
          buPruned: generated?.buPruned ?? 0,
          buSourceUsed: generated?.buSourceUsed ?? "unknown",
          rugbyCount: generated?.rugbyCount ?? 0,
          rugbyAdded: generated?.rugbyAdded ?? 0,
          rugbyUpdated: generated?.rugbyUpdated ?? 0,
          rugbyPruned: generated?.rugbyPruned ?? 0,
          rugbySourceUsed: generated?.rugbySourceUsed ?? "unknown",
          rugbyCounts: generated?.rugbyCounts ?? {},
          cricketCount: generated?.cricketCount ?? 0,
          cricketAdded: generated?.cricketAdded ?? 0,
          cricketUpdated: generated?.cricketUpdated ?? 0,
          cricketPruned: generated?.cricketPruned ?? 0,
          cricketSourceUsed: generated?.cricketSourceUsed ?? "unknown",
          cricketCounts: generated?.cricketCounts ?? {},
          iccT20WcCount: generated?.iccT20WcCount ?? 0,
          iccT20WcAdded: generated?.iccT20WcAdded ?? 0,
          iccT20WcUpdated: generated?.iccT20WcUpdated ?? 0,
          iccT20WcPruned: generated?.iccT20WcPruned ?? 0,
          iccT20WcSourceUsed: generated?.iccT20WcSourceUsed ?? "unknown",
          t20wcDedupedCount: generated?.t20wcDedupedCount ?? 0,
          olympicHockeyCount: generated?.olympicHockeyCount ?? 0,
          olympicHockeyAdded: generated?.olympicHockeyAdded ?? 0,
          olympicHockeyUpdated: generated?.olympicHockeyUpdated ?? 0,
          olympicHockeyPruned: generated?.olympicHockeyPruned ?? 0,
          olympicHockeySourceUsed: generated?.olympicHockeySourceUsed ?? "unknown",
          eplCount: generated?.eplCount ?? 0,
          eplAdded: generated?.eplAdded ?? 0,
          eplUpdated: generated?.eplUpdated ?? 0,
          eplPruned: generated?.eplPruned ?? 0,
          eplSourceUsed: generated?.eplSourceUsed ?? "unknown",
          mlsCount: generated?.mlsCount ?? 0,
          mlsAdded: generated?.mlsAdded ?? 0,
          mlsUpdated: generated?.mlsUpdated ?? 0,
          mlsPruned: generated?.mlsPruned ?? 0,
          mlsSourceUsed: generated?.mlsSourceUsed ?? "unknown",
          serieaCount: generated?.serieaCount ?? 0,
          serieaAdded: generated?.serieaAdded ?? 0,
          serieaUpdated: generated?.serieaUpdated ?? 0,
          serieaPruned: generated?.serieaPruned ?? 0,
          serieaSourceUsed: generated?.serieaSourceUsed ?? "unknown",
          laligaCount: generated?.laligaCount ?? 0,
          laligaAdded: generated?.laligaAdded ?? 0,
          laligaUpdated: generated?.laligaUpdated ?? 0,
          laligaPruned: generated?.laligaPruned ?? 0,
          laligaSourceUsed: generated?.laligaSourceUsed ?? "unknown",
          bundesligaCount: generated?.bundesligaCount ?? 0,
          bundesligaAdded: generated?.bundesligaAdded ?? 0,
          bundesligaUpdated: generated?.bundesligaUpdated ?? 0,
          bundesligaPruned: generated?.bundesligaPruned ?? 0,
          bundesligaSourceUsed: generated?.bundesligaSourceUsed ?? "unknown",
          ligue1Count: generated?.ligue1Count ?? 0,
          ligue1Added: generated?.ligue1Added ?? 0,
          ligue1Updated: generated?.ligue1Updated ?? 0,
          ligue1Pruned: generated?.ligue1Pruned ?? 0,
          ligue1SourceUsed: generated?.ligue1SourceUsed ?? "unknown",
          nwslCount: generated?.nwslCount ?? 0,
          nwslAdded: generated?.nwslAdded ?? 0,
          nwslUpdated: generated?.nwslUpdated ?? 0,
          nwslPruned: generated?.nwslPruned ?? 0,
          nwslSourceUsed: generated?.nwslSourceUsed ?? "unknown",
          uslCount: generated?.uslCount ?? 0,
          uslAdded: generated?.uslAdded ?? 0,
          uslUpdated: generated?.uslUpdated ?? 0,
          uslPruned: generated?.uslPruned ?? 0,
          uslSourceUsed: generated?.uslSourceUsed ?? "unknown",
          tennisCount: generated?.tennisCount ?? 0,
          tennisAdded: generated?.tennisAdded ?? 0,
          tennisUpdated: generated?.tennisUpdated ?? 0,
          tennisPruned: generated?.tennisPruned ?? 0,
          tennisSourceUsed: generated?.tennisSourceUsed ?? "unknown",
          tennisTournamentCounts: generated?.tennisTournamentCounts ?? {},
          golfCount: generated?.golfCount ?? 0,
          golfAdded: generated?.golfAdded ?? 0,
          golfUpdated: generated?.golfUpdated ?? 0,
          golfPruned: generated?.golfPruned ?? 0,
          golfSourceUsed: generated?.golfSourceUsed ?? "unknown",
          golfTournamentCounts: generated?.golfTournamentCounts ?? {}
        });
      }
    );
  });
  app2.get("/api/meta", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.generatedMeta) {
      return res.json({ error: "No metadata available. Run a refresh first." });
    }
    return res.json(generated.generatedMeta);
  });
  app2.get("/api/debug/echl-check", async (_req, res) => {
    const apiKey = process.env.API_HOCKEY_KEY;
    if (!apiKey) {
      return res.json({ error: "API_HOCKEY_KEY not configured", conclusion: "Cannot test \u2014 no API key." });
    }
    const API_HOCKEY_BASE = "https://v1.hockey.api-sports.io";
    const LEAGUE_CACHE_PATH = path7.resolve(process.cwd(), "data", "leagueIds.json");
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let cachedLeagueId = null;
    try {
      const raw = fs7.readFileSync(LEAGUE_CACHE_PATH, "utf-8");
      const cache7 = JSON.parse(raw);
      cachedLeagueId = cache7.echlLeagueId || null;
    } catch {
    }
    let leagueId = cachedLeagueId || 59;
    const seasonsToTry = [2024, 2025, 2026];
    const seasonResults = [];
    for (const season of seasonsToTry) {
      try {
        const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&season=${season}&date=${today}`;
        const r = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        const data = await r.json();
        const errors = data.errors && Object.keys(data.errors).length > 0 ? data.errors : null;
        const games = data.response || [];
        const entry = {
          season,
          date: today,
          status: errors ? "error" : "ok",
          errorDetail: errors || void 0,
          gameCount: games.length
        };
        if (games.length > 0) {
          const g = games[0];
          entry.sampleGame = {
            id: g.id,
            date: g.date,
            time: g.time,
            home: g.teams?.home?.name,
            away: g.teams?.away?.name,
            statusShort: g.status?.short
          };
        }
        seasonResults.push(entry);
      } catch (err) {
        seasonResults.push({ season, date: today, status: "fetch_error", errorDetail: err.message, gameCount: 0 });
      }
    }
    let noSeasonResult = null;
    try {
      const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&date=${today}`;
      const r = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      const data = await r.json();
      const errors = data.errors && Object.keys(data.errors).length > 0 ? data.errors : null;
      const games = data.response || [];
      noSeasonResult = {
        date: today,
        status: errors ? "error" : "ok",
        errorDetail: errors || void 0,
        gameCount: games.length
      };
      if (games.length > 0) {
        const g = games[0];
        noSeasonResult.sampleGame = {
          id: g.id,
          date: g.date,
          time: g.time,
          home: g.teams?.home?.name,
          away: g.teams?.away?.name,
          statusShort: g.status?.short
        };
      }
    } catch (err) {
      noSeasonResult = { date: today, status: "fetch_error", errorDetail: err.message, gameCount: 0 };
    }
    const working = seasonResults.find((s) => s.status === "ok" && s.gameCount > 0);
    const okButEmpty = seasonResults.find((s) => s.status === "ok" && s.gameCount === 0);
    const allBlocked = seasonResults.every((s) => s.status === "error");
    let conclusion;
    if (working) {
      conclusion = `Season ${working.season} returns ${working.gameCount} games for ${today}. Use this season.`;
    } else if (allBlocked) {
      conclusion = "All tested seasons are blocked by the free plan. An API upgrade is needed.";
    } else if (okButEmpty) {
      conclusion = `Season ${okButEmpty.season} is accessible but has 0 games for ${today} (may be an off-day). Try again on a game day.`;
    } else {
      conclusion = "Mixed results. Review seasonsTried for details.";
    }
    if (working) {
      try {
        const cache7 = JSON.parse(fs7.readFileSync(LEAGUE_CACHE_PATH, "utf-8"));
        cache7.echlCurrentSeason = working.season;
        cache7.lastResolved = (/* @__PURE__ */ new Date()).toISOString();
        fs7.writeFileSync(LEAGUE_CACHE_PATH, JSON.stringify(cache7, null, 2));
        conclusion += ` (Updated cache to season ${working.season}.)`;
      } catch {
      }
    }
    return res.json({
      cachedLeagueId,
      leagueIdUsed: leagueId,
      dateChecked: today,
      seasonsTried: seasonResults,
      noSeasonCall: noSeasonResult,
      conclusion
    });
  });
  app2.get("/api/debug/sources", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ nhl: 0, ahl: 0, echl: 0, total: 0 });
    }
    const events = generated.events;
    const nhl = events.filter((e) => e.source === "nhl").length;
    const ahlHt = events.filter((e) => e.source === "ahl-hockeytech").length;
    const ahlOdds = events.filter((e) => e.source === "ahl-odds").length;
    const ahl = ahlHt + ahlOdds;
    const echl = events.filter((e) => (e.source || "").startsWith("echl")).length;
    const ncaa = events.filter((e) => (e.source || "").startsWith("ncaa")).length;
    const rugby = events.filter((e) => e.source === "rugby").length;
    const championsCup = events.filter((e) => e.source === "rugby-championscup").length;
    const challengeCup = events.filter((e) => e.source === "rugby-challengecup").length;
    const mlr = events.filter((e) => e.source === "rugby-mlr").length;
    const svnsSessions = events.filter((e) => e.leagueKey === "svns" && e.eventType === "session").length;
    const sixnationsCount = events.filter((e) => e.leagueKey === "sixnations").length;
    const cricket = events.filter((e) => (e.source || "").startsWith("cricket") && e.source !== "cricket-t20wc-schedule").length;
    const iccT20Wc = events.filter((e) => e.source === "cricket-t20wc-schedule").length;
    const cricketTotal = cricket + iccT20Wc;
    const olympicHockey = events.filter((e) => e.source === "olympic-hockey-2026").length;
    const epl = events.filter((e) => e.source === "soccer-epl").length;
    const mls = events.filter((e) => e.source === "soccer-mls").length;
    const serieA = events.filter((e) => e.source === "soccer-seriea").length;
    const laLiga = events.filter((e) => e.source === "soccer-laliga").length;
    const bundesliga = events.filter((e) => e.source === "soccer-bundesliga").length;
    const ligue1 = events.filter((e) => e.source === "soccer-ligue1").length;
    const nwsl = events.filter((e) => e.source === "soccer-nwsl").length;
    const usl = events.filter((e) => e.source === "soccer-usl").length;
    const championsLeague = events.filter((e) => e.source === "soccer-championsleague").length;
    const faCup = events.filter((e) => e.source === "soccer-facup").length;
    const soccerTotal = epl + mls + serieA + laLiga + bundesliga + ligue1 + nwsl + usl + championsLeague + faCup;
    const rugbyTotal = rugby + championsCup + challengeCup + mlr;
    const tennis = events.filter((e) => e.source === "tennis-hardcoded").length;
    const golf = events.filter((e) => e.source === "golf-hardcoded").length;
    const other = events.length - nhl - ahl - echl - ncaa - rugbyTotal - cricketTotal - olympicHockey - soccerTotal - tennis - golf;
    return res.json({
      nhl,
      ahl,
      ahlHockeyTech: ahlHt,
      ahlOdds,
      echl,
      ncaa,
      rugby,
      championsCup,
      challengeCup,
      mlr,
      rugbyTotal,
      svnsSessions,
      sixnationsCount,
      cricket,
      iccT20Wc,
      cricketTotal,
      olympicHockey,
      epl,
      mls,
      serieA,
      laLiga,
      bundesliga,
      ligue1,
      nwsl,
      usl,
      championsLeague,
      faCup,
      soccerTotal,
      tennis,
      golf,
      other,
      total: events.length,
      lastUpdated: generated.lastUpdated,
      ahlSourceUsed: generated.ahlSourceUsed ?? "unknown",
      echlSourceUsed: generated.echlSourceUsed ?? "unknown",
      echlWebCount: generated.echlWebCount ?? 0,
      buSourceUsed: generated.buSourceUsed ?? "unknown",
      rugbySourceUsed: generated.rugbySourceUsed ?? "unknown",
      rugbyCounts: generated.rugbyCounts ?? {},
      cricketSourceUsed: generated.cricketSourceUsed ?? "unknown",
      cricketCounts: generated.cricketCounts ?? {},
      iccT20WcSourceUsed: generated.iccT20WcSourceUsed ?? "unknown",
      iccT20WcCount: generated.iccT20WcCount ?? 0,
      t20wcDedupedCount: generated.t20wcDedupedCount ?? 0
    });
  });
  const NARRATIVES_PATH = path7.resolve(process.cwd(), "data", "generatedNarratives.json");
  const MOVEMENT_CACHE_PATH = path7.resolve(process.cwd(), "data", "playerMovementCache.json");
  function loadNarratives() {
    try {
      if (!fs7.existsSync(NARRATIVES_PATH)) return null;
      return JSON.parse(fs7.readFileSync(NARRATIVES_PATH, "utf-8"));
    } catch {
      return null;
    }
  }
  app2.get("/api/narratives", (_req, res) => {
    const data = loadNarratives();
    if (!data || !data.cards) {
      return res.json({ cards: [], lastUpdated: null });
    }
    return res.json({ cards: data.cards, lastUpdated: data.lastUpdated, tonightStory: data.tonightStory || null, todaysStories: data.todaysStories || (data.tonightStory ? [data.tonightStory] : []), monthSnapshot: data.monthSnapshot || null });
  });
  app2.get("/api/debug/explore-narratives", (_req, res) => {
    const data = loadNarratives();
    if (!data) {
      return res.json({ error: "No narratives generated yet. Run a refresh or rebuild." });
    }
    const eventsData = loadGeneratedEvents2();
    const eventMap = new Map((eventsData?.events || []).map((e) => [e.id, e]));
    const enriched = (data.cards || []).map((card) => {
      const eventIds = card.meta?.eventIds || [];
      const teamEventIds = (card.meta?.teams || []).flatMap((t) => t.eventIds || []);
      const allIds = [.../* @__PURE__ */ new Set([...eventIds, ...teamEventIds])];
      const eventsDetail = allIds.map((id) => {
        const e = eventMap.get(id);
        return e ? { id, league: e.league, sport: e.sport, homeTeam: e.homeTeam, awayTeam: e.awayTeam, startTimeLocal: e.startTimeLocal } : { id, missing: true };
      });
      return {
        id: card.id,
        kind: card.kind,
        title: card.title,
        team: card.meta?.team || null,
        league: card.meta?.league || null,
        region: card.region || null,
        priority: card.priority,
        eventCount: allIds.length,
        eventsDetail,
        inclusionReason: card.meta?.team && card.meta?.league ? "filteredByTeamAndLeague" : allIds.length > 0 ? "cardEventIds" : "noEvents"
      };
    });
    return res.json({ cards: enriched, debug: data.debug || {}, generatedAt: data.generatedAt, tonightStory: data.tonightStory || null });
  });
  app2.get("/api/debug/player-movement", (_req, res) => {
    try {
      if (!fs7.existsSync(MOVEMENT_CACHE_PATH)) {
        return res.json({ history: {}, movements: [], lastUpdated: null, summary: { playersTracked: 0, recentMovements: 0 } });
      }
      const cache7 = JSON.parse(fs7.readFileSync(MOVEMENT_CACHE_PATH, "utf-8"));
      const history = cache7.history || {};
      const movements = cache7.movements || [];
      const sampleTeams = ["ANA", "BOS"];
      const sampleHistory = {};
      for (const team of sampleTeams) {
        sampleHistory[team] = [];
        for (const [playerId, entry] of Object.entries(history)) {
          const sightings = entry.sightings || [];
          const onTeam = sightings.some((s) => s.teamAbbrev === team);
          if (onTeam && sampleHistory[team].length < 5) {
            sampleHistory[team].push({ playerId, name: entry.name, sightings: sightings.slice(-3) });
          }
        }
      }
      return res.json({
        lastUpdated: cache7.lastUpdated,
        lastRunMeta: cache7.lastRunMeta || null,
        summary: {
          playersTracked: Object.keys(history).length,
          recentMovements: movements.length,
          observedTeamsLastRun: cache7.lastRunMeta?.observedTeams || [],
          skippedTeamsLastRun: cache7.lastRunMeta?.skippedTeams || [],
          movementsDetectedLastRun: cache7.lastRunMeta?.movementsDetectedThisRun || []
        },
        movements,
        sampleHistoryFor: sampleHistory
      });
    } catch {
      return res.json({ error: "Failed to read player movement cache" });
    }
  });
  app2.post("/api/rebuild-explore", (req, res) => {
    const scriptPath = path7.resolve(process.cwd(), "scripts", "exploreNarratives.ts");
    const simulate = req.query.simulateMovement === "1" && process.env.NODE_ENV !== "production";
    const args = ["tsx", scriptPath];
    if (simulate) args.push("--simulate-movement");
    execFile(
      "npx",
      args,
      { cwd: process.cwd(), timeout: 6e4, env: { ...process.env } },
      (error, stdout, stderr) => {
        if (stdout) console.log("[rebuild-explore] stdout:", stdout);
        if (stderr) console.error("[rebuild-explore] stderr:", stderr);
        if (error) {
          return res.status(500).json({ success: false, error: error.message });
        }
        const data = loadNarratives();
        return res.json({
          success: true,
          cardCount: data?.cards?.length ?? 0,
          cards: data?.cards ?? [],
          lastUpdated: data?.lastUpdated ?? null,
          simulateMovement: simulate
        });
      }
    );
  });
  app2.get("/api/debug/cricket-sample", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const cricketEvents = generated.events.filter((e) => (e.source || "").startsWith("cricket")).slice(0, 10);
    const sample = cricketEvents.map((e) => ({
      id: e.id,
      league: e.league,
      competitionName: e.competitionName,
      seriesName: e.seriesName,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      gender: e.gender || "unknown",
      isIccT20Wc: e.isIccT20Wc || false,
      competitionType: e.competitionType,
      hostCountry: e.hostCountry,
      providerId: e.providerId
    }));
    const allCricket = generated.events.filter((e) => (e.source || "").startsWith("cricket"));
    const byGender = {};
    for (const e of allCricket) {
      const g = e.gender || "unknown";
      byGender[g] = (byGender[g] || 0) + 1;
    }
    return res.json({ total: allCricket.length, byGender, sample });
  });
  app2.get("/api/debug/soccer-favorites-sample", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const masterPath = path7.resolve(process.cwd(), "data", "masterGuide.json");
    const aliasPath = path7.resolve(process.cwd(), "data", "favoriteAliases.json");
    let soccerFavorites = {};
    let aliasMap = {};
    try {
      const mg = JSON.parse(fs7.readFileSync(masterPath, "utf-8"));
      soccerFavorites = mg.favorites?.soccer ?? {};
      aliasMap = JSON.parse(fs7.readFileSync(aliasPath, "utf-8"));
    } catch {
    }
    const eplVariants = {
      "tottenham hotspur": ["tottenham", "spurs", "tottenham hotspur fc"],
      "manchester united": ["man utd", "man united", "manchester utd", "manchester united fc"],
      "manchester city": ["man city", "manchester city fc"],
      "nottingham forest": ["nott'm forest", "nottingham forest fc", "notts forest"],
      "newcastle united": ["newcastle", "newcastle utd", "newcastle united fc"],
      "west ham united": ["west ham", "west ham utd", "west ham united fc"],
      "wolverhampton wanderers": ["wolves", "wolverhampton", "wolverhampton wanderers fc"],
      "brighton and hove albion": ["brighton", "brighton & hove albion", "brighton and hove albion fc"],
      "crystal palace": ["crystal palace fc"],
      "aston villa": ["aston villa fc"],
      "bournemouth": ["afc bournemouth", "bournemouth fc"],
      "brentford": ["brentford fc"],
      "burnley": ["burnley fc"],
      "chelsea": ["chelsea fc"],
      "everton": ["everton fc"],
      "fulham": ["fulham fc"],
      "leeds": ["leeds united", "leeds utd", "leeds united fc"],
      "liverpool": ["liverpool fc"],
      "arsenal": ["arsenal fc"],
      "sunderland": ["sunderland afc", "sunderland fc"]
    };
    const variantMap = /* @__PURE__ */ new Map();
    for (const [canonical, variants] of Object.entries(eplVariants)) {
      variantMap.set(canonical, canonical);
      for (const v of variants) variantMap.set(v, canonical);
    }
    function norm2(s) {
      let n = s.trim().toLowerCase().replace(/\s+fc$/i, "").replace(/\s+/g, " ");
      return n;
    }
    function normEpl(s) {
      const n = norm2(s);
      return variantMap.get(n) ?? n;
    }
    const expandedSet = /* @__PURE__ */ new Set();
    const canonicalSet = /* @__PURE__ */ new Set();
    for (const league of Object.keys(soccerFavorites)) {
      for (const team of soccerFavorites[league]) {
        const n = norm2(team);
        expandedSet.add(n);
        canonicalSet.add(n);
        const aliases = aliasMap[team];
        if (aliases) {
          for (const a of aliases) expandedSet.add(norm2(a));
        }
      }
    }
    const now = Date.now();
    const eplEvents = generated.events.filter((e) => e.source === "soccer-epl").filter((e) => new Date(e.startTimeLocal).getTime() >= now).sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()).slice(0, 5);
    const sample = eplEvents.map((e) => {
      const rawHome = norm2(e.homeTeam);
      const rawAway = norm2(e.awayTeam);
      const normHome = normEpl(e.homeTeam);
      const normAway = normEpl(e.awayTeam);
      const rawMatch = expandedSet.has(rawHome) ? e.homeTeam : expandedSet.has(rawAway) ? e.awayTeam : null;
      const normMatch = expandedSet.has(normHome) ? normHome : expandedSet.has(normAway) ? normAway : null;
      const isFavorite = !!(rawMatch || normMatch);
      let reason = "";
      if (rawMatch) reason = canonicalSet.has(norm2(rawMatch)) ? "canonical" : "alias";
      else if (normMatch) reason = canonicalSet.has(normMatch) ? "canonical-via-norm" : "alias-via-norm";
      return {
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        normalizedHome: normHome,
        normalizedAway: normAway,
        isFavorite,
        favoriteMatchReason: reason
      };
    });
    return res.json({
      configuredFavorites: soccerFavorites,
      expandedAliases: [...expandedSet],
      sample
    });
  });
  app2.get("/api/debug/favorites", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const masterPath = path7.resolve(process.cwd(), "data", "masterGuide.json");
    const aliasPath = path7.resolve(process.cwd(), "data", "favoriteAliases.json");
    let allFavorites = {};
    let aliasMap = {};
    try {
      const mg = JSON.parse(fs7.readFileSync(masterPath, "utf-8"));
      allFavorites = mg.favorites ?? {};
      aliasMap = JSON.parse(fs7.readFileSync(aliasPath, "utf-8"));
    } catch {
    }
    function stripDiacritics(s) {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    function norm2(s) {
      let n = s.trim().toLowerCase();
      n = stripDiacritics(n);
      n = n.replace(/\s+fc$/i, "").replace(/\s+/g, " ");
      return n;
    }
    const expandedSet = /* @__PURE__ */ new Set();
    const canonicalSet = /* @__PURE__ */ new Set();
    for (const sport of Object.keys(allFavorites)) {
      const sportFavs = allFavorites[sport];
      for (const league of Object.keys(sportFavs)) {
        for (const team of sportFavs[league]) {
          const n = norm2(team);
          expandedSet.add(n);
          canonicalSet.add(n);
          const aliases = aliasMap[team];
          if (aliases) {
            for (const a of aliases) expandedSet.add(norm2(a));
          }
        }
      }
    }
    const now = Date.now();
    const upcoming = generated.events.filter((e) => new Date(e.startTimeLocal).getTime() >= now).sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()).slice(0, 100);
    const results = upcoming.map((e) => {
      const nHome = norm2(e.homeTeam);
      const nAway = norm2(e.awayTeam);
      const homeMatch = expandedSet.has(nHome);
      const awayMatch = expandedSet.has(nAway);
      const isFavorite = homeMatch || awayMatch;
      let reason = "";
      if (homeMatch) reason = canonicalSet.has(nHome) ? `canonical:${e.homeTeam}` : `alias:${e.homeTeam}`;
      else if (awayMatch) reason = canonicalSet.has(nAway) ? `canonical:${e.awayTeam}` : `alias:${e.awayTeam}`;
      return {
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        league: e.league,
        sport: e.sport,
        startTimeLocal: e.startTimeLocal,
        isFavorite,
        favoriteMatchReason: reason || null
      };
    });
    const favOnly = results.filter((r) => r.isFavorite).slice(0, 10);
    return res.json({
      configuredFavorites: allFavorites,
      expandedAliasCount: expandedSet.size,
      nextFavoriteEvents: favOnly,
      totalUpcomingScanned: upcoming.length
    });
  });
  app2.get("/api/debug/cricket-raw", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const results = await fetchRawCricketMatches(Math.min(limit, 500));
      return res.json({ total: results.length, matches: results });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/debug/cricket-find", async (req, res) => {
    try {
      const q = req.query.q || "";
      if (!q) return res.json({ error: "provide ?q= parameter", matches: [] });
      const results = await searchRawCricketMatches(q);
      return res.json({ query: q, total: results.length, matches: results });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/debug/cricket-by-date", async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const all = await fetchRawCricketMatches(500);
      const now = /* @__PURE__ */ new Date();
      const cutoff = new Date(now.getTime() + days * 864e5);
      const inWindow = all.filter((m) => {
        const t = new Date(m.startTime);
        return t >= now && t <= cutoff;
      });
      const results = inWindow.slice(0, 200).map((m) => ({
        competitionName: m.competitionName,
        seriesName: m.seriesName,
        matchName: m.matchName,
        startTime: m.startTime,
        matchType: m.matchType,
        isInternational: m.isInternational,
        includeReason: m.includeReason,
        excludedReason: m.excludedReason
      }));
      return res.json({
        days,
        totalRawFetched: all.length,
        inWindow: results.length,
        matches: results
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/debug/nhl-provider-sample", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const now = /* @__PURE__ */ new Date();
    const nhlUpcoming = generated.events.filter((e) => e.source === "nhl" && new Date(e.startTimeLocal) > now).sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()).slice(0, 5);
    const sample = nhlUpcoming.map((e) => ({
      id: e.id,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      startTimeLocal: e.startTimeLocal,
      broadcastNetworks: e.broadcastNetworks || [],
      isNational: e.isNational ?? false,
      providerId: e.providerId,
      providerReason: e.providerReason || "unknown"
    }));
    const allNhl = generated.events.filter((e) => e.source === "nhl");
    const byReason = {};
    for (const e of allNhl) {
      const r = e.providerReason || "unknown";
      byReason[r] = (byReason[r] || 0) + 1;
    }
    return res.json({ total: allNhl.length, byReason, sample });
  });
  app2.get("/api/debug/echl-time-sample", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const echlEvents = generated.events.filter((e) => e.source === "echl");
    if (echlEvents.length === 0) {
      return res.json({ error: "No ECHL events found" });
    }
    const sample = echlEvents[0];
    const parsed = new Date(sample.startTimeLocal);
    const laFormatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short"
    }).format(parsed);
    const utcFormatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short"
    }).format(parsed);
    return res.json({
      eventId: sample.id,
      homeTeam: sample.homeTeam,
      awayTeam: sample.awayTeam,
      storedStartTimeLocal: sample.startTimeLocal,
      parsedIso: parsed.toISOString(),
      formattedLA: laFormatted,
      formattedUTC: utcFormatted
    });
  });
  app2.get("/api/debug/rugby-time-sample", (_req, res) => {
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const leagueOneEvents = generated.events.filter(
      (e) => e.leagueKey === "leagueone"
    );
    if (leagueOneEvents.length === 0) {
      return res.json({ error: "No League One events found" });
    }
    const sample = leagueOneEvents[0];
    const parsed = new Date(sample.startTimeLocal);
    const jstFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(parsed);
    const ptFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(parsed);
    return res.json({
      eventId: sample.id,
      homeTeam: sample.homeTeam,
      awayTeam: sample.awayTeam,
      rawLocalTime: `${jstFormatted} (Asia/Tokyo)`,
      parsedUtcIso: parsed.toISOString(),
      formattedPT: `${ptFormatted} (America/Los_Angeles)`,
      timezone: "Asia/Tokyo"
    });
  });
  app2.get("/api/debug/weekend-windows", (_req, res) => {
    const now = /* @__PURE__ */ new Date();
    const TZ = "America/Los_Angeles";
    const fmtFull = (d) => new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(d);
    const dowParts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "long"
    }).formatToParts(now);
    const dayOfWeek = dowParts.find((p) => p.type === "weekday")?.value || "";
    const getLocalParts = (d) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "numeric",
        hour12: false
      }).formatToParts(d);
      const get = (type) => parts.find((p) => p.type === type)?.value || "";
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        year: parseInt(get("year"), 10),
        month: parseInt(get("month"), 10),
        day: parseInt(get("day"), 10),
        dow: dayMap[get("weekday")] ?? 0
      };
    };
    const { year, month, day, dow } = getLocalParts(now);
    let fridayOffset;
    if (dow >= 1 && dow <= 4) fridayOffset = 5 - dow;
    else if (dow === 5) fridayOffset = 0;
    else if (dow === 6) fridayOffset = -1;
    else fridayOffset = -2;
    const fridayDate = new Date(Date.UTC(year, month - 1, day + fridayOffset, 12));
    const fp = getLocalParts(fridayDate);
    const midnightInTZ = (y, m, d) => {
      const guess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      }).formatToParts(guess);
      const gv = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
      const localH = gv("hour") === 24 ? 0 : gv("hour");
      const offsetMs = (localH * 3600 + gv("minute") * 60 + gv("second")) * 1e3;
      return new Date(guess.getTime() - offsetMs);
    };
    const thisStart = midnightInTZ(fp.year, fp.month, fp.day);
    const thisEnd = new Date(thisStart.getTime() + 3 * 864e5 - 1);
    const nextStart = new Date(thisStart.getTime() + 7 * 864e5);
    const nextEnd = new Date(nextStart.getTime() + 3 * 864e5 - 1);
    const showNextWeekend = dow === 5 || dow === 6 || dow === 0;
    return res.json({
      now: fmtFull(now),
      dayOfWeek,
      showNextWeekend,
      thisWeekendStart: fmtFull(thisStart),
      thisWeekendEnd: fmtFull(thisEnd),
      nextWeekendStart: fmtFull(nextStart),
      nextWeekendEnd: fmtFull(nextEnd)
    });
  });
  app2.get("/api/debug/guide-windows", (_req, res) => {
    const TZ = "America/Los_Angeles";
    const now = /* @__PURE__ */ new Date();
    const fmtPT = (d) => new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(d);
    const nowPT = fmtPT(now);
    const dayNames = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
    const rituals = [
      { id: "friday_lights", targetDow: 5, startHour: 18, endHour: 21 },
      { id: "friday_after_hours", targetDow: 5, startHour: 21, endHour: 24 },
      { id: "saturday_sunrise", targetDow: 6, startHour: 6, endHour: 12 },
      { id: "saturday_spotlight", targetDow: 6, startHour: 16, endHour: 20 },
      { id: "saturday_after_hours", targetDow: 6, startHour: 20, endHour: 24 },
      { id: "sunday_session", targetDow: 0, startHour: 6, endHour: 12 }
    ];
    const getLocalParts = (d) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(d);
      const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const hourVal = parseInt(get("hour"), 10);
      return {
        year: parseInt(get("year"), 10),
        month: parseInt(get("month"), 10),
        day: parseInt(get("day"), 10),
        dow: dayMap[get("weekday")] ?? 0,
        hour: hourVal === 24 ? 0 : hourVal,
        minute: parseInt(get("minute"), 10)
      };
    };
    const midnightInTZLocal = (y, m, d) => {
      const guess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      }).formatToParts(guess);
      const gv = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
      const localH = gv("hour") === 24 ? 0 : gv("hour");
      const offsetMs = (localH * 3600 + gv("minute") * 60 + gv("second")) * 1e3;
      const candidate = new Date(guess.getTime() - offsetMs);
      const verify = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        day: "numeric",
        hour: "numeric",
        hour12: false
      }).formatToParts(candidate);
      const verifyDay = parseInt(verify.find((p) => p.type === "day")?.value || "0", 10);
      const verifyHour = parseInt(verify.find((p) => p.type === "hour")?.value || "0", 10);
      if (verifyDay !== d) return new Date(candidate.getTime() + (verifyDay < d ? 864e5 : -864e5));
      if (verifyHour !== 0 && verifyHour !== 24) return new Date(candidate.getTime() - verifyHour * 36e5);
      return candidate;
    };
    const local = getLocalParts(now);
    const windows = rituals.map((r) => {
      let daysAhead = r.targetDow - local.dow;
      if (daysAhead < 0) daysAhead += 7;
      if (daysAhead === 0) {
        const effectiveEndHour = Math.min(r.endHour, 24);
        if (local.hour >= effectiveEndHour) daysAhead = 7;
      }
      const targetDate = new Date(Date.UTC(local.year, local.month - 1, local.day + daysAhead, 12));
      const targetParts = getLocalParts(targetDate);
      const dayStart = midnightInTZLocal(targetParts.year, targetParts.month, targetParts.day);
      const dayEnd = new Date(dayStart.getTime() + 864e5 - 1);
      const timeStart = new Date(dayStart.getTime() + r.startHour * 36e5);
      const effectiveEnd = Math.min(r.endHour, 24);
      const timeEnd = new Date(dayStart.getTime() + effectiveEnd * 36e5 - 1);
      const ptDate = `${targetParts.year}-${String(targetParts.month).padStart(2, "0")}-${String(targetParts.day).padStart(2, "0")}`;
      return {
        ritualId: r.id,
        targetDay: dayNames[r.targetDow],
        computedPTDate: ptDate,
        daysAhead,
        dayStartPT: fmtPT(dayStart),
        dayEndPT: fmtPT(dayEnd),
        dayStartUTC: dayStart.toISOString(),
        dayEndUTC: dayEnd.toISOString(),
        timeWindowStartPT: fmtPT(timeStart),
        timeWindowEndPT: fmtPT(timeEnd),
        timeWindowStartUTC: timeStart.toISOString(),
        timeWindowEndUTC: timeEnd.toISOString()
      };
    });
    return res.json({
      currentPTTime: nowPT,
      currentDow: dayNames[local.dow],
      windows
    });
  });
  app2.get("/api/debug/ritual-filter", (req, res) => {
    const ritualId = req.query.id || "";
    const TZ = "America/Los_Angeles";
    const now = /* @__PURE__ */ new Date();
    const ritualDefs = [
      { id: "friday_lights", targetDow: 5, startHour: 18, endHour: 21, sports: ["hockey", "basketball", "soccer"] },
      { id: "friday_after_hours", targetDow: 5, startHour: 21, endHour: 24, sports: ["rugby", "cricket"] },
      { id: "saturday_sunrise", targetDow: 6, startHour: 6, endHour: 12, sports: ["rugby", "cricket", "soccer"] },
      { id: "saturday_spotlight", targetDow: 6, startHour: 16, endHour: 20, sports: ["hockey", "basketball", "soccer"] },
      { id: "saturday_after_hours", targetDow: 6, startHour: 20, endHour: 24, sports: ["hockey", "basketball", "soccer", "rugby", "cricket"] },
      { id: "sunday_session", targetDow: 0, startHour: 6, endHour: 12, sports: ["rugby", "cricket", "soccer"] }
    ];
    const ritual = ritualDefs.find((r) => r.id === ritualId);
    if (!ritual) {
      return res.status(400).json({ error: `Unknown ritual id: ${ritualId}`, validIds: ritualDefs.map((r) => r.id) });
    }
    const generated = loadGeneratedEvents2();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const fmtPT = (d) => new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(d);
    const getLocalParts = (d) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(d);
      const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const hourVal = parseInt(get("hour"), 10);
      return {
        year: parseInt(get("year"), 10),
        month: parseInt(get("month"), 10),
        day: parseInt(get("day"), 10),
        dow: dayMap[get("weekday")] ?? 0,
        hour: hourVal === 24 ? 0 : hourVal,
        minute: parseInt(get("minute"), 10)
      };
    };
    const midnightInTZLocal = (y, m, d) => {
      const guess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      }).formatToParts(guess);
      const gv = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
      const localH = gv("hour") === 24 ? 0 : gv("hour");
      const offsetMs = (localH * 3600 + gv("minute") * 60 + gv("second")) * 1e3;
      const candidate = new Date(guess.getTime() - offsetMs);
      const verify = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        day: "numeric",
        hour: "numeric",
        hour12: false
      }).formatToParts(candidate);
      const verifyDay = parseInt(verify.find((p) => p.type === "day")?.value || "0", 10);
      const verifyHour = parseInt(verify.find((p) => p.type === "hour")?.value || "0", 10);
      if (verifyDay !== d) return new Date(candidate.getTime() + (verifyDay < d ? 864e5 : -864e5));
      if (verifyHour !== 0 && verifyHour !== 24) return new Date(candidate.getTime() - verifyHour * 36e5);
      return candidate;
    };
    const local = getLocalParts(now);
    let daysAhead = ritual.targetDow - local.dow;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0) {
      const effectiveEndHour = Math.min(ritual.endHour, 24);
      if (local.hour >= effectiveEndHour) daysAhead = 7;
    }
    const targetDate = new Date(Date.UTC(local.year, local.month - 1, local.day + daysAhead, 12));
    const targetParts = getLocalParts(targetDate);
    const dayStart = midnightInTZLocal(targetParts.year, targetParts.month, targetParts.day);
    const dayEnd = new Date(dayStart.getTime() + 864e5 - 1);
    const windowStart = new Date(dayStart.getTime() + ritual.startHour * 36e5);
    const effectiveEnd = Math.min(ritual.endHour, 24);
    const windowEnd = new Date(dayStart.getTime() + effectiveEnd * 36e5);
    const DEFAULT_DURATIONS = {
      hockey: 165,
      soccer: 135,
      rugby: 135,
      cricket: 480,
      basketball: 150
    };
    const getEndMs = (e) => {
      if (e.endTimeLocal) return new Date(e.endTimeLocal).getTime();
      const durMin = DEFAULT_DURATIONS[e.sport] ?? 120;
      return new Date(e.startTimeLocal).getTime() + durMin * 6e4;
    };
    const SPORT_RANK_MAP = { rugby: 1, cricket: 2, hockey: 3, soccer: 4 };
    const getSportRankLocal = (sport) => SPORT_RANK_MAP[sport] ?? 9;
    const teamContainsLocal = (e, needle) => {
      const h = (e.homeTeam || "").toLowerCase();
      const a = (e.awayTeam || "").toLowerCase();
      return h.includes(needle) || a.includes(needle);
    };
    const leagueIsLocal = (e, name) => (e.league || "") === name;
    const leagueContainsLocal = (e, needle) => (e.league || "").toLowerCase().includes(needle);
    const isIntlLocal = (e, sport) => {
      if (e.competitionType === "international") return true;
      const l = (e.league || "").toLowerCase();
      if (sport === "rugby") return l.includes("six nations") || l.includes("rugby championship") || l.includes("test") || l.includes("international");
      if (sport === "cricket") return l.includes("international") || l.includes("test") || l.includes("odi") || l.includes("t20i");
      return false;
    };
    const ladderDefs = {
      rugby: [
        { rank: 1, match: (e) => teamContainsLocal(e, "springboks") || teamContainsLocal(e, "south africa") },
        { rank: 2, match: (e) => isIntlLocal(e, "rugby") },
        { rank: 3, match: (e) => teamContainsLocal(e, "stormers") },
        { rank: 4, match: (e) => leagueIsLocal(e, "URC") },
        { rank: 5, match: (e) => leagueIsLocal(e, "Top 14") },
        { rank: 6, match: (e) => leagueIsLocal(e, "Japan League One") },
        { rank: 7, match: (e) => leagueIsLocal(e, "Super Rugby") || leagueContainsLocal(e, "super rugby") },
        { rank: 8, match: (e) => leagueIsLocal(e, "English Premiership") || leagueIsLocal(e, "Premiership") || leagueContainsLocal(e, "premiership") }
      ],
      cricket: [
        { rank: 1, match: (e) => teamContainsLocal(e, "south africa") },
        { rank: 2, match: (e) => isIntlLocal(e, "cricket") },
        { rank: 3, match: (e) => teamContainsLocal(e, "paarl royals") },
        { rank: 4, match: (e) => teamContainsLocal(e, "mi cape town") },
        { rank: 5, match: (e) => leagueContainsLocal(e, "sa20") || leagueContainsLocal(e, "sa t20") || leagueContainsLocal(e, "t20") },
        { rank: 6, match: (e) => leagueIsLocal(e, "MLC") || leagueContainsLocal(e, "major league cricket") },
        { rank: 7, match: (e) => leagueContainsLocal(e, "caribbean") || leagueContainsLocal(e, "cpl") },
        { rank: 8, match: (e) => leagueIsLocal(e, "IPL") || leagueContainsLocal(e, "indian premier") }
      ],
      hockey: [
        { rank: 1, match: (e) => teamContainsLocal(e, "usa") || teamContainsLocal(e, "united states") },
        { rank: 2, match: (e) => teamContainsLocal(e, "anaheim") || teamContainsLocal(e, "ducks") && leagueIsLocal(e, "NHL") },
        { rank: 3, match: (e) => teamContainsLocal(e, "san diego gulls") || teamContainsLocal(e, "gulls") && leagueIsLocal(e, "AHL") },
        { rank: 4, match: (e) => teamContainsLocal(e, "tulsa oilers") || teamContainsLocal(e, "oilers") && leagueIsLocal(e, "ECHL") },
        { rank: 5, match: (e) => leagueIsLocal(e, "NHL") },
        { rank: 6, match: (e) => leagueIsLocal(e, "AHL") },
        { rank: 7, match: (e) => leagueIsLocal(e, "ECHL") },
        { rank: 8, match: (e) => leagueIsLocal(e, "NCAA Hockey") || leagueIsLocal(e, "NCAA") || leagueContainsLocal(e, "ncaa") }
      ],
      soccer: [
        { rank: 1, match: (e) => teamContainsLocal(e, "south africa") || teamContainsLocal(e, "bafana") },
        { rank: 2, match: (e) => teamContainsLocal(e, "tottenham") || teamContainsLocal(e, "spurs") },
        { rank: 3, match: (e) => leagueIsLocal(e, "EPL") || leagueContainsLocal(e, "premier league") },
        { rank: 4, match: (e) => leagueIsLocal(e, "Serie A") || leagueContainsLocal(e, "serie a") },
        { rank: 5, match: (e) => leagueIsLocal(e, "La Liga") || leagueContainsLocal(e, "la liga") },
        { rank: 6, match: (e) => leagueIsLocal(e, "Bundesliga") || leagueContainsLocal(e, "bundesliga") },
        { rank: 7, match: (e) => leagueIsLocal(e, "Ligue 1") || leagueContainsLocal(e, "ligue 1") },
        { rank: 8, match: (e) => leagueIsLocal(e, "MLS") },
        { rank: 9, match: (e) => leagueIsLocal(e, "USL") || leagueContainsLocal(e, "usl") }
      ]
    };
    const getLadderRankLocal = (e) => {
      const ladder = ladderDefs[e.sport];
      if (!ladder) return 99;
      for (const rung of ladder) {
        if (rung.match(e)) return rung.rank;
      }
      return 99;
    };
    const isLiveLocal = (e) => {
      const startMs = new Date(e.startTimeLocal).getTime();
      const endMs = getEndMs(e);
      const nowMs = now.getTime();
      return nowMs >= startMs && nowMs <= endMs;
    };
    const events = generated.events;
    const included = [];
    const excludedSamples = [];
    const MAX_EXCLUDED = 10;
    for (const e of events) {
      const eventStartMs = new Date(e.startTimeLocal).getTime();
      const eventEndMs = getEndMs(e);
      if (!ritual.sports.includes(e.sport)) {
        continue;
      }
      const onDay = eventStartMs >= dayStart.getTime() && eventStartMs <= dayEnd.getTime();
      if (!onDay) {
        if (excludedSamples.length < MAX_EXCLUDED) {
          excludedSamples.push({
            id: e.id,
            league: e.league,
            homeTeam: e.homeTeam,
            awayTeam: e.awayTeam,
            start: e.startTimeLocal,
            startPT: fmtPT(new Date(eventStartMs)),
            excludedReason: "wrong-day"
          });
        }
        continue;
      }
      const overlaps = eventStartMs < windowEnd.getTime() && eventEndMs > windowStart.getTime();
      if (!overlaps) {
        if (excludedSamples.length < MAX_EXCLUDED) {
          excludedSamples.push({
            id: e.id,
            league: e.league,
            homeTeam: e.homeTeam,
            awayTeam: e.awayTeam,
            start: e.startTimeLocal,
            startPT: fmtPT(new Date(eventStartMs)),
            endUTC: new Date(eventEndMs).toISOString(),
            endPT: fmtPT(new Date(eventEndMs)),
            excludedReason: "no-overlap"
          });
        }
        continue;
      }
      included.push({
        id: e.id,
        sport: e.sport,
        league: e.league,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        start: e.startTimeLocal,
        startPT: fmtPT(new Date(eventStartMs)),
        endUTC: new Date(eventEndMs).toISOString(),
        endPT: fmtPT(new Date(eventEndMs)),
        featuredScore: {
          sportRank: getSportRankLocal(e.sport),
          ladderRank: getLadderRankLocal(e),
          isLive: isLiveLocal(e)
        }
      });
    }
    included.sort((a, b) => {
      const sa = a.featuredScore;
      const sb = b.featuredScore;
      if (sa.sportRank !== sb.sportRank) return sa.sportRank - sb.sportRank;
      if (sa.ladderRank !== sb.ladderRank) return sa.ladderRank - sb.ladderRank;
      const aLive = sa.isLive ? 0 : 1;
      const bLive = sb.isLive ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      if (aStart !== bStart) return aStart - bStart;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return res.json({
      ritualId: ritual.id,
      currentPTTime: fmtPT(now),
      windowStartPT: fmtPT(windowStart),
      windowEndPT: fmtPT(windowEnd),
      windowStartUTC: windowStart.toISOString(),
      windowEndUTC: windowEnd.toISOString(),
      dayStartPT: fmtPT(dayStart),
      dayEndPT: fmtPT(dayEnd),
      eventsIncludedCount: included.length,
      note: "Debug sort uses sportRank\u2192ladderRank\u2192isLive\u2192startTime\u2192id. Client adds isFavorite between ladderRank and isLive (favorites stored client-side in AsyncStorage).",
      featuredCandidate: included[0] || null,
      top5Candidates: included.slice(0, 5),
      allIncludedEvents: included.slice(0, 30),
      sampleExcludedEvents: excludedSamples
    });
  });
  app2.get("/api/players/:id/journey", async (req, res) => {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({ error: "Invalid player ID" });
    }
    try {
      const { journey } = await fetchPlayerJourney(playerId);
      return res.json(journey);
    } catch (err) {
      return res.status(502).json({ error: err.message ?? "Failed to fetch player journey" });
    }
  });
  app2.get("/api/debug/player-journey/:id", async (req, res) => {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({ error: "Invalid player ID" });
    }
    try {
      const debugResponse = await fetchPlayerJourneyDebug(playerId);
      return res.json(debugResponse);
    } catch (err) {
      return res.status(502).json({ error: err.message ?? "Failed to fetch player journey debug" });
    }
  });
  const chaosVideoCache = {};
  const YT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9"
  };
  async function parseYtInitialData(url) {
    const resp = await fetch(url, { headers: YT_HEADERS });
    if (!resp.ok) return null;
    const html = await resp.text();
    const m = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!m) return null;
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }
  async function searchOfficialChannel(team1, team2, channelName, searchLabel) {
    const nickname = (full) => full.split(" ").slice(-1)[0];
    const q = `${nickname(team1)} ${nickname(team2)} ${searchLabel} highlights`;
    console.log(`[chaos-youtube/${searchLabel.toLowerCase()}] Searching: "${q}"`);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const data = await parseYtInitialData(url);
    if (!data) return [];
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ?? [];
    const allVideos = contents.filter((c) => c?.videoRenderer?.videoId);
    const teamKeywords = (full) => {
      const words = full.split(" ");
      const result = [full.toLowerCase()];
      if (words.length > 1) result.push(words[0].toLowerCase());
      result.push(words[words.length - 1].toLowerCase());
      return result;
    };
    const t1Keys = teamKeywords(team1);
    const t2Keys = teamKeywords(team2);
    const titleHasTeam = (title, keys) => keys.some((k) => title.toLowerCase().includes(k));
    const officialVideos = allVideos.filter((c) => {
      const r = c.videoRenderer;
      const channel = r?.ownerText?.runs?.[0]?.text ?? r?.longBylineText?.runs?.[0]?.text ?? "";
      const title = r?.title?.runs?.[0]?.text ?? "";
      return channel.toLowerCase() === channelName.toLowerCase() && titleHasTeam(title, t1Keys) && titleHasTeam(title, t2Keys);
    });
    const ids = officialVideos.slice(0, 5).map((c) => c.videoRenderer.videoId);
    if (ids.length) {
      const titles = officialVideos.slice(0, 5).map((c) => c.videoRenderer.title?.runs?.[0]?.text || "?");
      console.log(`[chaos-youtube/${searchLabel.toLowerCase()}] Found ${ids.length} official videos: ${titles.join(" | ")}`);
      return ids;
    }
    console.log(`[chaos-youtube/${searchLabel.toLowerCase()}] No official channel results, falling back to generic`);
    return [];
  }
  async function searchYouTubeGeneric(query) {
    const sp = "CAISBAgCEAE%3D";
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}`;
    const data = await parseYtInitialData(url);
    if (!data) return [];
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ?? [];
    return contents.filter((c) => c?.videoRenderer?.videoId).slice(0, 5).map((c) => c.videoRenderer.videoId);
  }
  const OFFICIAL_CHANNELS = {
    NHL: { channel: "NHL", label: "NHL" },
    MLB: { channel: "MLB", label: "MLB" },
    NBA: { channel: "NBA", label: "NBA" }
  };
  app2.get("/api/chaos-youtube", async (req, res) => {
    const { team1, team2, league, sport } = req.query;
    if (!team1) return res.json({ videoIds: [] });
    const official = league ? OFFICIAL_CHANNELS[league.toUpperCase()] : void 0;
    const cacheKey2 = `${official ? official.channel : "generic"}::${team1}::${team2 ?? ""}`.toLowerCase();
    const cached = chaosVideoCache[cacheKey2];
    if (cached && Date.now() - cached.fetchedAt < 6 * 3600 * 1e3) {
      return res.json({ videoIds: cached.videoIds });
    }
    try {
      let videoIds = [];
      if (official && team2) {
        videoIds = await searchOfficialChannel(team1, team2, official.channel, official.label);
      }
      if (!videoIds.length) {
        const now = /* @__PURE__ */ new Date();
        const monthYear = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
        const parts = [team1, team2].filter(Boolean);
        const q = `${parts.join(" ")} ${league || ""} ${monthYear} highlights`.trim().replace(/\s+/g, " ");
        console.log(`[chaos-youtube/generic] "${q}"`);
        videoIds = await searchYouTubeGeneric(q);
      }
      console.log(`[chaos-youtube] Final: ${videoIds.length} candidates: ${videoIds.join(", ") || "none"}`);
      chaosVideoCache[cacheKey2] = { videoIds, fetchedAt: Date.now() };
      return res.json({ videoIds });
    } catch (err) {
      chaosVideoCache[cacheKey2] = { videoIds: [], fetchedAt: Date.now() };
      return res.json({ videoIds: [] });
    }
  });
  app2.get("/api/refresh-status", (_req, res) => {
    const generated = loadGeneratedEvents2();
    res.json({
      lastManualRefreshAt: generated?.lastUpdated || null,
      lastAutoRefreshAt: null,
      autoRefreshRunning: false,
      nextScheduled: "Manual refresh only"
    });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs8 from "fs";
import * as path8 from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path9 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path9.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path9} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path8.resolve(process.cwd(), "app.json");
    const appJsonContent = fs8.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path8.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs8.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs8.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path8.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs8.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path8.resolve(process.cwd(), "assets")));
  app2.use(express.static(path8.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
