import { api } from './api';
import { Alert } from 'react-native';

export const programService = {
  async regenerateProgram(
    setIsRegenerating: (val: boolean) => void,
    onSuccess: () => Promise<void> | void,
  ): Promise<void> {
    setIsRegenerating(true);
    try {
      await api.post('/programs/generate');
      await onSuccess();
      Alert.alert('Success', 'Your personalized training program has been re-generated!');
    } catch (err) {
      console.warn('Failed to regenerate program:', err);
      Alert.alert('Error', 'Could not re-generate program. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  },
};
