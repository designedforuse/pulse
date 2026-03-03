import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ritual.featuredOverrides";

interface RitualOverrides {
  overrides: Record<string, string>;
  loaded: boolean;
  setOverride: (ritualId: string, eventId: string) => void;
  clearOverride: (ritualId: string) => void;
  getOverride: (ritualId: string) => string | null;
}

const RitualOverridesContext = createContext<RitualOverrides>({
  overrides: {},
  loaded: false,
  setOverride: () => {},
  clearOverride: () => {},
  getOverride: () => null,
});

export function RitualOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          ref.current = parsed;
          setOverrides(parsed);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: Record<string, string>) => {
    ref.current = next;
    setOverrides(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setOverride = useCallback((ritualId: string, eventId: string) => {
    persist({ ...ref.current, [ritualId]: eventId });
  }, [persist]);

  const clearOverride = useCallback((ritualId: string) => {
    const next = { ...ref.current };
    delete next[ritualId];
    persist(next);
  }, [persist]);

  const getOverride = useCallback((ritualId: string): string | null => {
    return overrides[ritualId] || null;
  }, [overrides]);

  return (
    <RitualOverridesContext.Provider value={{ overrides, loaded, setOverride, clearOverride, getOverride }}>
      {children}
    </RitualOverridesContext.Provider>
  );
}

export function useRitualOverrides() {
  return useContext(RitualOverridesContext);
}
