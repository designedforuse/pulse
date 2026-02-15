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

export interface Favorites {
  hockey?: string[];
  rugby?: string[];
  cricket?: string[];
  soccer?: string[];
  [key: string]: string[] | undefined;
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
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();

  return `${dayName}, ${monthName} ${dayNum} \u00B7 ${displayHours}:${displayMinutes} ${ampm}`;
}

export function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    hockey: "#4FC3F7",
    rugby: "#FF8A65",
    cricket: "#FFD54F",
    soccer: "#81C784",
  };
  return colors[sport] || "#90A4AE";
}

export function getSportIcon(sport: string): string {
  const icons: Record<string, string> = {
    hockey: "ice-cream",
    rugby: "american-football",
    cricket: "baseball",
    soccer: "football",
  };
  return icons[sport] || "ellipse";
}
