import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { TeamLogo } from "@/components/TeamLogo";
import ProviderLogo from "@/components/ProviderLogo";
import { compactTeamName } from "@/utils/teams";
import { isTeamFavorite } from "@/utils/favorites";
import { getGrandPrixFlag } from "@/components/UnifiedEventCard";
import { useEvents } from "@/lib/events-context";
import { useFavorites } from "@/lib/favorites-context";
import {
  RITUALS,
  getEventsForRitual,
  formatRitualTimeWindow,
  getSortedRituals,
  type Ritual,
} from "@/lib/rituals";
import type { SportEvent } from "@/lib/data";
import { resolveProviderDisplay } from "@/lib/data";
import { useRitualOverrides } from "@/lib/ritual-overrides-context";

const ACCENT = "#35C7A5";

interface RitualData {
  eventCount: number;
  featured: SportEvent | null;
}

function formatFeaturedTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const min = `:${m.toString().padStart(2, "0")}`;
  return `${hour}${min} ${ampm}`;
}


const SPORT_COLORS: Record<string, string> = {
  hockey: "#1CB0F6",
  rugby: "#FF9600",
  cricket: "#FFC800",
  soccer: "#35C7A5",
  basketball: "#FF4B4B",
  tennis: "#CE82FF",
  racing: "#E53935",
  golf: "#22C55E",
  athletics: "#FF6B00",
};

function buildSessionDisplayName(event: SportEvent): string | null {
  if (event.eventType !== "session") return null;
  const isRacing = event.sport === "racing";
  const isSvns = event.league === "HSBC SVNS";

  if (isRacing) {
    const gpName = event.competitionName || event.homeTeam || "";
    const gpFlag = getGrandPrixFlag(gpName);
    const session = event.sessionTitle || event.awayTeam || "";
    return `${gpFlag ? gpFlag + " " : ""}${gpName}: ${session}`;
  }

  if (isSvns) {
    return event.sessionTitle || event.homeTeam || "";
  }

  if (event.sessionTitle) {
    return event.sessionTitle;
  }

  return null;
}

const SPORT_BACKGROUNDS: Record<string, any> = {
  hockey: require("@/assets/images/sports/hockey.webp"),
  soccer: require("@/assets/images/sports/soccer.webp"),
  rugby: require("@/assets/images/sports/rugby.webp"),
  basketball: require("@/assets/images/sports/basketball.webp"),
  cricket: require("@/assets/images/sports/cricket.webp"),
  racing: require("@/assets/images/sports/racing.webp"),
  tennis: require("@/assets/images/sports/tennis.webp"),
  golf: require("@/assets/images/sports/golf.webp"),
  athletics: require("@/assets/images/sports/athletics.webp"),
  cycling: require("@/assets/images/sports/cycling.webp"),
};

function resolveSportBackground(sport: string | null | undefined): any {
  if (!sport) return SPORT_BACKGROUNDS.soccer;
  return SPORT_BACKGROUNDS[sport] ?? SPORT_BACKGROUNDS.soccer;
}

function FeaturedStrip({ event }: { event: SportEvent | null }) {
  const { favorites } = useFavorites();

  if (!event) {
    return (
      <View style={styles.featuredStrip}>
        <Text style={styles.featuredEmpty}>No featured game this week</Text>
      </View>
    );
  }
  const sportColor = SPORT_COLORS[event.sport] || "#90A4AE";
  const sessionName = buildSessionDisplayName(event);
  const timeLabel = formatFeaturedTime(event.startTimeLocal);
  const isFavAway = isTeamFavorite(event.awayTeam, event.sport, favorites);
  const isFavHome = isTeamFavorite(event.homeTeam, event.sport, favorites);

  const provider = resolveProviderDisplay(event);
  const isTennis = event.sport === "tennis";
  const awayFlag = isTennis ? event.tennisPlayer1Flag : undefined;
  const homeFlag = isTennis ? event.tennisPlayer2Flag : undefined;

  return (
    <View style={styles.featuredStrip}>
      <View style={[styles.featuredBox, { borderTopColor: sportColor }]}>
        <View style={styles.featuredChip}>
          <Text style={styles.featuredChipText}>FEATURED</Text>
        </View>
        {sessionName ? (
          <>
            <Text style={styles.featuredSessionName} numberOfLines={2}>{sessionName}</Text>
            <View style={styles.featuredSessionMeta}>
              <Text style={styles.featuredSessionTime}>{timeLabel}</Text>
              {provider.brandId && (
                <ProviderLogo providerId={provider.brandId} size={22} />
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.espnMatchup}>
              {/* Away — star on outside left */}
              <View style={styles.espnTeamOuter}>
                <View style={styles.espnStarSlot}>
                  {isFavAway && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
                </View>
                <View style={styles.espnTeam}>
                  {awayFlag ? (
                    <ExpoImage source={{ uri: awayFlag }} style={styles.espnFlagLarge} contentFit="cover" />
                  ) : (
                    <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={44} />
                  )}
                  <Text style={styles.espnTeamName} numberOfLines={1}>{compactTeamName(event.awayTeam, event.league)}</Text>
                </View>
              </View>
              {/* Center: time + provider */}
              <View style={styles.espnCenter}>
                <Text style={styles.espnTime}>{timeLabel}</Text>
                {provider.brandId && (
                  <View style={styles.espnProvider}>
                    <ProviderLogo providerId={provider.brandId} size={22} />
                  </View>
                )}
              </View>
              {/* Home — star on outside right (row-reverse puts slot on right) */}
              <View style={[styles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                <View style={styles.espnStarSlot}>
                  {isFavHome && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
                </View>
                <View style={styles.espnTeam}>
                  {homeFlag ? (
                    <ExpoImage source={{ uri: homeFlag }} style={styles.espnFlagLarge} contentFit="cover" />
                  ) : (
                    <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={44} />
                  )}
                  <Text style={styles.espnTeamName} numberOfLines={1}>{compactTeamName(event.homeTeam, event.league)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function RitualTile({ ritual, data, fill = false }: { ritual: Ritual; data: RitualData; fill?: boolean }) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/guide/[id]", params: { id: ritual.id } });
  };

  const featuredSport = data.featured?.sport ?? null;
  const bgImage = resolveSportBackground(featuredSport);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.ritualTile,
        fill && { flex: 1 },
        { transform: [{ scale: pressed ? 0.975 : 1 }] },
      ]}
      testID={`ritual-${ritual.id}`}
    >
      {bgImage && (
        <>
          <ExpoImage
            source={bgImage}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={[
              "rgba(15,18,22,0.78)",
              "rgba(15,18,22,0.35)",
              "rgba(15,18,22,0.2)",
              "rgba(15,18,22,0.45)",
            ]}
            locations={[0, 0.25, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </>
      )}
      <View style={styles.ritualAccentBar} />
      <View style={styles.ritualInner}>
        <View style={styles.ritualTopRow}>
          <View style={styles.ritualTextWrap}>
            <Text style={styles.ritualLabel} numberOfLines={1}>{ritual.label}</Text>
            <Text style={styles.ritualTime} numberOfLines={1}>{formatRitualTimeWindow(ritual)}</Text>
          </View>
          {data.eventCount > 0 ? (
            <View style={styles.ritualCountBadge}>
              <Text style={styles.ritualCountNum}>{data.eventCount}</Text>
              <Text style={styles.ritualCountLabel}>games</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.sportBands}>
          {ritual.sports.map((s) => (
            <View
              key={s}
              style={[styles.sportBand, { backgroundColor: SPORT_COLORS[s] ?? "#444" }]}
            />
          ))}
        </View>
        <View style={styles.featuredSpacer} />
        <FeaturedStrip event={data.featured} />
      </View>
    </Pressable>
  );
}

export default function RitualsScreen() {
  const insets = useSafeAreaInsets();
  const { allEvents: rawEvents } = useEvents();
  const { favorites, disabledSports } = useFavorites();
  const { width: screenWidth } = useWindowDimensions();

  const allEvents = useMemo(
    () => disabledSports.size === 0 ? rawEvents : rawEvents.filter((e) => !disabledSports.has(e.sport.toLowerCase())),
    [rawEvents, disabledSports]
  );
  const { overrides } = useRitualOverrides();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [feedSize, setFeedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [activeSlide, setActiveSlide] = useState(0);

  const onFeedLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFeedSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const now = useMemo(() => new Date(), []);
  const sortedRituals = useMemo(() => getSortedRituals(now), [now]);

  const ritualData = useMemo(() => {
    const data: Record<string, RitualData> = {};
    for (const ritual of RITUALS) {
      const result = getEventsForRitual(allEvents, ritual, favorites, now);
      const overrideId = overrides[ritual.id];
      const allRitualEvents = result.featured
        ? [result.featured, ...result.rest]
        : result.rest;
      let effectiveFeatured = result.featured;
      if (overrideId) {
        const overrideEvent = allRitualEvents.find(e => e.id === overrideId);
        if (overrideEvent && new Date(overrideEvent.startTimeLocal) > new Date(now.getTime() - 6 * 3600000)) {
          effectiveFeatured = overrideEvent;
        }
      }
      data[ritual.id] = {
        eventCount: (result.featured ? 1 : 0) + result.rest.length,
        featured: effectiveFeatured,
      };
    }
    return data;
  }, [allEvents, favorites, now, overrides]);

  const visibleRituals = useMemo(
    () =>
      sortedRituals.filter((occ) =>
        disabledSports.size === 0 || occ.ritual.sports.some((s) => !disabledSports.has(s.toLowerCase()))
      ),
    [sortedRituals, disabledSports]
  );

  useEffect(() => {
    if (activeSlide >= visibleRituals.length && visibleRituals.length > 0) {
      setActiveSlide(visibleRituals.length - 1);
    }
  }, [activeSlide, visibleRituals.length]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBanner, {
        paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 20,
        minHeight: (Platform.OS === "web" ? webTopInset : insets.top) + 144,
      }]}>
        <View style={styles.headerBannerRow}>
          <Text style={styles.headerTitle}>Rituals</Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.6 : 1 }]}
            testID="rituals-settings-button"
          >
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Your personalized viewing schedule</Text>
      </View>
      <View style={styles.feedArea} onLayout={onFeedLayout}>
        {feedSize.height > 0 && (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={feedSize.width || screenWidth}
              snapToAlignment="start"
              onMomentumScrollEnd={(e) => {
                const w = feedSize.width || screenWidth;
                const idx = Math.round(e.nativeEvent.contentOffset.x / w);
                setActiveSlide(idx);
              }}
              scrollEventThrottle={16}
            >
              {visibleRituals.map((occ) => (
                <View
                  key={occ.ritual.id}
                  style={[
                    styles.slide,
                    {
                      width: feedSize.width || screenWidth,
                      height: feedSize.height,
                      paddingBottom: Platform.OS === "web" ? 50 : 110,
                    },
                  ]}
                >
                  <View style={styles.slideInner}>
                    <RitualTile
                      ritual={occ.ritual}
                      data={ritualData[occ.ritual.id] || { eventCount: 0, featured: null }}
                      fill
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            {visibleRituals.length > 1 && (
              <View style={styles.pagerDots} pointerEvents="none">
                {visibleRituals.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.pagerDot, i === activeSlide && styles.pagerDotActive]}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  feedArea: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: "center",
  },
  slideInner: {
    width: "100%",
    flex: 1,
    maxHeight: 520,
  },
  pagerDots: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  pagerDotActive: {
    backgroundColor: ACCENT,
    width: 18,
  },
  headerBanner: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: "flex-end",
  },
  headerBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  headerTitle: {
    fontSize: 32,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },
  ritualTile: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ACCENT + "35",
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },
  ritualAccentBar: {
    width: 3,
    backgroundColor: ACCENT,
  },
  ritualInner: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    paddingLeft: 12,
  },
  featuredSpacer: {
    flex: 1,
    minHeight: 12,
  },
  ritualTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ritualIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT + "25",
  },
  ritualTextWrap: {
    flex: 1,
  },
  ritualLabel: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  ritualTime: {
    fontSize: 12,
    color: ACCENT + "cc",
    fontFamily: "Inter_400Regular",
  },
  ritualCountBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: ACCENT + "20",
    borderWidth: 1,
    borderColor: ACCENT + "40",
  },
  ritualCountNum: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: ACCENT,
    fontFamily: "Inter_700Bold",
  },
  ritualCountLabel: {
    fontSize: 11,
    color: ACCENT + "99",
    fontFamily: "Inter_400Regular",
  },
  sportBands: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 2,
  },
  sportBand: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  featuredStrip: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: ACCENT + "30",
    paddingTop: 10,
    gap: 8,
  },
  featuredBox: {
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 12,
    borderTopWidth: 2,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
    overflow: "hidden",
  },
  featuredChip: {
    alignSelf: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(53, 199, 165, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(53, 199, 165, 0.35)",
    marginBottom: -6,
  },
  featuredChipText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: ACCENT,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  espnMatchup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  espnTeamOuter: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  espnStarSlot: {
    width: 11,
    height: 44,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  espnTeam: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  espnTeamName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center" as const,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  espnFlagLarge: {
    width: 44,
    height: 32,
    borderRadius: 4,
  },
  espnCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
  },
  espnTime: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center" as const,
  },
  espnProvider: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 2,
  },
  featuredSessionName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center" as const,
  },
  featuredSessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 2,
  },
  featuredSessionTime: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  featuredEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
});
