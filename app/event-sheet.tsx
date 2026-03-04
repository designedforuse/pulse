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
            <Text style={[styles.headerLeague, { color: sportColor }]}>{leagueLabel}</Text>
          </View>

          {isTennisMatch ? (
            <View style={styles.matchupContainer}>
              {event.tournamentName && (
                <Text style={[styles.venueText, { marginBottom: 8, color: "#CE93D8" }]}>{event.tournamentName}{event.tennisRound ? ` — ${event.tennisRound}` : ""}</Text>
              )}
              <View style={styles.matchupRow}>
                <View style={styles.teamSide}>
                  <Text style={styles.teamName}>
                    {event.tennisPlayer1Rank ? `#${event.tennisPlayer1Rank} ` : ""}{event.tennisPlayer1 || event.awayTeam}
                  </Text>
                  {score && <Text style={[styles.sheetScore, isLiveState && styles.sheetScoreLive]}>{score.awayScore}</Text>}
                </View>
                <Text style={styles.atText}>vs</Text>
                <View style={styles.teamSide}>
                  <Text style={styles.teamName}>
                    {event.tennisPlayer2Rank ? `#${event.tennisPlayer2Rank} ` : ""}{event.tennisPlayer2 || event.homeTeam}
                  </Text>
                  {score && <Text style={[styles.sheetScore, isLiveState && styles.sheetScoreLive]}>{score.homeScore}</Text>}
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
            <View style={styles.matchupRow}>
              <View style={styles.teamSide}>
                <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={28} />
                <Text style={styles.teamName}>{displayTeamName(event.awayTeam, event.league)}</Text>
                {score && event.sport === "cricket"
                  ? score.cricketAway ? <Text style={[styles.sheetCricketScore, isLiveState && styles.sheetScoreLive]}>{score.cricketAway}</Text> : null
                  : score && <Text style={[styles.sheetScore, isLiveState && styles.sheetScoreLive]}>{score.awayScore}</Text>}
              </View>
              <Text style={styles.atText}>{["NHL", "AHL", "ECHL", "NCAA Hockey", "MLS", "USL"].includes(event.league) ? "at" : "vs"}</Text>
              <View style={styles.teamSide}>
                <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={28} />
                <Text style={styles.teamName}>{displayTeamName(event.homeTeam, event.league)}</Text>
                {score && event.sport === "cricket"
                  ? score.cricketHome ? <Text style={[styles.sheetCricketScore, isLiveState && styles.sheetScoreLive]}>{score.cricketHome}</Text> : null
                  : score && <Text style={[styles.sheetScore, isLiveState && styles.sheetScoreLive]}>{score.homeScore}</Text>}
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
            <ProviderLogo providerId={launchProvider.id} size={28} />
            <Text style={styles.openButtonText}>{resolved.launchLabel}</Text>
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
    flexWrap: "wrap",
    gap: 4,
  },
  headerLeague: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
  headerDot: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  headerDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
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
    gap: 8,
    paddingVertical: 16,
  },
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 20,
  },
  teamSide: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  singleTeamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  atText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  sheetScore: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  sheetCricketScore: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  sheetScoreLive: {
    color: Colors.accent,
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
