import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Platform,
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
import Colors from "@/constants/colors";
import {
  getProviderById,
  getFavorites,
  formatStartTime,
  getSportColor,
  type SportEvent,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import {
  getLiveEventsNow,
  getUpNextEvents,
  formatLastUpdated,
  formatTimeUntilStart,
} from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";

function LiveIndicator() {
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

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.liveDot, animStyle]} />;
}

function EventRow({ event, isLive, now, isFav }: { event: SportEvent; isLive: boolean; now: Date; isFav: boolean }) {
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
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.eventCardTop}>
        <View style={styles.leftContent}>
          <View style={styles.badgeRow}>
            {isLive && (
              <View style={styles.liveTag}>
                <LiveIndicator />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <View style={[styles.sportBadge, { backgroundColor: sportColor + "22" }]}>
              <Ionicons
                name={
                  event.sport === "hockey"
                    ? "snow"
                    : event.sport === "rugby"
                    ? "american-football"
                    : event.sport === "cricket"
                    ? "baseball"
                    : "football"
                }
                size={12}
                color={sportColor}
              />
              <Text style={[styles.sportBadgeText, { color: sportColor }]}>
                {event.sport.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.leagueLabel}>{event.league}</Text>
            {isFav && (
              <View style={styles.favBadge}>
                <Text style={styles.favStar}>★</Text>
              </View>
            )}
          </View>
          <Text style={styles.matchupText}>
            {event.eventType === "session" && event.sessionTitle
              ? event.sessionTitle
              : (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel
                ? event.t20WcMatchLabel
                : `${event.awayTeam} @ ${event.homeTeam}`}
          </Text>
        </View>
        <View style={styles.rightContent}>
          {isLive ? (
            <View style={styles.liveTimeChip}>
              <View style={styles.liveTimeDot} />
              <Text style={styles.liveTimeText}>LIVE</Text>
            </View>
          ) : (
            <Text style={styles.upNextTime}>
              {formatTimeUntilStart(event.startTimeLocal, now)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.eventCardBottom}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.timeText}>{formatStartTime(event.startTimeLocal)}</Text>
        </View>
        {provider && (
          <View style={styles.providerChip}>
            <Ionicons name="tv-outline" size={11} color={Colors.accent} />
            <Text style={styles.providerText}>{provider.name}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface SectionData {
  title: string;
  data: SportEvent[];
  isLive: boolean;
}

export default function LiveNowScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { allEvents, favoritesOnly } = useEvents();
  const favorites = getFavorites();

  const [now, setNow] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  const liveEvents = useMemo(() => {
    const live = getLiveEventsNow(allEvents, now);
    const filtered = favoritesOnly ? live.filter((e) => favoriteInvolved(e, favorites)) : live;
    return [...filtered].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 1 : 0;
      const bFav = favoriteInvolved(b, favorites) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [allEvents, now, favoritesOnly, favorites]);

  const upNextEvents = useMemo(() => {
    const upcoming = getUpNextEvents(allEvents, now);
    const filtered = favoritesOnly ? upcoming.filter((e) => favoriteInvolved(e, favorites)) : upcoming;
    return [...filtered].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 1 : 0;
      const bFav = favoriteInvolved(b, favorites) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [allEvents, now, favoritesOnly, favorites]);

  const sections: SectionData[] = [];
  if (liveEvents.length > 0) {
    sections.push({ title: "Live Now", data: liveEvents, isLive: true });
  }
  if (upNextEvents.length > 0) {
    sections.push({ title: "Up Next", data: upNextEvents, isLive: false });
  }

  const isEmpty = sections.length === 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 },
        ]}
      >
        <View style={styles.headerTopRow}>
          <Ionicons name="radio" size={24} color={Colors.live} />
          <Text style={styles.headerTitle}>Live Now</Text>
          {liveEvents.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{liveEvents.length}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={handleManualRefresh}
            hitSlop={12}
            style={({ pressed }) => [
              styles.refreshButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
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

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="radio-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {favoritesOnly ? "No Favorite Events Live" : "No Live or Upcoming Events"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {favoritesOnly
              ? "None of your favorite teams are playing or coming up next"
              : "Check back during game times to see live events and what's coming up next"}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) => (
            <EventRow
              event={item}
              isLive={section.isLive}
              now={now}
              isFav={favoriteInvolved(item, favorites)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.isLive ? (
                <View style={styles.sectionLiveIcon}>
                  <LiveIndicator />
                </View>
              ) : (
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.sectionTitle,
                  section.isLive && { color: Colors.live },
                ]}
              >
                {section.title}
              </Text>
              <View style={[styles.sectionCount, section.isLive && { backgroundColor: Colors.liveDim }]}>
                <Text style={[styles.sectionCountText, section.isLive && { color: Colors.live }]}>
                  {section.data.length}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleManualRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTopRow: {
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
  countBadge: {
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    color: Colors.live,
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  refreshButton: {
    padding: 6,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  favIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  favIndicatorText: {
    fontSize: 11,
    color: Colors.favStar,
    fontFamily: "Inter_500Medium",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
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
    backgroundColor: "rgba(123, 141, 160, 0.15)",
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
  listContent: {
    gap: 8,
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
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
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  leagueLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  favBadge: {
    backgroundColor: Colors.favStarDim,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  favStar: {
    fontSize: 10,
    color: Colors.favStar,
  },
  matchupText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  liveTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
  },
  liveTimeText: {
    color: Colors.live,
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  upNextTime: {
    fontSize: 13,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  eventCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  providerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
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
    lineHeight: 20,
  },
});
