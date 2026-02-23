"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Music, Clock, Mic, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";
import QuickStatCard, {
  QuickStatSkeleton,
} from "@/components/ui/QuickStatCard";
import LessonCard, { LessonCardSkeleton } from "@/components/LessonCard";

/* ── Types matching the backend schemas ── */

interface Student {
  id: string;
  name: string;
  instrument: string;
}

interface Lesson {
  id: string;
  student_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: "recording" | "processing" | "completed" | "failed" | "cancelled";
  pieces_detected?: string[];
  teacher_summary?: string;
}

/* ── Orphaned lesson recovery types ── */

const ACTIVE_LESSON_KEY = "orpheus_active_lesson";

interface OrphanedLesson {
  id: string;
  student_id: string;
  started_at: string;
  studentName: string;
}

/* ── Helpers ── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function hoursThisWeek(lessons: Lesson[]): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  let totalSec = 0;
  for (const l of lessons) {
    if (new Date(l.started_at) >= monday && l.duration_seconds) {
      totalSec += l.duration_seconds;
    }
  }
  const hrs = totalSec / 3600;
  return hrs < 1 ? `${Math.round(hrs * 60)}m` : `${hrs.toFixed(1)}`;
}

function lessonsThisWeek(lessons: Lesson[]): number {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return lessons.filter((l) => new Date(l.started_at) >= monday).length;
}

function studentNameMap(students: Student[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const s of students) m[s.id] = s.name;
  return m;
}

/* ── Page ── */

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orphanedLessons, setOrphanedLessons] = useState<OrphanedLesson[]>([]);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stu, les] = await Promise.all([
          api<Student[]>("/api/students"),
          api<Lesson[]>("/api/lessons?limit=20&sort=recent"),
        ]);
        if (!cancelled) {
          setStudents(stu);
          setLessons(les);

          // ── Layer 3: Detect orphaned lessons stuck in "recording" ──
          const nameMap = studentNameMap(stu);
          const orphans = les
            .filter((l) => l.status === "recording")
            .map((l) => ({
              id: l.id,
              student_id: l.student_id,
              started_at: l.started_at,
              studentName: nameMap[l.student_id] ?? "Unknown",
            }));
          setOrphanedLessons(orphans);

          // Clear sessionStorage hint if we found the orphan via API
          if (orphans.length > 0) {
            try {
              sessionStorage.removeItem(ACTIVE_LESSON_KEY);
            } catch {
              // Ignore
            }
          }
        }
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

  const handleDiscardLesson = useCallback(
    async (lessonId: string) => {
      setRecoveringId(lessonId);
      try {
        await api(`/api/lessons/${lessonId}/cancel`, { method: "POST" });
        setOrphanedLessons((prev) => prev.filter((l) => l.id !== lessonId));
        // Update the lesson in the list
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId ? { ...l, status: "cancelled" as const } : l,
          ),
        );
      } catch {
        // Silently fail — lesson may already have been cleaned up
        setOrphanedLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } finally {
        setRecoveringId(null);
      }
    },
    [],
  );

  const handleRecoverLesson = useCallback(
    async (lessonId: string) => {
      setRecoveringId(lessonId);
      try {
        const lesson = await api<Lesson>(`/api/lessons/${lessonId}/recover`, {
          method: "POST",
        });
        setOrphanedLessons((prev) => prev.filter((l) => l.id !== lessonId));
        // If it went to processing, navigate to the processing page
        if (lesson.status === "processing") {
          router.push(`/lesson/${lessonId}/processing`);
        } else {
          // Update the lesson in the list (status is now "failed")
          setLessons((prev) =>
            prev.map((l) => (l.id === lessonId ? { ...l, status: lesson.status } : l)),
          );
        }
      } catch {
        setOrphanedLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } finally {
        setRecoveringId(null);
      }
    },
    [router],
  );

  const names = studentNameMap(students);
  const recentLessons = lessons.slice(0, 5);
  const mostRecent = recentLessons[0] ?? null;

  return (
    <div className="space-y-8">
      {/* ── Layer 3: Orphaned lesson recovery banner ── */}
      {orphanedLessons.map((orphan) => (
        <FadeIn key={orphan.id}>
          <OrphanedLessonBanner
            orphan={orphan}
            recovering={recoveringId === orphan.id}
            onDiscard={() => handleDiscardLesson(orphan.id)}
            onRecover={() => handleRecoverLesson(orphan.id)}
          />
        </FadeIn>
      ))}

      {/* ── Greeting ── */}
      <FadeIn>
        <p className="text-sm font-medium text-stone">{greeting()}</p>
        <h1 className="mt-0.5 text-[2rem] leading-tight font-semibold text-charcoal">
          Your Studio
        </h1>
      </FadeIn>

      {/* ── Two-column layout (desktop) ── */}
      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <FadeIn delay={50}>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {loading ? (
                <>
                  <QuickStatSkeleton />
                  <QuickStatSkeleton />
                  <QuickStatSkeleton />
                </>
              ) : (
                <>
                  <QuickStatCard
                    icon={<Users size={18} />}
                    value={students.length}
                    label="Students"
                  />
                  <QuickStatCard
                    icon={<Music size={18} />}
                    value={lessonsThisWeek(lessons)}
                    label="This week"
                  />
                  <QuickStatCard
                    icon={<Clock size={18} />}
                    value={hoursThisWeek(lessons)}
                    label="Hours"
                  />
                </>
              )}
            </div>
          </FadeIn>

          {/* Start Lesson (mobile-prominent) */}
          <FadeIn delay={100}>
            <Link
              href="/lesson/record"
              className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-card)] bg-charcoal px-6 py-4 text-base font-semibold text-white shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover md:hidden"
            >
              <Mic size={20} className="text-amber" />
              Start Lesson
            </Link>
          </FadeIn>

          {/* Most Recent Lesson */}
          <FadeIn delay={150}>
            {loading ? (
              <MostRecentSkeleton />
            ) : mostRecent ? (
              <MostRecentCard
                lesson={mostRecent}
                studentName={names[mostRecent.student_id] ?? "Unknown"}
              />
            ) : (
              <EmptyState />
            )}
          </FadeIn>
        </div>

        {/* ── Right column: Recent Lessons ── */}
        <div className="space-y-3">
          <FadeIn delay={200}>
            <h2 className="text-lg font-semibold text-charcoal">
              Recent Lessons
            </h2>
          </FadeIn>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <FadeIn key={i} delay={250 + i * 50}>
                  <LessonCardSkeleton />
                </FadeIn>
              ))}
            </div>
          ) : recentLessons.length === 0 ? (
            <FadeIn delay={250}>
              <p className="py-8 text-center text-sm text-stone">
                No lessons yet. Tap{" "}
                <Link href="/lesson/record" className="font-medium text-amber underline">
                  Record
                </Link>{" "}
                to start your first.
              </p>
            </FadeIn>
          ) : (
            <div className="space-y-3">
              {recentLessons.map((l, i) => (
                <FadeIn key={l.id} delay={250 + i * 50}>
                  <LessonCard
                    id={l.id}
                    studentName={names[l.student_id] ?? "Unknown"}
                    piece={l.pieces_detected?.[0] ?? null}
                    date={l.started_at}
                    status={l.status}
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
          Failed to load dashboard: {error}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function MostRecentCard({
  lesson,
  studentName,
}: {
  lesson: Lesson;
  studentName: string;
}) {
  const piece = lesson.pieces_detected?.[0] ?? "No piece detected";
  const date = new Date(lesson.started_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Extract a short snippet from the teacher summary
  const snippet = lesson.teacher_summary
    ? lesson.teacher_summary.length > 160
      ? lesson.teacher_summary.slice(0, 160).trimEnd() + "..."
      : lesson.teacher_summary
    : null;

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="block rounded-[var(--radius-card)] border-l-[3px] border-l-amber bg-warm-white p-5 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-charcoal">
            {studentName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-sm text-slate">{piece}</span>
            <span className="rounded-[var(--radius-chip)] bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-stone">
              {date}
            </span>
          </div>
        </div>
      </div>

      {snippet && (
        <div className="mt-3 rounded-[var(--radius-button)] bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-slate">
          {snippet}
        </div>
      )}
    </Link>
  );
}

function MostRecentSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border-l-[3px] border-l-sand bg-warm-white p-5 shadow-card animate-pulse">
      <div className="h-5 w-32 rounded bg-sand" />
      <div className="mt-2 flex gap-2">
        <div className="h-3.5 w-24 rounded bg-sand" />
        <div className="h-3.5 w-16 rounded bg-sand" />
      </div>
      <div className="mt-3 space-y-2 rounded-[var(--radius-button)] bg-cream p-3">
        <div className="h-3 w-full rounded bg-sand" />
        <div className="h-3 w-3/4 rounded bg-sand" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-glow">
        <Music size={24} className="text-amber" />
      </div>
      <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
        No lessons yet
      </p>
      <p className="mt-1 text-sm text-stone">
        Record your first lesson to see it here.
      </p>
      <Link
        href="/lesson/record"
        className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover"
      >
        <Mic size={16} className="text-amber" />
        Start Lesson
      </Link>
    </div>
  );
}

/* ── Orphaned Lesson Recovery Banner ── */

function OrphanedLessonBanner({
  orphan,
  recovering,
  onDiscard,
  onRecover,
}: {
  orphan: OrphanedLesson;
  recovering: boolean;
  onDiscard: () => void;
  onRecover: () => void;
}) {
  const startedAt = new Date(orphan.started_at);
  const timeStr = startedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = startedAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-[var(--radius-card)] border border-amber/40 bg-amber-glow p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/20">
          <AlertTriangle size={16} className="text-amber" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold text-charcoal">
            Unfinished lesson with {orphan.studentName}
          </p>
          <p className="mt-0.5 text-sm text-stone">
            Started {dateStr} at {timeStr}. The recording may have been
            interrupted.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onRecover}
              disabled={recovering}
              className="rounded-[var(--radius-button)] bg-charcoal px-4 py-2 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
            >
              {recovering ? "Processing..." : "Try to recover"}
            </button>
            <button
              onClick={onDiscard}
              disabled={recovering}
              className="rounded-[var(--radius-button)] border border-sand bg-warm-white px-4 py-2 text-sm font-medium text-stone transition-colors hover:text-charcoal disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
