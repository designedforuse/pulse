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
import { useEvents } from "@/lib/events-context";
import { useFavorites } from "@/lib/favorites-context";
import {
  RITUALS,
  getEventsForRitual,
  formatRitualTimeWindow,
  getSortedRituals,
  type Ritual,
} from "@/lib/rituals";

function RitualTile({ ritual, eventCount }: { ritual: Ritual; eventCount: number }) {
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
      <View style={[styles.ritualIconWrap, { backgroundColor: accentColor + "20" }]}>
        <Ionicons name={ritual.icon} size={22} color={accentColor} />
      </View>
      <View style={styles.ritualTextWrap}>
        <Text style={styles.ritualLabel} numberOfLines={1}>{ritual.label}</Text>
        <Text style={styles.ritualTime} numberOfLines={1}>
          {formatRitualTimeWindow(ritual)}
        </Text>
      </View>
      {eventCount > 0 ? (
        <View style={styles.ritualCountBadge}>
          <Text style={styles.ritualCountText}>{eventCount}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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

  const ritualCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ritual of RITUALS) {
      const result = getEventsForRitual(allEvents, ritual, favorites, now);
      counts[ritual.id] = (result.featured ? 1 : 0) + result.rest.length;
    }
    return counts;
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
          Your personalized viewing windows
        </Text>

        <View style={styles.ritualsContainer}>
          {sortedRituals.map((occ) => (
            <RitualTile
              key={occ.ritual.id}
              ritual={occ.ritual}
              eventCount={ritualCounts[occ.ritual.id] || 0}
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
    gap: 8,
  },
  ritualTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
});
