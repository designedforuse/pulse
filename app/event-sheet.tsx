import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
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

function formatTimeOnly(startTimeLocal: string): string {
  return new Date(startTimeLocal).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const leagueLabel = event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.tournamentName || event.league;
  const dateLabel = formatDetailDate(event.startTimeLocal);
  const timeLabel = formatTimeOnly(event.startTimeLocal);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, new Date());
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";
  const isUpcoming = gameState === "UPCOMING";
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
  const isCricket = event.sport === "cricket";
  const isTbcMatch = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbdOlympic = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;

  const bottomPadding = Math.max(insets.bottom + 12, Platform.OS === "web" ? 34 : 24);
  const providerBrandId = resolved.brandId;

  return (
    <View style={styles.container}>
      <View style={styles.dragHandleBar}>
        <View style={styles.dragHandle} />
      </View>
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <View style={styles.topSection}>
          {/* League chip */}
          <View style={styles.headerLine}>
            <View style={[styles.leagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
              <Text style={[styles.leagueChipText, { color: sportColor }]}>{leagueLabel}</Text>
            </View>
          </View>

          {/* Matchup area */}
          {isSession ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.sessionTitle}</Text>
            </View>
          ) : isTbcMatch ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.t20WcMatchLabel}</Text>
              {event.t20WcVenue ? <Text style={styles.venueText}>{event.t20WcVenue}</Text> : null}
            </View>
          ) : isTbdOlympic ? (
            <View style={styles.matchupContainer}>
              <Text style={styles.singleTeamName}>{event.olympicRound}</Text>
              {event.olympicVenue ? <Text style={styles.venueText}>{event.olympicVenue}</Text> : null}
            </View>
          ) : (
            /* ESPN-style centered layout */
            <View style={styles.espnMatchup}>
              {/* Away team */}
              <View style={styles.espnTeam}>
                {isTennisMatch && event.tennisPlayer1Flag ? (
                  <Image
                    source={{ uri: event.tennisPlayer1Flag }}
                    style={styles.tennisFlag}
                    resizeMode="contain"
                  />
                ) : (
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={52} />
                )}
                <Text style={styles.espnTeamName} numberOfLines={1}>
                  {isTennisMatch
                    ? <>{event.tennisPlayer1 || event.awayTeam}{event.tennisPlayer1Rank ? <Text style={[styles.tennisRank, { color: sportColor }]}> [{event.tennisPlayer1Rank}]</Text> : null}</>
                    : displayTeamName(event.awayTeam, event.league)}
                </Text>
              </View>

              {/* Center: time+provider (upcoming/live) or score (final) */}
              <View style={styles.espnCenter}>
                {isFinalState && score && !isCricket ? (
                  <>
                    <View style={styles.espnScoreRow}>
                      <Text style={styles.espnScoreFinal}>{score.awayScore}</Text>
                      <Text style={styles.espnScoreDashFinal}>–</Text>
                      <Text style={styles.espnScoreFinal}>{score.homeScore}</Text>
                    </View>
                    <Text style={styles.espnFinalLabel}>{displayStatusText || "FT"}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.espnTime}>{timeLabel}</Text>
                    {providerBrandId && <ProviderLogo providerId={providerBrandId} size={22} />}
                  </>
                )}
              </View>

              {/* Home team */}
              <View style={styles.espnTeam}>
                {isTennisMatch && event.tennisPlayer2Flag ? (
                  <Image
                    source={{ uri: event.tennisPlayer2Flag }}
                    style={styles.tennisFlag}
                    resizeMode="contain"
                  />
                ) : (
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={52} />
                )}
                <Text style={styles.espnTeamName} numberOfLines={1}>
                  {isTennisMatch
                    ? <>{event.tennisPlayer2 || event.homeTeam}{event.tennisPlayer2Rank ? <Text style={[styles.tennisRank, { color: sportColor }]}> [{event.tennisPlayer2Rank}]</Text> : null}</>
                    : displayTeamName(event.homeTeam, event.league)}
                </Text>
              </View>
            </View>
          )}

          {/* Cricket innings scores — final only */}
          {isCricket && isFinalState && score && (score.cricketAway || score.cricketHome) && (
            <View style={styles.cricketScores}>
              {score.cricketAway ? (
                <Text style={[styles.cricketInnings, isLiveState && styles.cricketInningsLive]} numberOfLines={2}>
                  {displayTeamName(event.awayTeam, event.league)}: {score.cricketAway}
                </Text>
              ) : null}
              {score.cricketHome ? (
                <Text style={[styles.cricketInnings, isLiveState && styles.cricketInningsLive]} numberOfLines={2}>
                  {displayTeamName(event.homeTeam, event.league)}: {score.cricketHome}
                </Text>
              ) : null}
              {displayClockText ? <Text style={styles.cricketStatus}>{displayClockText}</Text> : null}
            </View>
          )}

          {event.isOlympic && event.olympicVenue && !isTbdOlympic ? (
            <Text style={styles.venueText}>{event.olympicVenue}</Text>
          ) : null}

          {reasonLabel ? (
            <Text style={styles.providerReasonText}>{reasonLabel}</Text>
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
  dragHandleBar: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
    justifyContent: "space-between",
  },
  topSection: {
    gap: 8,
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
  singleTeamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  /* ESPN-style centered matchup */
  espnMatchup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  espnTeam: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  espnTeamName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  tennisFlag: {
    width: 64,
    height: 42,
    borderRadius: 6,
  },
  tennisRank: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  espnCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  espnTime: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  espnScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  espnScore: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    minWidth: 24,
    textAlign: "center",
  },
  espnScoreDash: {
    fontSize: 24,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  espnScoreFinal: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: "center",
  },
  espnScoreDashFinal: {
    fontSize: 24,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  espnClock: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
    textAlign: "center",
  },
  espnFinalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  /* Cricket */
  cricketScores: {
    gap: 4,
    paddingVertical: 4,
  },
  cricketInnings: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  cricketInningsLive: {
    color: Colors.textPrimary,
  },
  cricketStatus: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    textAlign: "center",
    marginTop: 4,
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 60,
    fontFamily: "Inter_400Regular",
  },
});
