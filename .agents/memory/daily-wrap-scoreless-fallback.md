---
name: Daily Wrap scoreless fallback
description: Why concluded games vanish from Daily Wrap when their score feed is down, and the fallback pattern that keeps them visible.
---

# Daily Wrap scoreless fallback

A concluded game silently disappears from the Daily Wrap whenever its
sport's `*Editorial` builder returns `null` — and every score-driven builder
returns `null` when no usable score is present. So if a score feed is
unavailable (e.g. CricAPI daily quota exhausted), the game is dropped at
`if (!editorial) continue`, even though it finished.

**Rule:** reliability-critical sports need a *score-agnostic* fallback branch
inside the `if (!score || !isFinalScore(score))` block (same place as the SA
schools-rugby fallback). The fallback must:
- produce a spoiler-free, non-fabricated headline (past tense, no winner/score —
  e.g. "X and Y met in the 1st ODI");
- be added to `fallbackIds` so highlight enrichment is skipped;
- be gated on an **explicit `endTimeLocal`** (not the generic `start+110min`
  `hasConcluded` heuristic) so long-format matches (cricket Tests) are never
  flagged concluded mid-play, plus a grace buffer for rain delays / long
  finishes.

**Why:** the score builders treat "no score" and "0–0/in-progress" the same
(both → null), and the time-based `hasConcluded` default is far too short for
multi-hour/multi-day sports. Once a real final score later arrives, the normal
score-driven path takes over and replaces the placeholder automatically.

**How to apply:** when a user reports a finished game missing from the wrap,
first check whether its score feed returned data; if not, the game needs (or is
relying on) a scoreless fallback like cricket's / schools-rugby's.
