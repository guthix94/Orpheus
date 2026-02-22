"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudentCard from "@/components/StudentCard";
import { api } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  instrument: string;
}

interface Lesson {
  id: string;
  student_id: string;
  started_at: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lastLessons, setLastLessons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [stu, lessons] = await Promise.all([
          api<Student[]>("/api/students"),
          api<Lesson[]>("/api/lessons"),
        ]);
        setStudents(stu);

        // Build map of student_id -> most recent lesson date
        const map: Record<string, string> = {};
        for (const l of lessons) {
          if (!map[l.student_id] || l.started_at > map[l.student_id]) {
            map[l.student_id] = l.started_at;
          }
        }
        setLastLessons(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <Link
          href="/lesson/record"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          New Lesson
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : students.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No students yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Start your first lesson to add a student.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {students.map((s) => (
            <StudentCard
              key={s.id}
              id={s.id}
              name={s.name}
              instrument={s.instrument}
              lastLessonDate={lastLessons[s.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
