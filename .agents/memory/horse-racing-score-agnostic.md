---
name: Horse racing Daily Wrap (score-agnostic)
description: Why horse racing wrap stories carry no winner and live in the fallback chain, not buildEditorial.
---

Horse racing (`sport: "horse-racing"`, distinct from F1's `"racing"`) has a hardcoded Triple Crown schedule with **no results/winner feed**. So its Daily Wrap story must be score-agnostic — built from race name + track + Triple Crown leg, never a fabricated winner.

**Why:** there is no API for horse racing results in this app; inventing a winner would be wrong and the wrap design forbids fabricated results.

**How to apply:** wire it in the dailyWrap main-loop fallback chain (`if (!score || !isFinalScore(score))`), gated by `hasConcluded(...)` with a grace period — NOT the `buildEditorial` switch (which only fires on a final score that never arrives). Mirror `schoolsRugbyFallbackEditorial` / `cricketFallbackEditorial`. Event shape: `homeTeam` = race name, `awayTeam` = location ("Track, City ST"); take the track as the segment before the first comma. Frontend renders it cleanly with no extra work — `showScoreCard` needs a truthy score, so a scoreless entry falls through to the headline + provider/detail row.
