---
name: Multi-day session events (WRC per-day split)
description: How a multi-day session sport is split into one card per day with a bounded live window.
---

# Multi-day session events split into per-day cards

WRC rallies are emitted as **one event per day** (not one card spanning the whole window). The same pattern fits any multi-day session sport (rally, stage races) that should not read as "live" overnight.

- **Why per-day at all:** a single event spanning Thu–Sun has `endTimeLocal` days after `startTimeLocal`. `utils/time.ts isEventLive()` = `now ≥ start && now ≤ getEventEnd()`, so one long event shows "live/In Progress" continuously for days. Splitting into days with short windows fixes this.
- **Day window math (`scripts/updateWrc.ts`):** `totalDays = floor((endUtc − startUtc)/24h) + 1`; day i (0-indexed) start = `startUtc + i·24h`; `dayEnd = min(dayStart + 8h, endUtc)`. The `min(..., endUtc)` cap matters — the final day is usually shorter than 8h, and without it the last card stays "live" hours past the real finish.
- **Fields:** per-day events carry `dayNumber` + `totalDays` (added to `SportEvent` in `lib/data.ts`). The card reads these directly for the "Day N of M" label — do **not** recompute day index from elapsed time per-card (each card is now a single short day, so the old elapsed-time math would always say "Day 1").
- **Migration / cleanup is automatic:** the merge prunes any `racing-wrc-` id not in the fresh set, so the old single-event-per-rally ids drop out when the per-day generator first runs. No manual cache wipe needed.
- **Caveat:** day start time-of-day is inherited from each rally's `startUtc` (best-effort). Some rallies start with an evening ceremonial time, so a daily window can land in the evening rather than morning — acceptable given the schedule is hand-placed, but re-verify against wrc.com near the event.

## Cricket Test matches (fixed 5-day split, early finish)

Cricket Tests reuse the per-day split but differ from WRC in two ways: the day count is **fixed at 5** (not derived from an end timestamp — CricAPI gives only a start `dateTimeGMT`), and Tests routinely **end before day 5** (a result inside 3–4 days is common).

- **Split (`scripts/updateCricket.ts splitTestMatchDays`):** id = `${base.id}-day${i+1}`, each day an 8h window, all days share `cricketMatchId` so live scores still resolve to the one CricAPI match. Carries `dayNumber`/`totalDays` (always 5) plus `isFinalDay` (the last *emitted* day).
- **Early-finish truncation:** when `match.matchEnded`, approximate the last played day from elapsed time (`floor((now−start)/24h)+1`, clamp 1..5) and emit only that many days — so a 3-day finish never shows Day 4/Day 5. This is a best-effort approximation (CricAPI never reports the actual finish day) and can under-count by a day near a morning finish; the wrap's score-based dedup corrects the story regardless.
- **Merge prune for shrink (`mergeCricketEvents`):** truncation only sticks if the merge drops now-absent later days. Prune existing Test day-events whose **base id is in the fresh feed** but whose **full id is not** — scoped so concluded Tests that aged out of CricAPI keep their retained cards.
- **Migration prune must be replacement-gated:** legacy single-event Tests (`format==="test"` && `dayNumber==null`) are dropped on merge **only when the fresh feed has per-day replacements for that match** (legacy id == fresh base id). Dropping them unconditionally deletes matches that are merely missing from the current refresh (quota out / aged out of CricAPI) with no replacement — keep them and let the retention window age them out instead.
- **Daily Wrap gate (`server/dailyWrap.ts`):** do **not** hard-gate to `dayNumber===totalDays` (misses early finishes and emits future-day dupes). Instead: with a final score, the **first** day-event per `cricketMatchId` surfaces the story and the rest are deduped by match id (a `Set`); without a final score, only the `isFinalDay` event may use the time-based fallback. ODI/T20 (no `dayNumber`) bypass this entirely.

## Matchup-dedup must exempt session events

Multi-day session cards repeat the **same matchup string** across consecutive days (e.g. SVNS Day 1/2/3 all = `"SVNS {city}"` vs `""`). Any dedup that keys on `homeTeam|awayTeam|leagueKey` **without a date** and drops "same-matchup within ~36h" will silently delete the middle day(s): Day 2 sits 24h from Day 1 (≤36h → dropped) while Day 3 sits 48h away (kept). Symptom: Day 1 and Day 3 present, Day 2 missing.
- **Rule:** every matchup/conflict dedup loop must `continue` on `eventType === "session"`. In `scripts/updateRugby.ts` this means **three** loops: the in-fetch matchup dedup in `fetchRugbyEvents()`, plus the team-conflict and same-matchup loops in `mergeRugbyEvents()`. Missing any one re-drops the middle day downstream.
- **Why session is the right key:** these events are single-participant multi-day by design (empty awayTeam), so they can never be a genuine iCal timezone-artifact duplicate — the thing matchup-dedup exists to catch.
