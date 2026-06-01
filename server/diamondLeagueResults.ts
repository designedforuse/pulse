// --- Wanda Diamond League results (athletics) ---
// The Daily Wrap surfaces concluded Diamond League meets, but athletics has no
// entry in the keyed live-scores map, so results come from the same Swiss Timing
// feed that powers the official diamondleague.com live-results widget.
//
// Feed shape (no key required):
//   {BASE}/seasons.json                 -> [2004, ..., 2026]
//   {BASE}/{season}/meetings.json       -> { JsonNames: ["shanghai", "rabat", ...] }
//   {BASE}/{season}/{meeting}.json      -> full meet results (per discipline)
//
// We only need the per-meet results file. Each discipline carries a Results array
// with the athlete, 3-letter IOC Nation code (RSA = South Africa), finishing Rank,
// best performance, and a RecordFlag ("WR", "WL", "MR", "AR", "NR", "SB", ...).

const BASE = "https://ath-wdl-archive.azureedge.net";
const CACHE_TTL_MS = 10 * 60 * 1000;

interface RawResult {
  Athlete?: string;
  Firstname?: string;
  Lastname?: string;
  Nation?: string;
  Rank?: number | string;
  DR_Rank?: number | string;
  DR_Points?: number;
  BestPerformance?: string;
  RecordFlag?: string;
}

interface RawHeat {
  Info?: { Event_Name?: string; IsFinal?: boolean };
  Results?: RawResult[];
}

interface RawDiscipline {
  Name?: string;
  Gender?: string;
  IsDiamondRace?: boolean;
  Data?: Record<string, RawHeat>;
}

interface RawMeeting {
  Name?: string;
  Data?: { ResultData?: Record<string, RawDiscipline> };
}

export interface DLAthleteResult {
  athlete: string; // display name, e.g. "Sinesipho Dambile"
  nation: string; // 3-letter IOC code, e.g. "RSA"
  discipline: string; // raw discipline name, e.g. "200m Men"
  rank: number;
  performance: string; // e.g. "20.03"
  recordFlag: string; // e.g. "" | "MR" | "WL,NR"
  isDiamondRace: boolean;
}

export interface DLMeetingSummary {
  meeting: string; // "rabat"
  season: string; // "2026"
  saResults: DLAthleteResult[]; // South African (RSA) results, best finish first
  notable: DLAthleteResult[]; // record-setters + marquee winners, most significant first
}

const cache = new Map<string, { ts: number; data: DLMeetingSummary | null }>();

function titleCase(word: string): string {
  return word
    .split(/([\s-])/)
    .map((part) =>
      /^[\s-]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
}

// Feed names arrive as "DAMBILE Sinesipho" (surname upper-cased) or split across
// Firstname/Lastname. Normalise to "Firstname Surname" with regular casing.
function formatAthlete(r: RawResult): string {
  const first = (r.Firstname || "").trim();
  const last = (r.Lastname || "").trim();
  if (first && last) return `${titleCase(first)} ${titleCase(last)}`;
  const raw = (r.Athlete || "").trim();
  if (!raw) return "";
  const tokens = raw.split(/\s+/);
  const surname: string[] = [];
  const given: string[] = [];
  for (const t of tokens) {
    if (t === t.toUpperCase() && /[A-Z]/.test(t)) surname.push(t);
    else given.push(t);
  }
  if (surname.length && given.length) {
    return `${given.map(titleCase).join(" ")} ${surname.map(titleCase).join(" ")}`;
  }
  return raw;
}

function toRank(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Higher = more newsworthy. Drives which record/win leads the "interesting
// outcome" headline when no South African result is available.
function recordSignificance(flag: string): number {
  const f = (flag || "").toUpperCase();
  if (f.includes("WR")) return 100;
  if (f.includes("WL")) return 80;
  if (f.includes("AR")) return 70;
  if (f.includes("NR")) return 60;
  if (f.includes("MR")) return 50;
  return 0;
}

function parseMeeting(raw: RawMeeting, meeting: string, season: string): DLMeetingSummary {
  const resultData = raw?.Data?.ResultData || {};
  const sa: DLAthleteResult[] = [];
  const records: DLAthleteResult[] = [];
  const winners: DLAthleteResult[] = [];

  for (const disc of Object.values(resultData)) {
    const discipline = (disc?.Name || "").trim();
    const isDR = !!disc?.IsDiamondRace;
    for (const heat of Object.values(disc?.Data || {})) {
      for (const r of heat?.Results || []) {
        const rank = toRank(r.Rank);
        const athlete = formatAthlete(r);
        if (rank == null || !athlete) continue;
        const entry: DLAthleteResult = {
          athlete,
          nation: (r.Nation || "").trim().toUpperCase(),
          discipline,
          rank,
          performance: (r.BestPerformance || "").trim(),
          recordFlag: (r.RecordFlag || "").trim(),
          isDiamondRace: isDR,
        };
        if (entry.nation === "RSA") sa.push(entry);
        if (recordSignificance(entry.recordFlag) > 0) records.push(entry);
        if (rank === 1) winners.push(entry);
      }
    }
  }

  // South African results: best finish first, then record-flagged, then DR events.
  sa.sort(
    (a, b) =>
      a.rank - b.rank ||
      recordSignificance(b.recordFlag) - recordSignificance(a.recordFlag) ||
      Number(b.isDiamondRace) - Number(a.isDiamondRace),
  );

  // Notable outcomes: records first (by significance), then fall back to marquee
  // winners (Diamond Race disciplines win the tie-break) so there is always a
  // story to tell even on a meet with no records.
  records.sort(
    (a, b) => recordSignificance(b.recordFlag) - recordSignificance(a.recordFlag) || a.rank - b.rank,
  );
  winners.sort((a, b) => Number(b.isDiamondRace) - Number(a.isDiamondRace));
  const notable = [...records, ...winners.filter((w) => recordSignificance(w.recordFlag) === 0)];

  return { meeting, season, saResults: sa, notable };
}

export async function fetchDiamondLeagueSummary(
  meeting: string,
  season: string,
): Promise<DLMeetingSummary | null> {
  const key = `${season}/${meeting}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  let data: DLMeetingSummary | null = null;
  try {
    const res = await fetch(`${BASE}/${season}/${meeting}.json`);
    if (res.ok) {
      const raw = (await res.json()) as RawMeeting;
      data = parseMeeting(raw, meeting, season);
    }
  } catch {
    data = null;
  }

  cache.set(key, { ts: Date.now(), data });
  return data;
}
