import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SportEvent } from "@/lib/data";
import { useViewingPlan } from "@/lib/viewing-plan-context";
import { isSerieAEvent, type ViewingPlanChoice } from "@/lib/viewing-plan";
import Colors from "@/constants/colors";

interface ViewingPlanControlsProps {
  event: SportEvent;
  compact?: boolean;
}

const CHOICES: { value: ViewingPlanChoice; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "live", label: "Watch live", icon: "play-circle-outline" },
  { value: "highlights", label: "Highlights", icon: "sparkles-outline" },
];

export default function ViewingPlanControls({ event, compact = false }: ViewingPlanControlsProps) {
  const { getSavedItem, setChoice, persistenceError } = useViewingPlan();
  if (!isSerieAEvent(event) || event.sport !== "soccer") return null;

  const saved = getSavedItem(event);
  const selectedChoice = saved?.choice;
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityLabel="Serie A viewing plan"
    >
      <View style={styles.labelRow}>
        <Ionicons name="calendar-outline" size={14} color="#A78BFA" />
        <Text style={styles.label}>Add to my plan</Text>
        {selectedChoice ? <Text style={styles.savedLabel}>Saved</Text> : null}
      </View>
      <View style={styles.choiceRow}>
        {CHOICES.map((choice) => {
          const selected = selectedChoice === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${choice.label}${selected ? ", selected" : ""}`}
              onPress={() => setChoice(event, choice.value)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                { opacity: pressed ? 0.72 : 1 },
              ]}
              testID={`viewing-plan-${choice.value}-${event.id}`}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : choice.icon}
                size={16}
                color={selected ? "#fff" : "#C4B5FD"}
              />
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {persistenceError ? <Text style={styles.errorText}>{persistenceError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.32)",
    backgroundColor: "rgba(129,140,248,0.08)",
  },
  containerCompact: {
    marginTop: 8,
    padding: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: "#C4B5FD",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  savedLabel: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  choice: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.32)",
    backgroundColor: "rgba(167,139,250,0.09)",
  },
  choiceSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#A78BFA",
  },
  choiceText: {
    fontSize: 12,
    color: "#C4B5FD",
    fontFamily: "Inter_600SemiBold",
  },
  choiceTextSelected: {
    color: "#fff",
  },
  errorText: {
    color: "#FBBF24",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
  },
});