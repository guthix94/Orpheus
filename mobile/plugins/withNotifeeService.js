/**
 * Expo config plugin that declares the notifee ForegroundService
 * with foregroundServiceType="microphone" in AndroidManifest.xml.
 *
 * Android 14+ (API 34) requires foreground services to declare their type
 * in the manifest. Without this, starting a foreground service with
 * FOREGROUND_SERVICE_MICROPHONE type fails at runtime.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

function withNotifeeService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    if (!application.service) {
      application.service = [];
    }

    // Find existing notifee ForegroundService (added by notifee's own manifest)
    const existing = application.service.find(
      (s) => s.$?.["android:name"] === "app.notifee.core.ForegroundService"
    );

    if (existing) {
      // Add microphone foreground service type to existing declaration
      existing.$["android:foregroundServiceType"] = "microphone";
    } else {
      // Declare the service if notifee's manifest merge hasn't added it yet
      application.service.push({
        $: {
          "android:name": "app.notifee.core.ForegroundService",
          "android:foregroundServiceType": "microphone",
          "android:stopWithTask": "false",
          "android:exported": "false",
        },
      });
    }

    return config;
  });
}

module.exports = withNotifeeService;
