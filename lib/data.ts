import guideData from "@/data/masterGuide.json";

export interface Provider {
  id: string;
  name: string;
  packageName: string;
  activity?: string;
  launchUrl?: string;
}

export interface SportEvent {
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
  eventType?: "match" | "session" | "tournament";
  sessionTitle?: string;
  competitionName?: string;
  competitionType?: "international" | "domestic" | "unknown";
  format?: string;
  hostCountry?: string;
  seriesName?: string;
  isIccT20Wc?: boolean;
  t20WcMatchLabel?: string;
  t20WcVenue?: string;
  isOlympic?: boolean;
  seasonTag?: string;
  olympicRound?: string;
  olympicVenue?: string;
  providerReason?: string;
  broadcastNetworks?: string;
  tennisRound?: string;
  tennisPlayer1?: string;
  tennisPlayer2?: string;
  tennisPlayer1Rank?: number;
  tennisPlayer2Rank?: number;
  tennisPlayer1Flag?: string;
  tennisPlayer2Flag?: string;
  tournamentName?: string;
  roundLabel?: string;
}

export interface Pack {
  id: string;
  title: string;
  sport: string;
  leagues?: string[];
  hostRegions?: string[];
}

export interface Mode {
  id: string;
  title: string;
  packs: Pack[];
}

export type SportFavorites = Record<string, string[]>;

export interface Favorites {
  hockey?: SportFavorites;
  rugby?: SportFavorites;
  cricket?: SportFavorites;
  soccer?: SportFavorites;
  racing?: SportFavorites;
  [key: string]: SportFavorites | undefined;
}

export function flattenSportFavorites(sportFavs: SportFavorites | undefined): string[] {
  if (!sportFavs) return [];
  const teams: string[] = [];
  for (const league of Object.keys(sportFavs)) {
    teams.push(...sportFavs[league]);
  }
  return teams;
}

export interface MasterGuide {
  modes: Mode[];
  providers: Provider[];
  events: SportEvent[];
  favorites?: Favorites;
}

const cricketLeagueToRegion: Record<string, string> = {
  "IPL": "India",
  "BBL": "Australia",
  "Super Smash": "New Zealand",
  "SA20": "South Africa",
  "The Hundred": "England",
  "CPL": "Caribbean",
  "MLC": "United States",
};

export function getData(): MasterGuide {
  return guideData as MasterGuide;
}

export function getModes(): Mode[] {
  return guideData.modes as Mode[];
}

export function getModeById(id: string): Mode | undefined {
  return (guideData.modes as Mode[]).find((m) => m.id === id);
}

export function getProviderById(id: string): Provider | undefined {
  return (guideData.providers as Provider[]).find((p) => p.id === id);
}

export function getEventsForPack(pack: Pack): SportEvent[] {
  const events = guideData.events as SportEvent[];
  return events.filter((event) => {
    if (event.sport !== pack.sport) return false;
    if (pack.leagues) {
      return pack.leagues.includes(event.league);
    }
    if (pack.hostRegions) {
      const region = cricketLeagueToRegion[event.league];
      return region ? pack.hostRegions.includes(region) : false;
    }
    return false;
  });
}

export function getLiveEvents(): SportEvent[] {
  return (guideData.events as SportEvent[]).filter((e) => e.isLive);
}

export function getLiveEventsComputed(now: Date): SportEvent[] {
  const { getLiveEventsNow } = require("@/utils/time");
  return getLiveEventsNow(guideData.events as SportEvent[], now);
}

export function getAllEvents(): SportEvent[] {
  return guideData.events as SportEvent[];
}

export function getProviders(): Provider[] {
  return guideData.providers as Provider[];
}

export function getFavorites(): Favorites {
  return (guideData as MasterGuide).favorites ?? {};
}

export function formatStartTime(isoString: string): string {
  const date = new Date(isoString);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(date);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date);
  return `${dateStr} \u00B7 ${timeStr}`;
}

export function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    hockey: "#1CB0F6",
    rugby: "#FF9600",
    cricket: "#FFC800",
    soccer: "#35C7A5",
    basketball: "#FF4B4B",
    tennis: "#CE82FF",
    racing: "#E53935",
    golf: "#22C55E",
    athletics: "#FF6B00",
  };
  return colors[sport] || "#90A4AE";
}

export interface ResolvedProvider {
  providerId: string;
  providerName: string;
  launchAppId: string;
  launchAppName: string;
  displayLabel: string;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  youtubetv: "YouTube TV",
  disneyplus: "Disney+",
  flosports: "FloSports",
  victoryplus: "Victory+",
  primevideo: "Prime Video",
  appletv: "Apple TV",
  tennischannel: "Tennis Channel",
  espn: "ESPN",
  espnplus: "ESPN+",
  espn2: "ESPN2",
  cbsgolazo: "CBS Golazo",
  beinsports: "beIN Sports",
  tnt: "TNT",
  ion: "ION",
  abc: "ABC",
  cbs: "CBS",
  cbssn: "CBS Sports Network",
  nbc: "NBC",
  paramount: "Paramount+",
  nwslplus: "NWSL+",
  fanduelsn: "FanDuel SN",
  nbatv: "NBA TV",
  nbc: "NBC",
  willowtv: "Willow TV",
  flohockey: "FloHockey",
  florugby: "FloRugby",
  nbcsn: "NBC Sports",
  rugbypasstv: "RugbyPass TV",
};

// Broadcaster IDs that are valid as display logos — streaming services excluded
const BROADCASTER_IDS = new Set([
  "espn",
  "cbs", "cbssn",
  "nbcsn",
  "abc", "tnt", "nbatv", "primevideo", "nbaleaguepass",
  "beinsports",
  "flosports",
  "victoryplus",
  "fanduelsn",
  "tennischannel",
  "willowtv",
  "rugbypasstv",
  "nwslplus",
  "ion",
  "appletv",
]);

// Returns [displayId, launchProviderId]
function resolveNbaBroadcastId(event: SportEvent): [string, string] {
  const n = event.broadcastNetworks || "";
  const reason = event.providerReason || "";

  if (n) {
    const nl = n.toLowerCase();
    // ABC and ESPN (non-plus) → ESPN logo, open YouTube TV
    if (nl.includes("abc") || (nl.includes("espn") && !nl.includes("espn+"))) return ["espn", "youtubetv"];
    // ESPN+ → ESPN logo, open Disney+
    if (nl.includes("espn+")) return ["espn", "disneyplus"];
    // TNT / TBS
    if (nl.includes("tnt") || nl.includes("tbs")) return ["tnt", "youtubetv"];
    // NBC or Peacock → NBC Sports Network logo, open YouTube TV
    if (nl.includes("nbc") || nl.includes("peacock")) return ["nbcsn", "youtubetv"];
    // Prime Video
    if (nl.includes("prime video") || nl.includes("amazon prime")) return ["primevideo", "primevideo"];
  }

  // Fallback via providerReason for cached events without broadcastNetworks
  if (reason === "nba-abc" || reason === "nba-espn" || reason === "nba-espn-abc") return ["espn", "youtubetv"];
  if (reason === "nba-tnt") return ["tnt", "youtubetv"];
  if (reason === "nba-espnplus") return ["espn", "disneyplus"];
  if (reason === "nba-nbc") return ["nbcsn", "youtubetv"];

  // Clippers games → FanDuel Sports Network, open Prime Video
  const teams = `${event.homeTeam ?? ""} ${event.awayTeam ?? ""}`.toLowerCase();
  if (teams.includes("clippers")) return ["fanduelsn", "primevideo"];

  // All other NBA games → NBA League Pass, open Prime Video
  return ["nbaleaguepass", "primevideo"];
}

function resolveNcaabBroadcastId(event: SportEvent): [string, string] {
  const reason = event.providerReason || "";
  if (reason === "ncaab-espn-plus" || reason === "ncaab-espn-plus-default" || reason === "ncaab-default") return ["espn", "disneyplus"];
  if (reason === "ncaab-espn-abc") return ["espn", "youtubetv"];
  return ["", ""];
}

function resolveSoccerBroadcastId(event: SportEvent): [string, string] {
  const league = event.league;
  const reason = event.providerReason || "";

  // MLS → Apple TV (exclusive rights holder)
  if (league === "MLS") return ["appletv", "appletv"];

  // EPL → NBC Sports Network / YouTube TV
  if (league === "EPL") return ["nbcsn", "youtubetv"];

  // Champions League + Europa League → CBS / YouTube TV
  if (league === "Champions League" || league === "Europa League") return ["cbs", "youtubetv"];

  // Serie A → CBS Sports Golazo Network / Prime Video
  if (league === "Serie A") return ["cbssn", "primevideo"];

  // Bundesliga, La Liga → ESPN+ / Disney+
  if (league === "Bundesliga" || league === "La Liga") return ["espn", "disneyplus"];
  // FA Cup → ESPN / Disney+
  if (league === "FA Cup") return ["espn", "disneyplus"];

  // Ligue 1 → beIN Sports / YouTube TV
  if (league === "Ligue 1") return ["beinsports", "youtubetv"];

  // USL: CBS Golazo default → CBS Golazo logo / Prime Video
  if (league === "USL" && reason === "usl-cbsgolazo-default") return ["cbssn", "primevideo"];

  // USL: ESPN+ → ESPN+ text / Disney+
  if (league === "USL" && reason === "usl-espnplus") return ["espn", "disneyplus"];

  return ["", ""];
}

function resolveGolfBroadcastId(event: SportEvent): [string, string] {
  const reason = event.providerReason || "";
  if (reason === "cbs-broadcast") return ["cbs", "youtubetv"];
  if (reason === "nbc-broadcast") return ["nbcsn", "youtubetv"];
  return ["", ""];
}

const FLORUGBY_LEAGUES = new Set(["URC", "Top 14", "English Premiership", "European Champions Cup", "Japan League One"]);

function resolveRugbyBroadcastId(event: SportEvent): [string, string] {
  const league = event.league;
  if (league === "HSBC SVNS" || league === "Super Rugby") return ["rugbypasstv", "primevideo"];
  if (league === "Six Nations") return ["nbcsn", "youtubetv"];
  if (league === "MLR") return ["espn", "disneyplus"];
  if (FLORUGBY_LEAGUES.has(league)) return ["flosports", "flosports"];
  return ["", ""];
}

function resolveCricketBroadcastId(event: SportEvent): [string, string] {
  if (event.providerId === "disneyplus") return ["espn", "disneyplus"];
  // youtubetv — Willow TV is distributed via YouTube TV
  return ["willowtv", "youtubetv"];
}

function resolveNhlBroadcastId(event: SportEvent): string {
  const reason = event.providerReason || "";
  const n = event.broadcastNetworks || "";

  if (reason === "national") {
    if (/\bABC\b/.test(n)) return "espn";
    if (/\bESPN\b(?!\+)/.test(n)) return "espn";
    if (/\bTNT\b/.test(n)) return "tnt";
  }

  if (reason === "espnplus-default") return "espn";

  // Kings RSN: games air on FanDuel Sports Network, open via Prime Video
  if (reason === "kings-rsn") return "fanduelsn";

  // Other RSN reasons — providerId is already the broadcast network
  return "";
}

function resolveNwslBroadcastId(broadcastNetworks: string): string {
  const n = broadcastNetworks;
  if (/\bION\b/i.test(n)) return "ion";
  if (/Golazo/i.test(n)) return "cbssn";
  if (/Prime\s*Video/i.test(n)) return "";
  if (/ESPN\+/i.test(n)) return "espn";
  if (/\bABC\b/i.test(n)) return "espn";
  if (/\bESPN2\b/i.test(n)) return "espn";
  if (/\bCBSSN\b/i.test(n)) return "cbssn";
  if (/\bCBS\b/i.test(n)) return "cbssn";
  if (/Victory\+/i.test(n)) return "victoryplus";
  if (/Paramount\+/i.test(n)) return "paramount";
  if (/NWSL\+/i.test(n)) return "nwslplus";
  return "";
}

const TENNIS_PROVIDER_MAP: Record<string, ResolvedProvider> = {
  "tennischannel": {
    providerId: "tennischannel",
    providerName: "Tennis Channel",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  },
  "espn-broadcast": {
    providerId: "espn",
    providerName: "ESPN",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  },
  "tnt-broadcast": {
    providerId: "tnt",
    providerName: "TNT",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  },
};

export function resolveTennisProvider(event: SportEvent): ResolvedProvider | null {
  if (event.sport !== "tennis") return null;

  const key = event.providerReason || event.providerId;
  const mapped = TENNIS_PROVIDER_MAP[key] || TENNIS_PROVIDER_MAP[event.providerId];

  if (mapped) return mapped;

  return {
    providerId: "tennischannel",
    providerName: "Tennis Channel",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  };
}

export function resolveProviderDisplay(event: SportEvent): { brandId: string; brandName: string; launchProvider: Provider | undefined; launchLabel: string } {
  const tennis = resolveTennisProvider(event);
  if (tennis) {
    return {
      brandId: tennis.providerId,
      brandName: tennis.providerName,
      launchProvider: getProviderById(tennis.launchAppId),
      launchLabel: tennis.displayLabel,
    };
  }

  // Soccer: display broadcast network logo; launch app determined by league
  if (event.sport === "soccer") {
    const [broadcastId, launchProviderId] = resolveSoccerBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(launchProviderId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // Golf: display broadcast network (CBS/NBC), launch via YouTube TV
  if (event.sport === "golf") {
    const [broadcastId, launchProviderId] = resolveGolfBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(launchProviderId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // Rugby: display broadcast network logo; launch app determined by league
  if (event.sport === "rugby") {
    const [broadcastId, launchProviderId] = resolveRugbyBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(launchProviderId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // AHL / ECHL: display FloSports brand
  if ((event.league === "AHL" || event.league === "ECHL") && event.providerId === "flosports") {
    const launchProvider = getProviderById("flosports");
    return {
      brandId: "flosports",
      brandName: "FloSports",
      launchProvider,
      launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
    };
  }

  // Cricket: Willow TV (YouTube TV) or ESPN+ (Disney+)
  if (event.sport === "cricket") {
    const [broadcastId, launchProviderId] = resolveCricketBroadcastId(event);
    const launchProvider = getProviderById(launchProviderId);
    return {
      brandId: broadcastId,
      brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
      launchProvider,
      launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
    };
  }

  // NCAA Hockey: ESPN via Disney+
  if (event.league === "NCAA Hockey") {
    const launchProvider = getProviderById(event.providerId);
    return {
      brandId: "espn",
      brandName: "ESPN",
      launchProvider,
      launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
    };
  }

  // NBA: display the broadcast network logo; launch app determined by network (not cached providerId)
  if (event.league === "NBA") {
    const [broadcastId, launchProviderId] = resolveNbaBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(launchProviderId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // NCAAB: display the broadcast network logo; launch app determined by network
  if (event.league === "NCAAB") {
    const [broadcastId, launchProviderId] = resolveNcaabBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(launchProviderId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // NHL: display the broadcast network logo; deep-link still uses providerId
  if (event.league === "NHL") {
    const broadcastId = resolveNhlBroadcastId(event);
    if (broadcastId) {
      const launchProvider = getProviderById(event.providerId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  // NWSL: display the broadcast network logo; deep-link still uses providerId
  if (event.leagueKey === "nwsl" && event.broadcastNetworks) {
    const broadcastId = resolveNwslBroadcastId(event.broadcastNetworks);
    if (broadcastId) {
      const launchProvider = getProviderById(event.providerId);
      return {
        brandId: broadcastId,
        brandName: PROVIDER_DISPLAY_NAMES[broadcastId] || broadcastId,
        launchProvider,
        launchLabel: launchProvider ? `Watch on ${launchProvider.name}` : "Watch",
      };
    }
  }

  const provider = getProviderById(event.providerId);
  return {
    brandId: BROADCASTER_IDS.has(event.providerId) ? event.providerId : "",
    brandName: provider?.name || PROVIDER_DISPLAY_NAMES[event.providerId] || event.providerId,
    launchProvider: provider,
    launchLabel: provider ? `Watch on ${provider.name}` : "Watch",
  };
}

export function formatProviderReason(_reason: string | undefined): string | null {
  return null;
}

export function getSportIcon(sport: string): string {
  const icons: Record<string, string> = {
    hockey: "snow",
    rugby: "american-football",
    cricket: "baseball",
    soccer: "football",
    basketball: "basketball",
    tennis: "tennisball-outline",
    racing: "speedometer",
    golf: "golf",
    athletics: "walk-outline",
  };
  return icons[sport] || "ellipse";
}
