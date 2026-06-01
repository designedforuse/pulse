---
name: Daily Wrap editorial source types
description: How to add a new sport/event to the Daily Wrap recap depending on its result-data shape
---

# Adding a sport to the Daily Wrap (server/dailyWrap.ts)

`buildEditorial` only runs for events whose keyed live score passes `isFinalScore`
(status final + numeric/structured result). When a new event type is "missing"
from the wrap, first classify its result-data shape — there are three patterns:

1. **Keyed final score (normal path).** The sport's `fetchAllLiveScores` entry
   sets `status:"final"`. Just add a `case "<sport>"` + an editorial fn. Cricket
   fits here: result text lives in `score.period` (e.g. "X won by 5 wickets"),
   innings totals in `cricketHome/cricketAway`, numeric scores are 0 — so use the
   text, don't compute a winner from numbers.

2. **Live-leader only, no final status (hasConcluded fallback).** Cycling grand
   tours only expose the live overall (GC) leader (`score.cyclingLeader`), no
   per-stage winner and no final status. Handle in the loop's
   `!isFinalScore` block, gated on `hasConcluded(event)`, like schools rugby.
   The live leader attaches to EVERY stage event in the lookback window, so dedupe
   to the latest stage per tour. Final stage (sessionTitle contains "Final") = the
   overall champion ("wins"); else "leads ... after Stage N".

3. **Separate feed, not in the keyed score map.** SVNS session events have empty
   awayTeam, so rugby score-matching never fills `scores[event.id]`. Results come
   from `fetchSvnsMatches(city)` (city parsed from homeTeam "SVNS <City>").
   Surface Cup Final champions (men+women), and scope the Cup Final match `.time`
   to the event's day window so only the finals-day card fires, not Day 1/Day 2.

**Why:** these three were silently dropped because the switch had no handler and
the leader/separate-feed cases never produce an `isFinalScore` score.

**How to apply:** fallback (non-normal) entries should be added to `fallbackIds`
to skip highlight enrichment (no single match → mismatched clip risk).

## Tournament-container entries can't use the UnifiedEventCard score path
SVNS (and similar tournament-container) wrap entries have no head-to-head
`event` in `allEvents` and no `scoreSnapshot`, so the full-screen story's
`UnifiedEventCard` score card never fires. To show a real final score, carry
the result on the DailyWrapEntry itself (a structured field) and render a
dedicated card from it — don't try to synthesize a fake SportEvent/ScoreData.

**Spoiler safety (cross-cutting):** the wrap full-screen has a spoiler toggle
(`hideSpoilers`). `entry.detail` and any result-bearing field can contain the
scoreline, so NEVER render `entry.detail` (or a new finals card) raw while
`hideSpoilers` is true — gate every score-bearing branch on `!hideSpoilers`
and fall back to a neutral label (league name). This is easy to miss when
adding a new card type because the old fallback path printed `entry.detail`.
