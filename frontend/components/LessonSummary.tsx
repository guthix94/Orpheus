"use client";

interface LessonSummaryProps {
  status: string;
  teacherSummary: string | null;
  parentSummary: string | null;
  piecesDetected: string[] | null;
  durationSeconds: number | null;
  startedAt: string;
}

export default function LessonSummary({
  status,
  teacherSummary,
  parentSummary,
  piecesDetected,
  durationSeconds,
  startedAt,
}: LessonSummaryProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const date = new Date(startedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">{date}</p>
        {durationSeconds != null && (
          <p className="text-sm text-gray-400">
            Duration: {formatDuration(durationSeconds)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            status === "completed"
              ? "bg-green-100 text-green-700"
              : status === "processing"
                ? "bg-yellow-100 text-yellow-700"
                : status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Pieces detected */}
      {piecesDetected && piecesDetected.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Pieces Detected</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {piecesDetected.map((piece) => (
              <span
                key={piece}
                className="rounded-md bg-indigo-50 px-2 py-1 text-sm text-indigo-700"
              >
                {piece}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Teacher summary */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Teacher Summary</h3>
        {teacherSummary ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {teacherSummary}
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
            <p className="mt-2 text-xs text-gray-400">
              {status === "processing"
                ? "AI summary is being generated..."
                : "Summary will appear after processing."}
            </p>
          </div>
        )}
      </div>

      {/* Parent summary */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Parent Summary</h3>
        {parentSummary ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {parentSummary}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-400">
            Available after processing completes.
          </p>
        )}
      </div>
    </div>
  );
}
