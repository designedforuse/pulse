---
name: MLC team logos
description: Where Major League Cricket club logos come from and why the MLC branch must precede the cricket-flags branch
---

MLC events have `league: "MLC"`, `sport: "cricket"`. Without a club-logo map they fall back to 2-letter monograms.

**Source:** majorleaguecricket.com is a JS-rendered Angular SPA — curling the page yields no logos. The fixtures/team data is served from an Azure blob "match center" feed (discovered by reading the `main.[hash].js` bundle):
- Team list (names + logo URLs): `https://splcms.blob.core.windows.net/cricketnest/client_1/mlc_match_center/TeamList/<competitionId>-TeamList.json` (each team's `TeamImage` field is the logo URL, e.g. `.../1_association/teams/<teamId>.png`).
- competitionId changes per season (saw 1210 older, 1436 current); to refresh logos for a new season, refetch the latest TeamList JSON and update the `TeamID`→png mapping.

**Gotcha (resolver ordering):** in `utils/teamLogos.ts` `getTeamLogoUrl`, the cricket branch `if (sportLower === "cricket" || league === "ICC") return CRICKET_COUNTRY_FLAGS[...]` would otherwise swallow MLC teams and return null (no country match). The `if (league === "MLC")` branch MUST come before it — same pattern already used for `league === "IPL"`.

**Why:** the user asked for official club logos, not country flags; club leagues (IPL, MLC) need a dedicated branch ahead of the generic cricket-country-flag lookup.
