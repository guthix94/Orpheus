"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface StudentCardProps {
  id: string;
  name: string;
  instrument: string;
  currentPiece: string | null;
  estimatedLevel: string | null;
  lastLessonDate: string | null;
}

/** Deterministic pastel background from a name string. */
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

/** Relative time label from an ISO date string. */
function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Status dot color based on how recently the student had a lesson. */
function activityDot(lastLessonDate: string | null): string {
  if (!lastLessonDate) return "bg-mist";
  const days = Math.floor(
    (Date.now() - new Date(lastLessonDate).getTime()) / 86_400_000,
  );
  if (days <= 7) return "bg-success";
  if (days <= 21) return "bg-warning";
  return "bg-stone";
}

export default function StudentCard({
  id,
  name,
  instrument,
  currentPiece,
  estimatedLevel,
  lastLessonDate,
}: StudentCardProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const meta: string[] = [instrument];
  if (estimatedLevel) meta.push(estimatedLevel);
  if (lastLessonDate) meta.push(`Last: ${relativeDate(lastLessonDate)}`);

  return (
    <Link
      href={`/students/${id}`}
      className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
    >
      {/* Avatar */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-charcoal ${avatarColor(name)}`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-serif text-base font-semibold text-charcoal">
            {name}
          </p>
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${activityDot(lastLessonDate)}`}
          />
        </div>
        <p className="mt-0.5 truncate text-sm text-slate">
          {currentPiece ?? "No current piece"}
        </p>
        <p className="mt-0.5 truncate text-xs text-stone">
          {meta.join(" \u00B7 ")}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={18}
        className="shrink-0 text-mist transition-colors duration-[var(--transition-fast)] group-hover:text-amber"
      />
    </Link>
  );
}

export function StudentCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card animate-pulse">
      <div className="h-12 w-12 shrink-0 rounded-full bg-sand" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-sand" />
        <div className="h-3 w-40 rounded bg-sand" />
        <div className="h-3 w-24 rounded bg-sand" />
      </div>
      <div className="h-4 w-4 rounded bg-sand" />
    </div>
  );
}
