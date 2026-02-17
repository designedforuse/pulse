import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getQueryFn } from "@/lib/query-client";
import guideData from "@/data/masterGuide.json";
import type { SportEvent, Pack } from "@/lib/data";

const DEBUG_KEY = "prefs.debugShowAll";
const SVNS_KEY = "prefs.showSvnsSessions";
const FAVS_ONLY_KEY = "prefs.favoritesOnly";

const cricketLeagueToRegion: Record<string, string> = {
  IPL: "India",
  BBL: "Australia",
  "Super Smash": "New Zealand",
  SA20: "South Africa",
  "The Hundred": "England",
  CPL: "Caribbean",
  MLC: "United States",
};

const NIGHTS_HOST_COUNTRIES = new Set(["India", "Australia", "New Zealand"]);
const MORNINGS_HOST_COUNTRIES = new Set(["South Africa", "England", "West Indies", "Caribbean"]);

interface ApiResponse {
  source: string;
  lastUpdated: string | null;
  events: SportEvent[];
}

interface EventsContextValue {
  allEvents: SportEvent[];
  isLoading: boolean;
  getEventsForPack: (pack: Pack) => SportEvent[];
  findEvent: (id: string) => SportEvent | undefined;
  debugShowAll: boolean;
  setDebugShowAll: (val: boolean) => void;
  showSvnsSessions: boolean;
  setShowSvnsSessions: (val: boolean) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (val: boolean) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [debugShowAll, setDebugShowAllState] = useState(false);
  const [showSvnsSessions, setShowSvnsState] = useState(true);
  const [favoritesOnly, setFavoritesOnlyState] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([DEBUG_KEY, SVNS_KEY, FAVS_ONLY_KEY]).then((entries) => {
      for (const [key, val] of entries) {
        if (key === DEBUG_KEY && val === "true") setDebugShowAllState(true);
        if (key === SVNS_KEY && val === "false") setShowSvnsState(false);
        if (key === FAVS_ONLY_KEY && val === "true") setFavoritesOnlyState(true);
      }
    });
  }, []);

  const setDebugShowAll = (val: boolean) => {
    setDebugShowAllState(val);
    AsyncStorage.setItem(DEBUG_KEY, val.toString());
  };

  const setShowSvnsSessions = (val: boolean) => {
    setShowSvnsState(val);
    AsyncStorage.setItem(SVNS_KEY, val.toString());
  };

  const setFavoritesOnly = (val: boolean) => {
    setFavoritesOnlyState(val);
    AsyncStorage.setItem(FAVS_ONLY_KEY, val.toString());
  };

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/events?days=14"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const allEvents = useMemo(() => {
    const localEvents = (guideData.events || []) as SportEvent[];
    if (!data?.events || data.events.length === 0) {
      return localEvents;
    }

    const apiEvents = data.events;
    const apiLeagues = new Set(apiEvents.map((e) => e.league));
    const localFiltered = localEvents.filter((e) => !apiLeagues.has(e.league));

    return [...apiEvents, ...localFiltered];
  }, [data]);

  const value = useMemo(() => {
    const isSvnsSession = (e: SportEvent) => e.eventType === "session" && e.leagueKey === "svns";

    const getEventsForPack = (pack: Pack): SportEvent[] => {
      return allEvents.filter((event) => {
        if (!showSvnsSessions && isSvnsSession(event)) return false;
        if (event.sport !== pack.sport) return false;
        if (pack.leagues) {
          return pack.leagues.includes(event.league);
        }
        if (pack.hostRegions) {
          if (event.hostCountry) {
            return pack.hostRegions.includes(event.hostCountry);
          }
          const region = cricketLeagueToRegion[event.league];
          return region ? pack.hostRegions.includes(region) : false;
        }
        return false;
      });
    };

    const findEvent = (id: string): SportEvent | undefined => {
      return allEvents.find((e) => e.id === id);
    };

    return {
      allEvents: showSvnsSessions ? allEvents : allEvents.filter((e) => !isSvnsSession(e)),
      isLoading,
      getEventsForPack,
      findEvent,
      debugShowAll,
      setDebugShowAll,
      showSvnsSessions,
      setShowSvnsSessions,
      favoritesOnly,
      setFavoritesOnly,
    };
  }, [allEvents, isLoading, debugShowAll, showSvnsSessions, favoritesOnly]);

  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
