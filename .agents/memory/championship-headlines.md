---
name: Championship context in Daily Wrap headlines
description: Why finals get "...to win the title" copy, and how to add a new final.
---

Title-decider games get extra editorial weight in the Daily Wrap: a routine "X beat Y N–M" result becomes "X beat Y N–M to win the {competition} title" and the detail line gains "Final".

**Why:** a championship result should not read like a routine fixture. The user asked for this after a Japan League One final showed only a plain scoreline.

**How to apply (maintenance):** the rule lives in `server/dailyWrap.ts` (`getChampionshipContext` / `applyChampionshipContext`, run inside `buildEditorial`). A final is detected from a generic `roundName`/`stage` field OR a hardcoded `CHAMPIONSHIP_FINALS` registry for sources with no round info (e.g. the Japan League One scrape).
- To flag a final from an untagged source, add one registry entry: leagueKey, calendar-year season (UTC string), the two team names exactly as in generatedEvents.json, and the competition label. Works on live data immediately — no schedule regeneration.
- Pitfall: "final" is not always a title decider. Conference/division finals and the NCAA "Final Four" are explicitly excluded; if a new competition uses "final" for a non-decider round, extend the exclusion list rather than the match list.
