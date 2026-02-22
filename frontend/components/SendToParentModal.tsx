"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface SendToParentModalProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  studentId: string;
  parentSummary: string;
  parentEmail: string | null;
  assignments?: { description: string; details?: string | null }[];
}

function formatAssignments(
  assignments: { description: string; details?: string | null }[],
): string {
  if (assignments.length === 0) return "";
  const items = assignments.map((a, i) => {
    let line = `${i + 1}. ${a.description}`;
    if (a.details) line += ` — ${a.details}`;
    return line;
  });
  return "\n\nPractice Assignments:\n\n" + items.join("\n\n");
}

export default function SendToParentModal({
  open,
  onClose,
  parentSummary,
  assignments = [],
}: SendToParentModalProps) {
  const [copied, setCopied] = useState(false);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [messageBody, setMessageBody] = useState("");

  // Build initial message when modal opens
  useEffect(() => {
    if (open) {
      setCopied(false);
      setIncludeAssignments(true);
      setMessageBody(
        parentSummary + (assignments.length > 0 ? formatAssignments(assignments) : ""),
      );
    }
  }, [open, parentSummary, assignments]);

  // Toggle assignments on/off
  useEffect(() => {
    if (!open) return;
    const assignmentBlock = formatAssignments(assignments);
    if (includeAssignments && assignments.length > 0) {
      // Only append if not already present
      if (!messageBody.includes("Practice Assignments:")) {
        setMessageBody((prev) => prev + assignmentBlock);
      }
    } else {
      // Strip the assignments block
      const idx = messageBody.indexOf("\n\nPractice Assignments:\n");
      if (idx !== -1) {
        setMessageBody(messageBody.slice(0, idx));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeAssignments]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in the textarea
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-parent-title"
          className="relative w-full rounded-t-3xl bg-warm-white p-6 shadow-card-hover animate-[slide-up_0.25s_ease-out] md:max-w-md md:rounded-[var(--radius-card)] md:animate-[fade-in_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-sand md:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              id="send-parent-title"
              className="font-serif text-xl font-semibold text-charcoal"
            >
              Parent Message
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-stone hover:bg-ivory hover:text-charcoal transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {/* Editable message */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-stone">
                Message
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-[var(--radius-button)] border border-sand bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
              />
            </div>

            {/* Include assignments toggle */}
            {assignments.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2.5">
                <button
                  role="switch"
                  aria-checked={includeAssignments}
                  onClick={() => setIncludeAssignments((v) => !v)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    includeAssignments ? "bg-success" : "bg-sand"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-card transition-transform ${
                      includeAssignments ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-charcoal">
                  Include practice assignments
                </span>
              </label>
            )}

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover"
            >
              {copied ? (
                <>
                  <Check size={15} />
                  Copied! ✓
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copy Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
