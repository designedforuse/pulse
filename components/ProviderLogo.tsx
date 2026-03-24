import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const PROVIDER_IMAGES: Record<string, any> = {
  espn: require("@/assets/providers/espn.png"),
  espn2: require("@/assets/providers/espn2.png"),
  fanduelsn: require("@/assets/providers/fanduelsn.png"),
  youtubetv: require("@/assets/providers/youtubetv.png"),
  disneyplus: require("@/assets/providers/disneyplus.png"),
  flosports: require("@/assets/providers/flosports.png"),
  flohockey: require("@/assets/providers/flohockey.png"),
  florugby: require("@/assets/providers/florugby.png"),
  nbcsn: require("@/assets/providers/nbcsn.png"),
  rugbypasstv: require("@/assets/providers/rugbypasstv.png"),
  tennischannel: require("@/assets/providers/tennischannel.png"),
  cbs: require("@/assets/providers/cbs.png"),
  nbc: require("@/assets/providers/nbc.png"),
  espnplus: require("@/assets/providers/espnplus.png"),
  cbssn: require("@/assets/providers/cbssn.png"),
  cbsgolazo: require("@/assets/providers/cbsgolazo.png"),
  beinsports: require("@/assets/providers/beinsports.png"),
  victoryplus: require("@/assets/providers/victoryplus.png"),
  primevideo: require("@/assets/providers/primevideo.png"),
  appletv: require("@/assets/providers/appletv.png"),
};

// Per-logo optical scale multiplier (applied to the base bounding box).
// 1.0 = default box size. Increase to make a logo larger, decrease to shrink it.
// Tune these values individually until each logo looks right at all card sizes.
const LOGO_SCALE: Record<string, number> = {
  espn:          0.85,
  espn2:         1.0,
  espnplus:      1.0,
  cbssn:         1.0,
  cbsgolazo:     1.0,
  cbs:           1.0,
  nbcsn:         1.0,
  nbc:           1.0,
  flosports:     1.0,
  flohockey:     1.0,
  florugby:      1.0,
  beinsports:    1.0,
  fanduelsn:     1.0,
  tennischannel: 1.0,
  rugbypasstv:   1.0,
  victoryplus:   1.0,
  youtubetv:     1.0,
  disneyplus:    1.0,
  primevideo:    1.0,
  appletv:       1.0,
};

// Measured aspect ratios (width / height) for every logo asset
const LOGO_ASPECT: Record<string, number> = {
  espn: 4.05,
  espn2: 5.17,
  espnplus: 4.98,
  cbssn: 4.82,
  cbsgolazo: 1.13,
  cbs: 3.45,
  nbcsn: 3.61,
  nbc: 1.02,
  flosports: 8.77,
  flohockey: 9.52,
  florugby: 8.51,
  beinsports: 5.88,
  fanduelsn: 3.51,
  tennischannel: 3.57,
  rugbypasstv: 0.73,
  victoryplus: 8.07,
  youtubetv: 5.56,
  disneyplus: 1.83,
  primevideo: 3.17,
  appletv: 1.98,
};

// Logos that are already full-colour and should not be white-tinted
const NO_TINT_LOGOS = new Set<string>();

const PROVIDER_TEXT_LABELS: Record<string, string> = {
  tnt: "TNT",
  paramount: "P+",
  nwslplus: "NWSL+",
  ion: "ION",
  abc: "ABC",
  cbs: "CBS",
  nbatv: "NBA TV",
  nbaleaguepass: "NBA LP",
  willowtv: "Willow TV",
};

let _warnedIds: Set<string> | null = null;

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({
  providerId,
  size = 24,
}: ProviderLogoProps) {
  const image = PROVIDER_IMAGES[providerId];
  const textLabel = PROVIDER_TEXT_LABELS[providerId];

  if (image) {
    const noTint = NO_TINT_LOGOS.has(providerId);
    // Fixed base bounding box scaled by per-logo optical multiplier.
    // All logos start with the same box; LOGO_SCALE lets you nudge each
    // one individually until it looks right without touching the others.
    const scale = LOGO_SCALE[providerId] ?? 1.0;
    const BOX_W = Math.round(size * 3 * scale);
    const BOX_H = Math.round(size * 0.85 * scale);

    return (
      <View style={[styles.imageWrap, { width: BOX_W, height: size }]}>
        <Image
          source={image}
          style={{
            width: BOX_W,
            height: BOX_H,
            ...(noTint ? {} : { tintColor: "#FFFFFF" }),
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (textLabel) {
    const fontSize = Math.round(size * 0.5);
    return (
      <View
        style={[
          styles.textPill,
          { height: size, paddingHorizontal: Math.round(size * 0.3) },
        ]}
      >
        <Text style={[styles.textLabel, { fontSize }]}>{textLabel}</Text>
      </View>
    );
  }

  if (__DEV__) {
    if (!_warnedIds) _warnedIds = new Set();
    if (!_warnedIds.has(providerId)) {
      _warnedIds.add(providerId);
      console.warn(
        `[ProviderLogo] No icon mapping for providerId: "${providerId}"`,
      );
    }
  }
  return null;
}

const styles = StyleSheet.create({
  imageWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  textPill: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
  },
  textLabel: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
});
