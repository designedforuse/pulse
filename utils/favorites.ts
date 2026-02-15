import type { SportEvent, Favorites } from "@/lib/data";
import aliasData from "@/data/favoriteAliases.json";

const aliasMap: Record<string, string[]> = aliasData;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function buildExpandedSet(favorites: Favorites): Set<string> {
  const expanded = new Set<string>();
  for (const sport of Object.keys(favorites)) {
    const teams = favorites[sport];
    if (!teams) continue;
    for (const canonical of teams) {
      expanded.add(normalize(canonical));
      const aliases = aliasMap[canonical];
      if (aliases) {
        for (const alias of aliases) {
          expanded.add(normalize(alias));
        }
      }
    }
  }
  return expanded;
}

function buildCanonicalSet(favorites: Favorites): Set<string> {
  const canonicals = new Set<string>();
  for (const sport of Object.keys(favorites)) {
    const teams = favorites[sport];
    if (!teams) continue;
    for (const canonical of teams) {
      canonicals.add(normalize(canonical));
    }
  }
  return canonicals;
}

let cachedExpanded: Set<string> | null = null;
let cachedCanonicals: Set<string> | null = null;
let cachedFavRef: Favorites | null = null;

function getExpandedAndCanonical(favorites: Favorites): { expanded: Set<string>; canonicals: Set<string> } {
  if (cachedFavRef !== favorites) {
    cachedExpanded = buildExpandedSet(favorites);
    cachedCanonicals = buildCanonicalSet(favorites);
    cachedFavRef = favorites;
  }
  return { expanded: cachedExpanded!, canonicals: cachedCanonicals! };
}

export type FavoriteMatchReason = "canonical" | "alias" | "";

export function favoriteMatchReason(event: SportEvent, favorites: Favorites): FavoriteMatchReason {
  const { expanded, canonicals } = getExpandedAndCanonical(favorites);
  const home = normalize(event.homeTeam);
  const away = normalize(event.awayTeam);

  const homeInExpanded = expanded.has(home);
  const awayInExpanded = expanded.has(away);

  if (!homeInExpanded && !awayInExpanded) return "";

  const homeCanonical = canonicals.has(home);
  const awayCanonical = canonicals.has(away);

  if (homeCanonical || awayCanonical) return "canonical";
  return "alias";
}

export function favoriteInvolved(event: SportEvent, favorites: Favorites): boolean {
  const reason = favoriteMatchReason(event, favorites);
  if (reason) {
    if (__DEV__) {
      const { expanded } = getExpandedAndCanonical(favorites);
      const home = normalize(event.homeTeam);
      const away = normalize(event.awayTeam);
      const matched = expanded.has(home) ? event.homeTeam : event.awayTeam;
      console.log(`[FAV] ${event.awayTeam} @ ${event.homeTeam} — matched "${matched}" (${reason})`);
    }
  }
  return reason !== "";
}

export function getAllFavoriteTeams(favorites: Favorites): string[] {
  const all: string[] = [];
  for (const sport of Object.keys(favorites)) {
    const teams = favorites[sport];
    if (teams) {
      all.push(...teams);
    }
  }
  return all;
}
