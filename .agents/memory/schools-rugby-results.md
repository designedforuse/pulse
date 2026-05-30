---
name: SA Schools Rugby results source
description: How Paarl Boys' High completed-game scores are sourced (scrape) and matched back to fixtures, since the league has no score API.
---

# SA Schools Rugby = scraped results, matched by date

SA Schools Rugby is schedule-only (hardcoded fixtures, filtered to Paarl Boys'
High). There is no score API, so completed games never appeared in Daily Wrap
(which needs a final score per event). Scores come from scraping the school's own
results page: `schoolrugby.co.za/school.aspx?s=<schoolId>`, where Paarl = **s=456**.
The page's "Latest Results" tiles carry date + matchup; the `<strong>`-wrapped
score is the winner's (no `<strong>` on either side = draw).

**Matching is by DATE, not team names.** Every tracked fixture involves Paarl, and
a school plays at most once per date, so date is the strong key. We compare the
fixture's UTC date AND its SAST (UTC+2) date against the printed (SAST) date.
Opponent-token overlap is used ONLY to disambiguate when 2+ results share a date
(festival days / multiple grades); if that doesn't narrow to exactly one, we skip
rather than risk a wrong score.

**Why this shape:**
- Scores only surface in Daily Wrap for ~18h after kickoff — the schools live-score
  window is the default 18h lookback in `loadLiveEventIds`, shorter than Daily Wrap's
  own 24h. That's intentional/acceptable (wrap is same-day).
- The schools league flows into the rugby Map (id starts `rugby-`); existing
  ESPN/Pulselive rugby fetchers ignore it (not in their league-path maps), so it's
  safe to keep it in that bucket and handle it with its own fetcher.

**How to apply:** to add another school later, register its `s=` id; the parser and
date-matching are school-agnostic. Source is plain HTTP and scrape-fragile (markup
shape) — expect occasional misses; treat as best-effort, never authoritative.
