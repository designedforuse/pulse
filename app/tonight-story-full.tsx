import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFavorites } from "@/lib/favorites-context";

const PINK = "#FF85C8";

interface TonightStory {
  signalType: string;
  signalLabel: string;
  headline: string;
  body: string;
  sourceEventId?: string;
  sourceCard: { id: string; kind: string; title: string };
  sports?: string[];
}

interface NarrativeImpact {
  label: string;
  ritualId?: string;
  tabHint?: "Watch" | "Rituals";
}

interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind:
    | "playoff_push"
    | "momentum"
    | "league_moment"
    | "player_movement"
    | "deadline_watch"
    | "rivalry_game"
    | "upset_alert"
    | "clinch_watch";
  meta?: Record<string, any>;
  sports?: string[];
}

const KIND_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  playoff_push: { icon: "flame", color: "#FF453A", label: "Playoff Push" },
  momentum: { icon: "trending-up", color: "#58CC02", label: "Momentum" },
  league_moment: { icon: "trophy", color: "#FFC800", label: "League Moment" },
  player_movement: { icon: "swap-horizontal", color: "#1CB0F6", label: "Player Movement" },
  deadline_watch: { icon: "time", color: "#FF9800", label: "Deadline Watch" },
  rivalry_game: { icon: "flash", color: "#E040FB", label: "Rivalry Game" },
  upset_alert: { icon: "alert-circle", color: "#FF1744", label: "Upset Alert" },
  clinch_watch: { icon: "flag", color: "#00BCD4", label: "Clinch Watch" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TonightStoryFullScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { disabledSports } = useFavorites();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Today's Story", headerBackTitle: "Stories" });
  }, [navigation]);

  const { data, isLoading } = useQuery<{
    tonightStory: TonightStory | null;
    cards: ExploreNarrativeCard[];
  }>({
    queryKey: ["/api/narratives"],
    staleTime: 60 * 1000,
  });

  const story = data?.tonightStory ?? null;
  const allCards = data?.cards ?? [];
  const relatedCards = (disabledSports.size === 0
    ? allCards
    : allCards.filter((card) => {
        const cardSports = card.sports;
        if (!cardSports || cardSports.length === 0) return true;
        return cardSports.some((s) => !disabledSports.has(s.toLowerCase()));
      })
  ).filter((card) => card.id !== story?.sourceCard?.id);

  const handleLeadCta = () => {
    if (!story) return;
    if (story.signalType === "multi_team_night" || story.signalType === "single_team_game") {
      router.push("/(tabs)/watch");
    } else if (story.sourceCard?.id) {
      router.push({ pathname: "/narrative/[id]", params: { id: story.sourceCard.id } });
    }
  };

  const handleCardPress = (card: ExploreNarrativeCard) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/narrative/[id]",
      params: { id: card.id, cardJson: JSON.stringify(card) },
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE SIGNAL</Text>
          {story?.signalLabel && <Text style={styles.signalLabel}> · {story.signalLabel}</Text>}
        </View>
        <Text style={styles.kicker}>TODAY'S STORY</Text>
      </View>

      <View style={styles.body}>
        {isLoading && !story ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : !story ? (
          <Text style={styles.muted}>No live signal right now. Check back closer to game time.</Text>
        ) : (
          <>
            <Text style={styles.headline}>{story.headline}</Text>
            <Text style={styles.bodyText}>{story.body}</Text>
            {story.sports && story.sports.length > 0 && (
              <View style={styles.sportsRow}>
                {story.sports.map((s) => (
                  <View key={s} style={styles.sportChip}>
                    <Text style={styles.sportChipText}>{s.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
            {story.sourceCard && (
              <Pressable
                onPress={handleLeadCta}
                style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.ctaText}>
                  {story.signalType === "multi_team_night" || story.signalType === "single_team_game"
                    ? "Track all games"
                    : "Read more"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={PINK} />
              </Pressable>
            )}
          </>
        )}
      </View>

      {relatedCards.length > 0 && (
        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedHeaderTitle}>More stories today</Text>
            <Text style={styles.feedHeaderCount}>
              {relatedCards.length} {relatedCards.length === 1 ? "story" : "stories"}
            </Text>
          </View>
          <View style={styles.feedList}>
            {relatedCards.map((card) => {
              const config = KIND_CONFIG[card.kind] || KIND_CONFIG.league_moment;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => handleCardPress(card)}
                  style={({ pressed }) => [
                    styles.narrativeCard,
                    pressed && { transform: [{ scale: 0.985 }] },
                  ]}
                  testID={`today-story-narrative-${card.id}`}
                >
                  <View style={[styles.cardColorHeader, { backgroundColor: config.color + "18" }]}>
                    <View style={[styles.kindBadge, { backgroundColor: config.color }]}>
                      <Ionicons name={config.icon} size={12} color="#fff" />
                      <Text style={styles.kindLabel}>{config.label}</Text>
                    </View>
                    <Text style={styles.timeAgo}>{timeAgo(card.triggeredAt)}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={3}>{card.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={4}>{card.subtitle}</Text>
                    {card.impact && (
                      <View style={styles.impactRow}>
                        <Ionicons name="link-outline" size={12} color={PINK} />
                        <Text style={styles.impactText} numberOfLines={2}>{card.impact.label}</Text>
                      </View>
                    )}
                    <View style={styles.cardFooter}>
                      <Text style={styles.readMore}>Read more</Text>
                      <Ionicons name="arrow-forward" size={13} color={PINK} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PINK + "12",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PINK + "22",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF453A",
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FF453A",
    letterSpacing: 1.2,
  },
  signalLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1.6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  muted: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 18,
  },
  sportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 22,
  },
  sportChip: {
    backgroundColor: PINK + "18",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PINK + "33",
  },
  sportChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1.1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: PINK + "18",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  feedSection: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  feedHeaderTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  feedHeaderCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  feedList: {
    gap: 12,
  },
  narrativeCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardColorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.6,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  impactText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  readMore: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
    letterSpacing: 0.3,
  },
});
