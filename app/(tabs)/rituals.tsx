import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
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

function FeaturedStrip({ event }: { event: SportEvent | null }) {
  if (!event) {
    return (
      <View style={styles.featuredStrip}>
        <Text style={styles.featuredEmpty}>No featured game this week</Text>
      </View>
    );
  }

  const { favorites } = useFavorites();
  const sportColor = SPORT_COLORS[event.sport] || "#90A4AE";
  const sessionName = buildSessionDisplayName(event);
  const timeLabel = formatFeaturedTime(event.startTimeLocal);
  const isFavAway = isTeamFavorite(event.awayTeam, event.sport, favorites);
  const isFavHome = isTeamFavorite(event.homeTeam, event.sport, favorites);

  const provider = resolveProviderDisplay(event);

  return (
    <View style={styles.featuredStrip}>
      <View style={[styles.featuredBox, { borderTopColor: sportColor }]}>
        <View style={styles.featuredChip}>
          <Text style={styles.featuredChipText}>FEATURED</Text>
        </View>
        {sessionName ? (
          <Text style={styles.featuredSessionName} numberOfLines={1}>{sessionName}</Text>
        ) : (
          <>
            <View style={styles.espnMatchup}>
              {/* Away — star on outside left */}
              <View style={styles.espnTeamOuter}>
                <View style={styles.espnStarSlot}>
                  {isFavAway && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
                </View>
                <View style={styles.espnTeam}>
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={44} />
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
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={44} />
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

function RitualTile({ ritual, data }: { ritual: Ritual; data: RitualData }) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/guide/[id]", params: { id: ritual.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.ritualTile,
        { transform: [{ scale: pressed ? 0.975 : 1 }] },
      ]}
      testID={`ritual-${ritual.id}`}
    >
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
        <FeaturedStrip event={data.featured} />
      </View>
    </Pressable>
  );
}

export default function RitualsScreen() {
  const insets = useSafeAreaInsets();
  const { allEvents: rawEvents } = useEvents();
  const { favorites, disabledSports } = useFavorites();

  const allEvents = useMemo(
    () => disabledSports.size === 0 ? rawEvents : rawEvents.filter((e) => !disabledSports.has(e.sport.toLowerCase())),
    [rawEvents, disabledSports]
  );
  const { overrides } = useRitualOverrides();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Platform.OS === "web" ? 34 : 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ritualsContainer}>
          {sortedRituals.filter((occ) =>
            disabledSports.size === 0 || occ.ritual.sports.some((s) => !disabledSports.has(s.toLowerCase()))
          ).map((occ) => (
            <RitualTile
              key={occ.ritual.id}
              ritual={occ.ritual}
              data={ritualData[occ.ritual.id] || { eventCount: 0, featured: null }}
            />
          ))}
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
    paddingTop: 20,
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
  ritualsContainer: {
    gap: 12,
  },
  ritualTile: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ACCENT + "35",
    overflow: "hidden",
    flexDirection: "row",
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
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    borderTopWidth: 2,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
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
    width: 16,
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
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  featuredEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
});
