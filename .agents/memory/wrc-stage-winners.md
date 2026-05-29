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
