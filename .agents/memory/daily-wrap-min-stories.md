---
name: Daily Wrap minimum stories
description: The rule that Daily Wrap always shows at least 5 stories and how the shortfall is filled.
---

# Daily Wrap minimum stories

The Daily Wrap feed must always show **at least 5 stories**. Concluded results
from the past-24h lookback fill the feed first; if there are fewer than 5, the
remainder is topped up with **look-ahead preview cards** drawn from the
highest-weighted upcoming fixtures in a **48h look-ahead window**.

Look-ahead entries:
- ranked by `getPriorityScore` (desc), soonest-start as tie-break;
- deduped by `sport|league|home|away` and exclude anything already in the wrap;
- carry an `isLookAhead` flag; ordered AFTER all concluded results (frontend
  `tagEntries` enforces concluded-favorites → concluded-others → look-ahead);
- are spoiler-free by construction: no score, no replay/highlights, an
  anticipatory headline + "COMING UP" pill + "View matchup" CTA.

**Why:** an empty or thin wrap (e.g. a quiet sports day, or a day where score
feeds are down) looked broken; the minimum guarantees the feature always has
content.

**How to apply:** look-ahead headlines come from `lookAheadEditorial` — keep
them anticipatory and NEVER imply a result (these are unplayed games). Venue
sports get host/visit verbs; individual/neutral sports use "A and B <verb>"
(plural subject avoids tennis "X meet Y" agreement errors); tournament/session
events get spotlight framing. Template pick is hashed from event id so it's
stable across refreshes.
