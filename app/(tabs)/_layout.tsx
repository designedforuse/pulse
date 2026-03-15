import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import Colors from "@/constants/colors";

const TAB_COLORS = {
  watch: "#818CF8",
  rituals: "#35C7A5",
  stories: "#FF4FBA",
};

function GradientFlashIcon({ focused }: { focused: boolean }) {
  const opacity = focused ? 1 : 0.45;
  return (
    <View style={[tabIconStyles.wrap, focused && tabIconStyles.wrapFocused]}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id="flashGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7C3AED" stopOpacity={opacity} />
            <Stop offset="0.5" stopColor="#1CB0F6" stopOpacity={opacity} />
            <Stop offset="1" stopColor="#58CC02" stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Path
          d="M14.5 1L2.5 13.5H10L8 23L21.5 10.5H14L14.5 1Z"
          fill="url(#flashGrad)"
        />
      </Svg>
    </View>
  );
}

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
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  wrapFocused: {
    borderColor: "rgba(255,255,255,0.1)",
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
  const insets = useSafeAreaInsets();

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
          height: isWeb ? 84 : undefined,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 12,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
          ) : null,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="watch"
        options={{
          title: "Watch",
          tabBarIcon: ({ focused }) => <GradientFlashIcon focused={focused} />,
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
