---
name: Currie Cup & international test rugby sources
description: Where Currie Cup and tier-1 test fixtures come from and the maintenance they need.
---

- **Currie Cup has no usable feed.** ESPN's Currie Cup league id (270555) is stale (last data 2022); rugbyfixture.io has no ics. The season schedule is hardcoded in `scripts/updateRugby.ts` (`CURRIE_CUP_SCHEDULE`, SAST wall-clock → UTC via wallClockToUtc/Africa-Johannesburg). Some kickoff times are TBC (default 15:00 SAST) — refresh from Wikipedia "2026 Currie Cup Premier Division" as rounds firm up, and **add semi-final/final fixtures when announced** (only rounds 1–7 are in).
- **International tests DO have a keyless ESPN feed**: league id **289234** ("International Test Match"), supports `?dates=YYYYMMDD-YYYYMMDD` range queries. Filtered to matches involving a tier-1 nation.
- Broadcast: Currie Cup + SANZAAR-involved tests display AND launch via `rugbypasstv` (launches web tv.rugbypass.com via Chrome, no native package). Non-SANZAAR tier-1 tests intentionally resolve to no provider.
- **Why:** octafield showed wrong Currie Cup round dates; Wikipedia matched actual played results — trust Wikipedia for this competition.
- **Team names & logos (user preference):** URC franchises in the Currie Cup use their plain URC names (Sharks, Bulls, Stormers, Lions — NOT "Sharks XV"/"Bulls XV"/"Stormers XXIII") and ESPN URC logos; non-URC sides (Griquas, Pumas, Cheetahs, Boland Cavaliers) keep SA Rugby match-centre CDN logos (mobiithumbnails, GUID per team). Mapped in the `Currie Cup` branch of `utils/teamLogos.ts`. Note: renaming teams changes generated event ids, leaving stale duplicates in generatedEvents.json that must be pruned manually.
- **Gotcha:** new leagues must also be added to the `masterGuide.json` pack `leagues` arrays (rugby_morning/rugby_night) or pack-level filtering hides every event even when chips/providers are wired.
