import React, { useState, useCallback, useMemo } from "react";
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
import { useFavorites } from "@/lib/favorites-context";
import DailyWrapCard from "@/components/DailyWrapCard";

const PINK = "#FF85C8";

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
  sports?: string[];
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

interface MonthSnapshotLeague {
  sport: string;
  displayName: string;
  leagueKey: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  eventCount: number;
}

interface MonthSnapshotData {
  monthLabel: string;
  monthKey: string;
  leagues: MonthSnapshotLeague[];
}

interface MonthSnapshot {
  currentMonth: MonthSnapshotData;
  nextMonth: MonthSnapshotData;
}

const SNAPSHOT_COLOR = "#6366F1";
const SNAPSHOT_MAX_VISIBLE = 5;

const SPORT_EMOJI: Record<string, string> = {
  hockey: "🏒",
  soccer: "⚽",
  basketball: "🏀",
  rugby: "🏉",
  tennis: "🎾",
  racing: "🏎",
  golf: "⛳",
  cricket: "🏏",
  athletics: "🏃",
};

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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { disabledSports, isSportEnabled } = useFavorites();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotTab, setSnapshotTab] = useState<"current" | "next">("current");

  const { data, isLoading } = useQuery<{ cards: ExploreNarrativeCard[]; lastUpdated: string | null; tonightStory: TonightStory | null; monthSnapshot: MonthSnapshot | null }>({
    queryKey: ["/api/narratives"],
  });

  const allCards = data?.cards ?? [];
  const rawTonightStory = data?.tonightStory ?? null;
  const rawMonthSnapshot = data?.monthSnapshot ?? null;

  const cards = useMemo(() => {
    if (disabledSports.size === 0) return allCards;
    return allCards.filter((card) => {
      const cardSports = card.sports;
      if (!cardSports || cardSports.length === 0) return true;
      return cardSports.some((s) => !disabledSports.has(s.toLowerCase()));
    });
  }, [allCards, disabledSports]);

  const tonightStory = useMemo(() => {
    if (!rawTonightStory || disabledSports.size === 0) return rawTonightStory;
    const storySports = rawTonightStory.sports;
    if (storySports && storySports.length > 0 && storySports.every((s) => disabledSports.has(s.toLowerCase()))) {
      return null;
    }
    return rawTonightStory;
  }, [rawTonightStory, disabledSports]);

  const monthSnapshot = useMemo(() => {
    if (!rawMonthSnapshot) return null;
    if (disabledSports.size === 0) return rawMonthSnapshot;
    const filterLeagues = (data: MonthSnapshotData): MonthSnapshotData => ({
      ...data,
      leagues: data.leagues.filter(l => isSportEnabled(l.sport)),
    });
    return {
      currentMonth: filterLeagues(rawMonthSnapshot.currentMonth),
      nextMonth: filterLeagues(rawMonthSnapshot.nextMonth),
    };
  }, [rawMonthSnapshot, disabledSports, isSportEnabled]);

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
      <View style={[styles.headerBanner, {
        paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 20,
        minHeight: (Platform.OS === "web" ? webTopInset : insets.top) + 144,
      }]}>
        <View style={styles.headerBannerRow}>
          <Text style={styles.headerTitle}>Stories</Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.6 : 1 }]}
            testID="explore-settings-button"
          >
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Narrative intelligence, live</Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Platform.OS === "web" ? 34 : 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PINK}
            colors={[PINK]}
          />
        }
      >

        <DailyWrapCard />

        {tonightStory && (
          <View style={styles.tonightCard}>
            <View style={styles.tonightCardHeader}>
              <View style={styles.tonightLiveRow}>
                <View style={styles.liveIndicator} />
                <Text style={styles.tonightLiveLabel}>LIVE SIGNAL</Text>
                <Text style={styles.tonightSignalLabel}> · {tonightStory.signalLabel}</Text>
              </View>
              <Text style={styles.tonightKicker}>TONIGHT'S STORY</Text>
            </View>
            <View style={styles.tonightCardBody}>
              <Text style={styles.tonightHeadline}>{tonightStory.headline}</Text>
              <Text style={styles.tonightBody}>{tonightStory.body}</Text>
              {tonightStory.sourceCard && (
                <Pressable
                  onPress={() => {
                    if (tonightStory.signalType === "multi_team_night" || tonightStory.signalType === "single_team_game") {
                      router.push("/(tabs)/watch");
                    } else {
                      const matchingCard = cards.find(c => c.id === tonightStory.sourceCard.id);
                      if (matchingCard) handleCardPress(matchingCard);
                    }
                  }}
                  style={({ pressed }) => [styles.tonightCta, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.tonightCtaText}>
                    {tonightStory.signalType === "multi_team_night" || tonightStory.signalType === "single_team_game"
                      ? "Track all games"
                      : "Read more"}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={PINK} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {monthSnapshot && (() => {
          const activeData = snapshotTab === "current" ? monthSnapshot.currentMonth : monthSnapshot.nextMonth;
          const visibleLeagues = activeData.leagues.slice(0, SNAPSHOT_MAX_VISIBLE);
          const remainingCount = activeData.leagues.length - SNAPSHOT_MAX_VISIBLE;
          return (
            <View style={styles.snapshotCard}>
              <View style={styles.snapshotHeader}>
                <View style={styles.snapshotBadge}>
                  <Ionicons name="calendar-outline" size={11} color="#fff" />
                  <Text style={styles.snapshotBadgeText}>SCHEDULE</Text>
                </View>
                <View style={styles.snapshotTabs}>
                  <Pressable
                    onPress={() => setSnapshotTab("current")}
                    style={[styles.snapshotTab, snapshotTab === "current" && styles.snapshotTabActive]}
                  >
                    <Text style={[styles.snapshotTabText, snapshotTab === "current" && styles.snapshotTabTextActive]}>
                      {monthSnapshot.currentMonth.monthLabel.split(" ")[0]}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSnapshotTab("next")}
                    style={[styles.snapshotTab, snapshotTab === "next" && styles.snapshotTabActive]}
                  >
                    <Text style={[styles.snapshotTabText, snapshotTab === "next" && styles.snapshotTabTextActive]}>
                      {monthSnapshot.nextMonth.monthLabel.split(" ")[0]}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.snapshotBody}>
                {activeData.leagues.length === 0 ? (
                  <View style={styles.snapshotEmptyRow}>
                    <Text style={styles.snapshotEmptyText}>No events scheduled</Text>
                  </View>
                ) : (
                  <>
                    {visibleLeagues.map((item, idx) => (
                      <View
                        key={`${item.sport}-${item.leagueKey}-${idx}`}
                        style={[styles.snapshotRow, idx > 0 && styles.snapshotRowBorder]}
                      >
                        <Text style={styles.snapshotEmoji}>{SPORT_EMOJI[item.sport] ?? "🏆"}</Text>
                        <Text style={styles.snapshotLeagueName} numberOfLines={1}>{item.displayName}</Text>
                        <Text style={styles.snapshotDateRange}>{item.dateRangeLabel}</Text>
                      </View>
                    ))}
                    {remainingCount > 0 && (
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/month-schedule",
                            params: {
                              monthDataJson: JSON.stringify(activeData),
                            },
                          });
                        }}
                        style={({ pressed }) => [styles.snapshotViewAllRow, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={styles.snapshotViewAllText}>
                          View all {activeData.leagues.length} leagues & tournaments
                        </Text>
                        <Ionicons name="arrow-forward" size={13} color={SNAPSHOT_COLOR} />
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={PINK} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="pulse-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nothing spiking right now</Text>
            <Text style={styles.emptySubtitle}>
              Stories surface when thresholds are triggered.
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
                    { transform: [{ scale: pressed ? 0.975 : 1 }] },
                  ]}
                  testID={`narrative-${card.id}`}
                >
                  <View style={[styles.cardColorHeader, { backgroundColor: config.color + "18" }]}>
                    <View style={[styles.kindBadge, { backgroundColor: config.color }]}>
                      <Ionicons name={config.icon} size={12} color="#fff" />
                      <Text style={styles.kindLabel}>{config.label}</Text>
                    </View>
                    <Text style={styles.timeAgo}>{timeAgo(card.triggeredAt)}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>{card.subtitle}</Text>
                    {card.impact && (
                      <View style={styles.impactRow}>
                        <Ionicons name="link-outline" size={12} color={PINK} />
                        <Text style={styles.impactText}>{card.impact.label}</Text>
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
        )}

        {data?.lastUpdated && (
          <Text style={styles.lastUpdated}>Updated {timeAgo(data.lastUpdated)}</Text>
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  headerBanner: {
    backgroundColor: "#FF85C8",
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: "flex-end",
  },
  headerBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  headerTitle: {
    fontSize: 32,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 14,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  tonightCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden",
    marginBottom: 20,
  },
  tonightCardHeader: {
    backgroundColor: PINK + "15",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PINK + "20",
  },
  tonightLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF453A",
    marginRight: 6,
  },
  tonightLiveLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FF453A",
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  tonightSignalLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  tonightKicker: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  tonightCardBody: {
    padding: 16,
  },
  tonightHeadline: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 28,
  },
  tonightBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  tonightCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    alignSelf: "flex-start" as const,
    backgroundColor: PINK + "15",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tonightCtaText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  cardsContainer: {
    gap: 12,
  },
  narrativeCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
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
    borderRadius: 10,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  cardBody: {
    padding: 14,
    paddingTop: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    lineHeight: 23,
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
    color: PINK,
    fontFamily: "Inter_500Medium",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  readMore: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  lastUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
  },
  snapshotCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SNAPSHOT_COLOR + "40",
    overflow: "hidden" as const,
    marginBottom: 20,
  },
  snapshotHeader: {
    backgroundColor: SNAPSHOT_COLOR + "18",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: SNAPSHOT_COLOR + "25",
  },
  snapshotBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: SNAPSHOT_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  snapshotBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  snapshotTabs: {
    flexDirection: "row" as const,
    gap: 6,
  },
  snapshotTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  snapshotTabActive: {
    backgroundColor: SNAPSHOT_COLOR + "25",
    borderColor: SNAPSHOT_COLOR + "60",
  },
  snapshotTabText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  snapshotTabTextActive: {
    color: SNAPSHOT_COLOR,
    fontFamily: "Inter_600SemiBold",
  },
  snapshotBody: {
    paddingVertical: 4,
  },
  snapshotRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  snapshotRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  snapshotEmoji: {
    fontSize: 15,
    width: 20,
    textAlign: "center" as const,
  },
  snapshotLeagueName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  snapshotDateRange: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  snapshotViewAllRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 12,
  },
  snapshotViewAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: SNAPSHOT_COLOR,
  },
  snapshotEmptyRow: {
    paddingVertical: 20,
    alignItems: "center" as const,
  },
  snapshotEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
});
