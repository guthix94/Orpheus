import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "../lib/AuthContext";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";

export default function SettingsScreen() {
  const { signOut, user } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {user?.email && (
        <Text style={styles.email}>{user.email}</Text>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    marginBottom: 8,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  signOutButton: {
    backgroundColor: COLORS.recordingLight,
    borderRadius: RADII.medium,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.recording,
  },
});
