import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface NarrativeImpact {
  label: string;
  ritualId?: string;
  tabHint?: "Watch" | "Rituals";
}

interface ExploreNarrativeCard {
  id: string;
  title: string;
  subtitle: string;
  impact?: NarrativeImpact;
  priority: number;
  triggeredAt: string;
  expiresAt?: string;
  kind: "playoff_push" | "momentum" | "league_moment" | "player_movement";
  meta?: Record<string, any>;
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
  momentum: { icon: "trending-up", color: "#00E676", label: "Momentum" },
  league_moment: { icon: "trophy", color: "#FFD54F", label: "League Moment" },
  player_movement: { icon: "swap-horizontal", color: "#64B5F6", label: "Player Movement" },
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

  const relevantEvents = (eventsData?.events || [])
    .filter(e => {
      if (!eventIds.has(e.id)) return false;
      const start = new Date(e.startTimeLocal);
      return start >= now && start <= weekEnd;
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
          <View style={[styles.kindBadgeLarge, { backgroundColor: config.color + "20" }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
            <Text style={[styles.kindLabelLarge, { color: config.color }]}>{config.label}</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why this triggered</Text>
          <View style={styles.reasonCard}>
            {card.kind === "playoff_push" && card.meta?.teams?.length > 1 ? (
              card.meta.teams.map((t: any, i: number) => (
                <Text key={i} style={[styles.reasonText, i > 0 && { marginTop: 8 }]}>
                  {t.reason}
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

        {relevantEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Games</Text>
            {relevantEvents.map((event) => (
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
            ))}
          </View>
        )}

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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
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
  deepLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  deepLinkText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
});
