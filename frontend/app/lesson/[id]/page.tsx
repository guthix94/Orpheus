"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Lock,
  Music,
  Send,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";
import AssignmentCard, {
  AssignmentCardSkeleton,
} from "@/components/AssignmentCard";
import SendToParentModal from "@/components/SendToParentModal";

/* ── Types ── */

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
  suggested_assignments:
    | { description: string; details?: string }[]
    | null;
  confirmed_at: string | null;
  is_locked: boolean;
  amendments: { text: string; created_at: string }[] | null;
}

interface Student {
  id: string;
  name: string;
  parent_email: string | null;
}

type SummaryTab = "teacher" | "parent";

/* ── Helpers ── */

function extractText(raw: string | null, field: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && typeof parsed[field] === "string") {
      return parsed[field];
    }
  } catch { /* not JSON */ }
  return raw;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ── Page ── */

export default function LessonSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<SummaryTab>("teacher");
  const [confirming, setConfirming] = useState(false);
  const [amendmentText, setAmendmentText] = useState("");
  const [savingAmendment, setSavingAmendment] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch lesson + student
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const les = await api<Lesson>(`/api/lessons/${id}`);
        if (cancelled) return;
        setLesson(les);

        const stu = await api<Student>(`/api/students/${les.student_id}`);
        if (cancelled) return;
        setStudent(stu);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Poll while processing
  useEffect(() => {
    if (!lesson || lesson.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const updated = await api<Lesson>(`/api/lessons/${id}`);
        setLesson(updated);
        if (updated.status !== "processing") clearInterval(interval);
      } catch { /* ignore */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [lesson?.status, id]);

  // Confirm
  const handleConfirm = async () => {
    if (!lesson || confirming) return;
    setConfirming(true);
    try {
      const updated = await api<Lesson>(`/api/lessons/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setLesson(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  // Add amendment
  const handleSaveAmendment = async () => {
    if (!lesson || !amendmentText.trim() || savingAmendment) return;
    setSavingAmendment(true);
    try {
      const updated = await api<Lesson>(`/api/lessons/${id}/amendments`, {
        method: "POST",
        body: JSON.stringify({ text: amendmentText.trim() }),
      });
      setLesson(updated);
      setAmendmentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAmendment(false);
    }
  };

  // Derived data
  const teacherText = lesson
    ? extractText(lesson.teacher_summary, "teacher_summary")
    : null;
  const parentText = lesson
    ? extractText(lesson.parent_summary, "parent_summary")
    : null;
  const pieces = lesson?.pieces_detected ?? [];
  const assignments = lesson?.suggested_assignments ?? [];
  const isLocked = lesson?.is_locked ?? false;
  const confirmedAt = lesson?.confirmed_at;
  const amendments = lesson?.amendments ?? [];

  const dateStr = lesson
    ? new Date(lesson.started_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const durationStr =
    lesson?.duration_seconds != null
      ? formatDuration(lesson.duration_seconds)
      : null;

  // Loading
  if (loading) return <PageSkeleton />;

  // Error
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone hover:text-charcoal transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Back button ── */}
      <FadeIn>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone hover:text-charcoal transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
      </FadeIn>

      {/* ── Header ── */}
      <FadeIn delay={50}>
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold text-charcoal md:text-[2rem]">
            Lesson with {student?.name ?? "..."}
          </h1>
          <p className="mt-1 text-sm text-stone">
            {dateStr}
            {durationStr && <> &middot; {durationStr}</>}
          </p>
        </div>
      </FadeIn>

      {/* ── Piece chips ── */}
      {pieces.length > 0 && (
        <FadeIn delay={100}>
          <div className="flex flex-wrap gap-2">
            {pieces.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-amber-glow px-3 py-1 text-xs font-medium text-amber"
              >
                <Music size={12} />
                {p}
              </span>
            ))}
          </div>
        </FadeIn>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* ── Left: Summary ── */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Toggle */}
          <FadeIn delay={150}>
            <SummaryToggle active={activeTab} onChange={setActiveTab} />
          </FadeIn>

          {/* Summary card */}
          <FadeIn delay={200}>
            <div className="rounded-2xl border border-sand bg-warm-white p-6 shadow-card">
              {lesson?.status === "processing" ? (
                <SummarySkeleton />
              ) : activeTab === "teacher" ? (
                <div>
                  {isLocked && (
                    <div className="mb-4 flex items-center gap-1.5 text-xs text-stone">
                      <Lock size={12} />
                      Confirmed &mdash; original summary is locked
                    </div>
                  )}
                  {teacherText ? (
                    <p className="whitespace-pre-wrap text-sm leading-[1.75] text-charcoal">
                      {teacherText}
                    </p>
                  ) : (
                    <p className="text-sm text-stone">
                      Summary will appear after processing.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-success-bg px-3 py-1 text-[11px] font-semibold text-success">
                    <ShieldCheck size={12} />
                    Parent-friendly &mdash; no negative language
                  </div>
                  {parentText ? (
                    <p className="whitespace-pre-wrap text-sm leading-[1.75] text-charcoal">
                      {parentText}
                    </p>
                  ) : (
                    <p className="text-sm text-stone">
                      Parent message will appear after processing.
                    </p>
                  )}
                </div>
              )}
            </div>
          </FadeIn>

          {/* Amendments section (after confirmation) */}
          {isLocked && (
            <FadeIn delay={250}>
              <div className="space-y-3">
                {amendments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-stone">
                      Amendments
                    </h3>
                    {amendments.map((a, i) => (
                      <div
                        key={i}
                        className="rounded-[var(--radius-button)] border border-sand bg-ivory px-4 py-3"
                      >
                        <p className="text-sm text-charcoal">{a.text}</p>
                        <p className="mt-1 text-[11px] text-mist">
                          {new Date(a.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <textarea
                    value={amendmentText}
                    onChange={(e) => setAmendmentText(e.target.value)}
                    placeholder="Add a note or amendment..."
                    rows={3}
                    className="w-full resize-none rounded-[var(--radius-button)] border border-sand bg-warm-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
                  />
                  <button
                    onClick={handleSaveAmendment}
                    disabled={!amendmentText.trim() || savingAmendment}
                    className="mt-2 rounded-[var(--radius-button)] bg-charcoal px-4 py-2 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
                  >
                    {savingAmendment ? "Saving..." : "Save Amendment"}
                  </button>
                </div>
              </div>
            </FadeIn>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-full shrink-0 space-y-5 md:w-[340px]">
          {/* Assignments */}
          <FadeIn delay={200}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone">
              Practice Assignments
            </h3>
          </FadeIn>

          {lesson?.status === "processing" ? (
            <div className="space-y-3">
              <AssignmentCardSkeleton />
              <AssignmentCardSkeleton />
            </div>
          ) : assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.map((a, i) => (
                <FadeIn key={i} delay={250 + i * 50}>
                  <AssignmentCard
                    description={a.description}
                    details={a.details ?? null}
                    status="assigned"
                    weeksPersisted={1}
                  />
                </FadeIn>
              ))}
            </div>
          ) : (
            <FadeIn delay={250}>
              <p className="text-sm text-stone">
                {lesson?.status === "completed"
                  ? "No assignments suggested for this lesson."
                  : "Assignments will appear after processing."}
              </p>
            </FadeIn>
          )}

          {/* Action buttons */}
          <FadeIn delay={300}>
            {confirmedAt ? (
              /* ── Confirmed banner ── */
              <div className="rounded-[var(--radius-card)] bg-success-bg px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-success">
                      Summary confirmed &amp; locked
                    </p>
                    <p className="text-[11px] text-success/70">
                      {new Date(confirmedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Action buttons ── */
              <div className="space-y-2.5">
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={!parentText}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
                >
                  <Send size={15} />
                  Send to Parent
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={
                    confirming || lesson?.status !== "completed"
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-5 py-3 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover disabled:opacity-50"
                >
                  <Lock size={15} />
                  {confirming ? "Confirming..." : "Confirm & Lock"}
                </button>
              </div>
            )}
          </FadeIn>
        </div>
      </div>

      {/* ── Send to Parent Modal ── */}
      {parentText && student && (
        <SendToParentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          lessonId={id}
          studentId={student.id}
          parentSummary={parentText}
          parentEmail={student.parent_email}
        />
      )}
    </div>
  );
}

/* ── Summary Toggle ── */

function SummaryToggle({
  active,
  onChange,
}: {
  active: SummaryTab;
  onChange: (t: SummaryTab) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-chip)] bg-ivory p-1">
      <button
        onClick={() => onChange("teacher")}
        className={`rounded-[var(--radius-chip)] px-4 py-1.5 text-xs font-semibold transition-all duration-[var(--transition-fast)] ${
          active === "teacher"
            ? "bg-white text-charcoal shadow-card"
            : "text-stone hover:text-slate"
        }`}
      >
        Teacher Notes
      </button>
      <button
        onClick={() => onChange("parent")}
        className={`rounded-[var(--radius-chip)] px-4 py-1.5 text-xs font-semibold transition-all duration-[var(--transition-fast)] ${
          active === "parent"
            ? "bg-white text-charcoal shadow-card"
            : "text-stone hover:text-slate"
        }`}
      >
        Parent Message
      </button>
    </div>
  );
}

/* ── Skeletons ── */

function SummarySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-full rounded bg-sand" />
      <div className="h-4 w-full rounded bg-sand" />
      <div className="h-4 w-5/6 rounded bg-sand" />
      <div className="h-4 w-full rounded bg-sand" />
      <div className="h-4 w-3/4 rounded bg-sand" />
      <p className="pt-1 text-xs text-stone">
        Summary is being generated...
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-20 rounded bg-sand" />
      <div className="space-y-2">
        <div className="h-7 w-64 rounded bg-sand" />
        <div className="h-3.5 w-40 rounded bg-sand" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-24 rounded-full bg-sand" />
        <div className="h-6 w-28 rounded-full bg-sand" />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1 space-y-5">
          <div className="h-8 w-52 rounded-full bg-sand" />
          <div className="rounded-2xl border border-sand bg-warm-white p-6">
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-sand" />
              <div className="h-4 w-full rounded bg-sand" />
              <div className="h-4 w-5/6 rounded bg-sand" />
              <div className="h-4 w-3/4 rounded bg-sand" />
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 space-y-5 md:w-[340px]">
          <div className="h-4 w-36 rounded bg-sand" />
          <AssignmentCardSkeleton />
          <AssignmentCardSkeleton />
          <div className="space-y-2.5">
            <div className="h-11 w-full rounded-[var(--radius-button)] bg-sand" />
            <div className="h-11 w-full rounded-[var(--radius-button)] bg-sand" />
          </div>
        </div>
      </div>
    </div>
  );
}
