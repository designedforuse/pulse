import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  FlatList,
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
}: {
  event: SportEvent;
  isFav: boolean;
  completed: boolean;
  score?: ScoreData;
  featured?: boolean;
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

function PickerRow({
  event,
  isSelected,
  onSelect,
}: {
  event: SportEvent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);
  const { date, time } = formatEventDate(event.startTimeLocal);
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        pickerStyles.row,
        isSelected && pickerStyles.rowSelected,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={pickerStyles.rowLeft}>
        <Text style={[pickerStyles.leagueLabel, { color: sportColor }]}>
          {event.league}
        </Text>
        <Text style={pickerStyles.matchup} numberOfLines={1}>
          {displayTeamName(event.awayTeam)} @ {displayTeamName(event.homeTeam)}
        </Text>
        <Text style={pickerStyles.dateTime}>{date} · {time}</Text>
      </View>
      <View style={pickerStyles.rowRight}>
        {provider && (
          <ProviderLogo providerId={event.providerId} size={20} />
        )}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
        )}
      </View>
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
  const [pickerVisible, setPickerVisible] = useState(false);

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

  const isOverrideActive = !!overrideEvent;

  const handleSelectOverride = useCallback(
    (eventId: string) => {
      if (!id) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setOverride(id, eventId);
      setPickerVisible(false);
    },
    [id, setOverride],
  );

  const handleResetAuto = useCallback(() => {
    if (!id) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    clearOverride(id);
    setPickerVisible(false);
  }, [id, clearOverride]);

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
            {allRitualEvents.length > 1 && (
              <Pressable
                onPress={() => setPickerVisible(true)}
                style={({ pressed }) => [
                  styles.changeFeaturedBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                testID="change-featured-btn"
              >
                <Ionicons name="swap-horizontal" size={14} color={Colors.accent} />
                <Text style={styles.changeFeaturedText}>
                  {isOverrideActive ? "Change Featured Game" : "Set Featured Game"}
                </Text>
                {isOverrideActive && (
                  <View style={styles.overrideBadge}>
                    <Text style={styles.overrideBadgeText}>MANUAL</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        )}

        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={pickerStyles.modalContainer}>
            <Pressable
              style={pickerStyles.overlay}
              onPress={() => setPickerVisible(false)}
            />
            <View style={pickerStyles.sheet}>
              <View style={pickerStyles.handle} />
              <View style={pickerStyles.header}>
                <Text style={pickerStyles.headerTitle}>Choose Featured Game</Text>
                <Pressable onPress={() => setPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
                </Pressable>
              </View>
              {isOverrideActive && (
                <Pressable
                  onPress={handleResetAuto}
                  style={({ pressed }) => [
                    pickerStyles.resetRow,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="reset-auto-btn"
                >
                  <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
                  <Text style={pickerStyles.resetText}>Reset to Auto</Text>
                </Pressable>
              )}
              <FlatList
                data={allRitualEvents}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => (
                  <PickerRow
                    event={item}
                    isSelected={featured?.id === item.id}
                    onSelect={() => handleSelectOverride(item.id)}
                  />
                )}
                contentContainerStyle={pickerStyles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>

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
                <Text style={styles.countChipMutedText}>{moreGames.length}</Text>
              </View>
            </View>
            {moreGames.map((event) => (
              <GuideEventCard
                key={event.id}
                event={event}
                isFav={false}
                completed={isEventCompleted(event, now)}
                score={getScore(event.id)}
              />
            ))}
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

const pickerStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  resetText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  rowSelected: {
    backgroundColor: Colors.accent + "12",
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  leagueLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  matchup: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  dateTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
  },
});
