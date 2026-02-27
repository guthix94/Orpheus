import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { listLessons, listStudents, Lesson, Student } from "../lib/api";
import Avatar from "../components/Avatar";
import type { LessonsStackParamList } from "../navigation/types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export default function LessonsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<LessonsStackParamList>>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const studentMap = React.useMemo(() => {
    const m: Record<string, Student> = {};
    students.forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [students]);

  const studentIndexMap = React.useMemo(() => {
    const m: Record<string, number> = {};
    students.forEach((s, i) => {
      m[s.id] = i;
    });
    return m;
  }, [students]);

  const fetchData = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([listLessons(), listStudents()]);
      setLessons(l);
      setStudents(s);
    } catch (err) {
      console.error("Lessons fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLessonPress = (item: Lesson) => {
    const student = studentMap[item.student_id];
    const idx = studentIndexMap[item.student_id] ?? 0;

    if (item.status === "completed") {
      navigation.navigate("LessonDetail", {
        lessonId: item.id,
        studentName: student?.name,
        studentIndex: idx,
      });
    }
    // Processing lessons could navigate to processing screen,
    // but the processing screen is in the RecordTab stack — just ignore for now
  };

  const renderLesson = ({ item }: { item: Lesson }) => {
    const student = studentMap[item.student_id];
    const idx = studentIndexMap[item.student_id] ?? 0;
    const pieces = item.pieces_detected ?? [];

    return (
      <TouchableOpacity
        style={styles.lessonCard}
        onPress={() => handleLessonPress(item)}
        disabled={item.status !== "completed"}
      >
        <Avatar name={student?.name ?? "?"} index={idx} size={44} />
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonStudent} numberOfLines={1}>
            {student?.name ?? "Unknown Student"}
          </Text>
          <Text style={styles.lessonMeta}>
            {formatDate(item.started_at)} · {formatTime(item.started_at)}
            {item.duration_seconds
              ? ` · ${formatDuration(item.duration_seconds)}`
              : ""}
          </Text>
          {pieces.length > 0 && (
            <View style={styles.chipRow}>
              {pieces.slice(0, 3).map((p, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === "completed" && styles.statusCompleted,
            item.status === "processing" && styles.statusProcessing,
            item.status === "failed" && styles.statusFailed,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "completed" && styles.statusTextCompleted,
              item.status === "processing" && styles.statusTextProcessing,
              item.status === "failed" && styles.statusTextFailed,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Lessons</Text>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderLesson}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No lessons yet</Text>
            <Text style={styles.emptySubtitle}>
              Record your first lesson to see it here.
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
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lessonStudent: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  lessonMeta: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  chip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.tag,
    marginLeft: 8,
  },
  statusCompleted: {
    backgroundColor: COLORS.successLight,
  },
  statusProcessing: {
    backgroundColor: COLORS.infoLight,
  },
  statusFailed: {
    backgroundColor: COLORS.recordingLight,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
  statusTextProcessing: {
    color: COLORS.info,
  },
  statusTextFailed: {
    color: COLORS.recording,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
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
    textAlign: "center",
  },
});
