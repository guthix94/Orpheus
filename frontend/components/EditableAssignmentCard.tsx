"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

/* ── Types ── */

export interface Assignment {
  id?: string;
  description: string;
  details?: string | null;
}

interface EditableAssignmentCardProps {
  assignment: Assignment;
  onSave: (updated: { description: string; details: string }) => void;
  onDelete: () => void;
}

/* ── Card ── */

export default function EditableAssignmentCard({
  assignment,
  onSave,
  onDelete,
}: EditableAssignmentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(assignment.description);
  const [details, setDetails] = useState(assignment.details ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Focus description input when entering edit mode
  useEffect(() => {
    if (editing) descRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimDesc = desc.trim();
    if (!trimDesc) return;
    onSave({ description: trimDesc, details: details.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setDesc(assignment.description);
    setDetails(assignment.details ?? "");
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (editing) {
    return (
      <div className="rounded-[var(--radius-card)] border border-amber/40 bg-warm-white p-4 shadow-card space-y-3">
        <input
          ref={descRef}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Assignment title"
          className="w-full rounded-[var(--radius-button)] border border-sand bg-cream px-3 py-2 text-sm font-semibold text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Details (optional)"
          rows={2}
          className="w-full resize-none rounded-[var(--radius-button)] border border-sand bg-cream px-3 py-2 text-sm text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!desc.trim()}
            className="rounded-[var(--radius-button)] bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="rounded-[var(--radius-button)] border border-sand px-3.5 py-1.5 text-xs font-semibold text-stone transition-colors hover:text-charcoal"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-[var(--radius-card)] border border-sand bg-warm-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold text-charcoal">
            {assignment.description}
          </p>
          {assignment.details && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate">
              {assignment.details}
            </p>
          )}
        </div>

        {/* ⋯ menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-mist transition-colors hover:bg-ivory hover:text-charcoal"
            aria-label="Assignment options"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-32 rounded-[var(--radius-button)] border border-sand bg-warm-white py-1 shadow-card-hover animate-[fade-in_0.12s_ease-out]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-charcoal hover:bg-ivory transition-colors"
              >
                <Pencil size={12} />
                Edit
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error-bg transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Add Assignment Button + Inline Form ── */

interface AddAssignmentFormProps {
  onAdd: (a: { description: string; details: string }) => void;
}

export function AddAssignmentForm({ onAdd }: AddAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [details, setDetails] = useState("");
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) descRef.current?.focus();
  }, [open]);

  const handleSave = () => {
    const trimDesc = desc.trim();
    if (!trimDesc) return;
    onAdd({ description: trimDesc, details: details.trim() });
    setDesc("");
    setDetails("");
    setOpen(false);
  };

  const handleCancel = () => {
    setDesc("");
    setDetails("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-amber/50 px-4 py-3 text-xs font-semibold text-amber/70 transition-colors hover:border-amber hover:text-amber"
      >
        + Add Assignment
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-amber/40 bg-warm-white p-4 shadow-card space-y-3">
      <input
        ref={descRef}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Assignment title"
        className="w-full rounded-[var(--radius-button)] border border-sand bg-cream px-3 py-2 text-sm font-semibold text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
      />
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Details (optional)"
        rows={2}
        className="w-full resize-none rounded-[var(--radius-button)] border border-sand bg-cream px-3 py-2 text-sm text-charcoal placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-amber/40"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!desc.trim()}
          className="rounded-[var(--radius-button)] bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="rounded-[var(--radius-button)] border border-sand px-3.5 py-1.5 text-xs font-semibold text-stone transition-colors hover:text-charcoal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
