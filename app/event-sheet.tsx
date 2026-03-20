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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import {
  getProviderById,
  formatStartTime,
  getSportColor,
  resolveProviderDisplay,
  formatProviderReason,
} from "@/lib/data";
import { useEvents } from "@/lib/events-context";
import { useScores } from "@/lib/scores-context";
import { isEventLive, formatTimeSinceStart } from "@/utils/time";
import { normalizeGameState } from "@/utils/gameState";
import { displayTeamName } from "@/utils/teams";

function formatDetailDate(startTimeLocal: string): string {
  const d = new Date(startTimeLocal);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const date = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day}, ${month} ${date}, ${time}`;
}

export default function EventSheet() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { findEvent } = useEvents();
  const event = findEvent(eventId);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const insets = useSafeAreaInsets();
  const { getScore } = useScores();
  const score = getScore(event.id);
  const resolved = resolveProviderDisplay(event);
  const launchProvider = resolved.launchProvider;
  const sportColor = getSportColor(event.sport);
  const leagueLabel = event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.league;
  const dateLabel = formatDetailDate(event.startTimeLocal);
  const live = isEventLive(event, new Date());
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, new Date());
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";
  const reasonLabel = formatProviderReason(event.providerReason);

  const handleOpenProvider = async () => {
    if (!launchProvider) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Desktop Browser",
        `Open ${launchProvider.name} on your Android device to watch this event.`
      );
      return;
    }

    if (launchProvider.launchUrl) {
      try {
        await IntentLauncher.startActivityAsync(
          "android.intent.action.VIEW",
          {
            data: launchProvider.launchUrl,
            packageName: launchProvider.packageName,
          }
        );
      } catch {
        try {
          await Linking.openURL(launchProvider.launchUrl);
        } catch {
          Alert.alert(
            "App Not Installed",
            `${launchProvider.name} is not installed on this device.`,
            [{ text: "OK" }]
          );
        }
      }
      return;
    }

    try {
      const FLAG_ACTIVITY_NEW_TASK = 268435456;
      const params: IntentLauncher.IntentLauncherParams = {
        packageName: launchProvider.packageName,
        category: "android.intent.category.LAUNCHER",
        flags: FLAG_ACTIVITY_NEW_TASK,
      };

      if (launchProvider.activity) {
        params.className = launchProvider.activity;
      }

      await IntentLauncher.startActivityAsync(
        "android.intent.action.MAIN",
        params
      );
    } catch {
      Alert.alert(
        "App Not Installed",
        `${launchProvider.name} is not installed on this device.`,
        [{ text: "OK" }]
      );
    }
  };

  const isSession = event.eventType === "session" && event.sessionTitle;
  const isTennisMatch = event.sport === "tennis";
  const isTbcMatch = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbdOlympic = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;

  const bottomPadding = Math.max(insets.bottom + 12, Platform.OS === "web" ? 34 : 24);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <View style={styles.topSection}>
          <View style={styles.headerLine}>
            <View style={[styles.leagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
              <Text style={[styles.leagueChipText, { color: sportColor }]}>{leagueLabel}</Text>
            </View>
          </View>

          {isTennisMatch ? (
            <View style={styles.matchupContainer}>
              {event.tournamentName && (
                <Text style={[styles.venueText, { marginBottom: 8, color: "#CE93D8" }]}>{event.tournamentName}{event.tennisRound ? ` — ${event.tennisRound}` : ""}</Text>
              )}
              <View style={styles.teamRowsContainer}>
                <View style={styles.teamRow}>
                  <Text style={styles.teamRowName} numberOfLines={1}>
                    {event.tennisPlayer1Rank ? `#${event.tennisPlayer1Rank}  ` : ""}{event.tennisPlayer1 || event.awayTeam}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {score && <Text style={[styles.teamRowScore, isLiveState && styles.teamRowScoreLive]}>{score.awayScore}</Text>}
                </View>
                <View style={styles.teamRow}>
                  <Text style={styles.teamRowName} numberOfLines={1}>
                    {event.tennisPlayer2Rank ? `#${event.tennisPlayer2Rank}  ` : ""}{event.tennisPlayer2 || event.homeTeam}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {score && <Text style={[styles.teamRowScore, isLiveState && styles.teamRowScoreLive]}>{score.homeScore}</Text>}
                </View>
              </View>
            </View>
          ) : isSession ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.sessionTitle}</Text>
            </View>
          ) : isTbcMatch ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.t20WcMatchLabel}</Text>
              {event.t20WcVenue ? (
                <Text style={styles.venueText}>{event.t20WcVenue}</Text>
              ) : null}
            </View>
          ) : isTbdOlympic ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.olympicRound}</Text>
              {event.olympicVenue ? (
                <Text style={styles.venueText}>{event.olympicVenue}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.teamRowsContainer}>
              <View style={styles.teamRow}>
                <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={26} />
                <Text style={styles.teamRowName} numberOfLines={1}>{displayTeamName(event.awayTeam, event.league)}</Text>
                <View style={{ flex: 1 }} />
                {score && event.sport === "cricket"
                  ? score.cricketAway ? <Text style={[styles.teamRowCricketScore, isLiveState && styles.teamRowScoreLive]}>{score.cricketAway}</Text> : null
                  : score && <Text style={[styles.teamRowScore, isLiveState && styles.teamRowScoreLive]}>{score.awayScore}</Text>}
              </View>
              <View style={styles.teamRow}>
                <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={26} />
                <Text style={styles.teamRowName} numberOfLines={1}>{displayTeamName(event.homeTeam, event.league)}</Text>
                <View style={{ flex: 1 }} />
                {score && event.sport === "cricket"
                  ? score.cricketHome ? <Text style={[styles.teamRowCricketScore, isLiveState && styles.teamRowScoreLive]}>{score.cricketHome}</Text> : null
                  : score && <Text style={[styles.teamRowScore, isLiveState && styles.teamRowScoreLive]}>{score.homeScore}</Text>}
              </View>
            </View>
          )}

          {isLiveState && displayClockText ? (
            <Text style={[styles.sheetPeriod, styles.sheetPeriodLive]}>
              {displayClockText}
            </Text>
          ) : isFinalState && displayStatusText ? (
            <Text style={styles.sheetPeriod}>
              {displayStatusText}
            </Text>
          ) : null}

          {event.isOlympic && event.olympicVenue && !isTbdOlympic ? (
            <Text style={styles.venueText}>{event.olympicVenue}</Text>
          ) : null}

          {reasonLabel ? (
            <Text style={styles.providerReasonText}>
              {reasonLabel}
            </Text>
          ) : null}
        </View>

        {launchProvider && (
          <Pressable
            onPress={handleOpenProvider}
            style={({ pressed }) => [
              styles.openButton,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            testID="open-provider-btn"
          >
            <Text style={styles.openButtonText}>Watch on</Text>
            <ProviderLogo providerId={launchProvider.id} size={28} />
          </Pressable>
        )}
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
    gap: 20,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  leagueChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  leagueChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  matchupContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  teamRowsContainer: {
    gap: 12,
    paddingVertical: 20,
  },
  teamRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  teamRowName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  teamRowScore: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    minWidth: 28,
    textAlign: "right" as const,
  },
  teamRowCricketScore: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "right" as const,
    flexShrink: 0,
    maxWidth: 140,
  },
  teamRowScoreLive: {
    color: "#FFFFFF",
  },
  singleTeamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  sheetPeriod: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  sheetPeriodLive: {
    color: Colors.accent,
  },
  sheetElapsed: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  venueText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  providerReasonText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#3A3A3C",
    paddingVertical: 16,
    borderRadius: 14,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
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
