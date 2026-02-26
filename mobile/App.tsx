import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SourceSerif4_400Regular_Italic } from "@expo-google-fonts/source-serif-4";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "./src/lib/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/lib/theme";

// Keep the splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    SourceSerif4_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.accent,
        }}
      >
        <ActivityIndicator color={COLORS.accentText} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
