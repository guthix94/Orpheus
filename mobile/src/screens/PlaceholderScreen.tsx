import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONTS, FONT_SIZES } from "../lib/theme";

interface Props {
  title: string;
}

export default function PlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
});
