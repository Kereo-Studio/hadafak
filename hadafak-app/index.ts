import { registerRootComponent } from 'expo';
import * as BackgroundTask from 'expo-background-task';
import './src/utils/backgroundTasks';
import { BACKGROUND_STEP_TASK } from './src/utils/backgroundTasks';

import App from './App';

async function registerBackgroundTasks() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15, // 15 minutes
      });
      console.log('[BackgroundTask] Registered background step sync task');
    }
  } catch (err) {
    console.warn('[BackgroundTask] Registration failed:', err);
  }
}

registerBackgroundTasks();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
