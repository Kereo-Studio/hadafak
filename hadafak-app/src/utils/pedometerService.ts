import { Pedometer } from 'expo-sensors';
import { Platform, Linking, Alert } from 'react-native';

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

      for (let i = 0; i < 48; i++) {
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
