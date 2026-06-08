---
name: ESPN keyless cricket FIXTURES (schedule), not just scores
description: How to pull upcoming cricket fixtures from ESPN's keyless API so the schedule no longer depends on CricAPI quota.
---

# ESPN keyless cricket fixtures (decoupled from CricAPI scores)

CricAPI's free tier (100 hits/day, shared dev+prod) kept exhausting and breaking the
**schedule**. Fix: pull cricket **fixtures** from ESPN's keyless `site.api.espn.com`
(the same source already trusted for concluded-score fallback) and reserve CricAPI for
**live scores only**. The live-score path binds CricAPI `cricScore` rows to events by
**team-name** match (not just `cricketMatchId`), so ESPN fixtures with no CricAPI id
still get live scores. ESPN concluded-score fallback also binds by team+date.

## ESPN fixture enumeration (verified behaviors)
- **No global cricket scoreboard** — must use a per-league numeric id. Generic
  `cricket/scoreboard` returns 0.
- **`cricket/{leagueId}/scoreboard?dates=<YEAR>` returns the WHOLE season** in one call
  (e.g. a tour → all 6 matches, MLC → 34). Date *ranges* (`YYYYMMDD-YYYYMMDD`) still
  return 0; single day works too. So enumerate one call per league with `?dates=YYYY`.
- Default scoreboard (no date) returns only the **next** match, plus
  `leagues[0].calendar` (array of exact match start-date ISO strings) and
  `calendarStartDate`/`calendarEndDate` — useful but the year-query is simpler.
- **Discovery of current bilateral series:** ESPN search
  `site.web.api.espn.com/apis/search/v2?query=<q>&sport=cricket` returns
  `type:"league"` results named "X tour of Y 2026" / "X in Y 2026/27" with `uid`
  carrying `…l:<numericId>`. Search each Full-Member nation + "tour of <year>", collect
  ids, then **filter discovered league names by current/next year** to drop historicals
  before fetching their season scoreboard (cuts ~50 ids → ~15).

## Event field mapping
ESPN event: `event.date` (ISO+Z), `competitions[0].competitors[].team.displayName` +
`homeAway`, `competitions[0].status.type.state` (pre/in/post), `leagues[0].name` = the
series name ("Australia tour of Bangladesh 2026"), `leagues[0].slug` = league id.

## Format (Test/ODI/T20) is NOT in the season scoreboard
Season events are bare ("Bangladesh v Australia", empty notes). Format lives in the
**summary** endpoint `cricket/{leagueId}/summary?event=<id>` → `notes[]` with
`{type:"matchnumber", text:"ODI no. 4974"}` (also "Test no. …"/"T20I no. …") and
`{type:"matchdays", text:"… (50-over match)"}` (50-over=ODI, 20-over=T20, multi-day=Test).
One extra keyless call per windowed fixture. Format matters for Test day-splitting +
live-window duration; getting it wrong only degrades gracefully (no day-split, shorter
window) — teams/date still render. Default unknown → t20-length when summary fails.

## Implementation decisions (the non-obvious choices)
- Adapt each ESPN event into the existing CricApiMatch shape and reuse the existing
  classify→filter→map→Test-split pipeline rather than writing a parallel one. Build the
  synthetic match name as `"<away> vs <home>, <seriesName>"` because series parsing keeps
  everything after the first comma.
- **Keep the ESPN event id as `cricketMatchId`** (do NOT null it). It's a stable keyless
  identity across runs, so the merge can supersede an older representation when a Test
  gains/loses its day-split (format lookups are best-effort and can transiently fail). It
  never equals a CricAPI cricScore id (numeric vs uuid), so live scores still bind by team
  name — keeping it is harmless and strictly better than dropping it.
- Tag `source:"cricket-espn"` but keep the `cricket-` id prefix so existing retention/merge
  apply unchanged.
- **Cutover must be conditional:** only drop cached `source==="cricket-cricapi"` fixtures
  when the fresh fetch returned >0 events; otherwise an ESPN+CricAPI dual outage would wipe
  cricket from the schedule entirely. Drop avoids duplicate cards from near-but-not-exact
  start times once ESPN is authoritative.
- Keep CricAPI fixture fetch only as a zero-result fallback. IPL is still sourced
  separately from iplt20.com — skip it here.
