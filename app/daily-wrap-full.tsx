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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  getSportEmoji,
  buildFavoriteSet,
  isEntryFavorite,
  tagEntries,
  type DailyWrapEntry,
  type DailyWrapResponse,
} from "@/components/DailyWrapCard";

const PINK = "#FF85C8";
const FOLD = 19;

function ResultRow({
  entry,
  isLast,
}: {
  entry: DailyWrapEntry & { isFav?: boolean };
  isLast: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowEmoji}>{getSportEmoji(entry.sport)}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowEditorial}>{entry.editorial}</Text>
        <Text style={styles.rowDetail}>{entry.detail}</Text>
      </View>
      {entry.isFav && <Text style={styles.favStar}>⭐</Text>}
    </View>
  );
}

export default function DailyWrapFullScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();
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

  const { headline, secondary, favCount, total } = useMemo(() => {
    if (!data?.results?.length) return { headline: null, secondary: [], favCount: 0, total: 0 };
    const ordered = tagEntries(data.results, favorites);
    const favs = ordered.filter((r) => r.isFav);
    const [head, ...rest] = ordered;
    return {
      headline: head ?? null,
      secondary: rest as (DailyWrapEntry & { isFav?: boolean })[],
      favCount: favs.length,
      total: data.results.length,
    };
  }, [data, favorites]);

  const visible = expanded ? secondary : secondary.slice(0, FOLD);
  const hiddenCount = secondary.length - FOLD;

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
          {/* Headline card */}
          {headline && (
            <View style={styles.headlineCard}>
              <View style={styles.headlineMeta}>
                <Text style={styles.headlineEmoji}>{getSportEmoji(headline.sport)}</Text>
                <Text style={styles.headlineLeague}>{headline.league.toUpperCase()}</Text>
                {headline.isFav && (
                  <View style={styles.favBadge}>
                    <Text style={styles.favBadgeText}>⭐ YOUR TEAM</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headlineEditorial}>{headline.editorial}</Text>
              <Text style={styles.headlineDetail}>{headline.detail}</Text>
            </View>
          )}

          {/* All other results */}
          {secondary.length > 0 && (
            <View style={styles.listCard}>
              {visible.map((entry, idx) => (
                <ResultRow
                  key={entry.eventId}
                  entry={entry}
                  isLast={idx === visible.length - 1 && (expanded || hiddenCount <= 0)}
                />
              ))}

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

              {expanded && (
                <Pressable
                  style={({ pressed }) => [styles.accordionRow, pressed && { opacity: 0.7 }]}
                  onPress={() => setExpanded(false)}
                >
                  <Ionicons name="chevron-up" size={15} color={PINK} />
                  <Text style={styles.accordionText}>Show less</Text>
                </Pressable>
              )}
            </View>
          )}

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
  headlineCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PINK + "30",
    padding: 16,
  },
  headlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  headlineEmoji: {
    fontSize: 20,
  },
  headlineLeague: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  favBadge: {
    backgroundColor: "#FFD70022",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  favBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 0.8,
  },
  headlineEditorial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 6,
  },
  headlineDetail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  listCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "80",
    gap: 10,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowEditorial: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  rowDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  favStar: {
    fontSize: 13,
    marginTop: 1,
  },
  accordionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
