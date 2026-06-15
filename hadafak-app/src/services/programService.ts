import { api } from './api';

export const programService = {
  async regenerateProgram(
    setIsRegenerating: (val: boolean) => void,
    onSuccess: () => Promise<void> | void,
    showAlert: (config: any) => void
  ): Promise<void> {
    setIsRegenerating(true);
    try {
      await api.post('/programs/generate');
      await onSuccess();
      showAlert({
        title: 'Program Re-Generated',
        message: 'Your personalized training program has been successfully updated.',
        why: 'The AI service has updated your days split, targets, and exercise distributions.',
        actionGuide: 'Review your updated splits on the Workouts tab to begin training.',
        type: 'success',
      });
    } catch (err) {
      console.warn('Failed to regenerate program:', err);
      showAlert({
        title: 'Re-Generation Failed',
        message: 'Could not re-generate your AI program.',
        why: 'The service is temporarily unavailable or your profile goals have missing parameters.',
        actionGuide: 'Check your internet connection or verify your goals in the Profile tab and try again.',
        type: 'error',
      });
    } finally {
      setIsRegenerating(false);
    }
  },
};
