import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFavorites, type Favorites, type SportFavorites } from "@/lib/data";

const STORAGE_KEY = "favorites.disabled";

interface FavoritesContextValue {
  favorites: Favorites;
  allTeams: Favorites;
  isTeamEnabled: (sport: string, league: string, team: string) => boolean;
  toggleTeam: (sport: string, league: string, team: string) => void;
  enabledCount: number;
  totalCount: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function teamKey(sport: string, league: string, team: string): string {
  return `${sport}::${league}::${team}`;
}

function buildActiveFavorites(allTeams: Favorites, disabled: Set<string>): Favorites {
  const result: Favorites = {};
  for (const sport of Object.keys(allTeams)) {
    const sportFavs = allTeams[sport];
    if (!sportFavs) continue;
    const activeSport: SportFavorites = {};
    for (const league of Object.keys(sportFavs)) {
      const teams = sportFavs[league].filter(
        (t) => !disabled.has(teamKey(sport, league, t))
      );
      if (teams.length > 0) {
        activeSport[league] = teams;
      }
    }
    if (Object.keys(activeSport).length > 0) {
      result[sport] = activeSport;
    }
  }
  return result;
}

function countTeams(favs: Favorites): number {
  let count = 0;
  for (const sport of Object.keys(favs)) {
    const sportFavs = favs[sport];
    if (!sportFavs) continue;
    for (const league of Object.keys(sportFavs)) {
      count += sportFavs[league].length;
    }
  }
  return count;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const allTeams = useMemo(() => getFavorites(), []);
  const totalCount = useMemo(() => countTeams(allTeams), [allTeams]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setDisabled(new Set(arr));
          }
        } catch {}
      }
    });
  }, []);

  const favorites = useMemo(
    () => buildActiveFavorites(allTeams, disabled),
    [allTeams, disabled]
  );

  const enabledCount = useMemo(() => countTeams(favorites), [favorites]);

  const isTeamEnabled = useCallback(
    (sport: string, league: string, team: string) => {
      return !disabled.has(teamKey(sport, league, team));
    },
    [disabled]
  );

  const toggleTeam = useCallback(
    (sport: string, league: string, team: string) => {
      setDisabled((prev) => {
        const next = new Set(prev);
        const key = teamKey(sport, league, team);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({ favorites, allTeams, isTeamEnabled, toggleTeam, enabledCount, totalCount }),
    [favorites, allTeams, isTeamEnabled, toggleTeam, enabledCount, totalCount]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
