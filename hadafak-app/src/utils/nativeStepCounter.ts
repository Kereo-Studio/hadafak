import { NativeModules, Platform } from 'react-native';

const { StepCounterModule } = NativeModules;

export const getStepsSinceBootAndroid = async (): Promise<number | null> => {
  if (Platform.OS !== 'android') return null;
  if (!StepCounterModule) {
    console.warn('[NativeStepCounter] StepCounterModule not found in NativeModules.');
    return null;
  }
  try {
    const steps = await StepCounterModule.getStepsSinceBoot();
    return Number(steps);
  } catch (error) {
    console.warn('[NativeStepCounter] Failed to fetch steps since boot:', error);
    return null;
  }
};
