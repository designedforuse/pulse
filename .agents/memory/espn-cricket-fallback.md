---
name: ESPN cricket score fallback
description: How concluded cricket scores are recovered when CricAPI quota is exhausted, and the ESPN cricket API's quirks.
---

When CricAPI's shared free quota is exhausted, concluded cricket matches lose their
final score and the Daily Wrap degrades to a score-agnostic card. The fallback is
ESPN's public **keyless** cricket scoreboard (same `site.api.espn.com` source used
for other sports), tried only on the failure path for concluded events.

**Why ESPN, not another paid/consumer API:** ESPNcricinfo's consumer API is
Cloudflare-403 (dead); RAPIDAPI has no cricket subscription. ESPN site.api works,
needs no key, and is already a trusted source in the codebase.

ESPN cricket API quirks (these cost real discovery time — keep them):
- `cricket/{leagueId}/scoreboard?dates=YYYYMMDD` needs an **exact** day. Date
  **ranges return nothing**. Probe the UTC day ±1 for local/UTC drift.
- Each competition is a **distinct numeric league id**. Marquee comps are stable:
  IPL 8048, Big Bash 8044, MLC 21266, Sheffield Shield 8043, County Champ Div1 8052.
- **Bilateral series use rotating high ids (22000+) that change every season** —
  not hardcodable. Resolve them dynamically via ESPN search
  (`site.web.api.espn.com/apis/search/v2?query=…&sport=cricket`): the search result's
  `uid` carries `s:200~l:<numericId>`. GUIDs from search do NOT work on the scoreboard.
- Completed match = `competition.status.type.state === "post"`; human result is in
  `competition.status.summary` ("Scorchers won by 6 wkts"); innings totals in
  `competitor.score`; winner flagged by `competitor.winner === true`.

**How to apply:** emit a ScoreData shaped like CricAPI result rows (status "final",
result phrase in `period`, innings in cricketHome/cricketAway) so it flows through the
normal cricket editorial path. To add a new marquee comp, prefer adding its numeric id
to the static map; everything else relies on search resolution. Cache positives long,
negatives briefly (a transient search miss must not blank a comp for half a day).
