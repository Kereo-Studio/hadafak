import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../services/api';
import { storage } from '../utils/storage';

interface LoginScreenProps {
  onBack: () => void;
  onNavigateToSignup: () => void;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onNavigateToSignup,
  onLoginSuccess,
}) => {
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { accessToken, refreshToken } = response.data;

      // Save tokens securely
      await storage.setItem('access_token', accessToken);
      if (refreshToken) {
        await storage.setItem('refresh_token', refreshToken);
      }

      onLoginSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || 'Invalid email or password. Please try again.';
      setGeneralError(typeof msg === 'string' ? msg : msg[0] || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header section */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <ChevronLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your fitness and macro tracking journey.</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {generalError ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{generalError}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="name@example.com"
              iconName="Mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              iconName="Lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
            />

            <TouchableOpacity style={styles.forgotContainer} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />
          </View>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignup} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  header: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 22,
    fontWeight: '500',
  },
  form: {
    marginTop: 32,
    flex: 1,
    justifyContent: 'center',
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  errorAlertText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
