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
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import Colors from "@/constants/colors";
import { getSportBackdrop } from "@/lib/sport-backdrops";

interface DeepTalkTopic {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  route: string;
  // Optional sport key used to pick a Ken Burns backdrop image. Topics without
  // a mapped backdrop fall back to an accent-tinted gradient.
  backdropSport?: string;
}

export const TOPICS: DeepTalkTopic[] = [
  {
    id: "hockey-family-tree",
    title: "Hockey Family Tree",
    subtitle: "NHL → AHL → ECHL affiliations and why farm-team games matter",
    icon: "git-network-outline",
    accent: Colors.hockey,
    route: "/affiliates",
    backdropSport: "hockey",
  },
  {
    id: "cycling-circuits",
    title: "Cycling Circuits",
    subtitle: "Grand Tours and the Epic Series MTB stage races — what they are and why they matter",
    icon: "bicycle",
    accent: Colors.cycling,
    route: "/cycling-circuits",
    backdropSport: "cycling",
  },
  {
    id: "endurance-athletics",
    title: "Endurance Athletics",
    subtitle: "Marathon Majors, Comrades, Diamond League, Golden Trail, and UTMB — the elite running circuits explained",
    icon: "walk-outline",
    accent: Colors.athletics,
    route: "/endurance-athletics",
    backdropSport: "athletics",
  },
  {
    id: "paddling-101",
    title: "Paddling 101",
    subtitle: "South Africa's Big Three canoe marathons — the unofficial triple crown of river racing",
    icon: "boat",
    accent: Colors.paddling,
    route: "/paddling-101",
  },
  {
    id: "horse-racing-101",
    title: "Triple Crown 101",
    subtitle: "The Kentucky Derby, Preakness, and Belmont Stakes — why winning all three is generational",
    icon: "ribbon",
    accent: Colors["horse-racing"],
    route: "/horse-racing-101",
  },
  {
    id: "racing-101",
    title: "Racing 101",
    subtitle: "Formula 1 circuits and World Rally Championship stages — how motorsport's two pinnacles work",
    icon: "car-sport",
    accent: Colors.racing,
    route: "/racing-101",
    backdropSport: "racing",
  },
];

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

function TopicPage({
  topic,
  height,
  insets,
  isLast,
}: {
  topic: DeepTalkTopic;
  height: number;
  insets: { top: number; bottom: number };
  isLast: boolean;
}) {
  const backdrop = topic.backdropSport ? getSportBackdrop(topic.backdropSport, topic.id) : null;
  const showKenBurns = !!backdrop;

  const handleOpen = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(topic.route as never);
  };

  return (
    <View style={[styles.page, { height }]}>
      {showKenBurns ? (
        <>
          <KenBurnsImage source={backdrop as ImageSourcePropType} />
          <LinearGradient
            colors={[topic.accent + "40", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={[topic.accent + "33", Colors.background, "#000000"]}
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
        {/* Hero — playbook badge + big headline */}
        <View style={styles.headlineWrap}>
          <View style={styles.kindRow}>
            <View style={[styles.kindBadge, { backgroundColor: topic.accent }]}>
              <Ionicons name={topic.icon} size={12} color="#fff" />
              <Text style={styles.kindLabel}>PLAYBOOK</Text>
            </View>
          </View>
          <Text style={[styles.headline, { color: Colors.textPrimary }]}>{topic.title}</Text>
          <View style={[styles.headlineRule, { backgroundColor: topic.accent }]} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.infoCard, { borderColor: topic.accent + "55" }]}>
            <View style={[styles.infoTopBar, { backgroundColor: topic.accent }]} />
            <Text style={styles.infoBody}>{topic.subtitle}</Text>
          </View>

          <Pressable
            onPress={handleOpen}
            style={({ pressed }) => [
              styles.readBtn,
              { borderColor: topic.accent + "88", backgroundColor: topic.accent + "1A" },
              pressed && { opacity: 0.75 },
            ]}
            testID={`deep-talk-${topic.id}`}
          >
            <Text style={[styles.readBtnText, { color: topic.accent }]}>Open playbook</Text>
            <Ionicons name="arrow-forward" size={15} color={topic.accent} />
          </Pressable>

          {!isLast && <SwipeHint />}
        </View>
      </View>
    </View>
  );
}

export default function DeepTalkScreen() {
  const rawInsets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const insets = useMemo(
    () => ({
      top: Platform.OS === "web" ? Math.max(rawInsets.top, 67) : rawInsets.top,
      bottom: Platform.OS === "web" ? Math.max(rawInsets.bottom, 34) : rawInsets.bottom,
    }),
    [rawInsets.top, rawInsets.bottom]
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
      <FlatList
        data={TOPICS}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index: i }) => (
          <TopicPage
            topic={item}
            height={height}
            insets={insets}
            isLast={i === TOPICS.length - 1}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onScrollEnd}
        scrollEnabled={TOPICS.length > 1}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews
      />

      {/* Top overlay: back, title, progress segments */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.segments}>
          {TOPICS.map((t, i) => (
            <View
              key={t.id}
              style={[styles.segment, { backgroundColor: i <= index ? Colors.textPrimary : "rgba(255,255,255,0.22)" }]}
            />
          ))}
        </View>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            testID="deep-talk-back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.kicker}>PLAYBOOK</Text>
            <Text style={styles.dateLabel} numberOfLines={1}>
              Behind the Stories
            </Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {Math.min(index + 1, TOPICS.length)}/{TOPICS.length}
            </Text>
          </View>
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
    color: Colors.hockey,
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
});
