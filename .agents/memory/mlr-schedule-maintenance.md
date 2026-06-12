---
name: MLR schedule maintenance
description: How to refresh the hardcoded MLR (Major League Rugby) fixtures, including playoffs, from the authoritative source.
---

The MLR season schedule is hardcoded in `scripts/updateMlr.ts` (`MLR_2026_SCHEDULE`), entered preseason. It drifts from reality during the season — matchups, kickoff times, and even dates differ from what actually gets played. Do NOT trust the preseason hardcoded matchups; rebuild against the authoritative feed.

**Authoritative source:** the Pulselive feed used for MLR live scores —
`https://api.wr-rims-prod.pulselive.com/rugby/v3/event/2c6f3289-6eca-4b4c-80b7-4adc26d86368/schedule?language=en`
Each match has `time.millis` (UTC), `teams[0]`=home / `teams[1]`=away, `status` (C=complete with `scores`, U=unstarted), and `eventPhase` ("League" vs "Conference Finals" / "Championship Final").

**Why:** an unmaintained projection left 6 phantom future regular-season games and omitted the entire playoffs. Pulselive is the same feed that already powers MLR live scores, so it is internally consistent with runtime matching.

**How to apply when refreshing:**
- Convert Pulselive UTC → ET for the `{date, time}` fields. `etToUtc()` assumes EDT (-4) for months 3–10, which covers the whole MLR season (Mar–Jun) — safe.
- Map team name `"Anthem Rugby Carolina"` → `"Anthem RC"` (app/canonical name used by logos in `utils/teamLogos.ts` and `utils/teams.ts`). Other 5 names match as-is.
- Playoffs: 6-team league → top 4 make it → 2 "Conference Finals" (semifinals) + 1 "Championship Final". The Final's teams are unknown until the semis finish: use `home/away = "TBD"` — `getTeamLogoUrl` already returns null for "TBD"/"TBC", so placeholder fixtures render gracefully (no broken logos). Update teams once the semifinals conclude.
- Also align `data/seasonPhases.ts`: the `mlr` entry in `SEASON_PHASES_2026` (Regular/Playoffs/Final windows) and the `CHAMPIONSHIP_FINALS` MLR `date` (drives the Daily Wrap "to win the title" headline + month-snapshot championship marker). Keep the Final date == the actual final's local date.
- To regenerate `data/generatedEvents.json` for MLR only (avoid the full `updateSchedule.ts`, which hits many live APIs incl. CricAPI quota): call `fetchMlrEvents()` + `mergeMlrEvents(allEvents, fresh.events, now)` — `mergeMlrEvents` keeps non-MLR events untouched and re-sorts, so passing the full events array yields the full file. Run with `./node_modules/.bin/tsx` (plain `npx tsx` was getting killed with no output in this env). Then restart the `Start Backend` workflow (it caches the JSON at startup).
