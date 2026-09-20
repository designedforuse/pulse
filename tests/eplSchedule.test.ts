import {
  mergeEplEvents,
  parseEspnEplEvents,
} from "../scripts/updateEpl";
import { soccerEventMatchesEspn } from "../server/liveScores";

let passed = 0;
let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

const now = new Date("2026-09-20T12:00:00.000Z");
const espnRow = {
  id: "401879276",
  date: "2026-09-20T13:00Z",
  competitions: [{
    competitors: [
      { homeAway: "home", team: { displayName: "AFC Bournemouth" } },
      { homeAway: "away", team: { displayName: "Liverpool" } },
    ],
  }],
};

console.log("\n=== EPL schedule ingestion tests ===\n");
const parsed = parseEspnEplEvents([espnRow], now);
assert(parsed.length === 1, "parses a valid ESPN EPL scoreboard row");
assert(parsed[0].id === "soccer-epl-espn-401879276", "uses ESPN fixture id for stable identity");
assert(
  parsed[0].espnId === "401879276" &&
    parsed[0].externalId === "401879276" &&
    parsed[0].sourceEventId === "401879276",
  "persists ESPN identity fields used by live scores",
);
assert(
  parsed[0].providerId === "youtubetv" && parsed[0].providerReason === "epl-yttv",
  "preserves the EPL provider mapping",
);
assert(
  soccerEventMatchesEspn(parsed[0], "401879276", "different", "labels"),
  "live scores match the explicit ESPN id before team labels",
);
assert(
  soccerEventMatchesEspn(
    { ...parsed[0], espnId: undefined, id: "soccer-epl-espn-401879276" },
    "401879276",
    "different",
    "labels",
  ),
  "live scores recover ESPN identity from the stable EPL id",
);

const legacy = {
  ...parsed[0],
  id: "soccer-epl-20260920-1300-liverpool-at-afc-bournemouth",
  espnId: undefined,
  externalId: undefined,
  sourceEventId: undefined,
};
const migrated = mergeEplEvents([legacy], parsed, now);
assert(
  migrated.merged.length === 1 && migrated.merged[0].id === parsed[0].id,
  "ESPN row replaces the matching legacy iCal row without a duplicate",
);

const cached = {
  ...legacy,
  id: "soccer-epl-20260926-1400-arsenal-at-everton",
  homeTeam: "Everton",
  awayTeam: "Arsenal",
  startTimeLocal: "2026-09-26T14:00:00.000Z",
};
const failedFetchMerge = mergeEplEvents([cached], [], now);
assert(
  failedFetchMerge.merged.length === 1 && failedFetchMerge.merged[0].id === cached.id,
  "empty/failed fetch retains an in-window cached fixture",
);

const outside = { ...cached, startTimeLocal: "2026-08-01T14:00:00.000Z" };
assert(
  mergeEplEvents([outside], [], now).merged.length === 0,
  "cache retention still prunes rows outside the rolling window",
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);