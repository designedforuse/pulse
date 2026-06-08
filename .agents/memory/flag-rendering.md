---
name: Flag rendering on event cards
description: How country/team flags are rendered on event cards and where emoji flags intentionally remain.
---

# Flag rendering

Event cards render flags as **images** from the ESPN country CDN, not emoji.

- URL pattern: `https://a.espncdn.com/i/teamlogos/countries/500/{code}.png` where `{code}` is a lowercase FIFA/IOC-style **3-letter** code (e.g. `ita`, `usa`, `gbr`, `mon`, `rsa`, `ksa`, `ned`, `esp`). `countryFlagUrl(code)` in `components/UnifiedEventCard.tsx` builds it.
- **Why 3-letter, not 2-letter:** ESPN's flag CDN 404s on 2-letter ISO codes (`us`, `it`, `gb` all fail). Codes are FIFA/IOC, so a few differ from ISO: Ireland=`irl`, South Africa=`rsa`, Saudi Arabia=`ksa`, Monaco=`mon`, UK/Britain=`gbr`. Always curl-verify a new code returns HTTP 200 before adding it — broken codes show a broken-image box.
- **West Indies is the exception** — not a country (multi-nation cricket team), and its flag lives under the **2-letter** code `wi` (`.../countries/500/wi.png`, verified 200). `win`/`wis`/`windies`/`wnd` all 404.
- **Cricket team flags do NOT use `COUNTRY_CODES`/`getCountryFlagUrl`** (that path is only for intl soccer + tennis). Cricket renders via `<TeamLogo>` → `getTeamLogoUrl()` → the CRICKET map in `utils/teamLogos.ts`, which stores full ESPN country-flag URLs per team. A wrong code there (West Indies was `wnd.png`, a 404) silently falls back to the team-initials monogram. Fix the URL in that map, not in `COUNTRY_CODES`.
- Helpers that return flag **URLs** (not emoji): `getGrandPrixFlag`, `getDriverFlag`, `getWrcRoundInfo().flag`, `getSvnsTeamFlag`, `getSvnsCityFlag`. Callers must render `<Image>`/`<ExpoImage>`, never interpolate into a `<Text>` string.
- `app/(tabs)/watch.tsx` has a local `FlagImg` helper for inline card flags; `lib/svns-context.tsx` builds SVNS flag URLs independently (two flag-URL code paths exist — keep them in sync).
- There are THREE separate two-team card surfaces that each need intl-soccer (FIFA World Cup / International Friendly) country flags wired independently: `UnifiedEventCard`, the Rituals **FeaturedStrip** (`app/(tabs)/rituals.tsx`), and the Watch **Chaos Mode** cards (`app/(tabs)/watch.tsx`, both primary 28px + secondary 18px blocks, via the local `FlagImg` helper). All gate on `event.league === "FIFA World Cup" || "International Friendly"` + `getCountryFlagUrl`. Without it, national teams fall back to `TeamLogo` 2-letter monograms ("PA"/"US"/"JO"/"CO"). Any new flag-bearing sport must be wired in ALL THREE.
- `compactTeamName` (`utils/teams.ts`) has a generic ">12 chars → last word" club-nickname fallback that wrongly truncates country names ("United States" → "States"). Intl-soccer leagues are excluded from it; keep country names exempt from last-word compaction.

**Emoji intentionally kept (these are NOT flags / NOT event cards):**
- Sport glyphs on cards: 🏃 athletics, 🏉 SVNS, 🛶 paddling, 🏁 racing fallback, 🥇 leader.
- Editorial prose in `server/dailyWrap.ts` (Tonight's Story narrative sentences) and static reference screens (`app/racing-101.tsx`, `app/cycling-circuits.tsx`, `app/paddling-101.tsx`, etc.) still use emoji flags inline in text — out of scope for the "event cards" flag unification.
