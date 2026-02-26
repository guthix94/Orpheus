"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Link as LinkIcon, Loader2, Mic, Mail } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";
import LessonCard, { LessonCardSkeleton } from "@/components/LessonCard";
import AssignmentCard, {
  AssignmentCardSkeleton,
} from "@/components/AssignmentCard";
import TempoChart, {
  TempoChartSkeleton,
  type TempoDataPoint,
} from "@/components/TempoChart";

/* ── Types ── */

interface Student {
  id: string;
  name: string;
  instrument: string;
  current_pieces?: string[];
  estimated_level?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;
  parent_portal_token?: string | null;
  created_at: string;
}

interface Lesson {
  id: string;
  student_id: string;
  started_at: string;
  duration_seconds?: number;
  status: "recording" | "processing" | "completed" | "failed";
  pieces_detected?: string[];
  teacher_summary?: string;
  processing_metadata?: Record<string, unknown>;
}

interface Assignment {
  id: string;
  lesson_id: string;
  student_id: string;
  assigned_at: string;
  description: string;
  details?: string | null;
  status: "assigned" | "achieved" | "partially_achieved" | "not_attempted";
  weeks_persisted: number;
}

type Tab = "lessons" | "assignments" | "progress";

/* ── Helpers ── */

function avatarColor(name: string): string {
  const hues = [
    "bg-[#F0E6D3]",
    "bg-[#E6D9C7]",
    "bg-[#DDE8D6]",
    "bg-[#D6E0E8]",
    "bg-[#E4D8E8]",
    "bg-[#E8D6D6]",
    "bg-[#D9E4D4]",
    "bg-[#E8E0D0]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hues[Math.abs(hash) % hues.length];
}

function buildTempoData(lessons: Lesson[]): {
  piece: string;
  data: TempoDataPoint[];
} | null {
  // Find completed lessons with tempo data for the most common piece
  const pieceCounts: Record<string, number> = {};
  for (const l of lessons) {
    for (const p of l.pieces_detected ?? []) {
      pieceCounts[p] = (pieceCounts[p] || 0) + 1;
    }
  }

  const topPiece = Object.entries(pieceCounts).sort((a, b) => b[1] - a[1])[0];
  if (!topPiece) return null;

  const piece = topPiece[0];
  const data: TempoDataPoint[] = [];

  for (const l of lessons) {
    if (
      l.status === "completed" &&
      l.pieces_detected?.includes(piece) &&
      l.processing_metadata
    ) {
      const tempo = l.processing_metadata.avg_tempo as number | undefined;
      if (tempo && tempo > 0) {
        data.push({ date: l.started_at, tempo: Math.round(tempo) });
      }
    }
  }

  // Sort oldest first for chart
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return data.length > 0 ? { piece, data } : null;
}

/* ── Page ── */

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("lessons");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stu, les, asgn] = await Promise.all([
          api<Student>(`/api/students/${id}`),
          api<Lesson[]>(`/api/lessons?student_id=${id}`),
          api<Assignment[]>(`/api/assignments?student_id=${id}`).catch(
            () => [] as Assignment[],
          ),
        ]);
        if (cancelled) return;
        setStudent(stu);
        setLessons(les);
        setAssignments(asgn);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleGeneratePortalToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await api<{ parent_portal_token: string }>(
        `/api/students/${id}/portal-token`,
        { method: "POST" },
      );
      setStudent((prev) =>
        prev ? { ...prev, parent_portal_token: res.parent_portal_token } : prev,
      );
    } catch {
      // Silently fail — button stays visible for retry
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!student?.parent_portal_token) return;
    const url = `${window.location.origin}/parent/${student.parent_portal_token}`;
    await navigator.clipboard.writeText(url);
    setPortalCopied(true);
    setTimeout(() => setPortalCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/students"
          className="inline-flex items-center gap-1 text-sm text-stone hover:text-charcoal transition-colors"
        >
          <ArrowLeft size={16} />
          Students
        </Link>
        <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
          Failed to load student: {error}
        </div>
      </div>
    );
  }

  if (loading || !student) {
    return <ProfileSkeleton />;
  }

  const initials = student.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const startedDate = new Date(student.created_at).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" },
  );

  const totalMinutes = lessons.reduce(
    (sum, l) => sum + (l.duration_seconds ?? 0),
    0,
  );
  const totalHours = Math.round(totalMinutes / 3600);

  const tempoData = buildTempoData(lessons);

  return (
    <div className="space-y-6">
      {/* ── Desktop: two-column / Mobile: stacked ── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* ── Profile Card (sticky on desktop) ── */}
        <FadeIn>
          <div className="w-full shrink-0 md:sticky md:top-8 md:w-[300px]">
            <div className="rounded-[var(--radius-card)] border border-sand bg-warm-white p-6 shadow-card">
              {/* Back */}
              <Link
                href="/students"
                className="inline-flex items-center gap-1 text-sm text-stone hover:text-charcoal transition-colors"
              >
                <ArrowLeft size={14} />
                Students
              </Link>

              {/* Avatar + Name */}
              <div className="mt-5 flex flex-col items-center text-center">
                <div
                  className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-xl font-semibold text-charcoal ${avatarColor(student.name)}`}
                >
                  {initials}
                </div>
                <h1 className="mt-3 text-[1.625rem] leading-tight font-semibold text-charcoal">
                  {student.name}
                </h1>

                {/* Chips */}
                <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                  <span className="rounded-[var(--radius-chip)] bg-amber-glow px-3 py-1 text-xs font-medium text-amber">
                    {student.instrument}
                  </span>
                  {student.estimated_level && (
                    <span className="rounded-[var(--radius-chip)] bg-amber-glow px-3 py-1 text-xs font-medium text-amber">
                      {student.estimated_level}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <p className="mt-3 text-xs text-stone">
                  {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                  {totalHours > 0 ? ` · ${totalHours}h` : ""} · Started{" "}
                  {startedDate}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 space-y-2.5">
                <Link
                  href={`/lesson/record/${id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover"
                >
                  <Mic size={16} className="text-amber" />
                  Start Lesson
                </Link>

                {student.parent_email && (
                  <a
                    href={`mailto:${student.parent_email}`}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-4 py-2.5 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover"
                  >
                    <Mail size={16} className="text-stone" />
                    Message Parent
                  </a>
                )}
              </div>

              {/* Parent Portal Link */}
              <div className="mt-5 border-t border-sand pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone">
                  Parent Portal
                </p>
                {student.parent_portal_token ? (
                  <div className="mt-2.5 space-y-2">
                    <p className="break-all rounded-[var(--radius-button)] bg-ivory px-3 py-2 text-xs text-stone">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/parent/${student.parent_portal_token}`
                        : `/parent/${student.parent_portal_token}`}
                    </p>
                    <button
                      onClick={handleCopyPortalLink}
                      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-4 py-2.5 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover"
                    >
                      {portalCopied ? (
                        <>
                          <Check size={16} className="text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="text-stone" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <p className="text-xs text-stone">
                      Generate a link so parents can view lesson summaries and shared audio clips.
                    </p>
                    <button
                      onClick={handleGeneratePortalToken}
                      disabled={generatingToken}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-cream px-4 py-2.5 text-sm font-semibold text-charcoal transition-shadow hover:shadow-card-hover disabled:opacity-50"
                    >
                      {generatingToken ? (
                        <Loader2 size={16} className="animate-spin text-stone" />
                      ) : (
                        <LinkIcon size={16} className="text-stone" />
                      )}
                      Generate Parent Portal Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── Right Content ── */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Tabs */}
          <FadeIn delay={50}>
            <TabBar activeTab={activeTab} onChange={setActiveTab} />
          </FadeIn>

          {/* Tab content */}
          <FadeIn delay={100} key={activeTab}>
            {activeTab === "lessons" && (
              <LessonsTab lessons={lessons} studentName={student.name} />
            )}
            {activeTab === "assignments" && (
              <AssignmentsTab assignments={assignments} />
            )}
            {activeTab === "progress" && (
              <ProgressTab tempoData={tempoData} />
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

/* ── Tab Bar ── */

const TABS: { key: Tab; label: string }[] = [
  { key: "lessons", label: "Lessons" },
  { key: "assignments", label: "Assignments" },
  { key: "progress", label: "Progress" },
];

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-sand" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative px-4 pb-2.5 pt-1 text-xs font-semibold uppercase tracking-widest transition-colors duration-[var(--transition-fast)] ${
            activeTab === tab.key ? "text-charcoal" : "text-stone hover:text-slate"
          }`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-amber" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Lessons Tab ── */

function LessonsTab({
  lessons,
  studentName,
}: {
  lessons: Lesson[];
  studentName: string;
}) {
  if (lessons.length === 0) {
    return (
      <EmptyTab message="No lessons yet" detail="Start a lesson to see history here." />
    );
  }

  // Sort newest first
  const sorted = [...lessons].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.map((l, i) => (
        <FadeIn key={l.id} delay={i * 50}>
          <LessonCard
            id={l.id}
            studentName={studentName}
            piece={l.pieces_detected?.[0] ?? null}
            date={l.started_at}
            status={l.status}
          />
        </FadeIn>
      ))}
    </div>
  );
}

/* ── Assignments Tab ── */

function AssignmentsTab({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return (
      <EmptyTab
        message="No assignments yet"
        detail="Assignments will appear after completing a lesson."
      />
    );
  }

  // Active (assigned) first, then by date
  const sorted = [...assignments].sort((a, b) => {
    if (a.status === "assigned" && b.status !== "assigned") return -1;
    if (b.status === "assigned" && a.status !== "assigned") return 1;
    return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
  });

  return (
    <div className="space-y-3">
      {sorted.map((a, i) => (
        <FadeIn key={a.id} delay={i * 50}>
          <AssignmentCard
            description={a.description}
            details={a.details ?? null}
            status={a.status}
            weeksPersisted={a.weeks_persisted}
          />
        </FadeIn>
      ))}
    </div>
  );
}

/* ── Progress Tab ── */

function ProgressTab({
  tempoData,
}: {
  tempoData: { piece: string; data: TempoDataPoint[] } | null;
}) {
  if (!tempoData) {
    return (
      <EmptyTab
        message="No progress data yet"
        detail="Tempo trends will appear after a few lessons on the same piece."
      />
    );
  }

  return <TempoChart piece={tempoData.piece} data={tempoData.data} />;
}

/* ── Shared Empty State ── */

function EmptyTab({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-12 text-center">
      <p className="font-serif text-lg font-semibold text-charcoal">
        {message}
      </p>
      <p className="mt-1 text-sm text-stone">{detail}</p>
    </div>
  );
}

/* ── Loading Skeleton ── */

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start animate-pulse">
      {/* Left card skeleton */}
      <div className="w-full shrink-0 md:w-[300px]">
        <div className="rounded-[var(--radius-card)] border border-sand bg-warm-white p-6 shadow-card">
          <div className="h-4 w-16 rounded bg-sand" />
          <div className="mt-5 flex flex-col items-center">
            <div className="h-[72px] w-[72px] rounded-full bg-sand" />
            <div className="mt-3 h-6 w-36 rounded bg-sand" />
            <div className="mt-2.5 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-sand" />
              <div className="h-6 w-20 rounded-full bg-sand" />
            </div>
            <div className="mt-3 h-3 w-40 rounded bg-sand" />
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-10 w-full rounded-[var(--radius-button)] bg-sand" />
            <div className="h-10 w-full rounded-[var(--radius-button)] bg-sand" />
          </div>
        </div>
      </div>

      {/* Right content skeleton */}
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex gap-4 border-b border-sand pb-2.5">
          <div className="h-4 w-16 rounded bg-sand" />
          <div className="h-4 w-24 rounded bg-sand" />
          <div className="h-4 w-16 rounded bg-sand" />
        </div>
        <div className="space-y-3">
          <LessonCardSkeleton />
          <LessonCardSkeleton />
          <LessonCardSkeleton />
        </div>
      </div>
    </div>
  );
}
