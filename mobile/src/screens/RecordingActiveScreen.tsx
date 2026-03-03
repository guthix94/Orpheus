import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { startLesson, stopLesson, uploadLessonAudio } from "../lib/api";
import { useRecording } from "../hooks/useRecording";
import type { RecordStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RecordStackParamList, "RecordingActive">;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RecordingActiveScreen({ route, navigation }: Props) {
  const { studentId, studentName, studentIndex } = route.params;
  const {
    isRecording,
    elapsed,
    error: recordError,
    startRecording,
    stopRecording,
  } = useRecording();

  const [lessonId, setLessonId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Pulsing dot animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isRecording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseAnim]);

  // Start recording and create lesson on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Step 1: Create lesson on backend
        const lesson = await startLesson(studentId);
        if (cancelled) return;
        setLessonId(lesson.id);

        // Step 2: Start recording (pass student name for Android notification)
        await startRecording(studentName);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to start";
          setInitError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = useCallback(async () => {
    console.log("[RecordingActive] handleStop called, lessonId:", lessonId);
    if (!lessonId) {
      console.warn("[RecordingActive] handleStop aborted — lessonId is null");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Stop recording, get audio file URI
      console.log("[RecordingActive] Stopping recording...");
      const audioUri = await stopRecording();
      console.log("[RecordingActive] audioUri:", audioUri);
      if (!audioUri) {
        Alert.alert("Error", "No audio was recorded.");
        setUploading(false);
        return;
      }

      // Step 2: Stop lesson on backend (status → "processing")
      // Send client-measured elapsed time so the server stores an accurate duration
      console.log("[RecordingActive] Stopping lesson on backend...");
      await stopLesson(lessonId, elapsed);

      // Step 3: Upload audio (triggers processing pipeline)
      console.log("[RecordingActive] Uploading audio...");
      const filename = `${lessonId}.m4a`;
      await uploadLessonAudio(lessonId, audioUri, filename, "audio/m4a");

      // Step 4: Navigate to processing screen
      console.log("[RecordingActive] Navigating to Processing screen");
      navigation.replace("Processing", {
        lessonId,
        studentName,
        studentIndex,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save lesson";
      console.error("[RecordingActive] handleStop error:", err);
      Alert.alert("Upload Error", msg);
      setUploading(false);
    }
  }, [lessonId, elapsed, stopRecording, navigation, studentName, studentIndex]);

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Could not start recording</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.uploadingText}>Saving your lesson...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Red status bar */}
      <View style={styles.statusBar}>
        <Animated.View
          style={[styles.recordingDot, { opacity: pulseAnim }]}
        />
        <Text style={styles.statusText}>Recording</Text>
      </View>

      {/* Student name */}
      <Text style={styles.studentName}>{studentName}</Text>

      {/* Timer */}
      <Text style={styles.timer}>{formatTimer(elapsed)}</Text>

      {/* Audio level placeholder */}
      <View style={styles.levelContainer}>
        <AudioLevelPlaceholder />
      </View>

      {recordError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{recordError}</Text>
        </View>
      )}

      {/* Stop button */}
      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleStop}
      >
        <View style={styles.stopButtonInner} />
      </TouchableOpacity>
      <Text style={styles.stopHint}>Tap to stop</Text>

      {/* Bottom tool buttons (visual only) */}
      <View style={styles.toolRow}>
        <View style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Metronome</Text>
        </View>
        <View style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Tuner</Text>
        </View>
      </View>
    </View>
  );
}

/** Animated placeholder since expo-audio does not expose real-time metering. */
function AudioLevelPlaceholder() {
  const bars = 5;
  const anims = useRef(
    Array.from({ length: bars }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 400 + i * 80,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400 + i * 80,
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={levelStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            levelStyles.bar,
            { opacity: anim, transform: [{ scaleY: anim }] },
          ]}
        />
      ))}
    </View>
  );
}

const levelStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
  },
  bar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: COLORS.recording,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    paddingTop: 20,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.recordingLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    marginBottom: 32,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.recording,
    marginRight: 8,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.recording,
  },
  studentName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 24,
  },
  timer: {
    fontFamily: FONTS.bold,
    fontSize: 64,
    color: COLORS.text,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
    marginBottom: 16,
  },
  levelContainer: {
    marginBottom: 40,
  },
  stopButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.bgCard,
    borderWidth: 4,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  stopButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: COLORS.recording,
  },
  stopHint: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: 40,
  },
  toolRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: "auto",
    marginBottom: 40,
  },
  toolButton: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADII.medium,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  toolButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: 12,
  },
  errorMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  uploadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  uploadingText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  errorBox: {
    backgroundColor: COLORS.recordingLight,
    borderRadius: RADII.small,
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  errorBoxText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.recording,
    textAlign: "center",
  },
});
