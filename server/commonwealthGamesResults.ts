// --- Glasgow 2026 Commonwealth Games results (athletics & swimming) ---
// The Daily Wrap surfaces concluded CWG finals sessions, but the games have no
// entry in the keyed live-scores map, so results come from the same keyless
// Pulselive API that powers glasgow2026.com:
//   {BASE}/sessions?disciplineCodes=ATH&startDate=...&endDate=...
//     -> sessions with per-phase list (phaseCode "FNL-" = final)
//   {BASE}/session/{sessionId}/details?eventCode=..&phaseCode=..&genderCode=..&disciplineCode=..
//     -> phaseResults[].inline.athleteResult[] with organisationCode (RSA),
//        rank, result, tvName and record indicators.
import {
  CWG_API_BASE,
  CWG_GAMES_START,
  CWG_GAMES_END,
} from "../scripts/updateCommonwealthGames";

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface CwgAthleteResult {
  athlete: string; // "Akani Simbine"
  nation: string; // IOC/CGA code, e.g. "RSA"
  discipline: string; // "men's 100m" (lowercase, ready for headlines)
  rank: number;
  performance: string; // "9.94" | "20.03"
  record: string; // "" | "GR" | "NR" ...
}

export interface CwgSessionSummary {
  sessionId: string;
  discipline: string; // "Athletics" | "Swimming"
  saResults: CwgAthleteResult[]; // RSA results in finals, best finish first
  notable: CwgAthleteResult[]; // finals winners, record-setters first
}

interface RawPhase {
  phaseCode?: string;
  phaseDescription?: string;
  eventCode?: string;
  genderCode?: string;
  status?: string;
}

interface RawSession {
  id: string;
  sessionEventPhases?: RawPhase[];
}

const cache = new Map<string, { ts: number; data: CwgSessionSummary | null }>();

const DISCIPLINE_LABELS: Record<string, string> = {
  ath: "Athletics",
  swm: "Swimming",
};

// PB/SB are routine at a games; only genuinely newsworthy records should
// promote a non-winner into (or reorder) the notable list.
const MAJOR_RECORDS = new Set(["WR", "GR", "CR", "AR", "NR", "AF", "OC", "AS", "EU", "AM"]);
function isMajorRecord(record: string): boolean {
  return (record || "")
    .toUpperCase()
    .split(",")
    .some((t) => MAJOR_RECORDS.has(t.trim().replace(/=/g, "")));
}

function titleCaseName(word: string): string {
  return word
    .split(/([\s\-'])/)
    .map((p) => (/^[\s\-']$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

// "Men's 100m Final" -> "men's 100m"; "Women's 4 x 100m Freestyle Relay Final"
// -> "women's 4 x 100m freestyle relay".
function formatDiscipline(unitDescription: string): string {
  return (unitDescription || "")
    .replace(/\s*Final$/i, "")
    .trim()
    .toLowerCase();
}

async function cwgFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CWG API ${res.status}: ${url}`);
  return res.json();
}

async function buildSummary(
  disc: string,
  sessionId: string,
): Promise<CwgSessionSummary | null> {
  const discUpper = disc.toUpperCase();
  const sessionsJson = await cwgFetch(
    `${CWG_API_BASE}/sessions?disciplineCodes=${discUpper}&startDate=${CWG_GAMES_START}&endDate=${CWG_GAMES_END}`,
  );
  const session: RawSession | undefined = (sessionsJson.sessions || []).find(
    (s: RawSession) => s.id === sessionId,
  );
  if (!session) return null;

  // Finals only: medals are decided in FNL- phases; heats/semis aren't wrap-worthy.
  const finals = (session.sessionEventPhases || []).filter(
    (p) => p.phaseCode === "FNL-" && p.status === "COMPLETE" && p.eventCode,
  );
  if (finals.length === 0) return null;

  const saResults: CwgAthleteResult[] = [];
  const notable: CwgAthleteResult[] = [];

  for (const phase of finals) {
    let details: any;
    try {
      const q =
        `?eventCode=${encodeURIComponent(phase.eventCode!)}` +
        `&phaseCode=${encodeURIComponent(phase.phaseCode!)}` +
        `&genderCode=${phase.genderCode || ""}` +
        `&disciplineCode=${discUpper}`;
      details = await cwgFetch(`${CWG_API_BASE}/session/${sessionId}/details${q}`);
    } catch {
      continue; // one broken final shouldn't sink the whole session summary
    }

    for (const pr of details?.phaseResults || []) {
      const discipline = formatDiscipline(pr.unitDescription || pr.description || phase.phaseDescription || "");
      for (const ar of pr?.inline?.athleteResult || []) {
        const rank = parseInt(ar?.rank, 10);
        if (!Number.isFinite(rank)) continue; // DNF/DSQ etc.
        const athletes = ar?.compositionAthletes || [];
        const isTeam = athletes.length !== 1;
        const name = isTeam
          ? ar?.organisationName || ar?.organisationCode || ""
          : `${titleCaseName(athletes[0]?.givenName || "")} ${titleCaseName(athletes[0]?.familyName || "")}`.trim();
        if (!name) continue;
        const record = (ar?.indicators || [])
          .map((i: any) => i?.recordType)
          .filter(Boolean)
          .join(",");
        const result: CwgAthleteResult = {
          athlete: name,
          nation: ar?.organisationCode || "",
          discipline,
          rank,
          performance: ar?.result || "",
          record,
        };
        if (result.nation === "RSA") saResults.push(result);
        else if (rank === 1 || isMajorRecord(record)) notable.push(result);
      }
    }
  }

  saResults.sort((a, b) => a.rank - b.rank || (b.record ? 1 : 0) - (a.record ? 1 : 0));
  notable.sort(
    (a, b) =>
      (isMajorRecord(b.record) ? 1 : 0) - (isMajorRecord(a.record) ? 1 : 0) ||
      a.rank - b.rank,
  );

  return {
    sessionId,
    discipline: DISCIPLINE_LABELS[disc.toLowerCase()] || disc,
    saResults,
    notable,
  };
}

export async function fetchCwgSessionSummary(
  disc: string,
  sessionId: string,
): Promise<CwgSessionSummary | null> {
  const key = `${disc}/${sessionId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  let data: CwgSessionSummary | null = null;
  try {
    data = await buildSummary(disc, sessionId);
  } catch (err) {
    console.error(`[CWG] session summary failed for ${key}:`, (err as Error).message);
    data = null;
  }
  cache.set(key, { ts: Date.now(), data });
  return data;
}
