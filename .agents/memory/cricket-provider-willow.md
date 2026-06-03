---
name: Cricket provider routing (Willow exclusive)
description: Cricket is exclusive to Willow TV; how the three provider surfaces interact and which one actually drives the card.
---

All cricket (every league/region, incl. IPL) is exclusive to **Willow TV**, displayed as `willowtv` and launched via `flosports` (Willow is distributed through FloSports). No cricket routes to ESPN/Disney+.

**Three surfaces, only one drives the card display:**
1. `lib/data.ts` → `resolveCricketBroadcastId(event)` is the **runtime authority** for the card brand + launcher. It returns `["willowtv", "flosports"]` for ALL cricket, **ignoring `event.providerId`**. So fixing this one function corrects the displayed brand for existing/stale data without regeneration.
2. `scripts/updateCricket.ts` (`getProvider()`), `scripts/updateIpl.ts`, AND `scripts/updateIccT20Wc.ts` set the stored `providerId` (all must emit `willowtv`). There are 3 cricket ingestion scripts — easy to miss one (T20 WC was still emitting `youtubetv`). Used by the disabled-provider filter, not card display.
3. `data/generatedEvents.json` → stored `providerId` per event.
4. `lib/providers-context.tsx` → `getEventBroadcasterIds()` has a cricket-first pin (`if sport==='cricket' return ['willowtv']`) so the filter can't drift even if a stored providerId regresses.

**Why this mattered:** previously Caribbean/NZ cricket was stored as `providerId: "disneyplus"`, and `resolveCricketBroadcastId` mapped `disneyplus → ["espn","disneyplus"]`, so those cards showed the ESPN logo. The disabled-provider filter (`getEventBroadcasterIds` in `lib/providers-context.tsx`) keys off `providerId`, so stored value must be `willowtv` too or disabling Disney+ would wrongly hide cricket.

**How to apply:** if cricket broadcaster ever changes again, the display fix is `resolveCricketBroadcastId`; also update the two scripts + regenerate (or patch `generatedEvents.json`) so the filter stays consistent.
