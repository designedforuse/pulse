import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Video, ResizeMode } from "expo-av";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";

interface NarrativeImpact {
  label: string;
  ritualId?: string;
  tabHint?: "Watch" | "Rituals";
}

interface NarrativeVideo {
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  title: string;
  source: "youtube" | "nhl" | "league" | "social";
}

interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement" | "deadline_watch" | "rivalry_game" | "upset_alert" | "clinch_watch";
  meta?: Record<string, any>;
  video?: NarrativeVideo;
}

interface SportEvent {
  id: string;
  sport: string;
  league: string;
  awayTeam: string;
  homeTeam: string;
  startTimeLocal: string;
}

const KIND_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  playoff_push: { icon: "flame", color: "#FF453A", label: "Playoff Push" },
  momentum: { icon: "trending-up", color: "#58CC02", label: "Momentum" },
  league_moment: { icon: "trophy", color: "#FFC800", label: "League Moment" },
  player_movement: { icon: "swap-horizontal", color: "#1CB0F6", label: "Player Movement" },
  deadline_watch: { icon: "time", color: "#FF9800", label: "Deadline Watch" },
  rivalry_game: { icon: "flash", color: "#E040FB", label: "Rivalry Game" },
  upset_alert: { icon: "alert-circle", color: "#FF1744", label: "Upset Alert" },
  clinch_watch: { icon: "flag", color: "#00BCD4", label: "Clinch Watch" },
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(d);
}

function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    hockey: "#64B5F6",
    rugby: "#FF8A65",
    cricket: "#FFD54F",
    soccer: "#81C784",
  };
  return colors[sport] || "#90A4AE";
}

export default function NarrativeDetailScreen() {
  const { id, cardJson } = useLocalSearchParams<{ id: string; cardJson: string }>();
  const insets = useSafeAreaInsets();
  const { disabledSports } = useFavorites();

  let parsedCard: ExploreNarrativeCard | null = null;
  try {
    if (cardJson) parsedCard = JSON.parse(cardJson);
  } catch {}

  const { data: narrativesData, isLoading: narrativesLoading } = useQuery<{ cards: ExploreNarrativeCard[] }>({
    queryKey: ["/api/narratives"],
    enabled: !parsedCard,
  });

  const card = parsedCard || narrativesData?.cards?.find(c => c.id === id) || null;

  const { data: eventsData } = useQuery<{ events: SportEvent[] }>({
    queryKey: ["/api/events"],
  });

  if (!card && narrativesLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Card not found</Text>
      </View>
    );
  }

  const config = KIND_CONFIG[card.kind] || KIND_CONFIG.league_moment;
  const eventIds = new Set<string>(card.meta?.eventIds || []);
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const cardTeam = (card.meta?.team || "").toLowerCase();
  const cardLeague = card.meta?.league || "";

  const relevantEvents = (eventsData?.events || [])
    .filter(e => {
      if (disabledSports.size > 0 && disabledSports.has(e.sport.toLowerCase())) return false;
      if (!eventIds.has(e.id)) return false;
      const start = new Date(e.startTimeLocal);
      if (start < now || start > weekEnd) return false;
      if (cardTeam && cardLeague) {
        if (e.league !== cardLeague) return false;
        const home = e.homeTeam.toLowerCase();
        const away = e.awayTeam.toLowerCase();
        if (!home.includes(cardTeam) && !away.includes(cardTeam) &&
            !cardTeam.includes(home) && !cardTeam.includes(away)) {
          if (home && away) return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime())
    .slice(0, 8);

  const handleTabNav = (tab: "Watch" | "Rituals") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (tab === "Watch") {
      router.replace("/(tabs)/watch");
    } else {
      router.replace("/(tabs)/rituals");
    }
  };

  const handleEventPress = (eventId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/event-sheet", params: { eventId } });
  };

  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const isYouTubeUrl = useCallback((url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }, []);

  const handleVideoTap = useCallback((video: NarrativeVideo) => {
    if (isYouTubeUrl(video.url)) {
      Linking.openURL(video.url);
    } else {
      setVideoPlaying(true);
    }
  }, [isYouTubeUrl]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={[styles.kindBadgeLarge, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon} size={20} color="#FFFFFF" />
            <Text style={[styles.kindLabelLarge, { color: "#FFFFFF" }]}>{config.label}</Text>
          </View>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.subtitle}>{card.subtitle}</Text>
          {card.impact && (
            <View style={styles.impactBadge}>
              <Ionicons name="link-outline" size={14} color={Colors.accent} />
              <Text style={styles.impactLabel}>{card.impact.label}</Text>
            </View>
          )}
        </View>

        {card.video && (
          <View style={styles.videoSection}>
            {!videoPlaying || isYouTubeUrl(card.video.url) ? (
              <Pressable
                style={styles.videoThumbnailContainer}
                onPress={() => handleVideoTap(card.video!)}
              >
                <Image
                  source={{ uri: card.video.thumbnailUrl }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.videoOverlay}>
                  <View style={styles.videoPlayButton}>
                    <Ionicons name="play" size={28} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.videoDurationBadge}>
                  <Text style={styles.videoDurationText}>
                    {formatDuration(card.video.durationSeconds)}
                  </Text>
                </View>
                {isYouTubeUrl(card.video.url) && (
                  <View style={styles.videoSourceBadge}>
                    <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                  </View>
                )}
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {card.video.title}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.videoPlayerContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: card.video.url }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                />
                <Pressable
                  style={styles.videoCloseButton}
                  onPress={() => setVideoPlaying(false)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {card.kind === "deadline_watch" || card.kind === "playoff_push" || card.kind === "rivalry_game" || card.kind === "upset_alert" || card.kind === "clinch_watch" ? "Why this matters" : "Why this triggered"}
          </Text>
          <View style={styles.reasonCard}>
            {card.kind === "playoff_push" && card.meta?.teams?.length > 1 ? (
              card.meta.teams.map((t: any, i: number) => (
                <React.Fragment key={i}>
                  {(t.reason || "").split("\n\n").map((p: string, j: number) => (
                    <Text key={`${i}-${j}`} style={[styles.reasonText, (i > 0 || j > 0) && { marginTop: 10 }]}>
                      {p}
                    </Text>
                  ))}
                </React.Fragment>
              ))
            ) : (card.kind === "deadline_watch" || card.kind === "playoff_push" || card.kind === "rivalry_game" || card.kind === "upset_alert" || card.kind === "clinch_watch") && card.meta?.reason ? (
              card.meta.reason.split("\n\n").map((paragraph: string, i: number) => (
                <Text key={i} style={[styles.reasonText, i > 0 && { marginTop: 10 }]}>
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text style={styles.reasonText}>
                {card.meta?.reason || "Threshold conditions were met based on current data."}
              </Text>
            )}
          </View>
        </View>

        {card.kind === "momentum" && card.meta?.recentGames && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Results</Text>
            <View style={styles.resultsCard}>
              {card.meta.recentGames.map((g: any, i: number) => (
                <View key={i} style={[styles.resultRow, i > 0 && styles.resultRowBorder]}>
                  <Text style={[styles.resultBadge, { color: g.result === "W" ? Colors.accent : Colors.live }]}>
                    {g.result}
                  </Text>
                  <Text style={styles.resultOpponent} numberOfLines={1}>
                    vs {g.opponent || "Unknown"}
                  </Text>
                  <Text style={styles.resultScore}>{g.score}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {card.kind === "player_movement" && card.meta?.movements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Movements</Text>
            <View style={styles.movementsCard}>
              {card.meta.movements.map((m: any, i: number) => (
                <View key={i} style={[styles.movementRow, i > 0 && styles.resultRowBorder]}>
                  <Text style={styles.movementPlayer}>{m.player}</Text>
                  <View style={styles.movementTeams}>
                    <Text style={styles.movementFrom}>{m.from}</Text>
                    <Ionicons name="arrow-forward" size={12} color={Colors.accent} />
                    <Text style={styles.movementTo}>{m.to}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {card.kind === "clinch_watch" && card.meta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinch Scenario</Text>
            <View style={styles.rivalryCard}>
              <View style={styles.rivalryRow}>
                <Text style={styles.rivalryLabel}>{card.meta.conditionLabel}</Text>
                <Text style={styles.rivalryTeams}>{card.meta.awayTeam} @ {card.meta.homeTeam}</Text>
                <Text style={styles.rivalryTime}>{card.meta.league} · {formatEventTime(card.meta.startTime)}</Text>
              </View>
            </View>
          </View>
        )}

        {card.kind === "upset_alert" && card.meta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            <View style={styles.rivalryCard}>
              <View style={styles.rivalryRow}>
                <Text style={styles.rivalryLabel}>
                  {card.meta.mode === "live" ? "LIVE — Upset Watch" : "FINAL — Upset Confirmed"}
                </Text>
                <Text style={styles.rivalryTeams}>{card.meta.awayTeam} @ {card.meta.homeTeam}</Text>
                <Text style={styles.rivalryTime}>
                  {card.meta.league} · {formatEventTime(card.meta.startTime)}
                  {card.meta.favoriteRank ? ` · Seed ${card.meta.favoriteRank} vs ${card.meta.underdogRank || "Unseeded"}` : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        {card.kind === "rivalry_game" && card.meta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rivalry Matchup</Text>
            <View style={styles.rivalryCard}>
              <View style={styles.rivalryRow}>
                <Text style={styles.rivalryLabel}>{card.meta.rivalryLabel}</Text>
                <Text style={styles.rivalryTeams}>{card.meta.awayTeam} @ {card.meta.homeTeam}</Text>
                <Text style={styles.rivalryTime}>{card.meta.league} · {formatEventTime(card.meta.startTime)}</Text>
              </View>
            </View>
          </View>
        )}

        {card.kind === "league_moment" && card.meta?.type === "rivalry" && card.meta?.matches && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rivalry Matchups</Text>
            <View style={styles.rivalryCard}>
              {card.meta.matches.map((m: any, i: number) => (
                <View key={i} style={[styles.rivalryRow, i > 0 && styles.resultRowBorder]}>
                  <Text style={styles.rivalryLabel}>{m.label}</Text>
                  <Text style={styles.rivalryTeams}>{m.away} @ {m.home}</Text>
                  <Text style={styles.rivalryTime}>{m.league} · {formatEventTime(m.startTime)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {card.kind === "deadline_watch" && card.meta && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trade Deadline Countdown</Text>
              <View style={styles.reasonCard}>
                <View style={styles.deadlineRow}>
                  <Ionicons name="timer-outline" size={16} color="#FF9800" />
                  <Text style={styles.deadlineLabel}>
                    {card.meta.hoursUntil > 0
                      ? `${Math.round(card.meta.hoursUntil)}h remaining`
                      : "Deadline has passed"}
                  </Text>
                </View>
                {card.meta.tradeWatch && (
                  <View style={styles.deadlineRow}>
                    <Ionicons name="eye-outline" size={16} color="#FF9800" />
                    <Text style={styles.deadlineLabel}>On trade-watch list</Text>
                  </View>
                )}
                {card.meta.expiringContracts > 0 && (
                  <View style={styles.deadlineRow}>
                    <Ionicons name="document-text-outline" size={16} color="#FF9800" />
                    <Text style={styles.deadlineLabel}>
                      {card.meta.expiringContracts} expiring contract{card.meta.expiringContracts > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {card.meta.playoffBubble && (
                  <View style={styles.deadlineRow}>
                    <Ionicons name="analytics-outline" size={16} color="#FF9800" />
                    <Text style={styles.deadlineLabel}>Playoff bubble team</Text>
                  </View>
                )}
              </View>
            </View>

            {card.meta.players?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Players to Watch</Text>
                <View style={styles.reasonCard}>
                  {card.meta.players.map((p: any, i: number) => (
                    <View key={i} style={[styles.playerRow, i > 0 && styles.resultRowBorder]}>
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerStatus}>{p.status}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{card.kind === "rivalry_game" || card.kind === "upset_alert" || card.kind === "clinch_watch" ? "Relevant Event" : "Upcoming Games"}</Text>
          {relevantEvents.length > 0 ? (
            relevantEvents.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => handleEventPress(event.id)}
                style={({ pressed }) => [
                  styles.eventCard,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                testID={`narrative-event-${event.id}`}
              >
                <View style={[styles.sportDot, { backgroundColor: getSportColor(event.sport) }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTeams} numberOfLines={1}>
                    {event.awayTeam} @ {event.homeTeam}
                  </Text>
                  <Text style={styles.eventTime}>
                    {event.league} · {formatEventTime(event.startTimeLocal)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyEvents}>
              <Ionicons name="calendar-outline" size={24} color={Colors.textMuted} />
              <Text style={styles.emptyEventsText}>
                {cardTeam ? `No upcoming ${card.meta?.team || ""} games found.` : "No upcoming games found."}
              </Text>
            </View>
          )}
        </View>

        {card.impact?.tabHint && (
          <View style={styles.section}>
            <Pressable
              onPress={() => handleTabNav(card!.impact!.tabHint!)}
              style={({ pressed }) => [
                styles.deepLinkButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              testID="narrative-deep-link"
            >
              <Ionicons
                name={card.impact.tabHint === "Watch" ? "play-circle" : "calendar"}
                size={20}
                color={Colors.background}
              />
              <Text style={styles.deepLinkText}>
                Go to {card.impact.tabHint}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontFamily: "Inter_400Regular",
  },
  topSection: {
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 20,
    gap: 6,
  },
  kindBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  kindLabelLarge: {
    fontSize: 13,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  impactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  impactLabel: {
    fontSize: 13,
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reasonCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  resultsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  resultRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultBadge: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    width: 20,
  },
  resultOpponent: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  resultScore: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  movementsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  movementRow: {
    paddingVertical: 10,
    gap: 4,
  },
  movementPlayer: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  movementTeams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  movementFrom: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  movementTo: {
    fontSize: 13,
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
  },
  rivalryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rivalryRow: {
    paddingVertical: 10,
    gap: 2,
  },
  rivalryLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.favStar,
    fontFamily: "Inter_600SemiBold",
  },
  rivalryTeams: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  rivalryTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  deadlineRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 6,
  },
  deadlineLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  playerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  playerName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  playerStatus: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  videoSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  videoThumbnailContainer: {
    borderRadius: 16,
    overflow: "hidden" as const,
    backgroundColor: Colors.card,
  },
  videoThumbnail: {
    width: "100%" as const,
    aspectRatio: 16 / 9,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  videoPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingLeft: 4,
  },
  videoDurationBadge: {
    position: "absolute" as const,
    bottom: 36,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  videoSourceBadge: {
    position: "absolute" as const,
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    padding: 4,
  },
  videoTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  videoPlayerContainer: {
    borderRadius: 16,
    overflow: "hidden" as const,
    backgroundColor: "#000000",
  },
  videoPlayer: {
    width: "100%" as const,
    aspectRatio: 16 / 9,
  },
  videoCloseButton: {
    position: "absolute" as const,
    top: 8,
    right: 8,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  sportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTeams: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyEventsText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center" as const,
  },
  deepLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
  },
  deepLinkText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
});
