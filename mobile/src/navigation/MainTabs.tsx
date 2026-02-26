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
import PlaceholderScreen from "../screens/PlaceholderScreen";
import SettingsScreen from "../screens/SettingsScreen";
import type { MainTabParamList, RecordStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const RecordStack = createNativeStackNavigator<RecordStackParamList>();

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

function HomeStack() {
  // Dashboard can navigate into the record flow too (via "Start Lesson")
  const Stack = createNativeStackNavigator<RecordStackParamList>();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SelectStudent" component={DashboardAsHome} />
    </Stack.Navigator>
  );
}

function DashboardAsHome() {
  return <DashboardScreen />;
}

function RecordFlow() {
  return (
    <RecordStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.lg },
        headerShadowVisible: false,
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

function StudentsPlaceholder() {
  return <PlaceholderScreen title="Students" />;
}

function LessonsPlaceholder() {
  return <PlaceholderScreen title="Lessons" />;
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === "HomeTab",
        headerTitle: "",
        headerStyle: { backgroundColor: COLORS.bg },
        headerShadowVisible: false,
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
        component={DashboardScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="StudentsTab"
        component={StudentsPlaceholder}
        options={{ tabBarLabel: "Students" }}
      />
      <Tab.Screen
        name="RecordTab"
        component={RecordFlow}
        options={{
          tabBarLabel: "Record",
          headerShown: false,
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
        component={LessonsPlaceholder}
        options={{ tabBarLabel: "Lessons" }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: "Settings", headerShown: false }}
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
