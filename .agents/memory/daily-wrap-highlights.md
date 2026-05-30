---
name: Daily Wrap highlight videos
description: How highlight clips are sourced for Daily Wrap story cards and why selection must be gated.
---

Daily Wrap story cards (the TikTok-style full feed) attach a YouTube highlights
clip per result via a **no-key HTML scrape** of `youtube.com/results` (same
technique as the Explore narratives video search). Results are cached on disk by
eventId; misses run in parallel and the `/api/daily-wrap` response is awaited on
them (one-time cold-cache latency).

**Why selection must be gated:** ranking by trusted-channel + recency alone
surfaces the wrong content — multi-hour live streams (no `lengthText`), full
replays, press conferences, interviews, and zero-duration entries all out-rank
real highlight clips. Gate every candidate: require a parseable duration within a
short-form window, reject non-highlight title classes (press conference, presser,
reaction, interview, preview, live/full replay…), and prefer titles that actually
read as highlights/recap.

**How to apply:** this is best-effort sourcing — the user accepted spoiler +
mismatch risk. A perfect per-game match is not guaranteed; when no good clip is
found the card falls back to the spoiler-safe gradient + headline + "Watch the
replay". Per-search fetches must use AbortController so timed-out scrapes are
actually cancelled, not left running.
