import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { getSportColor, type SportEvent } from "@/lib/data";
import { normalizeGameState } from "@/utils/gameState";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { formatTimeUntilStart } from "@/utils/time";
import { getTennisRoundShort, getTennisRoundPriority } from "@/data/tennisTopPlayers";

const TENNIS_COLOR = "#CE93D8";

function LiveDot() {
  return <View style={tStyles.liveDotStatic} />;
}

function RoundChip({ round }: { round: string }) {
  const short = getTennisRoundShort(round);
  const priority = getTennisRoundPriority(round);
  const isLateRound = priority >= 80;
  return (
    <View style={[tStyles.roundChip, isLateRound && tStyles.roundChipHot]}>
      <Text style={[tStyles.roundChipText, isLateRound && tStyles.roundChipTextHot]}>
        {short}
      </Text>
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <View style={tStyles.rankBadge}>
      <Text style={tStyles.rankText}>#{rank}</Text>
    </View>
  );
}

interface TennisCardProps {
  event: SportEvent;
  now: Date;
  score?: {
    awayScore: number;
    homeScore: number;
    period?: string;
    clock?: string;
    status?: string;
  };
  tensionRank?: number;
  showTension?: boolean;
}

export default function TennisCard({
  event,
  now,
  score,
  tensionRank = 0,
  showTension = false,
}: TennisCardProps) {
  const { gameState, displayClockText } = normalizeGameState(event, score, now);
  const isLive = gameState === "LIVE";
  const isFinal = gameState === "FINAL";
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore);

  const d = new Date(event.startTimeLocal);
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const tournamentShort = event.tournamentName
    ? event.tournamentName
        .replace(" Masters", "")
        .replace(" Open", "")
        .replace("Indian Wells", "Indian Wells")
    : event.league;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  const tensionLabel =
    showTension && tensionRank >= 3
      ? "Deciding Set"
      : showTension && tensionRank === 2
        ? "Tight Match"
        : null;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        tStyles.card,
        {
          opacity: pressed ? 0.85 : isFinal ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Animated.View style={[tStyles.cardInner, flashStyle]}>
        <View style={tStyles.accentBar} />

        <View style={tStyles.header}>
          <Ionicons name="tennisball-outline" size={14} color={TENNIS_COLOR} />
          <Text style={tStyles.headerSport}>Tennis</Text>
          <Text style={tStyles.headerDot}>·</Text>
          <Text style={tStyles.headerTournament} numberOfLines={1}>
            {tournamentShort}
          </Text>
          {event.tennisRound && <RoundChip round={event.tennisRound} />}
          <View style={{ flex: 1 }} />
          {isLive && (
            <View style={tStyles.liveChip}>
              <LiveDot />
              <Text style={tStyles.liveText}>LIVE</Text>
            </View>
          )}
          {isFinal && <Text style={tStyles.finalLabel}>FINAL</Text>}
        </View>

        <View style={tStyles.body}>
          <View style={tStyles.playerRow}>
            {event.tennisPlayer1Rank && (
              <RankBadge rank={event.tennisPlayer1Rank} />
            )}
            <Text
              style={[
                tStyles.playerName,
                !event.tennisPlayer1Rank && tStyles.playerNameNoRank,
              ]}
              numberOfLines={1}
            >
              {event.tennisPlayer1 || event.awayTeam}
            </Text>
            {score && (
              <Text style={[tStyles.scoreText, isLive && tStyles.scoreLive]}>
                {score.awayScore}
              </Text>
            )}
          </View>
          <View style={tStyles.playerRow}>
            {event.tennisPlayer2Rank && (
              <RankBadge rank={event.tennisPlayer2Rank} />
            )}
            <Text
              style={[
                tStyles.playerName,
                !event.tennisPlayer2Rank && tStyles.playerNameNoRank,
              ]}
              numberOfLines={1}
            >
              {event.tennisPlayer2 || event.homeTeam}
            </Text>
            {score && (
              <Text style={[tStyles.scoreText, isLive && tStyles.scoreLive]}>
                {score.homeScore}
              </Text>
            )}
          </View>
        </View>

        <View style={tStyles.footer}>
          <View style={tStyles.footerLeft}>
            {isLive && displayClockText ? (
              <Text style={tStyles.clockText}>{displayClockText}</Text>
            ) : isFinal ? (
              <Text style={tStyles.finalStatus}>Final</Text>
            ) : (
              <>
                <Text style={tStyles.timeText}>@ {timeStr}</Text>
                <Text style={tStyles.countdownText}>
                  {formatTimeUntilStart(event.startTimeLocal, now)}
                </Text>
              </>
            )}
          </View>
          <View style={tStyles.footerRight}>
            {tensionLabel && (
              <View style={tStyles.tensionTag}>
                <Text style={tStyles.tensionTagText}>{tensionLabel}</Text>
              </View>
            )}
            <ProviderLogo providerId={event.providerId} size={18} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const tStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(72, 72, 74, 0.6)",
    marginBottom: 10,
  },
  cardInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
    overflow: "hidden" as const,
  },
  accentBar: {
    position: "absolute" as const,
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: TENNIS_COLOR,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 10,
    flexWrap: "wrap" as const,
  },
  headerSport: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: TENNIS_COLOR,
    letterSpacing: 0.3,
  },
  headerDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  headerTournament: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    maxWidth: 120,
  },
  roundChip: {
    backgroundColor: "rgba(206,147,216,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roundChipHot: {
    backgroundColor: "rgba(206,147,216,0.25)",
  },
  roundChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: TENNIS_COLOR,
    letterSpacing: 0.5,
  },
  roundChipTextHot: {
    color: "#E1BEE7",
  },
  liveChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(0,230,118,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDotStatic: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.live,
    letterSpacing: 0.5,
  },
  finalLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  body: {
    gap: 6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  playerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  rankBadge: {
    backgroundColor: "rgba(206,147,216,0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 28,
    alignItems: "center" as const,
  },
  rankText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: TENNIS_COLOR,
  },
  playerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  playerNameNoRank: {
    paddingLeft: 0,
  },
  scoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: "right" as const,
  },
  scoreLive: {
    color: Colors.accent,
  },
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  footerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  footerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  clockText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentSoft,
  },
  finalStatus: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  tensionTag: {
    backgroundColor: "rgba(229,115,115,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tensionTagText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#E57373",
    letterSpacing: 0.3,
  },
});
