import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import {
  getModeById,
  getProviderById,
  getFavorites,
  formatStartTime,
  getSportColor,
  type SportEvent,
  type Pack,
  type Favorites,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { isEventLive, isEventCompleted } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import {
  getWeekendWindows,
  isInWindow,
  isInWindowForMode,
  isInModeTimeWindow,
  shouldShowNextWeekend,
  type WeekendWindow,
} from "@/utils/weekendWindows";

const FILTER_KEY_PREFIX = "ui.modeFilter.";

type SportFilter = "all" | "hockey" | "rugby" | "cricket" | "soccer";

const SPORT_FILTERS: { key: SportFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid-outline" },
  { key: "hockey", label: "Hockey", icon: "snow" },
  { key: "rugby", label: "Rugby", icon: "american-football" },
  { key: "cricket", label: "Cricket", icon: "baseball" },
  { key: "soccer", label: "Soccer", icon: "football" },
];

const LEAGUE_PREFERRED_ORDER: Record<string, string[]> = {
  hockey: ["NHL", "AHL", "ECHL", "NCAA Hockey"],
  rugby: ["URC", "Top 14", "English Premiership", "Japan League One", "Super Rugby", "HSBC SVNS"],
  cricket: ["IPL", "BBL", "Super Smash", "SA20", "The Hundred", "MLC", "CPL", "ICC", "Test Cricket", "T20I Cricket", "ODI Cricket"],
  soccer: ["EPL", "Serie A", "La Liga", "Bundesliga", "Ligue 1", "MLS", "NWSL", "USL"],
};

const LEAGUE_SHORT_LABELS: Record<string, string> = {
  "NCAA Hockey": "NCAA",
  "English Premiership": "Premiership",
  "Japan League One": "League One",
  "HSBC SVNS": "SVNS",
  "Test Cricket": "Test",
  "T20I Cricket": "T20I",
  "ODI Cricket": "ODI",
};

function EventCard({
  event,
  isFav,
  completed,
}: {
  event: SportEvent;
  isFav: boolean;
  completed: boolean;
}) {
  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/event-sheet",
      params: { eventId: event.id },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.eventCard,
        completed && styles.eventCardCompleted,
        {
          opacity: pressed ? 0.85 : completed ? 0.65 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`event-${event.id}`}
    >
      <View style={styles.eventTopRow}>
        <View style={styles.topRowLeft}>
          <View style={[styles.leagueBadge, { backgroundColor: sportColor + "18" }]}>
            <Text style={[styles.leagueText, { color: sportColor }]}>{event.league}</Text>
          </View>
          {isFav && (
            <View style={styles.favBadge}>
              <Text style={styles.favStar}>★</Text>
            </View>
          )}
        </View>
        {isEventLive(event, new Date()) ? (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        ) : completed ? (
          <View style={styles.completedIndicator}>
            <Text style={styles.completedLabel}>FINAL</Text>
          </View>
        ) : null}
      </View>

      {event.eventType === "session" && event.sessionTitle ? (
        <View style={styles.matchupRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {event.sessionTitle}
          </Text>
        </View>
      ) : (
        <View style={styles.matchupRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {event.awayTeam}
          </Text>
          <Text style={styles.atText}>@</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {event.homeTeam}
          </Text>
        </View>
      )}

      <View style={styles.eventBottomRow}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.timeText}>{formatStartTime(event.startTimeLocal)}</Text>
        </View>
        {provider && (
          <View style={styles.providerTag}>
            <Ionicons name="tv-outline" size={11} color={Colors.accent} />
            <Text style={styles.providerName}>{provider.name}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface PackWeekendData {
  pack: Pack;
  thisWeekend: SportEvent[];
  nextWeekend: SportEvent[];
}

interface SectionData {
  title: string;
  sport: string;
  weekendLabel: string;
  data: SportEvent[];
  isSubEmpty: boolean;
}

function sortEvents(
  events: SportEvent[],
  now: Date,
  includeCompleted: boolean,
  favorites: Favorites,
  modeId?: string,
): SportEvent[] {
  return [...events].sort((a, b) => {
    const aLive = isEventLive(a, now) ? 1 : 0;
    const bLive = isEventLive(b, now) ? 1 : 0;
    if (bLive !== aLive) return bLive - aLive;

    const aFav = favoriteInvolved(a, favorites) ? 1 : 0;
    const bFav = favoriteInvolved(b, favorites) ? 1 : 0;
    if (bFav !== aFav) return bFav - aFav;

    if (modeId === "weekend_mornings") {
      const aSvns = a.eventType === "session" && a.leagueKey === "svns" ? 1 : 0;
      const bSvns = b.eventType === "session" && b.leagueKey === "svns" ? 1 : 0;
      if (bSvns !== aSvns) return bSvns - aSvns;
    }

    if (includeCompleted) {
      const aCompleted = isEventCompleted(a, now) ? 1 : 0;
      const bCompleted = isEventCompleted(b, now) ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
    }

    return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
  });
}

export default function ModeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mode = getModeById(id);
  const { getEventsForPack, debugShowAll, favoritesOnly } = useEvents();
  const favorites = getFavorites();
  const [activeSport, setActiveSportState] = useState<SportFilter>("all");
  const [activeLeague, setActiveLeague] = useState<string>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FILTER_KEY_PREFIX + id).then((val) => {
      if (val !== null) setActiveSportState(val as SportFilter);
      setLoaded(true);
    });
  }, [id]);

  const setActiveSport = useCallback((sport: SportFilter) => {
    setActiveSportState(sport);
    setActiveLeague("all");
    AsyncStorage.setItem(FILTER_KEY_PREFIX + id, sport);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [id]);


  const now = useMemo(() => new Date(), []);
  const windows = useMemo(() => getWeekendWindows(now), [now]);
  const showNext = useMemo(() => shouldShowNextWeekend(now), [now]);

  const packData: PackWeekendData[] = useMemo(() => {
    if (!mode) return [];
    return mode.packs.map((pack: Pack) => {
      const events = getEventsForPack(pack);

      if (debugShowAll) {
        return { pack, thisWeekend: events, nextWeekend: [] };
      }

      const thisWeekend = events.filter(
        (e) => isInWindowForMode(e.startTimeLocal, windows.current, id) && isInModeTimeWindow(e.startTimeLocal, id)
      );
      const nextWeekend = events.filter(
        (e) => isInWindowForMode(e.startTimeLocal, windows.next, id) && isInModeTimeWindow(e.startTimeLocal, id)
      );
      return { pack, thisWeekend, nextWeekend };
    });
  }, [mode, id, windows, debugShowAll]);

  const filteredPackData = useMemo(() => {
    if (activeSport === "all") return packData;
    return packData.filter((pd) => pd.pack.sport === activeSport);
  }, [packData, activeSport]);

  const sections: SectionData[] = useMemo(() => {
    const result: SectionData[] = [];
    const leagueFilter = (e: SportEvent) =>
      activeLeague === "all" || e.league === activeLeague;
    for (const pd of filteredPackData) {
      const thisFiltered = pd.thisWeekend
        .filter(leagueFilter)
        .filter((e) => !favoritesOnly || favoriteInvolved(e, favorites));
      const nextFiltered = pd.nextWeekend
        .filter(leagueFilter)
        .filter((e) => !favoritesOnly || favoriteInvolved(e, favorites));
      const thisSorted = sortEvents(thisFiltered, now, true, favorites, id);
      const nextSorted = sortEvents(nextFiltered, now, false, favorites, id);

      const effectiveNextSorted = showNext ? nextSorted : [];
      const bothEmpty = thisSorted.length === 0 && effectiveNextSorted.length === 0;

      if (bothEmpty) {
        if (activeSport === "all") {
          continue;
        }
        result.push({
          title: pd.pack.title,
          sport: pd.pack.sport,
          weekendLabel: "",
          data: [],
          isSubEmpty: true,
        });
        continue;
      }

      if (debugShowAll) {
        result.push({
          title: pd.pack.title,
          sport: pd.pack.sport,
          weekendLabel: "All games (debug)",
          data: thisSorted,
          isSubEmpty: thisSorted.length === 0,
        });
        continue;
      }

      result.push({
        title: pd.pack.title,
        sport: pd.pack.sport,
        weekendLabel: `This weekend (${windows.current.label})`,
        data: thisSorted,
        isSubEmpty: thisSorted.length === 0,
      });
      if (showNext) {
        result.push({
          title: pd.pack.title,
          sport: pd.pack.sport,
          weekendLabel: `Next weekend (${windows.next.label})`,
          data: nextSorted,
          isSubEmpty: nextSorted.length === 0,
        });
      }
    }
    return result;
  }, [filteredPackData, favoritesOnly, favorites, now, debugShowAll, windows, showNext, activeLeague]);

  const populatedSections = useMemo(() => sections.filter((s) => s.data.length > 0), [sections]);
  const allEmpty = useMemo(() => sections.every((s) => s.data.length === 0), [sections]);

  const sportEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pd of packData) {
      const sport = pd.pack.sport;
      const thisEvents = favoritesOnly
        ? pd.thisWeekend.filter((e) => favoriteInvolved(e, favorites))
        : pd.thisWeekend;
      const nextEvents = showNext
        ? (favoritesOnly
            ? pd.nextWeekend.filter((e) => favoriteInvolved(e, favorites))
            : pd.nextWeekend)
        : [];
      counts[sport] = (counts[sport] || 0) + thisEvents.length + nextEvents.length;
    }
    return counts;
  }, [packData, favoritesOnly, favorites, showNext]);

  const leagueEventCounts = useMemo(() => {
    if (activeSport === "all") return {};
    const counts: Record<string, number> = {};
    for (const pd of filteredPackData) {
      const allEvents = [
        ...(favoritesOnly
          ? pd.thisWeekend.filter((e) => favoriteInvolved(e, favorites))
          : pd.thisWeekend),
        ...(showNext
          ? (favoritesOnly
              ? pd.nextWeekend.filter((e) => favoriteInvolved(e, favorites))
              : pd.nextWeekend)
          : []),
      ];
      for (const e of allEvents) {
        counts[e.league] = (counts[e.league] || 0) + 1;
      }
    }
    return counts;
  }, [filteredPackData, activeSport, favoritesOnly, favorites, showNext]);

  const leagueFilters = useMemo(() => {
    if (activeSport === "all") return [];
    const leaguesWithEvents = Object.keys(leagueEventCounts).filter(
      (k) => leagueEventCounts[k] > 0
    );
    if (leaguesWithEvents.length <= 1) return [];
    const order = LEAGUE_PREFERRED_ORDER[activeSport] ?? [];
    leaguesWithEvents.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return [
      { key: "all", label: "All" },
      ...leaguesWithEvents.map((k) => ({
        key: k,
        label: LEAGUE_SHORT_LABELS[k] ?? k,
      })),
    ];
  }, [activeSport, leagueEventCounts]);

  useEffect(() => {
    if (activeLeague !== "all" && leagueFilters.length > 0) {
      const stillExists = leagueFilters.some((lf) => lf.key === activeLeague);
      if (!stillExists) setActiveLeague("all");
    }
  }, [leagueFilters, activeLeague]);

  if (!mode) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Mode not found</Text>
      </View>
    );
  }

  const emptyFilterLabel = activeSport !== "all"
    ? SPORT_FILTERS.find((f) => f.key === activeSport)?.label ?? activeSport
    : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode.title,
          headerBackTitleVisible: false,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
            color: Colors.textPrimary,
            marginLeft: -8,
          },
          headerRight: favoritesOnly
            ? () => (
                <View style={styles.headerFavIndicator}>
                  <Ionicons name="star" size={11} color={Colors.favStar} />
                  <Text style={styles.headerFavText}>Favorites only</Text>
                </View>
              )
            : undefined,
        }}
      />
      {debugShowAll && (
        <View style={styles.subtitleRow}>
          <Ionicons name="bug-outline" size={13} color={Colors.live} />
          <Text style={[styles.subtitleText, { color: Colors.live }]}>
            Showing all games (debug)
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {SPORT_FILTERS.map((filter) => {
          const isActive = activeSport === filter.key;
          const sportColor = filter.key === "all" ? Colors.accent : getSportColor(filter.key);
          const count = filter.key === "all"
            ? Object.values(sportEventCounts).reduce((a, b) => a + b, 0)
            : sportEventCounts[filter.key] || 0;

          return (
            <Pressable
              key={filter.key}
              onPress={() => setActiveSport(filter.key)}
              style={[
                styles.chip,
                isActive && { backgroundColor: sportColor + "22", borderColor: sportColor + "55" },
              ]}
              testID={`chip-${filter.key}`}
            >
              <Ionicons
                name={filter.icon as any}
                size={14}
                color={isActive ? sportColor : Colors.textMuted}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isActive && { color: sportColor },
                ]}
              >
                {filter.label}
              </Text>
              {count > 0 && (
                <View style={[styles.chipCount, isActive && { backgroundColor: sportColor + "22" }]}>
                  <Text style={[styles.chipCountText, isActive && { color: sportColor }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {leagueFilters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueChipRow}
          style={styles.leagueChipScroll}
        >
          {leagueFilters.map((lf) => {
            const isActive = activeLeague === lf.key;
            const sportColor = getSportColor(activeSport);
            const count = lf.key === "all"
              ? Object.values(leagueEventCounts).reduce((a, b) => a + b, 0)
              : leagueEventCounts[lf.key] || 0;
            return (
              <Pressable
                key={lf.key}
                onPress={() => {
                  setActiveLeague(lf.key);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.leagueChip,
                  isActive && { backgroundColor: sportColor + "18", borderColor: sportColor + "44" },
                ]}
                testID={`league-chip-${lf.key}`}
              >
                <Text
                  style={[
                    styles.leagueChipLabel,
                    isActive && { color: sportColor },
                  ]}
                >
                  {lf.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.leagueChipCount, isActive && { backgroundColor: sportColor + "18" }]}>
                    <Text style={[styles.leagueChipCountText, isActive && { color: sportColor }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <SectionList
        sections={populatedSections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index, section }) => {
          let stopHeader: string | null = null;
          if (item.eventType === "session" && item.leagueKey === "svns" && item.sessionTitle) {
            const stopName = item.sessionTitle.replace(/ – Day \d+$/, "");
            const prev = index > 0 ? section.data[index - 1] : null;
            const prevStop = prev?.eventType === "session" && prev?.leagueKey === "svns" && prev?.sessionTitle
              ? prev.sessionTitle.replace(/ – Day \d+$/, "")
              : null;
            if (prevStop !== stopName) {
              stopHeader = stopName;
            }
          }
          return (
            <View>
              {stopHeader && (
                <View style={styles.stopHeader}>
                  <Ionicons name="trophy-outline" size={13} color={Colors.accent} />
                  <Text style={styles.stopHeaderText}>{stopHeader}</Text>
                </View>
              )}
              <EventCard
                event={item}
                isFav={favoriteInvolved(item, favorites)}
                completed={isEventCompleted(item, now)}
              />
            </View>
          );
        }}
        renderSectionHeader={({ section }) => {
          const isFirst =
            populatedSections.indexOf(section) === 0 ||
            populatedSections[populatedSections.indexOf(section) - 1]?.title !== section.title;
          return (
            <View>
              {isFirst && activeSport === "all" && (
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: getSportColor(section.sport) + "22" },
                    ]}
                  >
                    <Ionicons
                      name={
                        section.sport === "hockey"
                          ? "snow"
                          : section.sport === "rugby"
                          ? "american-football"
                          : section.sport === "cricket"
                          ? "baseball"
                          : "football"
                      }
                      size={16}
                      color={getSportColor(section.sport)}
                    />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title.replace(/ (Night|Morning)$/i, "")}</Text>
                </View>
              )}
              <View style={styles.weekendSubHeader}>
                <Text style={styles.weekendSubLabel}>{section.weekendLabel}</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{section.data.length}</Text>
                </View>
              </View>
            </View>
          );
        }}
        renderSectionFooter={() => null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          allEmpty ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {emptyFilterLabel
                  ? `No ${emptyFilterLabel} Events`
                  : "No Weekend Games"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {emptyFilterLabel
                  ? `No ${emptyFilterLabel.toLowerCase()} events in this window`
                  : "No games in this window"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: 8,
    paddingBottom: 2,
  },
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 0,
  },
  chipCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
    flexShrink: 0,
  },
  chipCountText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
  },
  leagueChipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: 4,
    paddingBottom: 2,
  },
  leagueChipRow: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: "center",
  },
  leagueChip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  leagueChipLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 0,
  },
  leagueChipCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 16,
    alignItems: "center",
    flexShrink: 0,
  },
  leagueChipCountText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
  },
  headerFavIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.favStar + "18",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerFavText: {
    fontSize: 11,
    color: Colors.favStar,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  weekendSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  weekendSubLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginTop: 4,
    marginBottom: 2,
  },
  stopHeaderText: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  sectionCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardCompleted: {
    borderColor: Colors.border,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leagueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  favBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  favStar: {
    fontSize: 10,
    color: "#FFD700",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.live,
    fontFamily: "Inter_700Bold",
  },
  completedIndicator: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textMuted,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  atText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  providerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  providerName: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 60,
    fontFamily: "Inter_400Regular",
  },
});
