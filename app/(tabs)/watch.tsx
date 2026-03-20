import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { displayTeamName } from "@/utils/teams";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import UnifiedEventCard, { formatCricketLiveDetail, TennisScoreboard, getGrandPrixFlag, getDriverFlag } from "@/components/UnifiedEventCard";
import {
  getSportColor,
  resolveProviderDisplay,
  type SportEvent,
} from "@/lib/data";
import { getTennisRoundPriority } from "@/data/tennisTopPlayers";
import { useEvents } from "@/lib/events-context";
import { useScores, type ScoreData } from "@/lib/scores-context";
import { useFavorites } from "@/lib/favorites-context";
import {
  getLiveEventsNow,
  getUpNextEvents,
  formatLastUpdated,
  isEventCompleted,
} from "@/utils/time";
import { normalizeGameState } from "@/utils/gameState";
import { favoriteInvolved, isTeamFavorite } from "@/utils/favorites";
import type { Favorites } from "@/lib/data";
import { RITUALS } from "@/lib/rituals";
import {
  buildChaosSetup,
  selfHealChaosSetup,
  evaluateSlot4Promotion,
  getF1SessionType,
  getTensionRank,
  type ChaosSetup,
} from "@/lib/chaos-setup";
import { useSvnsMatches, extractSvnsCity, formatSvnsMatchLine, formatSvnsMatchTime, getSvnsTeamFlag, extractSvnsSessionDay, type SvnsMatch } from "@/lib/svns-context";

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
  return <Animated.View style={[styles.liveDot, animStyle]} />;
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

function formatEventDate(startTimeLocal: string): { date: string; time: string } {
  const d = new Date(startTimeLocal);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date: `${month} ${day}`, time };
}

const TENSION_ACCENT_COLORS: Record<string, string> = {
  "High Drama": "#9333EA",
  "Tight Game": "#818CF8",
  "Heating Up": "#A78BFA",
};

function getTensionLabel(tensionRank: number): string | null {
  if (tensionRank >= 4) return "High Drama";
  if (tensionRank === 3) return "Tight Game";
  if (tensionRank === 2) return "Heating Up";
  return null;
}

function getHeroMicroLabel(tensionRank: number, event: SportEvent, now: Date): string | null {
  if (tensionRank >= 3) return "\uD83D\uDD25 High Tension";
  const startMs = new Date(event.startTimeLocal).getTime();
  const minsUntil = (startMs - now.getTime()) / 60000;
  if (minsUntil > 0 && minsUntil <= 45) return "\u23F3 Starting Soon";
  return null;
}

const F1_DRIVER_CONSTRUCTORS: Record<string, string> = {
  "Max Verstappen": "Red Bull Racing", "Sergio Perez": "Red Bull Racing",
  "Lewis Hamilton": "Ferrari", "Charles Leclerc": "Ferrari",
  "Lando Norris": "McLaren", "Oscar Piastri": "McLaren",
  "Carlos Sainz": "Williams", "Alexander Albon": "Williams",
  "George Russell": "Mercedes", "Andrea Kimi Antonelli": "Mercedes",
  "Fernando Alonso": "Aston Martin", "Lance Stroll": "Aston Martin",
  "Pierre Gasly": "Alpine", "Jack Doohan": "Alpine",
  "Yuki Tsunoda": "Racing Bulls", "Isack Hadjar": "Racing Bulls",
  "Nico Hulkenberg": "Sauber", "Gabriel Bortoleto": "Sauber",
  "Esteban Ocon": "Haas", "Oliver Bearman": "Haas",
  "Liam Lawson": "Red Bull Racing",
};

const CONSTRUCTOR_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6", "Ferrari": "#E8002D", "McLaren": "#FF8000",
  "Mercedes": "#27F4D2", "Aston Martin": "#229971", "Alpine": "#FF87BC",
  "Williams": "#64C4FF", "Racing Bulls": "#6692FF", "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

function getConstructorForDriver(driverName: string): string | undefined {
  return F1_DRIVER_CONSTRUCTORS[driverName];
}

function shortenGpName(gpName: string): string {
  return gpName
    .replace(/\s*Grand\s*Prix$/i, " GP")
    .replace(/\s*Gran\s*Premio$/i, " GP")
    .trim();
}

function ChaosCardSvnsRow({ match, small }: { match: SvnsMatch; small?: boolean }) {
  const isMatchLive = match.status.startsWith("L");
  const isCompleted = match.status === "C";
  const genderLabel = match.gender === "womens" ? "W" : "M";
  const timeStr = formatSvnsMatchTime(match);
  const hasScore = isMatchLive || isCompleted;
  const prefix = isMatchLive ? "NOW" : isCompleted ? "LAST" : "NEXT";
  const flag1 = getSvnsTeamFlag(match.team1Abbr);
  const flag2 = getSvnsTeamFlag(match.team2Abbr);

  return (
    <View style={chaosSvnsStyles.row}>
      <Text style={[chaosSvnsStyles.teams, small && { fontSize: 14 }]} numberOfLines={1}>
        {flag1} {match.team1Abbr} {hasScore ? `${match.team1Score}–${match.team2Score}` : "vs"} {match.team2Abbr} {flag2}
      </Text>
    </View>
  );
}

const chaosSvnsStyles = StyleSheet.create({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 6,
  },
  prefix: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  prefixLive: {
    color: "#FF3B30",
  },
  gender: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  teams: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  phase: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});

function SpikeBorderAccent({ color, secondary }: { color: string; secondary?: boolean }) {
  const topOffset = secondary ? 6 : 8;
  const bottomOffset = secondary ? 6 : 8;
  return (
    <View style={{ position: "absolute", left: 0, top: topOffset, bottom: bottomOffset, width: 18 }}>
      <Svg width="100%" height="100%" viewBox="0 0 18 100" preserveAspectRatio="none">
        <Path
          d="M 0 0 L 3 0 L 3 38 L 3.5 40 L 5 43 L 3 47 L 15 50 L 3 53 L 5 57 L 3.5 60 L 3 62 L 3 100 L 0 100 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function ChaosCard({
  event,
  isPrimary,
  now,
  score,
  favorites,
  tensionRank = 0,
}: {
  event: SportEvent;
  isPrimary: boolean;
  now: Date;
  score?: ScoreData;
  favorites: Favorites;
  tensionRank?: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - PAGE_PADDING * 2;
  const sportColor = getSportColor(event.sport);
  const { gameState, displayClockText, displayStatusText } = normalizeGameState(event, score, now);
  const { date, time } = formatEventDate(event.startTimeLocal);
  const hasScore = !!score;
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const isLiveState = gameState === "LIVE";
  const isFinalState = gameState === "FINAL";
  const tensionLabel = getTensionLabel(tensionRank);
  const tensionAccentColor = tensionLabel ? TENSION_ACCENT_COLORS[tensionLabel] : null;
  const awayIsFav = isTeamFavorite(event.awayTeam, event.sport, favorites);
  const homeIsFav = isTeamFavorite(event.homeTeam, event.sport, favorites);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  const isRacing = event.sport === "racing";
  const isGolf = event.sport === "golf";
  const isSvnsSession = event.eventType === "session" && event.leagueKey === "svns";
  const svnsCity = isSvnsSession ? extractSvnsCity(event.homeTeam) : null;
  const svnsData = useSvnsMatches(svnsCity);
  const svnsDisplayMatch: SvnsMatch | null = svnsData?.liveMatch || svnsData?.nextMatch || svnsData?.lastCompletedMatch || null;

  const svnsSessionLabel = isSvnsSession && event.sessionTitle ? extractSvnsSessionDay(event.sessionTitle) : null;
  const svnsGenderFull = svnsDisplayMatch ? (svnsDisplayMatch.gender === "womens" ? "Women's" : "Men's") : null;
  const svnsPhase = svnsDisplayMatch?.phase || null;
  const matchupText = isSvnsSession && svnsDisplayMatch && svnsGenderFull
    ? svnsGenderFull + (svnsPhase ? ` | ${svnsPhase}` : "")
    : event.eventType === "session" && event.sessionTitle && !isRacing
    ? event.sessionTitle
    : (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel
      ? event.t20WcMatchLabel
      : event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound
        ? event.olympicRound
        : null;

  const racingSessionType = isRacing ? getF1SessionType(event) : "";
  const gpName = event.competitionName || event.homeTeam || "";
  const gpShort = isRacing ? shortenGpName(gpName) : "";
  const gpFlag = isRacing ? getGrandPrixFlag(gpName) : null;

  const leaderName = score?.racingLeader;
  const leaderFlag = getDriverFlag(score?.racingLeaderCountry);
  const leaderPos = score?.racingLeaderPosition;
  const lapNum = score?.racingLapNum;
  const totalLaps = score?.racingTotalLaps;
  const racingStatus = score?.racingStatus;
  const leaderTeam = score?.racingLeaderTeam || (leaderName ? getConstructorForDriver(leaderName) : undefined);

  const racingLeaderLine = leaderName
    ? `${leaderPos ? `P${leaderPos} ` : ""}${leaderFlag ? `${leaderFlag} ` : ""}${leaderName}`
    : null;

  const racingLapLine = lapNum && totalLaps
    ? `Lap ${lapNum} / ${totalLaps}`
    : lapNum
      ? `Lap ${lapNum}`
      : null;

  const racingFooterText = isLiveState
    ? (racingLapLine || racingStatus || "In Progress")
    : isFinalState
      ? "Final"
      : null;

  const racingWinnerLine = isFinalState && leaderName
    ? `Winner: ${leaderFlag ? `${leaderFlag} ` : ""}${leaderName}`
    : null;

  const isQualifying = racingSessionType === "qualifying" || racingSessionType === "sprint qualifying";
  const qualifyingPhaseText = isQualifying && score?.period
    ? score.period
    : null;

  const golfLeaderName = isGolf ? (score?.golfLeader || null) : null;
  const golfLeaderScore = isGolf ? (score?.golfLeaderScore || null) : null;
  const golfLeaderFlag = isGolf && score?.golfLeaderCountry ? getDriverFlag(score.golfLeaderCountry) : null;
  const golfLeaderThru = isGolf ? (score?.golfLeaderThru || null) : null;

  // Strip tournament name prefix from golf session titles e.g. "Players — Round 3" → "Round 3"
  const golfSessionDisplayText = isGolf && matchupText
    ? (matchupText.includes(" \u2014 ") ? matchupText.split(" \u2014 ").slice(1).join(" \u2014 ") : matchupText)
    : matchupText;

  if (isPrimary) {
    const microLabel = getHeroMicroLabel(tensionRank, event, now);
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.primaryCard,
          isFinalState && styles.cardCompletedOpacity,
          { width: cardWidth, opacity: pressed ? 0.9 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Animated.View style={[{ flex: 1 }, flashStyle]}>
          <LinearGradient
            colors={["rgba(129,140,248,0.12)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryInner}
          >
            {tensionRank >= 4
              ? <SpikeBorderAccent color={tensionAccentColor ?? "rgba(129,140,248,0.25)"} />
              : <View style={[styles.tensionAccent, { backgroundColor: tensionAccentColor ?? "rgba(129,140,248,0.25)" }]} />
            }
            <View style={styles.primaryHeader}>
              <View style={[styles.leaguePill, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[styles.leaguePillText, { color: sportColor }]} numberOfLines={1}>
                  {isRacing
                    ? `F1${gpShort ? ` · ${gpShort}` : ""}`
                    : isSvnsSession && svnsCity
                    ? `${svnsCity} SVNS${svnsSessionLabel ? ` ${svnsSessionLabel}` : ""}`
                    : event.isIccT20Wc ? "T20 World Cup" : event.isOlympic ? "Olympics" : event.tournamentName || event.league}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              {isLiveState && (
                <View style={styles.liveChip}>
                  <LiveDot />
                  <Text style={styles.liveText}>{microLabel ? "HIGH TENSION" : "LIVE"}</Text>
                </View>
              )}
              {isFinalState && (
                <Text style={styles.finalLabel}>FINAL</Text>
              )}
            </View>

            {isRacing ? (
              <View style={styles.primaryTeams}>
                {isLiveState && racingLeaderLine ? (
                  <View style={styles.racingLeaderRow}>
                    <Text style={styles.racingLeaderText}>{racingLeaderLine}</Text>
                    {leaderTeam ? (
                      <View style={styles.racingConstructorRow}>
                        <View style={[styles.racingConstructorDot, { backgroundColor: CONSTRUCTOR_COLORS[leaderTeam] || sportColor }]} />
                        <Text style={styles.racingLeaderTeam}>{leaderTeam}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : isLiveState && isQualifying && qualifyingPhaseText ? (
                  <Text style={styles.racingQualifyingPhase}>{qualifyingPhaseText}</Text>
                ) : isFinalState && racingWinnerLine ? (
                  <View style={styles.racingLeaderRow}>
                    <Text style={styles.racingLeaderText}>{racingWinnerLine}</Text>
                    {leaderTeam ? (
                      <View style={styles.racingConstructorRow}>
                        <View style={[styles.racingConstructorDot, { backgroundColor: CONSTRUCTOR_COLORS[leaderTeam] || sportColor }]} />
                        <Text style={styles.racingLeaderTeam}>{leaderTeam}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : matchupText ? (
              <View style={isSvnsSession ? styles.svnsPrimaryContent : undefined}>
                <Text style={[styles.primaryMatchup, (isSvnsSession || (isGolf && golfLeaderName)) && { marginBottom: 4 }]} numberOfLines={2}>{golfSessionDisplayText}</Text>
                {isSvnsSession && svnsDisplayMatch && (
                  <ChaosCardSvnsRow match={svnsDisplayMatch} />
                )}
                {isGolf && golfLeaderName && (
                  <View style={styles.golfLeaderRow}>
                    <Text style={styles.golfLeaderText}>
                      {golfLeaderFlag ? `${golfLeaderFlag} ` : ""}{golfLeaderName}
                    </Text>
                    <View style={styles.golfLeaderScoreBlock}>
                      {golfLeaderScore ? (
                        <Text style={styles.golfLeaderScore}>{golfLeaderScore}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            ) : event.sport === "tennis" ? (
              <View style={styles.primaryTeams}>
                <TennisScoreboard
                  event={event}
                  score={score}
                  isLive={isLiveState}
                  isFinal={isFinalState}
                  featured
                  scoreColor="#A78BFA"
                />
              </View>
            ) : (
              <View style={styles.primaryTeams}>
                <View style={styles.primaryTeamRow}>
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={28} />
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={[styles.heroTeamName, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>
                      {displayTeamName(event.awayTeam, event.league)}
                    </Text>
                    {awayIsFav && <MaterialCommunityIcons name="star" size={19} color={Colors.favStar} />}
                  </View>
                  {hasScore && (
                    <Text style={[styles.primaryScore, isLiveState && styles.scoreLive]}>
                      {event.sport === "cricket" ? (score.cricketAway || "") : score.awayScore}
                    </Text>
                  )}
                </View>
                <View style={styles.primaryTeamRow}>
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={28} />
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={[styles.heroTeamName, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>
                      {displayTeamName(event.homeTeam, event.league)}
                    </Text>
                    {homeIsFav && <MaterialCommunityIcons name="star" size={19} color={Colors.favStar} />}
                  </View>
                  {hasScore && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.primaryScore, isLiveState && styles.scoreLive]}>
                        {event.sport === "cricket" ? (score.cricketHome || "") : score.homeScore}
                      </Text>
                      {isLiveState && !isGolf && displayClockText && !displayClockText.startsWith("Started") && (
                        <LiveScanBar color="#818CF8" />
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.primaryFooter}>
              {isLiveState && <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={22} />}
              <View style={styles.primaryTimeRow}>
                {isSvnsSession && svnsDisplayMatch ? (
                  <Text style={styles.primaryClock}>
                    {svnsDisplayMatch.status.startsWith("L") ? "Live now" : svnsDisplayMatch.status === "C" ? "Last match" : `Next match @ ${formatSvnsMatchTime(svnsDisplayMatch)}`}
                  </Text>
                ) : isRacing && racingFooterText ? (
                  <Text style={[styles.primaryClock, isFinalState && styles.primaryFinalStatus]}>{racingFooterText}</Text>
                ) : isGolf && isLiveState && golfLeaderThru ? (
                  <Text style={styles.primaryClock}>{golfLeaderThru}</Text>
                ) : isLiveState && !isGolf && displayClockText ? (
                  <Text style={styles.primaryClock}>{displayClockText}</Text>
                ) : isFinalState && displayStatusText ? (
                  <Text style={styles.primaryFinalStatus}>{displayStatusText}</Text>
                ) : gameState === "UPCOMING" ? (
                  <Text style={styles.primaryTime}>{date} {"\u00B7"} {time}</Text>
                ) : null}
              </View>
              {!isLiveState && <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={22} />}
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.secondaryCard,
        { opacity: pressed ? 0.9 : isFinalState ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Animated.View style={[styles.secondaryInner, flashStyle]}>
        {tensionRank >= 4
          ? <SpikeBorderAccent color={tensionAccentColor ?? "rgba(129,140,248,0.2)"} secondary />
          : <View style={[styles.tensionAccentSecondary, { backgroundColor: tensionAccentColor ?? "rgba(129,140,248,0.2)" }]} />
        }
        <View style={styles.secondaryHeader}>
          <View style={[styles.leaguePill, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
            <Text style={[styles.leaguePillText, { color: sportColor }]} numberOfLines={1}>
              {isRacing
                ? `F1${gpShort ? ` · ${gpShort}` : ""}`
                : isSvnsSession && svnsCity
                ? `${svnsCity} SVNS${svnsSessionLabel ? ` ${svnsSessionLabel}` : ""}`
                : event.isIccT20Wc ? "T20 WC" : event.isOlympic ? "Olympics" : event.tournamentName || event.league}
            </Text>
          </View>
          {isLiveState && (
            <View style={styles.liveChipSmall}>
              <LiveDot />
              <Text style={styles.liveTextSmall}>{tensionRank >= 3 ? "HIGH TENSION" : "LIVE"}</Text>
            </View>
          )}
          {isFinalState && (
            <Text style={styles.finalLabelSmall}>FINAL</Text>
          )}
        </View>

        {isRacing ? (
          <View style={styles.secondaryTeams}>
            {isLiveState && racingLeaderLine ? (
              <>
                <Text style={styles.racingLeaderTextSm} numberOfLines={1}>{racingLeaderLine}</Text>
                {leaderTeam ? (
                  <View style={styles.racingConstructorRowSm}>
                    <View style={[styles.racingConstructorDotSm, { backgroundColor: CONSTRUCTOR_COLORS[leaderTeam] || sportColor }]} />
                    <Text style={styles.racingLeaderTeamSm}>{leaderTeam}</Text>
                  </View>
                ) : null}
              </>
            ) : isLiveState && isQualifying && qualifyingPhaseText ? (
              <Text style={styles.racingQualifyingPhaseSm}>{qualifyingPhaseText}</Text>
            ) : isFinalState && racingWinnerLine ? (
              <>
                <Text style={styles.racingLeaderTextSm} numberOfLines={1}>{racingWinnerLine}</Text>
                {leaderTeam ? (
                  <View style={styles.racingConstructorRowSm}>
                    <View style={[styles.racingConstructorDotSm, { backgroundColor: CONSTRUCTOR_COLORS[leaderTeam] || sportColor }]} />
                    <Text style={styles.racingLeaderTeamSm}>{leaderTeam}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : matchupText ? (
          <View style={(isSvnsSession || isGolf) ? styles.svnsSecondaryContent : undefined}>
            <Text style={[styles.secondaryTeamName, (isSvnsSession || (isGolf && golfLeaderName)) && { marginBottom: 2 }]} numberOfLines={2}>{golfSessionDisplayText}</Text>
            {isSvnsSession && svnsDisplayMatch && (
              <ChaosCardSvnsRow match={svnsDisplayMatch} small />
            )}
            {isGolf && golfLeaderName && (
              <View style={styles.golfLeaderRowSm}>
                <Text style={styles.golfLeaderTextSm} numberOfLines={1}>
                  {golfLeaderFlag ? `${golfLeaderFlag} ` : ""}{golfLeaderName}
                </Text>
                <View style={styles.golfLeaderScoreBlockSm}>
                  {golfLeaderScore ? (
                    <Text style={styles.golfLeaderScoreSm}>{golfLeaderScore}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        ) : event.sport === "tennis" ? (
          <View style={styles.secondaryTeams}>
            <TennisScoreboard
              event={event}
              score={score}
              isLive={isLiveState}
              isFinal={isFinalState}
              scoreColor="#A78BFA"
            />
          </View>
        ) : (
          <View style={styles.secondaryTeams}>
            <View style={styles.secondaryTeamRow}>
              <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={18} />
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[styles.secondaryTeamName, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>
                  {displayTeamName(event.awayTeam, event.league)}
                </Text>
                {awayIsFav && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
              </View>
              {hasScore && (
                <Text style={[styles.secondaryScore, isLiveState && styles.scoreLive]}>
                  {event.sport === "cricket" ? (score.cricketAway || "") : score.awayScore}
                </Text>
              )}
            </View>
            <View style={styles.secondaryTeamRow}>
              <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={18} />
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[styles.secondaryTeamName, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>
                  {displayTeamName(event.homeTeam, event.league)}
                </Text>
                {homeIsFav && <MaterialCommunityIcons name="star" size={13} color={Colors.favStar} />}
              </View>
              {hasScore && (
                <Text style={[styles.secondaryScore, isLiveState && styles.scoreLive]}>
                  {event.sport === "cricket" ? (score.cricketHome || "") : score.homeScore}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.secondaryFooter}>
          {isLiveState && (
            <View style={{ opacity: 0.9 }}>
              <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={18} />
            </View>
          )}
          {isSvnsSession && svnsDisplayMatch ? (
            <Text style={styles.secondaryClock} numberOfLines={1}>
              {svnsDisplayMatch.status.startsWith("L") ? "Live now" : svnsDisplayMatch.status === "C" ? "Last match" : `Next @ ${formatSvnsMatchTime(svnsDisplayMatch)}`}
            </Text>
          ) : isRacing && racingFooterText ? (
            <Text style={[styles.secondaryClock, isFinalState && styles.secondaryFinal]} numberOfLines={1}>{racingFooterText}</Text>
          ) : isGolf && isLiveState && golfLeaderThru ? (
            <Text style={styles.secondaryClock} numberOfLines={1}>{golfLeaderThru}</Text>
          ) : isLiveState && !isGolf && displayClockText ? (
            <Text style={styles.secondaryClock} numberOfLines={1}>{displayClockText}</Text>
          ) : isFinalState && displayStatusText ? (
            <Text style={styles.secondaryFinal} numberOfLines={1}>{displayStatusText}</Text>
          ) : gameState === "UPCOMING" ? (
            <Text style={styles.secondaryTime} numberOfLines={1}>{time}</Text>
          ) : null}
          {!isLiveState && (
            <View style={{ opacity: 0.9 }}>
              <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={18} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const TILE_GAP = 14;
const PAGE_PADDING = 16;

function SheenBorderOverlay({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withRepeat(
          withSequence(
            withTiming(0.35, { duration: 380 }),
            withTiming(1, { duration: 380 })
          ),
          6,
          false
        ),
        withTiming(0, { duration: 400 })
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { borderRadius: 16, borderWidth: 2, borderColor: "#A78BFA" },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
}

function SecondaryCarousel({
  events,
  now,
  getScore,
  favorites,
  chaosDebugRanks,
  promotedEventId,
}: {
  events: SportEvent[];
  now: Date;
  getScore: (id: string) => any;
  favorites: any;
  chaosDebugRanks?: { id: string; emotion: number; tension: number; sportPri: number; isLive: boolean; isFav: boolean; isAnchor: boolean; isBackfill: boolean; hockeyChaosTotal?: number; hockeyChaosReasons?: string[] }[];
  promotedEventId?: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - PAGE_PADDING * 2;
  const tileWidth = events.length === 1
    ? contentWidth
    : Math.round(contentWidth * 0.82);
  const snapInterval = tileWidth + TILE_GAP;

  const [sheenEventId, setSheenEventId] = useState<string | undefined>(undefined);
  const prevPromotedIdRef = useRef<string | undefined>(undefined);
  const sheenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (promotedEventId && promotedEventId !== prevPromotedIdRef.current) {
      prevPromotedIdRef.current = promotedEventId;
      setSheenEventId(promotedEventId);
      if (sheenTimerRef.current) clearTimeout(sheenTimerRef.current);
      sheenTimerRef.current = setTimeout(() => {
        setSheenEventId(undefined);
        sheenTimerRef.current = null;
      }, 5200);
    }
    return () => {
      if (sheenTimerRef.current) clearTimeout(sheenTimerRef.current);
    };
  }, [promotedEventId]);

  const orderedEvents = useMemo(() => {
    if (!promotedEventId) return events;
    const idx = events.findIndex((e) => e.id === promotedEventId);
    if (idx <= 0) return events;
    const promoted = events[idx];
    return [promoted, ...events.slice(0, idx), ...events.slice(idx + 1)];
  }, [events, promotedEventId]);

  const renderTile = useCallback(({ item }: { item: SportEvent }) => {
    const showSheen = item.id === sheenEventId;
    return (
      <View style={{ width: tileWidth, marginRight: TILE_GAP }}>
        <View style={{ position: "relative" }}>
          <ChaosCard
            event={item}
            isPrimary={false}
            now={now}
            score={getScore(item.id)}
            favorites={favorites}
            tensionRank={chaosDebugRanks?.find(r => r.id === item.id)?.tension ?? 0}
          />
          <SheenBorderOverlay visible={showSheen} />
        </View>
      </View>
    );
  }, [tileWidth, now, getScore, favorites, chaosDebugRanks, sheenEventId]);

  return (
    <FlatList
      data={orderedEvents}
      keyExtractor={(item) => item.id}
      renderItem={renderTile}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: PAGE_PADDING }}
      style={{ marginHorizontal: -PAGE_PADDING, paddingLeft: PAGE_PADDING }}
      snapToInterval={events.length > 1 ? snapInterval : undefined}
      decelerationRate={events.length > 1 ? "fast" : undefined}
      scrollEnabled={events.length > 1}
    />
  );
}

function SkeletonBar({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const opacity = useSharedValue(0.3);
  React.useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: 8, backgroundColor: "#3A3A3C" },
        animStyle,
        style,
      ]}
    />
  );
}

function ChaosSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.titleRow}>
        <SkeletonBar width={20} height={20} style={{ borderRadius: 10 }} />
        <SkeletonBar width={120} height={18} />
      </View>
      <View style={skeletonStyles.primaryCard}>
        <View style={skeletonStyles.cardHeader}>
          <SkeletonBar width={60} height={14} />
          <SkeletonBar width={100} height={14} />
        </View>
        <View style={skeletonStyles.teamRow}>
          <SkeletonBar width={28} height={28} style={{ borderRadius: 14 }} />
          <SkeletonBar width={140} height={18} />
        </View>
        <View style={skeletonStyles.teamRow}>
          <SkeletonBar width={28} height={28} style={{ borderRadius: 14 }} />
          <SkeletonBar width={120} height={18} />
        </View>
        <View style={skeletonStyles.timeRow}>
          <SkeletonBar width={80} height={14} />
          <SkeletonBar width={90} height={14} />
        </View>
      </View>
      <View style={skeletonStyles.secondaryRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={skeletonStyles.secondaryCard}>
            <SkeletonBar width={50} height={12} />
            <SkeletonBar width={"80%"} height={14} style={{ marginTop: 8 }} />
            <SkeletonBar width={"60%"} height={14} style={{ marginTop: 6 }} />
            <SkeletonBar width={60} height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  primaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
});

export default function WatchScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { allEvents: rawEvents, favoritesOnly, isLoading: eventsLoading } = useEvents();
  const { getScore, scores } = useScores();
  const { favorites, disabledSports, disabledLeagues } = useFavorites();
  const { data: narrativesData } = useQuery<{ cards: unknown[] }>({ queryKey: ["/api/narratives"] });
  const ritualCount = RITUALS.length;
  const storiesCount = narrativesData?.cards?.length ?? 0;
  const activeSportsCount = 9 - disabledSports.size;

  const allEvents = useMemo(
    () => {
      let filtered = rawEvents;
      if (disabledSports.size > 0) {
        filtered = filtered.filter((e) => !disabledSports.has(e.sport.toLowerCase()));
      }
      if (disabledLeagues.size > 0) {
        filtered = filtered.filter((e) => !disabledLeagues.has(`${e.sport}::${e.league}`));
      }
      return filtered;
    },
    [rawEvents, disabledSports, disabledLeagues]
  );

  const [now, setNow] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [chaosSetup, setChaosSetup] = useState<ChaosSetup | null>(null);
  const chaosRef = useRef<ChaosSetup | null>(null);
  const prevScoresRef = useRef<Record<string, ScoreData>>({});
  const [promotionToast, setPromotionToast] = useState<{ reason: string; scoringTeam?: string; ppStartTeam?: string; ppGoalTeam?: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveBannerActive, setLiveBannerActive] = useState(false);
  const [upNextBannerActive, setUpNextBannerActive] = useState(false);
  const stickyHeightRef = useRef(0);
  const [stickyTopHeight, setStickyTopHeight] = useState(0);
  const liveSectionYRef = useRef(999999);
  const upNextSectionYRef = useRef(999999);
  const upNextChipOffsetRef = useRef(999999);
  const [upNextChipSticky, setUpNextChipSticky] = useState(false);

  const getScoreStatus = useCallback(
    (id: string) => getScore(id)?.status,
    [scores]
  );

  const getScoreData = useCallback(
    (id: string) => getScore(id),
    [scores]
  );

  const rebuildChaos = useCallback((forNow?: Date) => {
    const t = forNow ?? new Date();
    const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus, getScoreData);
    setChaosSetup(setup);
    chaosRef.current = setup;
  }, [allEvents, favorites, getScoreStatus, getScoreData]);

  const eventFingerprint = useMemo(() => {
    if (allEvents.length === 0) return "";
    const sample = allEvents.slice(0, 5).map(e => e.id).join("|");
    return `${allEvents.length}:${sample}`;
  }, [allEvents]);

  const prevFingerprintRef = useRef("");
  useEffect(() => {
    if (allEvents.length === 0) return;
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = eventFingerprint;
    if (chaosRef.current && prev === eventFingerprint) return;
    const t = new Date();
    const setup = buildChaosSetup(allEvents, favorites, t, getScoreStatus, getScoreData);
    setChaosSetup(setup);
    chaosRef.current = setup;
  }, [eventFingerprint, favorites, getScoreStatus, getScoreData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chaosRef.current) return;
    const current = chaosRef.current;

    const healed = selfHealChaosSetup(current, allEvents, favorites, now, getScoreStatus, getScoreData);
    if (healed) {
      setChaosSetup(healed);
      chaosRef.current = healed;
    }
  }, [now, scores]);

  useEffect(() => {
    if (!chaosRef.current) return;
    const current = chaosRef.current;

    const promoted = evaluateSlot4Promotion(
      current,
      allEvents,
      now,
      getScoreStatus,
      getScoreData,
      prevScoresRef.current,
    );
    if (promoted && promoted.promotedEventId) {
      setChaosSetup(promoted);
      chaosRef.current = promoted;

      const promotedEvent = promoted.secondary.find(
        (e) => e.id === promoted.promotedEventId,
      );
      if (promotedEvent) {
        const reason = promoted.promotionReason || "Live momentum spike";
        const currentScoreData = getScoreData(promotedEvent.id);
        const prevScoreData = prevScoresRef.current[promotedEvent.id];
        let scoringTeam: string | undefined;
        if (currentScoreData && prevScoreData) {
          const homeScored = (currentScoreData.homeScore ?? 0) > (prevScoreData.homeScore ?? 0);
          const awayScored = (currentScoreData.awayScore ?? 0) > (prevScoreData.awayScore ?? 0);
          if (homeScored) scoringTeam = promotedEvent.homeTeam;
          else if (awayScored) scoringTeam = promotedEvent.awayTeam;
        }
        // PP start: derive the advantaged team from live situationCode
        let ppStartTeam: string | undefined;
        if (promoted.slot4ActivitySignals?.includes("Power play start") && currentScoreData?.situationCode?.length === 4) {
          const awaySkaters = parseInt(currentScoreData.situationCode[1], 10);
          const homeSkaters = parseInt(currentScoreData.situationCode[2], 10);
          if (!isNaN(awaySkaters) && !isNaN(homeSkaters) && awaySkaters !== homeSkaters) {
            ppStartTeam = awaySkaters > homeSkaters ? promotedEvent.awayTeam : promotedEvent.homeTeam;
          }
        }

        // PP goal: team is whichever side just scored (already computed as scoringTeam)
        const ppGoalTeam = promoted.slot4ActivitySignals?.includes("Power play goal") ? scoringTeam : undefined;

        setPromotionToast({ reason, scoringTeam, ppStartTeam, ppGoalTeam });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setPromotionToast(null);
          toastTimerRef.current = null;
        }, 6000);
      }
    }

    prevScoresRef.current = { ...scores };
  }, [scores]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleRebuild = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const t = new Date();
    setNow(t);
    rebuildChaos(t);
  }, [rebuildChaos]);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const t = new Date();
    setNow(t);
    rebuildChaos(t);
    setTimeout(() => setRefreshing(false), 500);
  }, [rebuildChaos]);

  const liveEvents = useMemo(() => {
    const timeLive = getLiveEventsNow(allEvents, now).filter((e) => {
      const score = getScore(e.id);
      if (!score) return true;
      const { gameState } = normalizeGameState(e, score, now);
      return gameState !== "FINAL";
    });
    const timeLiveIds = new Set(timeLive.map((e) => e.id));
    const scoreLive = allEvents.filter((e) => {
      if (timeLiveIds.has(e.id)) return false;
      // Don't trust score API's "live" status if the event is past its expected duration
      if (isEventCompleted(e, now)) return false;
      const s = getScore(e.id);
      return s && s.status === "live";
    });
    const live = [...timeLive, ...scoreLive];
    const filtered = favoritesOnly ? live.filter((e) => favoriteInvolved(e, favorites)) : live;
    return [...filtered].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
      const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [allEvents, now, favoritesOnly, favorites, getScore]);

  const [upNextSportFilter, setUpNextSportFilter] = useState<string | null>(null);
  const [upNextLeagueFilter, setUpNextLeagueFilter] = useState<string | null>(null);

  const upNextAll = useMemo(() => {
    const upcoming = getUpNextEvents(allEvents, now);
    const notFinal = upcoming.filter((e) => {
      const score = getScore(e.id);
      if (!score) return true;
      const { gameState } = normalizeGameState(e, score, now);
      return gameState !== "FINAL";
    });
    const filtered = favoritesOnly ? notFinal.filter((e) => favoriteInvolved(e, favorites)) : notFinal;
    return [...filtered].sort(
      (a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime()
    );
  }, [allEvents, now, favoritesOnly, favorites, getScore]);

  const { upNextSportChips, upNextLeagueChips, upNextEvents, upNextLeagueSportMap, upNextHasFilter } = useMemo(() => {
    const sports = new Map<string, number>();
    const leagues = new Map<string, number>();
    const lsMap = new Map<string, string>();
    for (const e of upNextAll) {
      sports.set(e.sport, (sports.get(e.sport) || 0) + 1);
      leagues.set(e.league, (leagues.get(e.league) || 0) + 1);
      if (!lsMap.has(e.league)) lsMap.set(e.league, e.sport);
    }
    const sChips = Array.from(sports.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sport, count]) => ({ key: sport, label: sport.charAt(0).toUpperCase() + sport.slice(1), count }));
    const lChips = Array.from(leagues.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([league, count]) => ({ key: league, label: league, count }));

    let events = upNextAll;
    if (upNextSportFilter) {
      events = events.filter((e) => e.sport === upNextSportFilter);
    }
    if (upNextLeagueFilter) {
      events = events.filter((e) => e.league === upNextLeagueFilter);
    }
    const hasFilter = upNextSportFilter !== null || upNextLeagueFilter !== null;
    return { upNextSportChips: sChips, upNextLeagueChips: lChips, upNextEvents: events, upNextLeagueSportMap: lsMap, upNextHasFilter: hasFilter };
  }, [upNextAll, upNextSportFilter, upNextLeagueFilter]);

  const showUpNextSportChips = upNextSportChips.length > 1;
  const showUpNextLeagueChips = upNextLeagueChips.length > 1;

  const upNextDayGroups = useMemo(() => {
    const groups: { label: string; key: string; events: SportEvent[] }[] = [];
    const dayMap = new Map<string, SportEvent[]>();
    const dayLabels = new Map<string, string>();
    for (const event of upNextEvents) {
      const d = new Date(event.startTimeLocal);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dayMap.has(key)) {
        dayMap.set(key, []);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dayLabels.set(key, `${dayNames[d.getDay()]} · ${monthNames[d.getMonth()]} ${d.getDate()}`);
      }
      dayMap.get(key)!.push(event);
    }
    const sortedKeys = [...dayMap.keys()].sort();
    for (const key of sortedKeys) {
      groups.push({ label: dayLabels.get(key)!, key, events: dayMap.get(key)! });
    }
    return groups;
  }, [upNextEvents]);

  const UP_NEXT_INITIAL_LIMIT = 5;
  const [upNextExpanded, setUpNextExpanded] = useState(false);

  const { visibleDayGroups, upNextHiddenCount } = useMemo(() => {
    const totalEvents = upNextEvents.length;
    if (upNextExpanded || totalEvents <= UP_NEXT_INITIAL_LIMIT) {
      return { visibleDayGroups: upNextDayGroups, upNextHiddenCount: 0 };
    }
    let remaining = UP_NEXT_INITIAL_LIMIT;
    const truncated: typeof upNextDayGroups = [];
    for (const group of upNextDayGroups) {
      if (remaining <= 0) break;
      if (group.events.length <= remaining) {
        truncated.push(group);
        remaining -= group.events.length;
      } else {
        truncated.push({ ...group, events: group.events.slice(0, remaining) });
        remaining = 0;
      }
    }
    return { visibleDayGroups: truncated, upNextHiddenCount: totalEvents - UP_NEXT_INITIAL_LIMIT };
  }, [upNextDayGroups, upNextExpanded, upNextEvents.length]);

  useEffect(() => {
    if (!__DEV__) return;
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const perDay: Record<string, number> = {};
    for (const g of upNextDayGroups) {
      perDay[g.label] = g.events.length;
    }
    console.log(
      `[UP NEXT] now=${now.toISOString()} windowEnd=${windowEnd.toISOString()} count=${upNextEvents.length} days=${JSON.stringify(perDay)}`
    );
  }, [upNextEvents, upNextDayGroups, now]);

  const chaosIds = useMemo(() => {
    if (!chaosSetup) return new Set<string>();
    const ids = new Set<string>();
    if (chaosSetup.primary) ids.add(chaosSetup.primary.id);
    for (const e of chaosSetup.secondary) ids.add(e.id);
    return ids;
  }, [chaosSetup]);

  const filteredLive = useMemo(
    () => liveEvents.filter((e) => !chaosIds.has(e.id)),
    [liveEvents, chaosIds]
  );

  const SPORT_PRIORITY: Record<string, number> = { rugby: 0, cricket: 1, hockey: 2, basketball: 3, soccer: 4, tennis: 5 };

  const sortedLive = useMemo(() => {
    return [...filteredLive].sort((a, b) => {
      const aFav = favoriteInvolved(a, favorites) ? 0 : 1;
      const bFav = favoriteInvolved(b, favorites) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      if (a.sport === "tennis" && b.sport === "tennis") {
        const aScore = getScore(a.id);
        const bScore = getScore(b.id);
        const aHasData = aScore?.tennisSetScores && aScore.tennisSetScores.length > 0 ? 0 : 1;
        const bHasData = bScore?.tennisSetScores && bScore.tennisSetScores.length > 0 ? 0 : 1;
        if (aHasData !== bHasData) return aHasData - bHasData;
        const aRound = getTennisRoundPriority(a.tennisRound || "");
        const bRound = getTennisRoundPriority(b.tennisRound || "");
        if (aRound !== bRound) return bRound - aRound;
        return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
      }
      const aSp = SPORT_PRIORITY[a.sport] ?? 9;
      const bSp = SPORT_PRIORITY[b.sport] ?? 9;
      if (aSp !== bSp) return aSp - bSp;
      return new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime();
    });
  }, [filteredLive, favorites, scores]);

  const [liveExpanded, setLiveExpanded] = useState(false);

  const { visibleLive, hiddenCount } = useMemo(() => {
    if (liveExpanded) return { visibleLive: sortedLive, hiddenCount: 0 };
    const favs = sortedLive.filter((e) => favoriteInvolved(e, favorites));
    const nonFavs = sortedLive.filter((e) => !favoriteInvolved(e, favorites));
    const shown = [...favs, ...nonFavs.slice(0, 6)];
    return { visibleLive: shown, hiddenCount: Math.max(0, sortedLive.length - shown.length) };
  }, [sortedLive, liveExpanded, favorites]);

  const hasChaos = chaosSetup && chaosSetup.primary;

  return (
    <View style={styles.container}>
      {promotionToast && (
        <View
          style={[
            styles.promotionToast,
            { bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 70 },
          ]}
        >
          <LinearGradient
            colors={["#5B21B6", "#7C3AED", "rgba(255,255,255,0.18)", "#7C3AED", "#5B21B6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.promotionToastContent}>
            <View style={styles.promotionToastHeader}>
              <Ionicons name="flash" size={13} color="white" />
              <Text style={styles.promotionToastLabel}>Chaos Alert</Text>
            </View>
            <Text style={styles.promotionToastReason} numberOfLines={1}>
              {promotionToast.ppGoalTeam
                ? `${displayTeamName(promotionToast.ppGoalTeam)} power play goal!`
                : promotionToast.ppStartTeam
                  ? `${displayTeamName(promotionToast.ppStartTeam)} power play start`
                  : promotionToast.scoringTeam
                    ? `${displayTeamName(promotionToast.scoringTeam)} score!`
                    : promotionToast.reason}
            </Text>
          </View>
        </View>
      )}
      <View
        style={[
          styles.stickyTop,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12,
          },
        ]}
        onLayout={(e) => {
          stickyHeightRef.current = e.nativeEvent.layout.height;
          setStickyTopHeight(e.nativeEvent.layout.height);
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={["#7C3AED", "#1CB0F6", "#58CC02"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.brandPill}
            >
              <Ionicons name="pulse" size={14} color="#fff" />
              <Text style={styles.brandPillText}>PULSE</Text>
            </LinearGradient>

            <View style={styles.headerStats}>
              <View style={[styles.statChip, { backgroundColor: "rgba(167,139,250,0.15)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }]}>
                <Ionicons name="layers" size={18} color="#A78BFA" />
                <Text style={[styles.liveStatCount, { color: "#A78BFA" }]}>{activeSportsCount}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: "rgba(53,199,165,0.15)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }]}>
                <Ionicons name="grid" size={18} color="#35C7A5" />
                <Text style={[styles.liveStatCount, { color: "#35C7A5" }]}>{ritualCount}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: "rgba(255,133,200,0.15)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }]}>
                <Ionicons name="compass" size={20} color="#FF85C8" />
                <Text style={styles.nextStatCount}>{storiesCount}</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={16}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="settings-button"
          >
            <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>

        {upNextBannerActive ? (
          <View style={styles.upNextBanner}>
            <View>
              <Text style={styles.chaosBannerLabel}>24-HOUR LOOK AHEAD</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Ionicons name="time-outline" size={22} color="#fff" />
                <Text style={styles.chaosBannerTitle}>Up Next</Text>
              </View>
            </View>
            <View style={styles.upNextCountBadge}>
              <Text style={styles.upNextCountBadgeText}>{upNextAll.length}</Text>
            </View>
          </View>
        ) : sortedLive.length > 0 && liveBannerActive ? (
          <View style={styles.liveBanner}>
            <View>
              <Text style={styles.chaosBannerLabel}>ALSO HAPPENING NOW</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <View style={styles.liveDot} />
                <Text style={styles.chaosBannerTitle}>Live Now</Text>
              </View>
            </View>
            <View style={styles.liveCountBadge}>
              <Text style={styles.liveCountBadgeText}>{sortedLive.length}</Text>
            </View>
          </View>
        ) : hasChaos ? (
          <View style={styles.chaosBanner}>
            <View>
              <Text style={styles.chaosBannerLabel}>WHEN THE PULSE SPIKES</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Ionicons name="flash" size={22} color="#fff" />
                <Text style={styles.chaosBannerTitle}>
                  {chaosSetup.candidateCount > 0 ? "Chaos Mode" : "Next Up"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleRebuild}
              style={({ pressed }) => [
                styles.rebuildButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="shuffle" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}

      </View>

      {upNextChipSticky && (showUpNextSportChips || showUpNextLeagueChips) && (
        <View style={[styles.stickyChipBar, { top: stickyTopHeight }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.upNextChipRow}
          >
            <Pressable
              onPress={() => {
                setUpNextSportFilter(null);
                setUpNextLeagueFilter(null);
                setUpNextExpanded(false);
              }}
              style={[styles.upNextChip, !upNextHasFilter && styles.upNextChipActive]}
            >
              <Text style={[styles.upNextChipLabel, !upNextHasFilter && styles.upNextChipLabelActive]}>All</Text>
            </Pressable>
            {showUpNextSportChips && upNextSportChips.map((sc) => {
              const isActive = upNextSportFilter === sc.key;
              const color = getSportColor(sc.key);
              return (
                <Pressable
                  key={`sticky-sport-${sc.key}`}
                  onPress={() => {
                    setUpNextSportFilter(isActive ? null : sc.key);
                    setUpNextLeagueFilter(null);
                    setUpNextExpanded(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                >
                  <Text style={[styles.upNextChipLabel, isActive && { color }]}>{sc.label}</Text>
                  <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                    <Text style={[styles.upNextChipCountText, isActive && { color }]}>{sc.count}</Text>
                  </View>
                </Pressable>
              );
            })}
            {showUpNextLeagueChips && upNextLeagueChips.map((lc) => {
              const isActive = upNextLeagueFilter === lc.key;
              const color = getSportColor(upNextLeagueSportMap.get(lc.key) || "");
              return (
                <Pressable
                  key={`sticky-league-${lc.key}`}
                  onPress={() => {
                    setUpNextLeagueFilter(isActive ? null : lc.key);
                    setUpNextSportFilter(null);
                    setUpNextExpanded(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                >
                  <Text style={[styles.upNextChipLabel, isActive && { color }]}>{lc.label}</Text>
                  <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                    <Text style={[styles.upNextChipCountText, isActive && { color }]}>{lc.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const liveActive = y >= liveSectionYRef.current;
          const upActive = y >= upNextSectionYRef.current;
          if (liveActive !== liveBannerActive) setLiveBannerActive(liveActive);
          if (upActive !== upNextBannerActive) setUpNextBannerActive(upActive);
          const chipAbsoluteY = upNextSectionYRef.current + upNextChipOffsetRef.current;
          const chipActive = (showUpNextSportChips || showUpNextLeagueChips) && y >= chipAbsoluteY - 10;
          if (chipActive !== upNextChipSticky) setUpNextChipSticky(chipActive);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {hasChaos ? (
          <View style={styles.chaosSection}>
            <ChaosCard
              event={chaosSetup.primary!}
              isPrimary
              now={now}
              score={getScore(chaosSetup.primary!.id)}
              favorites={favorites}
              tensionRank={chaosSetup.debug?.selectedRanks?.find(r => r.id === chaosSetup.primary!.id)?.tension ?? 0}
            />

            {chaosSetup.secondary.length > 0 && (
              <SecondaryCarousel
                events={chaosSetup.secondary}
                now={now}
                getScore={getScore}
                favorites={favorites}
                chaosDebugRanks={chaosSetup.debug?.selectedRanks}
                promotedEventId={chaosSetup.promotedEventId}
              />
            )}
          </View>
        ) : eventsLoading ? (
          <ChaosSkeleton />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No upcoming games</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for live games and upcoming events
            </Text>
          </View>
        )}

        {sortedLive.length > 0 && (
          <View
            style={styles.liveSection}
            onLayout={(e) => { liveSectionYRef.current = e.nativeEvent.layout.y; }}
          >
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveHeaderLine} />
              <Text style={styles.liveHeaderText}>Also happening now</Text>
              <View style={styles.liveHeaderLine} />
            </View>
            {visibleLive.map((event) => (
              <UnifiedEventCard
                key={event.id}
                event={event}
                now={now}
                score={getScore(event.id)}
                isFav={favoriteInvolved(event, favorites)}
                showCountdown={true}
                tensionRank={getTensionRank(event, true, getScore)}
              />
            ))}
            {(hiddenCount > 0 || liveExpanded) && (
              <Pressable
                onPress={() => setLiveExpanded((prev) => !prev)}
                style={({ pressed }) => [
                  styles.expandButton,
                  styles.expandButtonGreen,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.expandButtonText, { color: "#fff" }]}>
                  {liveExpanded ? "Show fewer" : `View all live (${sortedLive.length})`}
                </Text>
                <Ionicons
                  name={liveExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#fff"
                />
              </Pressable>
            )}
          </View>
        )}

        <View
          style={styles.upNextSection}
          onLayout={(e) => { upNextSectionYRef.current = e.nativeEvent.layout.y; }}
        >
          <View style={[styles.liveHeaderRow, { paddingBottom: 10 }]}>
            <View style={styles.liveHeaderLine} />
            <Text style={styles.liveHeaderText}>Coming up next</Text>
            <View style={styles.liveHeaderLine} />
          </View>
          {upNextAll.length > 0 && (showUpNextSportChips || showUpNextLeagueChips) && (
            <View
              style={[styles.upNextChipSection, upNextChipSticky && { opacity: 0 }]}
              onLayout={(e) => { upNextChipOffsetRef.current = e.nativeEvent.layout.y; }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.upNextChipRow}
              >
                <Pressable
                  onPress={() => {
                    setUpNextSportFilter(null);
                    setUpNextLeagueFilter(null);
                    setUpNextExpanded(false);
                  }}
                  style={[styles.upNextChip, !upNextHasFilter && styles.upNextChipActive]}
                  testID="upnext-chip-all"
                >
                  <Text style={[styles.upNextChipLabel, !upNextHasFilter && styles.upNextChipLabelActive]}>All</Text>
                </Pressable>

                {showUpNextSportChips && upNextSportChips.map((sc) => {
                  const isActive = upNextSportFilter === sc.key;
                  const color = getSportColor(sc.key);
                  return (
                    <Pressable
                      key={`sport-${sc.key}`}
                      onPress={() => {
                        setUpNextSportFilter(isActive ? null : sc.key);
                        setUpNextLeagueFilter(null);
                        setUpNextExpanded(false);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                      testID={`upnext-chip-sport-${sc.key}`}
                    >
                      <Text style={[styles.upNextChipLabel, isActive && { color }]}>{sc.label}</Text>
                      <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                        <Text style={[styles.upNextChipCountText, isActive && { color }]}>{sc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}

                {showUpNextLeagueChips && upNextLeagueChips.map((lc) => {
                  const isActive = upNextLeagueFilter === lc.key;
                  const color = getSportColor(upNextLeagueSportMap.get(lc.key) || "");
                  return (
                    <Pressable
                      key={`league-${lc.key}`}
                      onPress={() => {
                        setUpNextLeagueFilter(isActive ? null : lc.key);
                        setUpNextSportFilter(null);
                        setUpNextExpanded(false);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.upNextChip, isActive && { backgroundColor: color + "18", borderColor: color + "44" }]}
                      testID={`upnext-chip-league-${lc.key}`}
                    >
                      <Text style={[styles.upNextChipLabel, isActive && { color }]}>{lc.label}</Text>
                      <View style={[styles.upNextChipCount, isActive && { backgroundColor: color + "18" }]}>
                        <Text style={[styles.upNextChipCountText, isActive && { color }]}>{lc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {upNextEvents.length === 0 && !upNextHasFilter ? (
            <View style={styles.upNextEmpty}>
              <Ionicons name="moon-outline" size={28} color={Colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={styles.upNextEmptyText}>Nothing coming up in the next 24 hours.</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/explore")}
                style={styles.upNextEmptyAction}
              >
                <Text style={styles.upNextEmptyActionText}>Explore narratives</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
              </Pressable>
            </View>
          ) : upNextEvents.length === 0 && upNextHasFilter ? (
            <View style={styles.upNextFilterEmpty}>
              <Ionicons name="filter-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.upNextFilterEmptyText}>No games match this filter</Text>
            </View>
          ) : (
            <>
              {visibleDayGroups.map((group, gi) => (
                <View key={group.key}>
                  <View style={[styles.dayDivider, gi === 0 && { marginTop: 0 }]}>
                    {gi > 0 && <View style={styles.dayDividerLine} />}
                    <Text style={styles.dayDividerText}>{group.label}</Text>
                  </View>
                  {group.events.map((event) => (
                    <UnifiedEventCard
                      key={event.id}
                      event={event}
                      now={now}
                      score={getScore(event.id)}
                      isFav={favoriteInvolved(event, favorites)}
                      showCountdown={true}
                      accentBarColor={Colors.accent}
                      espnLayout={true}
                    />
                  ))}
                </View>
              ))}
              {(upNextHiddenCount > 0 || upNextExpanded) && (
                <Pressable
                  onPress={() => setUpNextExpanded((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.expandButton,
                    styles.expandButtonGreen,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="upnext-more-games"
                >
                  <Text style={[styles.expandButtonText, { color: "#fff" }]}>
                    {upNextExpanded ? "Show fewer" : `More games (${upNextHiddenCount})`}
                  </Text>
                  <Ionicons
                    name={upNextExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#fff"
                  />
                </Pressable>
              )}
            </>
          )}
        </View>

        <View style={styles.footerMeta}>
          <Text style={styles.lastUpdated}>
            Last updated: {formatLastUpdated(now)}
          </Text>
          {favoritesOnly && (
            <View style={styles.favIndicator}>
              <Ionicons name="star" size={12} color={Colors.favStar} />
              <Text style={styles.favIndicatorText}>Favorites only</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stickyTop: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  brandPill: {
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveStatCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FF4B4B",
  },
  nextStatCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FF85C8",
  },
  settingsButton: {
    padding: 6,
    flexShrink: 0,
  },

  chaosSection: {
    marginBottom: 24,
  },
  chaosBanner: {
    backgroundColor: "#818CF8",
    borderRadius: 18,
    borderBottomWidth: 4,
    borderBottomColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  liveBanner: {
    backgroundColor: "#1CB0F6",
    borderRadius: 18,
    borderBottomWidth: 4,
    borderBottomColor: "#0E80B8",
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveCountBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveCountBadgeText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  upNextBanner: {
    backgroundColor: Colors.accent,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderBottomColor: "#3A8500",
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  upNextCountBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  upNextCountBadgeText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  chaosBannerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chaosBannerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  rebuildButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rebuildText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  primaryCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#818CF8" + "40",
    marginBottom: 20,
    aspectRatio: 16 / 9,
  },
  primaryInner: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 17,
    overflow: "hidden" as const,
    justifyContent: "space-between" as const,
  },
  tensionAccent: {
    position: "absolute" as const,
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  tensionAccentSecondary: {
    position: "absolute" as const,
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  heroMicroLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  primaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryLeague: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  leaguePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
  },
  leaguePillText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  primaryTeams: {
    gap: 6,
    marginBottom: 14,
  },
  primaryTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryTeamName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  heroTeamName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  primaryMatchup: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  vsText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    paddingLeft: 38,
  },
  primaryScore: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 28,
    textAlign: "right",
  },
  primaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryTime: {
    fontSize: 14,
    color: "#A78BFA",
    fontFamily: "Inter_500Medium",
  },
  primaryClock: {
    fontSize: 14,
    color: "#A78BFA",
    fontFamily: "Inter_600SemiBold",
  },
  primaryElapsed: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  promotionToast: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(91,33,182,0.8)",
    boxShadow: "0px 4px 24px rgba(109,40,217,0.5)",
  },
  promotionToastContent: {
    alignItems: "center" as const,
  },
  promotionToastHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    marginBottom: 3,
  },
  promotionToastLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "white",
    letterSpacing: 0.4,
  },
  promotionToastReason: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center" as const,
  },
  secondaryCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
    overflow: "hidden" as const,
  },
  secondaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  secondaryLeague: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  secondaryLeagueSm: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  svnsPrimaryContent: {
    marginBottom: 14,
  },
  svnsSecondaryContent: {
    marginBottom: 10,
  },
  secondaryTeams: {
    gap: 4,
    marginBottom: 10,
  },
  secondaryTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryTeamName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  secondaryScore: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    minWidth: 18,
    textAlign: "right",
  },
  secondaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryTime: {
    fontSize: 12,
    color: "#A78BFA",
    fontFamily: "Inter_500Medium",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
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
    maxWidth: 260,
  },

  liveSection: {
    marginBottom: 20,
  },
  liveHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 10,
  },
  liveHeaderLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
    borderRadius: 1,
  },
  liveHeaderText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  upNextSection: {
    marginBottom: 20,
  },
  dayDivider: {
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 6,
  },
  dayDividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(161, 161, 166, 0.2)",
    marginBottom: 8,
  },
  dayDividerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  stickyChipBar: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  upNextChipSection: {
    marginBottom: 8,
  },
  upNextChipRow: {
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
  },
  upNextChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  upNextChipActive: {
    backgroundColor: Colors.accent + "22",
    borderColor: Colors.accent + "60",
  },
  upNextChipLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  upNextChipLabelActive: {
    color: Colors.accent,
  },
  upNextChipCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center" as const,
  },
  upNextChipCountText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  upNextFilterEmpty: {
    paddingVertical: 24,
    alignItems: "center" as const,
    gap: 8,
  },
  upNextFilterEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  upNextEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  upNextEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center" as const,
  },
  upNextEmptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  upNextEmptyActionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLiveIcon: {
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  sectionCount: {
    backgroundColor: Colors.cardHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },

  teamFavStarHero: {
    fontSize: 19,
    color: Colors.favStar,
  },
  teamFavStar: {
    fontSize: 12,
    color: Colors.favStar,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveChipSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: "auto" as const,
  },
  liveText: {
    color: Colors.live,
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  liveTextSmall: {
    color: Colors.live,
    fontSize: 9,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  scoreLive: {
    color: "#FFFFFF",
  },
  finalLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  finalLabelSmall: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    backgroundColor: "rgba(161, 161, 166, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginLeft: "auto" as const,
  },
  primaryFinalStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryClock: {
    fontSize: 12,
    color: "#A78BFA",
    fontFamily: "Inter_600SemiBold",
  },
  secondaryFinal: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  cardCompletedOpacity: {},
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#1CB0F6",
    borderWidth: 2,
    borderColor: "rgba(28,176,246,0.5)",
    borderBottomWidth: 4,
    borderBottomColor: "#0E80B8",
  },
  expandButtonGreen: {
    backgroundColor: Colors.card,
    borderColor: Colors.cardHighlight,
    borderBottomWidth: 2,
    borderBottomColor: Colors.cardHighlight,
  },
  expandButtonText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  footerMeta: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  favIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  favIndicatorText: {
    fontSize: 11,
    color: Colors.favStar,
    fontFamily: "Inter_500Medium",
  },
  racingLeaderRow: {
    marginTop: 2,
  },
  racingLeaderText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  racingLeaderTextSm: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  racingConstructorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
  },
  racingConstructorRowSm: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 3,
  },
  racingConstructorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  racingConstructorDotSm: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  racingLeaderTeam: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  racingLeaderTeamSm: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  racingQualifyingPhase: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  racingQualifyingPhaseSm: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  golfLeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  golfLeaderText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  golfLeaderScoreBlock: {
    alignItems: "flex-end" as const,
    gap: 1,
  },
  golfLeaderScore: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#A78BFA",
  },
  golfLeaderThruText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(167,139,250,0.7)",
  },
  golfLeaderRowSm: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  golfLeaderTextSm: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  golfLeaderScoreBlockSm: {
    alignItems: "flex-end" as const,
    gap: 1,
  },
  golfLeaderScoreSm: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#A78BFA",
  },
  golfLeaderThruTextSm: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(167,139,250,0.7)",
  },
});
