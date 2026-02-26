import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../lib/AuthContext";
import { COLORS, FONTS, FONT_SIZES } from "../lib/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (session) {
        navigation.replace("Main");
      } else {
        navigation.replace("Login");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [loading, session, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orpheus</Text>
      <Text style={styles.subtitle}>Teach. We'll handle the notes.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES["4xl"],
    color: COLORS.accentText,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
    opacity: 0.7,
    marginTop: 8,
  },
});
