import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
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
import { favoriteInvolved } from "@/utils/favorites";
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
  const live = isEventLive(event, new Date());
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);

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
        completed && styles.eventCardCompleted,
        {
          opacity: pressed ? 0.85 : completed ? 0.55 : 1,
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
            {completed && (
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
                ? <Text style={[styles.cricketScore, score.status === "live" && styles.scoreLive]} numberOfLines={1}>{score.cricketAway || ""}</Text>
                : hasScore && <Text style={[featured ? styles.featuredScoreText : styles.scoreText, score.status === "live" && styles.scoreLive]}>{score.awayScore}</Text>}
            </View>
            <View style={styles.teamScoreRow}>
              <View style={styles.teamNameRow}>
                <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={featured ? 24 : 20} />
                <Text style={featured ? styles.featuredTeamName : styles.teamName} numberOfLines={1}>
                  {displayTeamName(event.homeTeam, event.league)}
                </Text>
              </View>
              {hasScore && event.sport === "cricket"
                ? <Text style={[styles.cricketScore, score.status === "live" && styles.scoreLive]} numberOfLines={1}>{score.cricketHome || ""}</Text>
                : hasScore && <Text style={[featured ? styles.featuredScoreText : styles.scoreText, score.status === "live" && styles.scoreLive]}>{score.homeScore}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardTimeSection}>
          {live && (
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
          )}
          {hasScore && score.status === "live" ? (
            (() => {
              const isRugby = event.sport === "Rugby";
              if (isRugby) {
                const clockText = getRugbyClockDisplay(score);
                if (clockText) return <Text style={styles.scorePeriod}>{clockText}</Text>;
                const elapsed = formatTimeSinceStart(event.startTimeLocal, new Date());
                return elapsed ? <Text style={styles.elapsedText}>{elapsed}</Text> : null;
              }
              if (event.sport === "cricket") return null;
              if (score.period || score.clock) {
                return (
                  <>
                    {score.period ? <Text style={styles.scorePeriod}>{score.period}</Text> : null}
                    {score.clock ? <Text style={styles.scoreClock}>{score.clock}</Text> : null}
                  </>
                );
              }
              const elapsed = formatTimeSinceStart(event.startTimeLocal, new Date());
              return elapsed ? <Text style={styles.elapsedText}>{elapsed}</Text> : null;
            })()
          ) : hasScore && score.status === "final" ? (
            <Text style={styles.scoreFinal}>{score.period || "FT"}</Text>
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

  const now = useMemo(() => new Date(), []);

  const { featured, rest } = useMemo(() => {
    if (!ritual) return { featured: null, rest: [] as SportEvent[] };
    const result = getEventsForRitual(allEvents, ritual, favorites, now);
    console.log(`[GUIDE] ${result.debug.ritualId}: total=${result.debug.totalEvents}, sport=${result.debug.afterSportFilter}, day=${result.debug.afterDayFilter}, overlap=${result.debug.afterOverlapFilter}, window=${result.debug.window.ptDate} ${result.debug.window.windowStartUtc}→${result.debug.window.windowEndUtc}`);
    return result;
  }, [ritual, allEvents, favorites, now]);

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
});
