import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getProviders, getSportColor } from "@/lib/data";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useEvents } from "@/lib/events-context";
import { useFavorites } from "@/lib/favorites-context";

interface SourceMeta {
  count: number;
  lastFetchAt: string;
  sourceName: string;
  teamFilter?: string;
  leagueCounts?: Record<string, number>;
}

interface GeneratedMeta {
  lastRefreshAt: string;
  sources: {
    nhl: SourceMeta;
    ahl: SourceMeta;
    echl: SourceMeta;
    ncaa?: SourceMeta;
    rugby?: SourceMeta;
    cricket?: SourceMeta;
  };
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isStale(isoDate: string): boolean {
  return Date.now() - new Date(isoDate).getTime() > STALE_THRESHOLD_MS;
}

function FavoritesSection() {
  const { allTeams, isTeamEnabled, toggleTeam, isSportEnabled, toggleSport, enabledCount, totalCount } = useFavorites();
  const sportOrder = ["hockey", "rugby", "cricket", "soccer", "tennis", "racing"];
  const sportLabels: Record<string, string> = {
    hockey: "Hockey",
    rugby: "Rugby",
    cricket: "Cricket",
    soccer: "Soccer",
    tennis: "Tennis",
    racing: "Racing",
  };
  const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    hockey: "snow",
    rugby: "american-football",
    cricket: "baseball",
    soccer: "football",
    tennis: "tennisball",
    racing: "speedometer",
  };

  const handleToggle = (sport: string, league: string, team: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleTeam(sport, league, team);
  };

  let isFirstSport = true;

  return (
    <View style={styles.card}>
      <View style={styles.favCountRow}>
        <Ionicons name="star" size={14} color={Colors.favStar} />
        <Text style={styles.favCountText}>
          {enabledCount} of {totalCount} teams active
        </Text>
      </View>
      {sportOrder.map((sport) => {
        const sportFavs = allTeams[sport];
        const hasTeams = sportFavs && Object.keys(sportFavs).length > 0;
        const sportEnabled = isSportEnabled(sport);
        const sportColor = getSportColor(sport);
        const leagues = hasTeams ? Object.keys(sportFavs!) : [];
        const showDivider = !isFirstSport;
        isFirstSport = false;

        return (
          <React.Fragment key={sport}>
            {showDivider && <View style={styles.sportDivider} />}
            <View style={styles.sportHeader}>
              <View style={[styles.sportIconBg, { backgroundColor: sportColor + "22" }]}>
                <Ionicons name={sportIcons[sport]} size={14} color={sportEnabled ? sportColor : Colors.textMuted} />
              </View>
              <Text style={[styles.sportLabel, { color: sportEnabled ? sportColor : Colors.textMuted }]}>
                {sportLabels[sport]}
              </Text>
              <View style={{ flex: 1 }} />
              <Switch
                value={sportEnabled}
                onValueChange={() => toggleSport(sport)}
                trackColor={{ false: Colors.border, true: sportColor + "55" }}
                thumbColor={sportEnabled ? sportColor : Colors.textMuted}
                style={styles.teamSwitch}
              />
            </View>
            {sportEnabled && leagues.map((league) => {
              const teams = sportFavs![league];
              if (!teams || teams.length === 0) return null;
              return (
                <React.Fragment key={league}>
                  <View style={styles.leagueLabelRow}>
                    <Text style={styles.leagueLabel}>{league}</Text>
                  </View>
                  {teams.map((team) => {
                    const enabled = isTeamEnabled(sport, league, team);
                    return (
                      <View key={team} style={styles.teamToggleRow}>
                        <Text
                          style={[
                            styles.teamName,
                            !enabled && styles.teamNameDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {team}
                        </Text>
                        <Switch
                          value={enabled}
                          onValueChange={() => handleToggle(sport, league, team)}
                          trackColor={{ false: Colors.border, true: Colors.favStar + "55" }}
                          thumbColor={enabled ? Colors.favStar : Colors.textMuted}
                          style={styles.teamSwitch}
                        />
                      </View>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SourceRow({ league, meta }: { league: string; meta: SourceMeta }) {
  const stale = isStale(meta.lastFetchAt);
  const timeAgo = formatTimeAgo(meta.lastFetchAt);
  const label = meta.teamFilter ? `${league} (${meta.teamFilter})` : league;

  const leagueSummary = meta.leagueCounts
    ? Object.entries(meta.leagueCounts).map(([k, v]) => `${k}: ${v}`).join(" | ")
    : null;

  return (
    <View style={styles.sourceRow}>
      <View style={styles.sourceLeft}>
        <Text style={styles.sourceLeague}>{label}</Text>
        <Text style={styles.sourceVia}>via {meta.sourceName}</Text>
        {leagueSummary && (
          <Text style={styles.sourceVia}>{leagueSummary}</Text>
        )}
      </View>
      <View style={styles.sourceRight}>
        <Text style={styles.sourceCount}>{meta.count} events</Text>
        <View style={styles.sourceTimeRow}>
          {stale && (
            <Ionicons name="warning" size={11} color="#F59E0B" style={{ marginRight: 3 }} />
          )}
          <Text style={[styles.sourceTime, stale && { color: "#F59E0B" }]}>
            {timeAgo}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const providers = getProviders();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();
  const { debugShowAll, setDebugShowAll, showSvnsSessions, setShowSvnsSessions, favoritesOnly, setFavoritesOnly } = useEvents();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [meta, setMeta] = useState<GeneratedMeta | null>(null);
  const [rebuildingExplore, setRebuildingExplore] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchMeta = useCallback(async () => {
    try {
      const url = new URL("/api/meta", getApiUrl());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data && data.lastRefreshAt) {
        setMeta(data as GeneratedMeta);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const res = await apiRequest("POST", "/api/refresh?days=14");
      const data = await res.json();
      if (data.success) {
        setRefreshMessage({ text: `Updated: ${data.eventCount} events loaded`, ok: true });
        queryClient.invalidateQueries({ queryKey: ["/api/events?days=14"] });
        await fetchMeta();
      } else {
        setRefreshMessage({ text: "Refresh failed. Try again.", ok: false });
      }
    } catch {
      setRefreshMessage({ text: "Refresh failed. Check connection.", ok: false });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRebuildExplore = async () => {
    if (rebuildingExplore) return;
    setRebuildingExplore(true);
    setRebuildMessage(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const url = new URL("/api/rebuild-explore", getApiUrl());
      const res = await fetch(url.toString(), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRebuildMessage({ text: `${data.cardCount} narrative cards generated`, ok: true });
        queryClient.invalidateQueries({ queryKey: ["/api/narratives"] });
      } else {
        setRebuildMessage({ text: "Rebuild failed. Try again.", ok: false });
      }
    } catch {
      setRebuildMessage({ text: "Rebuild failed. Check connection.", ok: false });
    } finally {
      setRebuildingExplore(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Favorite Teams</Text>
          <FavoritesSection />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Data</Text>
          <View style={styles.card}>
            {meta && (
              <View style={styles.metaBlock}>
                <View style={styles.metaHeaderRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.metaRefreshText}>
                    Last refreshed: {formatTimeAgo(meta.lastRefreshAt)}
                  </Text>
                  {isStale(meta.lastRefreshAt) && (
                    <Ionicons name="warning" size={13} color="#F59E0B" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <View style={styles.sourceDivider} />
                <SourceRow league="NHL" meta={meta.sources.nhl} />
                <View style={styles.sourceDivider} />
                <SourceRow league="AHL" meta={meta.sources.ahl} />
                <View style={styles.sourceDivider} />
                <SourceRow league="ECHL" meta={meta.sources.echl} />
                <View style={styles.sourceDivider} />
                {meta.sources.ncaa && (
                  <>
                    <SourceRow league="NCAA" meta={meta.sources.ncaa} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.rugby && (
                  <>
                    <SourceRow league="Rugby" meta={meta.sources.rugby} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.cricket && (
                  <>
                    <SourceRow league="Cricket" meta={meta.sources.cricket} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.iccT20Wc && (
                  <>
                    <SourceRow league="T20 World Cup" meta={meta.sources.iccT20Wc} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.olympicHockey && (
                  <>
                    <SourceRow league="Olympic Hockey" meta={meta.sources.olympicHockey} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.epl && (
                  <>
                    <SourceRow league="EPL" meta={meta.sources.epl} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.mls && (
                  <>
                    <SourceRow league="MLS" meta={meta.sources.mls} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.serieA && (
                  <>
                    <SourceRow league="Serie A" meta={meta.sources.serieA} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.laLiga && (
                  <>
                    <SourceRow league="La Liga" meta={meta.sources.laLiga} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.bundesliga && (
                  <>
                    <SourceRow league="Bundesliga" meta={meta.sources.bundesliga} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.ligue1 && (
                  <>
                    <SourceRow league="Ligue 1" meta={meta.sources.ligue1} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.nwsl && (
                  <>
                    <SourceRow league="NWSL" meta={meta.sources.nwsl} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.usl && (
                  <>
                    <SourceRow league="USL" meta={meta.sources.usl} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.championsLeague && (
                  <>
                    <SourceRow league="Champions League" meta={meta.sources.championsLeague} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
                {meta.sources.faCup && (
                  <>
                    <SourceRow league="FA Cup" meta={meta.sources.faCup} />
                    <View style={styles.sourceDivider} />
                  </>
                )}
              </View>
            )}
            <Pressable
              onPress={handleRefresh}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.refreshRow,
                { opacity: pressed && !refreshing ? 0.7 : 1 },
              ]}
              testID="refresh-schedules-btn"
            >
              <View style={styles.refreshLeft}>
                {refreshing ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Ionicons name="refresh" size={20} color={Colors.accent} />
                )}
                <View>
                  <Text style={styles.refreshLabel}>Refresh Schedules</Text>
                  <Text style={styles.refreshDesc}>
                    Pull latest NHL + AHL + ECHL + NCAA + Rugby + Cricket + T20WC + Olympics + Soccer data
                  </Text>
                </View>
              </View>
              {!refreshing && (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </Pressable>
            {refreshMessage && (
              <View style={styles.refreshResultBlock}>
                <View style={styles.refreshResultRow}>
                  <Ionicons
                    name={refreshMessage.ok ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={refreshMessage.ok ? Colors.accent : Colors.live}
                  />
                  <Text
                    style={[
                      styles.refreshResultText,
                      { color: refreshMessage.ok ? Colors.accent : Colors.live },
                    ]}
                  >
                    {refreshMessage.text}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.sourceDivider} />
            <Pressable
              onPress={handleRebuildExplore}
              disabled={rebuildingExplore}
              style={({ pressed }) => [
                styles.refreshRow,
                { opacity: pressed && !rebuildingExplore ? 0.7 : 1 },
              ]}
              testID="rebuild-explore-btn"
            >
              <View style={styles.refreshLeft}>
                {rebuildingExplore ? (
                  <ActivityIndicator size="small" color="#64B5F6" />
                ) : (
                  <Ionicons name="compass" size={20} color="#64B5F6" />
                )}
                <View>
                  <Text style={styles.refreshLabel}>Rebuild Stories</Text>
                  <Text style={styles.refreshDesc}>
                    Regenerate narrative cards from current data
                  </Text>
                </View>
              </View>
              {!rebuildingExplore && (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </Pressable>
            {rebuildMessage && (
              <View style={styles.refreshResultBlock}>
                <View style={styles.refreshResultRow}>
                  <Ionicons
                    name={rebuildMessage.ok ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={rebuildMessage.ok ? Colors.accent : Colors.live}
                  />
                  <Text
                    style={[
                      styles.refreshResultText,
                      { color: rebuildMessage.ok ? Colors.accent : Colors.live },
                    ]}
                  >
                    {rebuildMessage.text}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.card}>
            <View style={styles.debugRow}>
              <View style={styles.debugLeft}>
                <Ionicons name="star" size={18} color={Colors.favStar} />
                <View>
                  <Text style={styles.refreshLabel}>Favorites Only</Text>
                  <Text style={styles.refreshDesc}>
                    Show only events involving your favorite teams
                  </Text>
                </View>
              </View>
              <Switch
                value={favoritesOnly}
                onValueChange={setFavoritesOnly}
                trackColor={{ false: Colors.border, true: Colors.favStar + "55" }}
                thumbColor={favoritesOnly ? Colors.favStar : Colors.textMuted}
                style={styles.debugSwitch}
                testID="favorites-only-toggle"
              />
            </View>
            <View style={styles.sourceDivider} />
            <View style={styles.debugRow}>
              <View style={styles.debugLeft}>
                <Ionicons name="trophy-outline" size={18} color={Colors.accent} />
                <View>
                  <Text style={styles.refreshLabel}>Show SVNS Session Blocks</Text>
                  <Text style={styles.refreshDesc}>
                    Show HSBC SVNS tournament day sessions
                  </Text>
                </View>
              </View>
              <Switch
                value={showSvnsSessions}
                onValueChange={setShowSvnsSessions}
                trackColor={{ false: Colors.border, true: Colors.accent + "55" }}
                thumbColor={showSvnsSessions ? Colors.accent : Colors.textMuted}
                style={styles.debugSwitch}
                testID="svns-sessions-toggle"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug</Text>
          <View style={styles.card}>
            <View style={styles.debugRow}>
              <View style={styles.debugLeft}>
                <Ionicons name="bug-outline" size={18} color={Colors.live} />
                <View>
                  <Text style={styles.refreshLabel}>Show All Games</Text>
                  <Text style={styles.refreshDesc}>
                    Ignore weekend filter on Mode screens
                  </Text>
                </View>
              </View>
              <Switch
                value={debugShowAll}
                onValueChange={setDebugShowAll}
                trackColor={{ false: Colors.border, true: Colors.live + "55" }}
                thumbColor={debugShowAll ? Colors.live : Colors.textMuted}
                style={styles.debugSwitch}
                testID="debug-show-all-toggle"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="trophy-outline"
              label="App Name"
              value="Master Sports Guide"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="code-slash"
              label="Version"
              value="1.0.0 MVP"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="layers-outline"
              label="Platform"
              value={Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Providers</Text>
          <View style={styles.card}>
            {providers.map((provider, index) => {
              const networks: Record<string, string> = {
                "YouTube TV": "ESPN, NBC Sports, CBS Sports, Fox Sports, TNT Sports, BeIn Sports, Willow TV",
                "Disney+": "ESPN+",
                "Prime Video": "RugbyPass TV",
              };
              const networkList = networks[provider.name];
              return (
                <React.Fragment key={provider.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="tv-outline" size={18} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{provider.name}</Text>
                        {networkList && (
                          <Text style={styles.providerNetworks}>{networkList}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Using the App</Text>
          <View style={styles.card}>
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>1</Text>
              </View>
              <View style={styles.howItWorksContent}>
                <Text style={styles.howItWorksTitle}>Watch — what's exciting right now</Text>
                <Text style={styles.howItWorksDesc}>Chaos Mode surfaces the most compelling live game based on score, tension, and timing.</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>2</Text>
              </View>
              <View style={styles.howItWorksContent}>
                <Text style={styles.howItWorksTitle}>Rituals — your weekly viewing habits</Text>
                <Text style={styles.howItWorksDesc}>Rituals group games into time windows (like Sunday mornings or Friday night hockey) so you can quickly find your regular matchups.</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>3</Text>
              </View>
              <View style={styles.howItWorksContent}>
                <Text style={styles.howItWorksTitle}>Stories — discover games across leagues</Text>
                <Text style={styles.howItWorksDesc}>Stories highlights events based on league moments and momentum:</Text>
                <View style={styles.howItWorksBullets}>
                  <Text style={styles.howItWorksBullet}>• Movement – regular season matchups</Text>
                  <Text style={styles.howItWorksBullet}>• Momentum – teams gaining form</Text>
                  <Text style={styles.howItWorksBullet}>• Playoff Push – late-season stakes</Text>
                  <Text style={styles.howItWorksBullet}>• League Moments – finals, derbies, and marquee events</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksFooter}>
              <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.howItWorksFooterText}>Tap any event to open the broadcast in your streaming provider.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  valueSmall,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueSmall?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={Colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.rowValue, valueSmall && styles.rowValueSmall]}
        numberOfLines={1}
      >
        {value}
      </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sportDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sportIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  leagueLabelRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
    paddingLeft: 48,
  },
  leagueLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  teamToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingRight: 14,
    paddingVertical: 6,
  },
  teamName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  teamNameDisabled: {
    color: Colors.textMuted,
  },
  teamSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  favCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  favCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  emptyFavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyFavText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  providerNetworks: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    maxWidth: 160,
    textAlign: "right" as const,
  },
  rowValueSmall: {
    fontSize: 11,
    maxWidth: 200,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 42,
  },
  howItWorksItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  howItWorksContent: {
    flex: 1,
    gap: 2,
  },
  howItWorksTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  howItWorksDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  howItWorksBullets: {
    marginTop: 4,
    gap: 2,
  },
  howItWorksBullet: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    paddingLeft: 4,
  },
  howItWorksFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  howItWorksFooterText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
    flex: 1,
    lineHeight: 18,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  refreshLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  refreshLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  refreshDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  refreshResultBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 4,
  },
  refreshResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshResultText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  refreshCountsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 20,
    marginTop: 2,
  },
  refreshCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  refreshCountDot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  refreshWarning: {
    fontSize: 11,
    color: Colors.live,
    fontFamily: "Inter_400Regular",
    marginLeft: 20,
    marginTop: 2,
  },
  metaBlock: {
    paddingBottom: 0,
  },
  metaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaRefreshText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  sourceDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sourceLeft: {
    gap: 2,
  },
  sourceLeague: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  sourceVia: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  sourceRight: {
    alignItems: "flex-end" as const,
    gap: 2,
  },
  sourceCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  sourceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sourceTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  debugRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  debugLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  debugSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
});
