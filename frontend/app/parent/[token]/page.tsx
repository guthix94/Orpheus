"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Music,
  Pause,
  Play,
} from "lucide-react";

/* ── Types ── */

interface PortalInfo {
  student_name: string;
  teacher_name: string | null;
  instrument: string;
}

interface Clip {
  index: number;
  start: number;
  end: number;
  duration: number;
  types: string[];
  url: string;
  label?: string;
}

interface PortalLesson {
  parent_summary: string | null;
  suggested_assignments: { description: string; details?: string | null }[] | null;
  pieces_detected: string[] | null;
  clips: Clip[] | null;
  started_at: string;
  duration_seconds: number | null;
}

type Tab = "latest" | "history";

/* ── Helpers ── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function publicApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clipLabel(clip: Clip): string {
  if (clip.label) return clip.label;
  const hasMusic = clip.types.includes("music");
  const hasSpeech = clip.types.includes("speech");
  if (hasMusic && hasSpeech) return "Speech + Music";
  if (hasMusic) return "Music";
  if (hasSpeech) return "Speech";
  return clip.types.join(", ") || "Clip";
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function extractText(raw: string | null, field: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && typeof parsed[field] === "string") {
      return parsed[field];
    }
  } catch { /* not JSON */ }
  return raw;
}

/* ── Audio Player ── */

function PortalAudioPlayer({
  clip,
  isPlaying,
  onToggle,
  audioRef,
}: {
  clip: Clip;
  isPlaying: boolean;
  onToggle: () => void;
  audioRef: (el: HTMLAudioElement | null) => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration);
  const [isSeeking, setIsSeeking] = useState(false);
  const elRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onLoaded = () => {
      if (el.duration && isFinite(el.duration)) setDuration(el.duration);
    };
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("durationchange", onLoaded);
    if (el.duration && isFinite(el.duration)) setDuration(el.duration);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("durationchange", onLoaded);
    };
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      if (!isSeeking) setCurrentTime(el.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, isSeeking]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onEnded = () => setCurrentTime(0);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  const seek = useCallback(
    (clientX: number) => {
      const el = elRef.current;
      if (!el || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = ratio * duration;
      el.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsSeeking(true);
      seek(e.clientX);

      const onMove = (ev: PointerEvent) => seek(ev.clientX);
      const onUp = (ev: PointerEvent) => {
        seek(ev.clientX);
        setIsSeeking(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [seek],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-sand bg-warm-white px-4 py-3">
      <button
        onClick={onToggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          isPlaying
            ? "bg-amber text-white"
            : "bg-ivory text-charcoal hover:bg-amber-glow hover:text-amber"
        }`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal">{clipLabel(clip)}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-8 text-right text-[10px] tabular-nums text-stone">
            {formatTime(currentTime)}
          </span>
          <div
            ref={barRef}
            onPointerDown={handlePointerDown}
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-ivory"
            role="slider"
            aria-label="Seek audio"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            tabIndex={0}
            onKeyDown={(e) => {
              const el = elRef.current;
              if (!el) return;
              const step = 5;
              if (e.key === "ArrowRight") {
                el.currentTime = Math.min(duration, el.currentTime + step);
                setCurrentTime(el.currentTime);
              } else if (e.key === "ArrowLeft") {
                el.currentTime = Math.max(0, el.currentTime - step);
                setCurrentTime(el.currentTime);
              }
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-[10px] tabular-nums text-mist">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <audio
        ref={(el) => {
          elRef.current = el;
          audioRef(el);
        }}
        src={clip.url}
        preload="none"
      />
    </div>
  );
}

/* ── Latest Tab ── */

function LatestTab({
  lesson,
  playingKey,
  onTogglePlay,
  setAudioRef,
}: {
  lesson: PortalLesson;
  playingKey: string | null;
  onTogglePlay: (key: string) => void;
  setAudioRef: (key: string, el: HTMLAudioElement | null) => void;
}) {
  const parentText = extractText(lesson.parent_summary, "parent_summary");
  const assignments = lesson.suggested_assignments ?? [];
  const pieces = lesson.pieces_detected ?? [];
  const clips = lesson.clips ?? [];

  return (
    <div className="space-y-6">
      {/* Practice Goals */}
      {assignments.length > 0 && (
        <div className="rounded-2xl border border-sand bg-warm-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-amber" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone">
              What to Practice
            </h3>
          </div>
          <p className="mt-1 text-xs text-mist">
            From lesson on {formatDate(lesson.started_at)}
          </p>

          <ol className="mt-4 space-y-3">
            {assignments.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-glow text-xs font-semibold text-amber">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{a.description}</p>
                  {a.details && (
                    <p className="mt-0.5 text-xs text-slate">{a.details}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Featured audio clip */}
      {clips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music size={14} className="text-amber" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone">
              Listen
            </h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-amber/30 bg-gradient-to-br from-amber-glow to-warm-white p-1">
            <PortalAudioPlayer
              clip={clips[0]}
              isPlaying={playingKey === `latest-0`}
              onToggle={() => onTogglePlay(`latest-0`)}
              audioRef={(el) => setAudioRef(`latest-0`, el)}
            />
          </div>
          {clips.slice(1).map((clip, i) => (
            <PortalAudioPlayer
              key={clip.index}
              clip={clip}
              isPlaying={playingKey === `latest-${i + 1}`}
              onToggle={() => onTogglePlay(`latest-${i + 1}`)}
              audioRef={(el) => setAudioRef(`latest-${i + 1}`, el)}
            />
          ))}
        </div>
      )}

      {/* Latest lesson summary */}
      <div className="rounded-2xl border border-sand bg-warm-white p-5 shadow-card">
        <div className="flex items-center gap-3 text-xs text-stone">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            {formatDate(lesson.started_at)}
          </div>
          {lesson.duration_seconds != null && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              {formatDuration(lesson.duration_seconds)}
            </div>
          )}
        </div>

        {pieces.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pieces.map((p, i) => (
              <span
                key={i}
                className="rounded-[var(--radius-chip)] bg-ivory px-2.5 py-0.5 text-xs font-medium text-slate"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {parentText && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-[1.75] text-charcoal">
            {parentText}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── History Tab ── */

function HistoryCard({
  lesson,
  index,
  playingKey,
  onTogglePlay,
  setAudioRef,
}: {
  lesson: PortalLesson;
  index: number;
  playingKey: string | null;
  onTogglePlay: (key: string) => void;
  setAudioRef: (key: string, el: HTMLAudioElement | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parentText = extractText(lesson.parent_summary, "parent_summary");
  const pieces = lesson.pieces_detected ?? [];
  const clips = lesson.clips ?? [];
  const clipCount = clips.length;

  const preview = parentText
    ? parentText.length > 120
      ? parentText.slice(0, 120) + "..."
      : parentText
    : null;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-2xl border border-sand bg-warm-white p-4 text-left shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* Collapsed header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 text-xs text-stone">
            <span className="font-medium text-charcoal">
              {formatDateShort(lesson.started_at)}
            </span>
            {lesson.duration_seconds != null && (
              <span>{formatDuration(lesson.duration_seconds)}</span>
            )}
            {clipCount > 0 && (
              <span className="flex items-center gap-1">
                <Music size={11} /> {clipCount}
              </span>
            )}
          </div>

          {pieces.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pieces.map((p, i) => (
                <span
                  key={i}
                  className="rounded-[var(--radius-chip)] bg-ivory px-2 py-0.5 text-[11px] font-medium text-slate"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {!expanded && preview && (
            <p className="mt-2 line-clamp-2 text-sm text-slate">{preview}</p>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`shrink-0 text-mist transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="mt-4 border-t border-sand pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          {parentText && (
            <p className="whitespace-pre-wrap text-sm leading-[1.75] text-charcoal">
              {parentText}
            </p>
          )}

          {clips.length > 0 && (
            <div className="mt-4 space-y-2">
              {clips.map((clip, i) => (
                <PortalAudioPlayer
                  key={clip.index}
                  clip={clip}
                  isPlaying={playingKey === `history-${index}-${i}`}
                  onToggle={() => onTogglePlay(`history-${index}-${i}`)}
                  audioRef={(el) => setAudioRef(`history-${index}-${i}`, el)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function HistoryTab({
  lessons,
  playingKey,
  onTogglePlay,
  setAudioRef,
}: {
  lessons: PortalLesson[];
  playingKey: string | null;
  onTogglePlay: (key: string) => void;
  setAudioRef: (key: string, el: HTMLAudioElement | null) => void;
}) {
  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-glow">
          <Calendar size={24} className="text-amber" />
        </div>
        <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
          No lessons yet
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone">
          Lesson summaries will appear here after each lesson.
        </p>
      </div>
    );
  }

  // Group by month
  const grouped = new Map<string, PortalLesson[]>();
  for (const lesson of lessons) {
    const key = monthKey(lesson.started_at);
    const arr = grouped.get(key) ?? [];
    arr.push(lesson);
    grouped.set(key, arr);
  }

  // Calculate global indices for unique audio keys
  let globalIndex = 0;

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([key, groupLessons]) => {
        const startIndex = globalIndex;
        globalIndex += groupLessons.length;
        return (
          <div key={key}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone">
              {monthLabel(key)}
            </h3>
            <div className="space-y-3">
              {groupLessons.map((lesson, i) => (
                <HistoryCard
                  key={`${key}-${i}`}
                  lesson={lesson}
                  index={startIndex + i}
                  playingKey={playingKey}
                  onTogglePlay={onTogglePlay}
                  setAudioRef={setAudioRef}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ── */

export default function ParentPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<PortalInfo | null>(null);
  const [lessons, setLessons] = useState<PortalLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("latest");

  // Audio playback state — only one clip at a time across entire page
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const setAudioRef = useCallback((key: string, el: HTMLAudioElement | null) => {
    if (el) {
      audioRefs.current.set(key, el);
    } else {
      audioRefs.current.delete(key);
    }
  }, []);

  const onTogglePlay = useCallback(
    (key: string) => {
      const audio = audioRefs.current.get(key);
      if (!audio) return;

      if (playingKey === key) {
        audio.pause();
        setPlayingKey(null);
      } else {
        // Stop any currently playing clip
        audioRefs.current.forEach((a, k) => {
          if (k !== key) {
            a.pause();
            a.currentTime = 0;
          }
        });
        audio.play().catch(() => {});
        setPlayingKey(key);
      }
    },
    [playingKey],
  );

  // Listen for clip endings to reset state
  useEffect(() => {
    const handleEnded = (key: string) => {
      setPlayingKey((current) => (current === key ? null : current));
    };

    const listeners = new Map<string, () => void>();
    audioRefs.current.forEach((el, key) => {
      const handler = () => handleEnded(key);
      el.addEventListener("ended", handler);
      listeners.set(key, handler);
    });

    return () => {
      listeners.forEach((handler, key) => {
        audioRefs.current.get(key)?.removeEventListener("ended", handler);
      });
    };
  });

  // Fetch data
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const [portalInfo, portalLessons] = await Promise.all([
          publicApi<PortalInfo>(`/api/parent/${token}`),
          publicApi<PortalLesson[]>(`/api/parent/${token}/lessons`),
        ]);
        if (cancelled) return;
        setInfo(portalInfo);
        setLessons(portalLessons);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone">
            ORPHEUS
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone">
            ORPHEUS
          </p>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-charcoal">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-stone">
            This link may be invalid or has been reset by the teacher.
          </p>
        </div>
      </div>
    );
  }

  const latestLesson = lessons.length > 0 ? lessons[0] : null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header — sticky */}
      <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto max-w-[600px] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone">
            ORPHEUS
          </p>
          <h1 className="mt-1 font-serif text-xl font-semibold leading-tight text-charcoal sm:text-2xl">
            {info.student_name}&apos;s Music Journey
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate">
            {info.teacher_name && <span>with {info.teacher_name}</span>}
            <span className="rounded-[var(--radius-chip)] bg-ivory px-2 py-0.5 text-[11px] font-medium text-stone">
              {info.instrument}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[89px] z-20 border-b border-sand bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[600px] px-5">
          <button
            onClick={() => setActiveTab("latest")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "latest"
                ? "border-amber text-charcoal"
                : "border-transparent text-stone hover:text-slate"
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "history"
                ? "border-amber text-charcoal"
                : "border-transparent text-stone hover:text-slate"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-[600px] px-5 py-6">
        {activeTab === "latest" ? (
          latestLesson ? (
            <LatestTab
              lesson={latestLesson}
              playingKey={playingKey}
              onTogglePlay={onTogglePlay}
              setAudioRef={setAudioRef}
            />
          ) : (
            <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-sand bg-warm-white px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-glow">
                <Music size={24} className="text-amber" />
              </div>
              <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
                No lessons yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-stone">
                Lesson summaries will appear here after each lesson.
              </p>
            </div>
          )
        ) : (
          <HistoryTab
            lessons={lessons}
            playingKey={playingKey}
            onTogglePlay={onTogglePlay}
            setAudioRef={setAudioRef}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-sand py-6 text-center">
        <p className="text-xs text-mist">Powered by Orpheus</p>
      </footer>
    </div>
  );
}
