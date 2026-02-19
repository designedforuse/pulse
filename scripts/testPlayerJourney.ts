import * as path from "node:path";
import { transformFixtureToJourney, formatSeasonLabel } from "../server/playerJourney";
import type { PlayerJourneyResponse, CareerStop } from "../server/playerJourney";

const FIXTURES_DIR = path.resolve(__dirname, "..", "tests", "fixtures", "nhl-player-landing");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertStrictEqual(actual: any, expected: any, label: string) {
  assert(actual === expected, `${label}: expected "${expected}", got "${actual}"`);
}

function assertIncludes(arr: string[], value: string, label: string) {
  assert(arr.includes(value), `${label}: expected array to include "${value}", got [${arr.join(", ")}]`);
}

function assertPhaseValues(stops: CareerStop[], label: string) {
  const validPhases = new Set(["REG", "PO", "UNK"]);
  const invalid = stops.filter(s => !validPhases.has(s.phase));
  assert(invalid.length === 0, `${label}: all phase values must be REG|PO|UNK. Found invalid: ${invalid.map(s => s.phase).join(", ")}`);
}

function assertSeasonLabelFormat(stops: CareerStop[], label: string) {
  const bad = stops.filter(s => !/^\d{4}-\d{2}$/.test(s.seasonLabel));
  assert(bad.length === 0, `${label}: all seasonLabel must match YYYY-YY. Bad: ${bad.map(s => `${s.season}→${s.seasonLabel}`).join(", ")}`);
}

function runFormatSeasonLabelTests() {
  console.log("\n=== formatSeasonLabel tests ===");
  assertStrictEqual(formatSeasonLabel(20162017), "2016-17", "20162017");
  assertStrictEqual(formatSeasonLabel(20252026), "2025-26", "20252026");
  assertStrictEqual(formatSeasonLabel(20082009), "2008-09", "20082009");
  assertStrictEqual(formatSeasonLabel(19991900), "1999-00", "19991900 edge");
}

function runSnapshotTest(playerId: number, expectedName: string, expectedLeagues: string[], expectedLevel: string | null) {
  console.log(`\n=== Snapshot test: ${expectedName} (${playerId}) ===`);

  const fixturePath = path.join(FIXTURES_DIR, `${playerId}.json`);
  let result: { journey: PlayerJourneyResponse; upstreamBytes: number };
  try {
    result = transformFixtureToJourney(fixturePath);
  } catch (err: any) {
    console.error(`  FAIL: Could not load fixture: ${err.message}`);
    failed++;
    return;
  }

  const { journey, upstreamBytes } = result;

  assert(upstreamBytes > 0, `upstreamBytes > 0 (got ${upstreamBytes})`);
  assertStrictEqual(journey.upstreamSource, "nhl-api-web", "upstreamSource");
  assert(!!journey.fetchedAt, "fetchedAt is present");

  assertStrictEqual(journey.profile.playerId, playerId, "profile.playerId");
  assert(journey.profile.fullName.length > 0, `profile.fullName is non-empty: "${journey.profile.fullName}"`);
  assert(journey.profile.fullName.includes(expectedName.split(" ")[1]), `profile.fullName contains last name "${expectedName.split(" ")[1]}"`);
  assert(typeof journey.profile.isActive === "boolean", `profile.isActive is boolean (got ${journey.profile.isActive})`);
  assert(journey.profile.position.length > 0, `profile.position is non-empty: "${journey.profile.position}"`);

  assert(journey.careerStops.length > 0, `careerStops.length > 0 (got ${journey.careerStops.length})`);
  assertPhaseValues(journey.careerStops, "careerStops phase values");
  assertSeasonLabelFormat(journey.careerStops, "careerStops seasonLabel format");

  for (const league of expectedLeagues) {
    assertIncludes(journey.summary.leaguesPlayed, league, `summary.leaguesPlayed includes ${league}`);
  }

  if (expectedLevel) {
    assertStrictEqual(journey.derived.lastRecordedLevel, expectedLevel, "derived.lastRecordedLevel");
    assert(journey.derived.lastRecordedSeason !== null, "derived.lastRecordedSeason is non-null");
    assert(/^\d{4}-\d{2}$/.test(journey.derived.lastRecordedSeason!), `derived.lastRecordedSeason format: "${journey.derived.lastRecordedSeason}"`);
  }

  const regStops = journey.careerStops.filter(s => s.phase === "REG");
  const poStops = journey.careerStops.filter(s => s.phase === "PO");
  console.log(`  INFO: ${journey.careerStops.length} total stops, ${regStops.length} REG, ${poStops.length} PO, ${journey.careerStops.length - regStops.length - poStops.length} UNK`);

  if (expectedLeagues.includes("NHL")) {
    assert(journey.summary.totalNhlGames > 0, `summary.totalNhlGames > 0 (got ${journey.summary.totalNhlGames})`);
    assert(journey.summary.nhlDebut !== null, "summary.nhlDebut is non-null");
  }
  if (expectedLeagues.includes("AHL")) {
    assert(journey.summary.totalAhlGames > 0, `summary.totalAhlGames > 0 (got ${journey.summary.totalAhlGames})`);
  }
  if (expectedLeagues.includes("ECHL")) {
    assert(journey.summary.totalEchlGames > 0, `summary.totalEchlGames > 0 (got ${journey.summary.totalEchlGames})`);
  }

  const poWithHigherGP = journey.careerStops.filter((s, i) => {
    if (s.phase !== "PO") return false;
    const prev = journey.careerStops.slice(0, i).find(
      p => p.season === s.season && p.leagueAbbrev === s.leagueAbbrev && p.teamName === s.teamName && p.phase === "REG"
    );
    if (!prev) return false;
    return s.gamesPlayed > prev.gamesPlayed;
  });
  assert(poWithHigherGP.length === 0, `No PO entries with GP > matching REG entry (conservative rule). Found ${poWithHigherGP.length}`);
}

async function runLiveTest(playerId: number, expectedName: string) {
  console.log(`\n=== Live test: ${expectedName} (${playerId}) ===`);
  try {
    const url = `https://api-web.nhle.com/v1/player/${playerId}/landing`;
    const resp = await fetch(url);
    assert(resp.ok, `NHL API returned ${resp.status}`);
    const data = await resp.json();
    assert(data.playerId === playerId, `upstream playerId matches (got ${data.playerId})`);
    assert(Array.isArray(data.seasonTotals), "upstream has seasonTotals array");
    assert(data.seasonTotals.length > 0, `seasonTotals has entries (got ${data.seasonTotals.length})`);
    console.log(`  INFO: Live API returned ${data.seasonTotals.length} seasonTotals entries`);
  } catch (err: any) {
    console.error(`  FAIL: Live test error: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log("Player Journey Test Suite");
  console.log("========================");

  runFormatSeasonLabelTests();

  runSnapshotTest(8478402, "Connor McDavid", ["NHL", "OHL"], "NHL");
  runSnapshotTest(8483464, "Marco Kasper", ["NHL", "AHL"], "NHL");
  runSnapshotTest(8478024, "Ville Husso", ["NHL", "AHL", "ECHL"], "AHL");

  if (process.env.RUN_LIVE_NHL_TESTS === "true") {
    console.log("\n\n--- LIVE TESTS (network required) ---");
    await runLiveTest(8478402, "Connor McDavid");
    await runLiveTest(8483464, "Marco Kasper");
    await runLiveTest(8478024, "Ville Husso");
  } else {
    console.log("\n\nSkipping live tests (set RUN_LIVE_NHL_TESTS=true to enable)");
  }

  console.log(`\n========================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
