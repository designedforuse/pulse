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

// Logos that are already full-colour and should not be white-tinted
const NO_TINT_LOGOS = new Set(["espn", "flohockey", "nbcsn", "tennischannel", "cbs", "nbc", "cbsgolazo", "beinsports", "espnplus", "cbssn", "fanduelsn"]);

const PROVIDER_TEXT_LABELS: Record<string, string> = {
  tnt: "TNT",
  paramount: "P+",
  nwslplus: "NWSL+",
  ion: "ION",
  abc: "ABC",
  cbs: "CBS",
  nbatv: "NBA TV",
  nbc: "NBC",
  willowtv: "Willow TV",
  rugbypasstv: "RugbyPass TV",
};

let _warnedIds: Set<string> | null = null;

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({ providerId, size = 24 }: ProviderLogoProps) {
  const image = PROVIDER_IMAGES[providerId];
  const textLabel = PROVIDER_TEXT_LABELS[providerId];

  if (image) {
    const boxWidth = Math.round(size * 2.4);
    const boxHeight = size;
    const noTint = NO_TINT_LOGOS.has(providerId);
    return (
      <View style={[styles.imagePill, { width: boxWidth, height: boxHeight }]}>
        <Image
          source={image}
          style={{ width: boxWidth, height: boxHeight - 4, ...(noTint ? {} : { tintColor: "#FFFFFF" }) }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (textLabel) {
    const fontSize = Math.round(size * 0.5);
    return (
      <View style={[styles.textPill, { height: size, paddingHorizontal: Math.round(size * 0.3) }]}>
        <Text style={[styles.textLabel, { fontSize }]}>{textLabel}</Text>
      </View>
    );
  }

  if (__DEV__) {
    if (!_warnedIds) _warnedIds = new Set();
    if (!_warnedIds.has(providerId)) {
      _warnedIds.add(providerId);
      console.warn(`[ProviderLogo] No icon mapping for providerId: "${providerId}"`);
    }
  }
  return null;
}

const styles = StyleSheet.create({
  imagePill: {
    alignItems: "center",
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
