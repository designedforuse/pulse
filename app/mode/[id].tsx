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
import { displayTeamName } from "@/utils/teams";
import { getRugbyClockDisplay } from "@/utils/rugbyClock";
import ProviderLogo from "@/components/ProviderLogo";
import {
  getModeById,
  getProviderById,
  formatStartTime,
  getSportColor,
  type SportEvent,
  type Pack,
  type Favorites,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { useScores, type ScoreData } from "@/lib/scores-context";
import { useFavorites } from "@/lib/favorites-context";
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

const ALL_SPORT_FILTERS: { key: SportFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid-outline" },
  { key: "hockey", label: "Hockey", icon: "snow" },
  { key: "rugby", label: "Rugby", icon: "american-football" },
  { key: "cricket", label: "Cricket", icon: "baseball" },
  { key: "soccer", label: "Soccer", icon: "football" },
];

const LEAGUE_PREFERRED_ORDER: Record<string, string[]> = {
  hockey: ["NHL", "AHL", "ECHL", "NCAA Hockey", "Olympic Hockey"],
  rugby: ["URC", "Top 14", "English Premiership", "Six Nations", "European Champions Cup", "MLR", "Japan League One", "Super Rugby", "HSBC SVNS"],
  cricket: ["IPL", "BBL", "Super Smash", "SA20", "The Hundred", "MLC", "CPL", "T20 World Cup", "Test Cricket", "T20I Cricket", "ODI Cricket"],
  soccer: ["EPL", "Serie A", "La Liga", "Bundesliga", "Ligue 1", "MLS", "NWSL", "USL"],
};

function getLeagueKey(e: SportEvent): string {
  if (e.isIccT20Wc) return "T20 World Cup";
  if (e.isOlympic) return "Olympic Hockey";
  if (e.sport === "cricket" && e.competitionName) return e.competitionName;
  return e.league;
}

function getLeagueDisplayLabel(e: SportEvent): string {
  if (e.isIccT20Wc) return "T20 World Cup";
  if (e.isOlympic) return "Olympics";
  return e.league;
}

const LEAGUE_SEASON_KEY_MAP: Record<string, string> = {
  "NWSL": "nwsl",
  "USL": "usl",
  "European Champions Cup": "championscup",
  "MLR": "mlr",
  "FA Cup": "facup",
};

const LEAGUE_SHORT_LABELS: Record<string, string> = {
  "NCAA Hockey": "NCAA",
  "English Premiership": "Premiership",
  "Japan League One": "League One",
  "HSBC SVNS": "SVNS",
  "European Champions Cup": "Champions Cup",
  "Test Cricket": "Test",
  "T20I Cricket": "T20I",
  "ODI Cricket": "ODI",
};

function formatEventDate(startTimeLocal: string): { date: string; time: string } {
  const d = new Date(startTimeLocal);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date: `${month} ${day}`, time };
}

function EventCard({
  event,
  isFav,
  completed,
  score,
}: {
  event: SportEvent;
  isFav: boolean;
  completed: boolean;
  score?: ScoreData;
}) {
  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const live = isEventLive(event, new Date());
  const hasScore = !!score;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/event-sheet",
      params: { eventId: event.id },
    });
  };

  const isSession = event.eventType === "session" && event.sessionTitle;
  const isTbcMatch = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbdOlympic = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;
  const showTeamLayout = !isSession && !isTbcMatch && !isTbdOlympic;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.eventCard,
        completed && styles.eventCardCompleted,
        {
          opacity: pressed ? 0.85 : completed ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`event-${event.id}`}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardTeamsSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardLeague, { color: sportColor }]}>
              {getLeagueDisplayLabel(event)}
            </Text>
            {isFav && <Text style={styles.favStar}>★</Text>}
            {live && (
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
            )}
            {completed && (
              <Text style={styles.completedLabel}>FINAL</Text>
            )}
          </View>

          {showTeamLayout ? (
            <View style={styles.teamStack}>
              <View style={styles.teamScoreRow}>
                <Text style={styles.teamName} numberOfLines={1}>{displayTeamName(event.awayTeam, event.league)}</Text>
                {hasScore && <Text style={[styles.scoreText, score.status === "live" && styles.scoreLive]}>{score.awayScore}</Text>}
              </View>
              <View style={styles.teamScoreRow}>
                <Text style={styles.teamName} numberOfLines={1}>{displayTeamName(event.homeTeam, event.league)}</Text>
                {hasScore && <Text style={[styles.scoreText, score.status === "live" && styles.scoreLive]}>{score.homeScore}</Text>}
              </View>
            </View>
          ) : (
            <Text style={styles.teamName} numberOfLines={2}>
              {isSession
                ? event.sessionTitle
                : isTbcMatch
                  ? event.t20WcMatchLabel
                  : event.olympicRound}
            </Text>
          )}

          {event.t20WcVenue && isTbcMatch ? (
            <Text style={styles.venueText} numberOfLines={1}>{event.t20WcVenue}</Text>
          ) : event.isOlympic && event.olympicVenue ? (
            <Text style={styles.venueText} numberOfLines={1}>{event.olympicVenue}</Text>
          ) : null}
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardTimeSection}>
          {hasScore && score.status === "live" ? (
            (() => {
              const isRugby = event.sport === "Rugby";
              if (isRugby) {
                const clockText = getRugbyClockDisplay(score);
                return clockText ? <Text style={styles.scorePeriod}>{clockText}</Text> : null;
              }
              return (
                <>
                  <Text style={styles.scorePeriod}>{score.period || "Live"}</Text>
                  {score.clock ? <Text style={styles.scoreClock}>{score.clock}</Text> : null}
                </>
              );
            })()
          ) : hasScore && score.status === "final" ? (
            <Text style={styles.scoreFinal}>{score.period || "FT"}</Text>
          ) : (
            <>
              <Text style={styles.cardDate}>{date}</Text>
              <Text style={styles.cardTime}>{time}</Text>
            </>
          )}
          {provider && (
            <View style={styles.providerRow}>
              <ProviderLogo providerId={event.providerId} size={20} />
            </View>
          )}
        </View>
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
  const { getEventsForPack, debugShowAll, favoritesOnly, leagueSeasonStarts } = useEvents();
  const { getScore } = useScores();
  const { favorites } = useFavorites();
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


  const modeSports = useMemo(() => {
    if (!mode) return new Set<string>();
    return new Set(mode.packs.map((p) => p.sport));
  }, [mode]);

  const sportFilters = useMemo(() => {
    const available = ALL_SPORT_FILTERS.filter(
      (f) => f.key === "all" || modeSports.has(f.key)
    );
    if (available.length <= 2) return [];
    return available;
  }, [modeSports]);

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
      activeLeague === "all" || getLeagueKey(e) === activeLeague;
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
        const key = getLeagueKey(e);
        counts[key] = (counts[key] || 0) + 1;
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
    ? ALL_SPORT_FILTERS.find((f) => f.key === activeSport)?.label ?? activeSport
    : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode.title,
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.textPrimary,
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

      {sportFilters.length > 0 && <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {sportFilters.map((filter) => {
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
                isActive && { backgroundColor: sportColor + "20", borderColor: sportColor + "55" },
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
                <View style={[styles.chipCount, isActive && { backgroundColor: sportColor + "20" }]}>
                  <Text style={[styles.chipCountText, isActive && { color: sportColor }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>}

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
                score={getScore(item.id)}
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
                      { backgroundColor: getSportColor(section.sport) + "20" },
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
              {activeLeague !== "all" &&
                leagueSeasonStarts[LEAGUE_SEASON_KEY_MAP[activeLeague] ?? activeLeague] &&
                new Date(leagueSeasonStarts[LEAGUE_SEASON_KEY_MAP[activeLeague] ?? activeLeague]) > now ? (
                <>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {LEAGUE_SHORT_LABELS[activeLeague] ?? activeLeague} Season Upcoming
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {`${LEAGUE_SHORT_LABELS[activeLeague] ?? activeLeague} season starts ${new Date(leagueSeasonStarts[LEAGUE_SEASON_KEY_MAP[activeLeague] ?? activeLeague]).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" })}. Games will appear here once we're within the next 21 days.`}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
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
                </>
              )}
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
    paddingHorizontal: 16,
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
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardCompleted: {
    borderColor: Colors.border,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTeamsSection: {
    flex: 1,
    marginRight: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cardLeague: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  favStar: {
    fontSize: 12,
    color: Colors.favStar,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  completedLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textMuted,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  teamStack: {
    gap: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  venueText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  cardDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },
  cardTimeSection: {
    paddingLeft: 16,
    alignItems: "center",
    minWidth: 80,
  },
  cardDate: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  cardTime: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  teamScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 20,
    textAlign: "right",
  },
  scoreLive: {
    color: Colors.accent,
  },
  scorePeriod: {
    fontSize: 14,
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  scoreClock: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  scoreFinal: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  providerRow: {
    marginTop: 8,
    alignItems: "center",
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
