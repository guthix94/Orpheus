import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { getLesson } from "../lib/api";
import Avatar from "../components/Avatar";
import type { RecordStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RecordStackParamList, "Processing">;

const STEPS = [
  { key: "uploading", label: "Uploading audio" },
  { key: "analyzing", label: "Analyzing speech" },
  { key: "generating", label: "Generating summary" },
  { key: "complete", label: "Complete" },
];

export default function ProcessingScreen({ route, navigation }: Props) {
  const { lessonId, studentName, studentIndex } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Animate through early steps while waiting
    const stepTimer = setTimeout(() => {
      if (mountedRef.current && currentStep === 0) setCurrentStep(1);
    }, 2000);

    const stepTimer2 = setTimeout(() => {
      if (mountedRef.current && currentStep <= 1) setCurrentStep(2);
    }, 5000);

    // Poll every 3 seconds
    const poll = async () => {
      try {
        const lesson = await getLesson(lessonId);
        if (!mountedRef.current) return;

        if (lesson.status === "completed") {
          setCurrentStep(3);
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Navigate to lesson summary after a brief delay
          setTimeout(() => {
            if (!mountedRef.current) return;
            // Navigate to HomeTab's LessonSummary via the tab navigator
            const tabNav = navigation.getParent();
            tabNav?.navigate("HomeTab", {
              screen: "HomeLessonSummary",
              params: {
                lessonId: lesson.id,
                studentName,
                studentIndex,
              },
            });
          }, 800);
        } else if (lesson.status === "failed") {
          setFailed(true);
          setErrorMsg("Processing failed. Please try again.");
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (lesson.status === "processing") {
          // Continue polling — advance visual step if still early
          if (currentStep < 2) setCurrentStep(2);
        }
      } catch (err) {
        // Don't fail on network blips — just retry next interval
        console.warn("Polling error:", err);
      }
    };

    // Check immediately in case already completed
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      mountedRef.current = false;
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lessonId]);

  return (
    <View style={styles.container}>
      <Avatar name={studentName} index={studentIndex} size={64} />

      <View style={styles.stepsContainer}>
        {STEPS.map((step, i) => {
          const isActive = i === currentStep && !failed;
          const isDone = i < currentStep && !failed;
          const isFailed = failed && i === currentStep;

          return (
            <View key={step.key} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isActive && styles.stepDotActive,
                  isFailed && styles.stepDotFailed,
                ]}
              >
                {isDone && <Text style={styles.checkmark}>✓</Text>}
                {isActive && (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                )}
                {isFailed && <Text style={styles.failMark}>✕</Text>}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isDone && styles.stepLabelDone,
                  isActive && styles.stepLabelActive,
                  isFailed && styles.stepLabelFailed,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {!failed && currentStep < 3 && (
        <Text style={styles.subtitle}>
          This usually takes about 2 minutes.
        </Text>
      )}

      {currentStep === 3 && !failed && (
        <Text style={styles.successText}>Lesson summary ready!</Text>
      )}

      {failed && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, failed && styles.buttonFailed]}
        onPress={() => navigation.popToTop()}
      >
        <Text style={[styles.buttonText, failed && styles.buttonTextFailed]}>
          Back to Dashboard
        </Text>
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
  stepsContainer: {
    marginTop: 28,
    marginBottom: 20,
    alignSelf: "stretch",
    paddingHorizontal: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepDotDone: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  stepDotActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  stepDotFailed: {
    backgroundColor: COLORS.recordingLight,
    borderColor: COLORS.recording,
  },
  checkmark: {
    color: COLORS.success,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  failMark: {
    color: COLORS.recording,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  stepLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
  },
  stepLabelDone: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  stepLabelFailed: {
    color: COLORS.recording,
    fontFamily: FONTS.semiBold,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  successText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.success,
    textAlign: "center",
    marginBottom: 32,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.recording,
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
  buttonFailed: {
    backgroundColor: COLORS.recordingLight,
  },
  buttonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  buttonTextFailed: {
    color: COLORS.recording,
  },
});
