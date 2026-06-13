---
name: Cycling grand-tour stage events
description: How multi-stage cycling races (Giro/TdF/Vuelta) are modeled and why the current stage must come from sessionTitle, not date math.
---

# One event per stage; read the stage from sessionTitle

Grand tours are generated as **one event per stage** (id `…-YYYY-MM-DD-stage-N`),
each with its own `startTimeLocal`/`endTimeLocal` (that day) and a `sessionTitle`
like `"Giro d'Italia 2026 — Stage 20"` (final stage: `"… — Stage 21 — Final"`).
`cyclingTotalStages` and `cyclingRoute` are tour-wide (identical on every stage;
route is the whole-race span, not the stage's own route).

**Gotcha / Why:** the current stage number must be parsed from `sessionTitle`
(`/Stage\s+(\d+)/i`). Do NOT compute it from date math against the event's
`startTimeLocal` — because each event IS a single day, `daysSinceStart` is ~0 and
(minus rest days passed) collapses to "Stage 1 of 21". The chaos card always read
sessionTitle and was correct; the "Also happening now" card used date math and
showed the wrong stage until fixed.

**How to apply:** in any cycling card/stage label, prefer the sessionTitle stage
number; only show "Final standings" once the *final* stage (currentStage ===
total) has ended.

# Adding a stage race (incl. non-grand-tours)

The `GRAND_TOURS` array in `scripts/updateCycling.ts` is the generic bucket for
ALL multi-stage road races, not just the Big Three. One-week UCI WorldTour races
(e.g. the Critérium du Dauphiné, renamed **Tour Auvergne-Rhône-Alpes** in 2026,
June 7–14, 8 stages) go here too — set `totalStages` and `restDays: []` and the
per-stage generator + `cycling-grand-tour-*` prune/merge handle the rest.
`league` stays `"Grand Tour"` (one of two cycling filter buckets, the other being
`"Epic Series"`); the user-facing name is `tournamentName`/`homeTeam`, so the
"Grand Tour" league label is just the internal grouping. US broadcaster = FloBikes
→ `providerId: "flosports"`.
**Why:** the prune/merge logic in `mergeCyclingEvents` keys entirely off the
`cycling-grand-tour-` id prefix; a separate model/prefix would bypass it.
Optional: GC leader can be surfaced per stage via `data/cyclingLeader.json`
(keyed by the umbrella id `cycling-grand-tour-<slug>-2026`; matches stages by
prefix) — skip it for near-finished races since the leader goes stale daily.
