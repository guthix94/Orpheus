"use client";

import { useEffect, useRef, useState } from "react";
import { Music, X } from "lucide-react";

interface EditableChipProps {
  value: string;
  onEdit: (newValue: string) => void;
  onRemove: () => void;
}

export default function EditableChip({
  value,
  onEdit,
  onRemove,
}: EditableChipProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onEdit(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-[30px] rounded-[var(--radius-chip)] border border-amber bg-amber-glow px-3 text-xs font-medium text-amber outline-none"
        style={{ width: `${Math.max(draft.length, 4) * 7.5 + 24}px`, maxWidth: "220px" }}
      />
    );
  }

  return (
    <span className="group relative inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-amber-glow px-3 py-1 text-xs font-medium text-amber">
      <Music size={12} />
      <span
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="cursor-text"
      >
        {value}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 -mr-1 flex h-4 w-4 items-center justify-center rounded-full text-mist transition-colors hover:bg-error-bg hover:text-error"
        aria-label={`Remove ${value}`}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  );
}

/* ── Add Piece Button ── */

interface AddPieceButtonProps {
  onAdd: (value: string) => void;
}

export function AddPieceButton({ onAdd }: AddPieceButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setDraft("");
      setOpen(false);
    }
  };

  if (open) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="Piece name..."
        className="h-[30px] rounded-[var(--radius-chip)] border border-dashed border-amber bg-transparent px-3 text-xs font-medium text-amber placeholder:text-amber/50 outline-none"
        style={{ width: "150px" }}
      />
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex h-[30px] items-center gap-1 rounded-[var(--radius-chip)] border border-dashed border-amber/50 px-3 text-xs font-medium text-amber/70 transition-colors hover:border-amber hover:text-amber"
    >
      + Add piece
    </button>
  );
}
