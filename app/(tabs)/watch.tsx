import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { getRugbyClockDisplay } from "@/utils/rugbyClock";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import {
  getProviderById,
  getSportColor,
  type SportEvent,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { useScores } from "@/lib/scores-context";
import { useFavorites } from "@/lib/favorites-context";
import {
  getLiveEventsNow,
  getUpNextEvents,
  formatLastUpdated,
  formatTimeUntilStart,
  formatTimeSinceStart,
  isEventLive,
} from "@/utils/time";
import { normalizeGameState } from "@/utils/gameState";
import { favoriteInvolved } from "@/utils/favorites";
import {
  buildChaosSetup,
  shouldAutoRegenerate,
  findHigherPriorityAlert,
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

function ChaosCard({
  event,
  isPrimary,
  now,
  score,
  isFav,
}: {
  event: SportEvent;
  isPrimary: boolean;
  now: Date;
  score?: { awayScore: number; homeScore: number; period?: string; clock?: string; status?: string; cricketAway?: string; cricketHome?: string };
  isFav: boolean;
}) {
  const sportColor = getSportColor(event.sport);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, now);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";
  const scoreColorStyle = isLiveState ? styles.scoreLive : isFinalState ? null : null;

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
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.primaryCard,
          isFinalState && styles.cardCompletedOpacity,
          { opacity: pressed ? 0.9 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Animated.View style={[styles.primaryInner, flashStyle]}>
          <View style={styles.primaryHeader}>
            <Text style={[styles.primaryLeague, { color: sportColor }]}>
              {event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.league}
            </Text>
            {isFav && <Text style={styles.favStar}>★</Text>}
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

          {matchupText ? (
            <Text style={styles.primaryMatchup} numberOfLines={2}>{matchupText}</Text>
          ) : (
            <View style={styles.primaryTeams}>
              <View style={styles.primaryTeamRow}>
                <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={28} />
                <Text style={styles.primaryTeamName} numberOfLines={1}>
                  {displayTeamName(event.awayTeam, event.league)}
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
                <Text style={styles.primaryTeamName} numberOfLines={1}>
                  {displayTeamName(event.homeTeam, event.league)}
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
                <Text style={styles.primaryTime}>{date} · {time}</Text>
              ) : null}
            </View>
            <ProviderLogo providerId={event.providerId} size={22} />
          </View>
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
        <View style={styles.secondaryHeader}>
          <Text style={[styles.secondaryLeague, { color: sportColor }]} numberOfLines={1}>
            {event.isIccT20Wc ? "T20 WC" : event.isOlympic ? "Olympics" : event.league}
          </Text>
          {isFav && <Text style={styles.favStarSmall}>★</Text>}
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
                {displayTeamName(event.awayTeam, event.league)}
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
                {displayTeamName(event.homeTeam, event.league)}
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
          <ProviderLogo providerId={event.providerId} size={18} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function LiveEventRow({
  event,
  isLive: isLiveProp,
  now,
  score,
  isFav,
}: {
  event: SportEvent;
  isLive: boolean;
  now: Date;
  score?: { awayScore: number; homeScore: number; period?: string; clock?: string; status?: string; cricketAway?: string; cricketHome?: string };
  isFav: boolean;
}) {
  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, now);
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";

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

  const showTeamStack = !matchupText;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.eventCard,
        { opacity: pressed ? 0.85 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Animated.View style={[styles.cardInner, flashStyle]}>
        <View style={styles.cardTeamsSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardLeague, { color: sportColor }]}>
              {event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.league}
            </Text>
            {isFav && <Text style={styles.favStar}>★</Text>}
            {isFinalState && <Text style={styles.finalLabel}>FINAL</Text>}
          </View>

          {showTeamStack ? (
            <View style={styles.teamStack}>
              <View style={styles.teamScoreRow}>
                <View style={styles.teamNameRow}>
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={20} />
                  <Text style={styles.teamName} numberOfLines={1}>{displayTeamName(event.awayTeam, event.league)}</Text>
                </View>
                {hasScore && event.sport === "cricket"
                  ? <Text style={[styles.cricketScore, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketAway || ""}</Text>
                  : hasScore && <Text style={[styles.scoreText, isLiveState && styles.scoreLive]}>{score.awayScore}</Text>}
              </View>
              <View style={styles.teamScoreRow}>
                <View style={styles.teamNameRow}>
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={20} />
                  <Text style={styles.teamName} numberOfLines={1}>{displayTeamName(event.homeTeam, event.league)}</Text>
                </View>
                {hasScore && event.sport === "cricket"
                  ? <Text style={[styles.cricketScore, isLiveState && styles.scoreLive]} numberOfLines={1}>{score.cricketHome || ""}</Text>
                  : hasScore && <Text style={[styles.scoreText, isLiveState && styles.scoreLive]}>{score.homeScore}</Text>}
              </View>
            </View>
          ) : (
            <Text style={styles.teamName} numberOfLines={2}>{matchupText}</Text>
          )}
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardTimeSection}>
          {isLiveState && (
            <View style={styles.liveChip}>
              <LiveDot />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {isLiveState ? (
            displayClockText ? <Text style={styles.scorePeriod}>{displayClockText}</Text> : null
          ) : isFinalState ? (
            <Text style={styles.scoreFinal}>{displayStatusText || "FT"}</Text>
          ) : (
            <>
              <Text style={styles.cardDate}>{date}</Text>
              <Text style={styles.cardTime}>{time}</Text>
              <Text style={styles.upNextTime}>
                {formatTimeUntilStart(event.startTimeLocal, now)}
              </Text>
            </>
          )}
          {provider && (
            <View style={styles.providerRow}>
              <ProviderLogo providerId={event.providerId} size={20} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
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
  const [alertEvent, setAlertEvent] = useState<SportEvent | null>(null);
  const chaosRef = useRef<ChaosSetup | null>(null);

  const getScoreStatus = useCallback(
    (id: string) => getScore(id)?.status,
    [scores]
  );

  const rebuildChaos = useCallback((forNow?: Date) => {
    const t = forNow ?? new Date();
    const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus);
    setChaosSetup(setup);
    chaosRef.current = setup;
    setAlertEvent(null);
  }, [allEvents, favorites, getScoreStatus]);

  const initialised = useRef(false);
  useEffect(() => {
    if (!initialised.current && allEvents.length > 0) {
      initialised.current = true;
      const t = new Date();
      const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus);
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

    if (shouldAutoRegenerate(current, allEvents, now, getScoreStatus)) {
      rebuildChaos(now);
      return;
    }

    const higher = findHigherPriorityAlert(current, allEvents, favorites, now, getScoreStatus);
    setAlertEvent(higher);
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

  const upNextEvents = useMemo(() => {
    const upcoming = getUpNextEvents(allEvents, now).slice(0, 10);
    const filtered = favoritesOnly ? upcoming.filter((e) => favoriteInvolved(e, favorites)) : upcoming;
    return [...filtered].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
      const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [allEvents, now, favoritesOnly, favorites]);

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
                {chaosSetup.candidateCount > 0 ? "4-Game Chaos Setup" : "Next Up"}
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
                <Text style={styles.rebuildText}>Rebuild</Text>
              </Pressable>
            </View>

            {alertEvent && (
              <Pressable
                onPress={handleRebuild}
                style={({ pressed }) => [
                  styles.alertBanner,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="arrow-up-circle" size={18} color="#FFD54F" />
                <Text style={styles.alertText}>Higher priority game now live</Text>
                <Text style={styles.alertAction}>Update Setup</Text>
              </Pressable>
            )}

            <ChaosCard
              event={chaosSetup.primary!}
              isPrimary
              now={now}
              score={getScore(chaosSetup.primary!.id)}
              isFav={favoriteInvolved(chaosSetup.primary!, favorites)}
            />

            {chaosSetup.secondary.length > 0 && (
              <View style={styles.secondaryRow}>
                {chaosSetup.secondary.map((event) => (
                  <ChaosCard
                    key={event.id}
                    event={event}
                    isPrimary={false}
                    now={now}
                    score={getScore(event.id)}
                    isFav={favoriteInvolved(event, favorites)}
                  />
                ))}
              </View>
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

        {filteredLive.length > 0 && (
          <View style={styles.liveSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLiveIcon}>
                <LiveDot />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.live }]}>Live Now</Text>
              <View style={[styles.sectionCount, { backgroundColor: Colors.liveDim }]}>
                <Text style={[styles.sectionCountText, { color: Colors.live }]}>
                  {filteredLive.length}
                </Text>
              </View>
            </View>
            {filteredLive.map((event) => (
              <LiveEventRow
                key={event.id}
                event={event}
                isLive
                now={now}
                score={getScore(event.id)}
                isFav={favoriteInvolved(event, favorites)}
              />
            ))}
          </View>
        )}

        {upNextEvents.length > 0 && (
          <View style={styles.upNextSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>Up Next</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{upNextEvents.length}</Text>
              </View>
            </View>
            {upNextEvents.map((event) => (
              <LiveEventRow
                key={event.id}
                event={event}
                isLive={false}
                now={now}
                score={getScore(event.id)}
                isFav={favoriteInvolved(event, favorites)}
              />
            ))}
          </View>
        )}

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

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 213, 79, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 213, 79, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 13,
    color: "#FFD54F",
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  alertAction: {
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
    marginBottom: 10,
  },
  primaryInner: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 17,
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
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  primaryElapsed: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
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

  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 8,
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
  favStarSmall: {
    fontSize: 10,
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
  teamStack: {
    gap: 4,
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
  teamName: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
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
    color: Colors.accent,
  },
  scoreFinal: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
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
    fontSize: 11,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryFinal: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  cardCompletedOpacity: {},
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
  upNextTime: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  scorePeriod: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  scoreClock: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  elapsedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  providerRow: {
    marginTop: 8,
    alignItems: "center",
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
