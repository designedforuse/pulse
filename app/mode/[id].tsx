import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Platform,
  Switch,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import {
  getModeById,
  getEventsForPack,
  getProviderById,
  getFavorites,
  formatStartTime,
  getSportColor,
  type SportEvent,
  type Pack,
} from "@/lib/data";
import { isEventLive } from "@/utils/time";
import { favoriteInvolved } from "@/utils/favorites";

const PREF_KEY = "prefs.favoritesFirst";

function EventCard({ event, isFav }: { event: SportEvent; isFav: boolean }) {
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
      testID={`event-${event.id}`}
    >
      <View style={styles.eventTopRow}>
        <View style={styles.topRowLeft}>
          <View style={[styles.leagueBadge, { backgroundColor: sportColor + "18" }]}>
            <Text style={[styles.leagueText, { color: sportColor }]}>{event.league}</Text>
          </View>
          {isFav && (
            <View style={styles.favBadge}>
              <Text style={styles.favStar}>★</Text>
            </View>
          )}
        </View>
        {isEventLive(event, new Date()) && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.matchupRow}>
        <Text style={styles.teamName} numberOfLines={1}>{event.awayTeam}</Text>
        <Text style={styles.atText}>@</Text>
        <Text style={styles.teamName} numberOfLines={1}>{event.homeTeam}</Text>
      </View>

      <View style={styles.eventBottomRow}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.timeText}>{formatStartTime(event.startTimeLocal)}</Text>
        </View>
        {provider && (
          <View style={styles.providerTag}>
            <Ionicons name="tv-outline" size={11} color={Colors.accent} />
            <Text style={styles.providerName}>{provider.name}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface SectionData {
  title: string;
  sport: string;
  data: SportEvent[];
}

export default function ModeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mode = getModeById(id);
  const favorites = getFavorites();
  const [favoritesFirst, setFavoritesFirst] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      if (val !== null) setFavoritesFirst(val === "true");
      setLoaded(true);
    });
  }, []);

  const handleToggle = (val: boolean) => {
    setFavoritesFirst(val);
    AsyncStorage.setItem(PREF_KEY, val.toString());
  };

  const sections: SectionData[] = useMemo(() => {
    if (!mode) return [];
    return mode.packs
      .map((pack: Pack) => {
        const events = getEventsForPack(pack);
        const now = new Date();
        const sorted = [...events].sort((a, b) => {
          const aLive = isEventLive(a, now) ? 1 : 0;
          const bLive = isEventLive(b, now) ? 1 : 0;
          if (bLive !== aLive) return bLive - aLive;
          if (favoritesFirst) {
            const aFav = favoriteInvolved(a, favorites) ? 1 : 0;
            const bFav = favoriteInvolved(b, favorites) ? 1 : 0;
            if (bFav !== aFav) return bFav - aFav;
          }
          return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
        });
        return {
          title: pack.title,
          sport: pack.sport,
          data: sorted,
        };
      })
      .filter((s) => s.data.length > 0);
  }, [mode, favoritesFirst, favorites]);

  if (!mode) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Mode not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode.title,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
            color: Colors.textPrimary,
          },
        }}
      />
      <View style={styles.toggleRow}>
        <Ionicons name="star" size={14} color={Colors.favStar} />
        <Text style={styles.toggleLabel}>Favorites first</Text>
        <Switch
          value={favoritesFirst}
          onValueChange={handleToggle}
          trackColor={{ false: Colors.border, true: Colors.accent + "55" }}
          thumbColor={favoritesFirst ? Colors.accent : Colors.textMuted}
          style={styles.switch}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} isFav={favoriteInvolved(item, favorites)} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: getSportColor(section.sport) + "22" },
              ]}
            >
              <Ionicons
                name={
                  section.sport === "hockey"
                    ? "snow"
                    : section.sport === "rugby"
                    ? "american-football"
                    : section.sport === "cricket"
                    ? "baseball"
                    : "football"
                }
                size={16}
                color={getSportColor(section.sport)}
              />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Events</Text>
            <Text style={styles.emptySubtitle}>
              No events scheduled for this mode yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  sectionCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leagueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  favBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  favStar: {
    fontSize: 10,
    color: "#FFD700",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  atText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  providerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  providerName: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
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
