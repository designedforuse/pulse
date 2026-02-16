interface AppEvent {
  id: string;
  sport: string;
  league: string;
  awayTeam: string;
  homeTeam: string;
  startTimeLocal: string;
  endTimeLocal?: string;
  providerId: string;
  isLive: boolean;
  source: string;
}

interface MergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

const RETENTION_PAST_DAYS = 14;
const RETENTION_FUTURE_DAYS = 21;

export function mergeAhlEvents(
  existingAhl: AppEvent[],
  freshAhl: AppEvent[],
  now: Date
): MergeResult {
  const index = new Map<string, AppEvent>();
  for (const e of existingAhl) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of freshAhl) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const windowStart = new Date(now.getTime() - RETENTION_PAST_DAYS * 86400000);
  const windowEnd = new Date(now.getTime() + RETENTION_FUTURE_DAYS * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;

  merged.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
