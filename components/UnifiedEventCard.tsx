import React from "react";
import { View, Text, Image, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import { getSportColor, getSportIcon, resolveProviderDisplay, type SportEvent } from "@/lib/data";
import { displayTeamName } from "@/utils/teams";
import { normalizeGameState } from "@/utils/gameState";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { formatTimeUntilStart } from "@/utils/time";
import { getTennisRoundShort, getTennisRoundPriority } from "@/data/tennisTopPlayers";
import type { ScoreData, TennisSetScore } from "@/lib/scores-context";
import { useSvnsMatches, extractSvnsCity, formatSvnsMatchLine, formatSvnsMatchTime, getSvnsTeamFlag, extractSvnsSessionDay, type SvnsMatch } from "@/lib/svns-context";

const GP_FLAGS: Record<string, string> = {
  "Australian": "🇦🇺",
  "Bahrain": "🇧🇭",
  "Saudi Arabian": "🇸🇦",
  "Japanese": "🇯🇵",
  "Chinese": "🇨🇳",
  "Miami": "🇺🇸",
  "Emilia Romagna": "🇮🇹",
  "Monaco": "🇲🇨",
  "Spanish": "🇪🇸",
  "Canadian": "🇨🇦",
  "Austrian": "🇦🇹",
  "British": "🇬🇧",
  "Belgian": "🇧🇪",
  "Hungarian": "🇭🇺",
  "Dutch": "🇳🇱",
  "Italian": "🇮🇹",
  "Azerbaijan": "🇦🇿",
  "Singapore": "🇸🇬",
  "United States": "🇺🇸",
  "Mexico City": "🇲🇽",
  "Mexican": "🇲🇽",
  "São Paulo": "🇧🇷",
  "Brazilian": "🇧🇷",
  "Las Vegas": "🇺🇸",
  "Qatar": "🇶🇦",
  "Abu Dhabi": "🇦🇪",
};

export function getGrandPrixFlag(gpName: string): string | null {
  for (const [key, flag] of Object.entries(GP_FLAGS)) {
    if (gpName.includes(key)) return flag;
  }
  return null;
}

const GP_LOCATIONS: Record<string, string> = {
  "Australian": "Australia",
  "Bahrain": "Bahrain",
  "Saudi Arabian": "Saudi Arabia",
  "Japanese": "Japan",
  "Chinese": "China",
  "Miami": "Miami",
  "Emilia Romagna": "Imola",
  "Monaco": "Monaco",
  "Spanish": "Spain",
  "Canadian": "Canada",
  "Austrian": "Austria",
  "British": "Britain",
  "Belgian": "Belgium",
  "Hungarian": "Hungary",
  "Dutch": "Netherlands",
  "Italian": "Italy",
  "Azerbaijan": "Azerbaijan",
  "Singapore": "Singapore",
  "United States": "USA",
  "Mexico City": "Mexico",
  "Mexican": "Mexico",
  "São Paulo": "Brazil",
  "Brazilian": "Brazil",
  "Las Vegas": "Las Vegas",
  "Qatar": "Qatar",
  "Abu Dhabi": "Abu Dhabi",
};

function getGrandPrixLocation(gpName: string): string {
  const raw = gpName.replace(/\s*Grand\s*Prix$/i, "").trim();
  return GP_LOCATIONS[raw] || raw || gpName;
}

const DRIVER_COUNTRY_FLAGS: Record<string, string> = {
  "Monaco": "🇲🇨", "Netherlands": "🇳🇱", "United Kingdom": "🇬🇧", "Great Britain": "🇬🇧", "Britain": "🇬🇧",
  "Spain": "🇪🇸", "Mexico": "🇲🇽", "Australia": "🇦🇺", "France": "🇫🇷",
  "Finland": "🇫🇮", "Canada": "🇨🇦", "Germany": "🇩🇪", "Japan": "🇯🇵",
  "Thailand": "🇹🇭", "Denmark": "🇩🇰", "China": "🇨🇳", "United States": "🇺🇸",
  "Italy": "🇮🇹", "New Zealand": "🇳🇿", "Brazil": "🇧🇷", "Argentina": "🇦🇷",
  "Belgium": "🇧🇪", "Switzerland": "🇨🇭", "Austria": "🇦🇹", "Poland": "🇵🇱",
  "Sweden": "🇸🇪", "Norway": "🇳🇴", "Ireland": "🇮🇪", "Russia": "🇷🇺",
  "South Africa": "🇿🇦", "India": "🇮🇳", "Colombia": "🇨🇴", "Venezuela": "🇻🇪",
  "Indonesia": "🇮🇩", "Israel": "🇮🇱",
};

export function getDriverFlag(countryName?: string): string | null {
  if (!countryName) return null;
  return DRIVER_COUNTRY_FLAGS[countryName] || null;
}

function getSportDisplayName(sport: string): string {
  const names: Record<string, string> = {
    hockey: "Hockey",
    rugby: "Rugby",
    cricket: "Cricket",
    soccer: "Soccer",
    tennis: "Tennis",
    racing: "Racing",
    athletics: "Athletics",
  };
  return names[sport] || sport.charAt(0).toUpperCase() + sport.slice(1);
}

function getLeagueLabel(event: SportEvent): string {
  if (event.isIccT20Wc) return "T20 World Cup";
  if (event.isOlympic) return "Olympics";
  if (event.leagueKey === "svns" && event.eventType === "session") {
    const city = extractSvnsCity(event.homeTeam);
    if (city) return `${city} SVNS`;
  }
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
    if (/^(1st|2nd|3rd|4th|ot|so|overtime|shootout|1st half|2nd half|ht|ft|et)/i.test(p)) {
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
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[uStyles.liveDotStatic, animStyle]} />;
}

function LiveScanBar({ color }: { color: string }) {
  const BAR = 18;
  const [trackW, setTrackW] = React.useState(80);
  const tx = useSharedValue(-BAR);
  React.useEffect(() => {
    tx.value = -BAR;
    tx.value = withRepeat(
      withSequence(
        withTiming(trackW, { duration: 900 }),
        withTiming(-BAR, { duration: 900 })
      ),
      -1,
      false
    );
  }, [trackW]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <View
      style={{ width: "100%", height: 2, overflow: "hidden", marginTop: 3, borderRadius: 1 }}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ width: BAR, height: 2, borderRadius: 1, backgroundColor: color }, animStyle]} />
    </View>
  );
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


const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
  "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
  "8": "\u2078", "9": "\u2079",
};

function superscriptDigits(s: string): string {
  return s.split("").map(c => SUPERSCRIPT_MAP[c] || c).join("");
}

export function TennisScoreboard({
  event,
  score,
  isLive,
  isFinal,
  featured,
}: {
  event: SportEvent;
  score?: ScoreData;
  isLive: boolean;
  isFinal: boolean;
  featured?: boolean;
}) {
  const p1Name = event.tennisPlayer1 || event.awayTeam;
  const p2Name = event.tennisPlayer2 || event.homeTeam;
  const p1Flag = event.tennisPlayer1Flag;
  const p2Flag = event.tennisPlayer2Flag;
  const p1Rank = event.tennisPlayer1Rank;
  const p2Rank = event.tennisPlayer2Rank;
  const sportColor = getSportColor("tennis");
  const logoSize = featured ? 22 : 20;

  const sets = score?.tennisSetScores || [];
  const gameScore = score?.tennisGameScore;
  const server = score?.tennisServer;
  const winner = score?.tennisWinner;
  const hasScoreData = sets.length > 0;
  const statusDetail = score?.tennisStatusDetail;

  const isSuspended = statusDetail &&
    /suspended|rain|delay|medical|retired|walkover/i.test(statusDetail);

  const renderPlayerRow = (
    playerNum: 1 | 2,
    name: string,
    flag?: string,
    rank?: number,
  ) => {
    const isWinner = winner === playerNum;
    const isServing = server === playerNum;
    const nameOpacity = isFinal && winner && !isWinner ? 0.5 : 1;

    return (
      <View style={tsStyles.playerRow}>
        {flag ? (
          <Image
            source={{ uri: flag }}
            style={[tsStyles.flag, { width: logoSize, height: Math.round(logoSize * 0.7) }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[tsStyles.flag, { width: logoSize, height: Math.round(logoSize * 0.7) }]} />
        )}
        <View style={tsStyles.nameContainer}>
          {isServing && isLive && (
            <View style={tsStyles.servingDot} />
          )}
          <Text
            style={[
              tsStyles.playerName,
              featured && tsStyles.playerNameFeatured,
              { opacity: nameOpacity },
              isWinner && tsStyles.playerNameWinner,
            ]}
            numberOfLines={1}
          >
            {name}
            {rank ? (
              <Text style={[tsStyles.rankText, { color: sportColor }]}>{` (${rank})`}</Text>
            ) : null}
          </Text>
        </View>
        {hasScoreData && (
          <View style={tsStyles.setsContainer}>
            {sets.map((s, i) => {
              const val = playerNum === 1 ? s.p1 : s.p2;
              const isSetWinner = s.winner === playerNum;
              const isCurrentSet = i === sets.length - 1 && !s.winner && isLive;
              const showTb = s.tiebreak && isSetWinner;
              return (
                <View key={i} style={tsStyles.setScoreCell}>
                  <Text
                    style={[
                      tsStyles.setScore,
                      isSetWinner && tsStyles.setScoreWon,
                      isCurrentSet && isLive && tsStyles.setScoreCurrent,
                    ]}
                  >
                    {val}
                    {showTb ? (
                      <Text style={tsStyles.tiebreakScore}>
                        {superscriptDigits(s.tiebreak || "")}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              );
            })}
            {gameScore && isLive && (
              <View style={[tsStyles.setScoreCell, tsStyles.gameScoreCell]}>
                <Text style={[tsStyles.gameScore, isLive && tsStyles.gameScoreLive]}>
                  {playerNum === 1 ? gameScore.p1 : gameScore.p2}
                </Text>
              </View>
            )}
          </View>
        )}
        {!hasScoreData && isLive && (
          <Text style={tsStyles.liveNow}>Live</Text>
        )}
        {!hasScoreData && isFinal && score && (
          <Text style={tsStyles.finalSetsText}>
            {score.awayScore}–{score.homeScore}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={tsStyles.scoreboard}>
      {renderPlayerRow(1, p1Name, p1Flag, p1Rank)}
      {renderPlayerRow(2, p2Name, p2Flag, p2Rank)}
      {isSuspended && (
        <Text style={tsStyles.statusLabel}>{statusDetail}</Text>
      )}
    </View>
  );
}

const tsStyles = StyleSheet.create({
  scoreboard: {
    gap: 4,
    paddingLeft: 4,
  },
  playerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    minHeight: 24,
  },
  flag: {
    borderRadius: 2,
  },
  nameContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  servingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
  },
  playerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  playerNameFeatured: {
    fontSize: 16,
  },
  playerNameWinner: {
    fontFamily: "Inter_700Bold",
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  setsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 0,
  },
  setScoreCell: {
    width: 22,
    alignItems: "center" as const,
  },
  setScore: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center" as const,
  },
  setScoreWon: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  setScoreCurrent: {
    color: Colors.accent,
  },
  tiebreakScore: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  gameScoreCell: {
    width: 28,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(72,72,74,0.4)",
    marginLeft: 2,
    paddingLeft: 2,
  },
  gameScore: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  gameScoreLive: {
    color: Colors.accent,
  },
  liveNow: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#FFB74D",
    marginTop: 2,
    paddingLeft: 4,
  },
  finalSetsText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textAlign: "right" as const,
  },
});

function SvnsMatchRow({ match, isLive }: { match: SvnsMatch; isLive: boolean }) {
  const isMatchLive = match.status.startsWith("L");
  const isCompleted = match.status === "C";
  const isUpcoming = match.status === "U";
  const genderLabel = match.gender === "womens" ? "W" : "M";
  const phaseShort = match.phase.replace("Cup Semi Finals", "Semi").replace("Cup Final", "Final").replace("3rd Place Play-Off", "3rd Place").replace("5th Place Play-Off", "5th Place").replace("7th Place Play-Off", "7th Place").replace("5th Place Semi Final", "5th SF");
  const timeStr = formatSvnsMatchTime(match);
  const hasScore = isMatchLive || isCompleted;
  const flag1 = getSvnsTeamFlag(match.team1Abbr);
  const flag2 = getSvnsTeamFlag(match.team2Abbr);

  return (
    <View style={svnsStyles.matchRow}>
      {isMatchLive && (
        <View style={svnsStyles.matchLiveDot} />
      )}
      <Text style={[svnsStyles.matchGender, { color: match.gender === "womens" ? "#FF6B9D" : "#64B5F6" }]}>
        {genderLabel}
      </Text>
      <Text style={svnsStyles.matchTeams} numberOfLines={1}>
        {flag1} {match.team1Abbr} {hasScore ? `${match.team1Score}–${match.team2Score}` : "vs"} {match.team2Abbr} {flag2}
      </Text>
      <Text style={svnsStyles.matchPhase} numberOfLines={1}>{phaseShort}</Text>
      {isUpcoming && <Text style={svnsStyles.matchTime}>{timeStr}</Text>}
      {isMatchLive && <Text style={svnsStyles.matchLiveLabel}>LIVE</Text>}
    </View>
  );
}

const svnsStyles = StyleSheet.create({
  matchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 6,
    gap: 6,
  },
  matchLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3B30",
  },
  matchGender: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  matchTeams: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    flex: 1,
  },
  matchPhase: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  matchTime: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  matchLiveLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FF3B30",
  },
});

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
  accentBarColor?: string;
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
  accentBarColor,
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
  const isSvnsSession = isSession && event.leagueKey === "svns";
  const svnsCity = isSvnsSession ? extractSvnsCity(event.homeTeam) : null;
  const svnsData = useSvnsMatches(svnsCity);
  const svnsDisplayMatch: SvnsMatch | null = svnsData?.liveMatch || svnsData?.nextMatch || svnsData?.lastCompletedMatch || null;

  const isTbc = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbd = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;
  const showTeamLayout = !isSession && !isTbc && !isTbd;

  const svnsSessionLabel = isSvnsSession && event.sessionTitle ? extractSvnsSessionDay(event.sessionTitle) : null;
  const matchupFallback = isSvnsSession && svnsSessionLabel
    ? svnsSessionLabel
    : isSession
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
  const isRacing = event.sport === "racing";
  const isGolf = event.sport === "golf";
  const isAthletics = event.sport === "athletics";
  const gpFlag = isRacing ? getGrandPrixFlag(event.competitionName || event.homeTeam) : null;
  const golfTournament = isGolf ? (event.tournamentName || event.homeTeam) : null;
  const golfRound = isGolf && event.sessionTitle
    ? (event.sessionTitle.match(/Round \d+/)?.[0] || event.sessionTitle.split("—")[1]?.trim() || event.sessionTitle)
    : null;
  const athleticsTournament = isAthletics ? (event.tournamentName || event.homeTeam) : null;


  const awayRank = isTennis ? event.tennisPlayer1Rank : undefined;
  const homeRank = isTennis ? event.tennisPlayer2Rank : undefined;
  const awayFlag = isTennis ? event.tennisPlayer1Flag : undefined;
  const homeFlag = isTennis ? event.tennisPlayer2Flag : undefined;

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
        <View style={[uStyles.accentBar, { backgroundColor: isLive ? "#1CB0F6" : (accentBarColor ?? sportColor) }]} />

        <View style={uStyles.header}>
          <View style={[uStyles.sportPill, { backgroundColor: sportColor }]}>
            <Text style={uStyles.sportPillText}>{getSportDisplayName(event.sport).toUpperCase()}</Text>
          </View>
          <Text style={uStyles.headerLeague} numberOfLines={1}>
            {getLeagueLabel(event)}
          </Text>
          {isRacing && (event.sessionTitle || event.awayTeam) && (
            <View style={[uStyles.racingSessionPill, { backgroundColor: sportColor + "1A" }]}>
              <Text style={[uStyles.racingSessionPillText, { color: sportColor }]}>
                {event.sessionTitle || event.awayTeam}
              </Text>
            </View>
          )}
          {isGolf && golfRound && (
            <View style={[uStyles.racingSessionPill, { backgroundColor: sportColor + "1A" }]}>
              <Text style={[uStyles.racingSessionPillText, { color: sportColor }]}>
                {golfRound}
              </Text>
            </View>
          )}
          {!isRacing && !isGolf && !isAthletics && phaseLabel && (
            <PhaseChip label={phaseLabel} sportColor={sportColor} isHot={isHotPhase} />
          )}
          <View style={{ flex: 1 }} />
          {featured && (
            <View style={uStyles.featuredBadge}>
              <Ionicons name="star" size={8} color={Colors.accent} />
              <Text style={uStyles.featuredBadgeText}>FEATURED</Text>
            </View>
          )}
          {isFav && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
          {isLive && (
            <View style={uStyles.liveChip}>
              <LiveDot />
              <Text style={uStyles.liveText}>LIVE</Text>
            </View>
          )}
          {isFinal && <Text style={uStyles.finalLabel}>FINAL</Text>}
        </View>

        <View style={uStyles.body}>
          {isAthletics ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>🏃</Text>
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {athleticsTournament}
                </Text>
              </View>
            </View>
          ) : isGolf ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>⛳</Text>
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {golfTournament}
                </Text>
              </View>
            </View>
          ) : isRacing ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>{gpFlag || "🏁"}</Text>
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {event.competitionName || event.homeTeam}
                </Text>
              </View>
              {(isLive || isFinal) && score?.racingLeader && (
                <View style={uStyles.racingLeaderSection}>
                  <View style={uStyles.racingLeaderRow}>
                    {score.racingLeaderPosition != null && (
                      <Text style={[uStyles.racingPositionBadge, { color: sportColor }]}>
                        P{score.racingLeaderPosition}
                      </Text>
                    )}
                    {getDriverFlag(score.racingLeaderCountry) && (
                      <Text style={uStyles.racingDriverFlag}>
                        {getDriverFlag(score.racingLeaderCountry)}
                      </Text>
                    )}
                    <Text style={uStyles.racingLeaderName} numberOfLines={1}>
                      {score.racingLeader}
                    </Text>
                  </View>
                  {score.racingLeaderTeam && (
                    <Text style={uStyles.racingLeaderTeam} numberOfLines={1}>
                      {score.racingLeaderTeam}
                    </Text>
                  )}
                </View>
              )}
              {(isLive || isFinal) && (score?.racingLap || score?.racingStatus) && (
                <Text style={uStyles.racingContextLine} numberOfLines={1}>
                  {score?.racingLap || (isFinal ? "Complete" : "")}
                  {isLive && score?.racingStatus && score.racingStatus !== score.racingLap
                    ? (score?.racingLap ? " · " : "") + score.racingStatus
                    : ""}
                </Text>
              )}
            </View>
          ) : isTennis && showTeamLayout ? (
            <TennisScoreboard
              event={event}
              score={score}
              isLive={isLive}
              isFinal={isFinal}
              featured={featured}
            />
          ) : showTeamLayout ? (
            <>
              <View style={uStyles.teamRow}>
                {awayFlag ? (
                  <Image source={{ uri: awayFlag }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : (
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {awayName}{awayRank ? <Text style={[uStyles.rankInline, { color: sportColor }]}>{` (${awayRank})`}</Text> : null}
                </Text>
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{score.cricketAway || ""}</Text>
                  : hasScore && !isTennis && <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.awayScore}</Text>}
              </View>
              <View style={uStyles.teamRow}>
                {homeFlag ? (
                  <Image source={{ uri: homeFlag }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : (
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {homeName}{homeRank ? <Text style={[uStyles.rankInline, { color: sportColor }]}>{` (${homeRank})`}</Text> : null}
                </Text>
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{score.cricketHome || ""}</Text>
                  : hasScore && !isTennis && <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.homeScore}</Text>}
              </View>
            </>
          ) : (
            <>
              <Text style={uStyles.fallbackMatchup} numberOfLines={2}>
                {matchupFallback}
              </Text>
              {isSvnsSession && svnsDisplayMatch && (
                <SvnsMatchRow match={svnsDisplayMatch} isLive={isLive} />
              )}
            </>
          )}
          {event.t20WcVenue && isTbc ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.t20WcVenue}</Text>
          ) : event.isOlympic && event.olympicVenue ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.olympicVenue}</Text>
          ) : null}
        </View>

        <View style={uStyles.footer}>
          <View style={uStyles.footerLeft}>
            {isRacing && isLive ? (
              <Text style={uStyles.clockText}>
                {score?.racingLap || score?.racingStatus || "In Progress"}
              </Text>
            ) : isRacing && isFinal ? (
              <Text style={uStyles.finalStatus}>
                {score?.racingLeader ? "Winner" : "Final"}
              </Text>
            ) : isGolf && isLive && score?.golfLeaderThru ? (
              <Text style={uStyles.clockText}>{score.golfLeaderThru}</Text>
            ) : isLive && !isGolf && displayClockText ? (
              <View style={{ alignSelf: "flex-start" }}>
                <Text style={uStyles.clockText}>{displayClockText}</Text>
                <LiveScanBar color="#1CB0F6" />
              </View>
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
            <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={18} />
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
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  cardFeatured: {
    borderWidth: 2,
    borderColor: Colors.accent + "60",
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
  sportPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sportPillText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.4,
  },
  liveChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
  flagIcon: {
    marginRight: 6,
    borderRadius: 2,
  },
  rankInline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  scoreLive: {
    color: "#1CB0F6",
  },
  fallbackMatchup: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    paddingLeft: 4,
  },
  racingLayout: {
    gap: 4,
    paddingLeft: 4,
  },
  racingCircuitRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  racingCircuitName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    flex: 1,
  },
  racingCircuitNameFeatured: {
    fontSize: 18,
  },
  racingLeaderSection: {
    marginTop: 4,
    gap: 2,
  },
  racingLeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  racingDriverFlag: {
    fontSize: 14,
  },
  racingLeaderName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  racingPositionBadge: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  racingLeaderTeam: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginLeft: 20,
  },
  racingContextLine: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  racingSessionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  racingSessionPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  venueText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
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
    color: "#1CB0F6",
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
