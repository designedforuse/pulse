import React from "react";
import { StyleSheet, Text, View, ScrollView, Platform } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export interface PlaybookSection {
  title: string;
  emoji?: string;
  intro?: string;
  bullets?: string[];
  events?: { name: string; meta?: string; note?: string }[];
  footnote?: string;
}

export interface PlaybookArticleProps {
  headerTitle: string;
  headerBackTitle?: string;
  accent: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  blurb: string;
  sections: PlaybookSection[];
  footer?: string;
}

export default function PlaybookArticle({
  headerTitle,
  headerBackTitle = "Behind",
  accent,
  badge,
  icon,
  title,
  blurb,
  sections,
  footer,
}: PlaybookArticleProps) {
  return (
    <>
      <Stack.Screen options={{ title: headerTitle, headerBackTitle }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 60 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.heroIconWrap, { backgroundColor: accent + "1F" }]}>
            <Ionicons name={icon} size={26} color={accent} />
          </View>
          <View style={[styles.badge, { backgroundColor: accent + "22" }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroBlurb}>{blurb}</Text>
        </View>

        {sections.map((section, idx) => (
          <View
            key={`${section.title}-${idx}`}
            style={[styles.section, { borderLeftColor: accent }]}
          >
            <Text style={styles.sectionTitle}>
              {section.emoji ? `${section.emoji}  ` : ""}{section.title}
            </Text>
            {section.intro ? <Text style={styles.sectionIntro}>{section.intro}</Text> : null}
            {section.bullets && section.bullets.length > 0 ? (
              <View style={styles.bulletList}>
                {section.bullets.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: accent }]} />
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {section.events && section.events.length > 0 ? (
              <View style={styles.eventList}>
                {section.events.map((ev, i) => (
                  <View key={i} style={styles.eventRow}>
                    <View style={styles.eventTextWrap}>
                      <Text style={styles.eventName}>{ev.name}</Text>
                      {ev.note ? <Text style={styles.eventNote}>{ev.note}</Text> : null}
                    </View>
                    {ev.meta ? <Text style={[styles.eventMeta, { color: accent }]}>{ev.meta}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
            {section.footnote ? <Text style={styles.sectionFootnote}>{section.footnote}</Text> : null}
          </View>
        ))}

        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  hero: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroBlurb: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.border,
    borderRightColor: Colors.border,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sectionIntro: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  bulletList: { gap: 6, marginTop: 4 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  eventList: { gap: 4, marginTop: 4 },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  eventTextWrap: { flex: 1, gap: 2 },
  eventName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  eventNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 15,
  },
  eventMeta: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  sectionFootnote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 16,
  },
  footer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 16,
  },
});
