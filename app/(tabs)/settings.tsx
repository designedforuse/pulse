import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { getProviders } from "@/lib/data";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const providers = getProviders();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12,
            paddingBottom: Platform.OS === "web" ? 34 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.headerTitle}>Settings</Text>
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
            {providers.map((provider, index) => (
              <React.Fragment key={provider.id}>
                {index > 0 && <View style={styles.divider} />}
                <SettingsRow
                  icon="tv-outline"
                  label={provider.name}
                  value={provider.packageName}
                  valueSmall
                />
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.card}>
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>1</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Pick a viewing mode based on your schedule
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>2</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Browse sport packs and find events
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.howItWorksItem}>
              <View style={[styles.stepBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.stepText, { color: Colors.accent }]}>3</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Tap an event and open it in your streaming app
              </Text>
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
  howItWorksText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
});
