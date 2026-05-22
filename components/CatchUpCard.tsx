import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { getSportColor, resolveProviderDisplay, type SportEvent } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { getCatchUpTeaser, type TeaserMood } from "@/lib/catchUpTeasers";

interface CatchUpCardProps {
  event: SportEvent;
  score?: ScoreData;
  isFav?: boolean;
  accentColor?: string;
  width?: number;
}

const MOOD_COLORS: Record<TeaserMood, string> = {
  high: "#FB923C",
  medium: "#A78BFA",
  low: Colors.textSecondary,
};

export default function CatchUpCard({
  event,
  score,
  isFav,
  accentColor = "#A78BFA",
  width,
}: CatchUpCardProps) {
  const sportColor = getSportColor(event.sport);
  const teaser = getCatchUpTeaser(event, score);
  const moodColor = MOOD_COLORS[teaser.mood];
  const provider = resolveProviderDisplay(event);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : null,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      testID={`catchup-card-${event.id}`}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.leagueChip, { borderColor: sportColor + "55", backgroundColor: sportColor + "18" }]}>
            <Text style={[styles.leagueChipText, { color: sportColor }]}>{event.league}</Text>
          </View>
          {isFav && (
            <Ionicons name="star" size={14} color={Colors.favStar} style={{ marginLeft: 6 }} />
          )}
          <View style={{ flex: 1 }} />
          <View style={styles.replayPill}>
            <Ionicons name="play-back" size={11} color={accentColor} />
            <Text style={[styles.replayPillText, { color: accentColor }]}>REPLAY</Text>
          </View>
        </View>

        <Text style={[styles.narrative, { color: moodColor }]}>
          {teaser.headline}
        </Text>

        <View style={styles.footerRow}>
          <ProviderLogo providerId={provider.brandId} size={18} />
          <View style={{ flex: 1 }} />
          <View style={styles.spoilerHint}>
            <Ionicons name="eye-off-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.spoilerHintText}>Score hidden</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row" as const,
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  leagueChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  leagueChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  replayPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(167, 139, 250, 0.14)",
  },
  replayPillText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  narrative: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
    minHeight: 66,
  },
  footerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  spoilerHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  spoilerHintText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
});
