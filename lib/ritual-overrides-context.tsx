import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ritual.featuredOverrides";

interface RitualOverrides {
  overrides: Record<string, string>;
  setOverride: (ritualId: string, eventId: string) => void;
  clearOverride: (ritualId: string) => void;
  getOverride: (ritualId: string) => string | null;
}

const RitualOverridesContext = createContext<RitualOverrides>({
  overrides: {},
  setOverride: () => {},
  clearOverride: () => {},
  getOverride: () => null,
});

export function RitualOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setOverrides(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Record<string, string>) => {
    setOverrides(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setOverride = useCallback((ritualId: string, eventId: string) => {
    persist({ ...overrides, [ritualId]: eventId });
  }, [overrides, persist]);

  const clearOverride = useCallback((ritualId: string) => {
    const next = { ...overrides };
    delete next[ritualId];
    persist(next);
  }, [overrides, persist]);

  const getOverride = useCallback((ritualId: string): string | null => {
    return overrides[ritualId] || null;
  }, [overrides]);

  return (
    <RitualOverridesContext.Provider value={{ overrides, setOverride, clearOverride, getOverride }}>
      {children}
    </RitualOverridesContext.Provider>
  );
}

export function useRitualOverrides() {
  return useContext(RitualOverridesContext);
}
