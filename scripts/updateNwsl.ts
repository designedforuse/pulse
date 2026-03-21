import type { AppEvent, SoccerFetchResult, SoccerMergeResult } from "./soccerIcalUtils";
import { mergeSoccerLeagueEvents } from "./soccerIcalUtils";

const NWSL_ICAL_URL = "https://fixturedownload.com/download/nwsl-2026-UTC.ics";
const ESPN_NWSL_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard";
const NWSL_DURATION_MIN = 135;

interface NwslVEvent {
  dtstart: string;
  dtend?: string;
  summary: string;
  uid: string;
  location?: string;
  description?: string;
}

interface EspnBroadcast {
  market?: string;
  names?: string[];
}

interface EspnCompetitor {
  homeAway: string;
  team: { displayName: string };
}

interface EspnCompetition {
  date?: string;
  broadcasts?: EspnBroadcast[];
  competitors?: EspnCompetitor[];
}

interface EspnNwslEvent {
  date?: string;
  competitions?: EspnCompetition[];
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

function stableId(startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `soccer-nwsl-${dateStr}-${timeStr}-${a}-at-${h}`;
}

function normalizeTeamForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bfc\b\.?/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function espnMatchKey(dateStr: string, team1: string, team2: string): string {
  const t1 = normalizeTeamForMatch(team1);
  const t2 = normalizeTeamForMatch(team2);
  return `${dateStr}_${[t1, t2].sort().join("__")}`;
}

function networkToProviderId(networks: string[]): { providerId: string; providerReason: string } {
  const allNets = networks.join(" ").toLowerCase();

  if (/\bion\b/.test(allNets) || /prime\s*video/i.test(allNets) || /golazo/i.test(allNets)) {
    return { providerId: "primevideo", providerReason: "nwsl-ion-prime" };
  }
  if (/espn\+/i.test(allNets)) {
    return { providerId: "disneyplus", providerReason: "nwsl-espnplus" };
  }
  if (/victory\+/i.test(allNets)) {
    return { providerId: "victoryplus", providerReason: "nwsl-victory" };
  }
  if (/\babc\b/i.test(allNets) || /\bespn(?!\+)/i.test(allNets) || /\bcbs/i.test(allNets)) {
    return { providerId: "youtubetv", providerReason: "nwsl-espn-cbs" };
  }
  if (/paramount\+/i.test(allNets)) {
    return { providerId: "paramount", providerReason: "nwsl-paramount" };
  }
  if (/nwsl\+/i.test(allNets)) {
    return { providerId: "nwslplus", providerReason: "nwsl-nwslplus" };
  }
  return { providerId: "nwslplus", providerReason: "nwsl-default" };
}

function shiftDate(yyyymmdd: string, deltaDays: number): string {
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchEspnNwslBroadcasters(
  icalDates: string[]
): Promise<Map<string, { providerId: string; providerReason: string; broadcastNetworks: string }>> {
  const lookup = new Map<string, { providerId: string; providerReason: string; broadcastNetworks: string }>();

  const queryDates = new Set<string>();
  for (const d of icalDates) {
    queryDates.add(d);
    queryDates.add(shiftDate(d, -1));
  }
  const uniqueDates = [...queryDates];
  console.log(`  NWSL ESPN: Fetching broadcaster data for ${uniqueDates.length} dates (iCal dates + previous days)...`);

  for (const dateStr of uniqueDates) {
    try {
      const url = `${ESPN_NWSL_URL}?dates=${dateStr}&limit=20`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
      });
      if (!res.ok) {
        console.warn(`  NWSL ESPN: dates=${dateStr} returned HTTP ${res.status} — skipping`);
        continue;
      }

      const data = (await res.json()) as { events?: EspnNwslEvent[] };

      for (const event of data.events || []) {
        const comp = (event.competitions || [])[0];
        if (!comp) continue;

        const home = comp.competitors?.find((c) => c.homeAway === "home")?.team?.displayName || "";
        const away = comp.competitors?.find((c) => c.homeAway === "away")?.team?.displayName || "";
        if (!home || !away) continue;

        const networks = (comp.broadcasts || []).flatMap((b) => b.names || []);
        const { providerId, providerReason } = networkToProviderId(networks);
        const broadcastNetworks = networks.join(", ");

        const eventUtcDate = (event.date || comp.date || "").slice(0, 10).replace(/-/g, "");
        const keyDate = eventUtcDate || dateStr;
        const key = espnMatchKey(keyDate, home, away);
        lookup.set(key, { providerId, providerReason, broadcastNetworks });
      }
    } catch (err: any) {
      console.warn(`  NWSL ESPN: fetch failed for dates=${dateStr}: ${err?.message ?? err}`);
    }
  }

  console.log(`  NWSL ESPN: Built broadcaster lookup with ${lookup.size} entries`);
  return lookup;
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

    const windowedVEvents: Array<{ ve: NwslVEvent; startUtc: string; teams: { homeTeam: string; awayTeam: string } }> = [];
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

      windowedVEvents.push({ ve, startUtc, teams });
    }

    const icalDates = [...new Set(
      windowedVEvents.map(({ startUtc }) => startUtc.slice(0, 10).replace(/-/g, ""))
    )];

    const espnLookup = await fetchEspnNwslBroadcasters(icalDates);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();

    const providerCounts: Record<string, number> = {};

    for (const { ve, startUtc, teams } of windowedVEvents) {
      const endUtc = ve.dtend
        ? parseIcalDate(ve.dtend) || addDuration(startUtc, NWSL_DURATION_MIN)
        : addDuration(startUtc, NWSL_DURATION_MIN);

      const id = stableId(startUtc, teams.awayTeam, teams.homeTeam);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const dateStr = startUtc.slice(0, 10).replace(/-/g, "");
      const lookupKey = espnMatchKey(dateStr, teams.homeTeam, teams.awayTeam);
      const espnMatch = espnLookup.get(lookupKey);

      const providerId = espnMatch?.providerId ?? "nwslplus";
      const providerReason = espnMatch?.providerReason ?? "nwsl-default";
      const broadcastNetworks = espnMatch?.broadcastNetworks;

      providerCounts[providerId] = (providerCounts[providerId] || 0) + 1;

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
    const providerSummary = Object.entries(providerCounts).map(([k, v]) => `${v} ${k}`).join(", ");
    console.log(`  NWSL providers: ${providerSummary}`);
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
