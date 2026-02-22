"use client";

import type { ReactNode } from "react";

interface QuickStatCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
}

export default function QuickStatCard({ icon, value, label }: QuickStatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-warm-white p-4 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-amber-glow text-amber">
        {icon}
      </div>
      <div>
        <p className="font-serif text-2xl font-semibold leading-tight text-charcoal">
          {value}
        </p>
        <p className="text-xs font-medium text-stone">{label}</p>
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
