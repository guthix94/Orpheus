"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Volume2 } from "lucide-react";

export interface Clip {
  index: number;
  start: number;
  end: number;
  duration: number;
  types: string[];
  url: string;
  label?: string;
  segment_type?: string;
  shared_with_parent?: boolean;
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

function ProgressBar({
  clipIndex,
  audioRef,
  isPlaying,
  clipDuration,
}: {
  clipIndex: number;
  audioRef: HTMLAudioElement | undefined;
  isPlaying: boolean;
  clipDuration: number;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clipDuration);
  const [isSeeking, setIsSeeking] = useState(false);
  const rafRef = useRef<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioRef) return;

    const onLoaded = () => {
      if (audioRef.duration && isFinite(audioRef.duration)) {
        setDuration(audioRef.duration);
      }
    };

    audioRef.addEventListener("loadedmetadata", onLoaded);
    audioRef.addEventListener("durationchange", onLoaded);

    // Pick up duration if already loaded
    if (audioRef.duration && isFinite(audioRef.duration)) {
      setDuration(audioRef.duration);
    }

    return () => {
      audioRef.removeEventListener("loadedmetadata", onLoaded);
      audioRef.removeEventListener("durationchange", onLoaded);
    };
  }, [audioRef]);

  // Use requestAnimationFrame for smooth progress updates while playing
  useEffect(() => {
    if (!audioRef || !isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      if (!isSeeking) {
        setCurrentTime(audioRef.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [audioRef, isPlaying, isSeeking]);

  // Reset time display when clip finishes
  useEffect(() => {
    if (!audioRef) return;
    const onEnded = () => setCurrentTime(0);
    audioRef.addEventListener("ended", onEnded);
    return () => audioRef.removeEventListener("ended", onEnded);
  }, [audioRef]);

  const seek = useCallback(
    (clientX: number) => {
      if (!audioRef || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = ratio * duration;
      audioRef.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [audioRef, duration],
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
    <div className="mt-1.5 flex items-center gap-2">
      <span className="w-8 text-right text-[10px] tabular-nums text-stone">
        {formatTime(currentTime)}
      </span>
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-ivory"
        role="slider"
        aria-label={`Seek clip ${clipIndex}`}
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!audioRef) return;
          const step = 5;
          if (e.key === "ArrowRight") {
            audioRef.currentTime = Math.min(duration, audioRef.currentTime + step);
            setCurrentTime(audioRef.currentTime);
          } else if (e.key === "ArrowLeft") {
            audioRef.currentTime = Math.max(0, audioRef.currentTime - step);
            setCurrentTime(audioRef.currentTime);
          }
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-amber shadow-sm opacity-0 transition-opacity group-hover/clip:opacity-100"
          style={{ left: `${progress}%`, opacity: isPlaying || isSeeking ? 1 : undefined }}
        />
      </div>
      <span className="w-8 text-[10px] tabular-nums text-mist">
        {formatTime(duration)}
      </span>
    </div>
  );
}

export default function AudioClips({
  clips,
  showShareToggle = false,
  onToggleShare,
}: {
  clips: Clip[];
  showShareToggle?: boolean;
  onToggleShare?: (clipIndex: number) => void;
}) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());

  const setAudioRef = useCallback(
    (index: number, el: HTMLAudioElement | null) => {
      if (el) {
        audioRefs.current.set(index, el);
      } else {
        audioRefs.current.delete(index);
      }
    },
    [],
  );

  const togglePlay = useCallback(
    (index: number) => {
      const audio = audioRefs.current.get(index);
      if (!audio) return;

      if (playingIndex === index) {
        audio.pause();
        setPlayingIndex(null);
      } else {
        // Stop any currently playing clip first
        audioRefs.current.forEach((a, i) => {
          if (i !== index) {
            a.pause();
            a.currentTime = 0;
          }
        });
        audio.play().catch(() => {
          // Browser may block autoplay — silently fail
        });
        setPlayingIndex(index);
      }
    },
    [playingIndex],
  );

  const handleEnded = useCallback((index: number) => {
    setPlayingIndex((current) => (current === index ? null : current));
  }, []);

  if (!clips || clips.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 size={14} className="text-amber" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone">
          Lesson Audio
        </h3>
      </div>

      <div className="space-y-2">
        {clips.map((clip, i) => (
          <div
            key={clip.index}
            className="group/clip rounded-xl border border-sand bg-warm-white px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              {/* Segment number */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory text-xs font-semibold text-stone tabular-nums">
                {i + 1}
              </span>

              {/* Play / Pause button */}
              <button
                onClick={() => togglePlay(clip.index)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 ${
                  playingIndex === clip.index
                    ? "bg-amber text-white active:bg-amber-light"
                    : "bg-ivory text-charcoal hover:bg-amber-glow hover:text-amber active:bg-amber-glow"
                }`}
                aria-label={
                  playingIndex === clip.index ? "Pause clip" : "Play clip"
                }
              >
                {playingIndex === clip.index ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Label + timestamp */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal">
                  {clipLabel(clip)}
                </p>
                <p className="text-xs text-stone">
                  {formatTime(clip.start)} &ndash; {formatTime(clip.end)}
                  <span className="ml-1.5 text-mist">
                    ({formatTime(clip.duration)})
                  </span>
                </p>
              </div>

              {/* Share with parent checkbox */}
              {showShareToggle && onToggleShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleShare(clip.index);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-chip)] px-2 py-1 text-[11px] font-medium transition-colors select-none hover:bg-ivory"
                  aria-label={
                    clip.shared_with_parent
                      ? "Stop sharing with parent"
                      : "Share with parent"
                  }
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      clip.shared_with_parent
                        ? "border-amber bg-amber text-white"
                        : "border-mist bg-white"
                    }`}
                  >
                    {clip.shared_with_parent && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={clip.shared_with_parent ? "text-charcoal" : "text-stone"}>
                    Share with parent
                  </span>
                </button>
              )}
            </div>

            {/* Progress bar with seek and time display */}
            <ProgressBar
              clipIndex={clip.index}
              audioRef={audioRefs.current.get(clip.index)}
              isPlaying={playingIndex === clip.index}
              clipDuration={clip.duration}
            />

            {/* Hidden audio element */}
            <audio
              ref={(el) => setAudioRef(clip.index, el)}
              src={clip.url}
              preload="none"
              onEnded={() => handleEnded(clip.index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
