import { fetchSoccerLeagueEvents, mergeSoccerLeagueEvents, type LeagueConfig, type SoccerFetchResult, type SoccerMergeResult } from "./soccerIcalUtils";

const CONFIG: LeagueConfig = {
  icalUrl: "https://fixturedownload.com/download/champions-league-2025-GMTStandardTime.ics",
  league: "Champions League",
  source: "soccer-championsleague",
  leagueKey: "championsleague",
  providerId: "youtubetv",
  providerReason: "ucl-yttv",
  summaryStripRegex: /\s*-\s*UEFA Champions League.*$/i,
};

export async function fetchChampionsLeagueEvents(): Promise<SoccerFetchResult> {
  return fetchSoccerLeagueEvents(CONFIG);
}

export function mergeChampionsLeagueEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
