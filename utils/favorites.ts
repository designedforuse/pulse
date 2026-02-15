import type { SportEvent, Favorites } from "@/lib/data";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function favoriteInvolved(event: SportEvent, favorites: Favorites): boolean {
  const sportFavs = favorites[event.sport];
  if (!sportFavs || sportFavs.length === 0) return false;

  const normalizedFavs = sportFavs.map(normalize);
  const home = normalize(event.homeTeam);
  const away = normalize(event.awayTeam);

  return normalizedFavs.some((fav) => fav === home || fav === away);
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
