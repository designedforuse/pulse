---
name: F1 vs WRC backdrops & F1 headline
description: Why F1 and WRC need separate Daily Wrap backdrops despite sharing sport "racing", and how the F1 headline names the GP.
---

F1 and WRC both use `sport: "racing"`, so a single sport-keyed backdrop pool would put rally cars on F1 stories (and vice versa).

**Why:** the sport key collides. The fix splits by stable eventId prefix, not sport: WRC events are prefixed `racing-wrc-` and route to a dedicated rally pool; the default `racing` pool is F1 (open-wheel). Mirrors the existing PBHS prefix override.

**How to apply:** in `lib/sport-backdrops.ts`, prefix overrides run before the sport lookup in `getSportBackdrop`. Routing is prefix-only, so if a future WRC source emits a non-`racing-wrc-` id it will fall back to F1 images — keep WRC ids prefixed.

F1 headline: `racingEditorial` builds "{driver} wins the {GP}". `event.homeTeam` is the GP name (e.g. "Monaco Grand Prix"); `event.sessionTitle` is just the session ("Race"/"Sprint") and must NOT be used as the race name (produces "wins the Race"). Guard against a generic/empty homeTeam by falling back to "the Grand Prix".
