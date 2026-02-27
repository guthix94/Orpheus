import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES, RADII } from "../lib/theme";
import { listStudents, listLessons, createStudent, Student, Lesson } from "../lib/api";
import Avatar from "../components/Avatar";
import type { StudentsStackParamList } from "../navigation/types";

export default function StudentsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<StudentsStackParamList>>();
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstrument, setNewInstrument] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([listStudents(), listLessons()]);
      setStudents(s);
      setLessons(l);
    } catch (err) {
      console.error("Students fetch error:", err);
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

  // Build lesson count map and most recent piece per student
  const studentLessonInfo = React.useMemo(() => {
    const info: Record<
      string,
      { count: number; latestPiece: string | null }
    > = {};
    lessons.forEach((l) => {
      if (!info[l.student_id]) {
        info[l.student_id] = { count: 0, latestPiece: null };
      }
      info[l.student_id].count++;
      if (
        !info[l.student_id].latestPiece &&
        l.pieces_detected &&
        l.pieces_detected.length > 0
      ) {
        info[l.student_id].latestPiece = l.pieces_detected[0];
      }
    });
    return info;
  }, [lessons]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.current_pieces ?? []).some((p) => p.toLowerCase().includes(q))
    );
  }, [students, search]);

  const handleCreateStudent = async () => {
    if (!newName.trim()) {
      Alert.alert("Name required", "Please enter the student's name.");
      return;
    }
    if (!newInstrument.trim()) {
      Alert.alert(
        "Instrument required",
        "Please enter the student's instrument."
      );
      return;
    }
    setCreating(true);
    try {
      await createStudent({
        name: newName.trim(),
        instrument: newInstrument.trim(),
      });
      setModalVisible(false);
      setNewName("");
      setNewInstrument("");
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Could not create student. Please try again.");
      console.error("Create student error:", err);
    } finally {
      setCreating(false);
    }
  };

  const renderStudent = ({
    item,
    index,
  }: {
    item: Student;
    index: number;
  }) => {
    const info = studentLessonInfo[item.id];
    const lessonCount = info?.count ?? 0;
    const latestPiece =
      item.current_pieces && item.current_pieces.length > 0
        ? item.current_pieces[0]
        : info?.latestPiece ?? null;

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() =>
          navigation.navigate("StudentProfile", {
            studentId: item.id,
            studentName: item.name,
            studentIndex: index,
          })
        }
      >
        <Avatar name={item.name} index={index} size={48} />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.studentInstrument}>{item.instrument}</Text>
          {latestPiece && (
            <Text style={styles.studentPiece} numberOfLines={1}>
              {latestPiece}
            </Text>
          )}
        </View>
        {lessonCount > 0 && (
          <View style={styles.lessonCountChip}>
            <Text style={styles.lessonCountText}>
              {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Students</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Student</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {search ? "No matching students" : "No students yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? "Try a different search term."
                : "Add your first student to get started."}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyButtonText}>Add Student</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add Student Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Student</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Student's full name"
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
              autoFocus
            />

            <Text style={styles.fieldLabel}>Instrument</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Violin, Piano, Cello"
              placeholderTextColor={COLORS.textMuted}
              value={newInstrument}
              onChangeText={setNewInstrument}
              autoCapitalize="words"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setNewName("");
                  setNewInstrument("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  creating && styles.saveButtonDisabled,
                ]}
                onPress={handleCreateStudent}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.accentText} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["2xl"],
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  addButton: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADII.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADII.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  listContent: {
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
    marginLeft: 12,
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
    marginTop: 1,
  },
  studentPiece: {
    fontFamily: FONTS.serifItalic,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  lessonCountChip: {
    backgroundColor: COLORS.tag,
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lessonCountText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
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
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.medium,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADII.large,
    borderTopRightRadius: RADII.large,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADII.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADII.medium,
    backgroundColor: COLORS.bgSurface,
  },
  cancelButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADII.medium,
    backgroundColor: COLORS.accent,
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.accentText,
  },
});
