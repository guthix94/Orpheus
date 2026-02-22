"use client";

export interface TempoDataPoint {
  date: string;
  tempo: number;
}

interface TempoChartProps {
  data: TempoDataPoint[];
  /** Piece name shown as chart title */
  piece: string;
}

export default function TempoChart({ data, piece }: TempoChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-10 text-center">
        <p className="text-sm text-stone">No tempo data available yet.</p>
      </div>
    );
  }

  const maxTempo = Math.max(...data.map((d) => d.tempo));
  const minTempo = Math.min(...data.map((d) => d.tempo));
  const lastIdx = data.length - 1;

  // Calculate improvement
  const improvement =
    data.length >= 2
      ? Math.round(((data[lastIdx].tempo - data[0].tempo) / data[0].tempo) * 100)
      : null;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-charcoal">{piece}</h3>

      <div className="space-y-2.5">
        {data.map((point, i) => {
          const pct = maxTempo > 0 ? (point.tempo / maxTempo) * 100 : 0;
          const isCurrent = i === lastIdx;
          const dateLabel = new Date(point.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div key={i} className="flex items-center gap-3">
              {/* Date label */}
              <span className="w-14 shrink-0 text-right text-xs text-stone">
                {dateLabel}
              </span>

              {/* Bar */}
              <div className="flex-1">
                <div className="relative h-7 w-full rounded-[var(--radius-button)] bg-ivory">
                  <div
                    className={`h-full rounded-[var(--radius-button)] transition-all duration-500 ${
                      isCurrent ? "bg-amber" : "bg-amber/40"
                    }`}
                    style={{ width: `${Math.max(pct, 8)}%` }}
                  />
                </div>
              </div>

              {/* Tempo label */}
              <span
                className={`w-16 shrink-0 text-xs font-medium ${
                  isCurrent ? "text-charcoal" : "text-stone"
                }`}
              >
                &#9833;={point.tempo}
              </span>
            </div>
          );
        })}
      </div>

      {/* Improvement banner */}
      {improvement !== null && improvement > 0 && (
        <div className="flex items-center gap-2 rounded-[var(--radius-button)] bg-success-bg px-4 py-2.5">
          <span className="text-sm font-medium text-success">
            &uarr; +{improvement}% tempo improvement over {data.length} weeks
          </span>
        </div>
      )}

      {improvement !== null && improvement < 0 && (
        <div className="flex items-center gap-2 rounded-[var(--radius-button)] bg-warning-bg px-4 py-2.5">
          <span className="text-sm font-medium text-warning">
            Tempo decreased {Math.abs(improvement)}% — may be working on accuracy
          </span>
        </div>
      )}
    </div>
  );
}

export function TempoChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-40 rounded bg-sand" />
      <div className="space-y-2.5">
        {[80, 60, 45, 30].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-14 rounded bg-sand" />
            <div className="flex-1">
              <div className="h-7 rounded-[var(--radius-button)] bg-ivory">
                <div
                  className="h-full rounded-[var(--radius-button)] bg-sand"
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
            <div className="h-3 w-16 rounded bg-sand" />
          </div>
        ))}
      </div>
    </div>
  );
}
