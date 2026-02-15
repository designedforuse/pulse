import type { SportEvent, Favorites } from "@/lib/data";
import { flattenSportFavorites } from "@/lib/data";
import aliasData from "@/data/favoriteAliases.json";

const aliasMap: Record<string, string[]> = aliasData;

function normalize(s: string): string {
  return s.trim().toLowerCase();
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

  const homeInExpanded = sets.expanded.has(home);
  const awayInExpanded = sets.expanded.has(away);

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
