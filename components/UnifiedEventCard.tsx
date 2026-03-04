import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import { getSportColor, getSportIcon, type SportEvent } from "@/lib/data";
import { displayTeamName } from "@/utils/teams";
import { normalizeGameState } from "@/utils/gameState";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { formatTimeUntilStart } from "@/utils/time";
import { getTennisRoundShort, getTennisRoundPriority } from "@/data/tennisTopPlayers";
import type { ScoreData } from "@/lib/scores-context";

function getSportDisplayName(sport: string): string {
  const names: Record<string, string> = {
    hockey: "Hockey",
    rugby: "Rugby",
    cricket: "Cricket",
    soccer: "Soccer",
    tennis: "Tennis",
  };
  return names[sport] || sport.charAt(0).toUpperCase() + sport.slice(1);
}

function getLeagueLabel(event: SportEvent): string {
  if (event.isIccT20Wc) return "T20 World Cup";
  if (event.isOlympic) return "Olympics";
  if (event.tournamentName) return event.tournamentName;
  return event.league;
}

function getPhaseChipLabel(event: SportEvent, score: ScoreData | undefined, isLive: boolean): string | null {
  if (event.tennisRound) return getTennisRoundShort(event.tennisRound);
  if (event.olympicRound) {
    const r = event.olympicRound;
    if (r.length <= 6) return r;
    if (/final/i.test(r)) return "Final";
    if (/semi/i.test(r)) return "SF";
    if (/quarter/i.test(r)) return "QF";
    if (/group/i.test(r)) return r.replace(/Group\s*/i, "Grp ");
    return r.substring(0, 6);
  }
  if (isLive && score?.period) {
    const p = score.period.trim();
    if (/^(1st|2nd|3rd|ot|so|overtime|shootout|1st half|2nd half|ht|ft|et)/i.test(p)) {
      if (/overtime/i.test(p)) return "OT";
      if (/shootout/i.test(p)) return "SO";
      if (/1st half/i.test(p)) return "1H";
      if (/2nd half/i.test(p)) return "2H";
      if (/^ht$/i.test(p)) return "HT";
      if (/^ft$/i.test(p)) return "FT";
      if (/^et$/i.test(p)) return "ET";
      if (p.length <= 4) return p.toUpperCase();
      return p.substring(0, 4);
    }
    if (p.length <= 6) return p;
  }
  return null;
}

function getPhaseChipPriority(event: SportEvent): number {
  if (event.tennisRound) return getTennisRoundPriority(event.tennisRound);
  return 0;
}

function getCricketTeamAbbr(teamName: string): string {
  const abbrs: Record<string, string> = {
    "india": "IND", "australia": "AUS", "england": "ENG", "south africa": "SA",
    "new zealand": "NZ", "pakistan": "PAK", "sri lanka": "SL", "bangladesh": "BAN",
    "west indies": "WI", "afghanistan": "AFG", "ireland": "IRE", "zimbabwe": "ZIM",
    "netherlands": "NED", "scotland": "SCO", "nepal": "NEP", "namibia": "NAM",
    "oman": "OMA", "usa": "USA", "uae": "UAE", "canada": "CAN", "uganda": "UGA",
    "papua new guinea": "PNG",
  };
  const lower = teamName.toLowerCase().trim();
  if (abbrs[lower]) return abbrs[lower];
  if (lower.length <= 4) return lower.toUpperCase();
  return lower.substring(0, 3).toUpperCase();
}

export function formatCricketLiveDetail(
  event: SportEvent,
  score: ScoreData | undefined,
  isLive: boolean
): string | null {
  if (!isLive || !score || event.sport !== "cricket") return null;

  const period = (score.period || "").trim();

  const breakPatterns = /innings break|rain delay|strategic timeout|drinks|stumps|bad light|match delayed|tea|lunch/i;
  if (breakPatterns.test(period)) {
    const parts: string[] = [];
    const awayAbbr = getCricketTeamAbbr(event.awayTeam);
    const homeAbbr = getCricketTeamAbbr(event.homeTeam);
    if (score.cricketAway && score.cricketAway !== "Yet to bat") parts.push(`${awayAbbr} ${score.cricketAway}`);
    if (score.cricketHome && score.cricketHome !== "Yet to bat") parts.push(`${homeAbbr} ${score.cricketHome}`);
    return parts.length > 0 ? `${parts.join(" • ")} · ${period}` : period;
  }

  const parts: string[] = [];
  const awayAbbr = getCricketTeamAbbr(event.awayTeam);
  const homeAbbr = getCricketTeamAbbr(event.homeTeam);

  if (score.cricketAway && score.cricketAway !== "Yet to bat") {
    parts.push(`${awayAbbr} ${score.cricketAway}`);
  }
  if (score.cricketHome && score.cricketHome !== "Yet to bat") {
    parts.push(`${homeAbbr} ${score.cricketHome}`);
  }

  if (parts.length === 0) {
    if (period && period !== "In Progress") return period;
    return null;
  }

  let detail = parts.join(" • ");

  const needMatch = period.match(/need\s+(\d+)\s+runs?\s*(?:in\s+([\d.]+)\s*(?:ov(?:ers?)?|balls?)?)?/i);
  const rrrMatch = period.match(/req.*rate[:\s]*([\d.]+)/i);
  const trailMatch = period.match(/trail\s+by\s+(\d+)/i);
  const leadMatch = period.match(/lead\s+by\s+(\d+)/i);
  if (needMatch) {
    detail += needMatch[2] ? ` · need ${needMatch[1]} in ${needMatch[2]}` : ` · need ${needMatch[1]}`;
  } else if (rrrMatch) {
    detail += ` · RRR ${rrrMatch[1]}`;
  } else if (trailMatch) {
    detail += ` · trail by ${trailMatch[1]}`;
  } else if (leadMatch) {
    detail += ` · lead by ${leadMatch[1]}`;
  }

  return detail;
}

function LiveDot() {
  return <View style={uStyles.liveDotStatic} />;
}

function PhaseChip({ label, sportColor, isHot }: { label: string; sportColor: string; isHot: boolean }) {
  return (
    <View style={[uStyles.phaseChip, { backgroundColor: sportColor + "22" }, isHot && { backgroundColor: sportColor + "38" }]}>
      <Text style={[uStyles.phaseChipText, { color: sportColor }, isHot && { color: sportColor }]}>
        {label}
      </Text>
    </View>
  );
}

function RankBadge({ rank, sportColor }: { rank: number; sportColor: string }) {
  return (
    <View style={[uStyles.rankBadge, { backgroundColor: sportColor + "30" }]}>
      <Text style={[uStyles.rankText, { color: sportColor }]}>#{rank}</Text>
    </View>
  );
}

export interface UnifiedEventCardProps {
  event: SportEvent;
  now: Date;
  score?: ScoreData;
  isFav?: boolean;
  featured?: boolean;
  onSetFeatured?: (eventId: string) => void;
  tensionRank?: number;
  showTension?: boolean;
  showCountdown?: boolean;
}

export default function UnifiedEventCard({
  event,
  now,
  score,
  isFav = false,
  featured = false,
  onSetFeatured,
  tensionRank = 0,
  showTension = false,
  showCountdown = true,
}: UnifiedEventCardProps) {
  const sportColor = getSportColor(event.sport);
  const sportIcon = getSportIcon(event.sport) as any;
  const { gameState, displayClockText } = normalizeGameState(event, score, now);
  const isLive = gameState === "LIVE";
  const isFinal = gameState === "FINAL";
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const hasScore = !!score;

  const d = new Date(event.startTimeLocal);
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const phaseLabel = getPhaseChipLabel(event, score, isLive);
  const isHotPhase = getPhaseChipPriority(event) >= 80;

  const isSession = event.eventType === "session" && event.sessionTitle;
  const isTbc = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbd = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;
  const showTeamLayout = !isSession && !isTbc && !isTbd;

  const matchupFallback = isSession
    ? event.sessionTitle
    : isTbc
      ? event.t20WcMatchLabel
      : isTbd
        ? event.olympicRound
        : null;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onSetFeatured) {
      onSetFeatured(event.id);
      return;
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  const tensionLabel =
    showTension && tensionRank >= 4
      ? "High Drama"
      : showTension && tensionRank === 3
        ? "Tight Game"
        : showTension && tensionRank === 2
          ? "Heating Up"
          : null;

  const awayName = event.tennisPlayer1 || displayTeamName(event.awayTeam, event.league);
  const homeName = event.tennisPlayer2 || displayTeamName(event.homeTeam, event.league);

  const isTennis = event.sport === "tennis";
  const isCricket = event.sport === "cricket";
  const cricketLiveDetail = formatCricketLiveDetail(event, score, isLive);

  const awayRank = isTennis ? event.tennisPlayer1Rank : undefined;
  const homeRank = isTennis ? event.tennisPlayer2Rank : undefined;

  const logoSize = featured ? 22 : 20;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        uStyles.card,
        featured && uStyles.cardFeatured,
        {
          opacity: pressed ? 0.85 : isFinal ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`event-${event.id}`}
    >
      <Animated.View style={[uStyles.cardInner, featured && uStyles.cardInnerFeatured, flashStyle]}>
        <View style={[uStyles.accentBar, { backgroundColor: sportColor }]} />

        <View style={uStyles.header}>
          <Ionicons name={sportIcon} size={13} color={sportColor} />
          <Text style={[uStyles.headerSport, { color: sportColor }]}>
            {getSportDisplayName(event.sport)}
          </Text>
          <Text style={uStyles.headerDot}>·</Text>
          <Text style={uStyles.headerLeague} numberOfLines={1}>
            {getLeagueLabel(event)}
          </Text>
          {phaseLabel && (
            <PhaseChip label={phaseLabel} sportColor={sportColor} isHot={isHotPhase} />
          )}
          <View style={{ flex: 1 }} />
          {featured && (
            <View style={uStyles.featuredBadge}>
              <Ionicons name="star" size={8} color={Colors.accent} />
              <Text style={uStyles.featuredBadgeText}>FEATURED</Text>
            </View>
          )}
          {isFav && <Text style={uStyles.favStar}>★</Text>}
          {isLive && (
            <View style={uStyles.liveChip}>
              <LiveDot />
              <Text style={uStyles.liveText}>LIVE</Text>
            </View>
          )}
          {isFinal && <Text style={uStyles.finalLabel}>FINAL</Text>}
        </View>

        <View style={uStyles.body}>
          {showTeamLayout ? (
            <>
              <View style={uStyles.teamRow}>
                {awayRank ? (
                  <RankBadge rank={awayRank} sportColor={sportColor} />
                ) : (
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {awayName}
                </Text>
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{score.cricketAway || ""}</Text>
                  : hasScore && <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.awayScore}</Text>}
              </View>
              <View style={uStyles.teamRow}>
                {homeRank ? (
                  <RankBadge rank={homeRank} sportColor={sportColor} />
                ) : (
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {homeName}
                </Text>
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{score.cricketHome || ""}</Text>
                  : hasScore && <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.homeScore}</Text>}
              </View>
            </>
          ) : (
            <Text style={uStyles.fallbackMatchup} numberOfLines={2}>
              {matchupFallback}
            </Text>
          )}
          {event.t20WcVenue && isTbc ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.t20WcVenue}</Text>
          ) : event.isOlympic && event.olympicVenue ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.olympicVenue}</Text>
          ) : null}
        </View>

        {cricketLiveDetail ? (
          <Text style={uStyles.cricketLiveDetail} numberOfLines={1} ellipsizeMode="tail">
            {cricketLiveDetail}
          </Text>
        ) : null}

        <View style={uStyles.footer}>
          <View style={uStyles.footerLeft}>
            {isLive && displayClockText ? (
              <Text style={uStyles.clockText}>{displayClockText}</Text>
            ) : isFinal ? (
              <Text style={uStyles.finalStatus}>Final</Text>
            ) : (
              <>
                <Text style={uStyles.timeText}>@ {timeStr}</Text>
                {showCountdown && (
                  <Text style={uStyles.countdownText}>
                    {formatTimeUntilStart(event.startTimeLocal, now)}
                  </Text>
                )}
              </>
            )}
          </View>
          <View style={uStyles.footerRight}>
            {tensionLabel && (
              <View style={uStyles.tensionTag}>
                <Text style={uStyles.tensionTagText}>{tensionLabel}</Text>
              </View>
            )}
            <ProviderLogo providerId={event.providerId} size={18} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const uStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(72, 72, 74, 0.6)",
    marginBottom: 10,
  },
  cardFeatured: {
    borderWidth: 1.5,
    borderColor: Colors.accent + "40",
    borderRadius: 16,
  },
  cardInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
    overflow: "hidden" as const,
  },
  cardInnerFeatured: {
    padding: 16,
    borderRadius: 15,
  },
  accentBar: {
    position: "absolute" as const,
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
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
    letterSpacing: 0.3,
  },
  headerDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  headerLeague: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    maxWidth: 140,
  },
  phaseChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phaseChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  featuredBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: Colors.accent + "18",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  favStar: {
    fontSize: 11,
    color: Colors.favStar,
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
  teamRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 28,
    alignItems: "center" as const,
  },
  rankText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  teamName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  teamNameFeatured: {
    fontSize: 17,
  },
  scoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: "right" as const,
  },
  scoreTextFeatured: {
    fontSize: 17,
  },
  cricketScoreText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "right" as const,
    flexShrink: 0,
    maxWidth: 120,
  },
  scoreLive: {
    color: Colors.accent,
  },
  fallbackMatchup: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    paddingLeft: 4,
  },
  venueText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
    paddingLeft: 4,
  },
  cricketLiveDetail: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accentSoft || "#66BB6A",
    marginTop: 2,
    marginBottom: 2,
    paddingLeft: 4,
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
