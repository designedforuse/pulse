---
name: Schools effective-sport consolidation
description: How the 3 "Schools" leagues (which span 3 real sports) are collapsed into one filter/chip identity across every event surface.
---

# Schools = effective sport "college"

Three leagues live under the Settings "Schools" sport pack but each has a different
*real* `sport`: NCAAB (`basketball`/`ncaab`), NCAA Hockey (`hockey`/`ncaa-hockey`),
SA Schools Rugby (`rugby`/`schools-rugby`). They must read as ONE group everywhere:
a single grey ("college" = `#9AA0A6`) "Schools" league chip, controlled ONLY by the
Schools master toggle + their per-league toggles under that group.

**Mechanism:** `getEffectiveSport(sport, league?, leagueKey?)` in `lib/data.ts` returns
`"college"` for these leagues (detected via `isSchoolsLeague`); otherwise returns the
real sport. `getSportColor("college")` is grey. The favorites-context league key is
`` `${sport}::${league}` `` so the college-group toggles produce `college::NCAAB` etc.

**Why:** keep each event's *real* sport for layout/logos/live-scores, but collapse to
`college` only for (a) visibility filtering and (b) the card chip/color, so disabling
the underlying sport (e.g. basketball) does NOT hide schools events and vice-versa.

**How to apply — every surface that filters `disabledSports`/`disabledLeagues` or
renders a league chip/color MUST use the effective sport, not raw `event.sport`:**
- Filters: watch (main list + Up Next chips), live, rituals, guide (More Games
  chips + sheet), narrative, and mode/[id] pack events all key
  `disabledSports.has(...)` on `getEffectiveSport(e.sport, e.league, e.leagueKey)`.
- In-view sport-chip pipelines (watch Up Next, guide More Games) build chips keyed
  by effective sport with a `"college" -> "Schools"` label override.
- Chip label: show "Schools" when `isSchoolsLeague(...)` (UnifiedEventCard.getLeagueLabel,
  watch ChaosCard pills, live EventRow, CatchUpCard, event-sheet, narrative row).
- Color: `getSportColor(getEffectiveSport(...))`.
- `index.tsx` month-snapshot uses leagueKey (no league-name field on those types).
- **Partial gap in `app/mode/[id].tsx`:** it now drops pack events via effective sport so
  the Schools toggle hides schools events. BUT it still removes a whole pack when
  `pack.sport` is disabled, so disabling the underlying sport (e.g. rugby) also hides
  schools events inside that curated pack. Fully fixing needs the pack model to filter
  events instead of dropping packs — left as a deliberate exception.

If you add a new schools-type league, register it in `SCHOOLS_LEAGUE_NAMES` /
`SCHOOLS_LEAGUE_KEYS` and add it to the `college` array in settings `sportLeagues`.
