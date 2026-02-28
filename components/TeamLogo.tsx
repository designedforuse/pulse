import React, { useState, useEffect } from "react";
import { Image, View, StyleSheet } from "react-native";
import { getTeamLogoUrl } from "@/utils/teamLogos";

interface TeamLogoProps {
  teamName: string;
  league: string;
  sport?: string;
  size?: number;
}

export function TeamLogo({ teamName, league, sport, size = 20 }: TeamLogoProps) {
  const url = getTeamLogoUrl(teamName, league, sport);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return <View style={{ width: size, height: size, marginRight: 6 }} />;
  }

  return (
    <Image
      source={{ uri: url }}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    marginRight: 6,
    borderRadius: 2,
  },
});
