"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";

/* ── Types ── */

interface Student {
  id: string;
  name: string;
  instrument: string;
  current_pieces?: string[];
}

/* ── Page ── */

export default function StudentSelectPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<Student[]>("/api/students")
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus search input
  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.current_pieces ?? []).some((p) => p.toLowerCase().includes(q)),
    );
  }, [students, query]);

  const hasExactMatch = filtered.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const handleSelectStudent = (studentId: string) => {
    router.push(`/lesson/record/${studentId}`);
  };

  const handleAddNew = async () => {
    if (!query.trim() || creating) return;
    setCreating(true);
    try {
      const newStudent = await api<Student>("/api/students", {
        method: "POST",
        body: JSON.stringify({ name: query.trim(), instrument: "violin" }),
      });
      router.push(`/lesson/record/${newStudent.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <FadeIn>
          <div className="text-center">
            <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-charcoal">
              Start a Lesson
            </h1>
            <p className="mt-1.5 text-sm text-stone">Who are you teaching?</p>
          </div>
        </FadeIn>

        {/* Search */}
        <FadeIn delay={50}>
          <div className="relative mt-6">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-stone hover:text-charcoal transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </FadeIn>

        {/* Student List */}
        <FadeIn delay={100}>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
            {loading ? (
              <>
                {Array.from({ length: 4 }, (_, i) => (
                  <StudentRowSkeleton key={i} />
                ))}
              </>
            ) : filtered.length > 0 ? (
              filtered.map((s, i) => (
                <FadeIn key={s.id} delay={120 + i * 40}>
                  <StudentRow student={s} onSelect={handleSelectStudent} />
                </FadeIn>
              ))
            ) : query.trim() && !hasExactMatch ? null : (
              <p className="py-6 text-center text-sm text-stone">
                No students yet. Type a name to create one.
              </p>
            )}

            {/* Add new student */}
            {query.trim() && !hasExactMatch && (
              <FadeIn delay={150}>
                <button
                  onClick={handleAddNew}
                  disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-amber/40 bg-amber-glow px-4 py-3.5 text-sm font-semibold text-amber transition-colors hover:border-amber/60 disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  {creating ? "Creating..." : `Add "${query.trim()}" as new student`}
                </button>
              </FadeIn>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ── Student Row ── */

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

function StudentRow({
  student,
  onSelect,
}: {
  student: Student;
  onSelect: (id: string) => void;
}) {
  const initials = student.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={() => onSelect(student.id)}
      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-3.5 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-charcoal ${avatarColor(student.name)}`}
      >
        {initials}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate font-serif text-base font-semibold text-charcoal">
          {student.name}
        </p>
        <p className="truncate text-xs text-stone">
          {student.instrument}
          {student.current_pieces?.[0] && ` · ${student.current_pieces[0]}`}
        </p>
      </div>
    </button>
  );
}

function StudentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-3.5 shadow-card animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-full bg-sand" />
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded bg-sand" />
        <div className="h-3 w-20 rounded bg-sand" />
      </div>
    </div>
  );
}
