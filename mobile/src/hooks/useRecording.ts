/**
 * Audio recording hook using expo-audio.
 *
 * Requirements met:
 * 1. Background recording (survives screen lock & app switch):
 *    - expo-audio AudioMode.allowsBackgroundRecording for native recording continuity
 *    - Android foreground service via @notifee/react-native keeps process alive
 *    - iOS UIBackgroundModes: ['audio'] in Info.plist
 * 2. Long sessions (30-60 min) — native recording, no JS chunking
 * 3. No audio processing — android uses "unprocessed" audioSource;
 *    iOS does not apply VoIP processing to standard recording sessions
 * 4. Output format: .m4a (AAC) at 64kbps mono — accepted by Groq Whisper,
 *    keeps 30-min lesson under 25MB limit
 *
 * IMPORTANT: Background recording requires a development build (not Expo Go).
 * The expo-audio config plugin adds FOREGROUND_SERVICE_MICROPHONE on Android
 * and UIBackgroundModes: ['audio'] on iOS.
 *
 * API note: expo-audio requires prepareToRecordAsync() before record().
 * Skipping prepare leaves the native recorder without an output file,
 * causing recorder.uri to be empty after stop().
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type RecordingOptions,
} from "expo-audio";
import {
  startRecordingNotification,
  updateRecordingNotification,
  stopRecordingNotification,
} from "../services/recordingNotification";

const TAG = "[useRecording]";

interface RecordingState {
  isRecording: boolean;
  elapsed: number;
  error: string | null;
  audioUri: string | null;
}

interface RecordingActions {
  startRecording: (studentName?: string) => Promise<void>;
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
  const studentNameRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);

  // Update elapsed time using wall-clock difference for accuracy
  const startTimer = useCallback((studentName?: string) => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      // Update notification every 30 seconds (the notification's own
      // chronometer handles real-time display, so we only need periodic
      // body text syncs)
      if (studentNameRef.current && secs > 0 && secs % 30 === 0) {
        updateRecordingNotification(studentNameRef.current, secs);
      }
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

  // When the app returns to foreground, immediately recalculate elapsed
  // time from the wall clock. setInterval callbacks may not fire while
  // the JS thread is suspended in the background.
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && isRecordingRef.current && startTimeRef.current > 0) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(secs);
        console.log(TAG, "App resumed, elapsed:", secs, "seconds");
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  const startRecording = useCallback(async (studentName?: string) => {
    try {
      setError(null);
      setAudioUri(null);
      studentNameRef.current = studentName ?? null;

      console.log(TAG, "Requesting microphone permission...");
      const permStatus = await requestRecordingPermissionsAsync();
      console.log(TAG, "Permission status:", permStatus.status, "granted:", permStatus.granted);
      if (!permStatus.granted) {
        setError("Microphone permission is required to record lessons.");
        return;
      }

      // Start Android foreground service BEFORE recording begins.
      // This ensures the process stays alive even if the user immediately
      // switches away from the app.
      if (studentName) {
        await startRecordingNotification(studentName);
      }

      // Configure audio mode for background recording
      console.log(TAG, "Setting audio mode...");
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        interruptionMode: "doNotMix",
        shouldRouteThroughEarpiece: false,
      });
      console.log(TAG, "Audio mode set");

      // Prepare the native recorder — allocates the output file and configures
      // the encoder. Without this step recorder.uri is empty after stop().
      console.log(TAG, "Preparing recorder with options:", JSON.stringify(MUSIC_RECORDING_OPTIONS));
      await recorder.prepareToRecordAsync(MUSIC_RECORDING_OPTIONS);
      console.log(TAG, "Recorder prepared, uri after prepare:", recorder.uri);

      console.log(TAG, "Calling recorder.record()...");
      recorder.record();
      setIsRecording(true);
      isRecordingRef.current = true;
      startTimer(studentName);
      console.log(TAG, "Recording started successfully");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(msg);
      console.error(TAG, "Recording start error:", err);
      // Clean up foreground service if recording failed to start
      await stopRecordingNotification();
    }
  }, [recorder, startTimer]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    console.log(TAG, "stopRecording called, isRecording:", isRecording);
    try {
      stopTimer();
      setIsRecording(false);
      isRecordingRef.current = false;
      studentNameRef.current = null;

      console.log(TAG, "Calling recorder.stop()...");
      await recorder.stop();

      // Stop the Android foreground service
      await stopRecordingNotification();

      const uri = recorder.uri;
      console.log(TAG, "Recording stopped, uri:", uri);

      if (!uri) {
        console.warn(TAG, "recorder.uri is empty after stop — recording may not have been prepared");
      }

      setAudioUri(uri ?? null);
      return uri ?? null;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to stop recording";
      setError(msg);
      console.error(TAG, "Recording stop error:", err);
      // Ensure foreground service is stopped even on error
      await stopRecordingNotification();
      return null;
    }
  }, [recorder, stopTimer, isRecording]);

  return {
    isRecording,
    elapsed,
    error,
    audioUri,
    startRecording,
    stopRecording,
  };
}
