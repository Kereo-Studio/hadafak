import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { COLORS } from './src/theme/colors';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { storage } from './src/utils/storage';
import { api, registerLogoutCallback } from './src/services/api';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapPin, Play, Apple, Award, Home } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from './src/components/CustomAlert';

type AuthState = 'loading' | 'welcome' | 'login' | 'signup' | 'onboarding' | 'authenticated';

const Tab = createBottomTabNavigator();

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check login status on launch
  useEffect(() => {
    registerLogoutCallback(() => {
      handleLogout();
    });

    const checkLoginStatus = async () => {
      try {
        const token = await storage.getItem('access_token');
        if (token) {
          const response = await api.get('/auth/me');
          setUserEmail(response.data.email);
          
          // Check if profile is complete
          try {
            const profileRes = await api.get('/profiles/mine');
            if (profileRes.data && profileRes.data.goal) {
              setAuthState('authenticated');
            } else {
              setAuthState('onboarding');
            }
          } catch (pe) {
            setAuthState('onboarding');
          }
        } else {
          setAuthState('welcome');
        }
      } catch (e) {
        console.warn('Auto-login failed, clearing tokens', e);
        await storage.deleteItem('access_token');
        await storage.deleteItem('refresh_token');
        setAuthState('welcome');
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = async () => {
    setAuthState('loading');
    try {
      await storage.deleteItem('access_token');
      await storage.deleteItem('refresh_token');
      setUserEmail(null);
    } catch (e) {
      console.error('Error clearing tokens during logout:', e);
    } finally {
      setAuthState('welcome');
    }
  };

  const handleAuthSuccess = async () => {
    setAuthState('loading');
    try {
      const response = await api.get('/auth/me');
      setUserEmail(response.data.email);
      
      // Determine if onboarding is required
      try {
        const profileRes = await api.get('/profiles/mine');
        if (profileRes.data && profileRes.data.goal) {
          setAuthState('authenticated');
        } else {
          setAuthState('onboarding');
        }
      } catch (pe) {
        setAuthState('onboarding');
      }
    } catch (e) {
      setAuthState('authenticated');
    }
  };

  const renderContent = () => {
    if (authState === 'loading') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <StatusBar style="auto" />
        </View>
      );
    }

    if (authState === 'welcome') {
      return (
        <View style={styles.container}>
          <StatusBar style="dark" />
          <WelcomeScreen
            onNavigateToLogin={() => setAuthState('login')}
            onNavigateToSignup={() => setAuthState('signup')}
          />
        </View>
      );
    }

    if (authState === 'login') {
      return (
        <View style={styles.container}>
          <StatusBar style="dark" />
          <LoginScreen
            onBack={() => setAuthState('welcome')}
            onNavigateToSignup={() => setAuthState('signup')}
            onLoginSuccess={handleAuthSuccess}
          />
        </View>
      );
    }

    if (authState === 'signup') {
      return (
        <View style={styles.container}>
          <StatusBar style="dark" />
          <SignupScreen
            onBack={() => setAuthState('welcome')}
            onNavigateToLogin={() => setAuthState('login')}
            onSignupSuccess={handleAuthSuccess}
          />
        </View>
      );
    }

    if (authState === 'onboarding') {
      return (
        <View style={styles.container}>
          <StatusBar style="dark" />
          <OnboardingScreen
            onComplete={() => setAuthState('authenticated')}
          />
        </View>
      );
    }

    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
          }}
        >
          {/* Tab 1: Home Dashboard */}
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color }) => <Home size={24} color={color} />,
              tabBarLabel: () => null,
            }}
          />

          {/* Tab 2: GPS Route tracker */}
          <Tab.Screen
            name="Map"
            component={MapScreen}
            options={{
              tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
              tabBarLabel: () => null,
            }}
          />

          {/* Tab 3: Central workouts button (Renders custom play circle) */}
          <Tab.Screen
            name="Workouts"
            component={WorkoutsScreen}
            options={{
              tabBarIcon: () => (
                <View style={styles.centerPlayButton}>
                  <Play size={24} color={COLORS.textInverse} fill={COLORS.textInverse} style={{ marginLeft: 3 }} />
                </View>
              ),
              tabBarLabel: () => null,
            }}
          />

          {/* Tab 4: AI Nutrition */}
          <Tab.Screen
            name="Nutrition"
            component={NutritionScreen}
            options={{
              tabBarIcon: ({ color }) => <Apple size={24} color={color} />,
              tabBarLabel: () => null,
            }}
          />

          {/* Tab 5: Profile & Stats */}
          <Tab.Screen
            name="Profile"
            options={{
              tabBarIcon: ({ color }) => <Award size={24} color={color} />,
              tabBarLabel: () => null,
            }}
          >
            {(props) => <ProfileScreen {...props} onLogout={handleLogout} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    );
  };

  return (
    <SafeAreaProvider>
      <AlertProvider>
        {renderContent()}
      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: 0,
    height: 75,
    paddingBottom: 15,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  homeTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  homeLabelActive: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  homeActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  centerPlayButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#111827', // Pitch black circle matching Figma design
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 10, // Elevates the button slightly above the bar
  },
});
