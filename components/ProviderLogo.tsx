import React from "react";
import { Image, View, StyleSheet } from "react-native";

const PROVIDER_LOGOS: Record<string, any> = {
  youtubetv: require("@/assets/providers/youtubetv.png"),
  disneyplus: require("@/assets/providers/disneyplus.png"),
  flosports: require("@/assets/providers/flosports.png"),
  victoryplus: require("@/assets/providers/victoryplus.png"),
  primevideo: require("@/assets/providers/primevideo.png"),
  appletv: require("@/assets/providers/appletv.png"),
};

interface ProviderLogoProps {
  providerId: string;
  size?: number;
}

export default function ProviderLogo({ providerId, size = 24 }: ProviderLogoProps) {
  const source = PROVIDER_LOGOS[providerId];
  if (!source) return null;

  return (
    <Image
      source={source}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.22 }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: "transparent",
  },
});
