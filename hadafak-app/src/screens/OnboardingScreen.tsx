import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { ChevronRight } from 'lucide-react-native';
import { TargetIcon, TrophyIcon, CompassIcon } from '../components/icons/fitness';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [goal, setGoal] = useState<'lose_fat' | 'gain_muscle' | 'stay_active' | 'athletic'>('stay_active');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [trainingDays, setTrainingDays] = useState(4);
  const [trainingLocation, setTrainingLocation] = useState<'gym' | 'home'>('gym');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOnboardingSubmit = async () => {
    if (!age || !weight || !height) {
      setError('Please fill in age, weight, and height to calculate your targets.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    const parsedWeight = parseFloat(weight);
    const parsedHeight = parseFloat(height);

    if (isNaN(parsedAge) || isNaN(parsedWeight) || isNaN(parsedHeight)) {
      setError('Please enter valid numeric values.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create or update profile
      await api.post('/profiles', {
        goal,
        age: parsedAge,
        gender,
        weight: parsedWeight,
        height: parsedHeight,
        trainingDays,
        trainingLocation,
      });

      // 2. Generate a personalized program matching location + goal
      await api.post('/programs/generate');

      onComplete();
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Personalize Your Plan</Text>
            <Text style={styles.subtitle}>
              We use smart formulas to calculate personalized calorie, water, and exercise targets.
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Section: Goal Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is your main goal?</Text>
            <View style={styles.goalList}>
              {[
                { id: 'stay_active', title: 'Stay Active', desc: 'Maintain health, tone up & increase energy', icon: CompassIcon },
                { id: 'lose_fat', title: 'Lose Fat', desc: 'Burn calories, lose weight & lean down', icon: TargetIcon },
                { id: 'gain_muscle', title: 'Gain Muscle', desc: 'Build lean mass, strength & athletic shape', icon: TrophyIcon },
              ].map((g) => {
                const IconComponent = g.icon;
                const isSelected = goal === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.goalItem, isSelected && styles.goalItemSelected]}
                    onPress={() => setGoal(g.id as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.goalIconWrapper, isSelected && styles.goalIconWrapperSelected]}>
                      <IconComponent size={20} color={isSelected ? COLORS.textInverse : COLORS.primary} />
                    </View>
                    <View style={styles.goalTextWrapper}>
                      <Text style={[styles.goalItemTitle, isSelected && styles.goalItemTitleSelected]}>
                        {g.title}
                      </Text>
                      <Text style={[styles.goalItemDesc, isSelected && styles.goalItemDescSelected]}>
                        {g.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section: Physical Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Physical Details</Text>
            
            {/* Gender Toggle */}
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                onPress={() => setGender('male')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                onPress={() => setGender('female')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Female</Text>
              </TouchableOpacity>
            </View>

            {/* Age, Weight, Height Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricInputWrapper}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="25"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>

              <View style={styles.metricInputWrapper}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="75"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <View style={styles.metricInputWrapper}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="178"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>
          </View>

          {/* Section: Training Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training Frequency</Text>
            <View style={styles.daysRow}>
              {[2, 3, 4, 5, 6].map((days) => {
                const isSelected = trainingDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                    onPress={() => setTrainingDays(days)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
                      {days} Days
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section: Training Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Location</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderButton, trainingLocation === 'gym' && styles.genderButtonActive]}
                onPress={() => setTrainingLocation('gym')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, trainingLocation === 'gym' && styles.genderTextActive]}>
                  Gym Workout
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, trainingLocation === 'home' && styles.genderButtonActive]}
                onPress={() => setTrainingLocation('home')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, trainingLocation === 'home' && styles.genderTextActive]}>
                  Home Workout
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleOnboardingSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Generate Personalized Plan</Text>
                <ChevronRight size={20} color={COLORS.textInverse} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginTop: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  goalList: {
    gap: 12,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
  },
  goalItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  goalIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalIconWrapperSelected: {
    backgroundColor: COLORS.primary,
  },
  goalTextWrapper: {
    flex: 1,
  },
  goalItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  goalItemTitleSelected: {
    color: COLORS.primary,
  },
  goalItemDesc: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  goalItemDescSelected: {
    color: COLORS.primary,
    opacity: 0.8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  genderTextActive: {
    color: COLORS.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  textInput: {
    height: 52,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
  },
  dayChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  dayChipTextSelected: {
    color: COLORS.primary,
  },
  submitButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
});
