"use client";

import Link from "next/link";

interface StudentCardProps {
  id: string;
  name: string;
  instrument: string;
  lastLessonDate: string | null;
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
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{instrument}</p>
      </div>
      <div className="ml-auto text-right">
        {lastLessonDate ? (
          <p className="text-xs text-gray-400">
            Last lesson:{" "}
            {new Date(lastLessonDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        ) : (
          <p className="text-xs text-gray-400">No lessons yet</p>
        )}
      </div>
    </Link>
  );
}
