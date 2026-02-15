import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
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
  getLiveEvents,
  getProviderById,
  formatStartTime,
  getSportColor,
  type SportEvent,
} from "@/lib/data";

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

  return (
    <Animated.View style={[styles.liveDot, animStyle]} />
  );
}

function LiveEventCard({ event }: { event: SportEvent }) {
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
      <View style={styles.eventCardHeader}>
        <View style={styles.liveTagRow}>
          <View style={styles.liveTag}>
            <LiveIndicator />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={[styles.sportBadge, { backgroundColor: sportColor + "22" }]}>
            <Text style={[styles.sportBadgeText, { color: sportColor }]}>
              {event.sport.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.leagueText}>{event.league}</Text>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>AWAY</Text>
          <Text style={styles.teamName}>{event.awayTeam}</Text>
        </View>
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={[styles.teamBlock, styles.teamBlockRight]}>
          <Text style={styles.teamLabel}>HOME</Text>
          <Text style={styles.teamName}>{event.homeTeam}</Text>
        </View>
      </View>

      <View style={styles.eventFooter}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.timeText}>{formatStartTime(event.startTimeLocal)}</Text>
        </View>
        {provider && (
          <View style={styles.providerChip}>
            <Ionicons name="tv-outline" size={12} color={Colors.accent} />
            <Text style={styles.providerText}>{provider.name}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function LiveNowScreen() {
  const insets = useSafeAreaInsets();
  const liveEvents = getLiveEvents();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 },
        ]}
      >
        <Ionicons name="radio" size={24} color={Colors.live} />
        <Text style={styles.headerTitle}>Live Now</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{liveEvents.length}</Text>
        </View>
      </View>

      {liveEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="radio-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Live Events</Text>
          <Text style={styles.emptySubtitle}>
            Check back during game times to see live events
          </Text>
        </View>
      ) : (
        <FlatList
          data={liveEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LiveEventCard event={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    flex: 1,
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
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardHeader: {
    marginBottom: 12,
  },
  liveTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 8,
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
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  leagueText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  teamBlock: {
    flex: 1,
  },
  teamBlockRight: {
    alignItems: "flex-end",
  },
  teamLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 2,
  },
  teamName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_700Bold",
  },
  eventFooter: {
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
    color: Colors.textSecondary,
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
