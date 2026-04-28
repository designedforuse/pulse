import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getTeamLogoUrl } from "@/utils/teamLogos";
import { NHL_AFFILIATIONS, NHL_AFFILIATIONS_LAST_VERIFIED } from "@/data/nhlAffiliations";

const HOCKEY_BLUE = Colors.hockey;

interface AffiliateRowProps {
  league: "AHL" | "ECHL";
  teamName: string;
  badgeColor: string;
}

function AffiliateRow({ league, teamName, badgeColor }: AffiliateRowProps) {
  const logoUrl = getTeamLogoUrl(teamName, league);
  return (
    <View style={styles.affiliateRow}>
      <View style={[styles.leagueBadge, { backgroundColor: badgeColor + "22", borderColor: badgeColor + "55" }]}>
        <Text style={[styles.leagueBadgeText, { color: badgeColor }]}>{league}</Text>
      </View>
      <View style={styles.affiliateLogoWrap}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.affiliateLogo} resizeMode="contain" />
        ) : (
          <View style={styles.affiliateLogoFallback}>
            <Ionicons name="snow-outline" size={14} color={Colors.textMuted} />
          </View>
        )}
      </View>
      <Text style={styles.affiliateTeam} numberOfLines={1}>{teamName}</Text>
    </View>
  );
}

function EmptyAffiliateRow({ league, badgeColor }: { league: "AHL" | "ECHL"; badgeColor: string }) {
  return (
    <View style={styles.affiliateRow}>
      <View style={[styles.leagueBadge, { backgroundColor: badgeColor + "12", borderColor: Colors.border }]}>
        <Text style={[styles.leagueBadgeText, { color: Colors.textMuted }]}>{league}</Text>
      </View>
      <View style={styles.affiliateLogoWrap}>
        <View style={styles.affiliateLogoFallback}>
          <Text style={styles.dashChar}>—</Text>
        </View>
      </View>
      <Text style={styles.affiliateTeamMuted}>No affiliate</Text>
    </View>
  );
}

export default function AffiliatesScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "NHL Affiliates",
          headerBackTitle: "Stories",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 60 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Hockey Family Tree</Text>
          <Text style={styles.introBody}>
            Every NHL club, its AHL development partner, and its ECHL affiliate. Use this to
            see where prospects are sharpening before they get the call up.
          </Text>
          <Text style={styles.introMeta}>Affiliations as of the {NHL_AFFILIATIONS_LAST_VERIFIED}</Text>
        </View>

        {NHL_AFFILIATIONS.map((row) => {
          const nhlLogoUrl = getTeamLogoUrl(row.nhl, "NHL");
          return (
            <View key={row.nhl} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.nhlLogoWrap}>
                  {nhlLogoUrl ? (
                    <Image source={{ uri: nhlLogoUrl }} style={styles.nhlLogo} resizeMode="contain" />
                  ) : (
                    <View style={styles.nhlLogoFallback}>
                      <Ionicons name="snow" size={20} color={HOCKEY_BLUE} />
                    </View>
                  )}
                </View>
                <View style={styles.nhlNameWrap}>
                  <View style={styles.nhlBadge}>
                    <Text style={styles.nhlBadgeText}>NHL</Text>
                  </View>
                  <Text style={styles.nhlName} numberOfLines={1}>{row.nhl}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {row.ahl ? (
                <AffiliateRow league="AHL" teamName={row.ahl} badgeColor="#FFB020" />
              ) : (
                <EmptyAffiliateRow league="AHL" badgeColor="#FFB020" />
              )}

              {row.echl && row.echl.length > 0 ? (
                row.echl.map((echl) => (
                  <AffiliateRow key={echl} league="ECHL" teamName={echl} badgeColor="#FF6B6B" />
                ))
              ) : (
                <EmptyAffiliateRow league="ECHL" badgeColor="#FF6B6B" />
              )}
            </View>
          );
        })}

        <Text style={styles.sourceFootnote}>
          Affiliations change between seasons. If you spot something out of date, ping us in Settings.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  intro: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: HOCKEY_BLUE + "33",
    marginBottom: 14,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  introBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  introMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: HOCKEY_BLUE,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
  },
  nhlLogoWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nhlLogo: {
    width: 44,
    height: 44,
  },
  nhlLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  nhlNameWrap: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  nhlBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: HOCKEY_BLUE + "22",
  },
  nhlBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: HOCKEY_BLUE,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  nhlName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: 6,
  },
  affiliateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  leagueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 50,
    alignItems: "center",
    marginRight: 12,
  },
  leagueBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  affiliateLogoWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  affiliateLogo: {
    width: 30,
    height: 30,
  },
  affiliateLogoFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  dashChar: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  affiliateTeam: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  affiliateTeamMuted: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  sourceFootnote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 16,
  },
});
