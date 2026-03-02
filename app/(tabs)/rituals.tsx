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
import { displayTeamName } from "@/utils/teams";
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

interface RitualData {
  eventCount: number;
  featured: SportEvent | null;
}

function formatFeaturedTime(iso: string): string {
  const d = new Date(iso);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const min = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
  return `${monthNames[d.getMonth()]} ${d.getDate()} · ${hour}${min} ${ampm}`;
}

const SPORT_COLORS: Record<string, string> = {
  hockey: "#4FC3F7",
  rugby: "#FF8A65",
  cricket: "#FFD54F",
  soccer: "#81C784",
};

function FeaturedStrip({ event }: { event: SportEvent | null }) {
  if (!event) {
    return (
      <View style={styles.featuredStrip}>
        <View style={styles.featuredStripLine} />
        <Text style={styles.featuredEmpty}>No featured game this week</Text>
      </View>
    );
  }

  const away = displayTeamName(event.awayTeam, event.league);
  const home = displayTeamName(event.homeTeam, event.league);
  const sportColor = SPORT_COLORS[event.sport] || "#90A4AE";
  const league = event.league || event.sport.toUpperCase();

  return (
    <View style={styles.featuredStrip}>
      <View style={styles.featuredStripLine} />
      <View style={[styles.leagueHeader, { backgroundColor: sportColor + "12" }]}>
        <Text style={[styles.leagueHeaderText, { color: sportColor }]}>{league}</Text>
      </View>
      <View style={styles.featuredContent}>
        <View style={styles.featuredMatchup}>
          <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={18} />
          <Text style={styles.featuredTeam} numberOfLines={1}>{away}</Text>
          <Text style={styles.featuredAt}>@</Text>
          <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={18} />
          <Text style={styles.featuredTeam} numberOfLines={1}>{home}</Text>
        </View>
        <Text style={styles.featuredTime} numberOfLines={1}>
          {formatFeaturedTime(event.startTimeLocal)}
        </Text>
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
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
      testID={`ritual-${ritual.id}`}
    >
      <View style={styles.ritualTopRow}>
        <View style={[styles.ritualIconWrap, { backgroundColor: accentColor + "20" }]}>
          <Ionicons name={ritual.icon} size={22} color={accentColor} />
        </View>
        <View style={styles.ritualTextWrap}>
          <Text style={styles.ritualLabel} numberOfLines={1}>{ritual.label}</Text>
          <Text style={styles.ritualTime} numberOfLines={1}>
            {formatRitualTimeWindow(ritual)}
          </Text>
        </View>
        {data.eventCount > 0 ? (
          <View style={styles.ritualCountBadge}>
            <Text style={styles.ritualCountText}>{data.eventCount}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
      <FeaturedStrip event={data.featured} />
    </Pressable>
  );
}

export default function RitualsScreen() {
  const insets = useSafeAreaInsets();
  const { allEvents } = useEvents();
  const { favorites } = useFavorites();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const now = useMemo(() => new Date(), []);

  const sortedRituals = useMemo(() => getSortedRituals(now), [now]);

  const ritualData = useMemo(() => {
    const data: Record<string, RitualData> = {};
    for (const ritual of RITUALS) {
      const result = getEventsForRitual(allEvents, ritual, favorites, now);
      data[ritual.id] = {
        eventCount: (result.featured ? 1 : 0) + result.rest.length,
        featured: result.featured,
      };
    }
    return data;
  }, [allEvents, favorites, now]);

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
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="compass" size={28} color={Colors.accent} />
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
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Personalized rituals for how you watch
        </Text>

        <View style={styles.ritualsContainer}>
          {sortedRituals.map((occ) => (
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
    paddingHorizontal: 20,
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  ritualsContainer: {
    gap: 10,
  },
  ritualTile: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ritualTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ritualIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ritualTextWrap: {
    flex: 1,
  },
  ritualLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  ritualTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  ritualCountBadge: {
    backgroundColor: Colors.accent + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  ritualCountText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
  },
  featuredStrip: {
    marginTop: 10,
  },
  featuredStripLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    marginBottom: 10,
    marginHorizontal: -2,
  },
  leagueHeader: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start" as const,
    marginBottom: 6,
  },
  leagueHeaderText: {
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  featuredContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featuredMatchup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredTeam: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  featuredAt: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 1,
  },
  featuredTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
  featuredEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
});
