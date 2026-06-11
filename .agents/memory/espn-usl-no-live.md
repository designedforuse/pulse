---
name: ESPN does not carry live USL scores
description: Why USL shows final-only scores; ESPN free feed has no in-progress state for USL Championship
---

# ESPN free scoreboard has no live in-progress state for USL

ESPN's free hidden API (`site.api.espn.com/.../soccer/usa.usl.1/scoreboard` and the
`summary` endpoint) provides USL Championship **fixtures** (`state: "pre"`) and
**finals** (`state: "post"`, with correct scores), but **never** publishes the
in-progress `state: "in"` for USL. A USL game stays "Scheduled" all the way through
the match and only flips to "Final" after the whistle.

**How this was proven:** at a moment ESPN was indisputably current (MLB showed
`in: 8` live games), a USL game 64 minutes past kickoff was still `pre` with no
clock/score on both the scoreboard and the summary endpoints. A replay of a
completed matchday bound 5/5 finals correctly — so our code (slug `usa.usl.1`,
live window, team-name substring matching in `fetchSoccerScores`) is correct; the
limitation is purely ESPN's data.

**Decision:** keep ESPN as the USL source — USL shows **final scores only**, no
live in-game updates. The user explicitly chose this over adding a new external
data provider.

**Why:** true live USL requires a different feed; checked existing keys —
API-Football (RapidAPI) returns "not subscribed", and The Odds API has no USL
coverage. Adding a new provider is a new external dependency the user declined.

**How to apply:** do not treat "no live USL score during a match" as a bug. If
live USL is ever requested again, it needs a new data source (paid), not a fix to
the ESPN path.
