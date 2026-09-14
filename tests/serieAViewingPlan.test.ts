import {
  normalizeViewingPlanItems,
  reconcileViewingPlan,
  serializeViewingPlan,
  parseViewingPlan,
  upsertViewingPlanItem,
  createViewingPlanItem,
  getLocalMondayWeekBounds,
  isViewingPlanItemVisible,
} from "../lib/viewing-plan";
import {
  getSerieAMatchIdentityAliases,
} from "../lib/serie-a-identity";
import type { SportEvent } from "../lib/data";
import { mergeSerieAEvents } from "../scripts/updateSerieA";
import { soccerEventMatchesEspn } from "../server/liveScores";

function event(
  id: string,
  startTimeLocal: string,
  overrides: Partial<SportEvent> = {},
): SportEvent {
  return {
    id,
    sport: "soccer",
    league: "Serie A",
    leagueKey: "seriea",
    awayTeam: "AC Milan",
    homeTeam: "Inter",
    startTimeLocal,
    providerId: "primevideo",
    ...overrides,
  };
}

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

console.log("\n=== Serie A viewing plan and fixture identity tests ===\n");

const oldFixture = event(
  "soccer-seriea-20260411-1945-ac-milan-at-inter",
  "2026-04-11T19:45:00.000Z",
);
const rescheduledFixture = event(
  "soccer-seriea-espn-12345",
  "2026-04-12T16:00:00.000Z",
  { espnId: "12345", externalId: "12345" },
);

console.log("Identity");
assert(
  getSerieAMatchIdentityAliases(oldFixture).some((key) =>
    getSerieAMatchIdentityAliases(rescheduledFixture).includes(key),
  ),
  "kickoff-derived and ESPN-backed fixture reconcile through team/season alias",
);
assert(
  getSerieAMatchIdentityAliases(rescheduledFixture).includes("espn:12345"),
  "ESPN fixture id is the strongest identity",
);

console.log("\nPlan mutations");
const first = upsertViewingPlanItem([], oldFixture, "live");
assert(first.length === 1 && first[0].choice === "live", "saving live creates one plan item");
const moved = upsertViewingPlanItem(first, rescheduledFixture, "highlights");
assert(moved.length === 1, "rescheduling does not create a duplicate item");
assert(moved[0].eventId === rescheduledFixture.id, "rescheduling updates the event id");
assert(moved[0].choice === "highlights", "changing choice preserves one item and updates intent");

const reconciled = reconcileViewingPlan(moved, [rescheduledFixture]);
assert(reconciled.items.length === 1, "present fixture remains in plan");
assert(reconciled.items[0].detailsAvailable, "present fixture has available details");
assert(
  reconciled.items[0].startTimeLocal === rescheduledFixture.startTimeLocal,
  "present fixture refreshes kickoff details",
);

const missing = reconcileViewingPlan(moved, []);
assert(missing.items.length === 1, "temporary feed omission does not delete saved fixture");
assert(!missing.items[0].detailsAvailable, "temporary feed omission is marked unavailable");
assert(missing.items[0].choice === "highlights", "temporary omission preserves saved choice");

console.log("\nSchedule merge");
const mergeNow = new Date("2026-04-10T12:00:00.000Z");
const oldCached = event(
  "soccer-seriea-20260411-1945-ac-milan-at-inter",
  "2026-04-11T19:45:00.000Z",
  { source: "soccer-seriea" },
);
const fetchedMoved = event("soccer-seriea-espn-12345", "2026-04-12T16:00:00.000Z", {
  source: "soccer-seriea",
  espnId: "12345",
  externalId: "12345",
});
const mergedSchedule = mergeSerieAEvents([oldCached], [fetchedMoved], mergeNow);
assert(mergedSchedule.merged.length === 1, "rescheduled fixture does not leave a ghost cache row");
assert(mergedSchedule.merged[0].id === fetchedMoved.id, "merged row uses ESPN-backed fixture id");

const partialUnmatched = event(
  "soccer-seriea-20260415-1945-juventus-at-roma",
  "2026-04-15T19:45:00.000Z",
  { awayTeam: "Juventus", homeTeam: "Roma", source: "soccer-seriea" },
);
const staleCached = event(
  "soccer-seriea-20260301-1945-napoli-at-lazio",
  "2026-03-01T19:45:00.000Z",
  { awayTeam: "Napoli", homeTeam: "Lazio", source: "soccer-seriea" },
);
const partialMerge = mergeSerieAEvents(
  [oldCached, partialUnmatched, staleCached],
  [fetchedMoved],
  mergeNow,
);
assert(
  partialMerge.merged.some((item) => item.id === partialUnmatched.id),
  "partial ESPN response preserves an unmatched in-window cached fixture",
);
assert(
  !partialMerge.merged.some((item) => item.id === staleCached.id),
  "merge prunes cached fixtures outside the retention window",
);
const duplicateFetched = {
  ...fetchedMoved,
  id: "soccer-seriea-espn-duplicate",
  espnId: fetchedMoved.espnId,
};
const dedupedMerge = mergeSerieAEvents([], [fetchedMoved, duplicateFetched], mergeNow);
assert(dedupedMerge.merged.length === 1, "merge deduplicates rows sharing a positive ESPN identity");

console.log("\nLive-score identity");
assert(
  soccerEventMatchesEspn(
    {
      id: "soccer-seriea-espn-12345",
      espnId: "12345",
      homeTeam: "Inter",
      awayTeam: "AC Milan",
    },
    "12345",
    "Completely Different ESPN Home Label",
    "Completely Different ESPN Away Label",
  ),
  "Serie A live scores use the stable ESPN id before team slugs",
);
assert(
  !soccerEventMatchesEspn(
    { id: "soccer-seriea-espn-12345", espnId: "12345", homeTeam: "Inter", awayTeam: "AC Milan" },
    "99999",
    "Inter",
    "AC Milan",
  ),
  "stable ESPN id does not attach a score from another fixture",
);
assert(
  soccerEventMatchesEspn(
    { id: "soccer-seriea-espn-12345", homeTeam: "Inter", awayTeam: "AC Milan" },
    "12345",
    "Inter",
    "AC Milan",
  ),
  "embedded ESPN id supports legacy rows missing the explicit espnId field",
);
assert(
  soccerEventMatchesEspn(
    {
      id: "soccer-seriea-20260411-1945-ac-milan-at-inter",
      homeTeam: "Inter",
      awayTeam: "AC Milan",
    },
    "legacy",
    "Inter",
    "AC Milan",
  ),
  "legacy soccer rows retain team-slug score matching",
);

console.log("\nViewing-plan boundaries");
const localWednesday = new Date(2026, 3, 15, 12, 0, 0, 0);
const localWeek = getLocalMondayWeekBounds(localWednesday);
assert(localWeek.start.getDay() === 1, "This week starts at local Monday midnight");
assert(
  localWeek.endExclusive.getTime() - localWeek.start.getTime() >= 6 * 86400000 &&
    localWeek.endExclusive.getTime() - localWeek.start.getTime() <= 8 * 86400000,
  "local calendar week spans one week across DST boundaries",
);
const kickedOffThisWeek = createViewingPlanItem(
  event("soccer-seriea-week", new Date(localWednesday.getTime() - 86400000).toISOString()),
  "live",
)!;
assert(
  isViewingPlanItemVisible(kickedOffThisWeek, "week", localWednesday, localWeek, null, false),
  "This week includes fixtures that already kicked off this week",
);
assert(
  !isViewingPlanItemVisible(kickedOffThisWeek, "upcoming", localWednesday, localWeek, null, false),
  "Upcoming excludes a completed non-live fixture from earlier this week",
);
assert(
  isViewingPlanItemVisible(kickedOffThisWeek, "upcoming", localWednesday, localWeek, null, true),
  "Upcoming includes a currently live fixture even after kickoff",
);
const nextWeekFixture = createViewingPlanItem(
  event("soccer-seriea-next-week", localWeek.endExclusive.toISOString()),
  "highlights",
)!;
assert(
  isViewingPlanItemVisible(nextWeekFixture, "upcoming", localWednesday, localWeek, null, false),
  "Upcoming includes future fixtures after the current local week",
);
assert(
  !isViewingPlanItemVisible(nextWeekFixture, "week", localWednesday, localWeek, null, false),
  "This week excludes the next local calendar week",
);
assert(
  isViewingPlanItemVisible(missing.items[0], "week", localWednesday, localWeek, "Juventus", false) &&
    isViewingPlanItemVisible(missing.items[0], "upcoming", localWednesday, localWeek, "Juventus", false),
  "unavailable snapshots remain reachable across tabs and team filters",
);

console.log("\nPersistence");
const persisted = parseViewingPlan(serializeViewingPlan(moved));
assert(persisted.length === 1, "serialized plan round-trips");
assert(persisted[0].choice === "highlights", "round-trip preserves choice");
assert(
  normalizeViewingPlanItems([...moved, ...moved]).length === 1,
  "duplicate persisted records collapse to one fixture",
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);