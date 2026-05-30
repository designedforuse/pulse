import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";

export interface TennisSetScore {
  p1: number;
  p2: number;
  tiebreak?: string;
  winner?: 1 | 2;
}

export interface ScoreData {
  awayScore: number;
  homeScore: number;
  awayShootoutScore?: number;
  homeShootoutScore?: number;
  period?: string;
  clock?: string;
  status?: string;
  cricketAway?: string;
  cricketHome?: string;
  secondsRemaining?: number;
  periodNumber?: number;
  periodType?: string;
  inIntermission?: boolean;
  gameState?: string;
  awaySog?: number;
  homeSog?: number;
  lastGoalTimeInPeriod?: string;
  lastGoalPeriod?: number;
  lastGoalStrength?: string;
  lastGoalTeam?: string;
  goalCount?: number;
  situationCode?: string;
  tennisSetScores?: TennisSetScore[];
  tennisGameScore?: { p1: string; p2: string };
  tennisServer?: 1 | 2;
  tennisStatusDetail?: string;
  tennisWinner?: 1 | 2;
  racingStatus?: string;
  racingLap?: string;
  racingLeader?: string;
  racingLeaderCountry?: string;
  racingLeaderTeam?: string;
  racingLeaderPosition?: number;
  racingLeaderNumber?: number;
  racingLeaderGrid?: number;
  racingLapNum?: number;
  racingTotalLaps?: number;
  racingSessionType?: string;
  golfLeader?: string;
  golfLeaderScore?: string;
  golfLeaderCountry?: string;
  golfLeaderThru?: string;
  golfRound?: number;
  golfActiveLeader?: string;
  golfActiveLeaderScore?: string;
  golfActiveLeaderCountry?: string;
  golfActiveLeaderThru?: string;
  marathonLeader?: string;
  marathonLeaderSplit?: string;
  marathonLeaderSplitTime?: string;
  marathonLeaderGap?: string;
  marathonRaceStatus?: "active" | "finished";
  cyclingLeader?: string;
  cyclingLeaderTeam?: string;
  cyclingLeaderCountry?: string;
  cyclingLeaderGap?: string;
  cyclingStageNumber?: number;
}

export interface SeriesStatus {
  round?: number;
  seriesAbbrev?: string;
  seriesTitle?: string;
  topSeedTeamAbbrev: string;
  topSeedWins: number;
  bottomSeedTeamAbbrev: string;
  bottomSeedWins: number;
  gameNumberOfSeries?: number;
  neededToWin?: number;
}

interface ScoresApiResponse {
  scores: Record<string, ScoreData>;
  seriesStatuses?: Record<string, SeriesStatus>;
  fetchedAt: string;
}

interface ScoresContextValue {
  scores: Record<string, ScoreData>;
  seriesStatuses: Record<string, SeriesStatus>;
  getScore: (eventId: string) => ScoreData | undefined;
  getSeriesStatus: (eventId: string) => SeriesStatus | undefined;
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
    const seriesStatuses = data?.seriesStatuses ?? {};

    const getScore = (eventId: string): ScoreData | undefined => {
      return scores[eventId];
    };

    const getSeriesStatus = (eventId: string): SeriesStatus | undefined => {
      return seriesStatuses[eventId];
    };

    return { scores, seriesStatuses, getScore, getSeriesStatus, isLoading };
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
