import { fetchSoccerLeagueEvents, mergeSoccerLeagueEvents, type LeagueConfig, type SoccerFetchResult, type SoccerMergeResult } from "./soccerIcalUtils";

const CONFIG: LeagueConfig = {
  icalUrl: "https://fixturedownload.com/download/bundesliga-2025-GMTStandardTime.ics",
  league: "Bundesliga",
  source: "soccer-bundesliga",
  leagueKey: "bundesliga",
  providerId: "disneyplus",
  providerReason: "bundesliga-disneyplus",
  summaryStripRegex: /\s*-\s*Bundesliga.*$/i,
};

export async function fetchBundesligaEvents(): Promise<SoccerFetchResult> {
  return fetchSoccerLeagueEvents(CONFIG);
}

export function mergeBundesligaEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
