import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONTS } from "../lib/theme";

interface AvatarProps {
  name: string;
  index?: number;
  size?: number;
}

export default function Avatar({ name, size = 44 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[styles.text, { fontSize: size * 0.38 }]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgSurface,
  },
  text: {
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
});
