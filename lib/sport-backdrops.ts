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
  racing: [
    require("@/assets/images/sportBackdrops/racing-1.jpg"),
    require("@/assets/images/sportBackdrops/racing-2.jpg"),
    require("@/assets/images/sportBackdrops/racing-3.jpg"),
  ],
  golf: [
    require("@/assets/images/sportBackdrops/golf-1.jpg"),
    require("@/assets/images/sportBackdrops/golf-2.jpg"),
    require("@/assets/images/sportBackdrops/golf-3.jpg"),
  ],
};

// Dedicated backdrop for the SA Schools (Paarl Boys' High) Daily Wrap story,
// keyed off its stable eventId prefix so it overrides the generic rugby pool.
const PBHS_EVENT_PREFIX = "rugby-schools-";
const PBHS_BACKDROP: ImageSourcePropType = require("@/assets/images/sportBackdrops/pbhs-1.jpg");

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
  const key = (sport || "").toLowerCase();
  const pool = BACKDROPS[key];
  if (!pool || pool.length === 0) return null;
  return pool[hashString(seed) % pool.length];
}
