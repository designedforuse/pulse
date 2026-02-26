import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";

export interface ScoreData {
  awayScore: number;
  homeScore: number;
  period?: string;
  clock?: string;
  status?: string;
}

interface ScoresApiResponse {
  scores: Record<string, ScoreData>;
  fetchedAt: string;
}

interface ScoresContextValue {
  scores: Record<string, ScoreData>;
  getScore: (eventId: string) => ScoreData | undefined;
  isLoading: boolean;
}

const ScoresContext = createContext<ScoresContextValue | null>(null);

export function ScoresProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<ScoresApiResponse>({
    queryKey: ["/api/scores"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
  });

  const value = useMemo(() => {
    const scores = data?.scores ?? {};

    const getScore = (eventId: string): ScoreData | undefined => {
      return scores[eventId];
    };

    return { scores, getScore, isLoading };
  }, [data, isLoading]);

  return (
    <ScoresContext.Provider value={value}>{children}</ScoresContext.Provider>
  );
}

export function useScores() {
  const context = useContext(ScoresContext);
  if (!context) {
    throw new Error("useScores must be used within a ScoresProvider");
  }
  return context;
}
