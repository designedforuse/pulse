---
name: WRC live stage winners (eWRC API)
description: eWRC-Results has a no-key public JSON API for WRC stage results; how round ids map to it
---

# WRC live stage winners

eWRC-Results exposes a clean public JSON API at `api-next.ewrc-results.com` that needs **no API key and no browser at runtime**. Headless Chromium/playwright was only needed once to discover the event ids — not for fetching.

**Why:** WRC has no official free results feed; eWRC is the practical source and its JSON endpoints are stable enough to poll directly.

**How to apply:**
- Endpoints: `/event/{ewrcId}/event-page` (entries + timetable; each stage has `leg_number`) and `/event/{ewrcId}/live-aggregate/{stageId}` (results; row with `r === 1` is the stage winner, its `id` matches `entry.id` from event-page).
- Internal WRC round ids (`racing-wrc-<round>-2026`) are mapped to eWRC numeric event ids in `WRC_EWRC_EVENT_IDS` in `server/wrcStages.ts`. Only mapped rounds return data; **add new rounds' eWRC ids there as they approach** (find the id from the rally's eWRC-Results URL).
- Per-day cards: `dayNumber` maps directly to the rally `leg_number`. Show leg-level completion (count stages in that leg, excluding cancelled), not whole-rally totals.
- Completed/FINAL day cards have static winners — fetch once, don't keep polling; only poll while live.
- **Overall rally winner ≠ stage winner.** The rally champion is the overall (general classification) leader, found in the SAME `live-aggregate/{stageId}` payload under `results.oa` (`r_oa === 1`), not `results.stage`. Read it from the LAST completed (non-cancelled) stage — walk backward if the power stage was cancelled. Margin = `oa[2].total.raw - oa[1].total.raw` (ms).
- Daily Wrap rally story: rallies are score-less multi-day "session" events, so they enter the wrap via a dedicated fallback branch (not the F1 racing score path). Gate on final day only (`dayNumber === totalDays`) + `hasConcluded` + a mapped round, or you get one card per day / no card at all. eWRC driver flags are ISO-2 ("gb") → build emoji from regional-indicator codepoints, NOT the country-name COUNTRY_FLAGS map.
