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
  competitionType?: string;
  tournamentName?: string;
  roundLabel?: string;
}

export interface CwgFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  // Discipline id prefixes (e.g. "athletics-cwg-ath-") whose fetch failed.
  // The merge keeps cached events for these instead of treating the empty
  // fetch as authoritative — an API outage must not erase the Games feed.
  failedPrefixes: string[];
}

export interface CwgMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
}

// Glasgow 2026 Commonwealth Games — official Pulselive schedule API (no key).
// Discovered from www.glasgow2026.com widget code:
//   {BASE}/sessions?disciplineCodes=ATH&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Each session carries start/end UTC, venue, medalType (GOLD = finals session)
// and the list of event phases (used later for SA-athlete results).
export const CWG_API_BASE =
  "https://api.commonwealthsport.com/cwg-schedule/v1/cwg/competitions/3bb0d78e-d439-472a-a5bf-09b4e888aa04";
export const CWG_GAMES_START = "2026-07-23";
export const CWG_GAMES_END = "2026-08-02";

// Only track & field + swimming per user preference.
const CWG_DISCIPLINES: Record<string, string> = {
  ATH: "Athletics",
  SWM: "Swimming",
};

interface CwgSession {
  id: string;
  startDate: string;
  endDate: string;
  status?: string;
  medalType?: string | null;
  venue?: { description?: string };
  sessionEventPhases?: { phaseDescription?: string }[];
}

async function fetchSessions(disciplineCode: string): Promise<CwgSession[]> {
  const url = `${CWG_API_BASE}/sessions?disciplineCodes=${disciplineCode}&startDate=${CWG_GAMES_START}&endDate=${CWG_GAMES_END}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CWG sessions API ${res.status} for ${disciplineCode}`);
  const json = (await res.json()) as { sessions?: CwgSession[] };
  return json.sessions || [];
}

export async function fetchCommonwealthGamesEvents(): Promise<CwgFetchResult> {
  console.log("  Commonwealth Games: Fetching Glasgow 2026 sessions (ATH + SWM)...");

  const events: AppEvent[] = [];
  let sourceUsed = "cwg-api";
  const failedPrefixes: string[] = [];

  for (const [code, label] of Object.entries(CWG_DISCIPLINES)) {
    let sessions: CwgSession[];
    try {
      sessions = await fetchSessions(code);
    } catch (err) {
      console.error(`  Commonwealth Games: ${code} fetch failed:`, (err as Error).message);
      sourceUsed = "cwg-api-partial";
      failedPrefixes.push(`athletics-cwg-${code.toLowerCase()}-`);
      continue;
    }

    for (const s of sessions) {
      if (!s.id || !s.startDate) continue;
      const isFinals = s.medalType === "GOLD";
      const title = `${label} — ${isFinals ? "Finals" : "Heats"}`;
      events.push({
        // Session UUID is embedded so the Daily Wrap can fetch per-phase
        // results for this exact session later.
        id: `athletics-cwg-${code.toLowerCase()}-${s.id}`,
        sport: "athletics",
        league: "Commonwealth Games",
        awayTeam: "",
        homeTeam: title,
        startTimeLocal: s.startDate,
        endTimeLocal: s.endDate || undefined,
        providerId: "supersport",
        isLive: false,
        source: "cwg-api",
        leagueKey: "commonwealth-games",
        eventType: "session",
        sessionTitle: title,
        competitionType: "international",
        tournamentName: "Glasgow 2026",
        roundLabel: isFinals ? "Finals" : "Heats",
      });
    }
    console.log(`  Commonwealth Games: ${label} → ${sessions.length} sessions`);
  }

  events.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
  );

  return { events, sourceUsed, count: events.length, failedPrefixes };
}

export function mergeCommonwealthGamesEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date,
): CwgMergeResult {
  const index = new Map<string, AppEvent>();
  for (const e of existing) index.set(e.id, e);

  let added = 0;
  let updated = 0;
  for (const e of fresh) {
    if (index.has(e.id)) updated++;
    else added++;
    index.set(e.id, e);
  }

  // Short competition: keep the whole games window plus the standard 14-day
  // look-back so concluded sessions stay available for the Daily Wrap.
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 30 * 86400000);

  const beforePrune = index.size;
  const merged = [...index.values()].filter((e) => {
    const start = new Date(e.startTimeLocal);
    return start >= windowStart && start <= windowEnd;
  });
  const pruned = beforePrune - merged.length;
  merged.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
  );

  return { merged, added, updated, pruned };
}
