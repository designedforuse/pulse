import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFavorites } from "@/lib/favorites-context";

const PINK = "#FF85C8";
const TRENDING_COLOR = "#FF6B35";

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
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch" | "rivalry_game" | "upset_alert" | "clinch_watch";
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TrendingStoriesScreen() {
  const insets = useSafeAreaInsets();
  const { disabledSports } = useFavorites();

  const { data, isLoading } = useQuery<{ cards: ExploreNarrativeCard[] }>({
    queryKey: ["/api/narratives"],
  });

  const allCards = data?.cards ?? [];
  const cards = disabledSports.size === 0
    ? allCards
    : allCards.filter((card) => {
        const cardSports = card.sports;
        if (!cardSports || cardSports.length === 0) return true;
        return cardSports.some((s) => !disabledSports.has(s.toLowerCase()));
      });

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
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerBadge}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.headerBadgeText}>LIVE FEED</Text>
          </View>
          <Text style={styles.headerTitle}>Trending Stories</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && cards.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={TRENDING_COLOR} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flame-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No trending stories</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon — new narrative cards are generated as live signals roll in.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.totalLabel}>
              {cards.length} {cards.length === 1 ? "story" : "stories"} trending now
            </Text>
            {cards.map((card) => {
              const config = KIND_CONFIG[card.kind] || KIND_CONFIG.league_moment;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => handleCardPress(card)}
                  style={({ pressed }) => [
                    styles.narrativeCard,
                    pressed && { transform: [{ scale: 0.985 }] },
                  ]}
                  testID={`trending-narrative-${card.id}`}
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
          </>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRENDING_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  loading: {
    paddingVertical: 80,
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
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
