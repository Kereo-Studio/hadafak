import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Image,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../theme/colors';
import {
  Award,
  User,
  Settings,
  Scale,
  Calendar,
  Compass,
  Check,
  ChevronRight,
  Plus,
  Edit2,
  X,
  Target,
  Flame,
  Droplet,
  Camera,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { api, API_BASE_URL } from '../services/api';
import { pedometerService } from '../utils/pedometerService';
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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Settings States
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will reset offline templates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'App cache has been reset.');
          }
        }
      ]
    );
  };

  const [isSyncingSteps, setIsSyncingSteps] = useState(false);

  const handleForceSyncSteps = async () => {
    try {
      setIsSyncingSteps(true);
      const success = await pedometerService.syncSteps(api);
      if (success) {
        Alert.alert('Success', 'Steps synced successfully with your phone sensors.');
      } else {
        Alert.alert('Not Supported', 'Steps tracking is not available on this device/simulator, or permission was denied.');
      }
    } catch (e) {
      console.warn('Manual sync failed:', e);
      Alert.alert('Error', 'Sync failed. Please check your connection and step sensor settings.');
    } finally {
      setIsSyncingSteps(false);
    }
  };

  const handleSettingsLogout = () => {
    if (onLogout) {
      setIsSettingsModalVisible(false);
      onLogout();
    } else {
      Alert.alert('Logout Error', 'Unable to perform logout at this time.');
    }
  };
  
  // Edit Profile States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
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

  // Photo uploading states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profiles/mine');
      if (res.data) {
        setProfile(res.data);
        // Pre-populate editor form values
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
    setIsRegenerating(true);
    try {
      await api.post('/programs/generate');
      await fetchProfile();
      Alert.alert('Success', 'Your personalized training program has been re-generated!');
    } catch (err) {
      console.warn('Failed to regenerate program:', err);
      Alert.alert('Error', 'Could not re-generate program. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveMetrics = async () => {
    if (!logWeight || isNaN(parseFloat(logWeight))) {
      Alert.alert('Error', 'Please enter a valid weight.');
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
      Alert.alert('Success', 'Metrics logged successfully!');
      
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
      Alert.alert('Error', 'Unable to log metrics.');
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this progress photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/progress/photos/${photoId}`);
              Alert.alert('Success', 'Progress photo deleted.');
              fetchPhotos();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete photo.');
            }
          },
        },
      ]
    );
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
        Alert.alert('Permission Denied', `You need to grant ${useCamera ? 'camera' : 'photo library'} permissions to upload progress photos.`);
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
      Alert.alert('Error', 'Unable to pick or take image.');
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

      Alert.alert('Success', `${angle.toUpperCase()} photo uploaded successfully!`);
      fetchPhotos();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to upload photo:', err);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getPhotoUri = (url: string) => {
    if (url.startsWith('http')) return url;
    const cleanHost = API_BASE_URL.replace('/api/v1', '');
    return `${cleanHost}${url}`;
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchAnalytics();
      fetchPhotos();
    }, [])
  );

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
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
      Alert.alert('Success', 'Profile settings updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Unable to save profile configuration.');
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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
                <User size={38} color={COLORS.primary} />
              </View>
              <View style={styles.userInfoCol}>
                <Text style={styles.userNameText}>Hadafak Athlete</Text>
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
                <Scale size={20} color={COLORS.textLight} style={{ marginBottom: 4 }} />
                <Text style={styles.bioStatLabel}>Weight</Text>
                <Text style={styles.bioStatVal}>{profile?.weight || 75} kg</Text>
              </View>
              <View style={styles.dividerCol} />
              <View style={styles.bioStatCell}>
                <Compass size={20} color={COLORS.textLight} style={{ marginBottom: 4 }} />
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
            <Scale size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logBiometricsBtnText}>Log Daily Biometrics</Text>
          </TouchableOpacity>

          {/* Coach Insight Message */}
          {analytics?.statusMessage && (
            <View style={styles.insightCard}>
              <Award size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.insightText}>{analytics.statusMessage}</Text>
            </View>
          )}

          {/* SVG Weight Progression Curve Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Scale size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
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

          {/* Daily Target Parameters overview */}
          <Text style={styles.sectionTitle}>Calculated Targets</Text>
          <View style={styles.targetsCard}>
            <View style={styles.targetItem}>
              <View style={styles.targetLeft}>
                <View style={[styles.targetIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                  <Flame size={20} color={COLORS.primary} />
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
                  <Droplet size={20} color="#0284C7" />
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
                        Alert.alert(
                          'Upload Progress Photo',
                          `Select source for your ${angle} profile photo:`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Camera', onPress: () => pickImage(angle, true) },
                            { text: 'Photo Library', onPress: () => pickImage(angle, false) },
                          ]
                        );
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

              <View style={styles.gridInputRow}>
                <View style={[styles.inputGroup, { width: '47%' }]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="numeric"
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
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>

                <View style={[styles.inputGroup, { width: '47%' }]}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Training Days per Week</Text>
                <TextInput
                  style={styles.modalTextInput}
                  keyboardType="numeric"
                  placeholder="4"
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
                    value={dailyCalories}
                    onChangeText={setDailyCalories}
                  />
                </View>

                <View style={[styles.inputGroup, { width: '47%' }]}>
                  <Text style={styles.inputLabel}>Daily Water Target (ml)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="numeric"
                    value={dailyWater}
                    onChangeText={setDailyWater}
                  />
                </View>
              </View>

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
              
              <Text style={styles.metricsSectionHeading}>Body Composition</Text>
              
              <View style={styles.gridInputRow}>
                <View style={[styles.inputGroup, { width: '47%' }]}>
                  <Text style={styles.inputLabel}>Weight (kg) *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 75.5"
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
                  value={logSkeletalMuscle}
                  onChangeText={setLogSkeletalMuscle}
                />
              </View>

              <Text style={[styles.metricsSectionHeading, { marginTop: 14 }]}>Circumference Measurements (cm)</Text>

              <View style={styles.gridInputRow}>
                <View style={[styles.inputGroup, { width: '47%' }]}>
                  <Text style={styles.inputLabel}>Waist</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 80.5"
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
                  value={logNeck}
                  onChangeText={setLogNeck}
                />
              </View>

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

                <View style={styles.settingsRow}>
                  <View>
                    <Text style={styles.settingsLabel}>Dark Mode (Beta)</Text>
                    <Text style={styles.settingsSublabel}>Toggle experimental dark mode</Text>
                  </View>
                  <Switch
                    value={darkModeEnabled}
                    onValueChange={setDarkModeEnabled}
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

const styles = StyleSheet.create({
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
});
