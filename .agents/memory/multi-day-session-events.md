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
