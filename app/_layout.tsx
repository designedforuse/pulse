import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, getApiUrl } from "@/lib/query-client";
import { EventsProvider } from "@/lib/events-context";
import { ScoresProvider } from "@/lib/scores-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { RitualOverridesProvider } from "@/lib/ritual-overrides-context";
import { ProvidersProvider } from "@/lib/providers-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import Colors from "@/constants/colors";

function triggerScheduleRefresh() {
  const url = new URL("/api/refresh", getApiUrl()).toString();
  fetch(url, { method: "POST" }).catch(() => {});
}

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="mode/[id]"
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: "Stories",
        }}
      />
      <Stack.Screen
        name="guide/[id]"
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: "Home",
        }}
      />
      <Stack.Screen
        name="narrative/[id]"
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: "Stories",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: "Settings",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="daily-wrap-full"
        options={{
          headerShown: true,
          title: "Daily Wrap",
          headerBackTitle: "Stories",
        }}
      />
      <Stack.Screen
        name="event-sheet"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.42],
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: Colors.card },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Refresh schedule on initial launch
    triggerScheduleRefresh();

    // Refresh schedule whenever the app returns to the foreground
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        triggerScheduleRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProvidersProvider>
          <EventsProvider>
            <FavoritesProvider>
              <RitualOverridesProvider>
                <ScoresProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </ScoresProvider>
              </RitualOverridesProvider>
            </FavoritesProvider>
          </EventsProvider>
        </ProvidersProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
