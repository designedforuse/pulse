const ICAL_URL = "https://data.rugbyfixture.io/ical/v1/champions-cup.ics";
const DURATION_MIN = 135;

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

export interface ChampionsCupFetchResult {
  events: AppEvent[];
  sourceUsed: string;
  count: number;
  firstMatchDate?: string;
}

export interface ChampionsCupMergeResult {
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
        case "DTSTART": current.dtstart = value; break;
        case "DTEND": current.dtend = value; break;
        case "SUMMARY": current.summary = value; break;
        case "UID": current.uid = value; break;
        case "LOCATION": current.location = value; break;
      }
    }
  }
  return events;
}

function extractTeams(summary: string): { home: string; away: string } | null {
  const vsMatch = summary.match(/^(.+?)\s+vs?\s+(.+)$/i);
  if (vsMatch) {
    return { home: vsMatch[1].trim(), away: vsMatch[2].trim() };
  }
  return null;
}

function stableId(startUtc: string, away: string, home: string): string {
  const d = new Date(startUtc);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = d.toISOString().slice(11, 16).replace(":", "");
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `rugby-championscup-${dateStr}-${timeStr}-${a}-at-${h}`;
}

export async function fetchChampionsCupEvents(): Promise<ChampionsCupFetchResult> {
  console.log(`  Champions Cup: Fetching iCal from rugbyfixture.io...`);
  try {
    const res = await fetch(ICAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SportsGuide/1.0)" },
    });
    if (!res.ok) {
      console.error(`  Champions Cup: iCal returned ${res.status}`);
      return { events: [], sourceUsed: "none", count: 0 };
    }

    const ical = await res.text();
    const vevents = parseIcalText(ical);
    console.log(`  Champions Cup: Parsed ${vevents.length} iCal events`);

    const now = new Date();
    const windowStart = new Date(now.getTime() - 14 * 86400000);
    const windowEnd = new Date(now.getTime() + 21 * 86400000);

    const events: AppEvent[] = [];
    const seenIds = new Set<string>();
    let firstMatchDate: string | null = null;

    for (const ve of vevents) {
      const startUtc = parseIcalDate(ve.dtstart);
      if (!startUtc) continue;

      if (!firstMatchDate || startUtc < firstMatchDate) {
        firstMatchDate = startUtc;
      }

      const startDate = new Date(startUtc);
      if (startDate < windowStart || startDate > windowEnd) continue;

      const teams = extractTeams(ve.summary);
      if (!teams) continue;

      let endUtc: string;
      if (ve.dtend) {
        const parsed = parseIcalDate(ve.dtend);
        endUtc = parsed || addDuration(startUtc, DURATION_MIN);
      } else {
        endUtc = addDuration(startUtc, DURATION_MIN);
      }

      const id = stableId(startUtc, teams.away, teams.home);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      events.push({
        id,
        sport: "rugby",
        league: "European Champions Cup",
        awayTeam: teams.away,
        homeTeam: teams.home,
        startTimeLocal: startUtc,
        endTimeLocal: endUtc,
        providerId: "flosports",
        isLive: false,
        source: "rugby-championscup",
        leagueKey: "championscup",
        providerReason: "championscup-flosports",
      });
    }

    // De-duplicate same matchup within 36h (iCal timezone artifact: some feeds emit
    // both UTC and local-time-as-UTC entries for the same fixture with different hour values).
    events.sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime());
    const cupDropIds = new Set<string>();
    const cupSeen = new Map<string, AppEvent>(); // "homeTeam|awayTeam" → representative
    for (const ev of events) {
      const key = `${ev.homeTeam}|${ev.awayTeam}`;
      const prev = cupSeen.get(key);
      if (prev) {
        const prevMs = new Date(prev.startTimeLocal).getTime();
        const evMs = new Date(ev.startTimeLocal).getTime();
        const gapHours = Math.abs(evMs - prevMs) / 3600000;
        if (gapHours <= 36) {
          if (evMs < prevMs) {
            // keep current (earlier); drop prev
            cupDropIds.add(prev.id);
            cupSeen.set(key, ev);
          } else {
            // keep prev (earlier); drop current
            cupDropIds.add(ev.id);
          }
        } else {
          cupSeen.set(key, ev);
        }
      } else {
        cupSeen.set(key, ev);
      }
    }
    const dedupedEvents = cupDropIds.size > 0 ? events.filter(e => !cupDropIds.has(e.id)) : events;
    if (cupDropIds.size > 0) {
      console.log(`  Champions Cup: Removed ${cupDropIds.size} same-matchup duplicate(s)`);
    }

    console.log(`  Champions Cup: ${dedupedEvents.length} events in retention window`);
    return { events: dedupedEvents, sourceUsed: "ical", count: dedupedEvents.length, firstMatchDate: firstMatchDate ?? undefined };
  } catch (err: any) {
    console.error(`  Champions Cup: Error:`, err.message);
    return { events: [], sourceUsed: "none", count: 0 };
  }
}

export function mergeChampionsCupEvents(
  existing: AppEvent[],
  fresh: AppEvent[],
  now: Date
): ChampionsCupMergeResult {
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

  const freshIds = new Set(fresh.map(e => e.id));
  const matchupSeen = new Map<string, AppEvent>();
  const dupDropIds = new Set<string>();
  for (const e of merged) {
    const key = `${e.homeTeam}|${e.awayTeam}`;
    const prev = matchupSeen.get(key);
    if (prev) {
      const prevMs = new Date(prev.startTimeLocal).getTime();
      const evMs = new Date(e.startTimeLocal).getTime();
      const gapHours = Math.abs(evMs - prevMs) / 3600000;
      if (gapHours <= 36) {
        // Keep earlier entry (UTC canonical); only override if current is fresh and prev is stale
        const keepCurrent = freshIds.has(e.id) && !freshIds.has(prev.id);
        if (keepCurrent) { dupDropIds.add(prev.id); matchupSeen.set(key, e); }
        else { dupDropIds.add(e.id); } // drop later duplicate
      } else {
        if (evMs > prevMs) matchupSeen.set(key, e);
      }
    } else {
      matchupSeen.set(key, e);
    }
  }
  const deduped = dupDropIds.size > 0 ? merged.filter(e => !dupDropIds.has(e.id)) : merged;
  if (dupDropIds.size > 0) {
    console.log(`  Champions Cup [merge]: Removed ${dupDropIds.size} same-matchup duplicate(s)`);
  }

  return { merged: deduped, added, updated, pruned };
}
