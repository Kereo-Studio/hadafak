import { registerRootComponent } from 'expo';
import * as BackgroundFetch from 'expo-background-fetch';
import './src/utils/backgroundTasks';
import { BACKGROUND_STEP_TASK } from './src/utils/backgroundTasks';

import App from './App';

async function registerBackgroundTasks() {
  try {
    // Check if task is already registered
    const isRegistered = await BackgroundFetch.getStatusAsync();
    if (isRegistered === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // Keep running if app is closed/terminated
        startOnBoot: true, // Start task on device boot
      });
      console.log('[BackgroundFetch] Registered background step sync task');
    }
  } catch (err) {
    console.warn('[BackgroundFetch] Registration failed:', err);
  }
}

registerBackgroundTasks();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
