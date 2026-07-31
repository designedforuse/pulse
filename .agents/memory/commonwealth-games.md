---
name: Commonwealth Games (Glasgow 2026) sources
description: Keyless Pulselive schedule/results API for CWG athletics & swimming, and how SA-first wrap cards work.
---

- **Keyless Pulselive API** discovered from glasgow2026.com widget code (base + competition UUID in `scripts/updateCommonwealthGames.ts`):
  - `{BASE}/sessions?disciplineCodes=ATH|SWM&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` → sessions with UTC start/end, `medalType` ("GOLD" = finals session) and `sessionEventPhases` (phaseCode `FNL-` = final, `VICT` = ceremony, `SFNL` = semis).
  - `{BASE}/session/{sessionId}/details?eventCode=..&phaseCode=..&genderCode=..&disciplineCode=..` → per-final `phaseResults[].inline.athleteResult[]` with `organisationCode` (RSA), string `rank`, `result`, `compositionAthletes` (givenName/familyName), `indicators[].recordType` (GR/AF/OC/NR/PB/SB…). **All four query params are required** — the bare details URL 400s.
- Events are one card per session (`athletics-cwg-{ath|swm}-{sessionUuid}`), sport "athletics", league "Commonwealth Games"; the session UUID in the id is how the wrap finds results. Daily Wrap only cards **finals sessions** (roundLabel "Finals"), leads with best RSA result (medal wording), else most newsworthy winner; PB/SB are noise — only WR/GR/CR/area/NR count as major records.
- providerId `supersport` (SuperSport, web launch via Chrome) was added per the 4-surface provider checklist.
- **Why:** user wants SA athletes highlighted, mirroring the Diamond League score-agnostic pattern.
- **How to apply:** the same Pulselive shape powers future Commonwealth events (youth games etc.) — only base host + competition UUID change; grab them from the site's main.js env config + `window.COMPETITION_ID`.
