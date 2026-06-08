---
name: CricAPI free-tier quota & backoff
description: Why live cricket scores silently vanish and how the daily-limit backoff must work.
---

# CricAPI free-tier quota exhaustion

Live cricket scores come from CricAPI's `cricScore` endpoint (one call returns all
current matches). The free tier is **100 hits/day** and **resets at 00:00 UTC**.
Failure responses still include the structured `info.hitsToday` / `info.hitsLimit`
counters, and **every failed/over-limit call still counts as a hit**.

**The trap:** a plain cache-TTL on failure keeps re-polling every TTL window all day.
Each retry burns another hit, so an exhausted key never recovers and usage balloons
far past the limit (observed ~202/100 in one day). It's worse because the dev
workspace and the published app share the **same** `CRICAPI_KEY`, roughly doubling
consumption.

**Rule:** when CricAPI reports the daily limit is reached, set a hard backoff until the
next UTC reset (we use 00:05 UTC + serve cached scores, no API calls) — do NOT keep
retrying on the normal cache TTL.
**Why:** failed calls count toward the quota, so retrying after exhaustion only digs
deeper and starves production of its remaining hits.
**How to apply:** detect exhaustion from the numeric counters first
(`info.hitsToday >= info.hitsLimit`), falling back to matching the reason string.
Using the numbers also prevents a full-day blackout if the quota already reset.

Legitimate usage fits under 100/day on a single environment: schedule generation
(~10 page hits × 2 cron runs) + live polling (30-min TTL during live windows). The
overshoot was purely the runaway-retry loop, not normal usage. If reliable live
cricket is needed across BOTH dev and prod simultaneously, the free tier is too small
— that needs a paid plan, not a code change.

## "Blocked for 15 minutes" with EMPTY info = exhausted, not a burst throttle
When `/matches` returns `status:"failure"`, `reason:"Blocked for 15 minutes"` and an
**empty `info:{}`** (no `hitsToday`/`hitsLimit` counters), treat it as the key being
spent/blocked for the rest of the cycle — NOT a recoverable short rate-limit. Observed:
it persisted unchanged after a full ~16-minute quiet period with zero calls. The "15
minutes" string is misleading.
**Do not** wait-and-retry in-session to clear it, and **do not** keep probing — each
call can re-arm the block and (per above) every failed call still counts. When schedule
generation hits this, `fetchCricketEvents` correctly fails on page 1 and returns empty
(no loop); the persisted fixtures are just retained stale until a later cron run lands a
successful pull. Diagnose once, then stop. Durable fix for missing cricket fixtures is a
paid/dedicated key, not more retries or code changes.
