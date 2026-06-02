import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  FlatList,
  Animated,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ImageSourcePropType,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import Colors from "@/constants/colors";
import { useFavorites } from "@/lib/favorites-context";
import { getSportBackdrop } from "@/lib/sport-backdrops";

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
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch" | "rivalry_game" | "upset_alert" | "clinch_watch" | "weekend_watchlist" | "week_ahead" | "rally_weekend" | "marathon_spotlight" | "diamond_league" | "golf_major" | "grand_tour" | "ipl_storyline" | "marquee_match";
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
  weekend_watchlist: { icon: "calendar", color: "#7C4DFF", label: "Weekend Watchlist" },
  week_ahead: { icon: "calendar-outline", color: "#9575CD", label: "Week Ahead" },
  rally_weekend: { icon: "car-sport", color: "#D81B60", label: "Rally Weekend" },
  marathon_spotlight: { icon: "walk", color: "#FF5722", label: "Marathon Major" },
  diamond_league: { icon: "fitness", color: "#00ACC1", label: "Diamond League" },
  golf_major: { icon: "golf", color: "#43A047", label: "Major Championship" },
  grand_tour: { icon: "bicycle", color: "#EC407A", label: "Grand Tour" },
  ipl_storyline: { icon: "baseball", color: "#FFB300", label: "IPL" },
  marquee_match: { icon: "football", color: "#1CB0F6", label: "Marquee Match" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// --- Ken Burns: slow zoom + pan over a still image ---
function KenBurnsImage({ source }: { source: ImageSourcePropType }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 14000, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 14000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.22] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, -10] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ scale }, { translateX }, { translateY }] }]}
    >
      <ExpoImage source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
    </Animated.View>
  );
}

// --- Swipe-up affordance with a gentle looping bounce ---
function SwipeHint() {
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [offset]);

  return (
    <Animated.View style={[styles.swipeHint, { transform: [{ translateY: offset }] }]}>
      <Ionicons name="chevron-up" size={18} color={Colors.textSecondary} />
      <Text style={styles.swipeHintText}>Swipe up for next</Text>
    </Animated.View>
  );
}

function StoryPage({
  card,
  height,
  insets,
  isLast,
}: {
  card: ExploreNarrativeCard;
  height: number;
  insets: { top: number; bottom: number };
  isLast: boolean;
}) {
  const config = KIND_CONFIG[card.kind] || KIND_CONFIG.league_moment;
  const sport = card.sports?.[0];
  const backdrop = sport ? getSportBackdrop(sport, card.id) : null;
  const showKenBurns = !!backdrop;

  const handleReadMore = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/narrative/[id]",
      params: { id: card.id, cardJson: JSON.stringify(card) },
    });
  };

  return (
    <View style={[styles.page, { height }]}>
      {showKenBurns ? (
        <>
          <KenBurnsImage source={backdrop as ImageSourcePropType} />
          <LinearGradient
            colors={[config.color + "40", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={[config.color + "33", Colors.background, "#000000"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={[
          styles.pageInner,
          { paddingTop: insets.top + 84, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Hero — kind badge + big headline */}
        <View style={styles.headlineWrap}>
          <View style={styles.kindRow}>
            <View style={[styles.kindBadge, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon} size={12} color="#fff" />
              <Text style={styles.kindLabel}>{config.label}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo(card.triggeredAt)}</Text>
          </View>
          <Text style={[styles.headline, { color: Colors.textPrimary }]}>{card.title}</Text>
          <View style={[styles.headlineRule, { backgroundColor: config.color }]} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.infoCard, { borderColor: config.color + "55" }]}>
            <View style={[styles.infoTopBar, { backgroundColor: config.color }]} />
            <Text style={styles.infoBody}>{card.subtitle}</Text>
            {card.impact ? (
              <View style={styles.impactRow}>
                <Ionicons name="link-outline" size={13} color={PINK} />
                <Text style={styles.impactText} numberOfLines={2}>
                  {card.impact.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleReadMore}
            style={({ pressed }) => [
              styles.readBtn,
              { borderColor: config.color + "88", backgroundColor: config.color + "1A" },
              pressed && { opacity: 0.75 },
            ]}
            testID={`trending-read-${card.id}`}
          >
            <Text style={[styles.readBtnText, { color: config.color }]}>Read full story</Text>
            <Ionicons name="arrow-forward" size={15} color={config.color} />
          </Pressable>

          {!isLast && <SwipeHint />}
        </View>
      </View>
    </View>
  );
}

export default function TrendingStoriesScreen() {
  const rawInsets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { disabledSports } = useFavorites();
  const [index, setIndex] = useState(0);

  const insets = useMemo(
    () => ({
      top: Platform.OS === "web" ? Math.max(rawInsets.top, 67) : rawInsets.top,
      bottom: Platform.OS === "web" ? Math.max(rawInsets.bottom, 34) : rawInsets.bottom,
    }),
    [rawInsets.top, rawInsets.bottom]
  );

  const { data, isLoading } = useQuery<{ cards: ExploreNarrativeCard[] }>({
    queryKey: ["/api/narratives"],
  });

  const cards = useMemo(() => {
    const allCards = data?.cards ?? [];
    if (disabledSports.size === 0) return allCards;
    return allCards.filter((card) => {
      const cardSports = card.sports;
      if (!cardSports || cardSports.length === 0) return true;
      return cardSports.some((s) => !disabledSports.has(s.toLowerCase()));
    });
  }, [data, disabledSports]);

  // Keep the active index in range if the list shrinks on a refresh.
  useEffect(() => {
    if (cards.length > 0 && index > cards.length - 1) {
      setIndex(cards.length - 1);
    }
  }, [cards.length, index]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.y / height);
      if (next !== index) {
        setIndex(next);
        if (Platform.OS !== "web") Haptics.selectionAsync();
      }
    },
    [height, index]
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: height, offset: height * i, index: i }),
    [height]
  );

  return (
    <View style={styles.screen}>
      {cards.length > 0 && (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index: i }) => (
            <StoryPage
              card={item}
              height={height}
              insets={insets}
              isLast={i === cards.length - 1}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onScrollEnd}
          scrollEnabled={cards.length > 1}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
        />
      )}

      {(isLoading || cards.length === 0) && (
        <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Ionicons
            name={isLoading ? "hourglass-outline" : "flame-outline"}
            size={32}
            color={Colors.textMuted}
          />
          <Text style={styles.mutedText}>
            {isLoading ? "Loading stories…" : "No trending stories"}
          </Text>
          {!isLoading && (
            <Text style={styles.mutedSub}>
              Check back soon — new stories roll in as live signals arrive
            </Text>
          )}
        </View>
      )}

      {/* Top overlay: back, title, progress segments */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {cards.length > 0 && (
          <View style={styles.segments}>
            {cards.map((c, i) => (
              <View
                key={c.id}
                style={[styles.segment, { backgroundColor: i <= index ? Colors.textPrimary : "rgba(255,255,255,0.22)" }]}
              />
            ))}
          </View>
        )}
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            testID="trending-stories-back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.kicker}>LIVE FEED</Text>
            <Text style={styles.dateLabel} numberOfLines={1}>
              Trending Stories
            </Text>
          </View>
          {cards.length > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {Math.min(index + 1, cards.length)}/{cards.length}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  page: {
    width: "100%",
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "space-between",
  },
  headlineWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 18,
  },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    color: Colors.textSecondary,
  },
  headline: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headlineRule: {
    width: 56,
    height: 4,
    borderRadius: 2,
  },
  footer: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 16,
    gap: 12,
    overflow: "hidden",
  },
  infoTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  infoBody: {
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  impactText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  readBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  swipeHint: {
    alignItems: "center",
    gap: 2,
    paddingTop: 2,
  },
  swipeHintText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 12,
  },
  segments: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  titleWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: TRENDING_COLOR,
    letterSpacing: 1.8,
  },
  dateLabel: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  counter: {
    alignItems: "flex-end",
  },
  counterText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mutedText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  mutedSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
