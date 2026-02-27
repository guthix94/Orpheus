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
import { getProfile, listLessons, listStudents, Lesson, Student, Profile } from "../lib/api";
import Avatar from "../components/Avatar";
import type { HomeStackParamList } from "../navigation/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
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
      const [p, l, s] = await Promise.all([
        getProfile(),
        listLessons(),
        listStudents(),
      ]);
      setProfile(p);
      // Filter out orphaned "recording" lessons — they clutter the dashboard
      const displayable = l.filter((lesson: Lesson) => lesson.status !== "recording");
      setLessons(displayable.slice(0, 10));
      setStudents(s);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
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
    if (item.status === "completed") {
      const student = studentMap[item.student_id];
      const idx = studentIndexMap[item.student_id] ?? 0;
      navigation.navigate("HomeLessonSummary", {
        lessonId: item.id,
        studentName: student?.name,
        studentIndex: idx,
      });
    }
  };

  const handleStartLesson = () => {
    // Navigate to the Record tab's SelectStudent screen
    const tabNav = navigation.getParent();
    tabNav?.navigate("RecordTab");
  };

  const renderLesson = ({ item }: { item: Lesson }) => {
    const student = studentMap[item.student_id];
    const idx = studentIndexMap[item.student_id] ?? 0;
    const piece =
      item.pieces_detected && item.pieces_detected.length > 0
        ? item.pieces_detected[0]
        : null;

    return (
      <TouchableOpacity
        style={styles.lessonCard}
        onPress={() => handleLessonPress(item)}
        disabled={item.status !== "completed"}
      >
        <Avatar name={student?.name ?? "?"} index={idx} size={40} />
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonStudent} numberOfLines={1}>
            {student?.name ?? "Unknown Student"}
          </Text>
          {piece && (
            <Text style={styles.lessonPiece} numberOfLines={1}>
              {piece}
            </Text>
          )}
          <Text style={styles.lessonMeta}>
            {formatTime(item.started_at)}
            {item.duration_seconds
              ? ` · ${formatDuration(item.duration_seconds)}`
              : ""}
          </Text>
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

  const displayName = profile?.display_name ?? profile?.email ?? "";

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      data={lessons}
      keyExtractor={(item) => item.id}
      renderItem={renderLesson}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}
            {displayName ? `, ${displayName}` : ""}
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartLesson}
          >
            <Text style={styles.startButtonText}>Start Lesson</Text>
          </TouchableOpacity>

          {lessons.length > 0 && (
            <Text style={styles.sectionTitle}>Recent Lessons</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No lessons yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Start Lesson" to record your first lesson.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  startButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
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
  lessonPiece: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lessonMeta: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.tag,
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
    textAlign: "center",
  },
});
