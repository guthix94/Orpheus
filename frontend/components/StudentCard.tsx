"use client";

import Link from "next/link";

interface StudentCardProps {
  id: string;
  name: string;
  instrument: string;
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

export default function StudentCard({
  id,
  name,
  instrument,
  lastLessonDate,
}: StudentCardProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/students/${id}`}
      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card transition-shadow duration-[var(--transition-fast)] hover:shadow-card-hover"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-charcoal ${avatarColor(name)}`}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate font-serif text-base font-semibold text-charcoal">
          {name}
        </p>
        <p className="text-sm text-stone">{instrument}</p>
      </div>
      <div className="ml-auto text-right">
        {lastLessonDate ? (
          <p className="text-xs text-stone">
            Last lesson:{" "}
            {new Date(lastLessonDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        ) : (
          <p className="text-xs text-mist">No lessons yet</p>
        )}
      </div>
    </Link>
  );
}
