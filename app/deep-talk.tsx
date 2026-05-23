import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface DeepTalkTopic {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  route: string;
}

const TOPICS: DeepTalkTopic[] = [
  {
    id: "hockey-family-tree",
    title: "Hockey Family Tree",
    subtitle: "NHL → AHL → ECHL affiliations and why farm-team games matter",
    icon: "git-network-outline",
    accent: Colors.hockey,
    route: "/affiliates",
  },
];

export default function DeepTalkScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerBadge}>
            <Ionicons name="git-network-outline" size={12} color="#fff" />
            <Text style={styles.headerBadgeText}>PLAYBOOK</Text>
          </View>
          <Text style={styles.headerTitle}>Sports Deep Talk</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Deeper context that helps the rest of your Stories feed make sense.
        </Text>

        {TOPICS.map((topic) => (
          <Pressable
            key={topic.id}
            onPress={() => router.push(topic.route as never)}
            style={({ pressed }) => [
              styles.topicTile,
              { borderLeftColor: topic.accent },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={topic.title}
            testID={`deep-talk-${topic.id}`}
          >
            <View style={[styles.topicIconWrap, { backgroundColor: topic.accent + "1F" }]}>
              <Ionicons name={topic.icon} size={26} color={topic.accent} />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.hockey,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  intro: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  topicTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.border,
    borderRightColor: Colors.border,
    borderBottomColor: Colors.border,
  },
  topicIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  topicTextWrap: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  topicSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
