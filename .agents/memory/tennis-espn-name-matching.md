---
name: Tennis ESPN tournament name matching
description: ESPN uses sponsor names for tennis events; matching must be alias-first with generic-word stopwords or fixtures bind to the wrong tournament.
---

**Rule:** ESPN's ATP scoreboard names tournaments by sponsor ("National Bank Open presented by Rogers" = Canadian Open, "Western & Southern" = Cincinnati). `matchEspnEventToTournament` in the tennis updater must match per-tournament `aliases` first, then keyword overlap with generic words ("open", "masters", etc.) excluded.

**Why:** Bare keyword overlap once matched "National Bank **Open**" to "Australian **Open**", silently dropping all 106 real ESPN matches and serving synthetic fallback fixtures instead. Conversely, the stopword filter alone strips "US Open" to nothing — tournaments whose only distinctive word is generic (US Open, Monte Carlo hyphenation) need explicit aliases.

**How to apply:** When adding a tennis tournament, always add `aliases` covering its current sponsor name and common spellings. Watch the pipeline log line "Tennis ESPN: <espn name> → <matched tournament>" to verify binding; "No tournament match" or a wrong arrow means an alias is missing.
