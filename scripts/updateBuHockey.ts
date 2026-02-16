import * as fs from "fs";
import * as path from "path";

const CHN_URL = "https://www.collegehockeynews.com/schedules/team/Boston-University/10";
const HOCKEY_DURATION_MIN = 165;
const BU_TEAM = "Boston University";

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
}

interface ChnGame {
  month: string;
  day: string;
  opponent: string;
  isAway: boolean;
  time: string;
  result: string;
}

export interface BuFetchResult {
  events: AppEvent[];
  sourceUsed: "chn" | "none";
  totalParsed: number;
}

function addDuration(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function stableId(dateStr: string, opponent: string, isAway: boolean): string {
  const raw = `${dateStr}-${opponent}-${isAway ? "away" : "home"}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseMonthDay(monthStr: string, dayStr: string): { year: number; month: number; day: number } | null {
  const monthMatch = monthStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/);
  if (!monthMatch) return null;

  const monthNames: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  };

  const month = monthNames[monthMatch[1]];
  const year = parseInt(monthMatch[2], 10);
  const dayMatch = dayStr.match(/^(\d{1,2})/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1], 10);

  return { year, month, day };
}

function parseTimeET(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  if (!ampm && hour < 12) {
    hour += 12;
  }

  return { hour, minute };
}

function toUtcFromET(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;

  const etDate = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date(`${dateStr}Z`))
  );

  const utcGuess = new Date(`${dateStr}Z`);
  const testInET = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(utcGuess);

  const [testH, testM] = testInET.split(":").map(Number);
  const diffHours = hour - testH;

  const corrected = new Date(utcGuess.getTime() + diffHours * 3600000);
  return corrected.toISOString();
}

async function fetchChnSchedule(): Promise<ChnGame[]> {
  console.log("  BU: Fetching schedule from College Hockey News...");

  try {
    const res = await fetch(CHN_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      console.error(`  BU: CHN returned ${res.status}`);
      return [];
    }

    const html = await res.text();

    const sectionRegex = /<tr class="stats-section"><td colspan="99">(.*?)<\/td><\/tr>/g;
    const months: { month: string; pos: number }[] = [];
    let m;
    while ((m = sectionRegex.exec(html)) !== null) {
      months.push({ month: m[1], pos: m.index });
    }

    const trRegex = /<tr valign="top">([\s\S]*?)<\/tr>/g;
    const games: ChnGame[] = [];
    let currentMonth = "";

    while ((m = trRegex.exec(html)) !== null) {
      const row = m[1];
      for (const mn of months) {
        if (mn.pos < m.index) currentMonth = mn.month;
      }

      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let td;
      const cols: { text: string; link: string | null }[] = [];
      while ((td = tdRegex.exec(row)) !== null) {
        const rawHtml = td[1];
        const text = rawHtml.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
        const linkMatch = rawHtml.match(/<a[^>]*>([^<]+)<\/a>/);
        cols.push({ text, link: linkMatch ? linkMatch[1].trim() : null });
      }

      if (cols.length < 5) continue;

      const dayStr = cols[0].text;
      const resultCol = cols[1].text;
      const opponent = cols[4].link || cols[4].text;
      const isAway = (cols[3]?.text || "") === "at" || cols[4].text.startsWith("at ");

      const timeStr = cols[cols.length - 1]?.text || "TBD";

      let result = "scheduled";
      if (resultCol) {
        const parts = resultCol.split(/\t/).filter(Boolean);
        if (parts.length >= 1 && /^[WLT]$/.test(parts[0])) {
          result = parts[0] === "W" ? "Final" : parts[0] === "L" ? "Final" : parts[0] === "T" ? "Final (OT)" : "scheduled";
        }
      }

      const cleanOpponent = opponent
        .replace(/\(.*\)/, "")
        .replace(/^at\s+/, "")
        .replace(/^#\d+\s+/, "")
        .trim();

      if (!cleanOpponent) continue;

      games.push({
        month: currentMonth,
        day: dayStr,
        opponent: cleanOpponent,
        isAway,
        time: timeStr,
        result,
      });
    }

    console.log(`  BU: Parsed ${games.length} games from CHN`);
    return games;
  } catch (err) {
    console.error("  BU: Failed to fetch CHN schedule:", err);
    return [];
  }
}

function chnGameToEvent(game: ChnGame): AppEvent | null {
  const parsed = parseMonthDay(game.month, game.day);
  if (!parsed) return null;

  const time = parseTimeET(game.time);
  if (!time) return null;

  const startUtc = toUtcFromET(parsed.year, parsed.month, parsed.day, time.hour, time.minute);
  const endUtc = addDuration(startUtc, HOCKEY_DURATION_MIN);

  const dateKey = `${parsed.year}-${parsed.month.toString().padStart(2, "0")}-${parsed.day.toString().padStart(2, "0")}`;
  const id = `ncaa-bu-${stableId(dateKey, game.opponent, game.isAway)}`;

  return {
    id,
    sport: "hockey",
    league: "NCAA Hockey",
    homeTeam: game.isAway ? game.opponent : BU_TEAM,
    awayTeam: game.isAway ? BU_TEAM : game.opponent,
    startTimeLocal: startUtc,
    endTimeLocal: endUtc,
    providerId: "disneyplus",
    isLive: false,
    source: "ncaa-bu",
  };
}

export async function fetchBuEvents(): Promise<BuFetchResult> {
  const chnGames = await fetchChnSchedule();

  if (chnGames.length === 0) {
    return { events: [], sourceUsed: "none", totalParsed: 0 };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000);
  const windowEnd = new Date(now.getTime() + 21 * 86400000);

  const events: AppEvent[] = [];
  for (const game of chnGames) {
    const event = chnGameToEvent(game);
    if (!event) continue;

    const start = new Date(event.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      events.push(event);
    }
  }

  events.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());

  console.log(`  BU: ${events.length} events in retention window (of ${chnGames.length} total)`);
  return { events, sourceUsed: "chn", totalParsed: chnGames.length };
}

export function mergeBuEvents(
  existingBu: AppEvent[],
  freshBu: AppEvent[],
  now: Date
): { merged: AppEvent[]; added: number; updated: number; pruned: number } {
  const index = new Map<string, AppEvent>();
  for (const e of existingBu) {
    index.set(e.id, e);
  }

  let added = 0;
  let updated = 0;

  for (const e of freshBu) {
    if (index.has(e.id)) {
      index.set(e.id, e);
      updated++;
    } else {
      index.set(e.id, e);
      added++;
    }
  }

  const RETENTION_PAST_DAYS = 14;
  const RETENTION_FUTURE_DAYS = 21;
  const windowStart = new Date(now.getTime() - RETENTION_PAST_DAYS * 86400000);
  const windowEnd = new Date(now.getTime() + RETENTION_FUTURE_DAYS * 86400000);

  const beforePrune = index.size;
  const merged: AppEvent[] = [];
  for (const e of index.values()) {
    const start = new Date(e.startTimeLocal);
    if (start >= windowStart && start <= windowEnd) {
      merged.push(e);
    }
  }

  const pruned = beforePrune - merged.length;

  merged.sort(
    (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
  );

  return { merged, added, updated, pruned };
}
