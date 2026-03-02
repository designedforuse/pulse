const fs = require("fs");
const path = require("path");

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

console.log("\n=== Narrative Event Filtering Tests ===\n");

const narrativesPath = path.join(__dirname, "..", "data", "generatedNarratives.json");
const eventsPath = path.join(__dirname, "..", "data", "generatedEvents.json");

const narratives = JSON.parse(fs.readFileSync(narrativesPath, "utf-8"));
const eventsData = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
const eventMap = new Map(eventsData.events.map((e: any) => [e.id, e]));

console.log("Test 1: Momentum card eventIds contain only NHL events for the target team");
const momentumCards = narratives.cards.filter((c: any) => c.kind === "momentum");
for (const card of momentumCards) {
  const team = card.meta?.team || "";
  const league = card.meta?.league || "";
  const eventIds: string[] = card.meta?.eventIds || [];

  console.log(`  Card: ${card.title} (team=${team}, league=${league}, events=${eventIds.length})`);

  for (const id of eventIds) {
    const event = eventMap.get(id);
    if (!event) {
      assert(false, `Event ${id} not found in events data`);
      continue;
    }
    assert(event.league === league, `Event ${id} league=${event.league} matches card league=${league}`);
    const teamLower = team.toLowerCase();
    const homeMatch = event.homeTeam.toLowerCase().includes(teamLower) || teamLower.includes(event.homeTeam.toLowerCase());
    const awayMatch = event.awayTeam.toLowerCase().includes(teamLower) || teamLower.includes(event.awayTeam.toLowerCase());
    assert(homeMatch || awayMatch, `Event ${id} involves ${team} (home=${event.homeTeam}, away=${event.awayTeam})`);
  }
}

console.log("\nTest 2: No narrative card includes events from unrelated leagues");
for (const card of narratives.cards) {
  const eventIds: string[] = card.meta?.eventIds || [];
  const cardLeague = card.meta?.league;
  if (!cardLeague) continue;

  for (const id of eventIds) {
    const event = eventMap.get(id);
    if (!event) continue;
    assert(event.league === cardLeague, `Card "${card.title}" event ${id}: league ${event.league} === ${cardLeague}`);
  }
}

console.log("\nTest 3: Ducks Momentum specifically cannot contain SVNS/rugby events");
const ducksMomentum = momentumCards.find((c: any) => c.meta?.abbrev === "ANA");
if (ducksMomentum) {
  const eventIds: string[] = ducksMomentum.meta?.eventIds || [];
  const rugbyEvents = eventIds.filter(id => {
    const e = eventMap.get(id);
    return e && (e.sport === "rugby" || e.league?.includes("SVNS"));
  });
  assert(rugbyEvents.length === 0, `No rugby/SVNS events in Ducks momentum (found ${rugbyEvents.length})`);
  assert(eventIds.length > 0, `Ducks momentum has at least 1 event (found ${eventIds.length})`);
} else {
  console.log("  (Ducks momentum card not currently generated — skipping)");
}

console.log("\nTest 4: Empty team name matching guard");
function teamNamesMatch(candidate: string, target: string): boolean {
  const a = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const b = target.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
assert(!teamNamesMatch("", "Anaheim Ducks"), "Empty string does not match 'Anaheim Ducks'");
assert(!teamNamesMatch("Anaheim Ducks", ""), "'Anaheim Ducks' does not match empty string");
assert(!teamNamesMatch("", ""), "Empty does not match empty");
assert(teamNamesMatch("Anaheim Ducks", "Anaheim Ducks"), "Exact match works");
assert(teamNamesMatch("Anaheim Ducks", "Ducks"), "Partial match works");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
