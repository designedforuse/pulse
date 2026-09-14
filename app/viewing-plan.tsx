import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import ViewingPlanControls from "@/components/ViewingPlanControls";
import { useEvents } from "@/lib/events-context";
import { getProviderById, resolveProviderDisplay, type SportEvent } from "@/lib/data";
import { useViewingPlan } from "@/lib/viewing-plan-context";
import {
  getLocalMondayWeekBounds,
  isViewingPlanItemVisible,
  type ViewingPlanSnapshot,
  type ViewingPlanTab,
} from "@/lib/viewing-plan";

function formatKickoff(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Kickoff time unavailable";
  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function findEventForItem(item: ViewingPlanSnapshot, events: readonly SportEvent[]) {
  return events.find((event) => event.id === item.eventId);
}

function isEventLiveNow(event: SportEvent | undefined, nowMs: number): boolean {
  if (!event) return false;
  if (event.isLive) return true;
  const start = Date.parse(event.startTimeLocal);
  const end = event.endTimeLocal ? Date.parse(event.endTimeLocal) : NaN;
  return Number.isFinite(start) && Number.isFinite(end) && start <= nowMs && nowMs < end;
}

export default function ViewingPlanScreen() {
  const insets = useSafeAreaInsets();
  const { allEvents } = useEvents();
  const { items, remove, persistenceError, clearPersistenceError } = useViewingPlan();
  const [activeTab, setActiveTab] = useState<ViewingPlanTab>("week");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // The plan route can remain mounted while another screen is shown. Refresh
  // on focus and periodically while visible so a live match does not leave
  // the range frozen at the original mount time.
  useFocusEffect(
    useCallback(() => {
      const refreshNow = () => setNowMs(Date.now());
      refreshNow();
      const interval = setInterval(refreshNow, 60_000);
      return () => clearInterval(interval);
    }, []),
  );

  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const week = useMemo(() => getLocalMondayWeekBounds(now), [now]);

  const teams = useMemo(
    () =>
      [...new Set(items.flatMap((item) => [item.awayTeam, item.homeTeam]))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        const event = findEventForItem(item, allEvents);
        return isViewingPlanItemVisible(
          item,
          activeTab,
          now,
          week,
          teamFilter,
          isEventLiveNow(event, nowMs),
        );
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.startTimeLocal);
        const bTime = Date.parse(b.startTimeLocal);
        return (Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER) -
          (Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER);
      });
  }, [activeTab, allEvents, items, now, nowMs, teamFilter, week]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>SERIE A</Text>
          <Text style={styles.title}>My Plan</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {persistenceError ? (
        <Pressable
          onPress={clearPersistenceError}
          accessibilityRole="alert"
          style={styles.errorBanner}
        >
          <Ionicons name="warning-outline" size={16} color="#FBBF24" />
          <Text style={styles.errorText}>{persistenceError}</Text>
          <Ionicons name="close" size={16} color="#FBBF24" />
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 32 : insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Your Serie A viewing plan</Text>
          <Text style={styles.introCopy}>
            Watch live is your intention to watch the match live. Highlights is a reminder,
            not a promise of available content.
          </Text>
        </View>

        <View style={styles.tabs}>
          {(["week", "upcoming"] as ViewingPlanTab[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {tab === "week" ? "This week" : "Upcoming"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {teams.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <Pressable
              onPress={() => setTeamFilter(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: teamFilter === null }}
              style={[styles.filter, teamFilter === null && styles.filterSelected]}
            >
              <Text style={[styles.filterText, teamFilter === null && styles.filterTextSelected]}>
                All teams
              </Text>
            </Pressable>
            {teams.map((team) => {
              const selected = teamFilter === team;
              return (
                <Pressable
                  key={team}
                  onPress={() => setTeamFilter(selected ? null : team)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.filter, selected && styles.filterSelected]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                    {team}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {visibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={34} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? "Your plan is empty" : "Nothing saved here"}
            </Text>
            <Text style={styles.emptyCopy}>
              {items.length === 0
                ? "Choose Watch live or Highlights on a Serie A match to start your plan."
                : "Try another time range or team filter."}
            </Text>
            {items.length === 0 ? (
              <Pressable
                onPress={() => router.push("/month-schedule")}
                accessibilityRole="link"
                style={styles.storyLink}
              >
                <Text style={styles.storyLinkText}>Find matches in What to Watch Next</Text>
                <Ionicons name="arrow-forward" size={15} color={Colors.accent} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          visibleItems.map((item) => {
            const event = findEventForItem(item, allEvents);
            const isLiveNow = isEventLiveNow(event, nowMs);
            const provider = getProviderById(item.providerId);
            const resolvedProvider = event ? resolveProviderDisplay(event) : null;
            const providerLogoId = resolvedProvider?.brandId || provider?.id || item.providerId;
            const providerName =
              resolvedProvider?.brandName ||
              resolvedProvider?.launchProvider?.name ||
              provider?.name ||
              item.providerId;
            return (
              <View key={item.matchKey} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.kickoff}>{formatKickoff(item.startTimeLocal)}</Text>
                  {providerName ? (
                    <View style={styles.provider}>
                      <ProviderLogo providerId={providerLogoId} size={17} />
                      <Text style={styles.providerText}>{providerName}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.teams}>{item.awayTeam} @ {item.homeTeam}</Text>
                {isLiveNow ? (
                  <View style={styles.liveNowBadge}>
                    <View style={styles.liveNowDot} />
                    <Text style={styles.liveNowText}>LIVE NOW</Text>
                  </View>
                ) : null}
                {item.detailsAvailable && event ? (
                  <>
                    <ViewingPlanControls event={event} compact />
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => router.push({ pathname: "/event-sheet", params: { eventId: event.id } })}
                        accessibilityRole="button"
                        style={styles.detailsButton}
                      >
                        <Text style={styles.detailsText}>Event details</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
                      </Pressable>
                      <Pressable
                        onPress={() => remove(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.awayTeam} at ${item.homeTeam} from my plan`}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={15} color="#F87171" />
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.unavailable}>
                    <Ionicons name="cloud-offline-outline" size={15} color="#FBBF24" />
                    <Text style={styles.unavailableText}>
                      Updated details unavailable. Your choice is still saved.
                    </Text>
                    <Pressable
                      onPress={() => remove(item)}
                      accessibilityRole="button"
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center", gap: 2 },
  eyebrow: { color: "#A78BFA", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.3 },
  title: { color: Colors.textPrimary, fontSize: 21, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },
  intro: { gap: 6 },
  introTitle: { color: Colors.textPrimary, fontSize: 19, fontFamily: "Inter_700Bold" },
  introCopy: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  tabs: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tabSelected: { backgroundColor: "#7C3AED" },
  tabText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabTextSelected: { color: "#fff" },
  filters: { gap: 8, paddingVertical: 2 },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterSelected: { borderColor: "#A78BFA", backgroundColor: "rgba(167,139,250,0.18)" },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
  filterTextSelected: { color: "#C4B5FD" },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kickoff: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  provider: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 130 },
  providerText: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" },
  teams: { color: Colors.textPrimary, fontSize: 17, fontFamily: "Inter_700Bold" },
  liveNowBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,69,58,0.14)",
  },
  liveNowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF453A" },
  liveNowText: { color: "#FF6B61", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailsButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  detailsText: { color: Colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  removeText: { color: "#F87171", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  unavailable: { flexDirection: "row", alignItems: "center", gap: 7 },
  unavailableText: { flex: 1, color: "#FBBF24", fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingHorizontal: 22, paddingVertical: 58, gap: 10 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyCopy: { color: Colors.textMuted, textAlign: "center", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  storyLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  storyLinkText: { color: Colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    margin: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.4)",
    backgroundColor: "rgba(251,191,36,0.1)",
  },
  errorText: { flex: 1, color: "#FBBF24", fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
});