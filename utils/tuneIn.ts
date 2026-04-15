/**
 * TuneIn station guide IDs for sports teams with dedicated live streams.
 * Verified via TuneIn OPML API (opml.radiotime.com).
 * Teams not in this map fall back to a TuneIn search URL.
 */
const TUNEIN_STATIONS: Record<string, string> = {
  // ── NHL ──────────────────────────────────────────────────────────────────
  "Anaheim Ducks":          "s137347",
  "Boston Bruins":          "s137387",
  "Buffalo Sabres":         "s137345",
  "Calgary Flames":         "s149880",
  "Carolina Hurricanes":    "s149882",
  "Chicago Blackhawks":     "s137388",
  "Colorado Avalanche":     "s149866",
  "Columbus Blue Jackets":  "s149869",
  "Dallas Stars":           "s149881",
  "Detroit Red Wings":      "s137351",
  "Edmonton Oilers":        "s149877",
  "Florida Panthers":       "s149873",
  "Los Angeles Kings":      "s137394",
  "Minnesota Wild":         "s149867",
  "Montréal Canadiens":     "s137385",
  "Nashville Predators":    "s137348",
  "New Jersey Devils":      "s149887",
  "New York Islanders":     "s149875",
  "New York Rangers":       "s137341",
  "Ottawa Senators":        "s149879",
  "Philadelphia Flyers":    "s137344",
  "Pittsburgh Penguins":    "s137342",
  "San Jose Sharks":        "s137393",
  "Seattle Kraken":         "s310026",
  "St. Louis Blues":        "s149872",
  "Tampa Bay Lightning":    "s137343",
  "Toronto Maple Leafs":    "s149876",
  "Vancouver Canucks":      "s137392",
  "Vegas Golden Knights":   "s296301",
  "Washington Capitals":    "s137340",
  "Winnipeg Jets":          "s257147",
};

/**
 * Returns a TuneIn URL for a given team name.
 * - Teams with a known station ID → direct station page
 * - Everything else → TuneIn search for "{team} radio" (opens TuneIn to
 *   search results, working for MLB, NBA, and any unmapped team)
 */
export function getTuneInUrl(teamName: string): string {
  const stationId = TUNEIN_STATIONS[teamName];
  if (stationId) {
    return `https://tunein.com/radio/station/?stationId=${stationId}`;
  }
  return `https://tunein.com/search/?query=${encodeURIComponent(teamName + " radio")}`;
}

/**
 * Returns true if the team has a known dedicated TuneIn station
 * (gives a direct stream rather than a search page).
 */
export function hasDedicatedTuneInStation(teamName: string): boolean {
  return teamName in TUNEIN_STATIONS;
}
