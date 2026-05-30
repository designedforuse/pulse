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

**Card backgrounds = bundled per-sport stock photos, NOT YouTube thumbnails.**
The Ken Burns background behind each story headline is a bundled, license-free
action photo chosen from `lib/sport-backdrops.ts` (3 photos per sport for the 7
editorial sports: tennis, hockey, rugby, soccer, basketball, racing, golf). One
is picked deterministically by hashing `eventId` so same-sport cards vary but
stay stable across re-renders. Unmapped sport → returns null → plain sport
gradient fallback. **Why:** YouTube highlight thumbnails are text/graphic-heavy
("HIGHLIGHTS", scorebugs, channel branding) and looked cluttered as full-bleed
backgrounds; ESPN exposes only team *logos*, and we don't store per-game ESPN
ids, so real per-game action shots aren't feasible. Generic clean stock action
shots (no overlaid copy) were the chosen tradeoff — not the actual game. Ken
Burns is a transform-only Animated loop (native driver); keep FlatList
virtualization tight (small windowSize) so many loops don't animate at once.

**The highlight clip is now link-only.** A found `video` still drives the CTA
(clip → "Watch highlights" via `video.url`, no clip → "Watch the replay"). The
backend no longer HEAD-probes for high-res thumbnails and no longer computes a
fallback still image; `video.thumbnailUrl` is kept as a cheap hqdefault URL (no
network) purely for type compatibility / future use, and `fallbackImageUrl` was
removed entirely. Legacy on-disk cache entries may still carry old `imageUrl` /
`maxresdefault` values — harmless extra keys, ignored on read.
