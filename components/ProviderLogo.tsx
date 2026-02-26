import React from "react";
import { View, Text, StyleSheet } from "react-native";

const PROVIDER_SHORT_NAMES: Record<string, string> = {
  youtubetv: "YTTV",
  disneyplus: "D+",
  flosports: "Flo",
  victoryplus: "V+",
  primevideo: "PV",
  appletv: "TV+",
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  youtubetv: { bg: "#FF0000", text: "#FFFFFF" },
  disneyplus: { bg: "#113CCF", text: "#FFFFFF" },
  flosports: { bg: "#00C853", text: "#FFFFFF" },
  victoryplus: { bg: "#FFD600", text: "#000000" },
  primevideo: { bg: "#00A8E1", text: "#FFFFFF" },
  appletv: { bg: "#555555", text: "#FFFFFF" },
};

let _warnedIds: Set<string> | null = null;

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({ providerId, size = 24 }: ProviderLogoProps) {
  const shortName = PROVIDER_SHORT_NAMES[providerId];

  if (!shortName) {
    if (__DEV__) {
      if (!_warnedIds) _warnedIds = new Set();
      if (!_warnedIds.has(providerId)) {
        _warnedIds.add(providerId);
        console.warn(`[ProviderLogo] No icon mapping for providerId: "${providerId}"`);
      }
    }
    return null;
  }

  const colors = PROVIDER_COLORS[providerId] || { bg: "#636366", text: "#FFFFFF" };
  const fontSize = Math.max(8, Math.round(size * 0.42));
  const pillHeight = size;
  const minWidth = size;
  const paddingH = Math.round(size * 0.2);
  const borderRadius = Math.round(size * 0.18);

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.bg,
          height: pillHeight,
          minWidth: minWidth,
          paddingHorizontal: paddingH,
          borderRadius: borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: colors.text, fontSize: fontSize, lineHeight: pillHeight },
        ]}
        numberOfLines={1}
      >
        {shortName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pillText: {
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
