---
name: Flag rendering on event cards
description: How country/team flags are rendered on event cards and where emoji flags intentionally remain.
---

# Flag rendering

Event cards render flags as **images** from the ESPN country CDN, not emoji.

- URL pattern: `https://a.espncdn.com/i/teamlogos/countries/500/{code}.png` where `{code}` is a lowercase FIFA/IOC-style **3-letter** code (e.g. `ita`, `usa`, `gbr`, `mon`, `rsa`, `ksa`, `ned`, `esp`). `countryFlagUrl(code)` in `components/UnifiedEventCard.tsx` builds it.
- **Why 3-letter, not 2-letter:** ESPN's flag CDN 404s on 2-letter ISO codes (`us`, `it`, `gb` all fail). Codes are FIFA/IOC, so a few differ from ISO: Ireland=`irl`, South Africa=`rsa`, Saudi Arabia=`ksa`, Monaco=`mon`, UK/Britain=`gbr`. Always curl-verify a new code returns HTTP 200 before adding it — broken codes show a broken-image box.
- Helpers that return flag **URLs** (not emoji): `getGrandPrixFlag`, `getDriverFlag`, `getWrcRoundInfo().flag`, `getSvnsTeamFlag`, `getSvnsCityFlag`. Callers must render `<Image>`/`<ExpoImage>`, never interpolate into a `<Text>` string.
- `app/(tabs)/watch.tsx` has a local `FlagImg` helper for inline card flags; `lib/svns-context.tsx` builds SVNS flag URLs independently (two flag-URL code paths exist — keep them in sync).

**Emoji intentionally kept (these are NOT flags / NOT event cards):**
- Sport glyphs on cards: 🏃 athletics, 🏉 SVNS, 🛶 paddling, 🏁 racing fallback, 🥇 leader.
- Editorial prose in `server/dailyWrap.ts` (Tonight's Story narrative sentences) and static reference screens (`app/racing-101.tsx`, `app/cycling-circuits.tsx`, `app/paddling-101.tsx`, etc.) still use emoji flags inline in text — out of scope for the "event cards" flag unification.
