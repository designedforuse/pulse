---
name: Pulselive rugby live-score matching
description: Why rugby live scores must be matched to events by date, not team name alone
---

# Pulselive rugby score → event matching

The World Rugby / Pulselive feed (`fetchPulseliveRugbyScores` in `server/liveScores.ts`)
returns the **whole season schedule** per competition, and a season contains
multiple meetings of the same two teams (return leg, playoff, earlier round).

**Rule:** match a feed match to one of our events by **kickoff-time proximity**
(`wrMatch.time.millis` vs `event.startTimeLocal`), not by team name alone. Iterate
per-event and pick the closest same-teams fixture, requiring both timestamps within
a window (~18h) when present.

**Why:** team-name-only matching grabbed the *first* same-pairing fixture in the
schedule. An earlier COMPLETED meeting (status `C`, e.g. a 45-12 final) bound itself
to the current LIVE fixture, so a live game (17-0 at 16') was reported as a finished
blowout — and that false `status:"final"` then passed the Daily Wrap's
`isFinalScore()` + `hasConcluded()` gate, surfacing a fabricated result.

**How to apply:** any feed that returns a full-season list and is keyed by team name
needs date disambiguation. The same shape (`time.millis`, `teams[].name`, `status`,
`scores[]`) is used by SVNS (separate path) and shared by all Pulselive comps
(Super Rugby, URC, Top 14, English Premiership, Champions Cup, Challenge Cup, MLR,
Six Nations). If a timestamp is missing on either side, it falls back to team-only.
