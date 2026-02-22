"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
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
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      setError("Could not access microphone. Check browser permissions.");
      console.error(err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isRecording && (
        <div className="text-center">
          <p className="text-4xl font-mono font-semibold tabular-nums text-gray-900">
            {formatTime(elapsed)}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm text-gray-500">Recording</span>
          </div>
        </div>
      )}

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-red-500 shadow-lg transition-transform hover:scale-105 hover:bg-red-600 active:scale-95"
          aria-label="Start recording"
        >
          <span className="h-10 w-10 rounded-full bg-white" />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-700 shadow-lg transition-transform hover:scale-105 hover:bg-gray-800 active:scale-95"
          aria-label="Stop recording"
        >
          <span className="h-10 w-10 rounded-sm bg-white" />
        </button>
      )}

      <p className="text-sm text-gray-400">
        {isRecording ? "Tap to stop" : "Tap to record"}
      </p>
    </div>
  );
}
