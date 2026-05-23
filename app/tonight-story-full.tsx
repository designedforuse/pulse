import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

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

export default function TonightStoryFullScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Tonight's Story", headerBackTitle: "Stories" });
  }, [navigation]);

  const { data, isLoading } = useQuery<{ tonightStory: TonightStory | null }>({
    queryKey: ["/api/narratives"],
    staleTime: 60 * 1000,
  });

  const story = data?.tonightStory ?? null;

  const handleCta = () => {
    if (!story) return;
    if (story.signalType === "multi_team_night" || story.signalType === "single_team_game") {
      router.push("/(tabs)/watch");
    } else if (story.sourceCard?.id) {
      router.push({ pathname: "/narrative/[id]", params: { id: story.sourceCard.id } });
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={styles.hero}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE SIGNAL</Text>
          {story?.signalLabel && <Text style={styles.signalLabel}> · {story.signalLabel}</Text>}
        </View>
        <Text style={styles.kicker}>TONIGHT'S STORY</Text>
      </View>

      <View style={styles.body}>
        {isLoading ? (
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
                onPress={handleCta}
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
});
