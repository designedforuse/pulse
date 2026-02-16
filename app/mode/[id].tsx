import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Platform,
  Switch,
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
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { isEventLive, isEventCompleted } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";
import {
  getWeekendWindows,
  isInWindow,
  isInModeTimeWindow,
  type WeekendWindow,
} from "@/utils/weekendWindows";

const PREF_KEY = "prefs.favoritesFirst";

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

      <View style={styles.matchupRow}>
        <Text style={styles.teamName} numberOfLines={1}>
          {event.awayTeam}
        </Text>
        <Text style={styles.atText}>@</Text>
        <Text style={styles.teamName} numberOfLines={1}>
          {event.homeTeam}
        </Text>
      </View>

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
  favoritesFirst: boolean,
  favorites: ReturnType<typeof getFavorites>,
  includeCompleted: boolean
): SportEvent[] {
  return [...events].sort((a, b) => {
    const aLive = isEventLive(a, now) ? 1 : 0;
    const bLive = isEventLive(b, now) ? 1 : 0;
    if (bLive !== aLive) return bLive - aLive;

    if (includeCompleted) {
      const aCompleted = isEventCompleted(a, now) ? 1 : 0;
      const bCompleted = isEventCompleted(b, now) ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
    }

    if (favoritesFirst) {
      const aFav = favoriteInvolved(a, favorites) ? 1 : 0;
      const bFav = favoriteInvolved(b, favorites) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
    }

    return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
  });
}

export default function ModeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mode = getModeById(id);
  const { getEventsForPack, debugShowAll } = useEvents();
  const favorites = getFavorites();
  const [favoritesFirst, setFavoritesFirst] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      if (val !== null) setFavoritesFirst(val === "true");
      setLoaded(true);
    });
  }, []);

  const handleToggle = (val: boolean) => {
    setFavoritesFirst(val);
    AsyncStorage.setItem(PREF_KEY, val.toString());
  };

  const now = useMemo(() => new Date(), []);
  const windows = useMemo(() => getWeekendWindows(now), [now]);

  const packData: PackWeekendData[] = useMemo(() => {
    if (!mode) return [];
    return mode.packs.map((pack: Pack) => {
      const events = getEventsForPack(pack);

      if (debugShowAll) {
        return { pack, thisWeekend: events, nextWeekend: [] };
      }

      const thisWeekend = events.filter(
        (e) => isInWindow(e.startTimeLocal, windows.current) && isInModeTimeWindow(e.startTimeLocal, id)
      );
      const nextWeekend = events.filter(
        (e) => isInWindow(e.startTimeLocal, windows.next) && isInModeTimeWindow(e.startTimeLocal, id)
      );
      return { pack, thisWeekend, nextWeekend };
    });
  }, [mode, id, windows, debugShowAll]);

  const sections: SectionData[] = useMemo(() => {
    const result: SectionData[] = [];
    for (const pd of packData) {
      const thisSorted = sortEvents(pd.thisWeekend, now, favoritesFirst, favorites, true);
      const nextSorted = sortEvents(pd.nextWeekend, now, favoritesFirst, favorites, false);

      const bothEmpty = thisSorted.length === 0 && nextSorted.length === 0;

      if (bothEmpty) {
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
      result.push({
        title: pd.pack.title,
        sport: pd.pack.sport,
        weekendLabel: `Next weekend (${windows.next.label})`,
        data: nextSorted,
        isSubEmpty: nextSorted.length === 0,
      });
    }
    return result;
  }, [packData, favoritesFirst, favorites, now, debugShowAll, windows]);

  const populatedSections = useMemo(() => sections.filter((s) => s.data.length > 0), [sections]);
  const allEmpty = useMemo(() => sections.every((s) => s.data.length === 0), [sections]);
  const emptyPacks = useMemo(() => {
    const seen = new Set<string>();
    return sections
      .filter((s) => {
        if (s.isSubEmpty && s.weekendLabel === "" && !seen.has(s.title)) {
          seen.add(s.title);
          return true;
        }
        return false;
      });
  }, [sections]);

  if (!mode) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Mode not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode.title,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
            color: Colors.textPrimary,
          },
        }}
      />
      <View style={styles.subtitleRow}>
        <Ionicons
          name={debugShowAll ? "bug-outline" : "calendar-outline"}
          size={13}
          color={debugShowAll ? Colors.live : Colors.textMuted}
        />
        <Text style={[styles.subtitleText, debugShowAll && { color: Colors.live }]}>
          {debugShowAll
            ? "Showing all games (debug)"
            : `This weekend (${windows.current.label}) + Next weekend (${windows.next.label})`}
        </Text>
      </View>
      <View style={styles.toggleRow}>
        <Ionicons name="star" size={14} color={Colors.favStar} />
        <Text style={styles.toggleLabel}>Favorites first</Text>
        <Switch
          value={favoritesFirst}
          onValueChange={handleToggle}
          trackColor={{ false: Colors.border, true: Colors.accent + "55" }}
          thumbColor={favoritesFirst ? Colors.accent : Colors.textMuted}
          style={styles.switch}
        />
      </View>
      <SectionList
        sections={populatedSections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            isFav={favoriteInvolved(item, favorites)}
            completed={isEventCompleted(item, now)}
          />
        )}
        renderSectionHeader={({ section }) => {
          const isFirst =
            populatedSections.indexOf(section) === 0 ||
            populatedSections[populatedSections.indexOf(section) - 1]?.title !== section.title;
          return (
            <View>
              {isFirst && (
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
                  <Text style={styles.sectionTitle}>{section.title}</Text>
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
        renderSectionFooter={({ section }) => {
          const idx = populatedSections.indexOf(section);
          const next = populatedSections[idx + 1];
          if (
            !debugShowAll &&
            next &&
            next.title === section.title &&
            section.weekendLabel.startsWith("This weekend")
          ) {
            const nextWeekendEmpty = sections.find(
              (s) =>
                s.title === section.title &&
                s.weekendLabel.startsWith("Next weekend") &&
                s.data.length === 0
            );
            if (nextWeekendEmpty) {
              return (
                <View style={styles.subEmptyRow}>
                  <Text style={styles.subEmptyText}>
                    Next weekend ({windows.next.label}): No games in this window
                  </Text>
                </View>
              );
            }
          }
          if (
            !debugShowAll &&
            section.weekendLabel.startsWith("This weekend")
          ) {
            const hasNextSection = populatedSections.find(
              (s) => s.title === section.title && s.weekendLabel.startsWith("Next weekend")
            );
            if (!hasNextSection) {
              const nextWeekendEmpty = sections.find(
                (s) =>
                  s.title === section.title &&
                  s.weekendLabel.startsWith("Next weekend") &&
                  s.data.length === 0
              );
              if (nextWeekendEmpty) {
                return (
                  <View style={styles.subEmptyRow}>
                    <Text style={styles.subEmptyText}>
                      Next weekend ({windows.next.label}): No games in this window
                    </Text>
                  </View>
                );
              }
            }
          }
          if (
            !debugShowAll &&
            section.weekendLabel.startsWith("Next weekend")
          ) {
            const hasThisSection = populatedSections.find(
              (s) => s.title === section.title && s.weekendLabel.startsWith("This weekend")
            );
            if (!hasThisSection) {
              const thisWeekendEmpty = sections.find(
                (s) =>
                  s.title === section.title &&
                  s.weekendLabel.startsWith("This weekend") &&
                  s.data.length === 0
              );
              if (thisWeekendEmpty) {
                return null;
              }
            }
          }
          return null;
        }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={
          emptyPacks.length > 0 ? (
            <View style={styles.emptyPacksContainer}>
              {emptyPacks.map((s) => (
                <View key={s.title} style={styles.emptyPackRow}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: getSportColor(s.sport) + "22" },
                    ]}
                  >
                    <Ionicons
                      name={
                        s.sport === "hockey"
                          ? "snow"
                          : s.sport === "rugby"
                          ? "american-football"
                          : s.sport === "cricket"
                          ? "baseball"
                          : "football"
                      }
                      size={14}
                      color={getSportColor(s.sport)}
                    />
                  </View>
                  <Text style={styles.emptyPackTitle}>{s.title}</Text>
                  <Text style={styles.emptyPackLabel}>No games in this window</Text>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          allEmpty ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Weekend Games</Text>
              <Text style={styles.emptySubtitle}>
                No events found for this or next weekend (Fri–Sun)
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    marginTop: 8,
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  weekendSubLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
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
  subEmptyRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  subEmptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
  emptyPacksContainer: {
    marginTop: 8,
    gap: 6,
  },
  emptyPackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  emptyPackTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  emptyPackLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
