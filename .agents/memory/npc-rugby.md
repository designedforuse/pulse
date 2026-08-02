---
name: NZ NPC rugby sources
description: ESPN keyless feed for NZ provincial championship (NPC) fixtures/scores; logo gaps.
---

- NPC fixtures + live/final scores come from the keyless ESPN rugby feed, league id **270563** — ESPN still labels it "Mitre 10 Cup" but it is the current Bunnings NPC. Same date-range scoreboard shape as Test Rugby (289234): `?dates=YYYYMMDD-YYYYMMDD`, and `?dates=YYYY` returns the whole season.
- Team logos: `a.espncdn.com/i/teamlogos/rugby/teams/500/{teamId}.png` exists for most unions but **404s for Canterbury, Manawatu, Northland, Otago, Wellington** (curl-verified Aug 2026); those intentionally fall back to the initials badge. The `team.logo` field in the scoreboard payload is unreliable (returns country flags like `can.png` for Canterbury) — never use it directly.
- providerId is `rugbypasstv` (NPC streams internationally on RugbyPass TV).
- **How to apply:** if logo gaps annoy the user, find non-ESPN sources for those five unions; re-check the ESPN URLs first — they may appear later.
