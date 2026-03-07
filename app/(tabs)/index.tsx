import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface NarrativeImpact {
  label: string;
  ritualId?: string;
  tabHint?: "Watch" | "Rituals";
}

interface TonightStory {
  signalType: string;
  signalLabel: string;
  headline: string;
  body: string;
  sourceEventId?: string;
  sourceCard: { id: string; kind: string; title: string };
}

interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch" | "rivalry_game" | "upset_alert" | "clinch_watch";
  meta?: Record<string, any>;
}

const KIND_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  playoff_push: { icon: "flame", color: "#FF453A", label: "Playoff Push" },
  momentum: { icon: "trending-up", color: "#00E676", label: "Momentum" },
  league_moment: { icon: "trophy", color: "#FFD54F", label: "League Moment" },
  player_movement: { icon: "swap-horizontal", color: "#64B5F6", label: "Player Movement" },
  deadline_watch: { icon: "time", color: "#FF9800", label: "Deadline Watch" },
  rivalry_game: { icon: "flash", color: "#E040FB", label: "Rivalry Game" },
  upset_alert: { icon: "alert-circle", color: "#FF1744", label: "Upset Alert" },
  clinch_watch: { icon: "flag", color: "#00BCD4", label: "Clinch Watch" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery<{ cards: ExploreNarrativeCard[]; lastUpdated: string | null; tonightStory: TonightStory | null }>({
    queryKey: ["/api/narratives"],
  });

  const cards = data?.cards ?? [];
  const tonightStory = data?.tonightStory ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const url = new URL("/api/rebuild-explore", getApiUrl());
      await fetch(url.toString(), { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["/api/narratives"] });
    } catch {}
    setRefreshing(false);
  }, [queryClient]);

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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="compass" size={28} color={Colors.accent} />
            <Text style={styles.headerTitle}>Explore</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="explore-settings-button"
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Upstream narrative intelligence
        </Text>

        {tonightStory && (
          <View style={styles.tonightStoryContainer}>
            <Text style={styles.tonightStoryKicker}>
              LIVE SIGNAL  •  {tonightStory.signalLabel}
            </Text>
            <Text style={styles.tonightStoryLabel}>TONIGHT'S STORY</Text>
            <Text style={styles.tonightStoryHeadline}>{tonightStory.headline}</Text>
            <Text style={styles.tonightStoryBody}>{tonightStory.body}</Text>
            {tonightStory.sourceCard && (
              <Pressable
                onPress={() => {
                  const matchingCard = cards.find(c => c.id === tonightStory.sourceCard.id);
                  if (matchingCard) handleCardPress(matchingCard);
                }}
                style={({ pressed }) => [
                  styles.tonightStoryCta,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.tonightStoryCtaText}>
                  {tonightStory.signalType === "multi_team_night" || tonightStory.signalType === "single_team_game"
                    ? "Track all games"
                    : "Read more"}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
              </Pressable>
            )}
          </View>
        )}

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pulse-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing spiking right now</Text>
            <Text style={styles.emptySubtitle}>
              Explore will surface stories when thresholds are triggered.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {cards.map((card) => {
              const config = KIND_CONFIG[card.kind] || KIND_CONFIG.league_moment;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => handleCardPress(card)}
                  style={({ pressed }) => [
                    styles.narrativeCard,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                  ]}
                  testID={`narrative-${card.id}`}
                >
                  <View style={[styles.cardAccent, { backgroundColor: config.color }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.kindBadge, { backgroundColor: config.color + "20" }]}>
                        <Ionicons name={config.icon} size={14} color={config.color} />
                        <Text style={[styles.kindLabel, { color: config.color }]}>{config.label}</Text>
                      </View>
                      <Text style={styles.timeAgo}>{timeAgo(card.triggeredAt)}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>{card.subtitle}</Text>
                    {card.impact && (
                      <View style={styles.impactRow}>
                        <Ionicons name="link-outline" size={12} color={Colors.accent} />
                        <Text style={styles.impactText}>{card.impact.label}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardChevron}>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {data?.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last generated: {timeAgo(data.lastUpdated)}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  tonightStoryContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 20,
  },
  tonightStoryKicker: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  tonightStoryLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  tonightStoryHeadline: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  tonightStoryBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  tonightStoryCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    alignSelf: "flex-start" as const,
    paddingTop: 4,
  },
  tonightStoryCtaText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  cardsContainer: {
    gap: 12,
  },
  narrativeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  impactText: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
  },
  cardChevron: {
    paddingRight: 12,
  },
  lastUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
  },
});
