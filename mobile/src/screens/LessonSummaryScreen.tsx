import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import * as Clipboard from "expo-clipboard";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { getLesson, getStudent, toggleClipShare, Lesson, Student, Clip } from "../lib/api";
import Avatar from "../components/Avatar";

interface Props {
  lessonId: string;
  studentName?: string;
  studentIndex?: number;
  onBack?: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
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

function formatClipDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Handles both plain strings and JSON-stringified summaries from the API.
 */
function extractText(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (typeof parsed === "object" && parsed.text) return parsed.text;
  } catch {
    // Not JSON — return as-is
  }
  return raw;
}

function ClipPlayer({ clip, lessonId }: { clip: Clip; lessonId: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(clip.duration);
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState(clip.shared_with_parent ?? false);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const handlePlay = async () => {
    try {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      setLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: clip.url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            if (status.durationMillis) {
              setDuration(status.durationMillis / 1000);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.warn("Audio playback error:", err);
      Alert.alert("Playback Error", "Could not play this audio clip.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShare = async () => {
    try {
      setShared(!shared);
      await toggleClipShare(lessonId, clip.index);
    } catch {
      setShared(shared); // revert
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={clipStyles.container}>
      <View style={clipStyles.row}>
        <TouchableOpacity
          style={clipStyles.playButton}
          onPress={handlePlay}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={clipStyles.playIcon}>{isPlaying ? "⏸" : "▶"}</Text>
          )}
        </TouchableOpacity>

        <View style={clipStyles.progressArea}>
          {clip.label && (
            <Text style={clipStyles.label} numberOfLines={1}>
              {clip.label}
            </Text>
          )}
          <View style={clipStyles.progressBar}>
            <View
              style={[clipStyles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <View style={clipStyles.timeRow}>
            <Text style={clipStyles.time}>
              {formatClipDuration(position)}
            </Text>
            <Text style={clipStyles.time}>
              {formatClipDuration(duration)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={clipStyles.shareRow} onPress={handleToggleShare}>
        <View
          style={[
            clipStyles.checkbox,
            shared && clipStyles.checkboxChecked,
          ]}
        >
          {shared && <Text style={clipStyles.checkIcon}>✓</Text>}
        </View>
        <View>
          <Text style={clipStyles.shareText}>Share with parent</Text>
          {shared && (
            <Text style={clipStyles.shareSubtext}>Visible on portal</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function LessonSummaryScreen({
  lessonId,
  studentName: initialStudentName,
  studentIndex: initialStudentIndex,
  onBack,
}: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const studentName = student?.name ?? initialStudentName ?? "Student";
  const studentIdx = initialStudentIndex ?? 0;

  const fetchData = useCallback(async () => {
    try {
      const l = await getLesson(lessonId);
      setLesson(l);
      try {
        const s = await getStudent(l.student_id);
        setStudent(s);
      } catch {
        // Student fetch failed — use route params
      }
    } catch (err) {
      setError("Could not load lesson data.");
      console.error("Lesson fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyParentMessage = async () => {
    const text = extractText(lesson?.parent_summary ?? null);
    if (!text) return;

    // Build message with assignments
    let message = text;
    if (lesson?.suggested_assignments && lesson.suggested_assignments.length > 0) {
      message += "\n\nPractice Assignments:\n";
      lesson.suggested_assignments.forEach((a, i) => {
        message += `\n${i + 1}. ${a.description}`;
        if (a.details) message += ` — ${a.details}`;
      });
    }

    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Lesson not found."}</Text>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const teacherSummary = extractText(lesson.teacher_summary);
  const parentSummary = extractText(lesson.parent_summary);
  const pieces = lesson.pieces_detected ?? [];
  const assignments = lesson.suggested_assignments ?? [];
  const clips = (lesson.clips ?? []) as Clip[];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.headerBack}>
            <Text style={styles.headerBackText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Avatar name={studentName} index={studentIdx} size={48} />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{studentName}</Text>
            <Text style={styles.headerMeta}>
              {formatDate(lesson.started_at)}
              {lesson.duration_seconds
                ? ` · ${formatDuration(lesson.duration_seconds)}`
                : ""}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              lesson.status === "completed" && styles.statusCompleted,
              lesson.status === "failed" && styles.statusFailed,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                lesson.status === "completed" && styles.statusTextCompleted,
                lesson.status === "failed" && styles.statusTextFailed,
              ]}
            >
              {lesson.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Pieces */}
      {pieces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pieces</Text>
          <View style={styles.chipRow}>
            {pieces.map((p, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Teacher Summary */}
      {teacherSummary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.card}>
            <Text style={styles.summaryText}>{teacherSummary}</Text>
          </View>
        </View>
      ) : null}

      {/* Audio Clips */}
      {clips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Clips</Text>
          {clips.map((clip) => (
            <ClipPlayer key={clip.index} clip={clip} lessonId={lesson.id} />
          ))}
        </View>
      )}

      {/* Assignments */}
      {assignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Assignments</Text>
          {assignments.map((a, i) => (
            <View key={a.id ?? i} style={styles.assignmentItem}>
              <Text style={styles.assignmentNumber}>{i + 1}</Text>
              <View style={styles.assignmentContent}>
                <Text style={styles.assignmentDesc}>{a.description}</Text>
                {a.details && (
                  <Text style={styles.assignmentDetails}>{a.details}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Parent Message */}
      {parentSummary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Message</Text>
          <View style={styles.parentCard}>
            <Text style={styles.parentText}>{parentSummary}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyParentMessage}
          >
            <Text style={styles.copyButtonText}>
              {copied ? "Copied!" : "Copy Message"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Send to Parent */}
      {parentSummary ? (
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleCopyParentMessage}
        >
          <Text style={styles.sendButtonText}>
            {copied ? "Copied to Clipboard!" : "Send to Parent"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const clipStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  playIcon: {
    fontSize: 16,
    color: COLORS.accent,
  },
  progressArea: {
    flex: 1,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  time: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkIcon: {
    color: COLORS.accentText,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  shareText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  shareSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: 1,
  },
});

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
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.recording,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  header: {
    marginBottom: 20,
  },
  headerBack: {
    marginBottom: 12,
  },
  headerBackText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: COLORS.accent,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  headerMeta: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  statusTextFailed: {
    color: COLORS.recording,
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  summaryText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
  assignmentItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  assignmentNumber: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    width: 24,
    marginTop: 1,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentDesc: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 20,
  },
  assignmentDetails: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  parentCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  parentText: {
    fontFamily: FONTS.serifItalic,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 24,
  },
  copyButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.small,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingVertical: 16,
    alignItems: "center",
  },
  sendButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
});
