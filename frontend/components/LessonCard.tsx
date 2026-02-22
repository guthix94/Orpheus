"use client";

import Link from "next/link";

interface LessonCardProps {
  id: string;
  studentName: string;
  piece: string | null;
  date: string;
  status: "recording" | "processing" | "completed" | "failed";
}

const STATUS_CONFIG: Record<
  LessonCardProps["status"],
  { dot: string; label: string }
> = {
  completed: { dot: "bg-success", label: "Completed" },
  processing: { dot: "bg-warning", label: "Processing" },
  recording: { dot: "bg-record-red", label: "Recording" },
  failed: { dot: "bg-error", label: "Failed" },
};

/** Deterministic pastel background from a name string. */
function avatarColor(name: string): string {
  const hues = [
    "bg-[#F0E6D3]", // warm sand
    "bg-[#E6D9C7]", // tan
    "bg-[#DDE8D6]", // sage
    "bg-[#D6E0E8]", // sky mist
    "bg-[#E4D8E8]", // lavender
    "bg-[#E8D6D6]", // blush
    "bg-[#D9E4D4]", // mint
    "bg-[#E8E0D0]", // wheat
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hues[Math.abs(hash) % hues.length];
}

export default function LessonCard({
  id,
  studentName,
  piece,
  date,
  status,
}: LessonCardProps) {
  const initials = studentName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const { dot, label } = STATUS_CONFIG[status];

  const formatted = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/lesson/${id}`}
      className="flex items-center gap-3.5 rounded-[var(--radius-card)] bg-warm-white p-4 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
    >
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-charcoal ${avatarColor(studentName)}`}
      >
        {initials}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base font-semibold text-charcoal">
          {studentName}
        </p>
        <p className="truncate text-xs text-stone">
          {piece ?? "No piece detected"}
        </p>
      </div>

      {/* Right side: date + status */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-stone">{formatted}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-stone">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      </div>
    </Link>
  );
}

export function LessonCardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-[var(--radius-card)] bg-warm-white p-4 shadow-card animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-full bg-sand" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-28 rounded bg-sand" />
        <div className="h-3 w-20 rounded bg-sand" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-12 rounded bg-sand" />
        <div className="h-3 w-16 rounded bg-sand" />
      </div>
    </div>
  );
}
