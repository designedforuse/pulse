import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const SNAPSHOT_COLOR = "#6366F1";

const SPORT_EMOJI: Record<string, string> = {
  hockey: "🏒",
  soccer: "⚽",
  basketball: "🏀",
  rugby: "🏉",
  tennis: "🎾",
  racing: "🏎",
  golf: "⛳",
  cricket: "🏏",
  athletics: "🏃",
};

const SPORT_ORDER = ["hockey", "basketball", "soccer", "rugby", "tennis", "racing", "golf", "cricket", "athletics"];

interface MonthSnapshotLeague {
  sport: string;
  displayName: string;
  leagueKey: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  eventCount: number;
  seasonPhase?: string | null;
}

interface MonthSnapshotChampionshipFinal {
  leagueKey: string;
  sport: string;
  name: string;
  date: string;
  emoji?: string;
}

interface MonthSnapshotData {
  monthLabel: string;
  monthKey: string;
  leagues: MonthSnapshotLeague[];
  championshipFinals?: MonthSnapshotChampionshipFinal[];
}

const PHASE_CHIP_STYLES: Record<string, { bg: string; border: string; fg: string }> = {
  Final: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", fg: "#F59E0B" },
  Playoffs: { bg: "rgba(239,68,68,0.13)", border: "rgba(239,68,68,0.40)", fg: "#F87171" },
  Knockout: { bg: "rgba(168,85,247,0.13)", border: "rgba(168,85,247,0.40)", fg: "#C084FC" },
  Championship: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", fg: "#F59E0B" },
  Group: { bg: "rgba(56,189,248,0.13)", border: "rgba(56,189,248,0.38)", fg: "#7DD3FC" },
  Tournament: { bg: "rgba(56,189,248,0.13)", border: "rgba(56,189,248,0.38)", fg: "#7DD3FC" },
  Regular: { bg: "rgba(148,163,184,0.13)", border: "rgba(148,163,184,0.32)", fg: "#94A3B8" },
};

function getPhaseChipStyle(phase: string | null | undefined) {
  if (!phase) return PHASE_CHIP_STYLES.Regular;
  return PHASE_CHIP_STYLES[phase] || PHASE_CHIP_STYLES.Regular;
}

function formatFinalDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupBySport(leagues: MonthSnapshotLeague[]): { sport: string; leagues: MonthSnapshotLeague[] }[] {
  const map = new Map<string, MonthSnapshotLeague[]>();
  for (const league of leagues) {
    const existing = map.get(league.sport) || [];
    existing.push(league);
    map.set(league.sport, existing);
  }
  const grouped: { sport: string; leagues: MonthSnapshotLeague[] }[] = [];
  for (const sport of SPORT_ORDER) {
    const leagues = map.get(sport);
    if (leagues) {
      grouped.push({ sport, leagues });
      map.delete(sport);
    }
  }
  for (const [sport, leagues] of map) {
    grouped.push({ sport, leagues });
  }
  return grouped;
}

export default function MonthScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { monthDataJson } = useLocalSearchParams<{ monthDataJson: string }>();

  let monthData: MonthSnapshotData | null = null;
  try {
    if (monthDataJson) monthData = JSON.parse(monthDataJson);
  } catch {}

  if (!monthData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.errorText}>No schedule data available.</Text>
      </View>
    );
  }

  const grouped = groupBySport(monthData.leagues);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerBadge}>
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.headerBadgeText}>SCHEDULE</Text>
          </View>
          <Text style={styles.headerTitle}>{monthData.monthLabel}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.totalLabel}>{monthData.leagues.length} leagues & tournaments</Text>

        {!!monthData.championshipFinals?.length && (
          <View style={styles.finalsCallout}>
            <View style={styles.finalsCalloutHeader}>
              <Text style={styles.finalsCalloutTrophy}>🏆</Text>
              <Text style={styles.finalsCalloutTitle}>CHAMPIONSHIP FINALS</Text>
            </View>
            {monthData.championshipFinals.map((f, i) => (
              <View
                key={`${f.leagueKey}-${i}`}
                style={[styles.finalsRow, i > 0 && styles.finalsRowBorder]}
              >
                <Text style={styles.finalsEmoji}>{SPORT_EMOJI[f.sport] ?? "🏆"}</Text>
                <Text style={styles.finalsName} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.finalsDate}>{formatFinalDate(f.date)}</Text>
              </View>
            ))}
          </View>
        )}

        {grouped.map(({ sport, leagues }) => (
          <View key={sport} style={styles.sportSection}>
            <View style={styles.sportHeader}>
              <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport] ?? "🏆"}</Text>
              <Text style={styles.sportTitle}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </Text>
            </View>
            <View style={styles.leagueCard}>
              {leagues.map((league, idx) => {
                const phaseStyle = getPhaseChipStyle(league.seasonPhase);
                return (
                  <View
                    key={`${league.leagueKey}-${idx}`}
                    style={[styles.leagueRow, idx > 0 && styles.leagueRowBorder]}
                  >
                    <View style={styles.leagueNameWrap}>
                      <Text style={styles.leagueName} numberOfLines={1}>{league.displayName}</Text>
                      {league.seasonPhase && (
                        <View style={[styles.phaseChip, { backgroundColor: phaseStyle.bg, borderColor: phaseStyle.border }]}>
                          <Text style={[styles.phaseChipText, { color: phaseStyle.fg }]}>
                            {league.seasonPhase.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.leagueDateRange}>{league.dateRangeLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SNAPSHOT_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  sportSection: {
    gap: 8,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sportEmoji: {
    fontSize: 16,
  },
  sportTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  leagueCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leagueRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  leagueNameWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginRight: 12,
  },
  leagueName: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  phaseChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  phaseChipText: {
    fontSize: 9.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  finalsCallout: {
    backgroundColor: "rgba(245,158,11,0.07)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.32)",
    borderRadius: 14,
    overflow: "hidden" as const,
    marginBottom: 4,
  },
  finalsCalloutHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 7,
  },
  finalsCalloutTrophy: {
    fontSize: 14,
  },
  finalsCalloutTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
    letterSpacing: 0.8,
  },
  finalsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  finalsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,158,11,0.18)",
  },
  finalsEmoji: {
    fontSize: 15,
    width: 20,
    textAlign: "center" as const,
  },
  finalsName: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  finalsDate: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
  },
  leagueDateRange: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: SNAPSHOT_COLOR,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    padding: 40,
  },
});
