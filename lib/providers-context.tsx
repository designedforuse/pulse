import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SportEvent } from "@/lib/data";

const STORAGE_KEY = "prefs.disabledProviders";

export interface ProviderEntry {
  id: string;
  label: string;
  logoId: string;
}

export const PROVIDER_LIST: ProviderEntry[] = [
  { id: "espn",          label: "ESPN",                   logoId: "espn" },
  { id: "nbcsn",         label: "NBC Sports",             logoId: "nbcsn" },
  { id: "cbssn",         label: "CBS Sports",             logoId: "cbssn" },
  { id: "fox",           label: "Fox Sports",             logoId: "fox" },
  { id: "tnt",           label: "TNT",                    logoId: "tnt" },
  { id: "primevideo",    label: "Prime Video",            logoId: "primevideo" },
  { id: "appletv",       label: "Apple TV+",              logoId: "appletv" },
  { id: "flosports",     label: "FloSports",              logoId: "flosports" },
  { id: "beinsports",    label: "beIN Sports",            logoId: "beinsports" },
  { id: "fanduelsn",     label: "FanDuel Sports Network", logoId: "fanduelsn" },
  { id: "victoryplus",   label: "Victory+",               logoId: "victoryplus" },
  { id: "nbatv",         label: "NBA TV",                 logoId: "nbatv" },
  { id: "nbaleaguepass", label: "NBA League Pass",        logoId: "nbaleaguepass" },
  { id: "nwslplus",      label: "NWSL+",                  logoId: "nwslplus" },
  { id: "tennischannel", label: "Tennis Channel",         logoId: "tennischannel" },
  { id: "willowtv",      label: "Willow TV",              logoId: "willowtv" },
  { id: "rugbypasstv",   label: "RugbyPass TV",           logoId: "rugbypasstv" },
  { id: "ion",           label: "ION",                    logoId: "ion" },
];

export function getEventBroadcasterIds(event: SportEvent): string[] {
  const pid = event.providerId || "";
  const bc = (event.broadcastNetworks || "").toLowerCase();

  switch (pid) {
    case "flosports":     return ["flosports"];
    case "disneyplus":    return ["espn"];
    case "tnt":           return ["tnt"];
    case "primevideo":    return ["primevideo"];
    case "appletv":       return ["appletv"];
    case "willowtv":      return ["willowtv"];
    case "victoryplus":   return ["victoryplus"];
    case "nwslplus":      return ["nwslplus"];
    case "rugbypasstv":   return ["rugbypasstv"];
    case "beinsports":    return ["beinsports"];
    case "nbaleaguepass": return ["nbaleaguepass"];
    case "youtubetv": {
      const ids: string[] = [];
      if (bc.includes("fox") || bc.includes("fs1") || bc.includes("fs 1")) ids.push("fox");
      if (bc.includes("nbc")) ids.push("nbcsn");
      if (bc.includes("cbs")) ids.push("cbssn");
      if (bc.includes("fanduel")) ids.push("fanduelsn");
      if (bc.includes("nba tv")) ids.push("nbatv");
      if (bc.includes("tennis channel")) ids.push("tennischannel");
      if (bc.includes("ion")) ids.push("ion");
      if (bc.includes("tnt") || bc.includes("trutv") || bc.includes("truetv") || bc.includes("hbo max")) ids.push("tnt");
      return ids.length > 0 ? ids : ["fox"];
    }
    default: return [];
  }
}

interface ProvidersContextValue {
  disabledProviders: Set<string>;
  isProviderEnabled: (id: string) => boolean;
  toggleProvider: (id: string) => void;
}

const ProvidersContext = createContext<ProvidersContextValue | null>(null);

export function ProvidersProvider({ children }: { children: ReactNode }) {
  const [disabledProviders, setDisabledProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setDisabledProviders(new Set(arr));
        } catch {}
      }
    });
  }, []);

  const toggleProvider = useCallback((id: string) => {
    setDisabledProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isProviderEnabled = useCallback(
    (id: string) => !disabledProviders.has(id),
    [disabledProviders]
  );

  const value = useMemo(
    () => ({ disabledProviders, isProviderEnabled, toggleProvider }),
    [disabledProviders, isProviderEnabled, toggleProvider]
  );

  return (
    <ProvidersContext.Provider value={value}>
      {children}
    </ProvidersContext.Provider>
  );
}

export function useProviders() {
  const ctx = useContext(ProvidersContext);
  if (!ctx) throw new Error("useProviders must be used within ProvidersProvider");
  return ctx;
}
