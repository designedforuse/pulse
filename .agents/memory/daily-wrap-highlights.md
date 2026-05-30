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
mismatch risk. A perfect per-game match is not guaranteed. Per-search fetches
must use AbortController so timed-out scrapes are actually cancelled.

**Fallback ladder when no qualifying clip exists:** the scrape also returns a
still `imageUrl` — a relevant recent thumbnail (real action photo) — surfaced as
`fallbackImageUrl` only when there's no video. The card then renders that image
with a Ken Burns pan/zoom (transform-only Animated loop, native driver) behind
the headline. Only when *neither* a clip nor an image is found does it fall back
to the plain sport gradient + "Watch the replay". The paged feed must keep
FlatList virtualization tight (small windowSize) so many Ken Burns loops don't
all animate at once.
