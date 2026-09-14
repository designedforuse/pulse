import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SportEvent } from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import {
  getSerieAMatchIdentityAliases,
  parseViewingPlan,
  reconcileViewingPlan,
  removeViewingPlanItem,
  serializeViewingPlan,
  upsertViewingPlanItem,
  type ViewingPlanChoice,
  type ViewingPlanSnapshot,
} from "@/lib/viewing-plan";

export const VIEWING_PLAN_STORAGE_KEY = "pulse.viewingPlan.v1";

interface ViewingPlanContextValue {
  items: ViewingPlanSnapshot[];
  hydrated: boolean;
  persistenceError: string | null;
  isSaved: (event: SportEvent) => boolean;
  getSavedItem: (event: SportEvent) => ViewingPlanSnapshot | undefined;
  setChoice: (event: SportEvent, choice: ViewingPlanChoice) => void;
  remove: (itemOrEvent: ViewingPlanSnapshot | SportEvent) => void;
  clearPersistenceError: () => void;
}

const ViewingPlanContext = createContext<ViewingPlanContextValue | null>(null);

export function ViewingPlanProvider({ children }: { children: ReactNode }) {
  const { allEvents } = useEvents();
  const [items, setItems] = useState<ViewingPlanSnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const mutationVersionRef = useRef(0);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef(items);
  const hydratedRef = useRef(false);
  itemsRef.current = items;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reportPersistenceError = useCallback((error: unknown) => {
    if (!mountedRef.current) return;
    const message = error instanceof Error ? error.message : "Unable to save your viewing plan.";
    setPersistenceError(`Your viewing plan could not be saved. ${message}`);
  }, []);

  const persist = useCallback(
    (next: ViewingPlanSnapshot[], previous: ViewingPlanSnapshot[]) => {
      const serialized = serializeViewingPlan(next);
      const mutationVersion = ++mutationVersionRef.current;
      writeQueueRef.current = writeQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await AsyncStorage.setItem(VIEWING_PLAN_STORAGE_KEY, serialized);
          if (mountedRef.current && mutationVersion === mutationVersionRef.current) {
            setPersistenceError(null);
          }
        })
        .catch((error) => {
          reportPersistenceError(error);
          // A failed write must not silently turn an explicit delete into a
          // durable delete. Roll back only when no newer mutation superseded it.
          if (
            mountedRef.current &&
            mutationVersion === mutationVersionRef.current &&
            JSON.stringify(itemsRef.current) === JSON.stringify(next)
          ) {
            itemsRef.current = previous;
            setItems(previous);
          }
        });
    },
    [reportPersistenceError],
  );

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(VIEWING_PLAN_STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !mountedRef.current) return;
        const stored = parseViewingPlan(raw);
        if (mutationVersionRef.current === 0) {
          setItems(stored);
          itemsRef.current = stored;
        } else {
          // A user can tap before hydration completes. Merge, rather than
          // replacing that optimistic mutation with the late storage read.
          const merged = parseViewingPlan(
            serializeViewingPlan([...stored, ...itemsRef.current]),
          );
          setItems(merged);
          itemsRef.current = merged;
          persist(merged, itemsRef.current);
        }
        hydratedRef.current = true;
        setHydrated(true);
      })
      .catch((error) => {
        if (cancelled || !mountedRef.current) return;
        hydratedRef.current = true;
        setHydrated(true);
        reportPersistenceError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [persist, reportPersistenceError]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const reconciled = reconcileViewingPlan(itemsRef.current, allEvents);
    if (!reconciled.changed) return;
    const previous = itemsRef.current;
    itemsRef.current = reconciled.items;
    setItems(reconciled.items);
    persist(reconciled.items, previous);
  }, [allEvents, persist]);

  const setChoice = useCallback(
    (event: SportEvent, choice: ViewingPlanChoice) => {
      const previous = itemsRef.current;
      const next = upsertViewingPlanItem(previous, event, choice);
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      itemsRef.current = next;
      setItems(next);
      persist(next, previous);
    },
    [persist],
  );

  const remove = useCallback(
    (itemOrEvent: ViewingPlanSnapshot | SportEvent) => {
      const previous = itemsRef.current;
      const next = removeViewingPlanItem(previous, itemOrEvent);
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      itemsRef.current = next;
      setItems(next);
      persist(next, previous);
    },
    [persist],
  );

  const isSaved = useCallback(
    (event: SportEvent) => {
      const aliases = new Set(getSerieAMatchIdentityAliases(event));
      return !!itemsRef.current.find((item) =>
        item.eventId === event.id ||
        item.identityAliases.some((alias) => aliases.has(alias)),
      );
    },
    [],
  );

  const getSavedItem = useCallback(
    (event: SportEvent) =>
      itemsRef.current.find((item) => item.eventId === event.id) ||
      itemsRef.current.find((item) => {
        const aliases = new Set(getSerieAMatchIdentityAliases(event));
        return item.identityAliases.some((alias) => aliases.has(alias));
      }),
    [],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      persistenceError,
      isSaved,
      getSavedItem,
      setChoice,
      remove,
      clearPersistenceError: () => setPersistenceError(null),
    }),
    [items, hydrated, persistenceError, isSaved, getSavedItem, setChoice, remove],
  );

  return <ViewingPlanContext.Provider value={value}>{children}</ViewingPlanContext.Provider>;
}

export function useViewingPlan() {
  const context = useContext(ViewingPlanContext);
  if (!context) throw new Error("useViewingPlan must be used within ViewingPlanProvider");
  return context;
}