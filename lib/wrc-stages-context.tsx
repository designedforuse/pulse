import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";

export interface WrcStageWinner {
  name: string;
  carNumber: number | null;
  flag: string | null;
  time: string;
}

export interface WrcStage {
  stageNumber: number;
  legNumber: number;
  name: string;
  distance: number | null;
  cancelled: boolean;
  startTime: string;
  winner: WrcStageWinner | null;
}

export interface WrcStagesResult {
  roundId: string;
  eventName: string;
  totalStages: number;
  completedStages: number;
  stages: WrcStage[];
  fetchedAt: string;
}

// Strips the per-day suffix so "racing-wrc-japan-2026-day2" -> "racing-wrc-japan-2026".
export function getWrcRoundBaseId(eventId: string): string {
  return eventId.replace(/-day\d+$/, "");
}

// Each WRC day card's dayNumber maps directly to the rally leg number
// (round start times are pinned to the local first-stage day).
// `poll` should be true only while the rally is live — completed (FINAL) days
// have static winners, so they fetch once and stop polling.
export function useWrcStages(roundId: string | null, enabled: boolean, poll: boolean) {
  const { data } = useQuery<WrcStagesResult>({
    queryKey: ["/api/wrc-stages", roundId ?? ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!roundId && enabled,
    staleTime: 30 * 1000,
    refetchInterval: poll ? 30 * 1000 : false,
    retry: 1,
  });
  return data ?? null;
}

// Returns the stages for a given rally leg/day, in stage order.
export function getStagesForLeg(result: WrcStagesResult | null, legNumber: number): WrcStage[] {
  if (!result) return [];
  return result.stages
    .filter((s) => s.legNumber === legNumber)
    .sort((a, b) => a.stageNumber - b.stageNumber);
}

export function wrcFlagUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}
