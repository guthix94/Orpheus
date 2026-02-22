"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";

/* ── Types ── */

interface Lesson {
  id: string;
  status: string;
}

type StageStatus = "done" | "active" | "pending";

interface Stage {
  label: string;
  status: StageStatus;
}

/* ── Stage progression based on elapsed poll cycles ── */

function computeStages(pollCount: number, done: boolean): Stage[] {
  const stages = [
    "Uploading audio...",
    "Transcribing speech...",
    "Analyzing lesson content...",
    "Generating summary...",
  ];

  if (done) {
    return stages.map((label) => ({ label, status: "done" as const }));
  }

  // Advance one stage roughly every 3 polls (≈9 seconds each)
  const activeIdx = Math.min(Math.floor(pollCount / 3), stages.length - 1);

  return stages.map((label, i) => ({
    label,
    status:
      i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));
}

/* ── Page ── */

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pollCountRef = useRef(0);
  const [pollCount, setPollCount] = useState(0);

  // Poll for lesson status
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const lesson = await api<Lesson>(`/api/lessons/${id}`);
        pollCountRef.current += 1;
        setPollCount(pollCountRef.current);

        if (lesson.status === "completed") {
          setDone(true);
          clearInterval(interval);
          // Brief pause to show all-done state, then navigate
          setTimeout(() => router.push(`/lesson/${id}`), 1200);
        } else if (lesson.status === "failed") {
          setError("Processing failed. Please try recording again.");
          clearInterval(interval);
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, router]);

  const stages = computeStages(pollCount, done);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream px-6">
      {/* Bouncing dots */}
      <FadeIn>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </FadeIn>

      {/* Title */}
      <FadeIn delay={50}>
        <h1 className="mt-6 text-center font-serif text-[1.625rem] font-semibold text-charcoal">
          {done ? "Summary ready!" : "Preparing your summary"}
        </h1>
      </FadeIn>

      {/* Stage list */}
      <FadeIn delay={100}>
        <div className="mt-8 w-full max-w-xs space-y-3">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-3">
              <StageIndicator status={stage.status} />
              <span
                className={`text-sm ${
                  stage.status === "done"
                    ? "text-success"
                    : stage.status === "active"
                      ? "font-medium text-charcoal"
                      : "text-stone"
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Helper text */}
      <FadeIn delay={150}>
        <p className="mt-10 max-w-xs text-center text-xs leading-relaxed text-stone">
          {done ? (
            "Redirecting to your summary..."
          ) : (
            <>
              This usually takes about 2 minutes.
              <br />
              <Link
                href="/lesson/record"
                className="font-medium text-amber underline"
              >
                Feel free to start your next lesson.
              </Link>
            </>
          )}
        </p>
      </FadeIn>

      {/* Error */}
      {error && (
        <FadeIn delay={200}>
          <div className="mt-6 max-w-xs rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-center text-sm text-error">
            {error}
            <Link
              href="/lesson/record"
              className="mt-2 block font-medium text-charcoal underline"
            >
              Try again
            </Link>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

/* ── Stage Indicator ── */

function StageIndicator({ status }: { status: StageStatus }) {
  if (status === "done") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
        <Check size={12} className="text-white" strokeWidth={3} />
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-amber animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
      </div>
    );
  }

  // pending
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-sand" />
    </div>
  );
}
