import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { pedometerService, getLocalTodaySteps, saveLocalTodaySteps } from '../utils/pedometerService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../components/CustomAlert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import {
  Bike,
  Flame,
  TrendingUp,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Play,
  Heart,
  Footprints,
  Sparkles,
  Award,
  Zap,
  Dumbbell,
  Waves,
  Compass,
  Activity,
  X,
  Clock,
  Trash2,
  Utensils,
  BookOpen,
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { api, API_BASE_URL } from '../services/api';
import { StateFeedback } from '../components/StateFeedback';

const { width } = Dimensions.get('window');

const CARDIO_EXERCISES = [
  { id: 'cycling', name: 'Cycling', icon: Bike, type: 'cycling', category: 'run' },
  { id: 'running', name: 'Running', icon: Flame, type: 'run', category: 'run' },
  { id: 'treadmill', name: 'Treadmill', icon: Activity, type: 'run', category: 'run' },
  { id: 'walking', name: 'Walking', icon: Footprints, type: 'walk', category: 'run' },
  { id: 'hiking', name: 'Hiking', icon: Compass, type: 'hiking', category: 'run' },
  { id: 'rope', name: 'Jump Rope', icon: TrendingUp, type: 'rope', category: 'steps' },
  { id: 'elliptical', name: 'Elliptical', icon: Sparkles, type: 'walk', category: 'run' },
  { id: 'swimming', name: 'Swimming', icon: Waves, type: 'run', category: 'run' },
  { id: 'rowing', name: 'Rowing', icon: Dumbbell, type: 'run', category: 'run' },
  { id: 'hiit', name: 'HIIT Cardio', icon: Heart, type: 'run', category: 'run' },
];

const MiniProgressCircle: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  backgroundColor?: string;
  children: React.ReactNode;
}> = ({
  percentage,
  size = 46,
  strokeWidth = 4.5,
  color,
  backgroundColor = '#F1F5F9',
  children
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(percentage, 0), 1) * circumference);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <View style={{ position: 'absolute', zIndex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const [selectedActivity, setSelectedActivity] = useState<string>('cycling');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Real Calendar Date Selection States
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Dynamic metrics pulled from backend
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [athleteName, setAthleteName] = useState('Athlete');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const getPhotoUri = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanHost = API_BASE_URL.replace('/api/v1', '');
    return `${cleanHost}${url}`;
  };

  // Steps weekly chart data state
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  // Dashboard indicators
  const [targetCalories, setTargetCalories] = useState(2000);
  const [eatenCalories, setEatenCalories] = useState(0);
  const [burnedCalories, setBurnedCalories] = useState(0);
  const [netCalories, setNetCalories] = useState(2000);

  const [metrics, setMetrics] = useState({
    distance: '0 m',
    steps: '0',
    points: '0',
  });

  // Today's details grid indicators
  const [todayCalories, setTodayCalories] = useState('0');
  const [todaySteps, setTodaySteps] = useState('0');
  const [todayActiveTime, setTodayActiveTime] = useState(0);
  const [weightProgressTitle, setWeightProgressTitle] = useState('Weight Progress');
  const [weightProgressValue, setWeightProgressValue] = useState('0.0 kg');

  // My Plan state
  const [myPlan, setMyPlan] = useState({
    title: 'Body Weight',
    level: 'WEEK 1',
    daysCount: 'Workout 1 of 5',
    nextExercise: 'Lower Strength'
  });

  // Workouts history logs
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);

  // Duration Modal selector state
  const [isDurationModalVisible, setIsDurationModalVisible] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);

  // Suggested Recipes state
  const [suggestedRecipes, setSuggestedRecipes] = useState<any[]>([]);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<any | null>(null);
  const [isRecipeDetailModalVisible, setIsRecipeDetailModalVisible] = useState(false);

  const getSuggestedMealInfo = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { tag: 'Breakfast', label: 'Breakfast Suggestions', desc: 'Kickstart your morning with these healthy options' };
    } else if (hour >= 12 && hour < 17) {
      return { tag: 'Lunch', label: 'Lunch Suggestions', desc: 'Re-fuel your body with balanced midday meals' };
    } else if (hour >= 17 && hour < 22) {
      return { tag: 'Dinner', label: 'Dinner Suggestions', desc: 'Unwind and recover with light, high-protein dinners' };
    } else {
      return { tag: 'Snack', label: 'Snack Suggestions', desc: 'Quick bites for late night/early morning recovery' };
    }
  };

  // Completed Workout Detail Modal State
  const [selectedWorkoutSession, setSelectedWorkoutSession] = useState<any | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const handleDeleteSession = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/workouts/${id}`);
      setIsDetailModalVisible(false);
      setSelectedWorkoutSession(null);
      await fetchDashboardData();
    } catch (err) {
      console.warn('Failed to delete workout session:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFutureDate = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(dateStr + 'T12:00:00');
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() > today.getTime();
  };

  // Function to load all dashboard statistics from NestJS APIs
  const fetchDashboardData = async (dateStr?: string) => {
    try {
      const todayStr = dateStr || selectedDateStr;
      setSelectedDateStr(todayStr);

      const realTodayStr = new Date().toISOString().split('T')[0];
      const isSelectedDateRealToday = todayStr === realTodayStr;

      // Ensure user has a profile and program assigned
      let profile: any = null;
      try {
        const profileRes = await api.get('/profiles/mine');
        profile = profileRes.data;
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // Onboard profile with defaults
          try {
            const newProfileRes = await api.post('/profiles', {
              goal: 'stay_active',
              age: 25,
              gender: 'male',
              weight: 75,
              height: 178,
              trainingDays: 4,
              trainingLocation: 'gym'
            });
            profile = newProfileRes.data;
          } catch (createErr) {
            console.warn('Error creating default profile:', createErr);
          }
        }
      }

      if (profile && !profile.currentProgramId) {
        try {
          const programsRes = await api.get('/programs');
          if (programsRes.data && programsRes.data.length > 0) {
            const firstProgramId = programsRes.data[0].id;
            await api.post(`/profiles/assign-program/${firstProgramId}`);
            // Fetch profile again with relations loaded
            const refreshedProfileRes = await api.get('/profiles/mine');
            profile = refreshedProfileRes.data;
          }
        } catch (assignErr) {
          console.warn('Error assigning default program:', assignErr);
        }
      }


      // Run calls in parallel to ensure high performance
      const [authRes, stepsRes, nutritionRes, workoutsRes, runsRes, recipesRes, progressRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get(`/steps/today?date=${todayStr}`),
        api.get(`/nutrition/logs/today?date=${todayStr}`),
        api.get('/workouts/history'),
        api.get('/runs'),
        api.get('/recipes'),
        api.get('/progress/analytics'),
      ]);

      // 1. Map user greeting and avatar image
      if (profile && profile.user) {
        if (profile.user.name) {
          setAthleteName(profile.user.name);
        } else if (authRes.status === 'fulfilled' && authRes.value.data && authRes.value.data.name) {
          setAthleteName(authRes.value.data.name);
        } else if (authRes.status === 'fulfilled' && authRes.value.data) {
          const email = authRes.value.data.email || '';
          const namePart = email.split('@')[0];
          if (namePart) {
            setAthleteName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
          }
        }
        if (profile.user.avatarUrl) {
          setAvatarUrl(profile.user.avatarUrl);
        } else {
          setAvatarUrl(null);
        }
      } else if (authRes.status === 'fulfilled' && authRes.value.data) {
        const email = authRes.value.data.email || '';
        const namePart = email.split('@')[0];
        if (namePart) {
          // Capitalize first letter
          setAthleteName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        }
      }

      // Fetch local steps count for today as a baseline to prevent 0 resets
      let localStepsForToday = 0;
      if (isSelectedDateRealToday) {
        try {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const now = new Date();
          const localRes = await Pedometer.getStepCountAsync(startOfToday, now);
          if (localRes && localRes.steps !== undefined) {
            localStepsForToday = localRes.steps;
          }
        } catch (e) {
          // Fallback to AsyncStorage (Android compatibility)
          localStepsForToday = await getLocalTodaySteps();
        }
      }

      // 2. Map steps & distance
      let currentSteps = 0;
      let currentDistance = '0 m';
      let stepsBurned = 0;

      let userHeight = 170;
      let userWeight = 70;
      let userGender = 'female';
      if (profile) {
        if (profile.height) userHeight = Number(profile.height);
        if (profile.weight) userWeight = Number(profile.weight);
        if (profile.gender) userGender = profile.gender.toLowerCase();
      }
      const isMale = userGender === 'male' || userGender === 'm';
      const strideFactor = isMale ? 0.415 : 0.413;
      const strideLengthKm = (userHeight * strideFactor) / 100000;
      const caloriesPerStep = userWeight * 0.00057;

      if (stepsRes.status === 'fulfilled' && stepsRes.value.data) {
        const data = stepsRes.value.data;
        if (data.totalSteps !== undefined) {
          // Use whichever is higher (backend or local device reading) to prevent resets to 0 ONLY if selected date is real today
          const finalSteps = isSelectedDateRealToday ? Math.max(data.totalSteps, localStepsForToday) : data.totalSteps;
          currentSteps = finalSteps;
          setTodaySteps(finalSteps.toLocaleString());
          if (isSelectedDateRealToday) {
            saveLocalTodaySteps(finalSteps);
          }

          currentDistance = `${Math.round(finalSteps * strideLengthKm * 1000)} m`;
          stepsBurned = Math.round(finalSteps * caloriesPerStep);
        }
      } else {
        // Fallback: Query Pedometer directly if server is offline (e.g. phone is unplugged) ONLY if selected date is real today
        if (isSelectedDateRealToday) {
          currentSteps = localStepsForToday;
          setTodaySteps(localStepsForToday.toLocaleString());
          saveLocalTodaySteps(localStepsForToday);

          currentDistance = `${Math.round(localStepsForToday * strideLengthKm * 1000)} m`;
          stepsBurned = Math.round(localStepsForToday * caloriesPerStep);
        } else {
          currentSteps = 0;
          setTodaySteps('0');
          currentDistance = '0 m';
          stepsBurned = 0;
        }
      }

      // 3. Map calories burnt & consumed
      let consumedKcal = 0;
      if (nutritionRes.status === 'fulfilled' && nutritionRes.value.data) {
        const data = nutritionRes.value.data;
        if (data.summary && data.summary.calories) {
          const consumed = data.summary.calories.consumed || 0;
          setTodayCalories(consumed.toLocaleString());
          consumedKcal = consumed;
        }
      }

      // 4. Map logged workouts history
      let workoutLogs: any[] = [];
      if (workoutsRes.status === 'fulfilled' && workoutsRes.value.data) {
        workoutLogs = workoutsRes.value.data;
        setRecentWorkouts(workoutLogs);
      }

      // Map suggested recipes
      let allRecipes: any[] = [];
      if (recipesRes.status === 'fulfilled' && Array.isArray(recipesRes.value.data)) {
        allRecipes = recipesRes.value.data;
      }
      const mealInfo = getSuggestedMealInfo();
      let filtered = allRecipes.filter(r =>
        r.tags?.some((t: string) => t.toLowerCase() === mealInfo.tag.toLowerCase()) ||
        r.title?.toLowerCase().includes(mealInfo.tag.toLowerCase()) ||
        r.description?.toLowerCase().includes(mealInfo.tag.toLowerCase())
      );
      if (filtered.length === 0) {
        filtered = allRecipes.slice(0, 4);
      }
      setSuggestedRecipes(filtered);


      if (profile && profile.currentProgram) {
        const totalDays = profile.currentProgram.days ? profile.currentProgram.days.length : 0;
        let activeDayIdx = 0;
        if (totalDays > 0) {
          if (workoutLogs.length > 0) {
            const latestSession = workoutLogs[0];
            if (latestSession && latestSession.date === todayStr) {
              activeDayIdx = Math.max(0, workoutLogs.length - 1) % totalDays;
            } else {
              activeDayIdx = workoutLogs.length % totalDays;
            }
          } else {
            activeDayIdx = 0;
          }
        }
        setMyPlan({
          title: profile.currentProgram.name,
          level: profile.currentProgram.level ? profile.currentProgram.level.toUpperCase() : 'INTERMEDIATE',
          daysCount: `${totalDays} Days Split`,
          nextExercise: profile.currentProgram.days && profile.currentProgram.days[activeDayIdx]
            ? profile.currentProgram.days[activeDayIdx].title
            : 'Workout Day'
        });
      }

      // Calculate runs burned today and active runs duration
      let runsBurned = 0;
      let runsDurationMinutes = 0;
      if (runsRes.status === 'fulfilled' && Array.isArray(runsRes.value.data)) {
        const todayRuns = runsRes.value.data.filter((run: any) => run.startTime && run.startTime.startsWith(todayStr));
        runsBurned = todayRuns.reduce((sum: number, run: any) => sum + (run.caloriesBurned || 0), 0);
        runsDurationMinutes = todayRuns.reduce((sum: number, run: any) => sum + Math.round((run.durationSeconds || 0) / 60), 0);
      }

      // Calculate workouts burned today and active workouts duration
      let workoutsBurned = 0;
      let workoutsDurationMinutes = 0;
      if (workoutsRes.status === 'fulfilled' && Array.isArray(workoutsRes.value.data)) {
        const todayWorkouts = workoutsRes.value.data.filter((w: any) => w.completed && w.date === todayStr);
        workoutsBurned = todayWorkouts.reduce((sum: number, w: any) => sum + (w.duration ? Math.round(w.duration * 7.5) : 300), 0);
        workoutsDurationMinutes = todayWorkouts.reduce((sum: number, w: any) => sum + (w.duration || 40), 0);
      }

      const totalBurned = Math.round(stepsBurned + runsBurned + workoutsBurned);
      const target = profile && profile.dailyCalories ? profile.dailyCalories : 2000;

      setTargetCalories(target);
      setEatenCalories(consumedKcal);
      setBurnedCalories(totalBurned);
      setNetCalories(Math.max(0, target - consumedKcal + totalBurned));
      setTodayActiveTime(runsDurationMinutes + workoutsDurationMinutes);

      // Calculate weight change progress
      let weightChangeText = '0.0 kg';
      let weightChangeTitle = 'Weight Progress';

      if (progressRes && progressRes.status === 'fulfilled' && progressRes.value.data && progressRes.value.data.hasData) {
        const { startingWeight, currentWeight, totalWeightChange } = progressRes.value.data;
        const goal = profile?.goal || 'stay_active';
        
        if (goal === 'lose_fat' || goal === 'lose_weight') {
          weightChangeTitle = 'Mass Lost';
          const lost = startingWeight - currentWeight;
          weightChangeText = `${lost.toFixed(1)} kg`;
        } else if (goal === 'gain_muscle' || goal === 'gain_weight') {
          weightChangeTitle = 'Mass Gained';
          const gained = currentWeight - startingWeight;
          weightChangeText = `${gained.toFixed(1)} kg`;
        } else {
          if (totalWeightChange < 0) {
            weightChangeTitle = 'Mass Lost';
            weightChangeText = `${Math.abs(totalWeightChange).toFixed(1)} kg`;
          } else {
            weightChangeTitle = 'Mass Gained';
            weightChangeText = `${totalWeightChange.toFixed(1)} kg`;
          }
        }
      } else {
        const goal = profile?.goal || 'stay_active';
        if (goal === 'lose_fat' || goal === 'lose_weight') {
          weightChangeTitle = 'Mass Lost';
        } else if (goal === 'gain_muscle' || goal === 'gain_weight') {
          weightChangeTitle = 'Mass Gained';
        } else {
          weightChangeTitle = 'Weight Progress';
        }
        weightChangeText = '0.0 kg';
      }
      setWeightProgressTitle(weightChangeTitle);
      setWeightProgressValue(weightChangeText);

      // 5. Calculate Points dynamically: 1 pt per 10 steps + 200 pts per completed workout
      const calculatedPoints = Math.round(currentSteps / 10) + (workoutLogs.length * 200);

      setMetrics({
        distance: currentDistance,
        steps: currentSteps.toLocaleString(),
        points: calculatedPoints > 0 ? calculatedPoints.toLocaleString() : '1248',
      });

      // 6. Fetch weekly logs for Active Calories Burned chart (always ending with real-life today)
      const getHistoryRangeStr = () => {
        const endObj = new Date(); // Today in real life
        const startObj = new Date(endObj.getTime() - 6 * 24 * 60 * 60 * 1000);
        
        return {
          start: startObj.toISOString().split('T')[0],
          end: endObj.toISOString().split('T')[0]
        };
      };

      const { start, end } = getHistoryRangeStr();
      const weeklyRes = await api.get(`/steps/history?startDate=${start}&endDate=${end}`);

      const weekdayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const realTodayObj = new Date();
      const startObj = new Date(realTodayObj.getTime() - 6 * 24 * 60 * 60 * 1000);

      const initialChartData = Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date(startObj.getTime() + idx * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = weekdayNamesShort[d.getDay()];
        return {
          day: dayName,
          dateStr,
          steps: 0,
          calories: 0,
          value: 0,
          color: dateStr === todayStr ? 'primary' : 'muted',
        };
      });

      // Populate step counts from weeklyRes.data if present
      if (weeklyRes.data && Array.isArray(weeklyRes.data)) {
        weeklyRes.data.forEach((log: any) => {
          const logDate = log.date;
          const matchIdx = initialChartData.findIndex(item => item.dateStr === logDate);
          if (matchIdx !== -1) {
            initialChartData[matchIdx].steps = log.steps || 0;
          }
        });
      }

      // Calculate total calories burned (steps + runs + strength workouts) for each of the 7 days
      initialChartData.forEach((item) => {
        const logDate = item.dateStr;
        // 1. Steps calories (0.045 kcal per step)
        const stepsBurnedVal = item.steps * 0.045;

        // 2. Runs calories
        let runsBurnedVal = 0;
        if (runsRes.status === 'fulfilled' && Array.isArray(runsRes.value.data)) {
          runsBurnedVal = runsRes.value.data
            .filter((run: any) => run.startTime && run.startTime.startsWith(logDate))
            .reduce((sum: number, run: any) => sum + (run.caloriesBurned || 0), 0);
        }

        // 3. Workouts calories
        let workoutsBurnedVal = 0;
        if (workoutsRes.status === 'fulfilled' && Array.isArray(workoutsRes.value.data)) {
          workoutsBurnedVal = workoutsRes.value.data
            .filter((w: any) => w.completed && w.date === logDate)
            .reduce((sum: number, w: any) => sum + (w.duration ? Math.round(w.duration * 7.5) : 300), 0);
        }

        const totalBurnedVal = Math.round(stepsBurnedVal + runsBurnedVal + workoutsBurnedVal);
        item.calories = totalBurnedVal;

        if (totalBurnedVal > 0) {
          // Use 500 Kcal as the active calorie burn target representing 100% height
          item.value = Math.min(100, Math.round((totalBurnedVal / 500) * 100));
        }
      });

      // Check if the entire week has 0 burned calories
      const totalWeekCalories = initialChartData.reduce((sum, item) => sum + item.calories, 0);
      if (totalWeekCalories === 0) {
        // Fallback default mockup values mapped to dynamic steps and calories
        const fallbacks = [60, 45, 80, 50, 70, 95, 65];
        initialChartData.forEach((item, idx) => {
          item.steps = Math.round(fallbacks[idx] * 80);
          item.calories = Math.round(item.steps * 0.045);
          item.value = fallbacks[idx];
        });
      }
      setChartData(initialChartData);
      return currentSteps;
    } catch (e) {
      console.warn('Dashboard fetch error, falling back to mockups', e);
      return 0;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pedometer refs
  const pedometerSubscription = useRef<any>(null);
  const lastSyncedStepsRef = useRef<number>(0);
  const isSyncingStepsRef = useRef<boolean>(false);

  // Start watching steps
  const startWatchingSteps = async () => {
    try {
      // On Android, request permission before isAvailableAsync —
      // the sensor returns unavailable until permission is granted.
      const { status } = await Pedometer.getPermissionsAsync();
      let isGranted = status === 'granted';

      if (!isGranted) {
        const result = await Pedometer.requestPermissionsAsync();
        isGranted = result.granted;
      }

      if (!isGranted) return;

      const isAvail = await Pedometer.isAvailableAsync();
      if (!isAvail) return;

      // Unsubscribe existing
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
        pedometerSubscription.current = null;
      }

      // Start watching live steps (resets to 0 since starting the listener)
      let lastReportedSteps = 0;

      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        const deltaSteps = result.steps - lastReportedSteps;
        if (deltaSteps > 0) {
          lastReportedSteps = result.steps;
          // Update local steps state immediately!
          setTodaySteps((prev) => {
            const currentVal = parseInt(prev.replace(/,/g, ''), 10) || 0;
            const newVal = currentVal + deltaSteps;

            // Trigger sync if steps changed significantly (e.g. 35 steps)
            const syncThreshold = 35;
            const diffSinceSync = newVal - lastSyncedStepsRef.current;
            if (diffSinceSync >= syncThreshold && !isSyncingStepsRef.current) {
              isSyncingStepsRef.current = true;
              pedometerService.syncSteps(api, showAlert).then((success) => {
                if (success) {
                  lastSyncedStepsRef.current = newVal;
                }
                isSyncingStepsRef.current = false;
              });
            }

            // Save updated steps to local AsyncStorage so it persists!
            saveLocalTodaySteps(newVal);

            return newVal.toLocaleString();
          });
        }
      });
    } catch (e) {
      console.warn('Error starting live step listener:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const performSyncAndFetch = async () => {
        // Sync native steps to backend first
        await pedometerService.syncSteps(api, showAlert);

        if (active) {
          // Fetch the updated dashboard data
          const stepsNum = await fetchDashboardData();
          lastSyncedStepsRef.current = stepsNum;

          // Start the live listener
          await startWatchingSteps();
        }
      };

      performSyncAndFetch();

      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
          performSyncAndFetch();
        }
      };

      const appStateSub = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        active = false;
        appStateSub.remove();
        if (pedometerSubscription.current) {
          pedometerSubscription.current.remove();
          pedometerSubscription.current = null;
        }
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Toggle activity selection (real database action)
  const handleActivitySelect = async (activityId: string, durationMinutes: number) => {
    try {
      const exercise = CARDIO_EXERCISES.find(ex => ex.id === activityId);
      if (!exercise) return;

      if (exercise.category === 'run') {
        // Log a session via /runs
        // distance: approx 15 km/h for cycling, 8 km/h for other running, 5 km/h walking/hiking/etc.
        let speed = 8.0;
        if (exercise.id === 'cycling') speed = 15.0;
        else if (exercise.id === 'walking') speed = 5.0;
        else if (exercise.id === 'hiking') speed = 4.5;

        // Parse selectedDateStr (YYYY-MM-DD) and combine it with local current time
        const now = new Date();
        const [year, month, day] = selectedDateStr.split('-').map(Number);
        
        // Construct the end time on the selected date using current hour/min/sec
        const endTimeObj = new Date();
        endTimeObj.setFullYear(year, month - 1, day);
        
        // Calculate start time
        const startTimeObj = new Date(endTimeObj.getTime() - durationMinutes * 60 * 1000);

        await api.post('/runs', {
          activityType: exercise.type, // run, walk, cycling, hiking
          title: `Quick Log ${exercise.name}`,
          startTime: startTimeObj.toISOString(),
          endTime: endTimeObj.toISOString(),
          durationSeconds: durationMinutes * 60,
          distanceKm: parseFloat(((durationMinutes * speed) / 60).toFixed(2)),
          routeCoordinates: [],
        });
      } else if (exercise.category === 'steps') {
        // Log manual steps (contributing to calorie burn and step progress)
        // approx 130 steps per min for jump rope
        await api.post('/steps/manual', {
          steps: Math.round(durationMinutes * 130),
          date: selectedDateStr,
        });
      }

      // Refresh dynamic metrics on home screen after logging activity
      await fetchDashboardData();
    } catch (err) {
      console.warn('Error saving activity to backend:', err);
    }
  };

  // Format today's date header dynamically based on selected date
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long' };
    return new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StateFeedback
          type="loading"
          title="Preparing Your Fitness Day..."
          description="Syncing steps, active time, and personalized meals."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.contentPadding}>
          {/* Header Block */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: getPhotoUri(avatarUrl) }}
                    style={styles.avatar}
                  />
                ) : (
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop' }}
                    style={styles.avatar}
                  />
                )}
                <View style={styles.activeDot} />
              </View>
              <View style={styles.userText}>
                <Text style={styles.greeting}>Hello {athleteName}!</Text>
                <Text style={styles.dateText}>{getFormattedDate()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setIsCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <CalendarIcon size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Simplified Calories Section: Food and Burned */}
          <View style={styles.caloriesSection}>
            <View style={styles.simplifiedCalRow}>
              <View style={styles.progressRingCard}>
                <MiniProgressCircle
                  percentage={eatenCalories / Math.max(1, targetCalories)}
                  color="#E65100"
                  backgroundColor="#FFE6DB"
                  size={46}
                  strokeWidth={4.5}
                >
                  <Flame size={18} color="#E65100" />
                </MiniProgressCircle>
                <View style={styles.progressRingCardTextContainer}>
                  <Text style={styles.progressRingValue}>
                    {eatenCalories.toLocaleString()}
                  </Text>
                  <Text style={styles.progressRingTarget}>
                    / {targetCalories} kcal
                  </Text>
                  <Text style={styles.progressRingLabel}>Food Eaten</Text>
                </View>
              </View>

              <View style={styles.progressRingCard}>
                <MiniProgressCircle
                  percentage={burnedCalories / 500}
                  color="#A21CAF"
                  backgroundColor="#F3E8FF"
                  size={46}
                  strokeWidth={4.5}
                >
                  <Zap size={16} color="#A21CAF" />
                </MiniProgressCircle>
                <View style={styles.progressRingCardTextContainer}>
                  <Text style={styles.progressRingValue}>
                    {burnedCalories.toLocaleString()}
                  </Text>
                  <Text style={styles.progressRingTarget}>
                    / 500 kcal
                  </Text>
                  <Text style={styles.progressRingLabel}>Burned</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Triple Stats Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.distance}</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.steps}</Text>
              <Text style={styles.metricLabel}>Steps</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.points}</Text>
              <Text style={styles.metricLabel}>Points</Text>
            </View>
          </View>

          {/* Steps Bar Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartWrapper}>
              {chartData.map((bar, idx) => {
                let barColor = COLORS.text;
                if (bar.color === 'light') barColor = COLORS.primaryLight;
                else if (bar.color === 'primary') barColor = COLORS.primary;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.barContainer}
                    onPress={() => setActiveBarIndex(activeBarIndex === idx ? null : idx)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: bar.value, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.barDay}>{bar.day}</Text>

                    {/* Tooltip positioned on top of the bars */}
                    {activeBarIndex === idx && (
                      <View style={styles.tooltip}>
                        <View style={styles.tooltipPill}>
                          <Flame size={12} color={COLORS.textInverse} style={{ marginRight: 4 }} />
                          <Text style={styles.tooltipText}>{(bar.calories || 0).toLocaleString()} Kcal</Text>
                        </View>
                        <Text style={styles.tooltipSub}>{(bar.steps || 0).toLocaleString()} steps</Text>
                        <View style={styles.tooltipArrow} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.contentPadding}>
          <Text style={styles.sectionHeader}>Quick Activity Log</Text>
          <Text style={styles.sectionSub}>Tap an activity below to quickly log your daily workout details</Text>
        </View>

        {/* Workout Activity Scroll Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activitiesScroll}
        >
          {CARDIO_EXERCISES.map((exercise) => {
            const IconComponent = exercise.icon;
            const isActive = selectedActivity === exercise.id;
            const isFuture = isFutureDate(selectedDateStr);
            return (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.activityCard,
                  isActive && styles.activityCardActive,
                  isFuture && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (isFuture) {
                    showAlert({
                      title: 'Future Date Selection',
                      message: 'You cannot log activities for future dates.',
                      why: 'The selected date is ahead of your device time, and fitness logs cannot be pre-recorded.',
                      actionGuide: 'Please select a past date or today from the calendar header to record your workouts.',
                      type: 'warning',
                    });
                    return;
                  }
                  setSelectedActivity(exercise.id);
                  setSelectedActivityType(exercise.id);
                  setIsDurationModalVisible(true);
                }}
                activeOpacity={isFuture ? 1 : 0.8}
              >
                <IconComponent
                  size={24}
                  color={isActive ? COLORS.textInverse : COLORS.primary}
                  style={styles.cardIcon}
                />
                <View>
                  <Text style={[styles.cardKcal, isActive && styles.cardKcalActive]}>
                    {exercise.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.contentPadding}>
          {/* Section: My Plan */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>My Plan</Text>
            <TouchableOpacity>
              <MoreVertical size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>
            {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>

          <TouchableOpacity
            style={styles.planCard}
            activeOpacity={0.95}
            onPress={() => navigation.navigate('Workouts')}
          >
            <View style={styles.planHeader}>
              <View style={styles.planIconWrapper}>
                <Zap size={20} color={COLORS.textInverse} />
              </View>
              <View style={styles.planTitleContainer}>
                <Text style={styles.planSub}>{myPlan.level}</Text>
                <Text style={styles.planTitle}>{myPlan.title}</Text>
                <Text style={styles.planSubCount}>{myPlan.daysCount}</Text>
              </View>
            </View>

            <View style={styles.nextExercisePill}>
              <Play size={16} color={COLORS.text} fill={COLORS.text} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.nextExerciseLabel}>Next exercise</Text>
                <Text style={styles.nextExerciseName}>{myPlan.nextExercise}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Section: Suggested Recipes */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.sectionHeader}>
              {getSuggestedMealInfo().label}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Nutrition')}>
              <Text style={styles.seeAllLink}>See Hub</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>
            {getSuggestedMealInfo().desc}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentPlanScroll}
        >
          {suggestedRecipes.length > 0 ? (
            suggestedRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={recipe.id || index}
                style={styles.recipeCard}
                onPress={() => {
                  setSelectedRecipeDetail(recipe);
                  setIsRecipeDetailModalVisible(true);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.recipeCardHeader}>
                  <View style={styles.recipeCardBadge}>
                    <Text style={styles.recipeCardBadgeText}>
                      {recipe.tags && recipe.tags.length > 0 ? recipe.tags[0] : 'Healthy'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recipeCardTitle} numberOfLines={1}>
                  {recipe.title}
                </Text>
                <Text style={styles.recipeCardDesc} numberOfLines={2}>
                  {recipe.description || 'No description provided.'}
                </Text>
                <View style={styles.recipeCardFooter}>
                  <View style={styles.recipeCardMeta}>
                    <Flame size={14} color={COLORS.primary} />
                    <Text style={styles.recipeCardMetaText}>
                      {Math.round(recipe.calories)} kcal
                    </Text>
                  </View>
                  <View style={styles.recipeCardMeta}>
                    <Clock size={14} color={COLORS.textMuted} />
                    <Text style={styles.recipeCardMetaText}>
                      {recipe.prepTime + recipe.cookTime}m
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic' }}>
                No recipes suggested for this time.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.contentPadding}>
          {/* Section: Today's Information */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.sectionHeader}>Today's Information</Text>
            <TouchableOpacity>
              <MoreVertical size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>
            {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>

          <View style={styles.todayInfoContainer}>
            {/* Calories Eaten Card */}
            <View style={[styles.infoMiniCard, { width: '48%' }]}>
              <View style={styles.miniHeader}>
                <Text style={styles.miniTitle}>Food Eaten</Text>
                <Utensils size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.miniValue}>{todayCalories}</Text>
              <Text style={styles.miniLabel}>Kcal eaten</Text>
            </View>

            {/* Steps Card */}
            <View style={[styles.infoMiniCard, { width: '48%' }]}>
              <View style={styles.miniHeader}>
                <Text style={styles.miniTitle}>Steps</Text>
                <Footprints size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.miniValue}>{todaySteps}</Text>
              <Text style={styles.miniLabel}>Steps</Text>
            </View>

            {/* Active Time Card */}
            <View style={[styles.infoMiniCard, { width: '48%' }]}>
              <View style={styles.miniHeader}>
                <Text style={styles.miniTitle}>Active Time</Text>
                <Clock size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.miniValue}>{todayActiveTime}</Text>
              <Text style={styles.miniLabel}>Minutes</Text>
            </View>

            {/* Mass Progress Card */}
            <View style={[styles.infoMiniCard, { width: '48%' }]}>
              <View style={styles.miniHeader}>
                <Text style={styles.miniTitle}>{weightProgressTitle}</Text>
                <TrendingUp size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.miniValue}>{weightProgressValue}</Text>
              <Text style={styles.miniLabel}>Total change</Text>
            </View>
          </View>

          {/* Bottom Referral Card */}
          <View style={styles.referralCard}>
            <View style={styles.referralIconWrapper}>
              <Award size={24} color={COLORS.primary} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralSub}>Invite your friends</Text>
              <Text style={styles.referralTitle}>Invite your friends to get a free exercise right away</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Calendar Overlay Dropdown Modal */}
      <Modal
        visible={isCalendarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCalendarVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.wavyBackdropBg}>
                <View style={styles.contourLine1} />
                <View style={styles.contourLine2} />
                <View style={styles.contourLine3} />
              </View>

              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(calDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalDate(newDate);
                  }}
                  style={styles.modalBackButton}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.modalTitleBlock}>
                  <Text style={styles.modalDayName}>
                    {calDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={styles.modalFullDate}>
                    {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(calDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalDate(newDate);
                  }}
                  style={styles.modalBackButton}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Weekdays Row at the top of the grid */}
              <View style={styles.dayLabelsRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                  <Text key={idx} style={styles.dayLabelText}>
                    {dayName}
                  </Text>
                ))}
              </View>

              {/* 7-Column Days Grid */}
              <View style={styles.daysGrid}>
                {/* Offset spacer cells */}
                {Array.from({
                  length: (() => {
                    const firstDayIndex = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
                    return firstDayIndex === 0 ? 6 : firstDayIndex - 1;
                  })()
                }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.gridDayCellEmpty} />
                ))}

                {/* Day cells */}
                {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map((day) => {
                  const isSelected = day === selectedDay &&
                    calDate.getMonth() === new Date(selectedDateStr).getMonth() &&
                    calDate.getFullYear() === new Date(selectedDateStr).getFullYear();

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.gridDayCell,
                        isSelected && styles.gridDayCellSelected,
                      ]}
                      onPress={() => {
                        setSelectedDay(day);
                        setIsCalendarVisible(false);
                        const year = calDate.getFullYear();
                        const month = String(calDate.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const targetDateStr = `${year}-${month}-${dayStr}`;
                        fetchDashboardData(targetDateStr);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gridDayText, isSelected && styles.gridDayTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.bottomSheetIndicator} />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal
        visible={isDurationModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDurationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.durationModalOverlay}
          activeOpacity={1}
          onPress={() => setIsDurationModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.durationModalContainer}>
              <Text style={styles.durationModalTitle}>Select Activity Duration</Text>
              <Text style={styles.durationModalSubtitle}>
                Choose how long you did this exercise:
              </Text>

              <View style={styles.durationOptionsGrid}>
                {[15, 30, 45, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={styles.durationOptionCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      setIsDurationModalVisible(false);
                      if (selectedActivityType) {
                        handleActivitySelect(selectedActivityType, mins);
                      }
                    }}
                  >
                    <Text style={styles.durationOptionValue}>{mins}</Text>
                    <Text style={styles.durationOptionLabel}>Minutes</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.durationCancelButton}
                activeOpacity={0.8}
                onPress={() => setIsDurationModalVisible(false)}
              >
                <Text style={styles.durationCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Workout Detail Modal */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.detailModalOverlay}
          activeOpacity={1}
          onPress={() => setIsDetailModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.detailModalContainer}>
              <View style={styles.detailModalHeader}>
                <Text style={styles.detailModalTitle}>Workout Summary</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => selectedWorkoutSession?.id && handleDeleteSession(selectedWorkoutSession.id)}>
                    <Trash2 size={20} color={COLORS.error || '#FF4A4A'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                    <X size={22} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {selectedWorkoutSession ? (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                  <Text style={styles.detailProgramName}>
                    {selectedWorkoutSession.programDay?.name || 'Strength Workout'}
                  </Text>

                  <View style={styles.detailMetaRow}>
                    <View style={styles.detailMetaItem}>
                      <Clock size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.detailMetaText}>{selectedWorkoutSession.duration} mins</Text>
                    </View>

                    {selectedWorkoutSession.rpe && (
                      <View style={styles.detailMetaItem}>
                        <Award size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.detailMetaText}>RPE: {selectedWorkoutSession.rpe}/10</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.detailDate}>
                    Completed on {new Date(selectedWorkoutSession.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>

                  <View style={styles.detailDivider} />

                  <Text style={styles.detailSectionTitle}>Exercises Logged</Text>

                  {(() => {
                    const sessionLogs = selectedWorkoutSession.exerciseLogs || selectedWorkoutSession.logs || [];
                    return sessionLogs.length > 0 ? (
                      sessionLogs.map((log: any, idx: number) => (
                        <View key={log.id || idx} style={styles.detailLogCard}>
                          <Text style={styles.detailExerciseName}>{log.exercise?.name}</Text>
                          <View style={styles.detailSetsGrid}>
                            {log.sets && log.sets.map((set: any, sIdx: number) => (
                              <View key={sIdx} style={styles.detailSetRow}>
                                <Text style={styles.detailSetNum}>Set {sIdx + 1}</Text>
                                <Text style={styles.detailSetVal}>{set.reps} reps</Text>
                                <Text style={styles.detailSetVal}>×</Text>
                                <Text style={styles.detailSetVal}>{set.weight} kg</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noExercisesText}>No exercises recorded in this session.</Text>
                    );
                  })()}
                </ScrollView>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal
        visible={isRecipeDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRecipeDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.recipeDetailModalOverlay}
          activeOpacity={1}
          onPress={() => setIsRecipeDetailModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.recipeDetailModalContainer}>
              {selectedRecipeDetail && (
                <>
                  {/* Header */}
                  <View style={styles.recipeDetailModalHeader}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.recipeDetailModalTitle} numberOfLines={1}>
                        {selectedRecipeDetail.title}
                      </Text>
                      <Text style={styles.recipeDetailModalSubtitle} numberOfLines={1}>
                        {selectedRecipeDetail.description || 'Healthy Recipe'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsRecipeDetailModalVisible(false)}
                      style={styles.recipeDetailModalClose}
                    >
                      <X size={20} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Detailed macros strip */}
                    <View style={styles.recipeDetailMacrosBar}>
                      <View style={styles.recipeDetailMacroPill}>
                        <Text style={styles.recipeDetailMacroLabel}>Calories</Text>
                        <Text style={[styles.recipeDetailMacroValue, { color: COLORS.primary }]}>
                          {Math.round(selectedRecipeDetail.calories)} kcal
                        </Text>
                      </View>
                      <View style={styles.recipeDetailMacroPill}>
                        <Text style={styles.recipeDetailMacroLabel}>Protein</Text>
                        <Text style={styles.recipeDetailMacroValue}>
                          {selectedRecipeDetail.protein}g
                        </Text>
                      </View>
                      <View style={styles.recipeDetailMacroPill}>
                        <Text style={styles.recipeDetailMacroLabel}>Carbs</Text>
                        <Text style={styles.recipeDetailMacroValue}>
                          {selectedRecipeDetail.carbs}g
                        </Text>
                      </View>
                      <View style={styles.recipeDetailMacroPill}>
                        <Text style={styles.recipeDetailMacroLabel}>Fat</Text>
                        <Text style={styles.recipeDetailMacroValue}>
                          {selectedRecipeDetail.fat}g
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recipeDetailMetaRow}>
                      <View style={styles.recipeDetailMetaTag}>
                        <Clock size={14} color={COLORS.textMuted} />
                        <Text style={styles.recipeDetailMetaTagText}>
                          Prep: {selectedRecipeDetail.prepTime} mins
                        </Text>
                      </View>
                      <View style={styles.recipeDetailMetaTag}>
                        <Utensils size={14} color={COLORS.textMuted} />
                        <Text style={styles.recipeDetailMetaTagText}>
                          Cook: {selectedRecipeDetail.cookTime} mins
                        </Text>
                      </View>
                    </View>

                    {/* Ingredients section */}
                    <View style={{ marginTop: 18 }}>
                      <Text style={styles.detailSectionTitle}>Ingredients</Text>
                      {(!selectedRecipeDetail.ingredients || selectedRecipeDetail.ingredients.length === 0) ? (
                        <Text style={styles.recipeDetailEmptyText}>No ingredients specified.</Text>
                      ) : (
                        selectedRecipeDetail.ingredients.map((ing: any, idx: number) => (
                          <View key={ing.id || idx} style={styles.recipeDetailIngredientRow}>
                            <Text style={styles.recipeDetailIngredientName}>
                              {ing.customName || (ing.food ? ing.food.name : 'Unknown')}
                            </Text>
                            <Text style={styles.recipeDetailIngredientAmount}>
                              {ing.amount} {ing.unit}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Cooking Steps walkthrough section */}
                    <View style={{ marginTop: 18 }}>
                      <Text style={styles.detailSectionTitle}>Cooking Steps</Text>
                      {(!selectedRecipeDetail.instructions || selectedRecipeDetail.instructions.length === 0) ? (
                        <Text style={styles.recipeDetailEmptyText}>No preparation steps specified.</Text>
                      ) : (
                        selectedRecipeDetail.instructions.map((step: string, index: number) => (
                          <View key={index} style={styles.recipeDetailStepCard}>
                            <View style={styles.recipeDetailStepNumberBg}>
                              <Text style={styles.recipeDetailStepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.recipeDetailStepDescText}>{step}</Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Spacer */}
                    <View style={{ height: 30 }} />
                  </ScrollView>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  userText: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '800',
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  caloriesSection: {
    marginBottom: 10,
    marginTop: 8,
  },
  simplifiedCalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  progressRingCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  progressRingCardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressRingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  progressRingTarget: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: -2,
  },
  progressRingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  chartSection: {
    height: 180,
    justifyContent: 'flex-end',
    marginBottom: 28,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  barContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  barTrack: {
    width: 16,
    height: 120,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barDay: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  tooltip: {
    position: 'absolute',
    bottom: 130,
    backgroundColor: COLORS.text,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  tooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tooltipText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipSub: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.text,
    position: 'absolute',
    bottom: -6,
  },
  activitiesScrollContainer: {
    marginHorizontal: -20,
  },
  activitiesScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  activityCard: {
    width: 105,
    height: 100,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  activityCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cardIcon: {
    marginBottom: 4,
  },
  cardKcal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardKcalActive: {
    color: COLORS.textInverse,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  cardTitleActive: {
    color: COLORS.textInverse,
    opacity: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  seeAllLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 28,
    padding: 20,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: 1,
  },
  planSub: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planSubCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  nextExercisePill: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextExerciseLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  nextExerciseName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  recentPlanScrollContainer: {
    marginHorizontal: -20,
  },
  recentPlanScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  recentItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  recentBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  todayInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  todayGridColLeft: {
    width: '48%',
  },
  todayGridColRight: {
    width: '48%',
  },
  infoMiniCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    height: 115,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniTitle: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '800',
  },
  miniValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  miniLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  heartCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    height: 246,
    justifyContent: 'space-between',
  },
  heartGraphContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartValueContainer: {
    marginTop: 8,
  },
  referralCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    marginBottom: 40,
  },
  referralIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  referralContent: {
    flex: 1,
  },
  referralSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  referralTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
  },
  durationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.primaryLight,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  wavyBackdropBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    overflow: 'hidden',
  },
  contourLine1: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  contourLine2: {
    position: 'absolute',
    top: -30,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  contourLine3: {
    position: 'absolute',
    top: -10,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  modalDayName: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalFullDate: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  gridDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 20,
  },
  gridDayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  gridDayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  gridDayText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  gridDayTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '800',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayLabelText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  bottomSheetIndicator: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 20,
  },
  durationModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  durationModalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  durationOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  durationOptionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  durationOptionValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  durationOptionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  durationCancelButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  durationCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  detailScroll: {
    flexGrow: 0,
  },
  detailProgramName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailMetaText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailLogCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailExerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  detailSetsGrid: {
    gap: 8,
  },
  detailSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailSetNum: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    width: 60,
  },
  detailSetVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 6,
  },
  noExercisesText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  // Recipe Suggestion Styles
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    marginRight: 8,
  },
  recipeCardBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recipeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  recipeCardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 15,
  },
  recipeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 8,
  },
  recipeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeCardMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  // Recipe detail modal
  recipeDetailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  recipeDetailModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    height: '85%',
  },
  recipeDetailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recipeDetailModalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },
  recipeDetailModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  recipeDetailModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeDetailMacrosBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginVertical: 12,
  },
  recipeDetailMacroPill: {
    flex: 1,
    alignItems: 'center',
  },
  recipeDetailMacroLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  recipeDetailMacroValue: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  recipeDetailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 16,
  },
  recipeDetailMetaTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeDetailMetaTagText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
    fontWeight: '600',
  },
  recipeDetailIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  recipeDetailIngredientName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  recipeDetailIngredientAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  recipeDetailStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  recipeDetailStepNumberBg: {
    backgroundColor: COLORS.primaryLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recipeDetailStepNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  recipeDetailStepDescText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    fontWeight: '600',
  },
  recipeDetailEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
