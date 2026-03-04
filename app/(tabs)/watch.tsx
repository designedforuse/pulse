import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { displayTeamName } from "@/utils/teams";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import UnifiedEventCard from "@/components/UnifiedEventCard";
import {
  getSportColor,
  type SportEvent,
} from "@/lib/data";
import { getTennisRoundPriority } from "@/data/tennisTopPlayers";
import { useEvents } from "@/lib/events-context";
import { useScores } from "@/lib/scores-context";
import { useFavorites } from "@/lib/favorites-context";
import {
  getLiveEventsNow,
  getUpNextEvents,
  formatLastUpdated,
} from "@/utils/time";
import { normalizeGameState } from "@/utils/gameState";
import { favoriteInvolved, isTeamFavorite } from "@/utils/favorites";
import type { Favorites } from "@/lib/data";
import {
  buildChaosSetup,
  selfHealChaosSetup,
  type ChaosSetup,
} from "@/lib/chaos-setup";

function LiveDot() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.liveDot, animStyle]} />;
}

function formatEventDate(startTimeLocal: string): { date: string; time: string } {
  const d = new Date(startTimeLocal);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date: `${month} ${day}`, time };
}

const TENSION_ACCENT_COLORS: Record<string, string> = {
  "High Drama": "#E57373",
  "Tight Game": Colors.accentSoft,
  "Heating Up": "#FFB74D",
};

function getTensionLabel(tensionRank: number): string | null {
  if (tensionRank >= 4) return "High Drama";
  if (tensionRank === 3) return "Tight Game";
  if (tensionRank === 2) return "Heating Up";
  return null;
}

function getHeroMicroLabel(tensionRank: number, event: SportEvent, now: Date): string | null {
  if (tensionRank >= 3) return "\uD83D\uDD25 High Tension";
  const startMs = new Date(event.startTimeLocal).getTime();
  const minsUntil = (startMs - now.getTime()) / 60000;
  if (minsUntil > 0 && minsUntil <= 45) return "\u23F3 Starting Soon";
  return null;
}

function ChaosCard({
  event,
  isPrimary,
  now,
  score,
  favorites,
  tensionRank = 0,
}: {
  event: SportEvent;
  isPrimary: boolean;
  now: Date;
  score?: { awayScore: number; homeScore: number; period?: string; clock?: string; status?: string; cricketAway?: string; cricketHome?: string };
  favorites: Favorites;
  tensionRank?: number;
}) {
  const sportColor = getSportColor(event.sport);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, now);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";
  const tensionLabel = getTensionLabel(tensionRank);
  const tensionAccentColor = tensionLabel ? TENSION_ACCENT_COLORS[tensionLabel] : null;
  const awayIsFav = isTeamFavorite(event.awayTeam, event.sport, favorites);
  const homeIsFav = isTeamFavorite(event.homeTeam, event.sport, favorites);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  const matchupText = event.eventType === "session" && event.sessionTitle
    ? event.sessionTitle
    : (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel
      ? event.t20WcMatchLabel
      : event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound
        ? event.olympicRound
        : null;

  if (isPrimary) {
    const microLabel = getHeroMicroLabel(tensionRank, event, now);
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.primaryCard,
          isFinalState && styles.cardCompletedOpacity,
          { opacity: pressed ? 0.9 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Animated.View style={flashStyle}>
          <LinearGradient
            colors={["rgba(0,201,104,0.07)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryInner}
          >
            {tensionAccentColor && (
              <View style={[styles.tensionAccent, { backgroundColor: tensionAccentColor }]} />
            )}
            <View style={styles.primaryHeader}>
              <Text style={[styles.primaryLeague, { color: sportColor }]}>
                {event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.league}
              </Text>
              <View style={{ flex: 1 }} />
              {isLiveState && (
                <View style={styles.liveChip}>
                  <LiveDot />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
              {isFinalState && (
                <Text style={styles.finalLabel}>FINAL</Text>
              )}
            </View>

            {microLabel && (
              <Text style={styles.heroMicroLabel}>{microLabel}</Text>
            )}

            {matchupText ? (
              <Text style={styles.primaryMatchup} numberOfLines={2}>{matchupText}</Text>
            ) : (
              <View style={styles.primaryTeams}>
                <View style={styles.primaryTeamRow}>
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={28} />
                  <Text style={styles.heroTeamName} numberOfLines={1}>
                    {displayTeamName(event.awayTeam, event.league)}{awayIsFav ? <Text style={styles.teamFavStarHero}>{" \u2605"}</Text> : null}
                  </Text>
                  {hasScore && event.sport !== "cricket" && (
                    <Text style={[styles.primaryScore, isLiveState && styles.scoreLive]}>
                      {score.awayScore}
                    </Text>
                  )}
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.primaryTeamRow}>
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={28} />
                  <Text style={styles.heroTeamName} numberOfLines={1}>
                    {displayTeamName(event.homeTeam, event.league)}{homeIsFav ? <Text style={styles.teamFavStarHero}>{" \u2605"}</Text> : null}
                  </Text>
                  {hasScore && event.sport !== "cricket" && (
                    <Text style={[styles.primaryScore, isLiveState && styles.scoreLive]}>
                      {score.homeScore}
                    </Text>
                  )}
                </View>
                {hasScore && event.sport === "cricket" && (
                  <View style={styles.cricketScoreBlock}>
                    {score.cricketAway ? <Text style={[styles.cricketScoreText, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketAway}</Text> : null}
                    {score.cricketHome ? <Text style={[styles.cricketScoreText, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketHome}</Text> : null}
                  </View>
                )}
              </View>
            )}

            <View style={styles.primaryFooter}>
              <View style={styles.primaryTimeRow}>
                {isLiveState && displayClockText ? (
                  <Text style={styles.primaryClock}>{displayClockText}</Text>
                ) : isFinalState && displayStatusText ? (
                  <Text style={styles.primaryFinalStatus}>{displayStatusText}</Text>
                ) : gameState === "UPCOMING" ? (
                  <Text style={styles.primaryTime}>{date} {"\u00B7"} {time}</Text>
                ) : null}
              </View>
              <ProviderLogo providerId={event.providerId} size={22} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.secondaryCard,
        { opacity: pressed ? 0.9 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Animated.View style={[styles.secondaryInner, flashStyle]}>
        {tensionAccentColor && (
          <View style={[styles.tensionAccentSecondary, { backgroundColor: tensionAccentColor }]} />
        )}
        <View style={styles.secondaryHeader}>
          <Text style={[styles.secondaryLeagueSm, { color: sportColor }]} numberOfLines={1}>
            {event.isIccT20Wc ? "T20 WC" : event.isOlympic ? "Olympics" : event.league}
          </Text>
          {isLiveState && (
            <View style={styles.liveChipSmall}>
              <LiveDot />
              <Text style={styles.liveTextSmall}>LIVE</Text>
            </View>
          )}
          {isFinalState && (
            <Text style={styles.finalLabelSmall}>FINAL</Text>
          )}
        </View>

        {matchupText ? (
          <Text style={styles.secondaryTeamName} numberOfLines={2}>{matchupText}</Text>
        ) : (
          <View style={styles.secondaryTeams}>
            <View style={styles.secondaryTeamRow}>
              <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={18} />
              <Text style={styles.secondaryTeamName} numberOfLines={1}>
                {displayTeamName(event.awayTeam, event.league)}{awayIsFav ? <Text style={styles.teamFavStar}>{" \u2605"}</Text> : null}
              </Text>
              {hasScore && event.sport !== "cricket" && (
                <Text style={[styles.secondaryScore, isLiveState && styles.scoreLive]}>
                  {score.awayScore}
                </Text>
              )}
            </View>
            <View style={styles.secondaryTeamRow}>
              <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={18} />
              <Text style={styles.secondaryTeamName} numberOfLines={1}>
                {displayTeamName(event.homeTeam, event.league)}{homeIsFav ? <Text style={styles.teamFavStar}>{" \u2605"}</Text> : null}
              </Text>
              {hasScore && event.sport !== "cricket" && (
                <Text style={[styles.secondaryScore, isLiveState && styles.scoreLive]}>
                  {score.homeScore}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.secondaryFooter}>
          {isLiveState && displayClockText ? (
            <Text style={styles.secondaryClock} numberOfLines={1}>{displayClockText}</Text>
          ) : isFinalState && displayStatusText ? (
            <Text style={styles.secondaryFinal} numberOfLines={1}>{displayStatusText}</Text>
          ) : gameState === "UPCOMING" ? (
            <Text style={styles.secondaryTime} numberOfLines={1}>{time}</Text>
          ) : null}
          <View style={{ opacity: 0.9 }}>
            <ProviderLogo providerId={event.providerId} size={18} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const TILE_GAP = 14;
const PAGE_PADDING = 16;

function SecondaryCarousel({
  events,
  now,
  getScore,
  favorites,
  chaosDebugRanks,
}: {
  events: SportEvent[];
  now: Date;
  getScore: (id: string) => any;
  favorites: any;
  chaosDebugRanks?: { id: string; emotion: number; tension: number; sportPri: number; isLive: boolean; isFav: boolean; isAnchor: boolean; isBackfill: boolean; hockeyChaosTotal?: number; hockeyChaosReasons?: string[] }[];
}) {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - PAGE_PADDING * 2;
  const tileWidth = events.length === 1
    ? contentWidth
    : Math.round(contentWidth * 0.82);
  const snapInterval = tileWidth + TILE_GAP;

  const renderTile = useCallback(({ item }: { item: SportEvent }) => (
    <View style={{ width: tileWidth, marginRight: TILE_GAP }}>
      <ChaosCard
        event={item}
        isPrimary={false}
        now={now}
        score={getScore(item.id)}
        favorites={favorites}
        tensionRank={chaosDebugRanks?.find(r => r.id === item.id)?.tension ?? 0}
      />
    </View>
  ), [tileWidth, now, getScore, favorites, chaosDebugRanks]);

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={renderTile}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: PAGE_PADDING }}
      style={{ marginHorizontal: -PAGE_PADDING, paddingLeft: PAGE_PADDING }}
      snapToInterval={events.length > 1 ? snapInterval : undefined}
      decelerationRate={events.length > 1 ? "fast" : undefined}
      scrollEnabled={events.length > 1}
    />
  );
}

export default function WatchScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { allEvents, favoritesOnly } = useEvents();
  const { getScore, scores } = useScores();
  const { favorites } = useFavorites();

  const [now, setNow] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [chaosSetup, setChaosSetup] = useState<ChaosSetup | null>(null);
  const chaosRef = useRef<ChaosSetup | null>(null);

  const getScoreStatus = useCallback(
    (id: string) => getScore(id)?.status,
    [scores]
  );

  const getScoreData = useCallback(
    (id: string) => getScore(id),
    [scores]
  );

  const rebuildChaos = useCallback((forNow?: Date) => {
    const t = forNow ?? new Date();
    const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus, getScoreData);
    setChaosSetup(setup);
    chaosRef.current = setup;
  }, [allEvents, favorites, getScoreStatus, getScoreData]);

  const initialised = useRef(false);
  useEffect(() => {
    if (!initialised.current && allEvents.length > 0) {
      initialised.current = true;
      const t = new Date();
      const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus, getScoreData);
      setChaosSetup(setup);
      chaosRef.current = setup;
    }
  }, [allEvents.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chaosRef.current) return;
    const current = chaosRef.current;

    const healed = selfHealChaosSetup(current, allEvents, favorites, now, getScoreStatus, getScoreData);
    if (healed) {
      setChaosSetup(healed);
      chaosRef.current = healed;
    }
  }, [now, scores]);

  const handleRebuild = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const t = new Date();
    setNow(t);
    rebuildChaos(t);
  }, [rebuildChaos]);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const t = new Date();
    setNow(t);
    rebuildChaos(t);
    setTimeout(() => setRefreshing(false), 500);
  }, [rebuildChaos]);

  const liveEvents = useMemo(() => {
    const timeLive = getLiveEventsNow(allEvents, now);
    const timeLiveIds = new Set(timeLive.map((e) => e.id));
    const scoreLive = allEvents.filter((e) => {
      if (timeLiveIds.has(e.id)) return false;
      const s = getScore(e.id);
      return s && s.status === "live";
    });
    const live = [...timeLive, ...scoreLive];
    const filtered = favoritesOnly ? live.filter((e) => favoriteInvolved(e, favorites)) : live;
    return [...filtered].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
      const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [allEvents, now, favoritesOnly, favorites, getScore]);

  const [upNextSportFilter, setUpNextSportFilter] = useState<string | null>(null);
  const [upNextLeagueFilter, setUpNextLeagueFilter] = useState<string | null>(null);

  const upNextAll = useMemo(() => {
    const upcoming = getUpNextEvents(allEvents, now);
    const filtered = favoritesOnly ? upcoming.filter((e) => favoriteInvolved(e, favorites)) : upcoming;
    return [...filtered].sort(
      (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
    );
  }, [allEvents, now, favoritesOnly, favorites]);

  const { upNextSportChips, upNextLeagueChips, upNextEvents, upNextLeagueSportMap, upNextHasFilter } = useMemo(() => {
    const sports = new Map<string, number>();
    const leagues = new Map<string, number>();
    const lsMap = new Map<string, string>();
    for (const e of upNextAll) {
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

    let events = upNextAll;
    if (upNextSportFilter) {
      events = events.filter((e) => e.sport === upNextSportFilter);
    }
    if (upNextLeagueFilter) {
      events = events.filter((e) => e.league === upNextLeagueFilter);
    }
    const hasFilter = upNextSportFilter !== null || upNextLeagueFilter !== null;
    return { upNextSportChips: sChips, upNextLeagueChips: lChips, upNextEvents: events, upNextLeagueSportMap: lsMap, upNextHasFilter: hasFilter };
  }, [upNextAll, upNextSportFilter, upNextLeagueFilter]);

  const showUpNextSportChips = upNextSportChips.length > 1;
  const showUpNextLeagueChips = upNextLeagueChips.length > 1;

  const upNextDayGroups = useMemo(() => {
    const groups: { label: string; key: string; events: SportEvent[] }[] = [];
    const dayMap = new Map<string, SportEvent[]>();
    const dayLabels = new Map<string, string>();
    for (const event of upNextEvents) {
      const d = new Date(event.startTimeLocal);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dayMap.has(key)) {
        dayMap.set(key, []);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dayLabels.set(key, `${dayNames[d.getDay()]} · ${monthNames[d.getMonth()]} ${d.getDate()}`);
      }
      dayMap.get(key)!.push(event);
    }
    const sortedKeys = [...dayMap.keys()].sort();
    for (const key of sortedKeys) {
      groups.push({ label: dayLabels.get(key)!, key, events: dayMap.get(key)! });
    }
    return groups;
  }, [upNextEvents]);

  useEffect(() => {
    if (!__DEV__) return;
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const perDay: Record<string, number> = {};
    for (const g of upNextDayGroups) {
      perDay[g.label] = g.events.length;
    }
    console.log(
      `[UP NEXT] now=${now.toISOString()} windowEnd=${windowEnd.toISOString()} count=${upNextEvents.length} days=${JSON.stringify(perDay)}`
    );
  }, [upNextEvents, upNextDayGroups, now]);

  const chaosIds = useMemo(() => {
    if (!chaosSetup) return new Set<string>();
    const ids = new Set<string>();
    if (chaosSetup.primary) ids.add(chaosSetup.primary.id);
    for (const e of chaosSetup.secondary) ids.add(e.id);
    return ids;
  }, [chaosSetup]);

  const filteredLive = useMemo(
    () => liveEvents.filter((e) => !chaosIds.has(e.id)),
    [liveEvents, chaosIds]
  );

  const SPORT_PRIORITY: Record<string, number> = { rugby: 0, cricket: 1, hockey: 2, soccer: 3, tennis: 4 };

  const sortedLive = useMemo(() => {
    return [...filteredLive].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
      const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      if (a.sport === "tennis" && b.sport === "tennis") {
        const aRound = getTennisRoundPriority(a.tennisRound || "");
        const bRound = getTennisRoundPriority(b.tennisRound || "");
        if (aRound !== bRound) return bRound - aRound;
        return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
      }
      const aSp = SPORT_PRIORITY[a.sport] ?? 9;
      const bSp = SPORT_PRIORITY[b.sport] ?? 9;
      if (aSp !== bSp) return aSp - bSp;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [filteredLive, favorites]);

  const [liveExpanded, setLiveExpanded] = useState(false);

  const { visibleLive, hiddenCount } = useMemo(() => {
    if (liveExpanded) return { visibleLive: sortedLive, hiddenCount: 0 };
    const favs = sortedLive.filter((e) => favoriteInvolved(e, favorites));
    const nonFavs = sortedLive.filter((e) => !favoriteInvolved(e, favorites));
    const shown = [...favs, ...nonFavs.slice(0, 6)];
    return { visibleLive: shown, hiddenCount: Math.max(0, sortedLive.length - shown.length) };
  }, [sortedLive, liveExpanded, favorites]);

  const hasChaos = chaosSetup && chaosSetup.primary;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="trophy" size={28} color={Colors.accent} />
            <Text style={styles.headerTitle}>Watch</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="settings-button"
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {hasChaos ? (
          <View style={styles.chaosSection}>
            <View style={styles.chaosTitleRow}>
              <Ionicons name="flash" size={20} color="#818CF8" />
              <Text style={styles.chaosTitle}>
                {chaosSetup.candidateCount > 0 ? "Chaos Mode" : "Next Up"}
              </Text>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={handleRebuild}
                style={({ pressed }) => [
                  styles.rebuildButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="shuffle" size={16} color={Colors.accent} />
                <Text style={styles.rebuildText}>Reshuffle</Text>
              </Pressable>
            </View>

            <ChaosCard
              event={chaosSetup.primary!}
              isPrimary
              now={now}
              score={getScore(chaosSetup.primary!.id)}
              favorites={favorites}
              tensionRank={chaosSetup.debug?.selectedRanks?.find(r => r.id === chaosSetup.primary!.id)?.tension ?? 0}
            />

            {chaosSetup.secondary.length > 0 && (
              <SecondaryCarousel
                events={chaosSetup.secondary}
                now={now}
                getScore={getScore}
                favorites={favorites}
                chaosDebugRanks={chaosSetup.debug?.selectedRanks}
              />
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No upcoming games</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for live games and upcoming events
            </Text>
          </View>
        )}

        {sortedLive.length > 0 && (
          <View style={styles.liveSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLiveIcon}>
                <LiveDot />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.live }]}>Live Now</Text>
              <View style={[styles.sectionCount, { backgroundColor: Colors.liveDim }]}>
                <Text style={[styles.sectionCountText, { color: Colors.live }]}>
                  {sortedLive.length}
                </Text>
              </View>
            </View>
            {visibleLive.map((event) => (
              <UnifiedEventCard
                key={event.id}
                event={event}
                now={now}
                score={getScore(event.id)}
                isFav={favoriteInvolved(event, favorites)}
                showCountdown={true}
              />
            ))}
            {(hiddenCount > 0 || liveExpanded) && (
              <Pressable
                onPress={() => setLiveExpanded((prev) => !prev)}
                style={({ pressed }) => [
                  styles.expandButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.expandButtonText}>
                  {liveExpanded ? "Show fewer" : `View all live (${sortedLive.length})`}
                </Text>
                <Ionicons
                  name={liveExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.accentSoft}
                />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.upNextSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.sectionTitle}>Up Next</Text>
            {upNextAll.length > 0 && (
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>
                  {upNextHasFilter ? `${upNextEvents.length}/${upNextAll.length}` : upNextAll.length}
                </Text>
              </View>
            )}
          </View>
          {upNextAll.length > 0 && (showUpNextSportChips || showUpNextLeagueChips) && (
            <View style={styles.upNextChipSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.upNextChipRow}
              >
                <Pressable
                  onPress={() => {
                    setUpNextSportFilter(null);
                    setUpNextLeagueFilter(null);
                  }}
                  style={[styles.upNextChip, !upNextHasFilter && styles.upNextChipActive]}
                  testID="upnext-chip-all"
                >
                  <Text style={[styles.upNextChipLabel, !upNextHasFilter && styles.upNextChipLabelActive]}>All</Text>
                </Pressable>

                {showUpNextSportChips && upNextSportChips.map((sc) => {
                  const isActive = upNextSportFilter === sc.key;
                  const color = getSportColor(sc.key);
                  return (
                    <Pressable
                      key={`sport-${sc.key}`}
                      onPress={() => {
                        setUpNextSportFilter(isActive ? null : sc.key);
                        setUpNextLeagueFilter(null);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                      testID={`upnext-chip-sport-${sc.key}`}
                    >
                      <Text style={[styles.upNextChipLabel, isActive && { color }]}>{sc.label}</Text>
                      <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                        <Text style={[styles.upNextChipCountText, isActive && { color }]}>{sc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}

                {showUpNextLeagueChips && upNextLeagueChips.map((lc) => {
                  const isActive = upNextLeagueFilter === lc.key;
                  const color = getSportColor(upNextLeagueSportMap.get(lc.key) || "");
                  return (
                    <Pressable
                      key={`league-${lc.key}`}
                      onPress={() => {
                        setUpNextLeagueFilter(isActive ? null : lc.key);
                        setUpNextSportFilter(null);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                      testID={`upnext-chip-league-${lc.key}`}
                    >
                      <Text style={[styles.upNextChipLabel, isActive && { color }]}>{lc.label}</Text>
                      <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                        <Text style={[styles.upNextChipCountText, isActive && { color }]}>{lc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {upNextEvents.length === 0 && !upNextHasFilter ? (
            <View style={styles.upNextEmpty}>
              <Ionicons name="moon-outline" size={28} color={Colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={styles.upNextEmptyText}>Nothing coming up in the next 24 hours.</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/explore")}
                style={styles.upNextEmptyAction}
              >
                <Text style={styles.upNextEmptyActionText}>Explore narratives</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
              </Pressable>
            </View>
          ) : upNextEvents.length === 0 && upNextHasFilter ? (
            <View style={styles.upNextFilterEmpty}>
              <Ionicons name="filter-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.upNextFilterEmptyText}>No games match this filter</Text>
            </View>
          ) : (
            upNextDayGroups.map((group, gi) => (
              <View key={group.key}>
                {upNextDayGroups.length > 1 && (
                  <View style={[styles.dayDivider, gi === 0 && { marginTop: 0 }]}>
                    {gi > 0 && <View style={styles.dayDividerLine} />}
                    <Text style={styles.dayDividerText}>{group.label}</Text>
                  </View>
                )}
                {group.events.map((event) => (
                  <UnifiedEventCard
                    key={event.id}
                    event={event}
                    now={now}
                    score={getScore(event.id)}
                    isFav={favoriteInvolved(event, favorites)}
                    showCountdown={true}
                  />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.footerMeta}>
          <Text style={styles.lastUpdated}>
            Last updated: {formatLastUpdated(now)}
          </Text>
          {favoritesOnly && (
            <View style={styles.favIndicator}>
              <Ionicons name="star" size={12} color={Colors.favStar} />
              <Text style={styles.favIndicatorText}>Favorites only</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },

  chaosSection: {
    marginBottom: 24,
  },
  chaosTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  chaosTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  rebuildButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rebuildText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },

  primaryCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#818CF8" + "40",
    marginBottom: 20,
  },
  primaryInner: {
    backgroundColor: Colors.card,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 17,
    overflow: "hidden" as const,
  },
  tensionAccent: {
    position: "absolute" as const,
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  tensionAccentSecondary: {
    position: "absolute" as const,
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  heroMicroLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    marginTop: -6,
  },
  primaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  primaryLeague: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  primaryTeams: {
    gap: 6,
    marginBottom: 14,
  },
  primaryTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryTeamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  heroTeamName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  primaryMatchup: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  vsText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    paddingLeft: 38,
  },
  primaryScore: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 28,
    textAlign: "right",
  },
  primaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  primaryClock: {
    fontSize: 14,
    color: Colors.accentSoft,
    fontFamily: "Inter_600SemiBold",
  },
  primaryElapsed: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  secondaryCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(72, 72, 74, 0.6)",
  },
  secondaryInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
    overflow: "hidden" as const,
  },
  secondaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  secondaryLeague: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  secondaryLeagueSm: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  secondaryTeams: {
    gap: 4,
    marginBottom: 10,
  },
  secondaryTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryTeamName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  secondaryScore: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 18,
    textAlign: "right",
  },
  secondaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
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
    maxWidth: 260,
  },

  liveSection: {
    marginBottom: 20,
  },
  upNextSection: {
    marginBottom: 20,
  },
  dayDivider: {
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 6,
  },
  dayDividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(161, 161, 166, 0.2)",
    marginBottom: 8,
  },
  dayDividerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  upNextChipSection: {
    marginBottom: 8,
  },
  upNextChipRow: {
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
  },
  upNextChip: {
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
  upNextChipActive: {
    backgroundColor: Colors.accent + "18",
    borderColor: Colors.accent + "44",
  },
  upNextChipLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  upNextChipLabelActive: {
    color: Colors.accent,
  },
  upNextChipCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 16,
    alignItems: "center" as const,
  },
  upNextChipCountText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
  },
  upNextFilterEmpty: {
    paddingVertical: 24,
    alignItems: "center" as const,
    gap: 8,
  },
  upNextFilterEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  upNextEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  upNextEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center" as const,
  },
  upNextEmptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  upNextEmptyActionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLiveIcon: {
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  sectionCount: {
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },

  teamFavStarHero: {
    fontSize: 19,
    color: Colors.favStar,
  },
  teamFavStar: {
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
  liveChipSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: "auto" as const,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: {
    color: Colors.live,
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  liveTextSmall: {
    color: Colors.live,
    fontSize: 9,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  cricketScoreBlock: {
    marginTop: 4,
    gap: 2,
  },
  cricketScoreText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  scoreLive: {
    color: Colors.accentSoft,
  },
  finalLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  finalLabelSmall: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginLeft: "auto" as const,
  },
  primaryFinalStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryClock: {
    fontSize: 10,
    color: Colors.accentSoft,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryFinal: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  cardCompletedOpacity: {},
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "rgba(44, 44, 46, 0.6)",
  },
  expandButtonText: {
    fontSize: 13,
    color: Colors.accentSoft,
    fontFamily: "Inter_600SemiBold",
  },
  footerMeta: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  favIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  favIndicatorText: {
    fontSize: 11,
    color: Colors.favStar,
    fontFamily: "Inter_500Medium",
  },
});
