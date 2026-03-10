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
  tennisRound?: string;
  tennisPlayer1?: string;
  tennisPlayer2?: string;
  tennisPlayer1Rank?: number;
  tennisPlayer2Rank?: number;
  tennisPlayer1Flag?: string;
  tennisPlayer2Flag?: string;
  tournamentName?: string;
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
    hockey: "#4FC3F7",
    rugby: "#FF8A65",
    cricket: "#FFD54F",
    soccer: "#81C784",
    tennis: "#CE93D8",
    racing: "#E53935",
    golf: "#4CAF50",
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
  cbsgolazo: "CBS Sports Golazo",
  tnt: "TNT",
};

const TENNIS_PROVIDER_MAP: Record<string, ResolvedProvider> = {
  "tennischannel": {
    providerId: "youtubetv",
    providerName: "Tennis Channel",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  },
  "espn-broadcast": {
    providerId: "youtubetv",
    providerName: "ESPN",
    launchAppId: "youtubetv",
    launchAppName: "YouTube TV",
    displayLabel: "Watch on YouTube TV",
  },
  "tnt-broadcast": {
    providerId: "youtubetv",
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
    providerId: "youtubetv",
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
  const provider = getProviderById(event.providerId);
  return {
    brandId: event.providerId,
    brandName: provider?.name || PROVIDER_DISPLAY_NAMES[event.providerId] || event.providerId,
    launchProvider: provider,
    launchLabel: provider ? `Watch on ${provider.name}` : "Watch",
  };
}

export function formatProviderReason(reason: string | undefined): string | null {
  if (!reason) return null;
  const labels: Record<string, string> = {
    "tennis-channel": "Tennis Channel",
    "espn-broadcast": "ESPN Broadcast",
    "tnt-broadcast": "TNT Broadcast",
    "flosports": "FloSports",
    "victoryplus": "Victory+",
  };
  return labels[reason] || reason.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function getSportIcon(sport: string): string {
  const icons: Record<string, string> = {
    hockey: "snow",
    rugby: "american-football",
    cricket: "baseball",
    soccer: "football",
    tennis: "tennisball-outline",
    racing: "speedometer",
    golf: "golf",
  };
  return icons[sport] || "ellipse";
}
