"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Upload,
  FileAudio,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";

/* ── Types ── */

interface Student {
  id: string;
  name: string;
  instrument: string;
  current_pieces?: string[];
}

interface Lesson {
  id: string;
  status: string;
}

type UploadStage =
  | "idle"
  | "creating"
  | "stopping"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

const ACCEPTED_FORMATS = ".mp3,.webm,.wav,.m4a,.ogg,.flac,.aac";

/* ── Dev gate ── */

const IS_DEV =
  process.env.NEXT_PUBLIC_DEV_MODE === "true" ||
  process.env.NODE_ENV === "development";

/* ── Page ── */

export default function TestUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Student state
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // File state
  const [file, setFile] = useState<File | null>(null);

  // Upload/processing state
  const [stage, setStage] = useState<UploadStage>("idle");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dev gate: redirect in production
  useEffect(() => {
    if (!IS_DEV) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Fetch students
  useEffect(() => {
    api<Student[]>("/api/students")
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus search
  useEffect(() => {
    if (!selectedStudent) inputRef.current?.focus();
  }, [loading, selectedStudent]);

  // Poll for completion once processing starts
  useEffect(() => {
    if (stage !== "processing" || !lessonId) return;

    const interval = setInterval(async () => {
      try {
        const lesson = await api<Lesson>(`/api/lessons/${lessonId}`);
        if (lesson.status === "completed") {
          setStage("completed");
          clearInterval(interval);
        } else if (lesson.status === "failed") {
          setStage("error");
          setError("Processing failed. Check backend logs for details.");
          clearInterval(interval);
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [stage, lessonId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.current_pieces ?? []).some((p) => p.toLowerCase().includes(q)),
    );
  }, [students, query]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedStudent || !file) return;

    setError(null);

    try {
      // Step 1: Create lesson
      setStage("creating");
      const lesson = await api<Lesson>("/api/lessons", {
        method: "POST",
        body: JSON.stringify({ student_id: selectedStudent.id }),
      });
      const id = lesson.id;
      setLessonId(id);

      // Step 2: Stop lesson (transitions to "processing" status)
      setStage("stopping");
      await api<Lesson>(`/api/lessons/${id}/stop`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      // Step 3: Upload audio file
      setStage("uploading");
      await uploadFile<Lesson>(
        `/api/lessons/${id}/upload-audio`,
        file,
        file.name,
      );

      // Step 4: Now polling for completion
      setStage("processing");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setFile(null);
    setStage("idle");
    setLessonId(null);
    setError(null);
    setQuery("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!IS_DEV) return null;

  const isUploading = stage !== "idle" && stage !== "completed" && stage !== "error";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <FadeIn>
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-glow px-3 py-1 text-xs font-semibold text-amber">
              <AlertTriangle size={12} />
              DEV / TEST ONLY
            </div>
            <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-charcoal">
              Upload Audio File
            </h1>
            <p className="mt-1.5 text-sm text-stone">
              Process an existing audio file through the pipeline
            </p>
          </div>
        </FadeIn>

        {/* Step 1: Student selector */}
        <FadeIn delay={50}>
          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">
              1. Select Student
            </label>

            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-warm-white p-3.5 shadow-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-charcoal ${avatarColor(selectedStudent.name)}`}
                  >
                    {initials(selectedStudent.name)}
                  </div>
                  <div>
                    <p className="font-serif text-base font-semibold text-charcoal">
                      {selectedStudent.name}
                    </p>
                    <p className="text-xs text-stone">
                      {selectedStudent.instrument}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setQuery("");
                  }}
                  disabled={isUploading}
                  className="rounded-full p-1.5 text-stone hover:text-charcoal transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or piece..."
                    className="w-full rounded-[var(--radius-card)] border border-sand bg-warm-white py-3.5 pl-10 pr-10 text-sm text-charcoal placeholder:text-mist transition-shadow duration-[var(--transition-fast)] focus:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-amber/40"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone hover:text-charcoal transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
                  {loading ? (
                    <>
                      {Array.from({ length: 3 }, (_, i) => (
                        <StudentRowSkeleton key={i} />
                      ))}
                    </>
                  ) : filtered.length > 0 ? (
                    filtered.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-3 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-charcoal ${avatarColor(s.name)}`}
                        >
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-semibold text-charcoal">
                            {s.name}
                          </p>
                          <p className="truncate text-xs text-stone">
                            {s.instrument}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-stone">
                      No students found.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </FadeIn>

        {/* Step 2: File picker */}
        <FadeIn delay={100}>
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">
              2. Choose Audio File
            </label>

            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed p-4 transition-colors ${
                file
                  ? "border-success/40 bg-success/5"
                  : "border-sand bg-warm-white hover:border-amber/40"
              } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            >
              <FileAudio
                size={24}
                className={file ? "text-success" : "text-stone"}
              />
              <div className="min-w-0 flex-1">
                {file ? (
                  <>
                    <p className="truncate text-sm font-medium text-charcoal">
                      {file.name}
                    </p>
                    <p className="text-xs text-stone">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-charcoal">
                      Click to select audio file
                    </p>
                    <p className="text-xs text-stone">
                      MP3, WebM, WAV, M4A, OGG, FLAC, AAC
                    </p>
                  </>
                )}
              </div>
              {file && !isUploading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-full p-1 text-stone hover:text-charcoal transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </FadeIn>

        {/* Step 3: Upload button */}
        <FadeIn delay={150}>
          <div className="mt-6">
            {stage === "idle" || stage === "error" ? (
              <button
                onClick={handleUpload}
                disabled={!selectedStudent || !file}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                Upload &amp; Process
              </button>
            ) : stage === "completed" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-success/10 py-3.5 text-sm font-semibold text-success">
                  <Check size={18} />
                  Processing complete!
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/lesson/${lessonId}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    View Summary
                  </Link>
                  <button
                    onClick={handleReset}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-sand bg-warm-white py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-cream"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ProgressStages currentStage={stage} />
                <p className="text-center text-xs text-stone">
                  {stage === "processing"
                    ? "This usually takes about 2 minutes..."
                    : "Setting up..."}
                </p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Error display */}
        {error && (
          <FadeIn delay={200}>
            <div className="mt-4 rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-center text-sm text-error">
              {error}
              <button
                onClick={handleReset}
                className="mt-2 block w-full font-medium text-charcoal underline"
              >
                Try again
              </button>
            </div>
          </FadeIn>
        )}

        {/* Back link */}
        <FadeIn delay={200}>
          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="text-xs text-stone underline hover:text-charcoal transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ── Progress stages ── */

function ProgressStages({ currentStage }: { currentStage: UploadStage }) {
  const stages: { key: UploadStage; label: string }[] = [
    { key: "creating", label: "Creating lesson..." },
    { key: "stopping", label: "Preparing for upload..." },
    { key: "uploading", label: "Uploading audio..." },
    { key: "processing", label: "Processing with AI..." },
  ];

  const currentIdx = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;

        return (
          <div key={s.key} className="flex items-center gap-3">
            {isDone ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            ) : isActive ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-amber animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
              </div>
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-sand" />
              </div>
            )}
            <span
              className={`text-sm ${
                isDone
                  ? "text-success"
                  : isActive
                    ? "font-medium text-charcoal"
                    : "text-stone"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StudentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-3 shadow-card animate-pulse">
      <div className="h-9 w-9 shrink-0 rounded-full bg-sand" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-24 rounded bg-sand" />
        <div className="h-2.5 w-16 rounded bg-sand" />
      </div>
    </div>
  );
}
