import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const PROVIDER_IMAGES: Record<string, any> = {
  youtubetv: require("@/assets/providers/youtubetv.png"),
  disneyplus: require("@/assets/providers/disneyplus.png"),
  flosports: require("@/assets/providers/flosports.png"),
  victoryplus: require("@/assets/providers/victoryplus.png"),
  primevideo: require("@/assets/providers/primevideo.png"),
  appletv: require("@/assets/providers/appletv.png"),
};

const PROVIDER_TEXT_LABELS: Record<string, string> = {
  tennischannel: "TC",
  espn: "ESPN",
  espnplus: "ESPN+",
  cbsgolazo: "Golazo",
  tnt: "TNT",
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
    const pillHeight = size;
    const imgWidth = Math.round(size * 1.8);
    return (
      <View style={[styles.imagePill, { height: pillHeight, minWidth: imgWidth }]}>
        <Image
          source={image}
          style={{ width: imgWidth, height: pillHeight - 4, tintColor: "#FFFFFF" }}
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
    alignSelf: "flex-start",
  },
  textPill: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
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
