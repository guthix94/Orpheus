/**
 * Android foreground service for background recording.
 *
 * On Android, the OS kills background processes aggressively. A foreground
 * service with a visible notification keeps the app process alive so
 * expo-audio can continue recording when the screen is locked or the user
 * switches apps.
 *
 * iOS handles background audio via UIBackgroundModes: ["audio"] in Info.plist
 * and does not need a foreground service.
 */

import { Platform } from "react-native";
import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
  AuthorizationStatus,
} from "@notifee/react-native";

const TAG = "[RecordingNotification]";
const CHANNEL_ID = "lesson-recording";
const NOTIFICATION_ID = "active-recording";

/**
 * Create the notification channel (Android requires this since API 26).
 * Safe to call multiple times — Android ignores duplicate channel creation.
 */
async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Lesson Recording",
    description: "Shown while a lesson is being recorded",
    importance: AndroidImportance.LOW, // No sound, just a persistent visual
  });
}

/**
 * Request notification permission (required on Android 13+ / API 33).
 * Returns true if permission is granted.
 */
async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Start the Android foreground service with a persistent "Recording" notification.
 *
 * This is the critical call that keeps the recording alive when the app
 * goes to background. The notification shows the student name and elapsed time,
 * and tapping it returns the user to the app.
 */
export async function startRecordingNotification(
  studentName: string
): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn(
        TAG,
        "Notification permission denied — recording may stop in background"
      );
      // Continue anyway; recording works, but OS may kill the process
    }

    await ensureChannel();

    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: "Recording lesson",
      body: `${studentName} — 00:00`,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE],
        ongoing: true,
        pressAction: { id: "default" }, // Tapping opens the app
        color: "#DC3545",
        timestamp: Date.now(),
        showTimestamp: true,
        chronometerDirection: "up",
        showChronometer: true,
      },
    });

    console.log(TAG, "Foreground service started");
  } catch (err) {
    // Don't let notification failure block recording
    console.error(TAG, "Failed to start foreground service:", err);
  }
}

/**
 * Update the notification body with current elapsed time.
 * Called periodically from the recording timer.
 */
export async function updateRecordingNotification(
  studentName: string,
  elapsedSeconds: number
): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const m = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (elapsedSeconds % 60).toString().padStart(2, "0");

    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: "Recording lesson",
      body: `${studentName} — ${m}:${s}`,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE],
        ongoing: true,
        pressAction: { id: "default" },
        color: "#DC3545",
        timestamp: Date.now() - elapsedSeconds * 1000,
        showTimestamp: true,
        chronometerDirection: "up",
        showChronometer: true,
      },
    });
  } catch (err) {
    // Swallow update errors — not critical
    console.warn(TAG, "Failed to update notification:", err);
  }
}

/**
 * Stop the foreground service and dismiss the notification.
 */
export async function stopRecordingNotification(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    await notifee.stopForegroundService();
    console.log(TAG, "Foreground service stopped");
  } catch (err) {
    console.warn(TAG, "Failed to stop foreground service:", err);
  }
}
