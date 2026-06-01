import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Favorites } from "@/lib/data";
import type { ScoreData } from "@/lib/scores-context";
import Colors from "@/constants/colors";

const PINK = "#FF85C8";

const COVER_IMAGE = require("@/assets/images/stories/daily-wrap.png");
const COVER_OVERLAY_COLORS = ["rgba(15,18,22,0.15)", "rgba(15,18,22,0.55)", "rgba(15,18,22,0.95)"] as const;
const COVER_OVERLAY_LOCATIONS = [0, 0.5, 1] as const;

export interface SvnsFinal {
  gender: "mens" | "womens";
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}

export interface AthleticsResult {
  discipline: string;
  athlete: string;
  nation: string;
  rank: number;
  performance: string;
  record?: string;
}

export interface DailyWrapEntry {
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
  svnsFinals?: SvnsFinal[];
  athleticsResults?: AthleticsResult[];
  athleticsMeet?: { city: string; scope: "sa" | "top" };
  scoreSnapshot?: ScoreData;
  priorityScore: number;
  startTimeLocal: string;
  isFav?: boolean;
  video?: HighlightVideo;
}

export interface HighlightVideo {
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  title: string;
  channel?: string;
}

export interface DailyWrapResponse {
  date: string;
  hasResults: boolean;
  results: DailyWrapEntry[];
}

export const SPORT_EMOJIS: Record<string, string> = {
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

export function getSportEmoji(sport: string): string {
  return SPORT_EMOJIS[sport?.toLowerCase()] || "🏆";
}

export function buildFavoriteSet(favorites: Favorites): Set<string> {
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

export function isEntryFavorite(entry: DailyWrapEntry, favTeams: Set<string>): boolean {
  if (favTeams.size === 0) return false;
  return (
    favTeams.has(entry.homeTeam?.toLowerCase()) ||
    favTeams.has(entry.awayTeam?.toLowerCase()) ||
    (entry.winner ? favTeams.has(entry.winner.toLowerCase()) : false)
  );
}

export function tagEntries(results: DailyWrapEntry[], favorites: Favorites) {
  const favTeams = buildFavoriteSet(favorites);
  const tagged = results.map((r) => ({ ...r, isFav: isEntryFavorite(r, favTeams) }));
  const favs = tagged.filter((r) => r.isFav).sort((a, b) => b.priorityScore - a.priorityScore);
  const others = tagged.filter((r) => !r.isFav).sort((a, b) => b.priorityScore - a.priorityScore);
  return [...favs, ...others];
}

export default function DailyWrapCard({ fill = false }: { fill?: boolean } = {}) {
  const { favorites } = useFavorites();
  const router = useRouter();
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

  const { favCount, total } = useMemo(() => {
    if (!data?.results?.length) return { favCount: 0, total: 0 };
    const ordered = tagEntries(data.results, favorites);
    const favs = ordered.filter((r) => r.isFav);
    return {
      favCount: favs.length,
      total: data.results.length,
    };
  }, [data, favorites]);

  const handleOpen = () => router.push("/daily-wrap-full");

  const renderCover = () => {
    if (isLoading) {
      return (
        <View style={styles.coverInner}>
          <Text style={styles.coverTagline}>Loading today's stories…</Text>
        </View>
      );
    }
    if (!data?.hasResults) {
      return (
        <View style={styles.coverInner}>
          <Ionicons name="moon-outline" size={26} color={PINK} style={{ marginBottom: 10, opacity: 0.85 }} />
          <Text style={styles.coverWordmark}>THE DAILY{"\n"}WRAP</Text>
          <Text style={styles.coverTagline}>No results yet today</Text>
          <Text style={styles.coverSub}>Check back after games wrap up</Text>
        </View>
      );
    }
    return (
      <View style={styles.coverInner}>
        <Text style={styles.coverDate}>{data?.date ?? "Today"}</Text>
        <Text style={styles.coverWordmark}>THE DAILY{"\n"}WRAP</Text>
        <Text style={styles.coverTagline}>Today's stories, in one place</Text>
        <View style={styles.coverMetaRow}>
          <View style={styles.coverChip}>
            <Text style={styles.coverChipText}>{total} {total === 1 ? "STORY" : "STORIES"}</Text>
          </View>
          {favCount > 0 && (
            <View style={[styles.coverChip, styles.coverChipFav]}>
              <Text style={styles.coverChipText}>{favCount} {favCount === 1 ? "FAVORITE" : "FAVORITES"}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Pressable onPress={handleOpen} style={({ pressed }) => [styles.card, fill && { flex: 1, marginBottom: 0 }, pressed && styles.cardPressed]}>
      <ExpoImage
        source={COVER_IMAGE}
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
      {renderCover()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2a0f1d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PINK + "40",
    overflow: "hidden",
    marginBottom: 20,
    minHeight: 280,
  },
  cardPressed: {
    opacity: 0.9,
  },
  coverInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  coverDate: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  coverWordmark: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 10,
  },
  coverTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  coverSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  coverMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  coverChip: {
    backgroundColor: PINK + "20",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PINK + "40",
  },
  coverChipFav: {
    backgroundColor: PINK + "20",
    borderColor: PINK + "40",
  },
  coverChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.1,
  },
  coverCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  coverCtaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
    letterSpacing: 0.4,
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
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "80",
    gap: 10,
  },
  secondaryRowLast: {
    borderBottomWidth: 0,
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
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
});
