import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { Button } from '../components/Button';
import { TrophyIcon } from '../components/icons/fitness';

const { width } = Dimensions.get('window');
const logoImg = require('../../assets/hadafaklogo-nobg.png');

interface WelcomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToSignup: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNavigateToLogin,
  onNavigateToSignup,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Soft decorative background shapes */}
      <View style={styles.circleBg1} />
      <View style={styles.circleBg2} />

      <View style={styles.content}>
        {/* Brand Logo & Name */}
        <View style={styles.logoSection}>
          <Image source={logoImg} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandTagline}>Your Personal Gym & AI Nutrition Companion</Text>
        </View>

        {/* Motivational Card */}
        <View style={styles.visualCard}>
          <View style={styles.cardHeader}>
            <TrophyIcon size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Ready to reach your target?</Text>
          </View>
          <Text style={styles.cardBody}>
            Track workouts, count steps, plan recipes, and monitor your body composition progress in one seamless hub.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <Button
            title="Create Free Account"
            onPress={onNavigateToSignup}
            variant="primary"
            style={styles.signupButton}
          />
          <Button
            title="Sign In"
            onPress={onNavigateToLogin}
            variant="outline"
          />
        </View>

        {/* Bottom Footer Info */}
        <Text style={styles.footerText}>
          By signing up, you agree to our Terms of Service.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  circleBg1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.5,
  },
  circleBg2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
    maxWidth: '85%',
  },
  visualCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 28,
    padding: 24,
    marginVertical: 40,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  cardBody: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonSection: {
    width: '100%',
    gap: 12,
  },
  signupButton: {
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
});
