"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";
import StudentCard, { StudentCardSkeleton } from "@/components/StudentCard";

/* ── Types ── */

interface Student {
  id: string;
  name: string;
  instrument: string;
  current_pieces?: string[];
  estimated_level?: string | null;
}

interface Lesson {
  id: string;
  student_id: string;
  started_at: string;
}

/* ── Page ── */

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lastLessons, setLastLessons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stu, lessons] = await Promise.all([
          api<Student[]>("/api/students"),
          api<Lesson[]>("/api/lessons"),
        ]);
        if (cancelled) return;
        setStudents(stu);

        const map: Record<string, string> = {};
        for (const l of lessons) {
          if (!map[l.student_id] || l.started_at > map[l.student_id]) {
            map[l.student_id] = l.started_at;
          }
        }
        setLastLessons(map);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.current_pieces ?? []).some((p) => p.toLowerCase().includes(q)),
    );
  }, [students, query]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-[2rem] leading-tight font-semibold text-charcoal">
            Students
          </h1>
          <Link
            href="/lesson/record"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Student</span>
          </Link>
        </div>
      </FadeIn>

      {/* ── Search ── */}
      <FadeIn delay={50}>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students or pieces..."
            className="w-full rounded-[var(--radius-card)] border border-sand bg-warm-white py-3 pl-10 pr-10 text-sm text-charcoal placeholder:text-mist transition-shadow duration-[var(--transition-fast)] focus:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-amber/40"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-stone hover:text-charcoal transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </FadeIn>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
          Failed to load students: {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {Array.from({ length: 6 }, (_, i) => (
            <FadeIn key={i} delay={100 + i * 50}>
              <StudentCardSkeleton />
            </FadeIn>
          ))}
        </div>
      ) : students.length === 0 ? (
        <FadeIn delay={100}>
          <EmptyState />
        </FadeIn>
      ) : filtered.length === 0 ? (
        <FadeIn delay={100}>
          <div className="py-12 text-center">
            <p className="text-sm text-stone">
              No students matching &ldquo;{query}&rdquo;
            </p>
          </div>
        </FadeIn>
      ) : (
        <div className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {filtered.map((s, i) => (
            <FadeIn key={s.id} delay={100 + i * 50}>
              <StudentCard
                id={s.id}
                name={s.name}
                instrument={s.instrument}
                currentPiece={s.current_pieces?.[0] ?? null}
                estimatedLevel={s.estimated_level ?? null}
                lastLessonDate={lastLessons[s.id] ?? null}
              />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-glow">
        <Users size={24} className="text-amber" />
      </div>
      <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
        No students yet
      </p>
      <p className="mt-1 max-w-xs text-sm text-stone">
        Start your first lesson and your student will appear here automatically.
      </p>
      <Link
        href="/lesson/record"
        className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover"
      >
        <Plus size={16} />
        Add your first student
      </Link>
    </div>
  );
}
