import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const PROVIDER_IMAGES: Record<string, any> = {
  // ── Approved broadcasters ─────────────────────────────────────────────────
  espn:          require("@/assets/providers/espn.png"),
  nbcsn:         require("@/assets/providers/nbcsn.png"),
  cbs:           require("@/assets/providers/cbssn.png"),
  cbssn:         require("@/assets/providers/cbssn.png"),
  fox:           require("@/assets/providers/foxsports.png"),
  fs1:           require("@/assets/providers/foxsports.png"),
  tnt:           require("@/assets/providers/tnt.png"),
  primevideo:    require("@/assets/providers/primevideo.png"),
  appletv:       require("@/assets/providers/appletv.png"),
  flosports:     require("@/assets/providers/flosports.png"),
  beinsports:    require("@/assets/providers/beinsports.png"),
  fanduelsn:     require("@/assets/providers/fanduelsn.png"),
  victoryplus:   require("@/assets/providers/victoryplus.png"),
  nbatv:         require("@/assets/providers/nbatv.png"),
  nbaleaguepass: require("@/assets/providers/nbaleaguepass.png"),
  nwslplus:      require("@/assets/providers/nwslplus.png"),
  tennischannel: require("@/assets/providers/tennischannel.png"),
  willowtv:      require("@/assets/providers/willowtv.png"),
  rugbypasstv:   require("@/assets/providers/rugbypasstv.png"),
  ion:           require("@/assets/providers/ion.png"),
  mlbtv:         require("@/assets/providers/mlbtv.png"),
  // ── Aliases → approved logos ──────────────────────────────────────────────
  espn2:         require("@/assets/providers/espn.png"),      // ESPN2 → ESPN
  flohockey:     require("@/assets/providers/flosports.png"), // FloHockey → FloSports
  florugby:      require("@/assets/providers/flosports.png"), // FloRugby → FloSports
  cbsgolazo:     require("@/assets/providers/cbssn.png"),     // CBS Golazo → CBS Sports
  nbc:           require("@/assets/providers/nbcsn.png"),     // NBC → NBC Sports
};

// Per-logo optical scale multiplier (applied to the base bounding box).
// 1.0 = default box size. Increase to make a logo larger, decrease to shrink it.
// Tune these values individually until each logo looks right at all card sizes.
const LOGO_SCALE: Record<string, number> = {
  // Approved broadcasters
  espn:          0.65,
  nbcsn:         1.0,
  cbs:           1.2,
  cbssn:         1.2,
  fox:           1.1,
  fs1:           1.1,
  tnt:           1.0,
  primevideo:    1.0,
  appletv:       1.0,
  flosports:     1.2,
  beinsports:    1.0,
  fanduelsn:     0.9,
  victoryplus:   1.0,
  nbatv:         1.0,
  nbaleaguepass: 0.9,
  nwslplus:      1.0,
  tennischannel: 0.8,
  willowtv:      1.0,
  rugbypasstv:   1.2,
  ion:           0.9,
  mlbtv:         0.9,
  // Aliases
  espn2:         0.65,
  flohockey:     1.2,
  florugby:      1.2,
  cbsgolazo:     1.2,
  nbc:           1.0,
};

// Measured aspect ratios (width / height) for every logo asset
const LOGO_ASPECT: Record<string, number> = {
  // Approved broadcasters
  espn:          4.05,
  nbcsn:         3.61,
  cbs:           4.82,
  cbssn:         4.82,
  fox:           1.89,
  fs1:           1.89,
  tnt:           2.50,
  primevideo:    3.17,
  appletv:       1.98,
  flosports:     8.77,
  beinsports:    5.88,
  fanduelsn:     3.51,
  victoryplus:   8.07,
  nbatv:         2.80,
  nbaleaguepass: 3.64,
  nwslplus:      3.00,
  tennischannel: 3.57,
  willowtv:      3.00,
  rugbypasstv:   0.73,
  ion:           2.00,
  mlbtv:         2.50,
  // Aliases
  espn2:         4.05,
  flohockey:     8.77,
  florugby:      8.77,
  cbsgolazo:     4.82,
  nbc:           3.61,
};

// Logos that are already full-colour and should not be white-tinted
const NO_TINT_LOGOS = new Set<string>();

const PROVIDER_TEXT_LABELS: Record<string, string> = {
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
