import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import {
  getStudent,
  listLessons,
  generatePortalToken,
  Student,
  Lesson,
} from "../lib/api";
import Avatar from "../components/Avatar";
import { ENV } from "../lib/env";
import type { StudentsStackParamList } from "../navigation/types";

interface Props {
  studentId: string;
  studentName: string;
  studentIndex: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export default function StudentProfileScreen({
  studentId,
  studentName: initialName,
  studentIndex,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<StudentsStackParamList>>();
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        getStudent(studentId),
        listLessons({ studentId }),
      ]);
      setStudent(s);
      setLessons(l);
      if (s.parent_portal_token) setPortalToken(s.parent_portal_token);
    } catch (err) {
      console.error("Student profile fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await generatePortalToken(studentId);
      setPortalToken(result.parent_portal_token);
    } catch (err) {
      Alert.alert("Error", "Could not generate portal link.");
      console.error("Portal token error:", err);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!portalToken) return;
    const portalUrl = `${ENV.WEB_APP_URL}/parent/${portalToken}`;
    await Clipboard.setStringAsync(portalUrl);
    setCopiedPortal(true);
    setTimeout(() => setCopiedPortal(false), 2000);
  };

  const handleRecordLesson = () => {
    // Navigate to the record tab's ReadyToRecord screen
    const rootNav = navigation.getParent();
    rootNav?.navigate("RecordTab", {
      screen: "ReadyToRecord",
      params: {
        studentId,
        studentName: student?.name ?? initialName,
        studentInstrument: student?.instrument ?? "",
        studentIndex,
      },
    });
  };

  // Compute stats
  const totalLessons = lessons.length;
  const totalMinutes = lessons.reduce(
    (sum, l) => sum + (l.duration_seconds ?? 0) / 60,
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);
  const lastLessonDate = lessons.length > 0 ? lessons[0].started_at : null;

  const currentPieces = student?.current_pieces ?? [];

  const renderLesson = ({ item }: { item: Lesson }) => {
    const pieces = item.pieces_detected ?? [];
    const summary = item.teacher_summary ?? "";
    const excerpt =
      summary.length > 100 ? summary.substring(0, 100) + "..." : summary;

    return (
      <TouchableOpacity
        style={styles.lessonCard}
        onPress={() => {
          if (item.status === "completed") {
            navigation.navigate("LessonSummary", {
              lessonId: item.id,
              studentName: student?.name ?? initialName,
              studentIndex,
            });
          }
        }}
        disabled={item.status !== "completed"}
      >
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonDate}>{formatDate(item.started_at)}</Text>
          <Text style={styles.lessonDuration}>
            {formatDuration(item.duration_seconds)}
          </Text>
        </View>
        {pieces.length > 0 && (
          <View style={styles.lessonChipRow}>
            {pieces.slice(0, 3).map((p, i) => (
              <View key={i} style={styles.lessonChip}>
                <Text style={styles.lessonChipText} numberOfLines={1}>
                  {p}
                </Text>
              </View>
            ))}
          </View>
        )}
        {excerpt ? (
          <Text style={styles.lessonExcerpt} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}
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

  const name = student?.name ?? initialName;

  return (
    <FlatList
      style={styles.container}
      data={lessons}
      keyExtractor={(item) => item.id}
      renderItem={renderLesson}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <Avatar name={name} index={studentIndex} size={72} />
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileInstrument}>
              {student?.instrument ?? ""}
            </Text>
          </View>

          {/* Record Button */}
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordLesson}
          >
            <Text style={styles.recordButtonText}>Record Lesson</Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalLessons}</Text>
              <Text style={styles.statLabel}>Lessons</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalHours}h</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {lastLessonDate ? daysAgo(lastLessonDate) : "—"}
              </Text>
              <Text style={styles.statLabel}>Last Lesson</Text>
            </View>
          </View>

          {/* Current Repertoire */}
          {currentPieces.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Repertoire</Text>
              {currentPieces.map((p, i) => (
                <Text key={i} style={styles.pieceText}>
                  {p}
                </Text>
              ))}
            </View>
          )}

          {/* Parent Portal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parent Portal</Text>
            <View style={styles.portalCard}>
              {portalToken ? (
                <>
                  <Text style={styles.portalLabel}>Portal link active</Text>
                  <TouchableOpacity
                    style={styles.portalCopyButton}
                    onPress={handleCopyPortalLink}
                  >
                    <Text style={styles.portalCopyText}>
                      {copiedPortal ? "Copied!" : "Copy Link"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.portalLabel}>
                    Share lesson summaries with parents
                  </Text>
                  <TouchableOpacity
                    style={styles.portalGenerateButton}
                    onPress={handleGenerateToken}
                    disabled={generatingToken}
                  >
                    {generatingToken ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.accentText}
                      />
                    ) : (
                      <Text style={styles.portalGenerateText}>
                        Generate Link
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Lesson History Header */}
          {lessons.length > 0 && (
            <Text style={[styles.sectionTitle, { marginTop: 4 }]}>
              Lesson History
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No lessons yet for this student.</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  profileInstrument: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  recordButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
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
    marginBottom: 10,
  },
  pieceText: {
    fontFamily: FONTS.serifItalic,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 24,
  },
  portalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  portalLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  portalCopyButton: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADII.small,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  portalCopyText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  portalGenerateButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.small,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 100,
    alignItems: "center",
  },
  portalGenerateText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentText,
  },
  lessonCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  lessonDate: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  lessonDuration: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  lessonChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  lessonChip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lessonChipText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  lessonExcerpt: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  empty: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
