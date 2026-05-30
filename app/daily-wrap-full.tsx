import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  FlatList,
  Animated,
  Linking,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useNavigation, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import { useEvents } from "@/lib/events-context";
import { useScores } from "@/lib/scores-context";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import {
  getSportColor,
  getEffectiveSport,
  getSchoolsLeagueLabel,
  resolveProviderDisplay,
  type SportEvent,
} from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { getCatchUpTeaser, type TeaserMood } from "@/lib/catchUpTeasers";
import {
  tagEntries,
  type DailyWrapEntry,
  type DailyWrapResponse,
  type HighlightVideo,
} from "@/components/DailyWrapCard";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PINK = "#FF85C8";

const MOOD_COLORS: Record<TeaserMood, string> = {
  high: "#FB923C",
  medium: "#A78BFA",
  low: Colors.textSecondary,
};

const MOOD_LABELS: Record<TeaserMood, string | null> = {
  high: "MUST WATCH",
  medium: "TIGHT FINISH",
  low: null,
};

type Story = DailyWrapEntry & { isFav?: boolean };

interface StoryView {
  entry: Story;
  event?: SportEvent;
  score?: ScoreData;
  headline: string;
  mood: TeaserMood;
  leagueLabel: string;
  sportColor: string;
  video?: HighlightVideo;
  fallbackImageUrl?: string;
}

// --- Ken Burns: slow zoom + pan over a still image ---
function KenBurnsImage({ uri }: { uri: string }) {
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
      <ExpoImage source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
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
  view,
  height,
  width,
  insets,
  isLast,
}: {
  view: StoryView;
  height: number;
  width: number;
  insets: { top: number; bottom: number };
  isLast: boolean;
}) {
  const { entry, event, mood, headline, leagueLabel, sportColor, video, fallbackImageUrl } = view;
  const moodColor = MOOD_COLORS[mood];
  const moodLabel = MOOD_LABELS[mood];
  const provider = event ? resolveProviderDisplay(event) : null;
  const thumbWidth = width - 44;
  const thumbHeight = Math.round(thumbWidth * (9 / 16));
  const showKenBurns = !video && !!fallbackImageUrl;

  const handleReplay = () => {
    if (!event) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id, spoiler: "1" } });
  };

  const handleWatchHighlights = () => {
    if (!video) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Linking.openURL(video.url);
  };

  const duration = video ? formatDuration(video.durationSeconds) : "";

  return (
    <View style={[styles.page, { height }]}>
      {showKenBurns ? (
        <>
          <KenBurnsImage uri={fallbackImageUrl as string} />
          <LinearGradient
            colors={[sportColor + "40", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={[sportColor + "33", Colors.background, "#000000"]}
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
        {/* Meta row */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.leagueChip,
              { borderColor: sportColor + "66", backgroundColor: sportColor + "1F" },
            ]}
          >
            <Text style={[styles.leagueChipText, { color: sportColor }]}>{leagueLabel}</Text>
          </View>
          {entry.isFav && (
            <View style={styles.favPill}>
              <Ionicons name="star" size={12} color={Colors.favStar} />
              <Text style={styles.favPillText}>Your team</Text>
            </View>
          )}
          {moodLabel && (
            <View style={[styles.moodBadge, { backgroundColor: moodColor + "26", borderColor: moodColor + "66" }]}>
              <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
              <Text style={[styles.moodBadgeText, { color: moodColor }]}>{moodLabel}</Text>
            </View>
          )}
        </View>

        {/* Hero — highlight thumbnail when available, else big headline */}
        {video ? (
          <View style={styles.heroWrap}>
            <Pressable
              onPress={handleWatchHighlights}
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
              testID={`story-thumb-${entry.eventId}`}
            >
              <View style={[styles.thumb, { width: thumbWidth, height: thumbHeight }]}>
                <ExpoImage
                  source={{ uri: video.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playButton}>
                  <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
                <View style={styles.ytBadge}>
                  <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                </View>
                {!!duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{duration}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Text style={[styles.headlineSm, { color: Colors.textPrimary }]} numberOfLines={3}>
              {headline}
            </Text>
          </View>
        ) : (
          <View style={styles.headlineWrap}>
            <Text style={[styles.headline, { color: Colors.textPrimary }]}>{headline}</Text>
            <View style={[styles.headlineRule, { backgroundColor: moodColor }]} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.providerRow}>
            {provider ? (
              <ProviderLogo providerId={provider.brandId} size={20} />
            ) : (
              <Text style={styles.providerName}>{entry.detail}</Text>
            )}
            <View style={{ flex: 1 }} />
            {!video && (
              <View style={styles.spoilerHint}>
                <Ionicons name="eye-off-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.spoilerHintText}>Score hidden</Text>
              </View>
            )}
          </View>

          {video ? (
            <Pressable
              onPress={handleWatchHighlights}
              style={({ pressed }) => [
                styles.replayBtn,
                { borderColor: moodColor + "88", backgroundColor: moodColor + "1A" },
                pressed && { opacity: 0.75 },
              ]}
              testID={`story-highlights-${entry.eventId}`}
            >
              <Ionicons name="play" size={15} color={moodColor} />
              <Text style={[styles.replayBtnText, { color: moodColor }]}>Watch highlights</Text>
            </Pressable>
          ) : event ? (
            <Pressable
              onPress={handleReplay}
              style={({ pressed }) => [
                styles.replayBtn,
                { borderColor: moodColor + "88", backgroundColor: moodColor + "1A" },
                pressed && { opacity: 0.75 },
              ]}
              testID={`story-replay-${entry.eventId}`}
            >
              <Ionicons name="play-back" size={15} color={moodColor} />
              <Text style={[styles.replayBtnText, { color: moodColor }]}>Watch the replay</Text>
            </Pressable>
          ) : null}

          {!isLast && <SwipeHint />}
        </View>
      </View>
    </View>
  );
}

export default function DailyWrapFullScreen() {
  const navigation = useNavigation();
  const rawInsets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { favorites } = useFavorites();
  const { allEvents } = useEvents();
  const { getScore } = useScores();
  const tz = new Date().getTimezoneOffset();
  const [index, setIndex] = useState(0);

  const insets = useMemo(
    () => ({
      top: Platform.OS === "web" ? Math.max(rawInsets.top, 67) : rawInsets.top,
      bottom: Platform.OS === "web" ? Math.max(rawInsets.bottom, 34) : rawInsets.bottom,
    }),
    [rawInsets.top, rawInsets.bottom]
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { data, isLoading } = useQuery<DailyWrapResponse>({
    queryKey: ["/api/daily-wrap", tz],
    queryFn: async () => {
      const url = new URL(`/api/daily-wrap?tz=${tz}`, getApiUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("daily-wrap fetch failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const eventMap = useMemo(() => {
    const map = new Map<string, SportEvent>();
    for (const ev of allEvents) map.set(ev.id, ev);
    return map;
  }, [allEvents]);

  const { stories } = useMemo(() => {
    if (!data?.results?.length) return { stories: [] as StoryView[] };
    const tagged = tagEntries(data.results, favorites) as Story[];
    const built: StoryView[] = tagged.map((entry) => {
      const event = eventMap.get(entry.eventId);
      const score = event ? getScore(event.id) : undefined;
      if (event) {
        const teaser = getCatchUpTeaser(event, score);
        return {
          entry,
          event,
          score,
          headline: teaser.headline,
          mood: teaser.mood,
          leagueLabel: getSchoolsLeagueLabel(event.league, event.leagueKey) ?? event.league,
          sportColor: getSportColor(getEffectiveSport(event.sport, event.league, event.leagueKey)),
          video: entry.video,
          fallbackImageUrl: entry.fallbackImageUrl,
        };
      }
      return {
        entry,
        headline: entry.editorial,
        mood: "medium" as TeaserMood,
        leagueLabel: entry.league,
        sportColor: getSportColor(entry.sport),
        video: entry.video,
        fallbackImageUrl: entry.fallbackImageUrl,
      };
    });
    return { stories: built };
  }, [data, favorites, eventMap, getScore]);

  // Keep the active index in range if the list shrinks on a refresh.
  useEffect(() => {
    if (stories.length > 0 && index > stories.length - 1) {
      setIndex(stories.length - 1);
    }
  }, [stories.length, index]);

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
      {stories.length > 0 && (
        <FlatList
          data={stories}
          keyExtractor={(s) => s.entry.eventId}
          renderItem={({ item, index: i }) => (
            <StoryPage view={item} height={height} width={width} insets={insets} isLast={i === stories.length - 1} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onScrollEnd}
          scrollEnabled={stories.length > 1}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
        />
      )}

      {(isLoading || stories.length === 0) && (
        <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Ionicons
            name={isLoading ? "hourglass-outline" : "moon-outline"}
            size={32}
            color={Colors.textMuted}
          />
          <Text style={styles.mutedText}>{isLoading ? "Loading results…" : "No results yet today"}</Text>
          {!isLoading && <Text style={styles.mutedSub}>Check back after games wrap up</Text>}
        </View>
      )}

      {/* Top overlay: back, title, progress segments */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {stories.length > 0 && (
          <View style={styles.segments}>
            {stories.map((s, i) => (
              <View
                key={s.entry.eventId}
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
            testID="daily-wrap-back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.kicker}>DAILY WRAP</Text>
            <Text style={styles.dateLabel} numberOfLines={1}>
              {data?.date ?? "Today"}
            </Text>
          </View>
          {stories.length > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {Math.min(index + 1, stories.length)}/{stories.length}
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  leagueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  leagueChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  favPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.favStarDim,
  },
  favPillText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
  },
  headlineWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
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
  heroWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 22,
  },
  thumb: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111111",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 60,
    height: 60,
    marginTop: -30,
    marginLeft: -30,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  ytBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  durationText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  headlineSm: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  footer: {
    gap: 16,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  providerName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  spoilerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spoilerHintText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  replayBtnText: {
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
    color: PINK,
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
  },
});
