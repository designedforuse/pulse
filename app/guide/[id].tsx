import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  Animated as RNAnimated
} from "react-native";
import Animated from "react-native-reanimated";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { displayTeamName } from "@/utils/teams";
import { getRugbyClockDisplay } from "@/utils/rugbyClock";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import {
  getProviderById,
  getSportColor,
  type SportEvent,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { useScores, type ScoreData } from "@/lib/scores-context";
import { useFavorites } from "@/lib/favorites-context";
import { isEventLive, isEventCompleted, formatTimeSinceStart } from "@/utils/time";
import { normalizeGameState } from "@/utils/gameState";
import { favoriteInvolved } from "@/utils/favorites";
import { useRitualOverrides } from "@/lib/ritual-overrides-context";
import {
  getRitualById,
  getEventsForRitual,
  formatRitualTimeWindow,
  formatRitualSports,
} from "@/lib/rituals";

function formatEventDate(startTimeLocal: string): { date: string; time: string } {
  const d = new Date(startTimeLocal);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date: `${month} ${day}`, time };
}

function getLeagueDisplayLabel(e: SportEvent): string {
  if (e.isIccT20Wc) return "T20 World Cup";
  if (e.isOlympic) return "Olympics";
  return e.league;
}

function GuideEventCard({
  event,
  isFav,
  completed,
  score,
  featured,
  onSetFeatured,
  isCurrentFeatured,
}: {
  event: SportEvent;
  isFav: boolean;
  completed: boolean;
  score?: ScoreData;
  featured?: boolean;
  onSetFeatured?: (eventId: string) => void;
  isCurrentFeatured?: boolean;
}) {
  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, new Date());
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onSetFeatured) {
      onSetFeatured(event.id);
      return;
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
        featured ? styles.featuredCard : styles.eventCard,
        isFinalState && styles.eventCardCompleted,
        {
          opacity: pressed ? 0.85 : isFinalState ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Animated.View style={[featured ? styles.featuredInner : styles.cardInner, flashStyle]}>
        <View style={styles.cardTeamsSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[featured ? styles.featuredLeague : styles.cardLeague, { color: sportColor }]}>
              {getLeagueDisplayLabel(event)}
            </Text>
            {isFav && <Text style={styles.favStar}>★</Text>}
            {featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={9} color={Colors.accent} />
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            )}
            {isFinalState && (
              <Text style={styles.completedLabel}>FINAL</Text>
            )}
          </View>

          <View style={styles.teamStack}>
            <View style={styles.teamScoreRow}>
              <View style={styles.teamNameRow}>
                <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={featured ? 24 : 20} />
                <Text style={featured ? styles.featuredTeamName : styles.teamName} numberOfLines={1}>
                  {displayTeamName(event.awayTeam, event.league)}
                </Text>
              </View>
              {hasScore && event.sport === "cricket"
                ? <Text style={[styles.cricketScore, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketAway || ""}</Text>
                : hasScore && <Text style={[featured ? styles.featuredScoreText : styles.scoreText, isLiveState && styles.scoreLive]}>{score.awayScore}</Text>}
            </View>
            <View style={styles.teamScoreRow}>
              <View style={styles.teamNameRow}>
                <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={featured ? 24 : 20} />
                <Text style={featured ? styles.featuredTeamName : styles.teamName} numberOfLines={1}>
                  {displayTeamName(event.homeTeam, event.league)}
                </Text>
              </View>
              {hasScore && event.sport === "cricket"
                ? <Text style={[styles.cricketScore, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketHome || ""}</Text>
                : hasScore && <Text style={[featured ? styles.featuredScoreText : styles.scoreText, isLiveState && styles.scoreLive]}>{score.homeScore}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardTimeSection}>
          {isLiveState && (
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
          )}
          {isLiveState ? (
            displayClockText ? <Text style={styles.scorePeriod}>{displayClockText}</Text> : null
          ) : isFinalState ? (
            <Text style={styles.scoreFinal}>{displayStatusText || "FT"}</Text>
          ) : (
            <>
              <Text style={featured ? styles.featuredDate : styles.cardDate}>{date}</Text>
              <Text style={featured ? styles.featuredTime : styles.cardTime}>{time}</Text>
            </>
          )}
          {provider && (
            <View style={styles.providerRow}>
              <ProviderLogo providerId={event.providerId} size={featured ? 24 : 20} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ritual = getRitualById(id);
  const { allEvents } = useEvents();
  const { getScore } = useScores();
  const { favorites } = useFavorites();
  const { getOverride, setOverride, clearOverride, loaded: overridesLoaded } = useRitualOverrides();
  const [sheetEventId, setSheetEventId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("Featured game updated");
  const toastOpacity = useRef(new RNAnimated.Value(0)).current;

  const now = useMemo(() => new Date(), []);

  const { featured: autoFeatured, rest: autoRest } = useMemo(() => {
    if (!ritual) return { featured: null, rest: [] as SportEvent[] };
    const result = getEventsForRitual(allEvents, ritual, favorites, now);
    console.log(`[GUIDE] ${result.debug.ritualId}: total=${result.debug.totalEvents}, sport=${result.debug.afterSportFilter}, day=${result.debug.afterDayFilter}, overlap=${result.debug.afterOverlapFilter}, window=${result.debug.window.ptDate} ${result.debug.window.windowStartUtc}→${result.debug.window.windowEndUtc}`);
    return result;
  }, [ritual, allEvents, favorites, now]);

  const allRitualEvents = useMemo(() => {
    if (!autoFeatured) return autoRest;
    return [autoFeatured, ...autoRest];
  }, [autoFeatured, autoRest]);

  const overrideId = id ? getOverride(id) : null;

  const overrideEvent = useMemo(() => {
    if (!overrideId) return null;
    const ev = allRitualEvents.find((e) => e.id === overrideId);
    if (!ev) return null;
    const sixHoursAgo = now.getTime() - 6 * 3600000;
    if (new Date(ev.startTimeLocal).getTime() < sixHoursAgo) return null;
    return ev;
  }, [overrideId, allRitualEvents, now]);

  useEffect(() => {
    if (!overrideId || !id || !overridesLoaded) return;
    if (allRitualEvents.length === 0) return;
    const freshNow = new Date();
    const ev = allRitualEvents.find((e) => e.id === overrideId);
    const sixHoursAgo = freshNow.getTime() - 6 * 3600000;
    if (!ev || new Date(ev.startTimeLocal).getTime() < sixHoursAgo) {
      clearOverride(id);
    }
  }, [overrideId, id, allRitualEvents, overridesLoaded]);

  const featured = overrideEvent || autoFeatured;

  const rest = useMemo(() => {
    if (!featured) return allRitualEvents;
    return allRitualEvents.filter((e) => e.id !== featured.id);
  }, [featured, allRitualEvents]);

  const { favoritesEvents, moreGames } = useMemo(() => {
    if (!rest.length) return { favoritesEvents: [] as SportEvent[], moreGames: [] as SportEvent[] };

    const favs: SportEvent[] = [];
    const others: SportEvent[] = [];

    for (const e of rest) {
      if (favoriteInvolved(e, favorites)) {
        favs.push(e);
      } else {
        others.push(e);
      }
    }

    favs.sort((a, b) => {
      const aLive = isEventLive(a, now) ? 0 : 1;
      const bLive = isEventLive(b, now) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const aStart = new Date(a.startTimeLocal).getTime();
      const bStart = new Date(b.startTimeLocal).getTime();
      return aStart - bStart;
    });

    others.sort((a, b) => {
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });

    return { favoritesEvents: favs, moreGames: others };
  }, [rest, favorites, now]);

  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  const { sportChips, leagueChips, filteredMoreGames, leagueSportMap } = useMemo(() => {
    const sports = new Map<string, number>();
    const leagues = new Map<string, number>();
    const lsMap = new Map<string, string>();
    for (const e of moreGames) {
      sports.set(e.sport, (sports.get(e.sport) || 0) + 1);
      leagues.set(e.league, (leagues.get(e.league) || 0) + 1);
      if (!lsMap.has(e.league)) lsMap.set(e.league, e.sport);
    }
    const sChips = Array.from(sports.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sport, count]) => ({ key: sport, label: sport.charAt(0).toUpperCase() + sport.slice(1), count }));
    const lChips = Array.from(leagues.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([league, count]) => ({ key: league, label: league, count }));

    let filtered = moreGames;
    if (sportFilter) {
      filtered = filtered.filter((e) => e.sport === sportFilter);
    }
    if (leagueFilter) {
      filtered = filtered.filter((e) => e.league === leagueFilter);
    }
    return { sportChips: sChips, leagueChips: lChips, filteredMoreGames: filtered, leagueSportMap: lsMap };
  }, [moreGames, sportFilter, leagueFilter]);

  const showSportChips = sportChips.length > 1;
  const showLeagueChips = leagueChips.length > 1;
  const hasActiveFilter = sportFilter !== null || leagueFilter !== null;

  const isOverrideActive = !!overrideEvent;

  const sheetEvent = useMemo(() => {
    if (!sheetEventId) return null;
    return allRitualEvents.find((e) => e.id === sheetEventId) || null;
  }, [sheetEventId, allRitualEvents]);

  const isSheetEventFeatured = sheetEventId === featured?.id;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    RNAnimated.sequence([
      RNAnimated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.delay(1500),
      RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastOpacity]);

  const handleSetFeatured = useCallback(() => {
    if (!id || !sheetEventId) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setOverride(id, sheetEventId);
    setSheetEventId(null);
    showToast("Featured game updated");
  }, [id, sheetEventId, setOverride, showToast]);

  const handleResetAuto = useCallback(() => {
    if (!id) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    clearOverride(id);
    setSheetEventId(null);
    showToast("Reverted to auto selection");
  }, [id, clearOverride, showToast]);

  const openGameSheet = useCallback((eventId: string) => {
    setSheetEventId(eventId);
  }, []);

  if (!ritual) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ritual not found</Text>
      </View>
    );
  }

  const subtitle = `${formatRitualSports(ritual)} · ${formatRitualTimeWindow(ritual)}`;
  const contextLabel = ritual.context;
  const hasNoEvents = !featured && favoritesEvents.length === 0 && moreGames.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: ritual.label,
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
            color: Colors.textPrimary,
            marginLeft: -8,
          },
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <View style={[styles.ritualIconWrap, { backgroundColor: ritual.icon === "moon" ? "#818CF820" : "#FB923C20" }]}>
              <Ionicons
                name={ritual.icon}
                size={24}
                color={ritual.icon === "moon" ? "#818CF8" : "#FB923C"}
              />
            </View>
            <View style={styles.titleTextWrap}>
              <Text style={styles.ritualTitle}>{ritual.label}</Text>
              <Text style={styles.ritualSubtitle}>{subtitle}</Text>
              <Text style={styles.contextLabel}>{contextLabel}</Text>
            </View>
          </View>
        </View>

        {featured && (
          <View style={styles.featuredSection}>
            <GuideEventCard
              event={featured}
              isFav={favoriteInvolved(featured, favorites)}
              completed={isEventCompleted(featured, now)}
              score={getScore(featured.id)}
              featured
            />
            {isOverrideActive && (
              <Pressable
                onPress={handleResetAuto}
                style={({ pressed }) => [
                  styles.changeFeaturedBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                testID="reset-auto-btn"
              >
                <Ionicons name="refresh" size={14} color={Colors.textSecondary} />
                <Text style={[styles.changeFeaturedText, { color: Colors.textSecondary }]}>Reset to Auto</Text>
                <View style={styles.overrideBadge}>
                  <Text style={styles.overrideBadgeText}>MANUAL</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {(featured || moreGames.length > 0) && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="star" size={16} color={Colors.favStar} />
              <Text style={styles.sectionLabel}>Favorites</Text>
              {favoritesEvents.length > 0 && (
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>{favoritesEvents.length}</Text>
                </View>
              )}
            </View>
            {favoritesEvents.length > 0 ? (
              favoritesEvents.map((event) => (
                <GuideEventCard
                  key={event.id}
                  event={event}
                  isFav
                  completed={isEventCompleted(event, now)}
                  score={getScore(event.id)}
                  onSetFeatured={openGameSheet}
                  isCurrentFeatured={event.id === featured?.id}
                />
              ))
            ) : (
              <View style={styles.favoritesEmpty}>
                <Text style={styles.favoritesEmptyText}>No favorites in this window</Text>
              </View>
            )}
          </View>
        )}

        {moreGames.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="football-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>More Games</Text>
              <View style={styles.countChipMuted}>
                <Text style={styles.countChipMutedText}>
                  {hasActiveFilter ? `${filteredMoreGames.length}/${moreGames.length}` : moreGames.length}
                </Text>
              </View>
            </View>

            {(showSportChips || showLeagueChips) && (
              <View style={styles.chipSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <Pressable
                    onPress={() => {
                      setSportFilter(null);
                      setLeagueFilter(null);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.chip, !hasActiveFilter && styles.chipActive]}
                    testID="filter-chip-all"
                  >
                    <Text style={[styles.chipLabel, !hasActiveFilter && styles.chipLabelActive]}>All</Text>
                  </Pressable>

                  {showSportChips && sportChips.map((sc) => {
                    const isActive = sportFilter === sc.key;
                    const color = getSportColor(sc.key);
                    return (
                      <Pressable
                        key={`sport-${sc.key}`}
                        onPress={() => {
                          setSportFilter(isActive ? null : sc.key);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[styles.chip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                        testID={`filter-chip-sport-${sc.key}`}
                      >
                        <Text style={[styles.chipLabel, isActive && { color }]}>{sc.label}</Text>
                        <View style={[styles.chipCount, isActive && { backgroundColor: color + "18" }]}>
                          <Text style={[styles.chipCountText, isActive && { color }]}>{sc.count}</Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  {showLeagueChips && leagueChips.map((lc) => {
                    const isActive = leagueFilter === lc.key;
                    const color = getSportColor(leagueSportMap.get(lc.key) || "");
                    return (
                      <Pressable
                        key={`league-${lc.key}`}
                        onPress={() => {
                          setLeagueFilter(isActive ? null : lc.key);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[styles.chip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                        testID={`filter-chip-league-${lc.key}`}
                      >
                        <Text style={[styles.chipLabel, isActive && { color }]}>{lc.label}</Text>
                        <View style={[styles.chipCount, isActive && { backgroundColor: color + "18" }]}>
                          <Text style={[styles.chipCountText, isActive && { color }]}>{lc.count}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {filteredMoreGames.length > 0 ? (
              filteredMoreGames.map((event) => (
                <GuideEventCard
                  key={event.id}
                  event={event}
                  isFav={false}
                  completed={isEventCompleted(event, now)}
                  score={getScore(event.id)}
                  onSetFeatured={openGameSheet}
                  isCurrentFeatured={event.id === featured?.id}
                />
              ))
            ) : hasActiveFilter ? (
              <View style={styles.filterEmpty}>
                <Ionicons name="filter-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.filterEmptyText}>No games match these filters</Text>
              </View>
            ) : null}
          </View>
        )}

        {hasNoEvents && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Games Right Now</Text>
            <Text style={styles.emptySubtitle}>
              No {formatRitualSports(ritual).toLowerCase()} games in this time window
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!sheetEventId}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetEventId(null)}
      >
        <View style={sheetStyles.modalContainer}>
          <Pressable
            style={sheetStyles.overlay}
            onPress={() => setSheetEventId(null)}
          />
          <View style={sheetStyles.sheet}>
            <View style={sheetStyles.handle} />
            {sheetEvent && (() => {
              const se = sheetEvent;
              const seProvider = getProviderById(se.providerId);
              const seSportColor = getSportColor(se.sport);
              const { date: seDate, time: seTime } = formatEventDate(se.startTimeLocal);
              return (
                <>
                  <View style={sheetStyles.eventInfo}>
                    <Text style={[sheetStyles.leagueLabel, { color: seSportColor }]}>
                      {getLeagueDisplayLabel(se)}
                    </Text>
                    <View style={sheetStyles.matchupRow}>
                      <TeamLogo teamName={se.awayTeam} league={se.league} sport={se.sport} size={24} />
                      <Text style={sheetStyles.teamName} numberOfLines={1}>
                        {displayTeamName(se.awayTeam, se.league)}
                      </Text>
                      <Text style={sheetStyles.atText}>
                        {["NHL","AHL","ECHL","NCAA Hockey","MLS","USL"].includes(se.league) ? "at" : "vs"}
                      </Text>
                      <TeamLogo teamName={se.homeTeam} league={se.league} sport={se.sport} size={24} />
                      <Text style={sheetStyles.teamName} numberOfLines={1}>
                        {displayTeamName(se.homeTeam, se.league)}
                      </Text>
                    </View>
                    <View style={sheetStyles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                      <Text style={sheetStyles.metaText}>{seDate} · {seTime}</Text>
                      {seProvider && (
                        <>
                          <Text style={sheetStyles.metaDot}>·</Text>
                          <ProviderLogo providerId={se.providerId} size={18} />
                          <Text style={sheetStyles.metaText}>{seProvider.name}</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={sheetStyles.actions}>
                    {isSheetEventFeatured ? (
                      <View style={[sheetStyles.actionBtn, sheetStyles.actionBtnDisabled]}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.textMuted} />
                        <Text style={[sheetStyles.actionBtnText, { color: Colors.textMuted }]}>Already Featured</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleSetFeatured}
                        style={({ pressed }) => [
                          sheetStyles.actionBtn,
                          sheetStyles.actionBtnPrimary,
                          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}
                        testID="set-featured-btn"
                      >
                        <Ionicons name="star" size={20} color={Colors.background} />
                        <Text style={[sheetStyles.actionBtnText, { color: Colors.background }]}>Set as Featured</Text>
                      </Pressable>
                    )}
                    {isSheetEventFeatured && isOverrideActive && (
                      <Pressable
                        onPress={handleResetAuto}
                        style={({ pressed }) => [
                          sheetStyles.actionBtn,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                        testID="reset-auto-sheet-btn"
                      >
                        <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
                        <Text style={[sheetStyles.actionBtnText, { color: Colors.textSecondary }]}>Reset to Auto</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <RNAnimated.View style={[sheetStyles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
          <Text style={sheetStyles.toastText}>{toastMessage}</Text>
        </RNAnimated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  headerSection: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 12,
  },
  ritualIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextWrap: {
    flex: 1,
  },
  ritualTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  ritualSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  featuredSection: {
    marginBottom: 4,
  },
  sectionBlock: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  countChip: {
    backgroundColor: Colors.favStar + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.favStar,
    fontFamily: "Inter_700Bold",
  },
  favoritesEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  favoritesEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
  countChipMuted: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countChipMutedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  chipSection: {
    marginBottom: 8,
  },
  chipRow: {
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.accent + "18",
    borderColor: Colors.accent + "44",
  },
  chipLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  chipLabelActive: {
    color: Colors.accent,
  },
  chipCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 16,
    alignItems: "center" as const,
  },
  chipCountText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
  },
  filterEmpty: {
    paddingVertical: 24,
    alignItems: "center" as const,
    gap: 8,
  },
  filterEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  featuredCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.accent + "40",
    overflow: "hidden",
  },
  featuredInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 17,
  },
  featuredLeague: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  featuredTeamName: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  featuredScoreText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 22,
    textAlign: "right",
  },
  featuredDate: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  featuredTime: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.accent + "18",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  eventCardCompleted: {
    borderColor: Colors.border,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 15,
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
  cardDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border,
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
  teamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 20,
    textAlign: "right",
  },
  cricketScore: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    flexShrink: 0,
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
  elapsedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
  changeFeaturedBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: Colors.accent + "12",
  },
  changeFeaturedText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  overrideBadge: {
    backgroundColor: Colors.accent + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  overrideBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});

const sheetStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 12,
  },
  eventInfo: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  leagueLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  matchupRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flexWrap: "wrap" as const,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  atText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 2,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.cardHighlight,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.accent,
  },
  actionBtnDisabled: {
    backgroundColor: Colors.cardHighlight,
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  toast: {
    position: "absolute" as const,
    bottom: 90,
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.card,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.accent + "44",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
});
