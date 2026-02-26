import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../lib/AuthContext";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        Alert.alert(
          "Check your email",
          "We sent you a confirmation link. Please verify your email before signing in."
        );
      } else {
        await signIn(email.trim(), password);
        navigation.replace("Main");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert("Password reset", "Check your email for a reset link.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not send reset email";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Orpheus</Text>
        <Text style={styles.tagline}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.accentText} />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        {!isSignUp && (
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.linkText}>
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  logo: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES["3xl"],
    color: COLORS.accent,
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: COLORS.recordingLight,
    borderRadius: RADII.small,
    padding: 12,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.recording,
    textAlign: "center",
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.medium,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  linkText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    textAlign: "center",
    paddingVertical: 4,
  },
});
