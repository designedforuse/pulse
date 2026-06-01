---
name: Daily Wrap story card render precedence
description: Why a new dedicated Daily Wrap story card can silently never render
---

# Daily Wrap story-card render precedence

The Daily Wrap full-story footer (`app/daily-wrap-full.tsx`) picks ONE card via a
single if/else chain. The FIRST branch is `showScoreCard` →
`UnifiedEventCard` (the generic event/chaos card). `showScoreCard` is true
whenever the entry has both an `event` and a live `score` (and spoilers are off).

**Gotcha:** Any sport that still has a live score in its window (e.g. cycling
grand tours expose `cyclingLeader*` score fields) will hit `UnifiedEventCard`
first. A new dedicated story card added *later* in the chain (SVNS / athletics /
cycling) is then dead code for those entries — it compiles, the data is present,
but it never renders.

**How to apply:** When adding a dedicated Daily Wrap story card for a sport that
also produces a live score, you MUST make `showScoreCard` opt out for it
(e.g. `&& !entry.cyclingResult`) or the generic event card wins. Don't just add
a branch lower in the chain and assume it renders.

**Why:** Cost real debugging — the cycling GC card was built and the
`cyclingResult` field was confirmed in `/api/daily-wrap`, yet the device kept
showing the old two-team UnifiedEventCard layout because `showScoreCard`
short-circuited first.
