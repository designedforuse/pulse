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
