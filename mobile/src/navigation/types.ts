export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
};

export type RecordStackParamList = {
  SelectStudent: undefined;
  ReadyToRecord: {
    studentId: string;
    studentName: string;
    studentInstrument: string;
    studentIndex: number;
  };
  RecordingActive: {
    studentId: string;
    studentName: string;
    studentInstrument: string;
    studentIndex: number;
  };
  Processing: {
    lessonId: string;
    studentName: string;
    studentIndex: number;
  };
};

export type MainTabParamList = {
  HomeTab: undefined;
  StudentsTab: undefined;
  RecordTab: undefined;
  LessonsTab: undefined;
  SettingsTab: undefined;
};

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentProfile: {
    studentId: string;
    studentName: string;
    studentIndex: number;
  };
  LessonSummary: {
    lessonId: string;
    studentName?: string;
    studentIndex?: number;
  };
};

export type LessonsStackParamList = {
  LessonsList: undefined;
  LessonDetail: {
    lessonId: string;
    studentName?: string;
    studentIndex?: number;
  };
};

export type HomeStackParamList = {
  Dashboard: undefined;
  HomeLessonSummary: {
    lessonId: string;
    studentName?: string;
    studentIndex?: number;
  };
};
