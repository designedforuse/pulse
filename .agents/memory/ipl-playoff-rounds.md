---
name: IPL playoff rounds
description: How IPL knockout stages are labelled and why we never derive them from schedule position.
---

# IPL playoff round labels

The official iplt20.com schedule feed labels every fixture in `MatchOrder`:
regular games are `"Match N"`, knockouts are `"Qualifier 1"`, `"Eliminator"`,
`"Qualifier 2"`, `"Final"`. We persist only the knockout stage onto the event as
`roundName` (regular games stay unlabelled).

`server/dailyWrap.ts` cricketEditorial uses `roundName` (+ `seriesName`, e.g.
"IPL 2026") to build stage-aware headlines (champions / storm into final /
survive Eliminator / book place in final).

**Why:** Do NOT derive the playoff stage from schedule position (e.g. "last 4
matches = the playoffs"). The schedule is pruned to a rolling recent window, so
mid-season the most-recent retained matches are ordinary league games and would
be mislabelled as a Final. The feed's `MatchOrder` is the only reliable source.

**How to apply:** When a new IPL season's playoffs approach, ingestion picks up
the labels automatically. If you ever need them on already-stored events before a
refresh, backfill `roundName` on the playoff event ids directly (live feed
MatchIDs match the stored `cricket-ipl-<id>` ids).
