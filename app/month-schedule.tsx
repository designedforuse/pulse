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
}

interface MonthSnapshotData {
  monthLabel: string;
  monthKey: string;
  leagues: MonthSnapshotLeague[];
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

        {grouped.map(({ sport, leagues }) => (
          <View key={sport} style={styles.sportSection}>
            <View style={styles.sportHeader}>
              <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport] ?? "🏆"}</Text>
              <Text style={styles.sportTitle}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </Text>
            </View>
            <View style={styles.leagueCard}>
              {leagues.map((league, idx) => (
                <View
                  key={`${league.leagueKey}-${idx}`}
                  style={[styles.leagueRow, idx > 0 && styles.leagueRowBorder]}
                >
                  <Text style={styles.leagueName} numberOfLines={1}>{league.displayName}</Text>
                  <Text style={styles.leagueDateRange}>{league.dateRangeLabel}</Text>
                </View>
              ))}
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
  leagueName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginRight: 12,
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
