import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import Constants from "expo-constants";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../lib/AuthContext";
import { getProfile, updateDisplayName, Profile } from "../lib/api";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then((p) => {
          setProfile(p);
          setEditName(p.display_name ?? "");
        })
        .catch((err) => console.error("Profile fetch error:", err));
    }, [])
  );

  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert("Name required", "Please enter a display name.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateDisplayName(editName.trim());
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      Alert.alert("Error", "Could not update display name.");
      console.error("Update profile error:", err);
    } finally {
      setSaving(false);
    }
  };

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

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.version ?? "1.0.0";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Display Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Name</Text>
        <View style={styles.card}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.accentText} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setEditing(false);
                  setEditName(profile?.display_name ?? "");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {profile?.display_name ?? "Not set"}
              </Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <View style={styles.card}>
          <Text style={styles.emailText}>
            {user?.email ?? profile?.email ?? "—"}
          </Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Orpheus v{appVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.small,
    backgroundColor: COLORS.bgSurface,
  },
  editBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    paddingVertical: 4,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.small,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentText,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  emailText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  signOutButton: {
    backgroundColor: COLORS.recordingLight,
    borderRadius: RADII.medium,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.recording,
  },
  version: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: "auto",
    paddingBottom: 30,
  },
});
