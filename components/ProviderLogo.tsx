import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const PROVIDER_IMAGES: Record<string, any> = {
  youtubetv: require("@/assets/providers/youtubetv.png"),
  disneyplus: require("@/assets/providers/disneyplus.png"),
  flosports: require("@/assets/providers/flosports.png"),
  victoryplus: require("@/assets/providers/victoryplus.png"),
  primevideo: require("@/assets/providers/primevideo.png"),
};

const PROVIDER_SHORT_NAMES: Record<string, string> = {
  appletv: "TV+",
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  appletv: { bg: "#555555", text: "#FFFFFF" },
};

let _warnedIds: Set<string> | null = null;

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({ providerId, size = 24 }: ProviderLogoProps) {
  const image = PROVIDER_IMAGES[providerId];

  if (image) {
    const pillHeight = size;
    const imgWidth = Math.round(size * 1.8);

    return (
      <View
        style={[
          styles.imagePill,
          {
            height: pillHeight,
            minWidth: imgWidth,
          },
        ]}
      >
        <Image
          source={image}
          style={{
            width: imgWidth,
            height: pillHeight - 4,
            tintColor: "#FFFFFF",
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

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
  imagePill: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
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
