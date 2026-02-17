import * as fs from "fs";
import * as path from "path";

const RUGBY_15S_DURATION_MIN = 135;
const SVNS_DURATION_MIN = 90;

const ICAL_FEEDS: Record<string, string> = {
  urc: "https://data.rugbyfixture.io/ical/v1/urc.ics",
  top14: "https://data.rugbyfixture.io/ical/v1/top14.ics",
  superrugby: "https://fixturedownload.com/download/super-rugby-pacific-2026-UTC.ics",
  premiership: "https://data.rugbyfixture.io/ical/v1/premiership.ics",
  sixnations: "https://data.rugbyfixture.io/ical/v1/six-nations.ics",
};

const LEAGUE_LABELS: Record<string, string> = {
  urc: "URC",
  top14: "Top 14",
  superrugby: "Super Rugby",
  premiership: "English Premiership",
  leagueone: "Japan League One",
  svns: "HSBC SVNS",
  sixnations: "Six Nations",
};

const LEAGUE_PROVIDERS: Record<string, string> = {
  urc: "flosports",
  top14: "flosports",
  superrugby: "primevideo",
  premiership: "flosports",
  leagueone: "flosports",
  svns: "primevideo",
  sixnations: "youtubetv",
};

const LEAGUE_DURATION: Record<string, number> = {
  svns: SVNS_DURATION_MIN,
};

function getDuration(leagueKey: string): number {
  return LEAGUE_DURATION[leagueKey] ?? RUGBY_15S_DURATION_MIN;
}

const SVNS_SCHEDULE: Array<{
  city: string;
  startDate: string;
  endDate: string;
}> = [
  { city: "Dubai", startDate: "2025-11-29T08:00:00.000Z", endDate: "2025-11-30T18:00:00.000Z" },
  { city: "Cape Town", startDate: "2025-12-06T08:00:00.000Z", endDate: "2025-12-07T18:00:00.000Z" },
  { city: "Singapore", startDate: "2026-01-31T02:00:00.000Z", endDate: "2026-02-01T14:00:00.000Z" },
  { city: "Perth", startDate: "2026-02-07T01:00:00.000Z", endDate: "2026-02-08T13:00:00.000Z" },
  { city: "Vancouver", startDate: "2026-03-07T17:00:00.000Z", endDate: "2026-03-08T23:00:00.000Z" },
  { city: "New York", startDate: "2026-03-14T14:00:00.000Z", endDate: "2026-03-15T22:00:00.000Z" },
  { city: "Hong Kong", startDate: "2026-04-17T02:00:00.000Z", endDate: "2026-04-19T14:00:00.000Z" },
  { city: "Valladolid", startDate: "2026-05-29T08:00:00.000Z", endDate: "2026-05-31T18:00:00.000Z" },
  { city: "Bordeaux", startDate: "2026-06-05T08:00:00.000Z", endDate: "2026-06-07T18:00:00.000Z" },
];

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
  eventType?: "match" | "session" | "tournament";
  sessionTitle?: string;
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

  const duration = getDuration(leagueKey);
  let endIso: string;
  if (ve.dtend) {
    const parsedEnd = parseIcalDate(ve.dtend);
    endIso = parsedEnd || addDuration(startIso, duration);
  } else {
    endIso = addDuration(startIso, duration);
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

const ALLRUGBY_URL = "https://all.rugby/tournament/league-one-d1/fixtures-results";

interface LeagueOneMatch {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
}

function parseAllRugbyHtml(html: string): LeagueOneMatch[] {
  const matches: LeagueOneMatch[] = [];
  let currentDate = "";

  const dateRegex = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Z][a-z]+ \d+, \d{4})/g;
  const titleRegex = /title="Match Report ([^"]+)"/g;

  const lines = html.split("\n");
  for (const line of lines) {
    const dateMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Z][a-z]+ \d+, \d{4})/);
    if (dateMatch) {
      currentDate = dateMatch[2];
      continue;
    }

    const titleMatch = line.match(/title="Match Report (.+?) vs (.+?)"/);
    if (titleMatch && currentDate) {
      const homeTeam = titleMatch[1].trim();
      const awayTeam = titleMatch[2].trim();

      const timeMatch = line.match(/<div class="fl res txtcenter">(\d{1,2}:\d{2}\s*(?:AM|PM))<\/div>/i);

      matches.push({
        homeTeam,
        awayTeam,
        date: currentDate,
        time: timeMatch ? timeMatch[1].trim() : undefined,
      });
    }
  }

  return matches;
}

export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  tz: string,
): Date {
  const rough = new Date(Date.UTC(year, month, day, hours, minutes, 0));
  const utcStr = rough.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = rough.toLocaleString("en-US", { timeZone: tz });
  const offset = new Date(tzStr).getTime() - new Date(utcStr).getTime();
  return new Date(rough.getTime() - offset);
}

const LEAGUE_ONE_TZ = "Asia/Tokyo";
const LEAGUE_ONE_DEFAULT_HOUR = 13;

export interface LeagueOneParsedDebug {
  rawDate: string;
  rawTime: string | null;
  timezone: string;
  parsedUtcIso: string;
}

function parseLeagueOneDate(dateStr: string, timeStr?: string): { iso: string; debug: LeagueOneParsedDebug } | null {
  const monthNames: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };

  const parts = dateStr.match(/([A-Z][a-z]+) (\d+), (\d{4})/);
  if (!parts) return null;

  const month = monthNames[parts[1]];
  if (month === undefined) return null;
  const day = parseInt(parts[2], 10);
  const year = parseInt(parts[3], 10);

  let hours = LEAGUE_ONE_DEFAULT_HOUR;
  let minutes = 0;

  if (timeStr) {
    const tm = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (tm) {
      hours = parseInt(tm[1], 10);
      minutes = parseInt(tm[2], 10);
      const ampm = tm[3].toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
  }

  const utc = wallClockToUtc(year, month, day, hours, minutes, LEAGUE_ONE_TZ);
  const iso = utc.toISOString();
  const debug: LeagueOneParsedDebug = {
    rawDate: dateStr,
    rawTime: timeStr ?? null,
    timezone: LEAGUE_ONE_TZ,
    parsedUtcIso: iso,
  };
  return { iso, debug };
}

async function fetchLeagueOneEvents(windowStart: Date, windowEnd: Date): Promise<AppEvent[]> {
  console.log(`  Rugby [leagueone]: Fetching from all.rugby...`);
  try {
    const res = await fetch(ALLRUGBY_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.error(`  Rugby [leagueone]: HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    const parsed = parseAllRugbyHtml(html);
    console.log(`  Rugby [leagueone]: Parsed ${parsed.length} matches from HTML`);

    const events: AppEvent[] = [];
    for (const m of parsed) {
      const result = parseLeagueOneDate(m.date, m.time);
      if (!result) continue;

      const start = new Date(result.iso);
      if (start < windowStart || start > windowEnd) continue;

      const hashInput = `leagueone-${m.date}-${m.homeTeam}-${m.awayTeam}`;
      const id = `rugby-leagueone-${stableHash(hashInput)}`;
      const endIso = addDuration(result.iso, RUGBY_15S_DURATION_MIN);

      events.push({
        id,
        sport: "rugby",
        league: LEAGUE_LABELS.leagueone,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        startTimeLocal: result.iso,
        endTimeLocal: endIso,
        providerId: LEAGUE_PROVIDERS.leagueone,
        isLive: false,
        source: "rugby",
        leagueKey: "leagueone",
      });
    }

    return events;
  } catch (err) {
    console.error(`  Rugby [leagueone]: Fetch error:`, err);
    return [];
  }
}

const SVNS_SESSION_DURATION_MIN = 180;

function buildSvnsEvents(windowStart: Date, windowEnd: Date): AppEvent[] {
  const events: AppEvent[] = [];

  for (const stop of SVNS_SCHEDULE) {
    const stopStart = new Date(stop.startDate);
    const stopEnd = new Date(stop.endDate);
    const startDay = new Date(Date.UTC(stopStart.getUTCFullYear(), stopStart.getUTCMonth(), stopStart.getUTCDate()));
    const endDay = new Date(Date.UTC(stopEnd.getUTCFullYear(), stopEnd.getUTCMonth(), stopEnd.getUTCDate()));
    const dayCount = Math.max(Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1, 1);

    for (let d = 0; d < dayCount; d++) {
      const dayDate = new Date(stopStart.getTime() + d * 86400000);
      if (dayDate < windowStart || dayDate > windowEnd) continue;

      const dayLabel = `Day ${d + 1}`;
      const sessionTitle = `SVNS ${stop.city} – ${dayLabel}`;
      const id = `rugby-svns-${stableHash(`svns-${stop.city}-${stop.startDate}`)}-d${d + 1}`;

      let sessionStart: string;
      let sessionEnd: string;

      const dayMidnightUtc = new Date(Date.UTC(
        dayDate.getUTCFullYear(),
        dayDate.getUTCMonth(),
        dayDate.getUTCDate(),
      ));
      if (d === 0) {
        const startPt = wallClockToUtc(
          dayMidnightUtc.getUTCFullYear(),
          dayMidnightUtc.getUTCMonth(),
          dayMidnightUtc.getUTCDate(),
          19, 0, "America/Los_Angeles",
        );
        sessionStart = startPt.toISOString();
      } else {
        const startPt = wallClockToUtc(
          dayMidnightUtc.getUTCFullYear(),
          dayMidnightUtc.getUTCMonth(),
          dayMidnightUtc.getUTCDate(),
          10, 0, "America/Los_Angeles",
        );
        sessionStart = startPt.toISOString();
      }
      sessionEnd = addDuration(sessionStart, SVNS_SESSION_DURATION_MIN);

      events.push({
        id,
        sport: "rugby",
        league: LEAGUE_LABELS.svns,
        homeTeam: `SVNS ${stop.city}`,
        awayTeam: "",
        startTimeLocal: sessionStart,
        endTimeLocal: sessionEnd,
        providerId: LEAGUE_PROVIDERS.svns,
        isLive: false,
        source: "rugby",
        leagueKey: "svns",
        eventType: "session",
        sessionTitle,
      });
    }
  }

  console.log(`  Rugby [svns]: ${events.length} session events in retention window`);
  return events;
}

export async function fetchRugbyEvents(): Promise<RugbyFetchResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const allEvents: AppEvent[] = [];
  const counts: Record<string, number> = {};
  const sourceParts: string[] = [];

  const icalKeys = Object.keys(ICAL_FEEDS);
  const icalResults = await Promise.all(
    icalKeys.map((key) => fetchIcalFeed(ICAL_FEEDS[key], key))
  );

  for (let i = 0; i < icalKeys.length; i++) {
    const leagueKey = icalKeys[i];
    const vevents = icalResults[i];
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

  const [leagueOneEvents] = await Promise.all([
    fetchLeagueOneEvents(windowStart, windowEnd),
  ]);

  counts.leagueone = leagueOneEvents.length;
  allEvents.push(...leagueOneEvents);
  sourceParts.push(`${LEAGUE_LABELS.leagueone}: ${leagueOneEvents.length}`);
  console.log(`  Rugby [leagueone]: ${leagueOneEvents.length} events in retention window`);

  const svnsEvents = buildSvnsEvents(windowStart, windowEnd);
  counts.svns = svnsEvents.length;
  allEvents.push(...svnsEvents);
  sourceParts.push(`${LEAGUE_LABELS.svns}: ${svnsEvents.length}`);

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
    if (e.leagueKey === "svns" && e.eventType !== "session") continue;
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
