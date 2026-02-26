import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { getLatestCompletedLesson, Lesson } from "../lib/api";
import Avatar from "../components/Avatar";
import type { RecordStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RecordStackParamList, "ReadyToRecord">;

export default function ReadyToRecordScreen({ route, navigation }: Props) {
  const { studentId, studentName, studentInstrument, studentIndex } =
    route.params;
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(true);

  useEffect(() => {
    getLatestCompletedLesson(studentId)
      .then((l) => setPrevLesson(l))
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [studentId]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.studentSection}>
        <Avatar name={studentName} index={studentIndex} size={80} />
        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.studentInstrument}>{studentInstrument}</Text>
      </View>

      {/* Pre-lesson brief */}
      {loadingPrev ? (
        <ActivityIndicator
          color={COLORS.accent}
          style={{ marginVertical: 20 }}
        />
      ) : prevLesson ? (
        <View style={styles.briefCard}>
          <Text style={styles.briefTitle}>Last Lesson</Text>
          {prevLesson.teacher_summary && (
            <Text style={styles.briefText} numberOfLines={6}>
              {prevLesson.teacher_summary}
            </Text>
          )}
          {prevLesson.suggested_assignments &&
            prevLesson.suggested_assignments.length > 0 && (
              <View style={styles.assignmentsSection}>
                <Text style={styles.assignmentsLabel}>Assignments</Text>
                {prevLesson.suggested_assignments.map((a, i) => (
                  <Text key={i} style={styles.assignmentItem}>
                    {"\u2022"} {(a as Record<string, string>).description}
                  </Text>
                ))}
              </View>
            )}
        </View>
      ) : (
        <View style={styles.briefCard}>
          <Text style={styles.briefTitle}>
            First lesson with {studentName}!
          </Text>
          <Text style={styles.briefText}>
            No previous lesson data. The summary will start fresh.
          </Text>
        </View>
      )}

      {/* Record button */}
      <TouchableOpacity
        style={styles.recordButton}
        onPress={() =>
          navigation.navigate("RecordingActive", {
            studentId,
            studentName,
            studentInstrument,
            studentIndex,
          })
        }
      >
        <View style={styles.recordButtonInner} />
      </TouchableOpacity>
      <Text style={styles.recordHint}>Tap to start recording</Text>

      <TouchableOpacity
        style={styles.differentStudent}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.differentStudentText}>
          {"\u2190"} Different student
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  studentSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  studentName: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  studentInstrument: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  briefCard: {
    width: "100%",
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.medium,
    padding: 16,
    marginBottom: 32,
  },
  briefTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginBottom: 8,
  },
  briefText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  assignmentsSection: {
    marginTop: 12,
  },
  assignmentsLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
    marginBottom: 4,
  },
  assignmentItem: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
    marginLeft: 4,
  },
  recordButton: {
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
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.recording,
  },
  recordHint: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: 32,
  },
  differentStudent: {
    paddingVertical: 8,
  },
  differentStudentText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
});
