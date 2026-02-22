"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "@/components/AudioRecorder";
import { api, uploadFile } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  instrument: string;
}

interface Lesson {
  id: string;
}

export default function RecordPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentName, setStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<Student[]>("/api/students").then(setStudents).catch(console.error);
  }, []);

  const filteredStudents =
    studentName.length > 0 && !selectedStudentId
      ? students.filter((s) =>
          s.name.toLowerCase().includes(studentName.toLowerCase()),
        )
      : [];

  const selectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentName(student.name);
  };

  const handleStartLesson = async () => {
    let studentId = selectedStudentId;

    if (!studentId && studentName.trim()) {
      const newStudent = await api<Student>("/api/students", {
        method: "POST",
        body: JSON.stringify({ name: studentName.trim(), instrument: "violin" }),
      });
      studentId = newStudent.id;
      setSelectedStudentId(studentId);
    }

    if (!studentId) return;

    const lesson = await api<Lesson>("/api/lessons", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    });
    setLessonId(lesson.id);
    setLessonStarted(true);
  };

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (!lessonId) return;
      setUploading(true);

      // 1. Stop the lesson (sets status to "processing")
      await api(`/api/lessons/${lessonId}/stop`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      // 2. Upload the audio blob — this saves the file on the server
      //    and triggers the processing pipeline
      await uploadFile(
        `/api/lessons/${lessonId}/upload-audio`,
        blob,
        `${lessonId}.webm`,
      );

      router.push(`/lesson/${lessonId}`);
    },
    [lessonId, router],
  );

  if (uploading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-gray-500">Processing lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {!lessonStarted ? (
        <div className="w-full max-w-md">
          <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
            New Lesson
          </h1>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                setSelectedStudentId(null);
              }}
              placeholder="Type a student name..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />

            {filteredStudents.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredStudents.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => selectStudent(s)}
                      className="w-full px-4 py-3 text-left hover:bg-indigo-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 text-sm text-gray-400">
                        {s.instrument}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={handleStartLesson}
            disabled={!studentName.trim()}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-gray-500">
            Lesson with <span className="font-semibold text-gray-900">{studentName}</span>
          </p>
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        </div>
      )}
    </div>
  );
}
