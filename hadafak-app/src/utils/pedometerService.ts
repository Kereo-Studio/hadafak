import { Pedometer } from 'expo-sensors';
import { Platform, Linking, Alert } from 'react-native';
import { storage } from './storage';

export const getLocalTodaySteps = async (): Promise<number> => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const raw = await storage.getItem('daily_steps_data');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === todayStr) {
        return Number(data.steps) || 0;
      }
    }
  } catch (e) {
    // Ignore
  }
  return 0;
};

export const saveLocalTodaySteps = async (steps: number): Promise<void> => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    await storage.setItem('daily_steps_data', JSON.stringify({
      date: todayStr,
      steps,
    }));
  } catch (e) {
    // Ignore
  }
};

// Only show the "go to settings" alert once per app session
let hasShownSettingsAlert = false;

const showGoToSettingsAlert = () => {
  if (hasShownSettingsAlert) return;
  hasShownSettingsAlert = true;
  Alert.alert(
    'Enable Step Tracking',
    'Physical Activity permission was denied for Expo Go. To enable step tracking, go to Settings → Apps → Expo Go → Permissions → Physical Activity → Allow.',
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
};

export const pedometerService = {
  async getPermissionStatus() {
    if (Platform.OS === 'web') return { status: 'denied', canAskAgain: false };
    try {
      return await Pedometer.getPermissionsAsync();
    } catch {
      return { status: 'denied', canAskAgain: false };
    }
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const { granted, canAskAgain } = await Pedometer.requestPermissionsAsync();
      if (!granted && !canAskAgain) {
        showGoToSettingsAlert();
      }
      return granted;
    } catch (e) {
      console.warn('[Pedometer] Permission request failed:', e);
      return false;
    }
  },

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      return await Pedometer.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async syncSteps(apiInstance: any): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status, canAskAgain } = await Pedometer.getPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          // Permission was permanently blocked — show "Open Settings" alert
          console.log('[Pedometer] Permission permanently denied.');
          showGoToSettingsAlert();
          return false;
        }

        // Can still ask — request permission (will show system dialog)
        const granted = await this.requestPermission();
        if (!granted) return false;
      }

      const isAvail = await this.isAvailable();
      if (!isAvail) {
        console.log('[Pedometer] Sensor not available on this device.');
        return false;
      }

      const now = new Date();
      const intervalsToSync: Array<{
        startTime: string;
        endTime: string;
        steps: number;
        source: 'sensor';
      }> = [];

      // 1. Sync current partial hour block (from start of current hour to now)
      const currentStart = new Date(now.getTime());
      currentStart.setMinutes(0, 0, 0);
      try {
        const result = await Pedometer.getStepCountAsync(currentStart, now);
        if (result && result.steps > 0) {
          intervalsToSync.push({
            startTime: currentStart.toISOString(),
            endTime: now.toISOString(),
            steps: result.steps,
            source: 'sensor',
          });
        }
      } catch (e) {
        // Skip
      }

      // 2. Sync previous 47 completed hours
      for (let i = 0; i < 47; i++) {
        const start = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        start.setMinutes(0, 0, 0);
        const end = new Date(now.getTime() - i * 60 * 60 * 1000);
        end.setMinutes(0, 0, 0);
        const actualEnd = end > now ? now : end;

        try {
          const result = await Pedometer.getStepCountAsync(start, actualEnd);
          if (result && result.steps > 0) {
            intervalsToSync.push({
              startTime: start.toISOString(),
              endTime: actualEnd.toISOString(),
              steps: result.steps,
              source: 'sensor',
            });
          }
        } catch (e) {
          // Skip failed intervals silently
        }
      }

      if (intervalsToSync.length === 0) {
        // Fallback: Query the entire day from midnight to now (Android compatibility)
        const startOfDay = new Date(now.getTime());
        startOfDay.setHours(0, 0, 0, 0);
        try {
          const result = await Pedometer.getStepCountAsync(startOfDay, now);
          if (result && result.steps > 0) {
            intervalsToSync.push({
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
              steps: result.steps,
              source: 'sensor',
            });
          }
        } catch (e) {
          console.log('[Pedometer] Daily fallback query not supported (Android). Using local storage steps.');
          // Android compatibility: Use cached steps from local AsyncStorage
          const localSteps = await getLocalTodaySteps();
          if (localSteps > 0) {
            intervalsToSync.push({
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
              steps: localSteps,
              source: 'sensor',
            });
          }
        }
      }

      if (intervalsToSync.length === 0) {
        return true;
      }

      await apiInstance.post('/steps/sync', { intervals: intervalsToSync });
      console.log(`[Pedometer] Synced ${intervalsToSync.length} intervals.`);
      return true;
    } catch (error) {
      console.warn('[Pedometer] Sync failed:', error);
      return false;
    }
  },
};
