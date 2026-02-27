import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS, FONTS, FONT_SIZES } from "../lib/theme";
import DashboardScreen from "../screens/DashboardScreen";
import SelectStudentScreen from "../screens/SelectStudentScreen";
import ReadyToRecordScreen from "../screens/ReadyToRecordScreen";
import RecordingActiveScreen from "../screens/RecordingActiveScreen";
import ProcessingScreen from "../screens/ProcessingScreen";
import StudentsListScreen from "../screens/StudentsListScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import LessonsListScreen from "../screens/LessonsListScreen";
import LessonSummaryScreen from "../screens/LessonSummaryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import type {
  MainTabParamList,
  RecordStackParamList,
  StudentsStackParamList,
  LessonsStackParamList,
  HomeStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const RecordStack = createNativeStackNavigator<RecordStackParamList>();
const StudentsStack = createNativeStackNavigator<StudentsStackParamList>();
const LessonsStackNav = createNativeStackNavigator<LessonsStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// Simple icon component — avoids a vector icons dependency
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    Home: "\u2302",
    Students: "\u263A",
    Record: "\u25CF",
    Lessons: "\u2630",
    Settings: "\u2699",
  };
  return (
    <Text
      style={{
        fontSize: name === "Record" ? 28 : 20,
        color: focused ? COLORS.accent : COLORS.textMuted,
      }}
    >
      {iconMap[name] ?? "?"}
    </Text>
  );
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.lg },
  headerShadowVisible: false,
  headerBackTitle: "",
};

// ── Home Tab Stack ────────────────────────────────────────────────

function HomeLessonSummaryWrapper({
  route,
  navigation,
}: {
  route: { params: HomeStackParamList["HomeLessonSummary"] };
  navigation: any;
}) {
  const { lessonId, studentName, studentIndex } = route.params;
  return (
    <LessonSummaryScreen
      lessonId={lessonId}
      studentName={studentName}
      studentIndex={studentIndex}
      onBack={() => navigation.goBack()}
    />
  );
}

function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="HomeLessonSummary"
        component={HomeLessonSummaryWrapper as any}
        options={{ title: "Lesson Summary" }}
      />
    </HomeStack.Navigator>
  );
}

// ── Record Tab Stack ──────────────────────────────────────────────

function RecordFlow() {
  return (
    <RecordStack.Navigator
      screenOptions={{
        ...stackScreenOptions,
        headerBackTitle: "",
      }}
    >
      <RecordStack.Screen
        name="SelectStudent"
        component={SelectStudentScreen}
        options={{ title: "New Lesson" }}
      />
      <RecordStack.Screen
        name="ReadyToRecord"
        component={ReadyToRecordScreen}
        options={{ title: "" }}
      />
      <RecordStack.Screen
        name="RecordingActive"
        component={RecordingActiveScreen}
        options={{
          title: "",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <RecordStack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{
          title: "",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </RecordStack.Navigator>
  );
}

// ── Students Tab Stack ────────────────────────────────────────────

function StudentProfileWrapper({
  route,
  navigation,
}: {
  route: { params: StudentsStackParamList["StudentProfile"] };
  navigation: any;
}) {
  const { studentId, studentName, studentIndex } = route.params;
  return (
    <StudentProfileScreen
      studentId={studentId}
      studentName={studentName}
      studentIndex={studentIndex}
    />
  );
}

function StudentsLessonSummaryWrapper({
  route,
  navigation,
}: {
  route: { params: StudentsStackParamList["LessonSummary"] };
  navigation: any;
}) {
  const { lessonId, studentName, studentIndex } = route.params;
  return (
    <LessonSummaryScreen
      lessonId={lessonId}
      studentName={studentName}
      studentIndex={studentIndex}
      onBack={() => navigation.goBack()}
    />
  );
}

function StudentsTabStack() {
  return (
    <StudentsStack.Navigator screenOptions={stackScreenOptions}>
      <StudentsStack.Screen
        name="StudentsList"
        component={StudentsListScreen}
        options={{ headerShown: false }}
      />
      <StudentsStack.Screen
        name="StudentProfile"
        component={StudentProfileWrapper as any}
        options={({ route }: any) => ({
          title: route.params?.studentName ?? "Student",
        })}
      />
      <StudentsStack.Screen
        name="LessonSummary"
        component={StudentsLessonSummaryWrapper as any}
        options={{ title: "Lesson Summary" }}
      />
    </StudentsStack.Navigator>
  );
}

// ── Lessons Tab Stack ─────────────────────────────────────────────

function LessonsLessonDetailWrapper({
  route,
  navigation,
}: {
  route: { params: LessonsStackParamList["LessonDetail"] };
  navigation: any;
}) {
  const { lessonId, studentName, studentIndex } = route.params;
  return (
    <LessonSummaryScreen
      lessonId={lessonId}
      studentName={studentName}
      studentIndex={studentIndex}
      onBack={() => navigation.goBack()}
    />
  );
}

function LessonsTabStack() {
  return (
    <LessonsStackNav.Navigator screenOptions={stackScreenOptions}>
      <LessonsStackNav.Screen
        name="LessonsList"
        component={LessonsListScreen}
        options={{ headerShown: false }}
      />
      <LessonsStackNav.Screen
        name="LessonDetail"
        component={LessonsLessonDetailWrapper as any}
        options={{ title: "Lesson Summary" }}
      />
    </LessonsStackNav.Navigator>
  );
}

// ── Main Tab Navigator ────────────────────────────────────────────

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.borderLight,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 10,
        },
        tabBarIcon: ({ focused }) => {
          const nameMap: Record<string, string> = {
            HomeTab: "Home",
            StudentsTab: "Students",
            RecordTab: "Record",
            LessonsTab: "Lessons",
            SettingsTab: "Settings",
          };
          return <TabIcon name={nameMap[route.name] ?? ""} focused={focused} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStack}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="StudentsTab"
        component={StudentsTabStack}
        options={{ tabBarLabel: "Students" }}
      />
      <Tab.Screen
        name="RecordTab"
        component={RecordFlow}
        options={{
          tabBarLabel: "Record",
          tabBarIcon: ({ focused }) => (
            <View style={recordTabStyles.button}>
              <View
                style={[
                  recordTabStyles.inner,
                  focused && recordTabStyles.innerFocused,
                ]}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="LessonsTab"
        component={LessonsTabStack}
        options={{ tabBarLabel: "Lessons" }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}

const recordTabStyles = StyleSheet.create({
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accentText,
  },
  innerFocused: {
    borderRadius: 4,
  },
});
