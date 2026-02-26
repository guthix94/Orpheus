/**
 * Audio recording hook using expo-audio.
 *
 * Requirements met:
 * 1. Background recording (survives screen lock & app switch) via expo-audio config plugin
 *    + AudioMode.allowsBackgroundRecording
 * 2. Long sessions (30-60 min) — native recording, no JS chunking
 * 3. No audio processing — android uses "unprocessed" audioSource;
 *    iOS does not apply VoIP processing to standard recording sessions
 * 4. Output format: .m4a (AAC) at 64kbps mono — accepted by Groq Whisper,
 *    keeps 30-min lesson under 25MB limit
 *
 * IMPORTANT: Background recording requires a development build (not Expo Go).
 * The expo-audio config plugin adds FOREGROUND_SERVICE_MICROPHONE on Android
 * and UIBackgroundModes: ['audio'] on iOS.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type RecordingOptions,
} from "expo-audio";

interface RecordingState {
  isRecording: boolean;
  elapsed: number;
  error: string | null;
  audioUri: string | null;
}

interface RecordingActions {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

// Music-optimized recording options:
// - Mono, 64kbps AAC, 44100Hz
// - Android: "unprocessed" source disables echo cancellation, noise suppression, AGC
// - Output: .m4a (Groq Whisper compatible)
const MUSIC_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  sampleRate: 44100,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: "unprocessed",
  },
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
  },
};

export function useRecording(): RecordingState & RecordingActions {
  const recorder = useAudioRecorder(MUSIC_RECORDING_OPTIONS);

  // Track recording state locally because recorder.isRecording is a native
  // property that does NOT trigger React re-renders. The separate
  // useAudioRecorderState() hook exists for reactive state, but using local
  // state is simpler and avoids polling overhead.
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Update elapsed time using wall-clock difference for accuracy
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioUri(null);

      const permStatus = await requestRecordingPermissionsAsync();
      if (!permStatus.granted) {
        setError("Microphone permission is required to record lessons.");
        return;
      }

      // Configure audio mode for background recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        interruptionMode: "doNotMix",
        shouldRouteThroughEarpiece: false,
      });

      recorder.record();
      setIsRecording(true);
      startTimer();
      console.log("[useRecording] Recording started");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(msg);
      console.error("[useRecording] Recording start error:", err);
    }
  }, [recorder, startTimer]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    console.log("[useRecording] stopRecording called");
    try {
      stopTimer();
      setIsRecording(false);
      console.log("[useRecording] Calling recorder.stop()...");
      await recorder.stop();
      const uri = recorder.uri;
      console.log("[useRecording] Recording stopped, uri:", uri);
      setAudioUri(uri ?? null);
      return uri ?? null;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to stop recording";
      setError(msg);
      console.error("[useRecording] Recording stop error:", err);
      return null;
    }
  }, [recorder, stopTimer]);

  return {
    isRecording,
    elapsed,
    error,
    audioUri,
    startRecording,
    stopRecording,
  };
}
