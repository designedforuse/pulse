import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";

export interface SvnsMatch {
  matchId: string;
  description: string;
  phase: string;
  status: string;
  time: number;
  team1: string;
  team1Abbr: string;
  team1Score: number;
  team2: string;
  team2Abbr: string;
  team2Score: number;
  gender: "mens" | "womens";
}

interface SvnsMatchesResponse {
  city: string;
  liveMatch: SvnsMatch | null;
  nextMatch: SvnsMatch | null;
  lastCompletedMatch: SvnsMatch | null;
  allMatches: SvnsMatch[];
  fetchedAt: string;
}

export function extractSvnsCity(homeTeam: string): string | null {
  if (!homeTeam.startsWith("SVNS ")) return null;
  return homeTeam.replace("SVNS ", "");
}

export function useSvnsMatches(city: string | null) {
  const { data } = useQuery<SvnsMatchesResponse>({
    queryKey: ["/api/svns-matches", encodeURIComponent(city || "")],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000,
    retry: 1,
    enabled: !!city,
  });

  if (!data) return null;

  return {
    liveMatch: data.liveMatch,
    nextMatch: data.nextMatch,
    lastCompletedMatch: data.lastCompletedMatch,
  };
}

export function formatSvnsMatchLine(match: SvnsMatch): string {
  const genderPrefix = match.gender === "womens" ? "W" : "M";
  const statusPrefix = match.status === "C"
    ? `${match.team1Score}–${match.team2Score}`
    : match.status.startsWith("L")
      ? `${match.team1Score}–${match.team2Score}`
      : "";
  const teams = `${match.team1Abbr} vs ${match.team2Abbr}`;
  if (statusPrefix) {
    return `${genderPrefix} · ${teams} · ${statusPrefix}`;
  }
  return `${genderPrefix} · ${teams}`;
}

export function formatSvnsMatchTime(match: SvnsMatch): string {
  const d = new Date(match.time);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// ESPN country flag CDN uses FIFA/IOC-style 3-letter codes.
function svnsFlagUrl(code: string | null | undefined): string {
  if (!code) return "";
  return `https://a.espncdn.com/i/teamlogos/countries/500/${code.toLowerCase()}.png`;
}

// World Rugby team abbreviations → ESPN flag code. Most match already; only
// outliers (e.g. IRE → irl) need remapping.
const SVNS_ABBR_CODE_OVERRIDES: Record<string, string> = {
  IRE: "irl",
};

export function getSvnsTeamFlag(abbr: string): string {
  if (!abbr) return "";
  return svnsFlagUrl(SVNS_ABBR_CODE_OVERRIDES[abbr] ?? abbr);
}

const SVNS_CITY_CODES: Record<string, string> = {
  Dubai: "uae",
  "Cape Town": "rsa",
  Singapore: "sin",
  Perth: "aus",
  Vancouver: "can",
  "New York": "usa",
  "Hong Kong": "hkg",
  Valladolid: "esp",
  Bordeaux: "fra",
  "Los Angeles": "usa",
  Madrid: "esp",
  London: "eng",
};

export function getSvnsCityFlag(city: string | null): string {
  if (!city) return "";
  return svnsFlagUrl(SVNS_CITY_CODES[city]);
}

export function extractSvnsSessionDay(sessionTitle: string): string | null {
  const match = sessionTitle.match(/Day\s+(\d+)/i);
  if (match) return `Day ${match[1]}`;
  return null;
}
