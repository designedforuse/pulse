import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import DailyWrapCard from "@/components/DailyWrapCard";

const PINK = "#FF85C8";

const COVER_IMAGES = {
  tonight: require("@/assets/images/stories/todays-story.jpg"),
  comingUp: require("@/assets/images/stories/coming-up.jpg"),
  deepTalk: require("@/assets/images/stories/behind-stories.jpg"),
  trending: require("@/assets/images/stories/trending.jpg"),
} as const;

const TONIGHT_COVER_POOL = [
  require("@/assets/images/stories/todays-story.jpg"),
  require("@/assets/images/stories/tonight/tonight-1.jpg"),
  require("@/assets/images/stories/tonight/tonight-2.jpg"),
  require("@/assets/images/stories/tonight/tonight-3.jpg"),
  require("@/assets/images/stories/tonight/tonight-4.jpg"),
];

function pickTonightCover(): any {
  const now = new Date();
  const dayKey = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  return TONIGHT_COVER_POOL[dayKey % TONIGHT_COVER_POOL.length];
}

const COVER_OVERLAY_COLORS = ["rgba(15,18,22,0.15)", "rgba(15,18,22,0.55)", "rgba(15,18,22,0.95)"] as const;
const COVER_OVERLAY_LOCATIONS = [0, 0.5, 1] as const;

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
  favoriteTeams?: string[];
}

interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch" | "rivalry_game" | "upset_alert" | "clinch_watch" | "weekend_watchlist" | "week_ahead" | "rally_weekend" | "marathon_spotlight" | "diamond_league" | "golf_major" | "grand_tour" | "ipl_storyline" | "marquee_match";
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
  seasonPhase?: string | null;
}

interface MonthSnapshotChampionshipFinal {
  leagueKey: string;
  sport: string;
  name: string;
  date: string;
  emoji?: string;
}

interface MonthSnapshotData {
  monthLabel: string;
  monthKey: string;
  leagues: MonthSnapshotLeague[];
  championshipFinals?: MonthSnapshotChampionshipFinal[];
}

interface MonthSnapshot {
  currentMonth: MonthSnapshotData;
  nextMonth: MonthSnapshotData;
  thisWeek?: MonthSnapshotData;
}

const SNAPSHOT_COLOR = PINK;
const TRENDING_COLOR = PINK;

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
  const { width: screenWidth } = useWindowDimensions();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [refreshing, setRefreshing] = useState(false);
  const [feedSize, setFeedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [activeSlide, setActiveSlide] = useState(0);

  const onFeedLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFeedSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const { data, isLoading } = useQuery<{ cards: ExploreNarrativeCard[]; lastUpdated: string | null; tonightStory: TonightStory | null; todaysStories?: TonightStory[]; monthSnapshot: MonthSnapshot | null }>({
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
      championshipFinals: data.championshipFinals?.filter(f => isSportEnabled(f.sport)),
    });
    return {
      currentMonth: filterLeagues(rawMonthSnapshot.currentMonth),
      nextMonth: filterLeagues(rawMonthSnapshot.nextMonth),
      thisWeek: rawMonthSnapshot.thisWeek ? filterLeagues(rawMonthSnapshot.thisWeek) : undefined,
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

  const slides: React.ReactNode[] = [];

  if (tonightStory) {
    slides.push(
      <Pressable
        key="tonight"
        onPress={() => router.push("/tonight-story-full")}
        style={({ pressed }) => [styles.tonightCard, styles.cardFill, pressed && { opacity: 0.9 }]}
      >
        <ExpoImage
          source={pickTonightCover()}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={COVER_OVERLAY_COLORS as unknown as readonly [string, string, ...string[]]}
          locations={COVER_OVERLAY_LOCATIONS as unknown as readonly [number, number, ...number[]]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.tonightCoverInner}>
          <Text style={styles.tonightCoverDate}>
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
          </Text>
          <Text style={styles.tonightCoverWordmark}>ON YOUR{"\n"}RADAR</Text>
          <Text style={styles.tonightCoverTagline}>What's worth watching today</Text>
          <View style={styles.tonightCoverChips}>
            {(() => {
              const favSet = new Set<string>();
              const storiesForCount = (data?.todaysStories && data.todaysStories.length > 0)
                ? data.todaysStories
                : [tonightStory];
              for (const s of storiesForCount) {
                for (const t of (s?.favoriteTeams || [])) favSet.add(t);
              }
              const favCount = favSet.size;
              return (
                <View style={styles.tonightCoverChip}>
                  <Text style={styles.tonightCoverChipText}>
                    {favCount > 0 ? `${favCount} ${favCount === 1 ? "FAVORITE" : "FAVORITES"}` : tonightStory.signalLabel}
                  </Text>
                </View>
              );
            })()}
            {tonightStory.sports && tonightStory.sports.length > 0 && (
              <View style={styles.tonightCoverChip}>
                <Text style={styles.tonightCoverChipText}>
                  {tonightStory.sports.length} {tonightStory.sports.length === 1 ? "SPORT" : "SPORTS"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  slides.push(<DailyWrapCard key="daily-wrap" fill />);

  if (monthSnapshot) {
    slides.push((() => {
      const current = monthSnapshot.currentMonth;
      const next = monthSnapshot.nextMonth;
      const week = monthSnapshot.thisWeek;
      const totalLeagues = week
        ? week.leagues.length
        : current.leagues.length + next.leagues.length;
      const totalFinals = week
        ? (week.championshipFinals?.length ?? 0)
        : (current.championshipFinals?.length ?? 0) + (next.championshipFinals?.length ?? 0);
      return (
        <Pressable
          key="snapshot"
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: "/month-schedule",
              params: { monthSnapshotJson: JSON.stringify(monthSnapshot) },
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={`What's coming up: ${totalLeagues} leagues across ${current.monthLabel.split(" ")[0]} and ${next.monthLabel.split(" ")[0]}${totalFinals > 0 ? `, ${totalFinals} finals` : ""}`}
          style={({ pressed }) => [styles.comingUpCard, styles.cardFill, pressed && { opacity: 0.9 }]}
        >
          <ExpoImage
            source={COVER_IMAGES.comingUp}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            contentPosition="top"
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={COVER_OVERLAY_COLORS as unknown as readonly [string, string, ...string[]]}
            locations={COVER_OVERLAY_LOCATIONS as unknown as readonly [number, number, ...number[]]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.comingUpInner}>
            {monthSnapshot.thisWeek?.monthLabel && (
              <Text style={styles.comingUpDate}>
                {monthSnapshot.thisWeek.monthLabel.replace(/,\s*\d{4}$/, "").toUpperCase()}
              </Text>
            )}
            <Text style={styles.comingUpWordmark}>WHAT'S{"\n"}COMING UP</Text>
            <Text style={styles.comingUpTagline}>The big moments to look out for</Text>
            <View style={styles.comingUpChips}>
              <View style={styles.comingUpChip}>
                <Text style={styles.comingUpChipText}>
                  {totalLeagues} {totalLeagues === 1 ? "LEAGUE" : "LEAGUES"}
                </Text>
              </View>
              {totalFinals > 0 && (
                <View style={[styles.comingUpChip, styles.comingUpChipAccent]}>
                  <Text style={styles.comingUpChipText}>
                    {totalFinals} {totalFinals === 1 ? "FINAL" : "FINALS"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    })());
  }

  const deepTalkSlide = (
    <Pressable
      key="deep-talk"
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/deep-talk");
      }}
      accessibilityRole="button"
      accessibilityLabel="Behind the Stories: deeper context behind the stories you follow"
      style={({ pressed }) => [styles.deepTalkCard, styles.cardFill, pressed && { opacity: 0.9 }]}
      testID="stories-deep-talk-tile"
    >
      <ExpoImage
        source={COVER_IMAGES.deepTalk}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        contentPosition="top"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={COVER_OVERLAY_COLORS as unknown as readonly [string, string, ...string[]]}
        locations={COVER_OVERLAY_LOCATIONS as unknown as readonly [number, number, ...number[]]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.deepTalkInner}>
        <Text style={styles.deepTalkWordmark}>BEHIND THE{"\n"}STORIES</Text>
        <Text style={styles.deepTalkTagline}>The context behind the stories you follow</Text>
        <View style={styles.deepTalkChips}>
          <View style={styles.deepTalkChip}>
            <Text style={styles.deepTalkChipText}>5 TOPICS</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (cards.length > 0) {
    const distinctKinds = new Set(cards.map(c => c.kind)).size;
    slides.push(
      <Pressable
        key="trending"
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/trending-stories");
        }}
        accessibilityRole="button"
        accessibilityLabel={`Trending Stories: ${cards.length} narrative ${cards.length === 1 ? "story" : "stories"} live now`}
        style={({ pressed }) => [styles.trendingCard, styles.cardFill, pressed && { opacity: 0.9 }]}
        testID="stories-trending-tile"
      >
        <ExpoImage
          source={COVER_IMAGES.trending}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={COVER_OVERLAY_COLORS as unknown as readonly [string, string, ...string[]]}
          locations={COVER_OVERLAY_LOCATIONS as unknown as readonly [number, number, ...number[]]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.trendingInner}>
          <Text style={styles.trendingWordmark}>TRENDING{"\n"}STORIES</Text>
          <Text style={styles.trendingTagline}>Narrative intel as it happens</Text>
          <View style={styles.trendingChips}>
            <View style={styles.trendingChip}>
              <Text style={styles.trendingChipText}>
                {cards.length} {cards.length === 1 ? "STORY" : "STORIES"}
              </Text>
            </View>
            {distinctKinds > 1 && (
              <View style={styles.trendingChip}>
                <Text style={styles.trendingChipText}>
                  {distinctKinds} {distinctKinds === 1 ? "ANGLE" : "ANGLES"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  slides.push(deepTalkSlide);

  const slideWidth = feedSize.width || screenWidth;
  const slideHeight = feedSize.height || 0;
  const slideCount = slides.length;

  useEffect(() => {
    if (activeSlide >= slideCount && slideCount > 0) {
      setActiveSlide(slideCount - 1);
    }
  }, [activeSlide, slideCount]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBanner, {
        paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 20,
        minHeight: (Platform.OS === "web" ? webTopInset : insets.top) + 144,
      }]}>
        <View style={styles.headerBannerRow}>
          <Text style={styles.headerTitle}>Stories</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={onRefresh}
              hitSlop={12}
              disabled={refreshing}
              style={({ pressed }) => [styles.settingsButton, { opacity: pressed || refreshing ? 0.6 : 1 }]}
              testID="explore-refresh-button"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.85)" />
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.6 : 1 }]}
              testID="explore-settings-button"
            >
              <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>Narrative intelligence, live</Text>
      </View>

      <View
        style={styles.feedArea}
        onLayout={onFeedLayout}
      >
        {slideHeight > 0 && (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={slideWidth}
              snapToAlignment="start"
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                setActiveSlide(idx);
              }}
              scrollEventThrottle={16}
            >
              {slides.map((slide, idx) => (
                <View
                  key={(slide as any)?.key ?? idx}
                  style={[
                    styles.slide,
                    {
                      width: slideWidth,
                      height: slideHeight,
                      paddingBottom: Platform.OS === "web" ? 50 : 110,
                    },
                  ]}
                >
                  <View style={styles.slideInner}>{slide}</View>
                </View>
              ))}
              {isLoading && cards.length === 0 && (
                <View style={{ width: slideWidth, height: slideHeight, alignItems: "center", justifyContent: "center", paddingBottom: Platform.OS === "web" ? 50 : 110 }}>
                  <ActivityIndicator size="large" color={PINK} />
                </View>
              )}
            </ScrollView>
            {slides.length > 1 && (
              <View style={styles.pagerDots} pointerEvents="none">
                {slides.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.pagerDot, i === activeSlide && styles.pagerDotActive]}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  feedArea: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: "center",
  },
  slideInner: {
    width: "100%",
    flex: 1,
    maxHeight: 520,
  },
  cardFill: {
    flex: 1,
    marginBottom: 0,
  },
  pagerDots: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  pagerDotActive: {
    backgroundColor: PINK,
    width: 18,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  affiliatesTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.hockey,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.border,
    borderRightColor: Colors.border,
    borderBottomColor: Colors.border,
  },
  affiliatesIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.hockey + "1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  affiliatesTextWrap: {
    flex: 1,
  },
  affiliatesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  affiliatesSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    backgroundColor: "#2a0f1d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden",
    marginBottom: 20,
    minHeight: 280,
  },
  tonightCoverInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  tonightCoverDate: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  tonightCoverWordmark: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 10,
  },
  tonightCoverTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  tonightCoverChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  tonightCoverChip: {
    backgroundColor: PINK + "20",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PINK + "40",
  },
  tonightCoverChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.1,
  },
  tonightCoverCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  tonightCoverCtaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
    letterSpacing: 0.4,
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
  comingUpCard: {
    backgroundColor: "#2a0f1d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden" as const,
    marginBottom: 20,
    minHeight: 280,
  },
  comingUpInner: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  comingUpBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: SNAPSHOT_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  comingUpBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  comingUpWordmark: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center" as const,
    lineHeight: 44,
    marginBottom: 10,
  },
  comingUpTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  comingUpTabs: {
    flexDirection: "row" as const,
    gap: 6,
    marginBottom: 14,
  },
  comingUpTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comingUpTabActive: {
    backgroundColor: SNAPSHOT_COLOR + "30",
    borderColor: SNAPSHOT_COLOR + "70",
  },
  comingUpTabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  comingUpTabTextActive: {
    color: SNAPSHOT_COLOR,
    fontFamily: "Inter_600SemiBold",
  },
  comingUpDate: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: SNAPSHOT_COLOR,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  comingUpChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  comingUpChip: {
    backgroundColor: SNAPSHOT_COLOR + "20",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: SNAPSHOT_COLOR + "40",
  },
  comingUpChipAccent: {
    backgroundColor: PINK + "20",
    borderColor: PINK + "40",
  },
  comingUpChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.1,
  },
  comingUpCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  comingUpCtaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: SNAPSHOT_COLOR,
    letterSpacing: 0.4,
  },
  deepTalkCard: {
    backgroundColor: "#2a0f1d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden" as const,
    marginBottom: 20,
    minHeight: 280,
  },
  deepTalkInner: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  deepTalkBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: PINK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  deepTalkBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  deepTalkWordmark: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center" as const,
    lineHeight: 44,
    marginBottom: 10,
  },
  deepTalkTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  deepTalkChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  deepTalkChip: {
    backgroundColor: PINK + "20",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PINK + "40",
  },
  deepTalkChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.1,
  },
  deepTalkCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  deepTalkCtaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
    letterSpacing: 0.4,
  },
  trendingCard: {
    backgroundColor: "#2a0f1d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden" as const,
    marginBottom: 20,
    minHeight: 280,
  },
  trendingInner: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  trendingBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: TRENDING_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  trendingWordmark: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center" as const,
    lineHeight: 44,
    marginBottom: 10,
  },
  trendingTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  trendingChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  trendingChip: {
    backgroundColor: TRENDING_COLOR + "20",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TRENDING_COLOR + "40",
  },
  trendingChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.1,
  },
  trendingCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  trendingCtaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: TRENDING_COLOR,
    letterSpacing: 0.4,
  },
});
