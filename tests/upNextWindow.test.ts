import { isEventUpNext, getUpNextEvents } from "../utils/time";
import type { SportEvent } from "../lib/data";

function makeEvent(id: string, startIso: string): SportEvent {
  return {
    id,
    sport: "hockey",
    league: "NHL",
    homeTeam: "Team A",
    awayTeam: "Team B",
    startTimeLocal: startIso,
    startTimeRaw: startIso,
    providerId: "youtubetv",
    mode: "weekend-nights",
  } as SportEvent;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

console.log("\n=== Up Next Rolling 24h Window Tests ===\n");

const now = new Date("2026-03-02T18:00:00-08:00");
console.log(`now = ${now.toISOString()} (Mon Mar 2, 6pm PT)`);
const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
console.log(`windowEnd = ${windowEnd.toISOString()} (Tue Mar 3, 6pm PT)\n`);

console.log("Test 1: Events later today (Mon evening) are included");
const todayLater = makeEvent("today-later", "2026-03-02T22:00:00-08:00");
assert(isEventUpNext(todayLater, now), "Mon 10pm PT event included");

console.log("\nTest 2: Events tomorrow within 24h are included");
const tomorrowMorning = makeEvent("tmrw-am", "2026-03-03T09:00:00-08:00");
assert(isEventUpNext(tomorrowMorning, now), "Tue 9am PT event included");

const tomorrowMidDay = makeEvent("tmrw-noon", "2026-03-03T12:00:00-08:00");
assert(isEventUpNext(tomorrowMidDay, now), "Tue 12pm PT event included");

console.log("\nTest 3: Events tomorrow but >24h away are excluded");
const tomorrowLate = makeEvent("tmrw-late", "2026-03-03T19:00:00-08:00");
assert(!isEventUpNext(tomorrowLate, now), "Tue 7pm PT event excluded (>24h)");

console.log("\nTest 4: Events on Wed Mar 4 are excluded");
const wed = makeEvent("wed", "2026-03-04T08:00:00-08:00");
assert(!isEventUpNext(wed, now), "Wed Mar 4 event excluded");

console.log("\nTest 5: Events already started (past) are excluded");
const pastEvent = makeEvent("past", "2026-03-02T14:00:00-08:00");
assert(!isEventUpNext(pastEvent, now), "Mon 2pm PT event excluded (already past)");

console.log("\nTest 6: Event exactly at now is excluded (start > now, not >=)");
const exactNow = makeEvent("exact", "2026-03-02T18:00:00-08:00");
assert(!isEventUpNext(exactNow, now), "Event at exactly now excluded");

console.log("\nTest 7: Event at windowEnd boundary is included (start <= windowEnd)");
const atBoundary = makeEvent("boundary", "2026-03-03T18:00:00-08:00");
assert(isEventUpNext(atBoundary, now), "Event at exactly 24h mark included");

console.log("\nTest 8: getUpNextEvents returns sorted ascending by start time");
const events = [tomorrowMorning, todayLater, tomorrowMidDay, wed, pastEvent];
const result = getUpNextEvents(events, now);
assert(result.length === 3, `Returns 3 events (got ${result.length})`);
assert(result[0].id === "today-later", "First is today-later (Mon 10pm)");
assert(result[1].id === "tmrw-am", "Second is tmrw-am (Tue 9am)");
assert(result[2].id === "tmrw-noon", "Third is tmrw-noon (Tue 12pm)");

console.log("\nTest 9: Day grouping - events cross into next day (local tz)");
const groupEvents = getUpNextEvents(events, now);
const dayMap = new Map<string, string[]>();
for (const e of groupEvents) {
  const d = new Date(e.startTimeLocal);
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  if (!dayMap.has(key)) dayMap.set(key, []);
  dayMap.get(key)!.push(e.id);
}
const dayKeys = [...dayMap.keys()];
console.log(`  Day groups (UTC): ${dayKeys.join(", ")} (${dayMap.size} groups)`);
assert(groupEvents.length === 3, `3 events returned for grouping (got ${groupEvents.length})`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
