import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import Colors from "@/constants/colors";
import {
  getAllEvents,
  getProviderById,
  formatStartTime,
  getSportColor,
} from "@/lib/data";

export default function EventSheet() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const events = getAllEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const provider = getProviderById(event.providerId);
  const sportColor = getSportColor(event.sport);

  const handleOpenProvider = async () => {
    if (!provider) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Desktop Browser",
        `Open ${provider.name} on your Android device to watch this event.`
      );
      return;
    }

    if (provider.id === "espn") {
      const espnScheme = "espn://";
      const storeUrl = `market://details?id=${provider.packageName}`;
      try {
        const canOpen = await Linking.canOpenURL(espnScheme);
        if (canOpen) {
          await Linking.openURL(espnScheme);
        } else {
          Alert.alert(
            "App Not Installed",
            `${provider.name} doesn't appear to be installed. Would you like to install it?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Play Store",
                onPress: () => Linking.openURL(storeUrl).catch(() => {}),
              },
            ]
          );
        }
      } catch {
        Alert.alert(
          "App Not Installed",
          `${provider.name} is not installed on this device.`,
          [{ text: "OK" }]
        );
      }
      return;
    }

    try {
      const params: IntentLauncher.IntentLauncherParams = {
        packageName: provider.packageName,
        category: "android.intent.category.LAUNCHER",
      };

      if (provider.activity) {
        params.className = provider.activity;
      }

      await IntentLauncher.startActivityAsync(
        "android.intent.action.MAIN",
        params
      );
    } catch {
      Alert.alert(
        "App Not Installed",
        `${provider.name} is not installed on this device.`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.badgeRow}>
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
                size={14}
                color={sportColor}
              />
              <Text style={[styles.sportText, { color: sportColor }]}>
                {event.sport.toUpperCase()}
              </Text>
            </View>
            <View style={styles.leagueBadge}>
              <Text style={styles.leagueText}>{event.league}</Text>
            </View>
            {event.isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.matchupContainer}>
            <Text style={styles.teamName}>{event.awayTeam}</Text>
            <Text style={styles.vsText}>vs</Text>
            <Text style={styles.teamName}>{event.homeTeam}</Text>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.timeText}>
              {formatStartTime(event.startTimeLocal)}
            </Text>
          </View>
        </View>

        {provider && (
          <Pressable
            onPress={handleOpenProvider}
            style={({ pressed }) => [
              styles.openButton,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            testID="open-provider-btn"
          >
            <Ionicons name="open-outline" size={20} color={Colors.background} />
            <Text style={styles.openButtonText}>Open {provider.name}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
    justifyContent: "space-between",
  },
  topSection: {
    gap: 14,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sportText: {
    fontSize: 11,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  leagueBadge: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  leagueText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
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
  },
  matchupContainer: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  teamName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  vsText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 60,
    fontFamily: "Inter_400Regular",
  },
});
