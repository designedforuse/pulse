# Daily Wrap Headline Generation — Requirements Specification

This document describes how the Pulse app generates the headlines shown (and narrated) on Daily Wrap story cards. It is written as behavioral requirements so the feature can be replicated independently of Pulse's code structure.

---

## 1. Story selection (what gets a headline)

- **Results window:** today (local midnight–midnight) plus a 24-hour look-back, so late-night finishes still appear the next morning.
- **Concluded detection:** an event qualifies as a "result" when its live-score status is final (`final`, `FT`, `ended`, `full time`, `completed`, `F/OT`, `F/SO`, `post`, etc.). Sports without a reliable score feed (cycling stages, WRC, SVNS, schools rugby, athletics) use a time-based fallback: scheduled start + typical duration + a grace buffer (e.g. 90 min for schools rugby, 60 min for cricket).
- **Minimum 5 stories:** if fewer than 5 results exist, fill with **preview cards** from the highest-priority upcoming fixtures in the next 48 hours.
- **Ordering:** each story gets a priority score by sport/competition (e.g. F1 race 100, golf major 90, World Cup soccer 88, tennis Grand Slam 85, SVNS 78, NHL 48, NBA 44, cricket 32, schools rugby 18, generic 15) and stories render highest-first.
- **Dedupe:** preview entries dedupe on the key `sport|league|homeTeam|awayTeam`.

## 2. Headline (`editorial`) vs detail line

Each story carries two text fields:

- **Headline (editorial):** one editorial sentence in a narrative voice, with **no abbreviations** — the same string is read aloud by TTS, so everything must be in natural spoken form.
- **Detail line:** a compact technical line: `League · Score Final`, plus context where relevant — `(OT)`, round name, `Series 3–2`, golf `Round 4 · -12 · Final`, athletics `Diamond League · City · Discipline · Performance · Record`.

## 3. Per-sport headline rules

The core pattern is **margin-aware verb selection**: pick the verb from the size/shape of the result.

### Soccer
- Win by 4+ goals: `{winner} thrashed {loser} 5–1`
- Win by 3: `{winner} swept aside {loser} {ws}–{ls}`
- Win by 1: `{winner} edged {loser} {ws}–{ls}`
- Otherwise: `{winner} beat {loser} {ws}–{ls}`
- 0–0: `{home} and {away} play out a goalless draw`
- High-scoring draw (4+ total goals): `{home} and {away} share {N} goals in a 2–2 draw`
- Other draws: `{home} and {away} draw 1–1`

### Hockey (NHL / AHL / ECHL)
- Shutout: `{winner} blanked {loser} 4–0`
- 1-goal win: `{winner} edged {loser} {ws}–{ls}`
- Win by 4+: `{winner} cruised past {loser} {ws}–{ls}`
- Otherwise: `{winner} beat {loser} {ws}–{ls}`
- Append `in overtime` / `in a shootout` when applicable.
- **Playoff series context** appended from the win counts *as of that game*:
  `to take a 2–1 series lead`, `to level the series`, `to force Game 7`, `to stay alive`, `to win the series 4–1`.

### Rugby (club, international, SVNS)
- 20+ point margin: `{winner} thumped {loser} {ws}–{ls}`
- 13+ margin: `{winner} outclassed {loser} {ws}–{ls}`
- Loser scoreless: `{winner} shut out {loser} {ws}–{ls}`
- Margin ≤ 5: `{winner} edged {loser} {ws}–{ls} by {margin}` (`by a point` when 1)
- Otherwise: `{winner} beat {loser} {ws}–{ls}`
- SVNS tournament finals: `...to win the {city} SVNS`

### Cricket (the exception — feed-text based)
Cricket margins can't be expressed as a scoreline, so the headline reuses the **feed's result text** (e.g. "won by 7 wickets"), with mandatory clean-up:

- **Expand all shorthand to spoken form:** `wkts → wickets`, `wkt → wicket`, `13b rem → 13 balls remaining`, `ovs → overs`, `D/L → Duckworth-Lewis`.
- **Expand truncated team codes** ("SF") to the full team name by matching initials against the fixture's two teams (e.g. `SF won by 7 wkts (13b rem)` → `San Francisco Unicorns won by 7 wickets (13 balls remaining)`).
- League acronyms that are *said* as letters (MLC, IPL) stay as-is.
- **Knockout phrasing:** final → `{winner} are the {competition} champions`; Qualifier 1 → `{winner} storm into the {competition} final`; Qualifier 2 → `{winner} book their place in the final`.
- Fallback when no result text is available: `{away} and {home} met in the {match label}`.

### Racing
- **F1:** `{driver} wins the {Grand Prix name}` — the GP name comes from the event's fixture name, never the generic session title ("Race"). Sprint: `...wins the Sprint at the {GP}`.
- **WRC:** `{driver} wins {rally name}` from the rally's final overall classification.

### Golf
`{player} wins/captures/claims the {tournament} at {score under par}`.

### Tennis (seed- and set-aware)
- Upset (lower-ranked player wins): `{winner} stuns the {N}th seed {loser}`
- Five sets: `{winner} outlasts {loser} in a five-set marathon`
- Two-set comeback: `{winner} fights back from two sets down to beat {loser}`
- Straight sets: `{winner} sees off {loser} in straight sets`

### Athletics (Diamond League)
- Lead with the home-market athlete's result if present: `{athlete} wins the {discipline}` / `takes second in the {discipline}`.
- Otherwise lead with the biggest record of the meet: world record > world-leading performance > meeting win.

### No-feed sports (horse racing, some hardcoded events)
The winner is stored on the schedule itself and rendered directly as the headline.

## 4. Cross-sport special treatments

- **Championship finals:** any final — detected via the event's round name, or via a hardcoded registry of final dates for leagues whose feeds don't tag rounds — appends `...to win the {competition} title` and sets the detail line to `Final`.
- **Score-feed outage fallback:** for sports where the score feed can fail, a concluded game (past its explicit end time + grace) still gets a score-agnostic story rather than silently disappearing from the wrap.

## 5. Preview (look-ahead) headlines

Spoiler-free, venue-aware phrasing for upcoming fixtures used to fill the minimum story count:

- `{home} host {away}` / `{away} visit {home}` / `{away} travel to face {home}`
- Neutral venue: `{away} and {home} square off` / `{away} and {home} clash`
- Individual/session events: `{name} takes center stage` / `All eyes on {name}`
- Detail line shows relative time: `Tomorrow · 7:30 PM`.

---

## Design principle

Each sport has its own editorial voice, but **every headline must read as a natural spoken sentence** — full team names, no shorthand, margin-appropriate verbs — because the same string drives both the on-screen display and the audio narration.
