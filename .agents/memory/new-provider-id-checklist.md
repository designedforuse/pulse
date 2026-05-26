---
name: New providerId checklist
description: All the places a new providerId (e.g. youtube, paramount+, mlbtv) has to be wired before event cards and launching work end-to-end.
---

Adding a brand-new `providerId` requires updating 4 surfaces. Missing any of them produces silent failures (no logo, no launch, no filter), not a crash, so it's easy to ship a half-broken integration.

**Required surfaces:**
1. `lib/data.ts` → `BROADCASTER_IDS` set — without this, `resolveProviderDisplay` returns `brandId: ""` and the card's provider badge disappears.
2. `lib/data.ts` → `PROVIDER_DISPLAY_NAMES` — controls the human label shown on cards/sheets.
3. `data/masterGuide.json` → `providers[]` array entry (id, name, packageName/launchUrl) — without this, `getProviderById` returns undefined and the "Watch on …" button no-ops on press.
4. `lib/providers-context.tsx` → both `PROVIDER_LIST` (Settings toggle) AND the `getEventBroadcasterIds` switch (so disabled-provider filtering matches events).

Plus per-surface UI as needed: `components/ProviderLogo.tsx` (logo asset or `PROVIDER_TEXT_LABELS` fallback), and any sport-specific branch in `resolveProviderDisplay` if the providerId needs custom display vs. launch routing (e.g. broadcaster X via launcher Y).

**Why:** the provider system is split across a static registry (masterGuide.json), a runtime resolver (lib/data.ts), and a user-prefs filter (providers-context). They're decoupled on purpose — a card can show one brand but launch another — but it means there's no single chokepoint that fails loudly when a new id is added in only one place.

**How to apply:** when a hardcoded schedule script introduces a new `providerId`, grep for an existing analogous id (e.g. `flosports`) across the repo before declaring done; you should see hits in all 4 surfaces above. If any surface is missing, the integration is incomplete.
