"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Music,
  Pencil,
  Send,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";
import { AssignmentCardSkeleton } from "@/components/AssignmentCard";
import SendToParentModal from "@/components/SendToParentModal";
import EditableChip, { AddPieceButton } from "@/components/EditableChip";
import EditableAssignmentCard, {
  AddAssignmentForm,
  type Assignment,
} from "@/components/EditableAssignmentCard";
import AudioClips, { type Clip } from "@/components/AudioClips";

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
    | { id?: string; description: string; details?: string | null }[]
    | null;
  clips: Clip[] | null;
}

interface Student {
  id: string;
  name: string;
  parent_email: string | null;
  parent_portal_token: string | null;
}

type SummaryTab = "teacher" | "parent";

/* ── Helpers ── */

/**
 * Extract a plain-text field from a value that might be a JSON blob.
 *
 * Handles three cases:
 * 1. Plain text string → return as-is
 * 2. JSON string with the target field → extract and return the field value
 * 3. JSON string without the target field → return null (NEVER return raw JSON)
 */
function extractText(raw: string | null, field: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Not JSON-like — return the plain text
  if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) return raw;

  // Try to parse as JSON (possibly wrapped in markdown fences)
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Try stripping markdown code fences
    const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (fenceMatch) {
      try { parsed = JSON.parse(fenceMatch[1].trim()); } catch { /* still not JSON */ }
    }
  }

  if (parsed && typeof parsed === "object") {
    // It IS valid JSON — extract the field or return null (never return raw JSON)
    if (typeof parsed[field] === "string") return parsed[field] as string;
    return null;
  }

  // Looks like it starts with { but is NOT valid JSON — return as-is (likely regular text)
  return raw;
}

/**
 * Extract an array from a value that might be a JSON string or already an array.
 * Returns an empty array if extraction fails — never returns raw data.
 */
function extractArray<T>(raw: T[] | string | null | undefined, field: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "object" && parsed !== null && Array.isArray(parsed[field])) {
        return parsed[field];
      }
    } catch { /* not JSON */ }
  }
  return [];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ── Toast ── */

function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-medium shadow-card-hover animate-[slide-up_0.2s_ease-out] ${
        type === "success" ? "bg-success text-white" : "bg-error text-white"
      }`}
    >
      {message}
    </div>
  );
}

/* ── Page ── */

export default function LessonSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<SummaryTab>("teacher");
  const [modalOpen, setModalOpen] = useState(false);

  // Inline editing state for summaries
  const [editingTeacher, setEditingTeacher] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [teacherDraft, setTeacherDraft] = useState("");
  const [parentDraft, setParentDraft] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Portal link
  const [portalCopied, setPortalCopied] = useState(false);

  // Saving spinners
  const [savingPieces, setSavingPieces] = useState(false);

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

  /* ── Pieces CRUD ── */

  const patchPieces = async (newPieces: string[]) => {
    setSavingPieces(true);
    // Optimistic
    setLesson((prev) => prev ? { ...prev, pieces_detected: newPieces } : prev);
    try {
      await api(`/api/lessons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ pieces_detected: newPieces }),
      });
    } catch {
      // Revert on failure
      setLesson((prev) => prev ? { ...prev, pieces_detected: pieces } : prev);
      setToast({ message: "Failed to update pieces", type: "error" });
    } finally {
      setSavingPieces(false);
    }
  };

  const handleEditPiece = (index: number, newValue: string) => {
    const updated = [...pieces];
    updated[index] = newValue;
    patchPieces(updated);
  };

  const handleRemovePiece = (index: number) => {
    patchPieces(pieces.filter((_, i) => i !== index));
  };

  const handleAddPiece = (value: string) => {
    patchPieces([...pieces, value]);
  };

  /* ── Summary editing ── */

  const handleSaveTeacherSummary = async () => {
    setSavingSummary(true);
    const original = lesson?.teacher_summary;
    setLesson((prev) => prev ? { ...prev, teacher_summary: teacherDraft } : prev);
    try {
      await api(`/api/lessons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ teacher_summary: teacherDraft }),
      });
      setEditingTeacher(false);
      setToast({ message: "Teacher notes saved", type: "success" });
    } catch {
      setLesson((prev) => prev ? { ...prev, teacher_summary: original ?? null } : prev);
      setToast({ message: "Failed to save", type: "error" });
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveParentSummary = async () => {
    setSavingSummary(true);
    const original = lesson?.parent_summary;
    setLesson((prev) => prev ? { ...prev, parent_summary: parentDraft } : prev);
    try {
      await api(`/api/lessons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ parent_summary: parentDraft }),
      });
      setEditingParent(false);
      setToast({ message: "Parent message saved", type: "success" });
    } catch {
      setLesson((prev) => prev ? { ...prev, parent_summary: original ?? null } : prev);
      setToast({ message: "Failed to save", type: "error" });
    } finally {
      setSavingSummary(false);
    }
  };

  /* ── Assignments CRUD ── */

  const handleAddAssignment = async (a: { description: string; details: string }) => {
    const temp: Assignment = { description: a.description, details: a.details || null };
    // Optimistic
    setLesson((prev) => {
      if (!prev) return prev;
      return { ...prev, suggested_assignments: [...(prev.suggested_assignments ?? []), temp] };
    });
    try {
      const updated = await api<Lesson>(`/api/lessons/${id}/assignments`, {
        method: "POST",
        body: JSON.stringify(a),
      });
      // If the server returns the full lesson, use it. Otherwise keep optimistic.
      if (updated?.suggested_assignments) setLesson(updated);
      setToast({ message: "Assignment added", type: "success" });
    } catch {
      // Revert
      setLesson((prev) => {
        if (!prev) return prev;
        const reverted = (prev.suggested_assignments ?? []).slice(0, -1);
        return { ...prev, suggested_assignments: reverted };
      });
      setToast({ message: "Failed to add assignment", type: "error" });
    }
  };

  const handleEditAssignment = async (
    index: number,
    a: { description: string; details: string },
  ) => {
    const original = assignments[index];
    const aid = original.id;

    // Optimistic
    setLesson((prev) => {
      if (!prev) return prev;
      const updated = [...(prev.suggested_assignments ?? [])];
      updated[index] = { ...updated[index], ...a };
      return { ...prev, suggested_assignments: updated };
    });

    try {
      if (aid) {
        await api(`/api/lessons/${id}/assignments/${aid}`, {
          method: "PATCH",
          body: JSON.stringify(a),
        });
      } else {
        // No id — patch full lesson
        const updated = [...assignments];
        updated[index] = { ...updated[index], ...a };
        await api(`/api/lessons/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ suggested_assignments: updated }),
        });
      }
      setToast({ message: "Assignment updated", type: "success" });
    } catch {
      // Revert
      setLesson((prev) => {
        if (!prev) return prev;
        const reverted = [...(prev.suggested_assignments ?? [])];
        reverted[index] = original;
        return { ...prev, suggested_assignments: reverted };
      });
      setToast({ message: "Failed to update assignment", type: "error" });
    }
  };

  const handleDeleteAssignment = async (index: number) => {
    const original = assignments[index];
    const aid = original.id;

    // Optimistic
    setLesson((prev) => {
      if (!prev) return prev;
      const filtered = (prev.suggested_assignments ?? []).filter((_, i) => i !== index);
      return { ...prev, suggested_assignments: filtered };
    });
    setToast({ message: "Assignment deleted", type: "success" });

    try {
      if (aid) {
        await api(`/api/lessons/${id}/assignments/${aid}`, { method: "DELETE" });
      } else {
        const updated = assignments.filter((_, i) => i !== index);
        await api(`/api/lessons/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ suggested_assignments: updated }),
        });
      }
    } catch {
      // Revert
      setLesson((prev) => {
        if (!prev) return prev;
        const reverted = [...(prev.suggested_assignments ?? [])];
        reverted.splice(index, 0, original);
        return { ...prev, suggested_assignments: reverted };
      });
      setToast({ message: "Failed to delete assignment", type: "error" });
    }
  };

  /* ── Clip sharing toggle ── */

  const handleToggleClipShare = async (clipIndex: number) => {
    const originalClips = lesson?.clips;
    // Optimistic update
    setLesson((prev) => {
      if (!prev || !prev.clips) return prev;
      const updated = prev.clips.map((c) =>
        c.index === clipIndex
          ? { ...c, shared_with_parent: !c.shared_with_parent }
          : c,
      );
      return { ...prev, clips: updated };
    });
    try {
      const updated = await api<Lesson>(
        `/api/lessons/${id}/clips/${clipIndex}/share`,
        { method: "PATCH" },
      );
      if (updated?.clips) setLesson(updated);
    } catch {
      // Revert
      setLesson((prev) => (prev ? { ...prev, clips: originalClips ?? null } : prev));
      setToast({ message: "Failed to update clip sharing", type: "error" });
    }
  };

  const handleCopyPortalLink = async () => {
    if (!student?.parent_portal_token) return;
    const url = `${window.location.origin}/parent/${student.parent_portal_token}`;
    await navigator.clipboard.writeText(url);
    setPortalCopied(true);
    setTimeout(() => setPortalCopied(false), 2000);
  };

  // Derived data — use safe extraction that never leaks raw JSON
  const teacherText = lesson
    ? extractText(lesson.teacher_summary, "teacher_summary")
    : null;
  const parentText = lesson
    ? extractText(lesson.parent_summary, "parent_summary")
    : null;
  const pieces = lesson?.pieces_detected ?? [];
  const assignments = extractArray<Assignment>(
    lesson?.suggested_assignments as Assignment[] | null,
    "suggested_assignments",
  );

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
      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

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

      {/* ── Piece chips (editable) ── */}
      <FadeIn delay={100}>
        <div className="flex flex-wrap items-center gap-2">
          {pieces.map((p, i) => (
            <EditableChip
              key={`${p}-${i}`}
              value={p}
              onEdit={(v) => handleEditPiece(i, v)}
              onRemove={() => handleRemovePiece(i)}
            />
          ))}
          <AddPieceButton onAdd={handleAddPiece} />
          {savingPieces && (
            <Loader2 size={14} className="animate-spin text-amber" />
          )}
        </div>
      </FadeIn>

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
            <div className="relative rounded-2xl border border-sand bg-warm-white p-6 shadow-card">
              {lesson?.status === "processing" ? (
                <SummarySkeleton />
              ) : activeTab === "teacher" ? (
                <div>
                  {/* Edit button */}
                  {teacherText && !editingTeacher && (
                    <button
                      onClick={() => {
                        setTeacherDraft(teacherText);
                        setEditingTeacher(true);
                      }}
                      className="absolute right-4 top-4 rounded-full p-1.5 text-mist transition-colors hover:bg-amber-glow hover:text-amber"
                      aria-label="Edit teacher notes"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {editingTeacher ? (
                    <EditableSummary
                      draft={teacherDraft}
                      onChange={setTeacherDraft}
                      onSave={handleSaveTeacherSummary}
                      onCancel={() => setEditingTeacher(false)}
                      saving={savingSummary}
                    />
                  ) : teacherText ? (
                    <p className="whitespace-pre-wrap text-sm leading-[1.75] text-charcoal pr-8">
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
                  <div className="flex items-start justify-between">
                    <div className="mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-success-bg px-3 py-1 text-[11px] font-semibold text-success">
                      <ShieldCheck size={12} />
                      Parent-friendly &mdash; no negative language
                    </div>
                    {/* Edit button */}
                    {parentText && !editingParent && (
                      <button
                        onClick={() => {
                          setParentDraft(parentText);
                          setEditingParent(true);
                        }}
                        className="rounded-full p-1.5 text-mist transition-colors hover:bg-amber-glow hover:text-amber"
                        aria-label="Edit parent message"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>

                  {editingParent ? (
                    <EditableSummary
                      draft={parentDraft}
                      onChange={setParentDraft}
                      onSave={handleSaveParentSummary}
                      onCancel={() => setEditingParent(false)}
                      saving={savingSummary}
                    />
                  ) : parentText ? (
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
          ) : (
            <div className="space-y-3">
              {assignments.map((a, i) => (
                <FadeIn key={a.id ?? `a-${i}`} delay={250 + i * 50}>
                  <EditableAssignmentCard
                    assignment={a}
                    onSave={(updated) => handleEditAssignment(i, updated)}
                    onDelete={() => handleDeleteAssignment(i)}
                  />
                </FadeIn>
              ))}

              {assignments.length === 0 && lesson?.status === "completed" && (
                <FadeIn delay={250}>
                  <p className="text-sm text-stone">
                    No assignments yet.
                  </p>
                </FadeIn>
              )}

              <FadeIn delay={250 + assignments.length * 50}>
                <AddAssignmentForm onAdd={handleAddAssignment} />
              </FadeIn>
            </div>
          )}

          {/* Parent portal link */}
          {student?.parent_portal_token && (
            <FadeIn delay={350}>
              <button
                onClick={handleCopyPortalLink}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-5 py-3 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover"
              >
                {portalCopied ? (
                  <>
                    <Check size={15} className="text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={15} className="text-stone" />
                    Copy Parent Portal Link
                  </>
                )}
              </button>
            </FadeIn>
          )}

          {!student?.parent_portal_token && student && (
            <FadeIn delay={350}>
              <Link
                href={`/students/${student.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-5 py-3 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover"
              >
                <ExternalLink size={15} className="text-stone" />
                Set Up Parent Portal
              </Link>
            </FadeIn>
          )}

          {/* Action button — Send to Parent */}
          <FadeIn delay={400}>
            <button
              onClick={() => setModalOpen(true)}
              disabled={!parentText}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
            >
              <Send size={15} />
              Send to Parent
            </button>
          </FadeIn>
        </div>
      </div>

      {/* ── Lesson Audio by Topic ── */}
      {lesson?.clips && lesson.clips.length > 0 && lesson.status === "completed" && (
        <FadeIn delay={300}>
          <AudioClips
            clips={lesson.clips}
            showShareToggle={!!student?.parent_portal_token}
            onToggleShare={handleToggleClipShare}
          />
        </FadeIn>
      )}

      {/* ── Send to Parent Modal ── */}
      {parentText && student && (
        <SendToParentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          lessonId={id}
          studentId={student.id}
          parentSummary={parentText}
          parentEmail={student.parent_email}
          assignments={assignments}
        />
      )}
    </div>
  );
}

/* ── Editable Summary (textarea + Save/Cancel) ── */

function EditableSummary({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // Auto-resize
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          onChange(e.target.value);
          // Auto-resize
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-[var(--radius-button)] border border-sand bg-cream px-3.5 py-2.5 text-sm leading-[1.75] text-charcoal focus:outline-none focus:ring-2 focus:ring-amber/40"
        rows={6}
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-[var(--radius-button)] border border-sand px-3.5 py-1.5 text-xs font-semibold text-stone transition-colors hover:text-charcoal"
        >
          Cancel
        </button>
      </div>
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
    <div className="inline-flex rounded-[var(--radius-chip)] bg-ivory p-1" role="tablist">
      <button
        role="tab"
        aria-selected={active === "teacher"}
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
        role="tab"
        aria-selected={active === "parent"}
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
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-sand" />
        </div>
      </div>
    </div>
  );
}
