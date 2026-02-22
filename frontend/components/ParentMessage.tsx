"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ParentMessageProps {
  lessonId: string;
  studentId: string;
  parentSummary: string | null;
  parentEmail: string | null;
}

interface MessageResponse {
  id: string;
}

export default function ParentMessage({
  lessonId,
  studentId,
  parentSummary,
  parentEmail,
}: ParentMessageProps) {
  const [email, setEmail] = useState(parentEmail ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !parentSummary) return;
    setSending(true);
    try {
      await api<MessageResponse>("/api/parents/messages", {
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
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <p className="font-medium text-green-700">Message sent to parent</p>
        <p className="mt-1 text-sm text-green-600">{email}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-medium text-gray-700">Send to Parent</h3>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Parent email address"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
      />
      <button
        onClick={handleSend}
        disabled={!email.trim() || !parentSummary || sending}
        className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
      >
        {sending ? "Sending..." : "Send to Parent"}
      </button>
    </div>
  );
}
