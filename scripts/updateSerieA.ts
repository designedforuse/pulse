import { fetchSoccerLeagueEvents, mergeSoccerLeagueEvents, type LeagueConfig, type SoccerFetchResult, type SoccerMergeResult } from "./soccerIcalUtils";

const CONFIG: LeagueConfig = {
  icalUrl: "https://fixturedownload.com/download/serie-a-2025-GMTStandardTime.ics",
  league: "Serie A",
  source: "soccer-seriea",
  leagueKey: "seriea",
  providerId: "youtubetv",
  providerReason: "seriea-yttv",
  summaryStripRegex: /\s*-\s*Serie A.*$/i,
};

export async function fetchSerieAEvents(): Promise<SoccerFetchResult> {
  return fetchSoccerLeagueEvents(CONFIG);
}

export function mergeSerieAEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
