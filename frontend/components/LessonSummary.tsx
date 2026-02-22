"use client";

interface Assignment {
  description: string;
  details?: string;
}

interface LessonSummaryProps {
  status: string;
  teacherSummary: string | null;
  parentSummary: string | null;
  piecesDetected: string[] | null;
  suggestedAssignments: Assignment[] | null;
  durationSeconds: number | null;
  startedAt: string;
}

/**
 * If the value looks like a JSON string containing a summary object,
 * try to extract the plain-text field from it. This handles the case
 * where the raw Claude JSON response ends up stored as-is.
 */
function extractText(
  raw: string | null,
  field: string,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && typeof parsed[field] === "string") {
      return parsed[field];
    }
  } catch {
    // Not JSON — return as-is
  }
  return raw;
}

/**
 * Try to extract a typed array from a value that might be a JSON string.
 */
function extractArray<T>(raw: T[] | string | null, field: string): T[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "object" && parsed !== null && Array.isArray(parsed[field])) {
        return parsed[field];
      }
    } catch {
      // Not JSON
    }
  }
  return null;
}

export default function LessonSummary({
  status,
  teacherSummary,
  parentSummary,
  piecesDetected,
  suggestedAssignments,
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

  const teacher = extractText(teacherSummary, "teacher_summary");
  const parent = extractText(parentSummary, "parent_summary");
  const pieces = extractArray<string>(piecesDetected as string[] | null, "pieces_detected");
  const assignments = extractArray<Assignment>(
    suggestedAssignments as Assignment[] | null,
    "suggested_assignments",
  );

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
      {pieces && pieces.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Pieces Detected</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {pieces.map((piece) => (
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
        {teacher ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {teacher}
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
        {parent ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {parent}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-400">
            Available after processing completes.
          </p>
        )}
      </div>

      {/* Suggested assignments */}
      {assignments && assignments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">
            Suggested Assignments
          </h3>
          <ul className="mt-2 space-y-3">
            {assignments.map((a, i) => (
              <li
                key={i}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <p className="font-medium text-gray-800">{a.description}</p>
                {a.details && (
                  <p className="mt-1 text-sm text-gray-500">{a.details}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
