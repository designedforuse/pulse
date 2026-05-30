import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import { useEvents } from "@/lib/events-context";
import { useScores } from "@/lib/scores-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import CatchUpCard from "@/components/CatchUpCard";
import type { SportEvent } from "@/lib/data";
import {
  getSportEmoji,
  tagEntries,
  type DailyWrapEntry,
  type DailyWrapResponse,
} from "@/components/DailyWrapCard";

const PINK = "#FF85C8";
const FOLD = 10;

// Fallback card for entries whose full event is no longer in the cache.
function FallbackCard({
  entry,
}: {
  entry: DailyWrapEntry & { isFav?: boolean };
}) {
  return (
    <View style={styles.fallbackCard}>
      <View style={styles.fallbackAccent} />
      <View style={styles.fallbackBody}>
        <View style={styles.fallbackTop}>
          <Text style={styles.fallbackEmoji}>{getSportEmoji(entry.sport)}</Text>
          <Text style={styles.fallbackLeague}>{entry.league.toUpperCase()}</Text>
          {entry.isFav && (
            <Ionicons name="star" size={13} color={Colors.favStar} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.fallbackEditorial}>{entry.editorial}</Text>
        <Text style={styles.fallbackDetail}>{entry.detail}</Text>
      </View>
    </View>
  );
}

export default function DailyWrapFullScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();
  const { allEvents } = useEvents();
  const { getScore } = useScores();
  const tz = new Date().getTimezoneOffset();
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Daily Wrap", headerBackTitle: "Stories" });
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

  const { ordered, favCount, total } = useMemo(() => {
    if (!data?.results?.length) return { ordered: [], favCount: 0, total: 0 };
    const tagged = tagEntries(data.results, favorites) as (DailyWrapEntry & { isFav?: boolean })[];
    return {
      ordered: tagged,
      favCount: tagged.filter((r) => r.isFav).length,
      total: data.results.length,
    };
  }, [data, favorites]);

  const visible = expanded ? ordered : ordered.slice(0, FOLD);
  const hiddenCount = ordered.length - FOLD;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Date header */}
      <View style={styles.dateRow}>
        <Text style={styles.kicker}>DAILY WRAP</Text>
        <Text style={styles.dateLabel}>{isLoading ? "Loading…" : (data?.date ?? "Today")}</Text>
        {favCount > 0 && (
          <Text style={styles.favSummary}>{favCount} from your teams</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Loading results…</Text>
        </View>
      ) : !data?.hasResults ? (
        <View style={styles.center}>
          <Ionicons name="moon-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.mutedText}>No results yet today</Text>
          <Text style={styles.mutedSub}>Check back after games wrap up</Text>
        </View>
      ) : (
        <>
          {/* Vertical feed of catch-up cards */}
          <View style={styles.feed}>
            {visible.map((entry) => {
              const ev = eventMap.get(entry.eventId);
              return ev ? (
                <CatchUpCard
                  key={entry.eventId}
                  event={ev}
                  score={getScore(ev.id)}
                  isFav={entry.isFav}
                />
              ) : (
                <FallbackCard key={entry.eventId} entry={entry} />
              );
            })}

            {/* Accordion toggle */}
            {!expanded && hiddenCount > 0 && (
              <Pressable
                style={({ pressed }) => [styles.accordionRow, pressed && { opacity: 0.7 }]}
                onPress={() => setExpanded(true)}
              >
                <Ionicons name="chevron-down" size={15} color={PINK} />
                <Text style={styles.accordionText}>
                  Show {hiddenCount} more result{hiddenCount !== 1 ? "s" : ""}
                </Text>
              </Pressable>
            )}

            {expanded && hiddenCount > 0 && (
              <Pressable
                style={({ pressed }) => [styles.accordionRow, pressed && { opacity: 0.7 }]}
                onPress={() => setExpanded(false)}
              >
                <Ionicons name="chevron-up" size={15} color={PINK} />
                <Text style={styles.accordionText}>Show less</Text>
              </Pressable>
            )}
          </View>

          {/* Total count */}
          <Text style={styles.totalText}>{total} results today</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  dateRow: {
    paddingBottom: 4,
    gap: 2,
  },
  kicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  dateLabel: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  favSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  center: {
    alignItems: "center",
    paddingVertical: 60,
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
  feed: {
    gap: 0,
  },
  fallbackCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fallbackAccent: {
    width: 4,
    backgroundColor: "#A78BFA",
  },
  fallbackBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  fallbackTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fallbackEmoji: {
    fontSize: 16,
  },
  fallbackLeague: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  fallbackEditorial: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  fallbackDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  accordionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    marginTop: 2,
  },
  accordionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  totalText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
});
