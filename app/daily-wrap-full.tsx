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
  type ImageSourcePropType,
} from "react-native";
import { useNavigation, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
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
import UnifiedEventCard from "@/components/UnifiedEventCard";
import {
  getSportColor,
  getEffectiveSport,
  getSchoolsLeagueLabel,
  resolveProviderDisplay,
  type SportEvent,
} from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import { getCatchUpTeaser, type TeaserMood } from "@/lib/catchUpTeasers";
import { getSportBackdrop } from "@/lib/sport-backdrops";
import { normalizeGameState } from "@/utils/gameState";
import {
  tagEntries,
  type DailyWrapEntry,
  type DailyWrapResponse,
  type HighlightVideo,
  type SvnsFinal,
  type AthleticsResult,
} from "@/components/DailyWrapCard";

const PINK = "#FF85C8";

const MOOD_COLORS: Record<TeaserMood, string> = {
  high: "#FB923C",
  medium: "#A78BFA",
  low: Colors.textSecondary,
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
  backdrop?: ImageSourcePropType | null;
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

// --- HSBC SVNS Cup Final score card (men's first, then women's) ---
function SvnsFinalsCard({
  finals,
  sportColor,
  league,
}: {
  finals: SvnsFinal[];
  sportColor: string;
  league: string;
}) {
  return (
    <View style={[styles.svnsCard, { borderColor: sportColor + "55" }]}>
      <View style={[styles.svnsTopBar, { backgroundColor: sportColor }]} />
      <View style={styles.svnsHeader}>
        <View
          style={[
            styles.svnsLeagueChip,
            { backgroundColor: sportColor + "1F", borderColor: sportColor + "55" },
          ]}
        >
          <Text style={[styles.svnsLeagueChipText, { color: sportColor }]} numberOfLines={1}>
            {league}
          </Text>
        </View>
        <Text style={styles.svnsCupFinalLabel}>CUP FINAL</Text>
      </View>
      {finals.map((f, i) => (
        <View key={f.gender} style={[styles.svnsRow, i > 0 && styles.svnsRowDivider]}>
          <Text style={styles.svnsGenderLabel}>{f.gender === "mens" ? "MEN" : "WOMEN"}</Text>
          <View style={styles.svnsTeams}>
            <View style={styles.svnsTeamLine}>
              <Text style={[styles.svnsTeamName, styles.svnsWinnerName]} numberOfLines={1}>
                {f.winner}
              </Text>
              <Text style={[styles.svnsScore, { color: sportColor }]}>{f.winnerScore}</Text>
            </View>
            <View style={styles.svnsTeamLine}>
              <Text style={styles.svnsTeamName} numberOfLines={1}>
                {f.loser}
              </Text>
              <Text style={styles.svnsScore}>{f.loserScore}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Diamond League (athletics) results card ---
function ordinal(rank: number): string {
  if (rank >= 11 && rank <= 13) return `${rank}th`;
  const suffix = ["th", "st", "nd", "rd"][rank % 10] || "th";
  return `${rank}${suffix}`;
}

function AthleticsResultsCard({
  results,
  meet,
  league,
  sportColor,
}: {
  results: AthleticsResult[];
  meet?: { city: string; scope: "sa" | "top" };
  league: string;
  sportColor: string;
}) {
  const showNation = meet?.scope === "top";
  const scopeLabel = meet?.scope === "sa" ? "SOUTH AFRICANS" : "TOP RESULTS";
  return (
    <View style={[styles.svnsCard, { borderColor: sportColor + "55" }]}>
      <View style={[styles.svnsTopBar, { backgroundColor: sportColor }]} />
      <View style={styles.svnsHeader}>
        <View
          style={[
            styles.svnsLeagueChip,
            { backgroundColor: sportColor + "1F", borderColor: sportColor + "55" },
          ]}
        >
          <Text style={[styles.svnsLeagueChipText, { color: sportColor }]} numberOfLines={1}>
            {meet?.city ? `${league} · ${meet.city}` : league}
          </Text>
        </View>
        <Text style={styles.svnsCupFinalLabel}>{scopeLabel}</Text>
      </View>
      {results.map((r, i) => (
        <View key={`${r.athlete}-${r.discipline}`} style={[styles.athRow, i > 0 && styles.svnsRowDivider]}>
          <View style={[styles.athRankPill, { backgroundColor: sportColor + "1F" }]}>
            <Text style={[styles.athRankText, { color: sportColor }]}>{ordinal(r.rank)}</Text>
          </View>
          <View style={styles.athBody}>
            <Text style={styles.athName} numberOfLines={1}>
              {r.athlete}
              {showNation && r.nation ? <Text style={styles.athNation}> {r.nation}</Text> : null}
            </Text>
            <Text style={styles.athDiscipline} numberOfLines={1}>
              {r.discipline}
              {r.record ? ` · ${r.record}` : ""}
            </Text>
          </View>
          {r.performance ? (
            <Text style={[styles.athPerformance, { color: sportColor }]}>{r.performance}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// One-time iOS audio-session setup so narration is audible even on silent mode.
let audioModeReady = false;

// Single shared narrator: only one headline plays at a time. Loads the clip
// from the backend TTS route (expo-audio) and cleans up on story change /
// unmount so audio never bleeds across stories.
function useHeadlineAudio() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const reqRef = useRef(0);

  const stop = useCallback(() => {
    reqRef.current += 1;
    subRef.current?.remove();
    subRef.current = null;
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.remove();
      } catch {
        // already released
      }
    }
  }, []);

  const play = useCallback(
    async (text: string) => {
      stop();
      const req = ++reqRef.current;
      try {
        if (Platform.OS !== "web" && !audioModeReady) {
          await setAudioModeAsync({ playsInSilentMode: true });
          audioModeReady = true;
        }
        // A newer request superseded this one while configuring audio.
        if (req !== reqRef.current) return;
        const url = new URL(
          `/api/daily-wrap/audio.mp3?text=${encodeURIComponent(text)}`,
          getApiUrl()
        ).toString();
        const player = createAudioPlayer({ uri: url }, { downloadFirst: true });
        if (req !== reqRef.current) {
          try {
            player.remove();
          } catch {
            // ignore
          }
          return;
        }
        playerRef.current = player;
        const sub = player.addListener("playbackStatusUpdate", (st) => {
          if (req !== reqRef.current) return;
          if (st.didJustFinish) {
            subRef.current?.remove();
            subRef.current = null;
            if (playerRef.current === player) playerRef.current = null;
            try {
              player.remove();
            } catch {
              // ignore
            }
          }
        });
        subRef.current = sub;
        player.play();
      } catch (err) {
        console.warn("[tts] failed to play clip:", err);
      }
    },
    [stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { play, stop };
}

function StoryPage({
  view,
  height,
  insets,
  isLast,
  hideSpoilers,
}: {
  view: StoryView;
  height: number;
  insets: { top: number; bottom: number };
  isLast: boolean;
  hideSpoilers: boolean;
}) {
  const { entry, event, score, mood, headline, sportColor, video, backdrop } = view;
  const moodColor = MOOD_COLORS[mood];
  const provider = event ? resolveProviderDisplay(event) : null;
  const showKenBurns = !!backdrop;
  const showScoreCard = !hideSpoilers && !!event && !!score;

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

  return (
    <View style={[styles.page, { height }]}>
      {showKenBurns ? (
        <>
          <KenBurnsImage source={backdrop as ImageSourcePropType} />
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
        {/* Hero — big headline over the Ken Burns image */}
        <View style={styles.headlineWrap}>
          <Text style={[styles.headline, { color: Colors.textPrimary }]}>{headline}</Text>
          <View style={[styles.headlineRule, { backgroundColor: moodColor }]} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {showScoreCard && event ? (
            <UnifiedEventCard
              event={event}
              now={new Date()}
              score={score}
              espnLayout
              dailyWrap
              accentBarColor={sportColor}
            />
          ) : !hideSpoilers && entry.svnsFinals && entry.svnsFinals.length > 0 ? (
            <SvnsFinalsCard
              finals={entry.svnsFinals}
              sportColor={sportColor}
              league={entry.league}
            />
          ) : !hideSpoilers && entry.athleticsResults && entry.athleticsResults.length > 0 ? (
            <AthleticsResultsCard
              results={entry.athleticsResults}
              meet={entry.athleticsMeet}
              sportColor={sportColor}
              league={entry.league}
            />
          ) : (
            <View style={styles.providerRow}>
              {provider ? (
                <ProviderLogo providerId={provider.brandId} size={20} />
              ) : (
                // entry.detail can carry the result/scoreline, so never show it
                // raw while spoilers are hidden — fall back to a neutral label.
                <Text style={styles.providerName}>{hideSpoilers ? entry.league : entry.detail}</Text>
              )}
              <View style={{ flex: 1 }} />
              {hideSpoilers && (
                <View style={styles.spoilerHint}>
                  <Ionicons name="eye-off-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.spoilerHintText}>Score hidden</Text>
                </View>
              )}
            </View>
          )}

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
  const { height } = useWindowDimensions();
  const { favorites } = useFavorites();
  const { allEvents, hideSpoilers } = useEvents();
  const { getScore } = useScores();
  const tz = new Date().getTimezoneOffset();
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const { play: playHeadline, stop: stopHeadline } = useHeadlineAudio();

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
      // Live scores expire once a game leaves the live window, so prefer the
      // live feed only while it still reports FINAL; otherwise use the final
      // snapshot captured at wrap-generation time. A live snapshot is only
      // used as a last resort when no persisted snapshot exists.
      const liveScore = event ? getScore(event.id) : undefined;
      const liveIsFinal =
        !!event && !!liveScore &&
        normalizeGameState(event, liveScore, new Date()).gameState === "FINAL";
      const score = liveIsFinal ? liveScore : (entry.scoreSnapshot ?? liveScore);
      if (event) {
        const teaser = getCatchUpTeaser(event, score);
        // Spoiler mode ON → spoiler-safe teaser; OFF → reveal the result
        // headline (e.g. "Maple Leafs beat Bruins 4–2").
        return {
          entry,
          event,
          score,
          headline: hideSpoilers ? teaser.headline : entry.editorial,
          mood: teaser.mood,
          leagueLabel: getSchoolsLeagueLabel(event.league, event.leagueKey) ?? event.league,
          sportColor: getSportColor(getEffectiveSport(event.sport, event.league, event.leagueKey)),
          video: entry.video,
          backdrop: getSportBackdrop(event.sport, entry.eventId),
        };
      }
      // No local event to build a teaser from. When spoilers are hidden, fall
      // back to a neutral matchup line rather than leaking the result.
      const safeHeadline =
        entry.homeTeam && entry.awayTeam
          ? `${entry.awayTeam} vs ${entry.homeTeam}`
          : `${entry.league} — recap`;
      return {
        entry,
        headline: hideSpoilers ? safeHeadline : entry.editorial,
        mood: "medium" as TeaserMood,
        leagueLabel: entry.league,
        sportColor: getSportColor(entry.sport),
        video: entry.video,
        backdrop: getSportBackdrop(entry.sport, entry.eventId),
      };
    });
    return { stories: built };
  }, [data, favorites, eventMap, getScore, hideSpoilers]);

  // Keep the active index in range if the list shrinks on a refresh.
  useEffect(() => {
    if (stories.length > 0 && index > stories.length - 1) {
      setIndex(stories.length - 1);
    }
  }, [stories.length, index]);

  // Autoplay the current story's headline narration (unless muted). Swapping
  // stories or toggling mute re-runs this; play() stops any prior clip first.
  const activeStory =
    stories.length > 0 ? stories[Math.min(index, stories.length - 1)] : undefined;
  const activeStoryId = activeStory?.entry.eventId;
  const activeHeadline = activeStory?.headline;
  useEffect(() => {
    if (muted || !activeHeadline) {
      stopHeadline();
      return;
    }
    void playHeadline(activeHeadline);
  }, [activeStoryId, activeHeadline, muted, playHeadline, stopHeadline]);

  // Stop narration when the screen loses focus (e.g. navigating to the replay
  // or highlights) — the screen stays mounted while blurred, so the unmount
  // cleanup alone is not enough.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopHeadline();
      };
    }, [stopHeadline])
  );

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
            <StoryPage
              view={item}
              height={height}
              insets={insets}
              isLast={i === stories.length - 1}
              hideSpoilers={hideSpoilers}
            />
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
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setMuted((m) => !m);
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.muteBtn, pressed && { opacity: 0.6 }]}
              testID="daily-wrap-mute"
            >
              <Ionicons
                name={muted ? "volume-mute" : "volume-high"}
                size={18}
                color={Colors.textPrimary}
              />
            </Pressable>
          )}
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
  footer: {
    gap: 16,
  },
  svnsCard: {
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 16,
    gap: 12,
    overflow: "hidden",
  },
  svnsTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  svnsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  svnsLeagueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  svnsLeagueChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  svnsCupFinalLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  svnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  svnsRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  svnsGenderLabel: {
    width: 46,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  svnsTeams: {
    flex: 1,
    gap: 6,
  },
  svnsTeamLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  svnsTeamName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  svnsWinnerName: {
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  svnsScore: {
    minWidth: 28,
    textAlign: "right",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  athRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  athRankPill: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  athRankText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  athBody: {
    flex: 1,
    gap: 2,
  },
  athName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  athNation: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  athDiscipline: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  athPerformance: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
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
  muteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
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
