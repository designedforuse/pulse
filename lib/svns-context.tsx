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

const COUNTRY_ABBR_FLAGS: Record<string, string> = {
  AUS: "🇦🇺", ARG: "🇦🇷", FIJ: "🇫🇯", FRA: "🇫🇷", NZL: "🇳🇿",
  RSA: "🇿🇦", GBR: "🇬🇧", ESP: "🇪🇸", USA: "🇺🇸", CAN: "🇨🇦",
  JPN: "🇯🇵", KEN: "🇰🇪", SAM: "🇼🇸", IRE: "🇮🇪", URU: "🇺🇾",
  CHI: "🇨🇱", BRA: "🇧🇷", POR: "🇵🇹", GER: "🇩🇪", ITA: "🇮🇹",
  HKG: "🇭🇰", KOR: "🇰🇷", CHN: "🇨🇳", MEX: "🇲🇽", COL: "🇨🇴",
  TGA: "🇹🇴", WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  ZIM: "🇿🇼", UGA: "🇺🇬", PAR: "🇵🇾",
};

export function getSvnsTeamFlag(abbr: string): string {
  return COUNTRY_ABBR_FLAGS[abbr] || "";
}

export function extractSvnsSessionDay(sessionTitle: string): string | null {
  const match = sessionTitle.match(/Day\s+(\d+)/i);
  if (match) return `Day ${match[1]}`;
  return null;
}
