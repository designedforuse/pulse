import * as fs from "fs";
import * as path from "path";

const RUGBY_DURATION_MIN = 135;

const ICAL_FEEDS: Record<string, string> = {
  urc: "https://data.rugbyfixture.io/ical/v1/urc.ics",
  top14: "https://data.rugbyfixture.io/ical/v1/top14.ics",
  superrugby: "https://fixturedownload.com/download/super-rugby-pacific-2026-UTC.ics",
};

const LEAGUE_LABELS: Record<string, string> = {
  urc: "URC",
  top14: "Top 14",
  superrugby: "Super Rugby",
};

const LEAGUE_PROVIDERS: Record<string, string> = {
  urc: "flosports",
  top14: "flosports",
  superrugby: "primevideo",
};

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
  leagueKey: string;
}

interface VEvent {
  dtstart: string;
  dtend?: string;
  summary: string;
  uid: string;
  location?: string;
}

export interface RugbyFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  counts: Record<string, number>;
}

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function parseIcalDate(raw: string): string | null {
  const cleaned = raw.replace(/\r/g, "").trim();
  if (/^\d{8}T\d{6}Z$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.slice(6, 8);
    const hh = cleaned.slice(9, 11);
    const mm = cleaned.slice(11, 13);
    const ss = cleaned.slice(13, 15);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
  }
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.slice(6, 8);
    const hh = cleaned.slice(9, 11);
    const mm = cleaned.slice(11, 13);
    const ss = cleaned.slice(13, 15);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
  }
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

function parseIcalText(ical: string): VEvent[] {
  const lines: string[] = [];
  for (const rawLine of ical.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      }
    } else {
      lines.push(line);
    }
  }

  const events: VEvent[] = [];
  let current: Partial<VEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.dtstart && current.summary) {
        events.push(current as VEvent);
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).split(";")[0].toUpperCase();
      const value = line.slice(colonIdx + 1);
      switch (key) {
        case "DTSTART":
          current.dtstart = value;
          break;
        case "DTEND":
          current.dtend = value;
          break;
        case "SUMMARY":
          current.summary = value;
          break;
        case "UID":
          current.uid = value;
          break;
        case "LOCATION":
          current.location = value;
          break;
      }
    }
  }

  return events;
}

function parseTeams(summary: string): { homeTeam: string; awayTeam: string } | null {
  let cleaned = summary
    .replace(/ - Super Rugby Pacific \d{4} Round \d+/i, "")
    .replace(/ - .*$/, "")
    .trim();

  const vsMatch = cleaned.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) {
    return { homeTeam: vsMatch[1].trim(), awayTeam: vsMatch[2].trim() };
  }
  return null;
}

async function fetchIcalFeed(url: string, leagueKey: string): Promise<VEvent[]> {
  console.log(`  Rugby [${leagueKey}]: Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.error(`  Rugby [${leagueKey}]: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    const events = parseIcalText(text);
    console.log(`  Rugby [${leagueKey}]: Parsed ${events.length} VEVENT entries`);
    return events;
  } catch (err) {
    console.error(`  Rugby [${leagueKey}]: Fetch error:`, err);
    return [];
  }
}

function veventToAppEvent(ve: VEvent, leagueKey: string): AppEvent | null {
  const startIso = parseIcalDate(ve.dtstart);
  if (!startIso) return null;

  const teams = parseTeams(ve.summary);
  if (!teams) return null;

  let endIso: string;
  if (ve.dtend) {
    const parsedEnd = parseIcalDate(ve.dtend);
    endIso = parsedEnd || addDuration(startIso, RUGBY_DURATION_MIN);
  } else {
    endIso = addDuration(startIso, RUGBY_DURATION_MIN);
  }

  const league = LEAGUE_LABELS[leagueKey] || leagueKey;
  const providerId = LEAGUE_PROVIDERS[leagueKey] || "flosports";
  const hashInput = `${leagueKey}-${ve.dtstart}-${teams.homeTeam}-${teams.awayTeam}`;
  const id = `rugby-${leagueKey}-${stableHash(hashInput)}`;

  return {
    id,
    sport: "rugby",
    league,
    homeTeam: teams.homeTeam,
    awayTeam: teams.awayTeam,
    startTimeLocal: startIso,
    endTimeLocal: endIso,
    providerId,
    isLive: false,
    source: "rugby",
    leagueKey,
  };
}

export async function fetchRugbyEvents(): Promise<RugbyFetchResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const allEvents: AppEvent[] = [];
  const counts: Record<string, number> = {};
  const sourceParts: string[] = [];

  const leagueKeys = Object.keys(ICAL_FEEDS);

  const results = await Promise.all(
    leagueKeys.map((key) => fetchIcalFeed(ICAL_FEEDS[key], key))
  );

  for (let i = 0; i < leagueKeys.length; i++) {
    const leagueKey = leagueKeys[i];
    const vevents = results[i];
    let leagueCount = 0;

    for (const ve of vevents) {
      const event = veventToAppEvent(ve, leagueKey);
      if (!event) continue;

      const start = new Date(event.startTimeLocal);
      if (start >= windowStart && start <= windowEnd) {
        allEvents.push(event);
        leagueCount++;
      }
    }

    counts[leagueKey] = leagueCount;
    sourceParts.push(`${LEAGUE_LABELS[leagueKey]}: ${leagueCount}`);
    console.log(`  Rugby [${leagueKey}]: ${leagueCount} events in retention window`);
  }

  allEvents.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  const sourceUsed = sourceParts.length > 0 ? "ical" : "none";
  console.log(`  Rugby total: ${allEvents.length} events (${sourceParts.join(", ")})`);

  return { events: allEvents, sourceUsed, counts };
}

export function mergeRugbyEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existing) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of fresh) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;
  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
