"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Send, X } from "lucide-react";
import { api } from "@/lib/api";

interface SendToParentModalProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  studentId: string;
  parentSummary: string;
  parentEmail: string | null;
}

export default function SendToParentModal({
  open,
  onClose,
  lessonId,
  studentId,
  parentSummary,
  parentEmail,
}: SendToParentModalProps) {
  const [email, setEmail] = useState(parentEmail ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail(parentEmail ?? "");
      setSent(false);
      setError(null);
    }
  }, [open, parentEmail]);

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

  const handleSend = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await api("/api/parents/messages", {
        method: "POST",
        body: JSON.stringify({
          lesson_id: lessonId,
          student_id: studentId,
          message_body: parentSummary,
          message_type: "lesson_summary",
          channel: "email",
          recipient: email.trim(),
        }),
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
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

      {/* Modal — bottom sheet on mobile, centered on desktop */}
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
              Send to Parent
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-stone hover:bg-ivory hover:text-charcoal transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {sent ? (
            /* ── Success State ── */
            <div className="mt-8 flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
                <Check size={24} className="text-success" strokeWidth={3} />
              </div>
              <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
                Sent to {email}!
              </p>
              <p className="mt-1 text-sm text-stone">
                The parent will receive an email shortly.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-[var(--radius-button)] bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover"
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Send Form ── */
            <div className="mt-5 space-y-4">
              {/* Email input */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-stone">
                  Parent email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="w-full rounded-[var(--radius-button)] border border-sand bg-cream px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
                />
              </div>

              {/* Message preview */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-stone">
                  Message preview
                </label>
                <div className="max-h-48 overflow-y-auto rounded-[var(--radius-button)] bg-cream p-4 text-sm leading-relaxed text-slate">
                  {parentSummary}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-[var(--radius-button)] bg-error-bg px-3 py-2 text-xs text-error">
                  {error}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!email.trim() || sending}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-charcoal px-5 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
              >
                <Send size={15} />
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
