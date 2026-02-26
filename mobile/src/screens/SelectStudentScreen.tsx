import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { listStudents, Student } from "../lib/api";
import Avatar from "../components/Avatar";
import type { RecordStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RecordStackParamList, "SelectStudent">;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function SelectStudentScreen({ navigation }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listStudents()
        .then((s) => {
          setStudents(s);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to load students:", err);
          setError("Could not load students.");
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() =>
        navigation.navigate("ReadyToRecord", {
          studentId: item.id,
          studentName: item.name,
          studentInstrument: item.instrument,
          studentIndex: index,
        })
      }
    >
      <Avatar name={item.name} index={index} size={48} />
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentInstrument}>{item.instrument}</Text>
      </View>
      <Text style={styles.lastLesson}>
        {formatDate(item.created_at)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>NEW LESSON</Text>
        <Text style={styles.title}>Who are you teaching?</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <View style={styles.addStudentCard}>
            <Text style={styles.addStudentText}>+ Add new student</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No students yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a student to get started.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  studentName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  studentInstrument: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastLesson: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  addStudentCard: {
    borderRadius: RADII.medium,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    padding: 18,
    alignItems: "center",
    marginTop: 4,
  },
  addStudentText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 8,
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
  empty: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
