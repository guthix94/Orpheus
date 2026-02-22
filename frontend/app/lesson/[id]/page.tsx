"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LessonSummary from "@/components/LessonSummary";
import ParentMessage from "@/components/ParentMessage";
import { api } from "@/lib/api";

interface Lesson {
  id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  pieces_detected: string[] | null;
  teacher_summary: string | null;
  parent_summary: string | null;
  suggested_assignments: { description: string; details?: string }[] | null;
}

interface Student {
  id: string;
  name: string;
  parent_email: string | null;
}

export default function LessonSummaryPage() {
  const params = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    api<Lesson>(`/api/lessons/${params.id}`)
      .then((l) => {
        setLesson(l);
        return api<Student>(`/api/students/${l.student_id}`);
      })
      .then(setStudent)
      .catch((err) => setError(err.message));
  }, [params.id]);

  // Poll while processing
  useEffect(() => {
    if (!lesson || lesson.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const updated = await api<Lesson>(`/api/lessons/${params.id}`);
        setLesson(updated);
        if (updated.status !== "processing") clearInterval(interval);
      } catch {
        /* ignore polling errors */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lesson?.status, params.id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Nav */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/students"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          &larr; Students
        </Link>
        <Link
          href="/lesson/record"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          New Lesson
        </Link>
      </div>

      {/* Student header */}
      <h1 className="text-2xl font-bold text-gray-900">
        {student ? student.name : "Loading..."} — Lesson Summary
      </h1>

      <div className="mt-6">
        <LessonSummary
          status={lesson.status}
          teacherSummary={lesson.teacher_summary}
          parentSummary={lesson.parent_summary}
          piecesDetected={lesson.pieces_detected}
          suggestedAssignments={lesson.suggested_assignments}
          durationSeconds={lesson.duration_seconds}
          startedAt={lesson.started_at}
        />
      </div>

      <div className="mt-8">
        <ParentMessage
          lessonId={lesson.id}
          studentId={lesson.student_id}
          parentSummary={lesson.parent_summary}
          parentEmail={student?.parent_email ?? null}
        />
      </div>
    </div>
  );
}
