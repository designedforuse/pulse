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
  leagueKey?: string;
  providerReason?: string;
  eventType?: string;
  sessionTitle?: string;
  competitionName?: string;
}

export interface F1FetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  raceCounts: Record<string, number>;
}

export interface F1MergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

const ESPN_F1_URL = "https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard";

const SESSION_LABELS: Record<string, string> = {
  FP1: "Practice 1",
  FP2: "Practice 2",
  FP3: "Practice 3",
  Qual: "Qualifying",
  Race: "Race",
  Sprint: "Sprint",
  SQ: "Sprint Qualifying",
};

const SESSION_PRIORITY: Record<string, number> = {
  Race: 1,
  Sprint: 2,
  Qual: 3,
  SQ: 4,
  FP3: 5,
  FP2: 6,
  FP1: 7,
};

function extractGrandPrixName(fullName: string): string {
  return fullName
    .replace(/^(Qatar Airways|Heineken|Aramco|Gulf Air|STC|Crypto\.com|Lenovo|MSC Cruises|Pirelli|AWS|Tag Heuer|Singapore Airlines|Etihad Airways)\s+/i, "")
    .trim();
}

function resolveF1Provider(broadcasts: any[]): { providerId: string; providerReason: string } {
  if (!broadcasts || broadcasts.length === 0) {
    return { providerId: "appletv", providerReason: "F1 default" };
  }
  const names = broadcasts.flatMap((b: any) => b.names || []).map((n: string) => n.toLowerCase());
  if (names.some(n => n.includes("espn") || n.includes("abc"))) {
    return { providerId: "disneyplus", providerReason: "ESPN/ABC broadcast" };
  }
  return { providerId: "appletv", providerReason: "Apple TV broadcast" };
}

function toUtcIso(utcDateStr: string): string {
  return new Date(utcDateStr).toISOString();
}

export async function fetchF1Events(): Promise<F1FetchResult> {
  const now = new Date();
  const yearStart = `${now.getFullYear()}0101`;
  const yearEnd = `${now.getFullYear()}1231`;
  const url = `${ESPN_F1_URL}?dates=${yearStart}-${yearEnd}`;

  console.log(`[F1] Fetching schedule from ESPN: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[F1] ESPN API returned ${res.status}`);
      return { events: [], sourceUsed: "espn-f1 (failed)", count: 0, raceCounts: {} };
    }

    const data = await res.json();
    const espnEvents = data.events || [];
    const events: AppEvent[] = [];
    const raceCounts: Record<string, number> = {};
    const cutoffPast = new Date(now.getTime() - 14 * 86400000);
    const cutoffFuture = new Date(now.getTime() + 60 * 86400000);

    for (const ev of espnEvents) {
      const grandPrixFull = ev.name || "Unknown Grand Prix";
      const grandPrixShort = extractGrandPrixName(grandPrixFull);
      const competitions = ev.competitions || [];

      for (const comp of competitions) {
        const sessionAbbrev = comp.type?.abbreviation || "Race";
        const sessionLabel = SESSION_LABELS[sessionAbbrev] || sessionAbbrev;
        const compDate = new Date(comp.date);

        if (compDate < cutoffPast || compDate > cutoffFuture) continue;

        const status = comp.status?.type;
        const isLive = status?.state === "in" || status?.name === "STATUS_IN_PROGRESS";
        const isFinal = status?.state === "post" || status?.name === "STATUS_FINAL";

        const { providerId, providerReason } = resolveF1Provider(comp.broadcasts);

        const eventId = `f1-espn-${comp.id}`;
        const utcTime = toUtcIso(comp.date);

        const endEstimate = new Date(compDate.getTime() + (sessionAbbrev === "Race" ? 7200000 : sessionAbbrev === "Sprint" ? 3600000 : 5400000));

        events.push({
          id: eventId,
          sport: "racing",
          league: "F1",
          awayTeam: sessionLabel,
          homeTeam: grandPrixShort,
          startTimeLocal: utcTime,
          endTimeLocal: toUtcIso(endEstimate.toISOString()),
          providerId,
          isLive,
          source: "espn-f1",
          leagueKey: "f1",
          providerReason,
          eventType: "session",
          sessionTitle: sessionLabel,
          competitionName: grandPrixShort,
        });

        raceCounts[grandPrixShort] = (raceCounts[grandPrixShort] || 0) + 1;
      }
    }

    console.log(`[F1] Fetched ${events.length} sessions across ${Object.keys(raceCounts).length} Grand Prix`);
    return { events, sourceUsed: "espn-f1", count: events.length, raceCounts };
  } catch (err: any) {
    console.error(`[F1] Fetch error: ${err.message}`);
    return { events: [], sourceUsed: "espn-f1 (error)", count: 0, raceCounts: {} };
  }
}

export function mergeF1Events(
  existing: AppEvent[],
  fetched: AppEvent[]
): F1MergeResult {
  const f1Existing = existing.filter((e) => e.source === "espn-f1");
  const nonF1 = existing.filter((e) => e.source !== "espn-f1");

  if (fetched.length === 0) {
    return { merged: f1Existing, added: 0, updated: 0, pruned: 0 };
  }

  const existingMap = new Map(f1Existing.map((e) => [e.id, e]));
  const fetchedMap = new Map(fetched.map((e) => [e.id, e]));
  let added = 0;
  let updated = 0;

  const merged: AppEvent[] = [];

  for (const ev of fetched) {
    if (existingMap.has(ev.id)) {
      updated++;
    } else {
      added++;
    }
    merged.push(ev);
  }

  const now = new Date();
  const cutoffPast = new Date(now.getTime() - 14 * 86400000);
  let pruned = 0;
  for (const ev of f1Existing) {
    if (!fetchedMap.has(ev.id)) {
      if (new Date(ev.startTimeLocal) >= cutoffPast) {
        merged.push(ev);
      } else {
        pruned++;
      }
    }
  }

  return { merged, added, updated, pruned };
}
