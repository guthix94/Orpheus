"use client";

export interface AssignmentCardProps {
  description: string;
  details: string | null;
  status: "assigned" | "achieved" | "partially_achieved" | "not_attempted";
  weeksPersisted: number;
}

const STATUS_CONFIG: Record<
  AssignmentCardProps["status"],
  { label: string; text: string; bg: string }
> = {
  assigned: { label: "Assigned", text: "text-amber", bg: "bg-amber-glow" },
  achieved: { label: "Achieved", text: "text-success", bg: "bg-success-bg" },
  partially_achieved: {
    label: "Partial",
    text: "text-warning",
    bg: "bg-warning-bg",
  },
  not_attempted: {
    label: "Not attempted",
    text: "text-stone",
    bg: "bg-ivory",
  },
};

export default function AssignmentCard({
  description,
  details,
  status,
  weeksPersisted,
}: AssignmentCardProps) {
  const { label, text, bg } = STATUS_CONFIG[status];

  return (
    <div className="rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-base font-semibold text-charcoal">
          {description}
        </p>
        <span
          className={`shrink-0 rounded-[var(--radius-chip)] px-2.5 py-0.5 text-[11px] font-semibold ${text} ${bg}`}
        >
          {label}
        </span>
      </div>

      {details && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate">{details}</p>
      )}

      {weeksPersisted > 1 && (
        <span className="mt-2 inline-block rounded-[var(--radius-chip)] bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-stone">
          Assigned for {weeksPersisted} weeks
        </span>
      )}
    </div>
  );
}

export function AssignmentCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-4 w-48 rounded bg-sand" />
        <div className="h-5 w-16 rounded-full bg-sand" />
      </div>
      <div className="mt-2 h-3 w-full rounded bg-sand" />
      <div className="mt-1 h-3 w-2/3 rounded bg-sand" />
    </div>
  );
}
