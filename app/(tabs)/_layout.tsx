import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";

const TAB_COLORS = {
  watch: "#1CB0F6",
  rituals: "#FF9600",
  stories: "#CE82FF",
};

function TabIcon({
  iconName,
  focused,
  color,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return (
    <View
      style={[
        tabIconStyles.wrap,
        focused && tabIconStyles.wrapFocused,
      ]}
    >
      <Ionicons name={iconName} size={24} color={color} />
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: {
    width: 46,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  wrapFocused: {
    borderColor: Colors.accent,
  },
});

function NativeTabLayout() {
  return (
    <NativeTabs initialRouteName="watch">
      <NativeTabs.Trigger name="watch">
        <Icon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} md="play-circle" />
        <Label>Watch</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rituals">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} md="grid-view" />
        <Label>Rituals</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "compass", selected: "compass.fill" }} md="explore" />
        <Label>Stories</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live" hidden />
      <NativeTabs.Trigger name="settings" hidden />
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      initialRouteName="watch"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="watch"
        options={{
          title: "Watch",
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="play-circle" color={TAB_COLORS.watch} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rituals"
        options={{
          title: "Rituals",
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="grid" color={TAB_COLORS.rituals} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Stories",
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="compass" color={TAB_COLORS.stories} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
