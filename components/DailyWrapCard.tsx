import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Favorites } from "@/lib/data";
import Colors from "@/constants/colors";

const PINK = "#FF85C8";

interface DailyWrapEntry {
  eventId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  editorial: string;
  detail: string;
  winner?: string;
  loser?: string;
  winnerScore?: string;
  loserScore?: string;
  priorityScore: number;
  startTimeLocal: string;
}

interface DailyWrapResponse {
  date: string;
  hasResults: boolean;
  results: DailyWrapEntry[];
}

const SPORT_EMOJIS: Record<string, string> = {
  hockey: "🏒",
  soccer: "⚽",
  rugby: "🏉",
  basketball: "🏀",
  tennis: "🎾",
  golf: "⛳",
  racing: "🏎️",
  cricket: "🏏",
  athletics: "🏃",
};

function getSportEmoji(sport: string): string {
  return SPORT_EMOJIS[sport?.toLowerCase()] || "🏆";
}

function buildFavoriteSet(favorites: Favorites): Set<string> {
  const teams = new Set<string>();
  for (const sport of Object.values(favorites)) {
    for (const leagueTeams of Object.values(sport)) {
      for (const team of leagueTeams) {
        teams.add(team.toLowerCase());
      }
    }
  }
  return teams;
}

function isEntryFavorite(entry: DailyWrapEntry, favTeams: Set<string>): boolean {
  if (favTeams.size === 0) return false;
  return (
    favTeams.has(entry.homeTeam?.toLowerCase()) ||
    favTeams.has(entry.awayTeam?.toLowerCase()) ||
    (entry.winner ? favTeams.has(entry.winner.toLowerCase()) : false)
  );
}

export default function DailyWrapCard() {
  const { favorites } = useFavorites();
  const tz = new Date().getTimezoneOffset();

  const { data, isLoading } = useQuery<DailyWrapResponse>({
    queryKey: ["/api/daily-wrap", tz],
    queryFn: async () => {
      const url = new URL(`/api/daily-wrap?tz=${tz}`, getApiUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("daily-wrap fetch failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const { headline, secondary, favCount } = useMemo(() => {
    if (!data?.results?.length) return { headline: null, secondary: [], favCount: 0 };

    const favTeams = buildFavoriteSet(favorites);
    const tagged = data.results.map((r) => ({ ...r, isFav: isEntryFavorite(r, favTeams) }));

    // Sort: favorites first (within their priority tier), then by priority
    const favs = tagged.filter((r) => r.isFav).sort((a, b) => b.priorityScore - a.priorityScore);
    const others = tagged.filter((r) => !r.isFav).sort((a, b) => b.priorityScore - a.priorityScore);
    const ordered = [...favs, ...others];

    const [head, ...rest] = ordered;
    return { headline: head ?? null, secondary: rest, favCount: favs.length };
  }, [data, favorites]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>DAILY WRAP</Text>
          <Text style={styles.dateLabel}>{isLoading ? "Loading…" : (data?.date ?? "Today")}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="newspaper-outline" size={18} color={PINK} />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.quietState}>
          <Text style={styles.quietText}>Checking results…</Text>
        </View>
      ) : !data?.hasResults ? (
        <View style={styles.quietState}>
          <Ionicons name="moon-outline" size={22} color={Colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.quietText}>No results yet today</Text>
          <Text style={styles.quietSub}>Check back after games wrap up</Text>
        </View>
      ) : (
        <>
          {/* Headline */}
          {headline && (
            <View style={styles.headlineSection}>
              <View style={styles.headlineMeta}>
                <Text style={styles.headlineSportEmoji}>{getSportEmoji(headline.sport)}</Text>
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

          {/* Secondary results */}
          {secondary.length > 0 && (
            <View style={styles.secondaryList}>
              {secondary.map((entry, idx) => (
                <View
                  key={entry.eventId}
                  style={[styles.secondaryRow, idx === 0 && styles.secondaryRowFirst]}
                >
                  <Text style={styles.secondaryEmoji}>{getSportEmoji(entry.sport)}</Text>
                  <View style={styles.secondaryBody}>
                    <Text style={styles.secondaryEditorial}>
                      {entry.editorial}
                    </Text>
                    <Text style={styles.secondaryDetail}>
                      {entry.detail}
                    </Text>
                  </View>
                  {entry.isFav && <Text style={styles.favStar}>⭐</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Footer summary */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {data.results.length} result{data.results.length !== 1 ? "s" : ""}
              {favCount > 0 ? ` · ${favCount} from your teams` : " · Today's top results"}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden",
    marginBottom: 20,
  },
  header: {
    backgroundColor: PINK + "15",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PINK + "22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
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
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PINK + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  quietState: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 4,
  },
  quietText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  quietSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  headlineSection: {
    padding: 16,
    paddingBottom: 14,
  },
  headlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  headlineSportEmoji: {
    fontSize: 18,
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
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 26,
    marginBottom: 5,
  },
  headlineDetail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  secondaryList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "80",
    gap: 10,
  },
  secondaryRowFirst: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "80",
  },
  secondaryEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  secondaryBody: {
    flex: 1,
    gap: 2,
  },
  secondaryEditorial: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  secondaryDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  favStar: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});
