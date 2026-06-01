---
name: Diamond League results in Daily Wrap
description: How athletics Diamond League meets get results into the Daily Wrap, and the SA-first headline rule.
---

# Diamond League results (Daily Wrap)

Athletics has **no entry in the keyed live-scores map**, so Diamond League meets are surfaced via a score-agnostic fallback (same shape as the cycling/SVNS/schools fallbacks), not the normal scored path.

**Results feed (no key):** Swiss Timing archive that powers diamondleague.com live results.
- Base `https://ath-wdl-archive.azureedge.net`
- `{base}/{season}/meetings.json` → `{ JsonNames: ["shanghai","rabat",...] }` (meeting keys)
- `{base}/{season}/{meeting}.json` → per-discipline results: `Data.ResultData[code]={Name,Gender,IsDiamondRace,Data[heat]={Info,Results:[{Athlete,Firstname,Lastname,Nation(IOC e.g. RSA),Rank,BestPerformance,RecordFlag}]}}`. RecordFlag tokens: WR/WL/AR/NR/MR/SB/PB.

**Headline rule (this is the product decision):** lead with the best South African (Nation `RSA`) result if any exists (🇿🇦 + best finish); otherwise the most newsworthy outcome by priority **WR > WL > AR > NR > MR > marquee win**. Non-SA names show a parenthetical IOC code; SA uses the 🇿🇦 literal.
**Why:** user is South African and follows SA athletes; the wrap should never drop a Diamond League leg, and should foreground SA storylines when present.

**Meeting-key / dedupe gotcha:** event ids are `athletics-diamond-league-{city}-{year}`, but a meet can span multiple events (e.g. `brussels-final-day-1` / `day-2`) while the feed returns ONE combined file per city. Map id→meeting via the leading city token, and keep only the **latest concluded event per `season/meeting`** so the meet contributes a single card (mirrors the cycling latest-stage dedupe).
