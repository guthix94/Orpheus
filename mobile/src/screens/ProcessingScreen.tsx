import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import Avatar from "../components/Avatar";
import type { RecordStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RecordStackParamList, "Processing">;

export default function ProcessingScreen({ route, navigation }: Props) {
  const { studentName, studentIndex } = route.params;

  return (
    <View style={styles.container}>
      <Avatar name={studentName} index={studentIndex} size={64} />

      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={{ marginVertical: 24 }}
      />

      <Text style={styles.title}>Processing your lesson...</Text>
      <Text style={styles.subtitle}>
        We'll notify you when it's ready. This usually takes about 2 minutes.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
});
