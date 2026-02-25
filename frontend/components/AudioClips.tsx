"use client";

import { useCallback, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

export interface Clip {
  index: number;
  start: number;
  end: number;
  duration: number;
  types: string[];
  url: string;
  label?: string;
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

export default function AudioClips({ clips }: { clips: Clip[] }) {
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
          Audio Clips
        </h3>
      </div>

      <div className="space-y-2">
        {clips.map((clip) => (
          <div
            key={clip.index}
            className="flex items-start gap-3 rounded-xl border border-sand bg-warm-white px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover"
          >
            {/* Play / Pause button */}
            <button
              onClick={() => togglePlay(clip.index)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                playingIndex === clip.index
                  ? "bg-amber text-white"
                  : "bg-ivory text-charcoal hover:bg-amber-glow hover:text-amber"
              }`}
              aria-label={
                playingIndex === clip.index ? "Pause clip" : "Play clip"
              }
            >
              {playingIndex === clip.index ? (
                <Pause size={14} />
              ) : (
                <Play size={14} className="ml-0.5" />
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
