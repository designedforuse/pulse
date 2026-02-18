import { fetchSoccerLeagueEvents, mergeSoccerLeagueEvents, type LeagueConfig, type SoccerFetchResult, type SoccerMergeResult } from "./soccerIcalUtils";

const CONFIG: LeagueConfig = {
  icalUrl: "https://fixturedownload.com/download/la-liga-2025-GMTStandardTime.ics",
  league: "La Liga",
  source: "soccer-laliga",
  leagueKey: "laliga",
  providerId: "disneyplus",
  providerReason: "laliga-disneyplus",
  summaryStripRegex: /\s*-\s*La Liga.*$/i,
};

export async function fetchLaLigaEvents(): Promise<SoccerFetchResult> {
  return fetchSoccerLeagueEvents(CONFIG);
}

export function mergeLaLigaEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
