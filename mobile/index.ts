import { registerRootComponent } from 'expo';
import notifee from '@notifee/react-native';

import App from './App';

// Register Android foreground service handler.
// This MUST be called at the top level (outside any component) before
// any foreground notification is displayed. The callback receives the
// notification that triggered the service. Returning an unresolved promise
// keeps the service alive until stopForegroundService() is called.
notifee.registerForegroundService(() => {
  return new Promise(() => {
    // Intentionally never resolves — service stays alive
    // until stopRecordingNotification() calls stopForegroundService()
  });
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
