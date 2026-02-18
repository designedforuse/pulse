import * as fs from "fs";
import * as path from "path";

const SOCCER_DURATION_MIN = 135;
const ICAL_URL = "https://fixturedownload.com/download/epl-2025-GMTStandardTime.ics";

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
}

interface VEvent {
  dtstart: string;
  dtend?: string;
  summary: string;
  uid: string;
  location?: string;
}

export interface EplFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
}

export interface EplMergeResult {
  merged: AppEvent[];
  added: number;
  updated: number;
  pruned: number;
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
  let cleaned = summary.trim();

  cleaned = cleaned.replace(/\s*-\s*English Premier League.*$/i, "");

  const vsMatch = cleaned.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) {
    return { homeTeam: vsMatch[1].trim(), awayTeam: vsMatch[2].trim() };
  }

  const dashMatch = cleaned.match(/^(.+?)\s+-\s+(.+)$/);
  if (dashMatch) {
    return { homeTeam: dashMatch[1].trim(), awayTeam: dashMatch[2].trim() };
  }

  return null;
}

function stableId(startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `soccer-epl-${dateStr}-${timeStr}-${a}-at-${h}`;
}

export async function fetchEplEvents(): Promise<EplFetchResult> {
  console.log(`  EPL: Fetching iCal from ${ICAL_URL}...`);
  try {
    const res = await fetch(ICAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
    });
    if (!res.ok) {
      console.error(`  EPL: iCal fetch failed with ${res.status}`);
      return { events: [], sourceUsed: "none", count: 0 };
    }
    const icalText = await res.text();
    const vevents = parseIcalText(icalText);
    console.log(`  EPL: Parsed ${vevents.length} iCal events`);

    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    for (const ve of vevents) {
      const startUtc = parseIcalDate(ve.dtstart);
      if (!startUtc) continue;

      const startDate = new Date(startUtc);
      if (startDate < windowStart || startDate > windowEnd) continue;

      const teams = parseTeams(ve.summary);
      if (!teams) {
        console.log(`  EPL: Could not parse teams from "${ve.summary}"`);
        continue;
      }

      const endUtc = ve.dtend
        ? parseIcalDate(ve.dtend) || addDuration(startUtc, SOCCER_DURATION_MIN)
        : addDuration(startUtc, SOCCER_DURATION_MIN);

      const id = stableId(startUtc, teams.awayTeam, teams.homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      events.push({
        id,
        sport: "soccer",
        league: "EPL",
        awayTeam: teams.awayTeam,
        homeTeam: teams.homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: "youtubetv",
        isLive: false,
        source: "soccer-epl",
        leagueKey: "epl",
        providerReason: "epl-yttv",
      });
    }

    console.log(`  EPL: ${events.length} events in retention window`);
    return { events, sourceUsed: "ical", count: events.length };
  } catch (err: any) {
    console.error(`  EPL: Error fetching iCal:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeEplEvents(
  existing: AppEvent[],
  fetched: AppEvent[],
  now: Date
): EplMergeResult {
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const existingMap = new Map<string, AppEvent>();
  for (const e of existing) {
    existingMap.set(e.id, e);
  }

  const merged: AppEvent[] = [];
  const seenIds = new Set<string>();
  let added = 0;
  let updated = 0;

  for (const fe of fetched) {
    seenIds.add(fe.id);
    if (existingMap.has(fe.id)) {
      updated++;
    } else {
      added++;
    }
    merged.push(fe);
  }

  for (const [id, e] of existingMap) {
    if (seenIds.has(id)) continue;
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const prunedCount = existing.length - (merged.length - fetched.length);
  const pruned = Math.max(0, prunedCount);

  merged.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  return { merged, added, updated, pruned };
}
