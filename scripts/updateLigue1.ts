import { fetchSoccerLeagueEvents, mergeSoccerLeagueEvents, type LeagueConfig, type SoccerFetchResult, type SoccerMergeResult } from "./soccerIcalUtils";

const CONFIG: LeagueConfig = {
  icalUrl: "https://fixturedownload.com/download/ligue-1-2025-GMTStandardTime.ics",
  league: "Ligue 1",
  source: "soccer-ligue1",
  leagueKey: "ligue1",
  providerId: "youtubetv",
  providerReason: "ligue1-yttv",
  summaryStripRegex: /\s*-\s*Ligue 1.*$/i,
};

export async function fetchLigue1Events(): Promise<SoccerFetchResult> {
  return fetchSoccerLeagueEvents(CONFIG);
}

export function mergeLigue1Events(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
