"use client";

import type { ReactNode } from "react";

interface QuickStatCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
}

export default function QuickStatCard({ icon, value, label }: QuickStatCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-card)] bg-warm-white p-3 shadow-card sm:gap-3 sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-amber-glow text-amber sm:h-10 sm:w-10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate font-serif text-xl font-semibold leading-tight text-charcoal sm:text-2xl">
          {value}
        </p>
        <p className="truncate text-[11px] font-medium text-stone sm:text-xs">{label}</p>
      </div>
    </div>
  );
}

export function QuickStatSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-4 shadow-card animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-[var(--radius-button)] bg-sand" />
      <div className="space-y-1.5">
        <div className="h-6 w-10 rounded bg-sand" />
        <div className="h-3 w-16 rounded bg-sand" />
      </div>
    </div>
  );
}
