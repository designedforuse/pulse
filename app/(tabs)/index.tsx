import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getModes } from "@/lib/data";

const modeIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; gradient: string[]; timeWindow: string }> = {
  weekend_nights: {
    icon: "moon",
    gradient: ["#1A237E", "#283593", "#3949AB"],
    timeWindow: "Fri, Sat, Sun  4:00 PM – 2:00 AM",
  },
  weekend_mornings: {
    icon: "sunny",
    gradient: ["#E65100", "#F57C00", "#FFB74D"],
    timeWindow: "Fri, Sat, Sun  6:00 AM – 2:00 PM",
  },
};

export default function ModesScreen() {
  const insets = useSafeAreaInsets();
  const modes = getModes();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleModePress = (modeId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/mode/[id]", params: { id: modeId } });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 20,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="trophy" size={28} color={Colors.accent} />
          <Text style={styles.headerTitle}>Master Sports Guide</Text>
        </View>
        <Text style={styles.subtitle}>
          Choose a viewing mode to find your games
        </Text>

        <View style={styles.modesContainer}>
          {modes.map((mode) => {
            const config = modeIcons[mode.id] || {
              icon: "list" as keyof typeof Ionicons.glyphMap,
              gradient: [Colors.card, Colors.cardHighlight],
              timeWindow: "",
            };
            return (
              <Pressable
                key={mode.id}
                onPress={() => handleModePress(mode.id)}
                style={({ pressed }) => [
                  styles.modeCard,
                  { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                testID={`mode-${mode.id}`}
              >
                <LinearGradient
                  colors={config.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modeGradient}
                >
                  <View style={styles.modeIconContainer}>
                    <Ionicons name={config.icon} size={36} color={Colors.white} />
                  </View>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  {config.timeWindow ? (
                    <Text style={styles.modeTimeWindow}>{config.timeWindow}</Text>
                  ) : null}
                  <Text style={styles.modePackCount}>
                    {mode.packs.length} sport packs
                  </Text>
                  <View style={styles.modeArrow}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            Select a mode to see available games organized by sport packs. Tap any event to open it in your streaming app.
          </Text>
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 28,
  },
  modesContainer: {
    gap: 16,
  },
  modeCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  modeGradient: {
    padding: 24,
    borderRadius: 20,
    minHeight: 150,
    justifyContent: "flex-end",
  },
  modeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.white,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  modeTimeWindow: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  modePackCount: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_500Medium",
  },
  modeArrow: {
    position: "absolute",
    right: 20,
    top: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
