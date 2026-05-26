import React, { useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useEvents } from "@/lib/events-context";
import UnifiedEventCard from "@/components/UnifiedEventCard";

const PINK = "#FF85C8";

interface TonightStory {
  signalType: string;
  signalLabel: string;
  headline: string;
  body: string;
  sourceEventId?: string;
  eventIds?: string[];
  sourceCard: { id: string; kind: string; title: string };
  sports?: string[];
  favoriteTeams?: string[];
}

export default function TonightStoryFullScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allEvents } = useEvents();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Today's Story", headerBackTitle: "Stories" });
  }, [navigation]);

  const { data, isLoading } = useQuery<{
    tonightStory: TonightStory | null;
    todaysStories?: TonightStory[];
  }>({
    queryKey: ["/api/narratives"],
    staleTime: 60 * 1000,
  });

  const stories: TonightStory[] = data?.todaysStories && data.todaysStories.length > 0
    ? data.todaysStories
    : data?.tonightStory
      ? [data.tonightStory]
      : [];

  const eventMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const e of allEvents) m.set(e.id, e);
    return m;
  }, [allEvents]);

  const CARD_LINKED_SIGNALS = new Set([
    "upset_alert",
    "rivalry_game",
    "clinch_watch",
    "deadline_watch",
    "playoff_push",
    "momentum",
    "league_moment",
    "player_movement",
  ]);

  const handleReadMore = (story: TonightStory) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (CARD_LINKED_SIGNALS.has(story.signalType) && story.sourceCard?.id) {
      router.push({ pathname: "/narrative/[id]", params: { id: story.sourceCard.id } });
    }
  };

  const now = new Date();

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
          {stories.length > 0 && (
            <Text style={styles.signalLabel}>
              {" · "}
              {stories.length} {stories.length === 1 ? "story" : "stories"}
            </Text>
          )}
        </View>
        <Text style={styles.kicker}>ON YOUR RADAR</Text>
      </View>

      <View style={styles.feedList}>
        {isLoading && stories.length === 0 ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : stories.length === 0 ? (
          <Text style={styles.muted}>No live signals right now. Check back closer to game time.</Text>
        ) : (
          stories.map((story, idx) => {
            const ids = story.eventIds && story.eventIds.length > 0
              ? story.eventIds
              : (story.sourceEventId ? [story.sourceEventId] : []);
            const storyEvents = ids
              .map((id) => eventMap.get(id))
              .filter(Boolean);
            const isCardLinked = CARD_LINKED_SIGNALS.has(story.signalType);
            return (
              <View key={`${story.sourceCard?.id ?? story.signalType}-${idx}`} style={styles.storyCard}>
                <View style={styles.signalRow}>
                  <View style={styles.signalBadge}>
                    <Text style={styles.signalBadgeText}>{story.signalLabel}</Text>
                  </View>
                </View>
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
                {storyEvents.length > 0 && (
                  <View style={styles.eventsList}>
                    {storyEvents.map((ev: any) => (
                      <UnifiedEventCard
                        key={ev.id}
                        event={ev}
                        now={now}
                      />
                    ))}
                  </View>
                )}
                {isCardLinked && (
                  <Pressable
                    onPress={() => handleReadMore(story)}
                    style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
                    testID={`today-story-cta-${idx}`}
                  >
                    <Text style={styles.ctaText}>Read more</Text>
                    <Ionicons name="arrow-forward" size={16} color={PINK} />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>
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
  feedList: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },
  muted: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 24,
  },
  storyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signalBadge: {
    backgroundColor: PINK + "22",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PINK + "44",
  },
  signalBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1.1,
  },
  headline: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
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
  eventsList: {
    marginTop: 6,
    gap: 10,
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
    marginTop: 6,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
});
