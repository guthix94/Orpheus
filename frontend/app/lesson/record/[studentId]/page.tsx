"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, uploadFile } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";

/* ── Types ── */

interface Student {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
}

/* ── Page ── */

export default function ActiveRecordingPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch student + create lesson + start recording
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Fetch student
        const stu = await api<Student>(`/api/students/${studentId}`);
        if (cancelled) return;
        setStudent(stu);

        // 2. Create lesson
        const lesson = await api<Lesson>("/api/lessons", {
          method: "POST",
          body: JSON.stringify({ student_id: studentId }),
        });
        if (cancelled) return;
        setLessonId(lesson.id);

        // 3. Start recording
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 44100,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus",
        )
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 64000,
        });

        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(1000);
        recorderRef.current = recorder;

        // 4. Start timer
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof DOMException
              ? "Microphone access denied. Please allow microphone permissions."
              : (err as Error).message,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [studentId]);

  const handleStop = useCallback(async () => {
    if (stopping || !lessonId) return;
    setStopping(true);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recorder and wait for data
    const blob = await new Promise<Blob>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
        return;
      }

      const mimeType = recorder.mimeType;
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: mimeType }));
      };
      recorder.stop();
    });

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      // Stop lesson on server
      await api(`/api/lessons/${lessonId}/stop`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      // Upload audio
      await uploadFile(
        `/api/lessons/${lessonId}/upload-audio`,
        blob,
        `${lessonId}.webm`,
      );

      // Navigate to processing screen
      router.push(`/lesson/${lessonId}/processing`);
    } catch (err) {
      setError((err as Error).message);
      setStopping(false);
    }
  }, [stopping, lessonId, router]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream p-6">
        <FadeIn>
          <div className="max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-bg">
              <span className="text-2xl text-error">!</span>
            </div>
            <p className="mt-4 font-serif text-lg font-semibold text-charcoal">
              Something went wrong
            </p>
            <p className="mt-1.5 text-sm text-stone">{error}</p>
            <button
              onClick={() => router.push("/lesson/record")}
              className="mt-5 rounded-[var(--radius-button)] bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to student select
            </button>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      {/* Pulsing red bar at top */}
      <div className="h-[3px] w-full bg-record-red animate-[pulse-bar_2s_ease-in-out_infinite]" />

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone">
            Lesson with
          </p>
        </FadeIn>

        <FadeIn delay={50}>
          <h1 className="mt-2 text-center font-serif text-4xl font-semibold text-charcoal">
            {student?.name ?? "..."}
          </h1>
        </FadeIn>

        {/* Timer */}
        <FadeIn delay={100}>
          <p className="mt-6 font-serif text-[4.5rem] font-light leading-none tracking-tight text-charcoal tabular-nums">
            {formatTime(elapsed)}
          </p>
        </FadeIn>

        {/* Stop button */}
        <FadeIn delay={150}>
          <div className="relative mt-10 flex h-[140px] w-[140px] items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-record-red/30 animate-[pulse-ring_2s_ease-in-out_infinite]" />

            {/* Button */}
            <button
              onClick={handleStop}
              disabled={stopping || !lessonId}
              className="relative flex h-[110px] w-[110px] items-center justify-center rounded-full bg-record-red shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              aria-label="Stop recording"
            >
              {stopping ? (
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
              ) : (
                <span className="h-8 w-8 rounded-sm bg-white" />
              )}
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="mt-8 text-sm text-stone">
            {stopping ? "Ending lesson..." : "Tap to end lesson"}
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
