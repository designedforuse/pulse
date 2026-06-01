---
name: Hockey playoff series context
description: How AHL/ECHL/NHL playoff games get series-context phrases (e.g. "to stay alive") in the Daily Wrap.
---

# Hockey playoff series context

Playoff hockey results in the Daily Wrap carry a series phrase (clinch / level / force decider / stay alive / take a lead) plus a seed-agnostic "Series H–L" detail.

## Sources & shape
- **NHL**: api-web series fetch already exposes seriesStatus (top/bottom seed wins, neededToWin).
- **AHL & ECHL**: come from the shared HockeyTech `view=brackets` feed (no per-game series field). We derive it ourselves.

## As-of algorithm (the non-obvious part)
A SeriesStatus is keyed per game and must reflect the state **as of (and including) that game**, not the final series result.
- Sort a matchup's concluded games (status "4") by date, count cumulative wins up to each one.
- `neededToWin = max(max(finalW1, finalW2), floor(games.length/2)+1)`. The `games` array includes unplayed "if necessary" games while a series is active (best-of-7 lists 7), so length/2 alone is robust; the max() with actual wins covers series that ended early (length shrinks). Handles best-of-5 (AHL → 3) and best-of-7 (ECHL → 4) without hardcoding.
- Attribute each game's as-of wins to that game's **winner/loser** (`lastGameWinnerWins`/`lastGameLoserWins`).

**Why winner-relative fields exist:** without knowing who won the keyed game, a "3–2" lead is ambiguous (took the lead vs. cut a deficit). The seed-agnostic phrase fallback therefore only claims unambiguous outcomes (clinch / level / force decider). When `lastGameWinnerWins`+`lastGameLoserWins` are present, the phrase function can say "to stay alive" (opponent was at need−1) or "to take a W–L series lead".

**How to apply:** the winner-aware branch in `hockeySeriesPhrase` activates ONLY when both winner-relative fields are set, so NHL (which may not set them for upcoming games) keeps its existing seed-agnostic behavior — no regression. Frontend cards already render series for ANY hockey event via getSeriesStatus, so populating AHL/ECHL data also lights up live-card series labels for free.
