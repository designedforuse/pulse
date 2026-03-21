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
  days: Array<{ date: string; startUtc: string; endUtc: string }>;
}> = [
  { city: "Dubai", days: [
    { date: "2025-11-29", startUtc: "2025-11-29T08:00:00.000Z", endUtc: "2025-11-29T16:00:00.000Z" },
    { date: "2025-11-30", startUtc: "2025-11-30T08:00:00.000Z", endUtc: "2025-11-30T18:00:00.000Z" },
  ]},
  { city: "Cape Town", days: [
    { date: "2025-12-06", startUtc: "2025-12-06T08:00:00.000Z", endUtc: "2025-12-06T16:00:00.000Z" },
    { date: "2025-12-07", startUtc: "2025-12-07T08:00:00.000Z", endUtc: "2025-12-07T18:00:00.000Z" },
  ]},
  { city: "Singapore", days: [
    { date: "2026-01-31", startUtc: "2026-01-31T02:00:00.000Z", endUtc: "2026-01-31T11:00:00.000Z" },
    { date: "2026-02-01", startUtc: "2026-02-01T02:00:00.000Z", endUtc: "2026-02-01T14:00:00.000Z" },
  ]},
  { city: "Perth", days: [
    { date: "2026-02-07", startUtc: "2026-02-07T01:00:00.000Z", endUtc: "2026-02-07T10:00:00.000Z" },
    { date: "2026-02-08", startUtc: "2026-02-08T01:00:00.000Z", endUtc: "2026-02-08T13:00:00.000Z" },
  ]},
  { city: "Vancouver", days: [
    { date: "2026-03-07", startUtc: "2026-03-07T18:00:00.000Z", endUtc: "2026-03-08T02:30:00.000Z" },
    { date: "2026-03-08", startUtc: "2026-03-08T17:00:00.000Z", endUtc: "2026-03-09T01:30:00.000Z" },
  ]},
  { city: "New York", days: [
    { date: "2026-03-14", startUtc: "2026-03-14T14:00:00.000Z", endUtc: "2026-03-14T22:30:00.000Z" },
    { date: "2026-03-15", startUtc: "2026-03-15T14:00:00.000Z", endUtc: "2026-03-15T22:00:00.000Z" },
  ]},
  { city: "Hong Kong", days: [
    { date: "2026-04-17", startUtc: "2026-04-17T02:00:00.000Z", endUtc: "2026-04-17T12:00:00.000Z" },
    { date: "2026-04-18", startUtc: "2026-04-18T02:00:00.000Z", endUtc: "2026-04-18T12:00:00.000Z" },
    { date: "2026-04-19", startUtc: "2026-04-19T02:00:00.000Z", endUtc: "2026-04-19T14:00:00.000Z" },
  ]},
  { city: "Valladolid", days: [
    { date: "2026-05-29", startUtc: "2026-05-29T08:00:00.000Z", endUtc: "2026-05-29T18:00:00.000Z" },
    { date: "2026-05-30", startUtc: "2026-05-30T08:00:00.000Z", endUtc: "2026-05-30T18:00:00.000Z" },
    { date: "2026-05-31", startUtc: "2026-05-31T08:00:00.000Z", endUtc: "2026-05-31T18:00:00.000Z" },
  ]},
  { city: "Bordeaux", days: [
    { date: "2026-06-05", startUtc: "2026-06-05T08:00:00.000Z", endUtc: "2026-06-05T18:00:00.000Z" },
    { date: "2026-06-06", startUtc: "2026-06-06T08:00:00.000Z", endUtc: "2026-06-06T18:00:00.000Z" },
    { date: "2026-06-07", startUtc: "2026-06-07T08:00:00.000Z", endUtc: "2026-06-07T18:00:00.000Z" },
  ]},
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

const LEAGUE_ONE_DISPLAY_NAMES: Record<string, string> = {
  "Tokyo SG": "Tokyo Sungoliath",
  "BL Tokyo": "Black Rams Tokyo",
  "BR Tokyo": "Brave Lupus Tokyo",
  "Kobe": "Kobelco Kobe Steelers",
  "Toyota": "Toyota Verblitz",
  "Saitama": "Saitama Wild Knights",
  "Yokohama": "Yokohama Canon Eagles",
  "Shizuoka": "Shizuoka Blue Revs",
  "Sagamihara": "Sagamihara Dynaboars",
  "Tokyo-Bay": "Kubota Spears",
  "Urayasu": "Urayasu D-Rocks",
  "Mie": "Mie Honda Heat",
};

function leagueOneDisplayName(raw: string): string {
  return LEAGUE_ONE_DISPLAY_NAMES[raw] || raw;
}

const LEAGUE_ONE_JP_URL = "https://league-one.jp/schedule/";

const JP_TO_EN_TEAMS: Record<string, string> = {
  "東芝ブレイブルーパス東京": "Brave Lupus Tokyo",
  "ブラックラムズ東京": "Black Rams Tokyo",
  "コベルコ神戸スティーラーズ": "Kobelco Kobe Steelers",
  "埼玉ワイルドナイツ": "Saitama Wild Knights",
  "クボタスピアーズ船橋・東京ベイ": "Kubota Spears",
  "クボタスピアーズ船橋": "Kubota Spears",
  "浦安D-Rocks": "Urayasu D-Rocks",
  "トヨタヴェルブリッツ": "Toyota Verblitz",
  "三重ホンダヒート": "Mie Honda Heat",
  "東京サンゴリアス": "Tokyo Sungoliath",
  "横浜キヤノンイーグルス": "Yokohama Canon Eagles",
  "三菱重工相模原ダイナボアーズ": "Sagamihara Dynaboars",
  "静岡ブルーレヴズ": "Shizuoka Blue Revs",
};

function jpTeamToEn(jp: string): string {
  for (const [jpName, enName] of Object.entries(JP_TO_EN_TEAMS)) {
    if (jp.includes(jpName)) return enName;
  }
  return jp;
}

interface LeagueOneJpMatch {
  date: string;
  time: string;
  homeTeamJp: string;
  awayTeamJp: string;
}

function parseLeagueOneJpHtml(html: string): LeagueOneJpMatch[] {
  const matches: LeagueOneJpMatch[] = [];
  const currentYear = new Date().getFullYear();

  const matchRegex = /<div class="datetime"><p class="date">\s*(\d{2}\.\d{2})\s*<span class="youbi">[^<]*<\/span><\/p><p class="time">\s*(\d{1,2}:\d{2})?\s*<\/p><\/div>.*?<li class="home"[^>]*>.*?<p class="name only-pc">([^<]+)<\/p>.*?<li class="away"[^>]*>.*?<p class="name only-pc">([^<]+)<\/p>/g;
  let m;
  while ((m = matchRegex.exec(html))) {
    if (!m[2]) continue;
    matches.push({
      date: m[1],
      time: m[2],
      homeTeamJp: m[3].trim(),
      awayTeamJp: m[4].trim(),
    });
  }
  return matches;
}

async function fetchLeagueOneEvents(windowStart: Date, windowEnd: Date): Promise<AppEvent[]> {
  console.log(`  Rugby [leagueone]: Fetching from league-one.jp...`);
  try {
    const res = await fetch(LEAGUE_ONE_JP_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.error(`  Rugby [leagueone]: HTTP ${res.status}`);
      return fetchLeagueOneEventsAllRugbyFallback(windowStart, windowEnd);
    }
    const html = await res.text();
    const parsed = parseLeagueOneJpHtml(html);
    console.log(`  Rugby [leagueone]: Parsed ${parsed.length} matches from league-one.jp`);

    if (parsed.length === 0) {
      console.log(`  Rugby [leagueone]: No matches parsed, falling back to all.rugby`);
      return fetchLeagueOneEventsAllRugbyFallback(windowStart, windowEnd);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const events: AppEvent[] = [];
    for (const m of parsed) {
      const [monthStr, dayStr] = m.date.split(".");
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      const [hourStr, minStr] = m.time.split(":");
      const hours = parseInt(hourStr, 10);
      const minutes = parseInt(minStr, 10);

      let year: number;
      if (month >= 9) {
        year = currentMonth >= 9 ? currentYear : currentYear - 1;
      } else {
        year = currentMonth >= 9 ? currentYear + 1 : currentYear;
      }

      const utc = wallClockToUtc(year, month, day, hours, minutes, LEAGUE_ONE_TZ);
      const iso = utc.toISOString();

      const start = new Date(iso);
      if (start < windowStart || start > windowEnd) continue;

      const homeTeam = jpTeamToEn(m.homeTeamJp);
      const awayTeam = jpTeamToEn(m.awayTeamJp);

      if (homeTeam === m.homeTeamJp || awayTeam === m.awayTeamJp) continue;

      const hashInput = `leagueone-${m.date}-${homeTeam}-${awayTeam}`;
      const id = `rugby-leagueone-${stableHash(hashInput)}`;
      const endIso = addDuration(iso, RUGBY_15S_DURATION_MIN);

      events.push({
        id,
        sport: "rugby",
        league: LEAGUE_LABELS.leagueone,
        homeTeam,
        awayTeam,
        startTimeLocal: iso,
        endTimeLocal: endIso,
        providerId: LEAGUE_PROVIDERS.leagueone,
        isLive: false,
        source: "rugby",
        leagueKey: "leagueone",
      });
    }

    // De-duplicate within-round: a team plays at most once per 5-day window.
    // Regex cross-boundary parses occasionally create bogus fixtures at unusual
    // kickoff times. If a team appears twice within 5 days, keep the match whose
    // kickoff slot is shared by the most other matches in that day (most common
    // = most likely real), breaking ties by preferring later kickoff.
    const slotCounts = new Map<string, number>();
    for (const ev of events) {
      const dateSlot = new Date(ev.startTimeLocal).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      slotCounts.set(dateSlot, (slotCounts.get(dateSlot) ?? 0) + 1);
    }
    const toDropIds = new Set<string>();
    const teamWindowMap = new Map<string, AppEvent>(); // "team|windowKey" -> event
    for (const ev of events.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime())) {
      const evTime = new Date(ev.startTimeLocal).getTime();
      for (const team of [ev.homeTeam, ev.awayTeam]) {
        const existing = teamWindowMap.get(team);
        if (existing) {
          const existingTime = new Date(existing.startTimeLocal).getTime();
          if (Math.abs(evTime - existingTime) < 5 * 24 * 3600 * 1000) {
            // Both within 5 days — keep the one in the more common kickoff slot
            const evSlot = new Date(ev.startTimeLocal).toISOString().slice(0, 13);
            const exSlot = new Date(existing.startTimeLocal).toISOString().slice(0, 13);
            const evCount = slotCounts.get(evSlot) ?? 0;
            const exCount = slotCounts.get(exSlot) ?? 0;
            if (evCount > exCount || (evCount === exCount && evTime > existingTime)) {
              toDropIds.add(existing.id);
              teamWindowMap.set(team, ev);
            } else {
              toDropIds.add(ev.id);
            }
          } else {
            teamWindowMap.set(team, ev);
          }
        } else {
          teamWindowMap.set(team, ev);
        }
      }
    }
    const dedupedEvents = toDropIds.size > 0 ? events.filter(e => !toDropIds.has(e.id)) : events;
    if (toDropIds.size > 0) {
      console.log(`  Rugby [leagueone]: Removed ${toDropIds.size} within-round duplicate(s)`);
    }

    console.log(`  Rugby [leagueone]: ${dedupedEvents.length} events in retention window`);
    return dedupedEvents;
  } catch (err) {
    console.error(`  Rugby [leagueone]: Fetch error:`, err);
    return fetchLeagueOneEventsAllRugbyFallback(windowStart, windowEnd);
  }
}

async function fetchLeagueOneEventsAllRugbyFallback(windowStart: Date, windowEnd: Date): Promise<AppEvent[]> {
  console.log(`  Rugby [leagueone]: Fallback to all.rugby...`);
  try {
    const res = await fetch(ALLRUGBY_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.error(`  Rugby [leagueone]: all.rugby HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    const parsed = parseAllRugbyHtml(html);
    console.log(`  Rugby [leagueone]: Parsed ${parsed.length} matches from all.rugby (fallback)`);

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
        homeTeam: leagueOneDisplayName(m.homeTeam),
        awayTeam: leagueOneDisplayName(m.awayTeam),
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
    console.error(`  Rugby [leagueone]: all.rugby fallback error:`, err);
    return [];
  }
}

function buildSvnsEvents(windowStart: Date, windowEnd: Date): AppEvent[] {
  const events: AppEvent[] = [];

  for (const stop of SVNS_SCHEDULE) {
    const firstDayDate = stop.days[0]?.date || "";
    for (let d = 0; d < stop.days.length; d++) {
      const day = stop.days[d];
      const dayStart = new Date(day.startUtc);
      const dayEnd = new Date(day.endUtc);

      if (dayEnd < windowStart || dayStart > windowEnd) continue;

      const dayLabel = `Day ${d + 1}`;
      const sessionTitle = `SVNS ${stop.city} – ${dayLabel}`;
      const id = `rugby-svns-${stableHash(`svns-${stop.city}-${firstDayDate}`)}-d${d + 1}`;

      events.push({
        id,
        sport: "rugby",
        league: LEAGUE_LABELS.svns,
        homeTeam: `SVNS ${stop.city}`,
        awayTeam: "",
        startTimeLocal: day.startUtc,
        endTimeLocal: day.endUtc,
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

  const freshIds = new Set(fresh.map((e) => e.id));
  const matchKey = (e: AppEvent) => {
    const d = new Date(e.startTimeLocal).toISOString().slice(0, 10);
    return `${e.leagueKey || e.league}-${e.homeTeam}-${e.awayTeam}-${d}`;
  };
  const freshMatchKeys = new Set(fresh.map(matchKey));
  for (const [id, e] of index) {
    if (!freshIds.has(id) && freshMatchKeys.has(matchKey(e))) {
      index.delete(id);
    }
  }

  // Drop stale leagueone indexed events where either team has a fresh match within 5 days.
  // This prevents bogus parser-generated fixtures (cross-boundary HTML regex parses)
  // from surviving the merge when fresh data has the same teams playing nearby.
  const leagueoneFreshByTeam = new Map<string, number[]>();
  for (const ev of fresh.filter((e) => e.leagueKey === "leagueone")) {
    for (const team of [ev.homeTeam, ev.awayTeam]) {
      if (!leagueoneFreshByTeam.has(team)) leagueoneFreshByTeam.set(team, []);
      leagueoneFreshByTeam.get(team)!.push(new Date(ev.startTimeLocal).getTime());
    }
  }
  let staleDropped = 0;
  for (const [id, ev] of index) {
    if (ev.leagueKey !== "leagueone" || freshIds.has(id)) continue;
    const evTime = new Date(ev.startTimeLocal).getTime();
    for (const team of [ev.homeTeam, ev.awayTeam]) {
      const freshTimes = leagueoneFreshByTeam.get(team) ?? [];
      if (freshTimes.some((ft) => Math.abs(evTime - ft) < 5 * 24 * 3600 * 1000)) {
        index.delete(id);
        staleDropped++;
        break;
      }
    }
  }
  if (staleDropped > 0) {
    console.log(`  Rugby [merge]: Dropped ${staleDropped} stale leagueone event(s) superseded by fresh data`);
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

  // Remove team-conflict duplicates: same team appearing in 2 matches at the same time
  const teamTimeSet = new Map<string, string>(); // "team|timeSlot" -> event id
  const conflictIds = new Set<string>();
  for (const e of merged) {
    const slot = new Date(e.startTimeLocal).toISOString().slice(0, 16);
    for (const team of [e.homeTeam, e.awayTeam]) {
      const key = `${team}|${slot}`;
      if (teamTimeSet.has(key)) {
        // Keep the fresher event (from fresh ids), drop the stale one
        const existingId = teamTimeSet.get(key)!;
        if (freshIds.has(e.id) && !freshIds.has(existingId)) {
          conflictIds.add(existingId);
          teamTimeSet.set(key, e.id);
        } else {
          conflictIds.add(e.id);
        }
      } else {
        teamTimeSet.set(key, e.id);
      }
    }
  }
  const deduped = conflictIds.size > 0 ? merged.filter(e => !conflictIds.has(e.id)) : merged;
  if (conflictIds.size > 0) {
    console.log(`  Rugby [merge]: Removed ${conflictIds.size} team-conflict duplicate(s)`);
  }

  return { merged: deduped, added, updated, pruned };
}
