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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { TeamLogo } from "@/components/TeamLogo";
import { compactTeamName } from "@/utils/teams";
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
import { useRitualOverrides } from "@/lib/ritual-overrides-context";

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
  const min = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
  return `${hour}${min} ${ampm}`;
}

const SPORT_COLORS: Record<string, string> = {
  hockey: "#4FC3F7",
  rugby: "#FF8A65",
  cricket: "#FFD54F",
  soccer: "#81C784",
  racing: "#E53935",
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

function FeaturedStrip({ event, accentColor }: { event: SportEvent | null; accentColor: string }) {
  if (!event) {
    return (
      <View style={[styles.featuredStrip, { borderTopColor: accentColor + "18" }]}>
        <Text style={styles.featuredEmpty}>No featured game this week</Text>
      </View>
    );
  }

  const sportColor = SPORT_COLORS[event.sport] || "#90A4AE";
  const league = event.league || event.sport.toUpperCase();
  const sessionName = buildSessionDisplayName(event);

  return (
    <View style={[styles.featuredStrip, { borderTopColor: accentColor + "30" }]}>
      <View style={styles.featuredRow}>
        <View style={[styles.leaguePill, { backgroundColor: sportColor }]}>
          <Text style={styles.leaguePillText}>{league}</Text>
        </View>
        <View style={styles.featuredRight}>
          {sessionName ? (
            <Text style={styles.featuredSessionName} numberOfLines={1}>{sessionName}</Text>
          ) : (
            <View style={styles.featuredMatchup}>
              <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={16} />
              <Text style={styles.featuredTeam} numberOfLines={1}>{compactTeamName(event.awayTeam, event.league)}</Text>
              <Text style={styles.featuredAt}>vs</Text>
              <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={16} />
              <Text style={styles.featuredTeam} numberOfLines={1}>{compactTeamName(event.homeTeam, event.league)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.featuredTime}>{formatFeaturedTime(event.startTimeLocal)}</Text>
      </View>
    </View>
  );
}

function RitualTile({ ritual, data }: { ritual: Ritual; data: RitualData }) {
  const isMoon = ritual.icon === "moon";
  const accentColor = isMoon ? "#818CF8" : "#FB923C";

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
        { borderColor: accentColor + "40", transform: [{ scale: pressed ? 0.975 : 1 }] },
      ]}
      testID={`ritual-${ritual.id}`}
    >
      <View style={[styles.ritualAccentBar, { backgroundColor: accentColor }]} />
      <View style={styles.ritualInner}>
        <View style={styles.ritualTopRow}>
          <View style={[styles.ritualIconWrap, { backgroundColor: accentColor + "25" }]}>
            <Ionicons name={ritual.icon} size={24} color={accentColor} />
          </View>
          <View style={styles.ritualTextWrap}>
            <Text style={styles.ritualLabel} numberOfLines={1}>{ritual.label}</Text>
            <Text style={styles.ritualTime} numberOfLines={1}>{formatRitualTimeWindow(ritual)}</Text>
          </View>
          {data.eventCount > 0 ? (
            <View style={[styles.ritualCountBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.ritualCountText}>{data.eventCount}</Text>
            </View>
          ) : null}
        </View>
        <FeaturedStrip event={data.featured} accentColor={accentColor} />
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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 16,
            paddingBottom: Platform.OS === "web" ? 34 : 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="grid" size={20} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Rituals</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="rituals-settings-button"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>Your personalized viewing schedule</Text>

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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  ritualsContainer: {
    gap: 12,
  },
  ritualTile: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    flexDirection: "row",
  },
  ritualAccentBar: {
    width: 5,
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
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  ritualCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  ritualCountText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  featuredStrip: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leaguePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  leaguePillText: {
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  featuredRight: {
    flex: 1,
  },
  featuredMatchup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredTeam: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  featuredAt: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 1,
  },
  featuredTime: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 0,
  },
  featuredSessionName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  featuredEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
});
