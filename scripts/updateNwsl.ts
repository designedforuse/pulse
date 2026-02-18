import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const NWSL_ICAL_URL = "https://fixturedownload.com/download/nwsl-2026-UTC.ics";
const NWSL_DURATION_MIN = 135;

interface NwslVEvent {
  dtstart: string;
  dtend?: string;
  summary: string;
  uid: string;
  location?: string;
  description?: string;
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
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function parseIcalText(ical: string): NwslVEvent[] {
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

  const events: NwslVEvent[] = [];
  let current: Partial<NwslVEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.dtstart && current.summary) {
        events.push(current as NwslVEvent);
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
        case "DESCRIPTION":
          current.description = value;
          break;
      }
    }
  }

  return events;
}

function parseTeams(summary: string): { homeTeam: string; awayTeam: string } | null {
  let cleaned = summary.trim();
  cleaned = cleaned.replace(/\s*-\s*NWSL.*$/i, "");

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

function determineBroadcastProvider(description?: string): { providerId: string; providerReason: string; broadcastNetworks?: string } {
  if (!description) {
    return { providerId: "youtubetv", providerReason: "nwsl-default" };
  }

  const desc = description.toLowerCase();

  const broadcastMatch = description.match(/(?:broadcast|network|tv|channel|air(?:ing|s)?)\s*[:\-]?\s*(.+?)(?:\\n|\n|$)/i);
  const broadcastStr = broadcastMatch ? broadcastMatch[1].trim() : description;
  const broadcastLower = broadcastStr.toLowerCase();

  if (broadcastLower.includes("prime")) {
    return {
      providerId: "primevideo",
      providerReason: "nwsl-prime",
      broadcastNetworks: broadcastStr,
    };
  }

  if (/\bespn\+?\b/i.test(broadcastStr) || /\babc\b/i.test(broadcastStr) || /\bespn2\b/i.test(broadcastStr)) {
    return {
      providerId: "disneyplus",
      providerReason: "nwsl-espn",
      broadcastNetworks: broadcastStr,
    };
  }

  return { providerId: "youtubetv", providerReason: "nwsl-default" };
}

function stableId(startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `soccer-nwsl-${dateStr}-${timeStr}-${a}-at-${h}`;
}

export async function fetchNwslEvents(): Promise<SoccerFetchResult> {
  console.log(`  NWSL: Fetching iCal from ${NWSL_ICAL_URL}...`);
  try {
    const res = await fetch(NWSL_ICAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
    });
    if (!res.ok) {
      console.error(`  NWSL: iCal fetch failed with ${res.status}`);
      return { events: [], sourceUsed: "none", count: 0 };
    }
    const icalText = await res.text();
    const vevents = parseIcalText(icalText);
    console.log(`  NWSL: Parsed ${vevents.length} iCal events`);

    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    let primeCount = 0;
    let espnCount = 0;
    let defaultCount = 0;

    let firstMatchUtc: string | null = null;
    for (const ve of vevents) {
      const startUtc = parseIcalDate(ve.dtstart);
      if (!startUtc) continue;

      if (!firstMatchUtc || startUtc < firstMatchUtc) {
        firstMatchUtc = startUtc;
      }

      const startDate = new Date(startUtc);
      if (startDate < windowStart || startDate > windowEnd) continue;

      const teams = parseTeams(ve.summary);
      if (!teams) {
        console.log(`  NWSL: Could not parse teams from "${ve.summary}"`);
        continue;
      }

      const endUtc = ve.dtend
        ? parseIcalDate(ve.dtend) || addDuration(startUtc, NWSL_DURATION_MIN)
        : addDuration(startUtc, NWSL_DURATION_MIN);

      const id = stableId(startUtc, teams.awayTeam, teams.homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const { providerId, providerReason, broadcastNetworks } = determineBroadcastProvider(ve.description);

      if (providerReason === "nwsl-prime") primeCount++;
      else if (providerReason === "nwsl-espn") espnCount++;
      else defaultCount++;

      const event: AppEvent = {
        id,
        sport: "soccer",
        league: "NWSL",
        awayTeam: teams.awayTeam,
        homeTeam: teams.homeTeam,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId,
        isLive: false,
        source: "soccer-nwsl",
        leagueKey: "nwsl",
        providerReason,
      };

      if (broadcastNetworks) {
        (event as any).broadcastNetworks = broadcastNetworks;
      }

      events.push(event);
    }

    console.log(`  NWSL: ${events.length} events in retention window`);
    console.log(`  NWSL providers: ${primeCount} Prime, ${espnCount} ESPN/Disney+, ${defaultCount} default YTTV`);
    if (firstMatchUtc) {
      console.log(`  NWSL: First match in feed: ${firstMatchUtc}`);
    }
    return { events, sourceUsed: "ical", count: events.length, firstMatchDate: firstMatchUtc ?? undefined } as SoccerFetchResult & { firstMatchDate?: string };
  } catch (err: any) {
    console.error(`  NWSL: Error fetching iCal:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeNwslEvents(existing: any[], fetched: any[], now: Date): SoccerMergeResult {
  return mergeSoccerLeagueEvents(existing, fetched, now);
}
