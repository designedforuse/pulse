import type { ImageSourcePropType } from "react-native";

// Bundled, copy-free stock action photos used as Ken Burns backgrounds on the
// Daily Wrap story cards. Replaces text-heavy YouTube thumbnails. Only the
// sports that get editorial Daily Wrap cards are mapped here.
const BACKDROPS: Record<string, ImageSourcePropType[]> = {
  tennis: [
    require("@/assets/images/sportBackdrops/tennis-1.jpg"),
    require("@/assets/images/sportBackdrops/tennis-2.jpg"),
    require("@/assets/images/sportBackdrops/tennis-3.jpg"),
  ],
  hockey: [
    require("@/assets/images/sportBackdrops/hockey-1.jpg"),
    require("@/assets/images/sportBackdrops/hockey-2.jpg"),
    require("@/assets/images/sportBackdrops/hockey-3.jpg"),
  ],
  cricket: [
    require("@/assets/images/sportBackdrops/cricket-1.jpg"),
    require("@/assets/images/sportBackdrops/cricket-2.jpg"),
    require("@/assets/images/sportBackdrops/cricket-3.jpg"),
  ],
  rugby: [
    require("@/assets/images/sportBackdrops/rugby-1.jpg"),
    require("@/assets/images/sportBackdrops/rugby-2.jpg"),
    require("@/assets/images/sportBackdrops/rugby-3.jpg"),
  ],
  soccer: [
    require("@/assets/images/sportBackdrops/soccer-1.jpg"),
    require("@/assets/images/sportBackdrops/soccer-2.jpg"),
    require("@/assets/images/sportBackdrops/soccer-3.jpg"),
  ],
  basketball: [
    require("@/assets/images/sportBackdrops/basketball-1.jpg"),
    require("@/assets/images/sportBackdrops/basketball-2.jpg"),
    require("@/assets/images/sportBackdrops/basketball-3.jpg"),
  ],
  // Default "racing" pool is Formula 1 (open-wheel). WRC rallies share the same
  // `sport: "racing"` but are routed to a dedicated rally pool below by eventId.
  racing: [
    require("@/assets/images/sportBackdrops/f1-1.png"),
    require("@/assets/images/sportBackdrops/f1-2.png"),
    require("@/assets/images/sportBackdrops/f1-3.png"),
  ],
  "horse-racing": [
    require("@/assets/images/sportBackdrops/horse-racing-1.png"),
    require("@/assets/images/sportBackdrops/horse-racing-2.png"),
    require("@/assets/images/sportBackdrops/horse-racing-3.png"),
  ],
  golf: [
    require("@/assets/images/sportBackdrops/golf-1.jpg"),
    require("@/assets/images/sportBackdrops/golf-2.jpg"),
    require("@/assets/images/sportBackdrops/golf-3.jpg"),
  ],
  athletics: [
    require("@/assets/images/sportBackdrops/athletics-1.png"),
    require("@/assets/images/sportBackdrops/athletics-2.png"),
    require("@/assets/images/sportBackdrops/athletics-3.png"),
  ],
  cycling: [
    require("@/assets/images/sportBackdrops/cycling-1.png"),
    require("@/assets/images/sportBackdrops/cycling-2.png"),
    require("@/assets/images/sportBackdrops/cycling-3.png"),
  ],
};

// Dedicated backdrop for the SA Schools (Paarl Boys' High) Daily Wrap story,
// keyed off its stable eventId prefix so it overrides the generic rugby pool.
const PBHS_EVENT_PREFIX = "rugby-schools-";
const PBHS_BACKDROP: ImageSourcePropType = require("@/assets/images/sportBackdrops/pbhs-1.jpg");

// WRC rallies use `sport: "racing"` but must show rally cars, not F1. Their
// eventIds are prefixed "racing-wrc-", so route them to a dedicated rally pool.
const WRC_EVENT_PREFIX = "racing-wrc-";
const WRC_BACKDROPS: ImageSourcePropType[] = [
  require("@/assets/images/sportBackdrops/wrc-1.png"),
  require("@/assets/images/sportBackdrops/wrc-2.png"),
  require("@/assets/images/sportBackdrops/wrc-3.png"),
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministically pick one backdrop for a sport, seeded by a stable string
 * (e.g. the eventId) so multiple same-sport cards get visual variety but each
 * card stays stable across re-renders. Returns null for unmapped sports so the
 * caller can fall back to a gradient.
 */
export function getSportBackdrop(
  sport: string | undefined,
  seed: string
): ImageSourcePropType | null {
  if (seed.startsWith(PBHS_EVENT_PREFIX)) return PBHS_BACKDROP;
  if (seed.startsWith(WRC_EVENT_PREFIX)) {
    return WRC_BACKDROPS[hashString(seed) % WRC_BACKDROPS.length];
  }
  const key = (sport || "").toLowerCase();
  const pool = BACKDROPS[key];
  if (!pool || pool.length === 0) return null;
  return pool[hashString(seed) % pool.length];
}
