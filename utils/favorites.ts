import type { SportEvent, Favorites } from "@/lib/data";
import { flattenSportFavorites } from "@/lib/data";
import aliasData from "@/data/favoriteAliases.json";

const aliasMap: Record<string, string[]> = aliasData;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(s: string): string {
  let n = s.trim().toLowerCase();
  n = stripDiacritics(n);
  n = n.replace(/\s+fc$/i, "");
  n = n.replace(/\s+/g, " ");
  return n;
}

const EPL_VARIANTS: Record<string, string[]> = {
  "tottenham hotspur": ["tottenham", "spurs", "tottenham hotspur fc"],
  "manchester united": ["man utd", "man united", "manchester utd", "manchester united fc"],
  "manchester city": ["man city", "manchester city fc"],
  "nottingham forest": ["nott'm forest", "nottingham forest fc", "notts forest"],
  "newcastle united": ["newcastle", "newcastle utd", "newcastle united fc"],
  "west ham united": ["west ham", "west ham utd", "west ham united fc"],
  "wolverhampton wanderers": ["wolves", "wolverhampton", "wolverhampton wanderers fc"],
  "brighton and hove albion": ["brighton", "brighton & hove albion", "brighton and hove albion fc"],
  "crystal palace": ["crystal palace fc"],
  "aston villa": ["aston villa fc"],
  "bournemouth": ["afc bournemouth", "bournemouth fc"],
  "brentford": ["brentford fc"],
  "burnley": ["burnley fc"],
  "chelsea": ["chelsea fc"],
  "everton": ["everton fc"],
  "fulham": ["fulham fc"],
  "leeds": ["leeds united", "leeds utd", "leeds united fc"],
  "liverpool": ["liverpool fc"],
  "arsenal": ["arsenal fc"],
  "sunderland": ["sunderland afc", "sunderland fc"],
};

function buildEplVariantMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(EPL_VARIANTS)) {
    map.set(canonical, canonical);
    for (const v of variants) {
      map.set(v, canonical);
    }
  }
  return map;
}

const eplVariantMap = buildEplVariantMap();

export function normalizeEplTeam(raw: string): string {
  const n = normalize(raw);
  return eplVariantMap.get(n) ?? n;
}

function buildSportExpandedSets(favorites: Favorites): Record<string, { expanded: Set<string>; canonicals: Set<string> }> {
  const result: Record<string, { expanded: Set<string>; canonicals: Set<string> }> = {};
  for (const sport of Object.keys(favorites)) {
    const sportFavs = favorites[sport];
    if (!sportFavs) continue;
    const teams = flattenSportFavorites(sportFavs);
    const expanded = new Set<string>();
    const canonicals = new Set<string>();
    for (const canonical of teams) {
      const norm = normalize(canonical);
      expanded.add(norm);
      canonicals.add(norm);
      const aliases = aliasMap[canonical];
      if (aliases) {
        for (const alias of aliases) {
          expanded.add(normalize(alias));
        }
      }
    }
    result[sport] = { expanded, canonicals };
  }
  return result;
}

let cachedSets: Record<string, { expanded: Set<string>; canonicals: Set<string> }> | null = null;
let cachedFavRef: Favorites | null = null;

function getSportSets(favorites: Favorites): Record<string, { expanded: Set<string>; canonicals: Set<string> }> {
  if (cachedFavRef !== favorites) {
    cachedSets = buildSportExpandedSets(favorites);
    cachedFavRef = favorites;
  }
  return cachedSets!;
}

export type FavoriteMatchReason = "canonical" | "alias" | "";

export function favoriteMatchReason(event: SportEvent, favorites: Favorites): FavoriteMatchReason {
  const sportSets = getSportSets(favorites);
  const sets = sportSets[event.sport];
  if (!sets) return "";

  const home = normalize(event.homeTeam);
  const away = normalize(event.awayTeam);

  let homeInExpanded = sets.expanded.has(home);
  let awayInExpanded = sets.expanded.has(away);

  if (!homeInExpanded && !awayInExpanded && event.sport === "soccer") {
    const homeNorm = normalizeEplTeam(event.homeTeam);
    const awayNorm = normalizeEplTeam(event.awayTeam);
    homeInExpanded = sets.expanded.has(homeNorm);
    awayInExpanded = sets.expanded.has(awayNorm);

    if (!homeInExpanded && !awayInExpanded) return "";

    if (sets.canonicals.has(homeNorm) || sets.canonicals.has(awayNorm)) return "canonical";
    return "alias";
  }

  if (!homeInExpanded && !awayInExpanded) return "";

  if (sets.canonicals.has(home) || sets.canonicals.has(away)) return "canonical";
  return "alias";
}

export function favoriteInvolved(event: SportEvent, favorites: Favorites): boolean {
  const reason = favoriteMatchReason(event, favorites);
  if (reason) {
    if (__DEV__) {
      const sportSets = getSportSets(favorites);
      const sets = sportSets[event.sport];
      if (sets) {
        const home = normalize(event.homeTeam);
        const matched = sets.expanded.has(home) ? event.homeTeam : event.awayTeam;
        console.log(`[FAV] ${event.awayTeam} @ ${event.homeTeam} — matched "${matched}" (${reason})`);
      }
    }
  }
  return reason !== "";
}

export function getAllFavoriteTeams(favorites: Favorites): string[] {
  const all: string[] = [];
  for (const sport of Object.keys(favorites)) {
    const sportFavs = favorites[sport];
    if (sportFavs) {
      all.push(...flattenSportFavorites(sportFavs));
    }
  }
  return all;
}
