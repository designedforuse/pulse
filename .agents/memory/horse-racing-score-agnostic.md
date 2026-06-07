---
name: Horse racing Daily Wrap (hardcoded winners)
description: How horse racing wrap stories surface a winner card + headline from hardcoded Triple Crown results (no live feed).
---

Horse racing (`sport: "horse-racing"`, distinct from F1's `"racing"`) has a hardcoded Triple Crown schedule with **no live results/winner API** — ESPN has no horse-racing coverage. Winners are therefore hardcoded into the schedule generator after each race runs and propagated as event fields.

**Why:** no horse-racing results API exists; inventing a winner is forbidden, so real winners are looked up (web search) and baked into the hardcoded schedule, matching the app's other hardcoded-schedule sports.

**How to apply:**
- Winner data lives on `TRIPLE_CROWN_RACES` in `scripts/updateHorseRacing.ts` as `winnerHorse` / `winnerJockey` / `winnerNote`, propagated onto the generated event. After a race runs, fill these in there AND in the committed `data/generatedEvents.json` event (in-window only; out-of-window races are pruned) so it shows without waiting for a refresh. No `masterGuide.json` entry exists for horse racing.
- Story is still wired in the dailyWrap main-loop fallback chain (`if (!score || !isFinalScore(score))`), gated by `hasConcluded(...)` + grace — NOT the `buildEditorial` switch. Event shape: `homeTeam` = race name, `awayTeam` = location ("Track, City ST"); track = segment before first comma.
- When `winnerHorse` is present, `horseRacingFallbackEditorial` builds editorial `"{horse} wins the {race}"` + detail + a `horseRacingResult` object; absent it, falls back to the old score-agnostic recap.
- Frontend renders `horseRacingResult` via `HorseRacingResultCard` (mirrors cycling/svns cards), gated by `!hideSpoilers`. `showScoreCard` must keep excluding `entry.horseRacingResult` or the generic UnifiedEventCard would preempt it (render-precedence trap). Backdrop: a `"horse-racing"` pool in `lib/sport-backdrops.ts`.
