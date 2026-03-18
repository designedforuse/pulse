import React, { useState, useEffect } from "react";
import { Image, View, Text, StyleSheet, Platform } from "react-native";
import { getTeamLogoUrl } from "@/utils/teamLogos";

const loggedMissing = new Set<string>();

function getInitials(teamName: string): string {
  const words = teamName.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

interface TeamLogoProps {
  teamName: string;
  league: string;
  sport?: string;
  size?: number;
  glow?: boolean;
}

export function TeamLogo({ teamName, league, sport, size = 20, glow = false }: TeamLogoProps) {
  const url = getTeamLogoUrl(teamName, league, sport);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const showFallback = !url || failed;

  const handleLoad = (e: any) => {
    const { width, height } = e?.nativeEvent?.source ?? {};
    if (width != null && height != null && width <= 1 && height <= 1) {
      setFailed(true);
    }
  };

  if (showFallback) {
    if (__DEV__ && teamName && teamName !== "TBC" && teamName !== "TBD") {
      const key = `${league}::${teamName}`;
      if (!loggedMissing.has(key)) {
        loggedMissing.add(key);
        console.warn(`[logos] missing`, league, teamName);
      }
    }

    if (!teamName || teamName === "TBC" || teamName === "TBD") {
      return <View style={{ width: size, height: size, marginRight: 6 }} />;
    }

    const initials = getInitials(teamName);
    const fontSize = Math.max(7, Math.round(size * 0.4));
    return (
      <View
        style={[
          styles.initialsBadge,
          {
            width: size,
            height: size,
            borderRadius: size * 0.3,
            marginRight: 6,
          },
        ]}
      >
        <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
      </View>
    );
  }

  if (glow) {
    return (
      <View
        style={[
          styles.glowWrapper,
          { width: size, height: size, borderRadius: size * 0.5 },
        ]}
      >
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onLoad={handleLoad}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
      onLoad={handleLoad}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    marginRight: 6,
    borderRadius: 2,
  },
  glowWrapper: {
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#ffffff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
        shadowColor: "#ffffff",
      },
      default: {},
    }),
  },
  initialsBadge: {
    backgroundColor: "rgba(161, 161, 166, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#A1A1A6",
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
