import React from "react";
import { View, Image, StyleSheet } from "react-native";

const PROVIDER_IMAGES: Record<string, any> = {
  youtubetv: require("@/assets/providers/youtubetv.png"),
  disneyplus: require("@/assets/providers/disneyplus.png"),
  flosports: require("@/assets/providers/flosports.png"),
  victoryplus: require("@/assets/providers/victoryplus.png"),
  primevideo: require("@/assets/providers/primevideo.png"),
  appletv: require("@/assets/providers/appletv.png"),
};

let _warnedIds: Set<string> | null = null;

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({ providerId, size = 24 }: ProviderLogoProps) {
  const image = PROVIDER_IMAGES[providerId];

  if (!image) {
    if (__DEV__) {
      if (!_warnedIds) _warnedIds = new Set();
      if (!_warnedIds.has(providerId)) {
        _warnedIds.add(providerId);
        console.warn(`[ProviderLogo] No icon mapping for providerId: "${providerId}"`);
      }
    }
    return null;
  }

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

const styles = StyleSheet.create({
  imagePill: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
