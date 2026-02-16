import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getProviders, getFavorites, getSportColor, type Favorites } from "@/lib/data";
import { apiRequest } from "@/lib/query-client";
import { useEvents } from "@/lib/events-context";

function FavoritesSection({ favorites }: { favorites: Favorites }) {
  const sportOrder = ["hockey", "rugby", "cricket", "soccer"];
  const sportLabels: Record<string, string> = {
    hockey: "Hockey",
    rugby: "Rugby",
    cricket: "Cricket",
    soccer: "Soccer",
  };
  const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    hockey: "snow",
    rugby: "american-football",
    cricket: "baseball",
    soccer: "football",
  };

  const hasFavorites = sportOrder.some((sport) => {
    const sportFavs = favorites[sport];
    return sportFavs && Object.keys(sportFavs).length > 0;
  });

  if (!hasFavorites) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyFavRow}>
          <Ionicons name="star-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.emptyFavText}>No favorites configured.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {sportOrder.map((sport, sportIndex) => {
        const sportFavs = favorites[sport];
        if (!sportFavs || Object.keys(sportFavs).length === 0) return null;
        const sportColor = getSportColor(sport);
        const leagues = Object.keys(sportFavs);

        return (
          <React.Fragment key={sport}>
            {sportIndex > 0 && <View style={styles.sportDivider} />}
            <View style={styles.sportHeader}>
              <View style={[styles.sportIconBg, { backgroundColor: sportColor + "22" }]}>
                <Ionicons name={sportIcons[sport]} size={14} color={sportColor} />
              </View>
              <Text style={[styles.sportLabel, { color: sportColor }]}>
                {sportLabels[sport]}
              </Text>
            </View>
            {leagues.map((league) => {
              const teams = sportFavs[league];
              if (!teams || teams.length === 0) return null;
              return (
                <View key={league} style={styles.leagueRow}>
                  <Text style={styles.leagueLabel}>{league}</Text>
                  <Text style={styles.teamsText}>{teams.join(", ")}</Text>
                </View>
              );
            })}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const providers = getProviders();
  const favorites = getFavorites();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();
  const { debugShowAll, setDebugShowAll } = useEvents();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    success: boolean;
    message: string;
    nhlCount?: number;
    ahlCount?: number;
    ahlKeyUsed?: string | null;
    ahlAdded?: number;
    ahlUpdated?: number;
    ahlPruned?: number;
  } | null>(null);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshResult(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const res = await apiRequest("POST", "/api/refresh?days=14");
      const data = await res.json();
      if (data.success) {
        setRefreshResult({
          success: true,
          message: `Updated: ${data.eventCount} events loaded`,
          nhlCount: data.nhlCount,
          ahlCount: data.ahlCount,
          ahlKeyUsed: data.ahlKeyUsed,
          ahlAdded: data.ahlAdded,
          ahlUpdated: data.ahlUpdated,
          ahlPruned: data.ahlPruned,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/events?days=14"] });
      } else {
        setRefreshResult({ success: false, message: "Refresh failed. Try again." });
      }
    } catch {
      setRefreshResult({ success: false, message: "Refresh failed. Check connection." });
    } finally {
      setRefreshing(false);
    }
  };

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
        <View style={styles.headerRow}>
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Favorite Teams</Text>
          <FavoritesSection favorites={favorites} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Data</Text>
          <View style={styles.card}>
            <Pressable
              onPress={handleRefresh}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.refreshRow,
                { opacity: pressed && !refreshing ? 0.7 : 1 },
              ]}
              testID="refresh-schedules-btn"
            >
              <View style={styles.refreshLeft}>
                {refreshing ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Ionicons name="refresh" size={20} color={Colors.accent} />
                )}
                <View>
                  <Text style={styles.refreshLabel}>Refresh Schedules</Text>
                  <Text style={styles.refreshDesc}>
                    Pull latest NHL + AHL game data
                  </Text>
                </View>
              </View>
              {!refreshing && (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </Pressable>
            {refreshResult && (
              <View style={styles.refreshResultBlock}>
                <View style={styles.refreshResultRow}>
                  <Ionicons
                    name={refreshResult.success ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={refreshResult.success ? Colors.accent : Colors.live}
                  />
                  <Text
                    style={[
                      styles.refreshResultText,
                      { color: refreshResult.success ? Colors.accent : Colors.live },
                    ]}
                  >
                    {refreshResult.message}
                  </Text>
                </View>
                {refreshResult.success && (
                  <View style={styles.refreshCountsRow}>
                    <Text style={styles.refreshCountText}>
                      NHL: {refreshResult.nhlCount ?? 0}
                    </Text>
                    <Text style={styles.refreshCountDot}>|</Text>
                    <Text style={[
                      styles.refreshCountText,
                      refreshResult.ahlCount === 0 && { color: Colors.live },
                    ]}>
                      AHL: {refreshResult.ahlCount ?? 0}
                    </Text>
                  </View>
                )}
                {refreshResult.success && (refreshResult.ahlAdded !== undefined || refreshResult.ahlUpdated !== undefined) && (
                  <View style={styles.refreshCountsRow}>
                    <Text style={styles.refreshCountText}>
                      AHL cache: +{refreshResult.ahlAdded ?? 0} new, ~{refreshResult.ahlUpdated ?? 0} updated, -{refreshResult.ahlPruned ?? 0} pruned
                    </Text>
                  </View>
                )}
                {refreshResult.success && refreshResult.ahlCount === 0 && (
                  <Text style={styles.refreshWarning}>
                    AHL returned 0 events; check /api/odds/sports
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug</Text>
          <View style={styles.card}>
            <View style={styles.debugRow}>
              <View style={styles.debugLeft}>
                <Ionicons name="bug-outline" size={18} color={Colors.live} />
                <View>
                  <Text style={styles.refreshLabel}>Show All Games</Text>
                  <Text style={styles.refreshDesc}>
                    Ignore weekend filter on Mode screens
                  </Text>
                </View>
              </View>
              <Switch
                value={debugShowAll}
                onValueChange={setDebugShowAll}
                trackColor={{ false: Colors.border, true: Colors.live + "55" }}
                thumbColor={debugShowAll ? Colors.live : Colors.textMuted}
                style={styles.debugSwitch}
                testID="debug-show-all-toggle"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="trophy-outline"
              label="App Name"
              value="Master Sports Guide"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="code-slash"
              label="Version"
              value="1.0.0 MVP"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="layers-outline"
              label="Platform"
              value={Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Providers</Text>
          <View style={styles.card}>
            {providers.map((provider, index) => (
              <React.Fragment key={provider.id}>
                {index > 0 && <View style={styles.divider} />}
                <SettingsRow
                  icon="tv-outline"
                  label={provider.name}
                  value={provider.packageName}
                  valueSmall
                />
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.card}>
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>1</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Pick a viewing mode based on your schedule
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>2</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Browse sport packs and find events
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>3</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Tap an event and open it in your streaming app
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  valueSmall,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueSmall?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={Colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.rowValue, valueSmall && styles.rowValueSmall]}
        numberOfLines={1}
      >
        {value}
      </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sportDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sportIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    paddingLeft: 48,
    gap: 8,
  },
  leagueLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    minWidth: 42,
  },
  teamsText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  emptyFavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyFavText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    maxWidth: 160,
    textAlign: "right" as const,
  },
  rowValueSmall: {
    fontSize: 11,
    maxWidth: 200,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 42,
  },
  howItWorksItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  howItWorksText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  refreshLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  refreshLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  refreshDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  refreshResultBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 4,
  },
  refreshResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshResultText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  refreshCountsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 20,
    marginTop: 2,
  },
  refreshCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  refreshCountDot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  refreshWarning: {
    fontSize: 11,
    color: Colors.live,
    fontFamily: "Inter_400Regular",
    marginLeft: 20,
    marginTop: 2,
  },
  debugRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  debugLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  debugSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
});
