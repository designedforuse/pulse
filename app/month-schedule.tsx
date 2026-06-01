import React, { useState, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useEvents } from "@/lib/events-context";
import { useFavorites } from "@/lib/favorites-context";
import UnifiedEventCard from "@/components/UnifiedEventCard";
import { getEffectiveSport } from "@/lib/data";

const SNAPSHOT_COLOR = "#6366F1";
const PINK = "#FF85C8";

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
  paddling: "🛶",
};

const SPORT_ORDER = ["rugby", "cricket", "soccer", "hockey", "basketball", "college", "golf", "tennis", "athletics", "paddling", "cycling", "horse-racing", "racing"];

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

interface MonthSnapshotPayload {
  currentMonth: MonthSnapshotData;
  nextMonth: MonthSnapshotData;
  thisWeek?: MonthSnapshotData;
}

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

type TabKey = "today" | "week" | "current" | "next";

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
  const { allEvents } = useEvents();
  const { disabledSports } = useFavorites();
  const { monthSnapshotJson, monthDataJson } = useLocalSearchParams<{
    monthSnapshotJson?: string;
    monthDataJson?: string;
  }>();
  const [activeKey, setActiveKey] = useState<TabKey>("today");

  const { data: narrativeData, isLoading: storiesLoading } = useQuery<{
    tonightStory: TonightStory | null;
    todaysStories?: TonightStory[];
  }>({
    queryKey: ["/api/narratives"],
    staleTime: 60 * 1000,
  });

  const todayStories = useMemo<TonightStory[]>(() => {
    const raw =
      narrativeData?.todaysStories && narrativeData.todaysStories.length > 0
        ? narrativeData.todaysStories
        : narrativeData?.tonightStory
          ? [narrativeData.tonightStory]
          : [];
    if (disabledSports.size === 0) return raw;
    return raw.filter((s) => {
      const sp = s.sports;
      if (!sp || sp.length === 0) return true;
      return !sp.every((x) => disabledSports.has(x.toLowerCase()));
    });
  }, [narrativeData, disabledSports]);
  const hasToday = todayStories.length > 0;

  // Today's events (device-local calendar day), so the Today tab can always
  // list what's on even when no editorial story scored. Honors disabled sports.
  const todayEvents = useMemo(() => {
    const ref = new Date();
    const y = ref.getFullYear();
    const mo = ref.getMonth();
    const da = ref.getDate();
    return allEvents
      .filter((e: any) => {
        const t = new Date(e.startTimeLocal);
        if (t.getFullYear() !== y || t.getMonth() !== mo || t.getDate() !== da) return false;
        if (
          disabledSports.size > 0 &&
          disabledSports.has(getEffectiveSport(e.sport, e.league, e.leagueKey).toLowerCase())
        )
          return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime(),
      );
  }, [allEvents, disabledSports]);

  const eventMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const e of allEvents) m.set(e.id, e);
    return m;
  }, [allEvents]);

  let snapshot: MonthSnapshotPayload | null = null;
  try {
    if (monthSnapshotJson) {
      snapshot = JSON.parse(monthSnapshotJson);
    } else if (monthDataJson) {
      const single: MonthSnapshotData = JSON.parse(monthDataJson);
      snapshot = { currentMonth: single, nextMonth: single };
    }
  } catch {}

  if (!snapshot) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.errorText}>No schedule data available.</Text>
      </View>
    );
  }

  const hasWeek = !!snapshot.thisWeek;
  const hasTwoMonths = snapshot.currentMonth.monthKey !== snapshot.nextMonth.monthKey;

  // Today tab is always available now, so never auto-redirect away from it.
  const effectiveActiveKey: TabKey =
    activeKey === "week" && !hasWeek ? "current" : activeKey;

  const isToday = effectiveActiveKey === "today";
  const monthData: MonthSnapshotData | null = isToday
    ? null
    : effectiveActiveKey === "week"
      ? (snapshot.thisWeek as MonthSnapshotData)
      : effectiveActiveKey === "current"
        ? snapshot.currentMonth
        : snapshot.nextMonth;
  const showTodayTab = true;
  const showTabs = showTodayTab || hasTwoMonths || hasWeek;
  const grouped = monthData ? groupBySport(monthData.leagues) : [];
  const now = new Date();

  const handleReadMore = (story: TonightStory) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (CARD_LINKED_SIGNALS.has(story.signalType) && story.sourceCard?.id) {
      router.push({ pathname: "/narrative/[id]", params: { id: story.sourceCard.id } });
    }
  };

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
          <View style={[styles.headerBadge, isToday && styles.headerBadgeToday]}>
            <Ionicons name={isToday ? "radio-outline" : "calendar-outline"} size={12} color="#fff" />
            <Text style={styles.headerBadgeText}>{isToday ? "ON YOUR RADAR" : "SCHEDULE"}</Text>
          </View>
          <Text style={styles.headerTitle}>{isToday ? "Today" : monthData?.monthLabel}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {showTabs && (
        <View style={styles.monthTabsRow}>
          {showTodayTab && (
            <Pressable
              onPress={() => setActiveKey("today")}
              hitSlop={6}
              accessibilityRole="tab"
              accessibilityState={{ selected: isToday }}
              style={[styles.monthTab, styles.todayTab, isToday && styles.todayTabActive]}
            >
              <Text style={[styles.monthTabText, styles.todayTabText, isToday && styles.monthTabTextActive]}>
                Today
              </Text>
            </Pressable>
          )}
          {hasWeek && (
            <Pressable
              onPress={() => setActiveKey("week")}
              hitSlop={6}
              accessibilityRole="tab"
              accessibilityState={{ selected: effectiveActiveKey === "week" }}
              style={[styles.monthTab, effectiveActiveKey === "week" && styles.monthTabActive]}
            >
              <Text style={[styles.monthTabText, effectiveActiveKey === "week" && styles.monthTabTextActive]}>
                This Week
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setActiveKey("current")}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: effectiveActiveKey === "current" }}
            style={[styles.monthTab, effectiveActiveKey === "current" && styles.monthTabActive]}
          >
            <Text style={[styles.monthTabText, effectiveActiveKey === "current" && styles.monthTabTextActive]}>
              {snapshot.currentMonth.monthLabel.split(" ")[0]}
            </Text>
          </Pressable>
          {hasTwoMonths && (
            <Pressable
              onPress={() => setActiveKey("next")}
              hitSlop={6}
              accessibilityRole="tab"
              accessibilityState={{ selected: effectiveActiveKey === "next" }}
              style={[styles.monthTab, effectiveActiveKey === "next" && styles.monthTabActive]}
            >
              <Text style={[styles.monthTabText, effectiveActiveKey === "next" && styles.monthTabTextActive]}>
                {snapshot.nextMonth.monthLabel.split(" ")[0]}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isToday ? (
          <>
            <View style={styles.radarHero}>
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE SIGNAL</Text>
                {todayStories.length > 0 && (
                  <Text style={styles.signalCount}>
                    {" · "}
                    {todayStories.length} {todayStories.length === 1 ? "story" : "stories"}
                  </Text>
                )}
              </View>
              <Text style={styles.radarTagline}>What's worth watching today</Text>
            </View>

            {storiesLoading && todayStories.length === 0 ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : todayStories.length === 0 ? (
              todayEvents.length > 0 ? (
                <View style={styles.eventsList}>
                  {todayEvents.map((ev: any) => (
                    <UnifiedEventCard key={ev.id} event={ev} now={now} />
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>No games scheduled today. Check back soon.</Text>
              )
            ) : (
              <View style={styles.storyList}>
                {todayStories.map((story, idx) => {
                  const ids =
                    story.eventIds && story.eventIds.length > 0
                      ? story.eventIds
                      : story.sourceEventId
                        ? [story.sourceEventId]
                        : [];
                  const storyEvents = ids.map((id) => eventMap.get(id)).filter(Boolean);
                  const isCardLinked = CARD_LINKED_SIGNALS.has(story.signalType);
                  return (
                    <View key={`${story.sourceCard?.id ?? story.signalType}-${idx}`} style={styles.storyCard}>
                      <View style={styles.signalRow}>
                        <View style={styles.signalBadge}>
                          <Text style={styles.signalBadgeText}>{story.signalLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.storyHeadline}>{story.headline}</Text>
                      <Text style={styles.storyBody}>{story.body}</Text>
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
                            <UnifiedEventCard key={ev.id} event={ev} now={now} />
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
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.totalLabel}>{monthData!.leagues.length} leagues & tournaments</Text>

            {!!monthData!.championshipFinals?.length && (
              <View style={styles.finalsCallout}>
                <View style={styles.finalsCalloutHeader}>
                  <Text style={styles.finalsCalloutTrophy}>🏆</Text>
                  <Text style={styles.finalsCalloutTitle}>CHAMPIONSHIP FINALS</Text>
                </View>
                {monthData!.championshipFinals.map((f, i) => (
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
          </>
        )}
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
  monthTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  monthTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.35)",
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  monthTabActive: {
    backgroundColor: SNAPSHOT_COLOR,
    borderColor: SNAPSHOT_COLOR,
  },
  monthTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#A5B4FC",
    letterSpacing: 0.3,
  },
  monthTabTextActive: {
    color: "#fff",
  },
  todayTab: {
    borderColor: PINK + "59",
    backgroundColor: PINK + "14",
  },
  todayTabActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  todayTabText: {
    color: PINK,
  },
  headerBadgeToday: {
    backgroundColor: PINK,
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
  radarHero: {
    gap: 6,
    marginBottom: 2,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
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
  signalCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  radarTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  muted: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 24,
  },
  storyList: {
    gap: 14,
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
  storyHeadline: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  storyBody: {
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
