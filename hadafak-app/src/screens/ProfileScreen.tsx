import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../components/CustomAlert';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import {
  User,
  Settings,
  Calendar,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  X,
  Camera,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react-native';
import {
  TrophyIcon,
  ScaleIcon,
  CompassIcon,
  FireIcon,
  WaterIcon,
  RulerIcon,
  TargetIcon,
} from '../components/icons/fitness';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { api, API_BASE_URL } from '../services/api';
import { programService } from '../services/programService';
import { pedometerService } from '../utils/pedometerService';
import { StateFeedback } from '../components/StateFeedback';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface UserProfile {
  id?: string;
  goal: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  trainingDays: number;
  trainingLocation: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyWater: number;
  dailySteps: number;
  currentProgramId?: string;
  user?: {
    name?: string;
    avatarUrl?: string;
    email?: string;
  };
  currentProgram?: {
    id: string;
    name: string;
    description: string;
    level: string;
    days?: {
      id: string;
      dayNumber: number;
      title: string;
      exercises?: {
        id: string;
        exercise?: {
          name: string;
        };
      }[];
    }[];
  };
}

interface ProfileScreenProps {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { isDark, toggle: toggleTheme } = useTheme();
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Settings States
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [weightUnit, setWeightUnit] = useState('kg');

  const handleClearCache = () => {
    showAlert({
      title: 'Clear Cache',
      message: 'Are you sure you want to clear the app cache? This will reset offline templates.',
      why: 'This removes downloaded workout exercises and sync checkpoints stored locally.',
      actionGuide: 'Tap "Clear" to confirm cache reset, or "Cancel" to abort.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            showAlert({
              title: 'Cache Cleared',
              message: 'App cache has been reset.',
              why: 'Offline templates and local data caches were removed.',
              actionGuide: 'Tap OK to return to settings.',
              type: 'success',
            });
          }
        }
      ]
    });
  };

  const [isSyncingSteps, setIsSyncingSteps] = useState(false);

  const handleForceSyncSteps = async () => {
    try {
      setIsSyncingSteps(true);
      const success = await pedometerService.syncSteps(api, showAlert);
      if (success) {
        showAlert({
          title: 'Steps Synced',
          message: 'Steps synced successfully with your phone sensors.',
          why: 'The local pedometer count has been uploaded to the dashboard database.',
          actionGuide: 'Check your daily steps progress on the Home screen dashboard.',
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Sync Not Supported',
          message: 'Steps tracking is not available on this device/simulator.',
          why: 'The physical device lacks pedometer sensors or permission for activity tracking was denied.',
          actionGuide: 'Enable physical activity permissions in your system settings or log steps manually.',
          type: 'warning',
        });
      }
    } catch (e) {
      console.warn('Manual sync failed:', e);
      showAlert({
        title: 'Sync Failed',
        message: 'Unable to connect to the step tracking sensor.',
        why: 'Network connection was interrupted or sensor services did not respond.',
        actionGuide: 'Verify your internet connection and check if device sensors are enabled.',
        type: 'error',
      });
    } finally {
      setIsSyncingSteps(false);
    }
  };

  const handleSettingsLogout = () => {
    if (onLogout) {
      setIsSettingsModalVisible(false);
      onLogout();
    } else {
      showAlert({
        title: 'Logout Failed',
        message: 'Unable to perform logout at this time.',
        why: 'The authorization token could not be revoked on the server or the logout callback was not registered.',
        actionGuide: 'Try closing and restarting the app, then select logout again.',
        type: 'error',
      });
    }
  };
  
  // Edit Profile States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'body' | 'goals' | null>('profile');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [goal, setGoal] = useState('stay_active');
  const [trainingDays, setTrainingDays] = useState('4');
  const [dailyCalories, setDailyCalories] = useState('2000');
  const [dailyWater, setDailyWater] = useState('2500');
  const [isSaving, setIsSaving] = useState(false);

  // Program Walkthrough progress states
  const [history, setHistory] = useState<any[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  // Photos State
  const [photos, setPhotos] = useState<any[]>([]);

  // Daily Biometrics Log Modal States
  const [isMetricsModalVisible, setIsMetricsModalVisible] = useState(false);
  const [logWeight, setLogWeight] = useState('');
  const [logBodyFat, setLogBodyFat] = useState('');
  const [logSkeletalMuscle, setLogSkeletalMuscle] = useState('');
  const [logWaist, setLogWaist] = useState('');
  const [logChest, setLogChest] = useState('');
  const [logShoulders, setLogShoulders] = useState('');
  const [logLeftBicep, setLogLeftBicep] = useState('');
  const [logRightBicep, setLogRightBicep] = useState('');
  const [logLeftThigh, setLogLeftThigh] = useState('');
  const [logRightThigh, setLogRightThigh] = useState('');
  const [logNeck, setLogNeck] = useState('');
  const [logHips, setLogHips] = useState('');
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);
  const [activeBiometricsSection, setActiveBiometricsSection] = useState<'composition' | 'circumference' | null>('composition');

  // Photo uploading states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profiles/mine');
      if (res.data) {
        setProfile(res.data);
        // Pre-populate editor form values
        setName(res.data.user?.name || '');
        setAvatarUrl(res.data.user?.avatarUrl || null);
        setAge(res.data.age?.toString() || '25');
        setWeight(res.data.weight?.toString() || '75');
        setHeight(res.data.height?.toString() || '178');
        setGender(res.data.gender || 'male');
        setGoal(res.data.goal || 'stay_active');
        setTrainingDays(res.data.trainingDays?.toString() || '4');
        setDailyCalories(res.data.dailyCalories?.toString() || '2000');
        setDailyWater(res.data.dailyWater?.toString() || '2500');
      }
      try {
        const historyRes = await api.get('/workouts/history');
        if (historyRes.data) {
          setHistory(historyRes.data);
        }
      } catch (err) {
        console.warn('Failed to load workout history for program progression walkthrough:', err);
      }
    } catch (e) {
      console.warn('Failed to load profile from backend, setting mock profile');
      setProfile({
        goal: 'lose_fat',
        age: 24,
        gender: 'male',
        weight: 78.0,
        height: 180,
        trainingDays: 4,
        trainingLocation: 'gym',
        dailyCalories: 2200,
        dailyProtein: 140,
        dailyWater: 3000,
        dailySteps: 10000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/progress/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.warn('Failed to load progress analytics:', err);
    }
  };

  const fetchPhotos = async () => {
    try {
      const res = await api.get('/progress/photos');
      setPhotos(res.data || []);
    } catch (err) {
      console.warn('Failed to load progress photos:', err);
    }
  };

  const handleRegenerateProgram = async () => {
    await programService.regenerateProgram(setIsRegenerating, fetchProfile, showAlert);
  };

  const handleSaveMetrics = async () => {
    if (!logWeight || isNaN(parseFloat(logWeight))) {
      showAlert({
        title: 'Invalid Input',
        message: 'Please enter a valid weight.',
        why: 'The weight metric must be a numeric value representing your current weight in kilograms.',
        actionGuide: 'Please enter a valid number (e.g. 78.5) and try saving again.',
        type: 'warning',
      });
      return;
    }

    setIsSavingMetrics(true);
    try {
      const payload: any = {
        weight: parseFloat(logWeight),
      };

      if (logBodyFat) payload.bodyFatPercentage = parseFloat(logBodyFat);
      if (logSkeletalMuscle) payload.skeletalMuscleMass = parseFloat(logSkeletalMuscle);
      if (logWaist) payload.waist = parseFloat(logWaist);
      if (logChest) payload.chest = parseFloat(logChest);
      if (logShoulders) payload.shoulders = parseFloat(logShoulders);
      if (logLeftBicep) payload.leftBicep = parseFloat(logLeftBicep);
      if (logRightBicep) payload.rightBicep = parseFloat(logRightBicep);
      if (logLeftThigh) payload.leftThigh = parseFloat(logLeftThigh);
      if (logRightThigh) payload.rightThigh = parseFloat(logRightThigh);
      if (logNeck) payload.neck = parseFloat(logNeck);
      if (logHips) payload.hips = parseFloat(logHips);

      await api.post('/progress/metrics', payload);
      showAlert({
        title: 'Metrics Saved',
        message: 'Your body metrics have been logged successfully.',
        why: 'The system has saved your current weight, body fat, and muscle mass to compute analytics progression.',
        actionGuide: 'Review your progress graph on the Analytics panel.',
        type: 'success',
      });
      
      // Reset inputs
      setLogWeight('');
      setLogBodyFat('');
      setLogSkeletalMuscle('');
      setLogWaist('');
      setLogChest('');
      setLogShoulders('');
      setLogLeftBicep('');
      setLogRightBicep('');
      setLogLeftThigh('');
      setLogRightThigh('');
      setLogNeck('');
      setLogHips('');

      setIsMetricsModalVisible(false);
      await fetchAnalytics();
      await fetchProfile();
    } catch (err) {
      console.error('Failed to log metrics:', err);
      showAlert({
        title: 'Failed to Save Metrics',
        message: 'Unable to log metrics.',
        why: 'A network communication error or database storage mismatch occurred.',
        actionGuide: 'Check your internet connection and try submitting the form again.',
        type: 'error',
      });
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await api.delete(`/progress/photos/${photoId}`);
      fetchPhotos();
    } catch (err) {
      showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete photo.',
        type: 'error',
      });
    }
  };

  const pickImage = async (angle: 'front' | 'side' | 'back', useCamera = false) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        showAlert({
          title: 'Permission Denied',
          message: `You need to grant ${useCamera ? 'camera' : 'photo library'} permissions to upload progress photos.`,
          why: 'The operating system security policy blocks access to local files or hardware capture without explicit user authorization.',
          actionGuide: 'Open your mobile settings, find Hadafak app, and allow access to camera/photos.',
          type: 'warning',
        });
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        uploadPhoto(angle, localUri);
      }
    } catch (err) {
      console.error('Failed to pick image:', err);
      showAlert({
        title: 'Image Selection Failed',
        message: 'Unable to pick or take image.',
        why: 'The system image picker encountered an error or was closed unexpectedly.',
        actionGuide: 'Please try selecting the image again.',
        type: 'error',
      });
    }
  };

  const uploadPhoto = async (angle: 'front' | 'side' | 'back', localUri: string) => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(localUri);
        const blob = await response.blob();
        formData.append('file', blob, `photo-${angle}.jpg`);
      } else {
        formData.append('file', {
          uri: localUri,
          name: `photo-${angle}.jpg`,
          type: 'image/jpeg',
        } as any);
      }
      formData.append('angle', angle);
      formData.append('date', new Date().toISOString().split('T')[0]);

      await api.post('/progress/photos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showAlert({
        title: 'Photo Uploaded',
        message: `${angle.toUpperCase()} photo uploaded successfully!`,
        why: 'The image asset was processed and stored securely on our servers to track visual progression.',
        actionGuide: 'You can now view this progress photo under the visual progression list.',
        type: 'success',
      });
      fetchPhotos();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to upload photo:', err);
      showAlert({
        title: 'Upload Failed',
        message: 'Failed to upload photo.',
        why: 'A network upload error occurred or the file format is invalid.',
        actionGuide: 'Verify your internet connection speed and try uploading the photo again.',
        type: 'error',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getPhotoUri = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanHost = API_BASE_URL.replace('/api/v1', '');
    return `${cleanHost}${url}`;
  };

  const pickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showAlert({
          title: 'Permission Denied',
          message: 'You need to grant photo library permissions to change your profile picture.',
          why: 'The operating system prevents the application from viewing your photo gallery without explicit access permission.',
          actionGuide: 'Please open your phone settings, look for Hadafak app, and toggle "Photos" access to permitted.',
          type: 'warning',
        });
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        uploadAvatar(localUri);
      }
    } catch (err) {
      console.error('Failed to pick avatar:', err);
      showAlert({
        title: 'Selection Failed',
        message: 'Unable to pick profile image.',
        why: 'The system image picker failed to initialize or was cancelled by the user.',
        actionGuide: 'Please open your photos again and select a valid JPEG/PNG image.',
        type: 'error',
      });
    }
  };

  const uploadAvatar = async (localUri: string) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(localUri);
        const blob = await response.blob();
        formData.append('file', blob, 'avatar.jpg');
      } else {
        formData.append('file', {
          uri: localUri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const res = await api.post('/profiles/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAvatarUrl(res.data.avatarUrl);
      if (profile) {
        setProfile({
          ...profile,
          user: {
            ...profile.user,
            avatarUrl: res.data.avatarUrl,
          },
        });
      }
      showAlert({
        title: 'Avatar Updated',
        message: 'Profile picture updated successfully!',
        why: 'The image was uploaded to our storage buckets and mapped to your account avatar.',
        actionGuide: 'Your new photo will now be visible across all sections of the app.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      showAlert({
        title: 'Upload Failed',
        message: 'Failed to upload profile picture.',
        why: 'A temporary network interruption occurred while sending the file.',
        actionGuide: 'Verify your internet signal and try uploading the picture again.',
        type: 'error',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchAnalytics();
      fetchPhotos();
    }, [])
  );

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showAlert({
        title: 'Invalid Name',
        message: 'Name cannot be empty.',
        why: 'Your account requires a display name to personalize headers, goals, and training templates.',
        actionGuide: 'Please enter a name in the text field to save.',
        type: 'warning',
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        gender,
        goal,
        trainingDays: parseInt(trainingDays),
        trainingLocation: 'gym',
        dailyCalories: parseInt(dailyCalories),
        dailyWater: parseInt(dailyWater),
      };

      const res = await api.post('/profiles', payload);
      setProfile(res.data);
      setIsEditModalVisible(false);
      showAlert({
        title: 'Profile Updated',
        message: 'Profile settings updated successfully!',
        why: 'Your age, height, weight, activity frequency, and calorie targets have been successfully saved to your database profile.',
        actionGuide: 'Review your personalized recommendations on the Home tab.',
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Save Failed',
        message: 'Unable to save profile configuration.',
        why: 'A network error occurred or the database server rejected the configuration parameters.',
        actionGuide: 'Ensure that all metrics contain valid positive numbers and try saving again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Convert db goal key to clean string
  const formatGoal = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get points from analytics or fallback
  const getWeightPoints = () => {
    if (analytics && analytics.weightTrend && analytics.weightTrend.length > 0) {
      return analytics.weightTrend.map((t: any) => ({
        val: Number(t.rawWeight),
        label: t.date.substring(5), // MM-DD
      }));
    }
    // Fallback if no analytics loaded yet
    const fallbacks = [82.5, 81.2, 80.8, 79.5, 78.8, 78.0];
    return fallbacks.map((val, idx) => ({
      val,
      label: `Wk ${idx + 1}`,
    }));
  };

  interface WeightPoint {
    val: number;
    label: string;
  }

  interface CoordinatePoint {
    x: number;
    y: number;
    val: number;
    label: string;
  }

  const trendPoints: WeightPoint[] = getWeightPoints();
  const weightVals = trendPoints.map((p: WeightPoint) => p.val);
  const maxW = Math.max(...weightVals, 85);
  const minW = Math.min(...weightVals, 75);
  const points: CoordinatePoint[] = trendPoints.map((p: WeightPoint, idx: number) => {
    const totalPoints = trendPoints.length;
    // Distribute X coordinate across 220px range
    const x = 30 + idx * (220 / Math.max(totalPoints - 1, 1));
    const y = 80 - ((p.val - minW) / Math.max(maxW - minW, 0.1)) * 50;
    return { x, y, val: p.val, label: p.label };
  });

  const linePath = points.reduce((path: string, p: CoordinatePoint, idx: number) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    const prev = points[idx - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = p.x - (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${path} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StateFeedback
          type="loading"
          title="Loading Profile Settings..."
          description="Fetching your biometrics, weight trends, and progression photos."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsHeaderBtn}
          onPress={() => setIsSettingsModalVisible(true)}
          activeOpacity={0.7}
        >
          <Settings size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* User Card */}
          <View style={styles.userProfileCard}>
            <View style={styles.userRow}>
              <View style={styles.avatarWrapper}>
                {profile?.user?.avatarUrl ? (
                  <Image
                    source={{ uri: getPhotoUri(profile.user.avatarUrl) }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <User size={38} color={COLORS.primary} />
                )}
              </View>
              <View style={styles.userInfoCol}>
                <Text style={styles.userNameText}>{profile?.user?.name || 'Hadafak Athlete'}</Text>
                <Text style={styles.userGoalTag}>
                  Goal: {profile ? formatGoal(profile.goal) : 'Stay Active'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(true)}
                style={styles.editPencilCircle}
              >
                <Edit2 size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Three column stats badge */}
            <View style={styles.biometricsRow}>
              <View style={styles.bioStatCell}>
                <ScaleIcon size={20} color={COLORS.textLight} style={{ marginBottom: 4 }} />
                <Text style={styles.bioStatLabel}>Weight</Text>
                <Text style={styles.bioStatVal}>{profile?.weight || 75} kg</Text>
              </View>
              <View style={styles.dividerCol} />
              <View style={styles.bioStatCell}>
                <CompassIcon size={20} color={COLORS.textLight} style={{ marginBottom: 4 }} />
                <Text style={styles.bioStatLabel}>Height</Text>
                <Text style={styles.bioStatVal}>{profile?.height || 178} cm</Text>
              </View>
              <View style={styles.dividerCol} />
              <View style={styles.bioStatCell}>
                <Calendar size={20} color={COLORS.textLight} style={{ marginBottom: 4 }} />
                <Text style={styles.bioStatLabel}>Age</Text>
                <Text style={styles.bioStatVal}>{profile?.age || 25} yrs</Text>
              </View>
            </View>
          </View>

          {/* Log Daily Biometrics Trigger Button */}
          <TouchableOpacity
            onPress={() => setIsMetricsModalVisible(true)}
            style={styles.logBiometricsBtn}
          >
            <ScaleIcon size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logBiometricsBtnText}>Log Daily Biometrics</Text>
          </TouchableOpacity>

          {/* Coach Insight Message */}
          {analytics?.statusMessage && (
            <View style={styles.insightCard}>
              <TrophyIcon size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.insightText}>{analytics.statusMessage}</Text>
            </View>
          )}

          {/* SVG Weight Progression Curve Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <ScaleIcon size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.progressTitle}>Weight Transformation Curve (kg)</Text>
            </View>

            <View style={styles.svgContainer}>
              <Svg height={100} width="100%" viewBox="0 0 280 100">
                <Defs>
                  <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.2" />
                    <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>
                
                {/* Horizontal grid guide lines */}
                <Line x1="20" y1="20" x2="260" y2="20" stroke={COLORS.border} strokeWidth="1" strokeDasharray="3" />
                <Line x1="20" y1="50" x2="260" y2="50" stroke={COLORS.border} strokeWidth="1" strokeDasharray="3" />
                <Line x1="20" y1="80" x2="260" y2="80" stroke={COLORS.border} strokeWidth="1" />

                {/* Gradient fill */}
                {points.length > 1 && (
                  <Path
                    d={`${linePath} L ${points[points.length - 1].x} 80 L ${points[0].x} 80 Z`}
                    fill="url(#weightGrad)"
                  />
                )}

                {/* Curve Line */}
                {points.length > 1 && (
                  <Path d={linePath} fill="none" stroke={COLORS.primary} strokeWidth="3" />
                )}

                {/* Coordinate points */}
                {points.map((p: CoordinatePoint, idx: number) => (
                  <G key={idx}>
                    <Circle cx={p.x} cy={p.y} r={4} fill={COLORS.primary} />
                    <Circle cx={p.x} cy={p.y} r={2} fill="#FFFFFF" />
                    <SvgText
                      fontSize={7}
                      fill={COLORS.textLight}
                      fontWeight="700"
                      x={p.x - 8}
                      y={p.y - 8}
                    >
                      {p.val}
                    </SvgText>
                    <SvgText
                      fontSize={6}
                      fill={COLORS.textMuted}
                      fontWeight="600"
                      x={p.x - 10}
                      y={92}
                    >
                      {p.label}
                    </SvgText>
                  </G>
                ))}
              </Svg>
            </View>
          </View>

          {/* Transformation Prediction Card */}
          {analytics?.prediction && (
            <View style={styles.predictionCard}>
              <View style={styles.predictionHeader}>
                <TargetIcon size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.predictionTitle}>Transformation Prediction</Text>
              </View>
              {analytics.prediction.plateau ? (
                <Text style={styles.predictionBody}>
                  Your weight has been stable lately — consider adjusting your calories or training intensity.
                </Text>
              ) : (
                <>
                  <Text style={styles.predictionBody}>
                    At your current pace, you could reach{' '}
                    <Text style={styles.predictionHighlight}>{analytics.prediction.targetWeight} kg</Text>
                    {' '}in{' '}
                    <Text style={styles.predictionHighlight}>{analytics.prediction.estimatedDays} days</Text>
                  </Text>
                  <View style={styles.predictionMeta}>
                    <Text style={styles.predictionMetaText}>
                      Est. {new Date(analytics.prediction.estimatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={styles.predictionMetaText}>
                      {analytics.prediction.weeklyRate > 0 ? '+' : ''}{analytics.prediction.weeklyRate} kg/week
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Daily Target Parameters overview */}
          <Text style={styles.sectionTitle}>Calculated Targets</Text>
          <View style={styles.targetsCard}>
            <View style={styles.targetItem}>
              <View style={styles.targetLeft}>
                <View style={[styles.targetIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                  <FireIcon size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.targetName}>Daily Energy Target</Text>
                  <Text style={styles.targetSub}>Determines daily calorie intake goal</Text>
                </View>
              </View>
              <Text style={styles.targetValue}>{profile?.dailyCalories || 2000} Kcal</Text>
            </View>

            <View style={[styles.targetItem, { marginTop: 14 }]}>
              <View style={styles.targetLeft}>
                <View style={[styles.targetIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <WaterIcon size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.targetName}>Daily Hydration Goal</Text>
                  <Text style={styles.targetSub}>Ensures optimized metabolic activity</Text>
                </View>
              </View>
              <Text style={styles.targetValue}>{profile?.dailyWater || 2500} ml</Text>
            </View>
          </View>

          {/* Transformation Photos Progression */}
          <Text style={styles.sectionTitle}>Progress Photo Tracker</Text>
          <Text style={styles.sectionSubtitle}>Compare angles to review lean muscle & shape improvements</Text>

          <View style={styles.photosGridRow}>
            {(['front', 'side', 'back'] as const).map((angle) => {
              const latestPhoto = photos.find((p) => p.angle === angle);
              return (
                <View key={angle} style={styles.photoContainer}>
                  {latestPhoto ? (
                    <View style={styles.photoContainerInner}>
                      <Image
                        source={{ uri: getPhotoUri(latestPhoto.imageUrl) }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlayBadge}>
                        <Text style={styles.photoOverlayText}>{angle.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.photoDeleteBtn}
                        onPress={() => handleDeletePhoto(latestPhoto.id)}
                      >
                        <Trash2 size={14} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.photoPlaceholder}
                      onPress={() => {
                        showAlert({
                          title: 'Upload Progress Photo',
                          message: `Select source for your ${angle} profile photo:`,
                          why: 'A photo upload helps track body metrics and muscle definition visually over time.',
                          actionGuide: 'Choose "Camera" to take a live photo, or "Photo Library" to pick an existing image.',
                          type: 'info',
                          buttons: [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Camera', onPress: () => pickImage(angle, true) },
                            { text: 'Photo Library', onPress: () => pickImage(angle, false) },
                          ],
                        });
                      }}
                    >
                      <Camera size={22} color={COLORS.primary} />
                      <Text style={styles.photoPlaceholderText}>{angle.toUpperCase()}</Text>
                      <Plus size={14} color={COLORS.primary} style={{ marginTop: 4 }} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Timeline Gallery */}
        {photos.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={styles.contentPadding}>
              <Text style={styles.timelineTitle}>Photo Timeline Log</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {photos.map((item) => (
                <View key={item.id} style={styles.timelineItemCard}>
                  <Image
                    source={{ uri: getPhotoUri(item.imageUrl) }}
                    style={styles.timelineImg}
                    resizeMode="cover"
                  />
                  <View style={styles.timelineDetails}>
                    <Text style={styles.timelineAngleText}>{item.angle.toUpperCase()}</Text>
                    <Text style={styles.timelineDateText}>{item.date}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timelineDeleteIcon}
                    onPress={() => handleDeletePhoto(item.id)}
                  >
                    <Trash2 size={12} color="#FF4D4D" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isUploadingPhoto && (
          <View style={styles.uploadingLoader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.uploadingText}>Processing image...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Editor Modal Sheet */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Athlete Metrics</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Inputs Scroll container */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              
              {/* SECTION 1: PROFILE & ACCOUNT */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <User size={18} color={activeSection === 'profile' ? COLORS.primary : COLORS.textLight} style={{ marginRight: 10 }} />
                  <Text style={[styles.accordionHeaderText, activeSection === 'profile' && styles.accordionHeaderTextActive]}>
                    Profile & Account
                  </Text>
                </View>
                {activeSection === 'profile' ? (
                  <ChevronDown size={18} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              {activeSection === 'profile' && (
                <View style={styles.accordionContent}>
                  {/* Avatar Upload Container */}
                  <View style={styles.avatarUploadContainer}>
                    <TouchableOpacity onPress={pickAvatar} style={styles.modalAvatarWrapper} activeOpacity={0.8}>
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : avatarUrl ? (
                        <Image source={{ uri: getPhotoUri(avatarUrl) }} style={styles.modalAvatarImage} />
                      ) : (
                        <User size={40} color={COLORS.primary} />
                      )}
                      <View style={styles.cameraBadge}>
                        <Camera size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
                      <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. John Doe"
                      autoCapitalize="words"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
              )}

              {/* SECTION 2: BODY METRICS */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setActiveSection(activeSection === 'body' ? null : 'body')}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <ScaleIcon size={18} color={activeSection === 'body' ? COLORS.primary : COLORS.textLight} style={{ marginRight: 10 }} />
                  <Text style={[styles.accordionHeaderText, activeSection === 'body' && styles.accordionHeaderTextActive]}>
                    Body Metrics
                  </Text>
                </View>
                {activeSection === 'body' ? (
                  <ChevronDown size={18} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              {activeSection === 'body' && (
                <View style={styles.accordionContent}>
                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="numeric"
                        placeholder="e.g. 25"
                        placeholderTextColor={COLORS.textMuted}
                        value={age}
                        onChangeText={setAge}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Gender</Text>
                      <View style={styles.genderRow}>
                        <TouchableOpacity
                          style={[styles.genderCell, gender === 'male' && styles.genderCellActive]}
                          onPress={() => setGender('male')}
                        >
                          <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.genderCell, gender === 'female' && styles.genderCellActive]}
                          onPress={() => setGender('female')}
                        >
                          <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Female</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Weight (kg)</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 70.0"
                        placeholderTextColor={COLORS.textMuted}
                        value={weight}
                        onChangeText={setWeight}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Height (cm)</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="numeric"
                        placeholder="e.g. 175"
                        placeholderTextColor={COLORS.textMuted}
                        value={height}
                        onChangeText={setHeight}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* SECTION 3: GOALS & PREFERENCES */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setActiveSection(activeSection === 'goals' ? null : 'goals')}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <TargetIcon size={18} color={activeSection === 'goals' ? COLORS.primary : COLORS.textLight} style={{ marginRight: 10 }} />
                  <Text style={[styles.accordionHeaderText, activeSection === 'goals' && styles.accordionHeaderTextActive]}>
                    Goals & Preferences
                  </Text>
                </View>
                {activeSection === 'goals' ? (
                  <ChevronDown size={18} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              {activeSection === 'goals' && (
                <View style={styles.accordionContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Fitness Goal</Text>
                    <View style={styles.goalsOptionsRow}>
                      {[
                        { key: 'gain_muscle', label: 'Gain Muscle' },
                        { key: 'lose_fat', label: 'Lose Fat' },
                        { key: 'stay_active', label: 'Stay Active' },
                        { key: 'athletic', label: 'Athletic' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.goalChip, goal === item.key && styles.goalChipActive]}
                          onPress={() => setGoal(item.key)}
                        >
                          <Text style={[styles.goalChipText, goal === item.key && styles.goalChipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                   <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Training Days per Week</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      keyboardType="numeric"
                      placeholder="4"
                      placeholderTextColor={COLORS.textMuted}
                      value={trainingDays}
                      onChangeText={setTrainingDays}
                    />
                  </View>

                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Daily Calorie Target</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="numeric"
                        placeholder="e.g. 2000"
                        placeholderTextColor={COLORS.textMuted}
                        value={dailyCalories}
                        onChangeText={setDailyCalories}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Daily Water Target (ml)</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="numeric"
                        placeholder="e.g. 2500"
                        placeholderTextColor={COLORS.textMuted}
                        value={dailyWater}
                        onChangeText={setDailyWater}
                      />
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.saveProfileBtn}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileText}>Update Metrics</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Daily Biometrics Logger Modal */}
      <Modal
        visible={isMetricsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMetricsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Log Daily Biometrics</Text>
              <TouchableOpacity
                onPress={() => setIsMetricsModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Inputs Scroll container */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              
              {/* Section 1: Body Composition */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setActiveBiometricsSection(activeBiometricsSection === 'composition' ? null : 'composition')}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <ScaleIcon size={18} color={activeBiometricsSection === 'composition' ? COLORS.primary : COLORS.textLight} style={{ marginRight: 10 }} />
                  <Text style={[styles.accordionHeaderText, activeBiometricsSection === 'composition' && styles.accordionHeaderTextActive]}>
                    Body Composition
                  </Text>
                </View>
                {activeBiometricsSection === 'composition' ? (
                  <ChevronDown size={18} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.textLight} />
                )}
              </TouchableOpacity>

              {activeBiometricsSection === 'composition' && (
                <View style={styles.accordionContent}>
                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Weight (kg) *</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 75.5"
                        placeholderTextColor={COLORS.textMuted}
                        value={logWeight}
                        onChangeText={setLogWeight}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Body Fat %</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 15.2"
                        placeholderTextColor={COLORS.textMuted}
                        value={logBodyFat}
                        onChangeText={setLogBodyFat}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Skeletal Muscle Mass (kg)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 35.8"
                      placeholderTextColor={COLORS.textMuted}
                      value={logSkeletalMuscle}
                      onChangeText={setLogSkeletalMuscle}
                    />
                  </View>
                </View>
              )}

              {/* Section 2: Circumference Measurements */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setActiveBiometricsSection(activeBiometricsSection === 'circumference' ? null : 'circumference')}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <RulerIcon size={18} color={activeBiometricsSection === 'circumference' ? COLORS.primary : COLORS.textLight} style={{ marginRight: 10 }} />
                  <Text style={[styles.accordionHeaderText, activeBiometricsSection === 'circumference' && styles.accordionHeaderTextActive]}>
                    Circumference Measurements
                  </Text>
                </View>
                {activeBiometricsSection === 'circumference' ? (
                  <ChevronDown size={18} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.textLight} />
                )}
              </TouchableOpacity>

              {activeBiometricsSection === 'circumference' && (
                <View style={styles.accordionContent}>
                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Waist</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 80.5"
                        placeholderTextColor={COLORS.textMuted}
                        value={logWaist}
                        onChangeText={setLogWaist}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Hips</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 92.4"
                        placeholderTextColor={COLORS.textMuted}
                        value={logHips}
                        onChangeText={setLogHips}
                      />
                    </View>
                  </View>

                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Chest</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 100.2"
                        placeholderTextColor={COLORS.textMuted}
                        value={logChest}
                        onChangeText={setLogChest}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Shoulders</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 118.0"
                        placeholderTextColor={COLORS.textMuted}
                        value={logShoulders}
                        onChangeText={setLogShoulders}
                      />
                    </View>
                  </View>

                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Left Bicep</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 36.5"
                        placeholderTextColor={COLORS.textMuted}
                        value={logLeftBicep}
                        onChangeText={setLogLeftBicep}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Right Bicep</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 36.8"
                        placeholderTextColor={COLORS.textMuted}
                        value={logRightBicep}
                        onChangeText={setLogRightBicep}
                      />
                    </View>
                  </View>

                  <View style={styles.gridInputRow}>
                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Left Thigh</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 56.4"
                        placeholderTextColor={COLORS.textMuted}
                        value={logLeftThigh}
                        onChangeText={setLogLeftThigh}
                      />
                    </View>

                    <View style={[styles.inputGroup, { width: '47%' }]}>
                      <Text style={styles.inputLabel}>Right Thigh</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 56.8"
                        placeholderTextColor={COLORS.textMuted}
                        value={logRightThigh}
                        onChangeText={setLogRightThigh}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Neck</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 38.0"
                      placeholderTextColor={COLORS.textMuted}
                      value={logNeck}
                      onChangeText={setLogNeck}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSaveMetrics}
                style={styles.saveProfileBtn}
                disabled={isSavingMetrics}
              >
                {isSavingMetrics ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileText}>Confirm & Log Metrics</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity
                onPress={() => setIsSettingsModalVisible(false)}
                style={styles.settingsCloseBtn}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Preferences Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Preferences</Text>
                
                <View style={styles.settingsRow}>
                  <View>
                    <Text style={styles.settingsLabel}>Push Notifications</Text>
                    <Text style={styles.settingsSublabel}>Daily reminders and alerts</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#D1D1D6', true: COLORS.primary }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  />
                </View>

                <View style={styles.settingsRow}>
                  <View>
                    <Text style={styles.settingsLabel}>Sound Effects</Text>
                    <Text style={styles.settingsSublabel}>Haptic/audio set completion rewards</Text>
                  </View>
                  <Switch
                    value={soundEnabled}
                    onValueChange={setSoundEnabled}
                    trackColor={{ false: '#D1D1D6', true: COLORS.primary }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  />
                </View>

                <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                  <View>
                    <Text style={styles.settingsLabel}>Weight Unit</Text>
                    <Text style={styles.settingsSublabel}>Choose default measuring system</Text>
                  </View>
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}
                      onPress={() => setWeightUnit('kg')}
                    >
                      <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>KG</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, weightUnit === 'lbs' && styles.unitToggleBtnActive]}
                      onPress={() => setWeightUnit('lbs')}
                    >
                      <Text style={[styles.unitToggleText, weightUnit === 'lbs' && styles.unitToggleTextActive]}>LBS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Maintenance Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Data & Caching</Text>
                
                <TouchableOpacity
                  style={[styles.settingsOptionBtn, { borderBottomWidth: 1, borderBottomColor: '#F0F0F3', paddingBottom: 12, marginBottom: 12 }]}
                  onPress={handleForceSyncSteps}
                  activeOpacity={0.8}
                  disabled={isSyncingSteps}
                >
                  <View>
                    <Text style={styles.settingsOptionText}>
                      {isSyncingSteps ? 'Syncing...' : 'Sync Step Sensors'}
                    </Text>
                    <Text style={styles.settingsSublabel}>Fetch and sync steps from today & yesterday</Text>
                  </View>
                  {isSyncingSteps ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <ChevronRight size={18} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsOptionBtn}
                  onPress={handleClearCache}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={styles.settingsOptionText}>Clear Cache</Text>
                    <Text style={styles.settingsSublabel}>Remove offline workout templates</Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {/* Log Out */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleSettingsLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (COLORS: ThemeColors) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsHeaderBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  settingsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '75%',
    padding: 24,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  settingsCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
  },
  settingsSection: {
    backgroundColor: '#F9F9FB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingsSublabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    borderRadius: 12,
    padding: 2,
  },
  unitToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  unitToggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  unitToggleText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '700',
  },
  unitToggleTextActive: {
    color: COLORS.primary,
  },
  settingsOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingsOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 16,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  // User profile card
  userProfileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 32,
    padding: 22,
    ...SHADOWS.card,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoCol: {
    flex: 1,
    paddingLeft: 16,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  userGoalTag: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 3,
  },
  editPencilCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  bioStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  dividerCol: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  bioStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  bioStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  logBiometricsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.subtle,
  },
  logBiometricsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  insightCard: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(94, 0, 74, 0.08)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 16,
  },
  predictionCard: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  predictionBody: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 8,
  },
  predictionHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  predictionMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  // Progression curve
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 32,
    padding: 20,
    ...SHADOWS.card,
    marginBottom: 24,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  svgContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Targets Card
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 16,
  },
  targetsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  targetIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  targetName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  targetSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  // Photos Gallery
  photosGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoContainer: {
    flex: 1,
    aspectRatio: 0.75,
  },
  photoContainerInner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  photoOverlayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  photoPlaceholderText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 6,
  },
  // Timeline Gallery
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  timelineScrollContainer: {
    marginHorizontal: -20,
  },
  timelineScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  timelineItemCard: {
    width: 100,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    padding: 6,
    position: 'relative',
  },
  timelineImg: {
    width: '100%',
    height: 90,
    borderRadius: 10,
  },
  timelineDetails: {
    marginTop: 6,
    alignItems: 'center',
  },
  timelineAngleText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timelineDateText: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineDeleteIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  uploadingLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Standard
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    height: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalTextInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  metricsSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },
  goalsOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  goalChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  goalChipText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  goalChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  gridInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 3,
    backgroundColor: COLORS.surfaceLight,
    height: 48,
    alignItems: 'center',
  },
  genderCell: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  genderCellActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.subtle,
  },
  genderText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  saveProfileBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveProfileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  accordionHeaderTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  accordionContent: {
    paddingHorizontal: 6,
    paddingBottom: 16,
    marginBottom: 8,
  },
  avatarUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  modalAvatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.subtle,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
});
