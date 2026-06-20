import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  TouchableWithoutFeedback,
  Image,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeContext';
import {
  Play,
  Check,
  Trash2,
  Search,
  X,
  PlusCircle,
  MinusCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Edit2,
  Plus,
  BookOpen,
  ImageOff,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import {
  DumbbellIcon,
  RunIcon,
  TrophyIcon,
  ChartLineIcon,
  TimerIcon,
  LightningIcon,
  CreationIcon,
} from '../components/icons/fitness';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { api, API_BASE_URL } from '../services/api';
import { programService } from '../services/programService';
import { StateFeedback } from '../components/StateFeedback';
import { useAlert } from '../components/CustomAlert';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  displayName?: string;
  muscleGroup: string | { id: string; name: string };
  source?: string;
  gifUrl?: string | null;
}

const FALLBACK_EXERCISES: Exercise[] = [
  { id: 'e1', name: 'Barbell Bench Press', muscleGroup: 'Chest' },
  { id: 'e2', name: 'Dumbbell Incline Press', muscleGroup: 'Chest' },
  { id: 'e3', name: 'Barbell Squat', muscleGroup: 'Quadriceps' },
  { id: 'e4', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
  { id: 'e5', name: 'Pull-up', muscleGroup: 'Lats' },
  { id: 'e6', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders' },
  { id: 'e7', name: 'Bicep Dumbbell Curl', muscleGroup: 'Biceps' },
  { id: 'e8', name: 'Cable Tricep Pushdown', muscleGroup: 'Triceps' },
];

interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExercise {
  exerciseId: string;
  name: string;
  source?: string;
  gifUrl?: string | null;
  sets: SetLog[];
}

interface WorkoutHistoryItem {
  id: string;
  date: string;
  duration: number;
  completed: boolean;
  rpe?: number;
  programDay?: {
    name: string;
  };
  logs: {
    id: string;
    exercise: {
      name: string;
    };
    sets: {
      weight: number;
      reps: number;
    }[];
  }[];
  exerciseLogs?: {
    id: string;
    exercise: {
      name: string;
    };
    sets: {
      weight: number;
      reps: number;
    }[];
  }[];
}

export const WorkoutsScreen: React.FC = () => {
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  const { showAlert } = useAlert();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [volumeStats, setVolumeStats] = useState<number[]>([1800, 2200, 2100, 2700, 3100, 3500]); // Fallback trend data
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');

  // Active workout states
  const [activeSession, setActiveSession] = useState<{ id: string } | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [workoutDuration, setWorkoutDuration] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isExerciseModalVisible, setIsExerciseModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({});
  const [rpe, setRpe] = useState('5');
  const [sliderWidth, setSliderWidth] = useState(250);
  const sliderWidthRef = useRef(250);
  const sliderPageX = useRef(0);
  const sliderRef = useRef<any>(null);

  const rpeSliderPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(sliderWidthRef.current, evt.nativeEvent.pageX - sliderPageX.current));
        setRpe(String(Math.round((x / sliderWidthRef.current) * 9) + 1));
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(sliderWidthRef.current, evt.nativeEvent.pageX - sliderPageX.current));
        setRpe(String(Math.round((x / sliderWidthRef.current) * 9) + 1));
      },
    })
  ).current;

  const getRpeColor = (num: number) => {
    if (num <= 3) return '#34C759'; // Easy: green
    if (num <= 6) return '#FF9500'; // Moderate: orange
    return '#FF3B30'; // Hard: red
  };

  const getRpeStatusText = (num: number) => {
    if (num <= 3) return 'Easy';
    if (num <= 6) return 'Moderate';
    return 'Hard';
  };

  const getRpeAdaptationText = (num: number) => {
    if (num <= 3) return 'Adapts program to be harder';
    if (num <= 6) return 'Keeps targets the same';
    return 'Adapts program to be easier';
  };

  const togglePreview = (exerciseId: string) => {
    setExpandedPreviews((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const toggleCollapse = (exerciseId: string) => {
    setCollapsedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  // Completed Workout Detail Modal State
  const [selectedWorkoutSession, setSelectedWorkoutSession] = useState<WorkoutHistoryItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const handleDeleteSession = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/workouts/${id}`);
      setIsDetailModalVisible(false);
      setSelectedWorkoutSession(null);
      await fetchWorkoutData();
    } catch (err) {
      console.warn('Failed to delete workout session:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRunDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRunDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (diffDays === 1) {
        return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  const renderRouteHero = (coords: { latitude: number; longitude: number }[], width: number) => {
    if (!coords || coords.length < 2) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    coords.forEach(pt => {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    });

    const latSpan = maxLat - minLat || 0.0001;
    const lngSpan = maxLng - minLng || 0.0001;
    const svgW = width;
    const svgH = 130;
    const pad = 20;

    // Preserve aspect ratio — fit within padded canvas
    const scaleX = (svgW - pad * 2) / lngSpan;
    const scaleY = (svgH - pad * 2) / latSpan;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (svgW - lngSpan * scale) / 2;
    const offsetY = (svgH - latSpan * scale) / 2;

    const pts = coords.map(pt => ({
      x: offsetX + (pt.longitude - minLng) * scale,
      y: svgH - (offsetY + (pt.latitude - minLat) * scale),
    }));

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const start = pts[0];
    const end = pts[pts.length - 1];

    return (
      <Svg width={svgW} height={svgH}>
        <Defs>
          <LinearGradient id="routeBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0F1115" stopOpacity="1" />
            <Stop offset="1" stopColor="#161A22" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Background */}
        <Path d={`M0,0 L${svgW},0 L${svgW},${svgH} L0,${svgH} Z`} fill="url(#routeBg)" />
        {/* Glow trail */}
        <Path d={pathD} fill="none" stroke={COLORS.primary} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
        {/* Main trail */}
        <Path d={pathD} fill="none" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Start dot */}
        <Circle cx={start.x} cy={start.y} r={5} fill="#22C55E" />
        <Circle cx={start.x} cy={start.y} r={9} fill="#22C55E" opacity={0.25} />
        {/* End dot */}
        <Circle cx={end.x} cy={end.y} r={5} fill={COLORS.primary} />
        <Circle cx={end.x} cy={end.y} r={9} fill={COLORS.primary} opacity={0.25} />
      </Svg>
    );
  };

  const handleDeleteRun = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/runs/${id}`);
      await fetchWorkoutData();
    } catch (err) {
      showAlert({
        title: 'Deletion Failed',
        message: 'Unable to delete run session.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRunsHistory = () => {
    if (runsHistory.length === 0) {
      return (
        <StateFeedback
          type="empty"
          title="No Runs Logged Yet"
          description="Get outside and track your first run, walk, or cycling route!"
          icon={<TrophyIcon size={36} color={COLORS.primary} />}
        />
      );
    }

    return (
      <View style={{ paddingBottom: 24 }}>
        {runsHistory.map((run) => {
          const distanceKm = Number(run.distanceKm) || 0;
          const durationSeconds = Number(run.durationSeconds) || 0;
          
          let paceStr = '--:--';
          if (distanceKm > 0 && durationSeconds > 0) {
            const totalMins = durationSeconds / 60;
            const paceMins = Math.floor(totalMins / distanceKm);
            const paceSecs = Math.round(((totalMins / distanceKm) - paceMins) * 60);
            paceStr = `${paceMins}:${paceSecs.toString().padStart(2, '0')}`;
          }

          const calories = Math.round(distanceKm * 70);

          const hasRoute = run.routeCoordinates && run.routeCoordinates.length >= 2;

          return (
            <View key={run.id} style={styles.runHistoryCard}>
              {/* Route hero */}
              <View style={styles.runRouteHero}>
                {hasRoute ? (
                  renderRouteHero(run.routeCoordinates, 340)
                ) : (
                  <View style={styles.runRouteHeroPlaceholder}>
                    <TrophyIcon size={28} color={COLORS.primary} />
                    <Text style={styles.runRouteHeroPlaceholderText}>No GPS data</Text>
                  </View>
                )}
                {/* Distance badge overlay */}
                <View style={styles.runDistanceBadge}>
                  <Text style={styles.runDistanceBadgeText}>{distanceKm.toFixed(2)} km</Text>
                </View>
              </View>

              {/* Title + date */}
              <View style={styles.runCardInfo}>
                <Text style={styles.runCardTitle} numberOfLines={1}>{run.title || 'Outdoor Run'}</Text>
                <Text style={styles.runCardDate}>{formatRunDate(run.startTime)}</Text>
              </View>

              {/* Stats row */}
              <View style={styles.runStatsRow}>
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{formatRunDuration(durationSeconds)}</Text>
                  <Text style={styles.runStatLabel}>Duration</Text>
                </View>
                <View style={styles.runStatDivider} />
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{paceStr}</Text>
                  <Text style={styles.runStatLabel}>Pace /km</Text>
                </View>
                <View style={styles.runStatDivider} />
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{calories}</Text>
                  <Text style={styles.runStatLabel}>kcal</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.runCardFooter}>
                <TouchableOpacity
                  style={styles.runDeleteBtn}
                  onPress={() => handleDeleteRun(run.id)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color={COLORS.error} />
                  <Text style={styles.runDeleteText}>Delete run</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Tabs and Program Walkthrough & Manual Editing States
  const [activeTab, setActiveTab] = useState<'gym' | 'runs' | 'plan'>('gym');
  const [runsHistory, setRunsHistory] = useState<any[]>([]);
  const [currentProgram, setCurrentProgram] = useState<any | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [isProgramSelectorVisible, setIsProgramSelectorVisible] = useState(false);
  const [fetchingPrograms, setFetchingPrograms] = useState(false);
  const [programSelectorTab, setProgramSelectorTab] = useState<'gym' | 'home'>('gym');

  // Create custom program states
  const [isCustomProgramModalVisible, setIsCustomProgramModalVisible] = useState(false);
  const [customProgramName, setCustomProgramName] = useState('');
  const [customProgramDesc, setCustomProgramDesc] = useState('');
  const [customProgramLevel, setCustomProgramLevel] = useState('beginner');
  const [customProgramDays, setCustomProgramDays] = useState<{ id: string; title: string }[]>([
    { id: '1', title: 'Day 1: Push' }
  ]);

  // Edit program exercise
  const [isEditPlanExModalVisible, setIsEditPlanExModalVisible] = useState(false);
  const [editingPlanEx, setEditingPlanEx] = useState<any | null>(null);
  const [editTargetSets, setEditTargetSets] = useState('3');
  const [editTargetRepsRange, setEditTargetRepsRange] = useState('8-12');

  // Add exercise to program day
  const [isAddPlanExModalVisible, setIsAddPlanExModalVisible] = useState(false);
  const [selectedDayIdForAdd, setSelectedDayIdForAdd] = useState<string | null>(null);
  const [addPlanExQuery, setAddPlanExQuery] = useState('');
  const [addPlanExResults, setAddPlanExResults] = useState<any[]>([]);
  const [addPlanExSets, setAddPlanExSets] = useState('3');
  const [addPlanExRepsRange, setAddPlanExRepsRange] = useState('8-12');
  const [isSearchingAddPlanEx, setIsSearchingAddPlanEx] = useState(false);

  // Workout Plan Generator States
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<any | null>(null);
  const [isGenModalVisible, setIsGenModalVisible] = useState(false);
  const [genGoal, setGenGoal] = useState('hypertrophy');
  const [genLevel, setGenLevel] = useState('beginner');
  const [genDays, setGenDays] = useState(3);
  const [genEquipment, setGenEquipment] = useState<string[]>(['dumbbell', 'barbell', 'machine']);
  const [genInjuriesText, setGenInjuriesText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Exercise Catalog States
  const [isCatalogModalVisible, setIsCatalogModalVisible] = useState(false);
  const [catalogExercises, setCatalogExercises] = useState<any[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogMuscle, setCatalogMuscle] = useState('');
  const [catalogEquipment, setCatalogEquipment] = useState('');
  const [catalogDifficulty, setCatalogDifficulty] = useState('');
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchWorkoutData = async () => {
    try {
      const [historyRes, volumeRes, activeRes, runsRes] = await Promise.allSettled([
        api.get('/workouts/history'),
        api.get('/workouts/stats/volume'),
        api.get('/workouts/active'),
        api.get('/runs'),
      ]);

      let workoutHistory: WorkoutHistoryItem[] = [];
      if (historyRes.status === 'fulfilled' && historyRes.value.data) {
        workoutHistory = historyRes.value.data;
        setHistory(workoutHistory);
      }

      if (volumeRes.status === 'fulfilled' && volumeRes.value.data) {
        // Map volume trends
        const trends = volumeRes.value.data.map((v: any) => parseFloat(v.totalVolume) || 0);
        if (trends.length > 2) {
          setVolumeStats(trends.slice(-6)); // Show last 6 sessions
        }
      }

      if (runsRes.status === 'fulfilled' && runsRes.value.data) {
        setRunsHistory(runsRes.value.data);
      }

      if (activeRes.status === 'fulfilled' && activeRes.value.data) {
        // Active session exists on backend
        const session = activeRes.value.data;
        setActiveSession(session);
        setIsWorkoutActive(true);
        
        const logs = session.exerciseLogs || session.logs || [];
        if (logs.length > 0) {
          setActiveExercises(
            logs.map((log: any) => ({
              exerciseId: log.exerciseId,
              name: log.exercise?.displayName || log.exercise?.name || 'Exercise',
              source: log.exercise?.source,
              gifUrl: log.exercise?.gifUrl,
              sets: (log.sets || []).map((s: any, idx: number) => ({
                setNumber: idx + 1,
                reps: s.reps,
                weight: s.weight,
                completed: true,
              })),
            }))
          );
        } else if (session.programDayId) {
          try {
            // Find active program day matching session to prefill
            const profileRes = await api.get('/profiles/mine');
            const profile = profileRes.data;
            if (profile && profile.currentProgramId) {
              const programRes = await api.get(`/programs/${profile.currentProgramId}`);
              const program = programRes.data;
              const activeDay = program?.days?.find((d: any) => d.id === session.programDayId);
              if (activeDay && activeDay.exercises) {
                const exercisesToPrefill = activeDay.exercises.map((pde: any) => {
                  const targetSetsCount = pde.targetSets || 3;
                  let defaultReps = 10;
                  if (pde.targetRepsRange) {
                    const parts = pde.targetRepsRange.split('-');
                    if (parts.length > 1) {
                      defaultReps = Math.round((parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2);
                    } else {
                      defaultReps = parseInt(pde.targetRepsRange, 10) || 10;
                    }
                  }
                  const sets = Array.from({ length: targetSetsCount }, (_, i) => ({
                    setNumber: i + 1,
                    reps: defaultReps,
                    weight: 40,
                    completed: false,
                  }));
                  return {
                    exerciseId: pde.exerciseId,
                    name: pde.exercise?.displayName || pde.exercise?.name || 'Exercise',
                    source: pde.exercise?.source,
                    gifUrl: pde.exercise?.gifUrl,
                    sets,
                  };
                });
                setActiveExercises(exercisesToPrefill);
              }
            }
          } catch (pe) {
            console.warn('Error prefilling on load:', pe);
          }
        }
      }
      try {
        const plansRes = await api.get('/workouts/plans');
        if (plansRes.data && plansRes.data.length > 0) {
          const sortedPlans = [...plansRes.data].sort((a: any, b: any) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setActiveWorkoutPlan(sortedPlans[0]);
        } else {
          setActiveWorkoutPlan(null);
        }
      } catch (err) {
        console.warn('Failed to load workout plans in WorkoutsScreen:', err);
      }
      try {
        const profileRes = await api.get('/profiles/mine');
        if (profileRes.data && profileRes.data.currentProgram) {
          setCurrentProgram(profileRes.data.currentProgram);
        }
      } catch (err) {
        console.warn('Failed to load profile currentProgram in WorkoutsScreen:', err);
      }
    } catch (e) {
      console.warn('Failed to load active/history logs, using mocks', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWorkoutData();
    }, [])
  );

  useEffect(() => {
    return () => stopTimer();
  }, []);


  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkoutData();
  };

  // Program progression generation and manual plan editing handlers
  const handleRegenerateProgram = async () => {
    await programService.regenerateProgram(setIsRegenerating, fetchWorkoutData, showAlert);
  };

  const handleOpenProgramSelector = async () => {
    setIsProgramSelectorVisible(true);
    setFetchingPrograms(true);
    // Default tab to current program's location
    if (currentProgram?.location === 'home' || currentProgram?.location === 'gym') {
      setProgramSelectorTab(currentProgram.location);
    }
    try {
      const res = await api.get('/programs');
      setAllPrograms(res.data || []);
    } catch (e) {
      console.warn('Failed to load programs list', e);
    } finally {
      setFetchingPrograms(false);
    }
  };

  const handleSelectProgram = async (programId: string) => {
    try {
      setLoading(true);
      await api.post(`/profiles/assign-program/${programId}`);
      setIsProgramSelectorVisible(false);
      await fetchWorkoutData();
      showAlert({
        title: 'Program Updated',
        message: 'Your active workout program has been changed.',
        why: 'The new training program is now bound to your profile and will update your scheduled splits.',
        actionGuide: 'Check your updated Training Plan tab to see the new exercises and splits.',
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Update Failed',
        message: 'Unable to assign workout program.',
        why: 'There was a connection issue or the selected program is invalid.',
        actionGuide: 'Verify your internet connection and try selecting it again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomProgramModal = () => {
    setCustomProgramName('');
    setCustomProgramDesc('');
    setCustomProgramLevel('beginner');
    setCustomProgramDays([
      { id: '1', title: 'Day 1' }
    ]);
    setIsCustomProgramModalVisible(true);
  };

  const handleAddCustomDay = () => {
    const nextNum = customProgramDays.length + 1;
    setCustomProgramDays([
      ...customProgramDays,
      { id: String(Date.now()), title: `Day ${nextNum}` }
    ]);
  };

  const handleRemoveCustomDay = (id: string) => {
    setCustomProgramDays(customProgramDays.filter(d => d.id !== id));
  };

  const handleUpdateCustomDayTitle = (id: string, text: string) => {
    setCustomProgramDays(
      customProgramDays.map(d => d.id === id ? { ...d, title: text } : d)
    );
  };

  const handleSaveCustomProgram = async () => {
    if (!customProgramName.trim()) {
      showAlert({
        title: 'Program Name Required',
        message: 'The custom program title field is empty.',
        why: 'Every workout program must have a unique identifier name for your personal records.',
        actionGuide: 'Please enter a name for your custom program and try again.',
        type: 'warning',
      });
      return;
    }
    if (customProgramDays.length === 0) {
      showAlert({
        title: 'Split Days Missing',
        message: 'Your custom program does not contain any days.',
        why: 'A training routine must have at least one split day (e.g. Day 1: Full Body) to hold exercises.',
        actionGuide: 'Click "Add Day" to add one or more training days to your custom plan.',
        type: 'warning',
      });
      return;
    }
    for (const d of customProgramDays) {
      if (!d.title.trim()) {
        showAlert({
          title: 'Empty Split Name',
          message: 'One or more of your split days has no title.',
          why: 'Every split day requires a descriptive title (e.g. Upper Body, Leg Day) to keep your schedule organized.',
          actionGuide: 'Type a name for all day fields, then save.',
          type: 'warning',
        });
        return;
      }
    }

    setIsRegenerating(true);
    try {
      const programRes = await api.post('/programs', {
        name: customProgramName,
        description: customProgramDesc || 'Custom workout program.',
        level: customProgramLevel,
        days: customProgramDays.map((d, index) => ({
          dayNumber: index + 1,
          title: d.title,
        })),
      });

      const programId = programRes.data.id;
      await api.post(`/profiles/assign-program/${programId}`);
      
      setIsCustomProgramModalVisible(false);
      await fetchWorkoutData();
      showAlert({
        title: 'Custom Program Assigned',
        message: 'Your custom program is now active.',
        why: 'The program templates and custom splits were created and assigned to your user account.',
        actionGuide: 'Tap OK to begin adding specific exercises to each training day split.',
        type: 'success',
      });
    } catch (err) {
      console.warn('Failed to create custom program:', err);
      showAlert({
        title: 'Save Program Failed',
        message: 'Unable to save your custom program.',
        why: 'The database server rejected the split configuration or connection timed out.',
        actionGuide: 'Verify your internet connection and try pressing "Save Program" again.',
        type: 'error',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateWorkoutPlan = async () => {
    setIsGenerating(true);
    try {
      // 1. Update user profile details
      await api.post('/profiles', {
        fitnessLevel: genLevel,
        equipmentAccess: genEquipment,
        daysPerWeekAvailable: genDays,
        injuries: genInjuriesText.trim() ? [genInjuriesText.trim()] : [],
      });

      // 2. Call generator endpoint
      await api.post('/workouts/generate', {
        goal: genGoal,
        level: genLevel,
        daysPerWeek: genDays,
      });

      showAlert({
        title: 'AI Workout Plan Created',
        message: 'Your personalized AI workout plan was successfully generated.',
        why: 'The system has analyzed your fitness level, equipment access, and days per week to output tailored exercises.',
        actionGuide: 'Tap OK to view your newly generated splits and begin training.',
        type: 'success',
      });
      setIsGenModalVisible(false);
      
      // Refresh workouts tab to retrieve newly generated plan
      await fetchWorkoutData();
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: 'Generation Failed',
        message: 'AI could not build your personalized workout plan.',
        why: e.response?.data?.message || 'The AI workout generation service is currently offline or received invalid attributes.',
        actionGuide: 'Check your network link, verify your profile inputs, and try generating again.',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteWorkoutPlan = async () => {
    if (!activeWorkoutPlan) return;
    showAlert({
      title: 'Reset Workout Plan',
      message: 'Are you sure you want to delete this custom/generated workout plan and start over?',
      why: 'This will permanently remove the program structure, assigned days, and exercise templates.',
      actionGuide: 'Tap "Reset" to confirm and clear the active plan, or "Cancel" to keep it.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/workouts/plans/${activeWorkoutPlan.id}`);
              setActiveWorkoutPlan(null);
              await fetchWorkoutData();
              showAlert({
                title: 'Workout Plan Reset',
                message: 'Your workout plan has been successfully cleared.',
                why: 'The database record has been deleted.',
                actionGuide: 'You can now select a new program or generate another AI workout plan.',
                type: 'success',
              });
            } catch (err) {
              console.warn(err);
              showAlert({
                title: 'Reset Failed',
                message: 'Unable to delete workout plan.',
                why: 'A database sync error occurred or connection was lost.',
                actionGuide: 'Please check your connection and try resetting the plan again.',
                type: 'error',
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    });
  };

  const handleOpenEditPlanEx = (pde: any) => {
    setEditingPlanEx(pde);
    setEditTargetSets(String(pde.targetSets || 3));
    setEditTargetRepsRange(pde.targetRepsRange || '8-12');
    setIsEditPlanExModalVisible(true);
  };

  const handleSavePlanExEdit = async () => {
    if (!editingPlanEx) return;
    try {
      if (activeWorkoutPlan) {
        const updatedExercises = activeWorkoutPlan.workoutExercises.map((we: any) => {
          if (we.id === editingPlanEx.id) {
            return {
              ...we,
              sets: parseInt(editTargetSets, 10),
              reps: editTargetRepsRange,
            };
          }
          return we;
        });

        const exercisesPayload = updatedExercises.map((we: any) => ({
          exerciseId: we.exerciseId,
          sets: we.sets,
          reps: String(we.reps),
          weight: we.weight || null,
          restTimeSeconds: we.restTimeSeconds || 90,
          dayNumber: we.dayNumber || 1,
        }));

        await api.patch(`/workouts/plans/${activeWorkoutPlan.id}`, {
          name: activeWorkoutPlan.name,
          exercises: exercisesPayload,
        });
      } else {
        await api.put(`/programs/exercises/${editingPlanEx.id}`, {
          targetSets: parseInt(editTargetSets, 10),
          targetRepsRange: editTargetRepsRange,
        });
      }
      showAlert({
        title: 'Exercise Targets Updated',
        message: 'The target sets and reps have been modified.',
        why: 'The database updated your workout plan templates to guide your next session.',
        actionGuide: 'Review your workout day split to see the updated goals.',
        type: 'success',
      });
      setIsEditPlanExModalVisible(false);
      fetchWorkoutData();
    } catch (err) {
      showAlert({
        title: 'Save Modification Failed',
        message: 'Failed to update target parameters.',
        why: 'A network error occurred or the inputs are incorrectly structured.',
        actionGuide: 'Verify that target sets and reps range are valid and check your network connection.',
        type: 'error',
      });
    }
  };

  const handleRemovePlanEx = async (pdeId: string) => {
    try {
      if (activeWorkoutPlan) {
        const updatedExercises = activeWorkoutPlan.workoutExercises.filter((we: any) => we.id !== pdeId);
        const exercisesPayload = updatedExercises.map((we: any) => ({
          exerciseId: we.exerciseId,
          sets: we.sets,
          reps: String(we.reps),
          weight: we.weight || null,
          restTimeSeconds: we.restTimeSeconds || 90,
          dayNumber: we.dayNumber || 1,
        }));
        await api.patch(`/workouts/plans/${activeWorkoutPlan.id}`, {
          name: activeWorkoutPlan.name,
          exercises: exercisesPayload,
        });
      } else {
        await api.delete(`/programs/exercises/${pdeId}`);
      }
      fetchWorkoutData();
    } catch (err) {
      showAlert({
        title: 'Removal Failed',
        message: 'Unable to remove exercise.',
        why: 'A database update error occurred or connection was lost.',
        actionGuide: 'Please try again in a few moments.',
        type: 'error',
      });
    }
  };

  const handleOpenAddPlanEx = (dayId: string) => {
    setSelectedDayIdForAdd(String(dayId));
    setAddPlanExQuery('');
    setAddPlanExResults([]);
    setAddPlanExSets('3');
    setAddPlanExRepsRange('8-12');
    setIsAddPlanExModalVisible(true);
  };

  const handleSearchAddPlanExercises = async (query: string) => {
    setAddPlanExQuery(query);
    if (!query.trim()) {
      setAddPlanExResults([]);
      return;
    }
    setIsSearchingAddPlanEx(true);
    try {
      const res = await api.get(`/exercises?q=${encodeURIComponent(query)}`);
      const exercises = res.data?.data ?? res.data;
      if (Array.isArray(exercises) && exercises.length > 0) {
        setAddPlanExResults(exercises);
      } else {
        const matches = FALLBACK_EXERCISES.filter((e) =>
          e.name.toLowerCase().includes(query.toLowerCase())
        );
        setAddPlanExResults(matches);
      }
    } catch (e) {
      const matches = FALLBACK_EXERCISES.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
      );
      setAddPlanExResults(matches);
    } finally {
      setIsSearchingAddPlanEx(false);
    }
  };

  const handleConfirmAddExerciseToPlan = async (exercise: Exercise) => {
    if (!selectedDayIdForAdd) return;
    try {
      if (activeWorkoutPlan) {
        const newExItem = {
          exerciseId: exercise.id,
          sets: parseInt(addPlanExSets, 10),
          reps: addPlanExRepsRange,
          weight: null,
          restTimeSeconds: 90,
          dayNumber: Number(selectedDayIdForAdd),
        };

        const exercisesPayload = [
          ...activeWorkoutPlan.workoutExercises.map((we: any) => ({
            exerciseId: we.exerciseId,
            sets: we.sets,
            reps: String(we.reps),
            weight: we.weight || null,
            restTimeSeconds: we.restTimeSeconds || 90,
            dayNumber: we.dayNumber || 1,
          })),
          newExItem,
        ];

        await api.patch(`/workouts/plans/${activeWorkoutPlan.id}`, {
          name: activeWorkoutPlan.name,
          exercises: exercisesPayload,
        });
      } else {
        await api.post(`/programs/days/${selectedDayIdForAdd}/exercises`, {
          exerciseId: exercise.id,
          targetSets: parseInt(addPlanExSets, 10),
          targetRepsRange: addPlanExRepsRange,
        });
      }
      showAlert({
        title: 'Exercise Added',
        message: 'The exercise has been added to your split day.',
        why: 'The database template has been successfully appended with this activity.',
        actionGuide: 'Review your training splits or begin your workout routine to see it.',
        type: 'success',
      });
      setIsAddPlanExModalVisible(false);
      setAddPlanExQuery('');
      setAddPlanExResults([]);
      fetchWorkoutData();
    } catch (err) {
      showAlert({
        title: 'Add Exercise Failed',
        message: 'Could not append the exercise to your routine.',
        why: 'The database server was unable to save the new target parameters or connection timed out.',
        actionGuide: 'Check your internet connection and try pressing "Add to Plan" again.',
        type: 'error',
      });
    }
  };

  // Load exercise catalog with current filters
  const fetchCatalogExercises = async () => {
    setIsCatalogLoading(true);
    try {
      let url = `/exercises?limit=50`;
      const params = [];
      if (catalogQuery.trim()) {
        params.push(`q=${encodeURIComponent(catalogQuery)}`);
      }
      if (catalogMuscle) {
        params.push(`muscle=${encodeURIComponent(catalogMuscle)}`);
      }
      if (catalogEquipment) {
        params.push(`equipment=${encodeURIComponent(catalogEquipment)}`);
      }
      if (catalogDifficulty) {
        params.push(`difficulty=${encodeURIComponent(catalogDifficulty)}`);
      }
      if (params.length > 0) {
        url += '&' + params.join('&');
      }

      const res = await api.get(url);
      const exercises = res.data?.data ?? res.data;
      setCatalogExercises(Array.isArray(exercises) ? exercises : []);
    } catch (err) {
      console.warn('Failed to load catalog:', err);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  // Trigger catalog sync
  const handleSyncExercises = async () => {
    setIsSyncing(true);
    try {
      await api.post('/exercises/sync');
      showAlert({
        title: 'Catalog Synchronized',
        message: 'The exercise catalog is now fully up to date.',
        why: 'All exercise items, muscle groups, instructions, and target equipment have been refreshed from remote api services.',
        actionGuide: 'Use the search box in the catalog tab to look for newly added exercises.',
        type: 'success',
      });
      fetchCatalogExercises();
    } catch (err: any) {
      console.warn('Catalog sync failed:', err);
      showAlert({
        title: 'Synchronization Failed',
        message: 'Could not sync exercises catalog.',
        why: err.response?.data?.message || 'The external API service did not respond or network connection is offline.',
        actionGuide: 'Check your internet connection and tap the synchronize button to try again.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isCatalogModalVisible) {
      fetchCatalogExercises();
    }
  }, [isCatalogModalVisible, catalogQuery, catalogMuscle, catalogEquipment, catalogDifficulty]);

  const handleAddCatalogExerciseToPlan = async (exercise: Exercise, targetDay: number, setsVal: string, repsVal: string) => {
    try {
      if (activeWorkoutPlan) {
        const newExItem = {
          exerciseId: exercise.id,
          sets: parseInt(setsVal, 10) || 3,
          reps: repsVal || '8-12',
          weight: null,
          restTimeSeconds: 90,
          dayNumber: targetDay,
        };

        const exercisesPayload = [
          ...activeWorkoutPlan.workoutExercises.map((we: any) => ({
            exerciseId: we.exerciseId,
            sets: we.sets,
            reps: String(we.reps),
            weight: we.weight || null,
            restTimeSeconds: we.restTimeSeconds || 90,
            dayNumber: we.dayNumber || 1,
          })),
          newExItem,
        ];

        await api.patch(`/workouts/plans/${activeWorkoutPlan.id}`, {
          name: activeWorkoutPlan.name,
          exercises: exercisesPayload,
        });
      } else {
        if (currentProgram && currentProgram.days && currentProgram.days.length > 0) {
          const targetDayObj = currentProgram.days[targetDay - 1] || currentProgram.days[0];
          await api.post(`/programs/days/${targetDayObj.id}/exercises`, {
            exerciseId: exercise.id,
            targetSets: parseInt(setsVal, 10) || 3,
            targetRepsRange: repsVal || '8-12',
          });
        }
      }
      showAlert({
        title: 'Exercise Added',
        message: 'The catalog exercise has been appended to your workout split.',
        why: 'Your training plan has been updated with the new sets and reps parameters.',
        actionGuide: 'Tap OK to return to the catalog or review your training splits.',
        type: 'success',
      });
      setSelectedCatalogExercise(null);
      fetchWorkoutData();
    } catch (err) {
      showAlert({
        title: 'Insertion Failed',
        message: 'Failed to append the exercise to your active split.',
        why: 'A database update mismatch or connection issue occurred.',
        actionGuide: 'Verify your network connection and retry.',
        type: 'error',
      });
    }
  };

  // Stopwatch timer logic
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setWorkoutDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Start Workout Action
  const handleStartWorkout = async () => {
    try {
      setLoading(true);
      
      let programDayId: string | undefined;
      let exercisesToPrefill: ActiveExercise[] = [];
      
      try {
        if (activeWorkoutPlan && activeWorkoutPlan.workoutExercises && activeWorkoutPlan.workoutExercises.length > 0) {
          const daysMap: { [key: number]: any[] } = {};
          activeWorkoutPlan.workoutExercises.forEach((we: any) => {
            const dNum = we.dayNumber || 1;
            if (!daysMap[dNum]) {
              daysMap[dNum] = [];
            }
            daysMap[dNum].push(we);
          });
          const numDays = Object.keys(daysMap).length || 1;

          const historyRes = await api.get('/workouts/history');
          const historyList = historyRes.data || [];
          let activePlanDayIdx = 0;
          if (historyList.length > 0) {
            const latestSession = historyList[0];
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const dayVal = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${dayVal}`;
            if (latestSession && latestSession.date === todayStr) {
              activePlanDayIdx = Math.max(0, historyList.length - 1) % numDays;
            } else {
              activePlanDayIdx = historyList.length % numDays;
            }
          }
          
          const activeDayNumber = activePlanDayIdx + 1;
          const dayExercises = daysMap[activeDayNumber] || [];
          if (dayExercises.length > 0) {
            exercisesToPrefill = dayExercises.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((we: any) => {
              const targetSetsCount = we.sets || 3;
              let defaultReps = 10;
              if (we.reps) {
                const parts = String(we.reps).split('-');
                if (parts.length > 1) {
                  defaultReps = Math.round((parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2);
                } else {
                  defaultReps = parseInt(we.reps, 10) || 10;
                }
              }
              
              const sets = Array.from({ length: targetSetsCount }, (_, i) => ({
                setNumber: i + 1,
                reps: defaultReps,
                weight: we.weight || 40,
                completed: false,
              }));
              
              return {
                exerciseId: we.exerciseId,
                name: we.exercise?.displayName || we.exercise?.name || 'Exercise',
                source: we.exercise?.source,
                gifUrl: we.exercise?.gifUrl,
                sets,
              };
            });
          }
        } else {
          const profileRes = await api.get('/profiles/mine');
          const profile = profileRes.data;
          if (profile && profile.currentProgramId) {
            const programRes = await api.get(`/programs/${profile.currentProgramId}`);
            const program = programRes.data;
            
            if (program && program.days && program.days.length > 0) {
              const historyRes = await api.get('/workouts/history');
              const historyList = historyRes.data || [];
              let activeDayIdx = 0;
              if (historyList.length > 0) {
                const latestSession = historyList[0];
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const dayVal = String(now.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${dayVal}`;
                
                if (latestSession && latestSession.date === todayStr) {
                  activeDayIdx = Math.max(0, historyList.length - 1) % program.days.length;
                } else {
                  activeDayIdx = historyList.length % program.days.length;
                }
              }
              const activeDay = program.days[activeDayIdx];
              
              if (activeDay) {
                programDayId = activeDay.id;
                
                if (activeDay.exercises && activeDay.exercises.length > 0) {
                  exercisesToPrefill = activeDay.exercises.map((pde: any) => {
                    const targetSetsCount = pde.targetSets || 3;
                    let defaultReps = 10;
                    if (pde.targetRepsRange) {
                      const parts = pde.targetRepsRange.split('-');
                      if (parts.length > 1) {
                        defaultReps = Math.round((parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2);
                      } else {
                        defaultReps = parseInt(pde.targetRepsRange, 10) || 10;
                      }
                    }
                    
                    const sets = Array.from({ length: targetSetsCount }, (_, i) => ({
                      setNumber: i + 1,
                      reps: defaultReps,
                      weight: 40,
                      completed: false,
                    }));
                    
                    return {
                      exerciseId: pde.exerciseId,
                      name: pde.exercise?.displayName || pde.exercise?.name || 'Exercise',
                      source: pde.exercise?.source,
                      gifUrl: pde.exercise?.gifUrl,
                      sets,
                    };
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not load program split for prefilling workouts:', err);
      }

      const res = await api.post('/workouts/start', {
        programDayId,
      });
      
      setActiveSession(res.data);
      setIsWorkoutActive(true);
      setActiveExercises(exercisesToPrefill);
      setWorkoutDuration(0);
      startTimer();
    } catch (e) {
      setIsWorkoutActive(true);
      setActiveExercises([
        {
          exerciseId: 'e1',
          name: 'Bench Press',
          sets: [{ setNumber: 1, reps: 10, weight: 60, completed: false }],
        },
      ]);
      setWorkoutDuration(0);
      startTimer();
      showAlert({
        title: 'Offline Mode Active',
        message: 'Your workout session has started in offline mode.',
        why: 'We were unable to reach our servers to log the session initialization, but your reps and sets will be tracked locally.',
        actionGuide: 'Proceed with your workout. All logs will be synced to the database once you finish.',
        type: 'info',
      });
    } finally {
      setLoading(false);
    }
  };

  // Search base exercise database
  const handleSearchExercises = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setExerciseResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/exercises?q=${encodeURIComponent(query)}`);
      const exercises = res.data?.data ?? res.data;
      if (Array.isArray(exercises) && exercises.length > 0) {
        setExerciseResults(exercises);
      } else {
        const matches = FALLBACK_EXERCISES.filter((e) =>
          e.name.toLowerCase().includes(query.toLowerCase())
        );
        setExerciseResults(matches);
      }
    } catch (e) {
      const matches = FALLBACK_EXERCISES.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
      );
      setExerciseResults(matches);
    } finally {
      setIsSearching(false);
    }
  };

  // Add selected exercise to current log
  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    // Check if already in workout
    const exists = activeExercises.find((ae) => ae.exerciseId === exercise.id);
    if (exists) {
      showAlert({
        title: 'Already Added',
        message: 'This exercise is already included in your active session.',
        why: 'The active workout tracker lists this exercise in your current day split.',
        actionGuide: 'If you want to track more sets, tap "+ Add Set" button directly under the exercise details card.',
        type: 'info',
      });
      return;
    }

    const newActiveEx: ActiveExercise = {
      exerciseId: exercise.id,
      name: (exercise as any).displayName || exercise.name,
      source: (exercise as any).source,
      gifUrl: (exercise as any).gifUrl,
      sets: [
        {
          setNumber: 1,
          reps: 10,
          weight: 20,
          completed: false,
        },
      ],
    };

    setActiveExercises([...activeExercises, newActiveEx]);
    setIsExerciseModalVisible(false);
    setSearchQuery('');
  };

  // Add Set row to exercise
  const handleAddSet = (exerciseId: string) => {
    setActiveExercises(
      activeExercises.map((ae) => {
        if (ae.exerciseId !== exerciseId) return ae;
        const lastSet = ae.sets[ae.sets.length - 1];
        return {
          ...ae,
          sets: [
            ...ae.sets,
            {
              setNumber: ae.sets.length + 1,
              reps: lastSet ? lastSet.reps : 10,
              weight: lastSet ? lastSet.weight : 20,
              completed: false,
            },
          ],
        };
      })
    );
  };

  // Remove last Set row from exercise
  const handleRemoveSet = (exerciseId: string) => {
    setActiveExercises(
      activeExercises.map((ae) => {
        if (ae.exerciseId !== exerciseId) return ae;
        if (ae.sets.length <= 1) return ae; // Keep at least one set
        return {
          ...ae,
          sets: ae.sets.slice(0, -1),
        };
      })
    );
  };

  // Edit Set Values
  const handleEditSet = (
    exerciseId: string,
    setNum: number,
    field: 'reps' | 'weight',
    val: string
  ) => {
    setActiveExercises(
      activeExercises.map((ae) => {
        if (ae.exerciseId !== exerciseId) return ae;
        return {
          ...ae,
          sets: ae.sets.map((s) => {
            if (s.setNumber !== setNum) return s;
            const parsed = parseFloat(val);
            return {
              ...s,
              [field]: isNaN(parsed) ? 0 : parsed,
            };
          }),
        };
      })
    );
  };

  // Toggle checklist check
  const handleToggleSetComplete = async (exerciseId: string, setNum: number) => {
    let updatedSet: SetLog | undefined;
    
    const nextExercises = activeExercises.map((ae) => {
      if (ae.exerciseId !== exerciseId) return ae;
      return {
        ...ae,
        sets: ae.sets.map((s) => {
          if (s.setNumber !== setNum) return s;
          updatedSet = { ...s, completed: !s.completed };
          return updatedSet;
        }),
      };
    });

    setActiveExercises(nextExercises);

    // Sync progress to NestJS database instantly
    if (activeSession && updatedSet) {
      try {
        const completedLogs = nextExercises
          .map((ae) => {
            const completedSets = ae.sets.filter((s) => s.completed);
            if (completedSets.length === 0) return null;
            return {
              exerciseId: ae.exerciseId,
              sets: completedSets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weight: s.weight,
              })),
            };
          })
          .filter((log): log is any => log !== null);

        await api.post('/workouts', {
          duration: Math.round(workoutDuration / 60),
          completed: false,
          logs: completedLogs,
        });
      } catch (error) {
        console.warn('Set sync offline fallback', error);
      }
    }
  };

  // Delete exercise from list
  const handleDeleteExercise = (exerciseId: string) => {
    setActiveExercises(activeExercises.filter((ae) => ae.exerciseId !== exerciseId));
  };

  // Complete workout log
  const handleCompleteWorkout = async () => {
    const finalDurationMins = Math.max(1, Math.round(workoutDuration / 60));
    const finalRpe = parseInt(rpe) || 7;

    const completedLogs = activeExercises
      .map((ae) => {
        const completedSets = ae.sets.filter((s) => s.completed);
        if (completedSets.length === 0) return null;
        return {
          exerciseId: ae.exerciseId,
          sets: completedSets.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
          })),
        };
      })
      .filter((log): log is any => log !== null);

    try {
      setLoading(true);
      
      // Save full final logs structure using /workouts (which updates status, sets completed: true, and replaces temporary logs)
      await api.post('/workouts', {
        duration: finalDurationMins,
        completed: true,
        rpe: finalRpe,
        logs: completedLogs,
      });

      setIsFinishModalVisible(false);
      setIsWorkoutActive(false);
      setActiveSession(null);
      stopTimer();
      setWorkoutDuration(0);
      showAlert({
        title: 'Workout Logged!',
        message: 'Your training session was saved successfully.',
        why: 'The database recorded all finished sets, reps, load weight, and your perceived effort (RPE).',
        actionGuide: 'Keep it up! Check your Gym History list to view this entry and track your progressive overload trend.',
        type: 'success',
      });
      fetchWorkoutData();
    } catch (e) {
      showAlert({
        title: 'Logging Failed',
        message: 'Could not submit your workout session.',
        why: 'A network communication error occurred or some exercises lack required inputs.',
        actionGuide: 'Please check your internet connection and tap the finish button to try logging again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Cancel/Discard active workout
  const handleDiscardWorkout = () => {
    showAlert({
      title: 'Discard Workout?',
      message: 'Are you sure you want to discard this workout session?',
      why: 'All sets and reps tracked in the current session will be permanently deleted and cannot be recovered.',
      actionGuide: 'Tap "Discard" to confirm and clear the active tracker, or "Cancel" to continue tracking.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            if (activeSession?.id) {
              try {
                setLoading(true);
                await api.delete(`/workouts/${activeSession.id}`);
              } catch (err) {
                console.warn('Failed to discard active session on server:', err);
              } finally {
                setLoading(false);
              }
            }
            setIsWorkoutActive(false);
            setActiveSession(null);
            stopTimer();
            setWorkoutDuration(0);
            setActiveExercises([]);
          },
        },
      ]
    });
  };

  // Calculate training volume sum for render
  const calculateTotalLoggedVolume = () => {
    return activeExercises.reduce((sum, ae) => {
      return (
        sum +
        ae.sets.reduce((setSum, s) => {
          return setSum + (s.completed ? s.weight * s.reps : 0);
        }, 0)
      );
    }, 0);
  };

  // Bezier line scaling for volume SVG
  const getDailyVolumeData = () => {
    const volumeByDate: { [date: string]: number } = {};
    const now = new Date();
    const daysToGenerate = chartPeriod === 'weekly' ? 7 : 30;
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayVal}`;
      volumeByDate[dateStr] = 0;
    }

    for (const session of history) {
      if (!session.completed) continue;
      const dateStr = session.date;
      
      let sessionVolume = 0;
      const logs = session.exerciseLogs || session.logs || [];
      for (const log of logs) {
        if (log.sets) {
          for (const set of log.sets) {
            sessionVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
          }
        }
      }
      
      if (volumeByDate[dateStr] !== undefined) {
        volumeByDate[dateStr] += sessionVolume;
      }
    }

    return Object.keys(volumeByDate)
      .sort()
      .map((dateStr) => {
        const dateObj = new Date(dateStr + 'T12:00:00');
        let label = '';
        if (chartPeriod === 'weekly') {
          label = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
        } else {
          label = String(dateObj.getDate());
        }
        return {
          date: dateStr,
          val: volumeByDate[dateStr],
          label,
        };
      });
  };

  const dailyVolumeData = getDailyVolumeData();
  const volumeValues = dailyVolumeData.map((d) => d.val);
  const maxVolumeVal = Math.max(...volumeValues, 1000);
  const minVolumeVal = Math.min(...volumeValues, 0);

  const points = dailyVolumeData.map((d, idx) => {
    const paddingLeft = 20;
    const paddingRight = 20;
    const chartWidth = 280 - paddingLeft - paddingRight;
    const x = paddingLeft + idx * (chartWidth / (dailyVolumeData.length - 1 || 1));
    const chartHeight = 50; // Keep space for labels below
    const bottomY = 82;
    const yValRange = maxVolumeVal - minVolumeVal || 1;
    const y = bottomY - ((d.val - minVolumeVal) / yValRange) * chartHeight;
    return { x, y, val: d.val, label: d.label };
  });

  // Generate Bezier path description
  const linePath = points.reduce((path, p, idx) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    const prev = points[idx - 1];
    const segmentWidth = p.x - prev.x;
    const cpX1 = prev.x + segmentWidth / 2;
    const cpY1 = prev.y;
    const cpX2 = p.x - segmentWidth / 2;
    const cpY2 = p.y;
    return `${path} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StateFeedback
          type="loading"
          title="Loading Workout Hub..."
          description="Fetching your training plan, exercise catalog, and workout history."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>
          {isWorkoutActive
            ? 'Active Workout'
            : activeTab === 'gym'
            ? 'Gym History'
            : activeTab === 'runs'
            ? 'Runs History'
            : 'Training Plan'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {!isWorkoutActive ? (
          <View style={{ flex: 1 }}>
            {/* Rich Tabs Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'gym' && styles.tabButtonActive]}
                onPress={() => setActiveTab('gym')}
                activeOpacity={0.8}
              >
                <Clock size={16} color={activeTab === 'gym' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'gym' && styles.tabButtonTextActive]}>
                  Gym
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'runs' && styles.tabButtonActive]}
                onPress={() => setActiveTab('runs')}
                activeOpacity={0.8}
              >
                <ChartLineIcon size={16} color={activeTab === 'runs' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'runs' && styles.tabButtonTextActive]}>
                  Runs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'plan' && styles.tabButtonActive]}
                onPress={() => setActiveTab('plan')}
                activeOpacity={0.8}
              >
                <DumbbellIcon size={16} color={activeTab === 'plan' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'plan' && styles.tabButtonTextActive]}>
                  Plans
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'gym' ? (
              <View>
                {/* Volume progression chart card */}
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                      <ChartLineIcon size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.chartTitle} numberOfLines={1}>Training Volume (kg)</Text>
                    </View>
                    <View style={styles.periodSwitchContainer}>
                      <TouchableOpacity
                        style={[styles.periodSwitchButton, chartPeriod === 'weekly' && styles.periodSwitchButtonActive]}
                        onPress={() => setChartPeriod('weekly')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.periodSwitchText, chartPeriod === 'weekly' && styles.periodSwitchTextActive]}>
                          Weekly
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.periodSwitchButton, chartPeriod === 'monthly' && styles.periodSwitchButtonActive]}
                        onPress={() => setChartPeriod('monthly')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.periodSwitchText, chartPeriod === 'monthly' && styles.periodSwitchTextActive]}>
                          Monthly
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.svgContainer}>
                    <Svg height={110} width="100%" viewBox="0 0 280 110">
                      <Defs>
                        <LinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.25" />
                          <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
                        </LinearGradient>
                      </Defs>
                      {/* Grid Lines */}
                      <Line x1="20" y1="32" x2="260" y2="32" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4" />
                      <Line x1="20" y1="57" x2="260" y2="57" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4" />
                      <Line x1="20" y1="82" x2="260" y2="82" stroke={COLORS.border} strokeWidth="1" />

                      {/* Gradient Area Fill */}
                      {points.length > 1 && (
                        <Path
                          d={`${linePath} L ${points[points.length - 1].x} 82 L ${points[0].x} 82 Z`}
                          fill="url(#pathGrad)"
                        />
                      )}

                      {/* Curve Line */}
                      {points.length > 1 && (
                        <Path
                          d={linePath}
                          fill="none"
                          stroke={COLORS.primary}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      )}

                      {/* X-Axis Labels */}
                      {points.map((p, idx) => {
                        const showLabel = chartPeriod === 'weekly' || (idx % 5 === 0);
                        if (!showLabel) return null;
                        return (
                          <SvgText
                            key={`lbl-${idx}`}
                            fontSize={7}
                            fill={COLORS.textMuted || '#8E8E93'}
                            fontWeight="600"
                            textAnchor="middle"
                            x={p.x}
                            y={96}
                          >
                            {p.label}
                          </SvgText>
                        );
                      })}

                      {/* Dots and Labels */}
                      {points.map((p, idx) => {
                        const showTextLabel = chartPeriod === 'weekly' && p.val > 0;
                        return (
                          <G key={idx}>
                            <Circle cx={p.x} cy={p.y} r={chartPeriod === 'weekly' ? 4.5 : 2.5} fill={COLORS.primary} />
                            <Circle cx={p.x} cy={p.y} r={chartPeriod === 'weekly' ? 2.5 : 1.2} fill="#FFFFFF" />
                            {showTextLabel && (
                              <SvgText
                                fontSize={8}
                                fill={COLORS.textLight}
                                fontWeight="700"
                                textAnchor="middle"
                                x={p.x}
                                y={p.y - 8}
                              >
                                {p.val}
                              </SvgText>
                            )}
                          </G>
                        );
                      })}
                    </Svg>
                  </View>
                </View>

                {/* Glowing Start Session Card */}
                <View style={styles.startSessionCard}>
                  <DumbbellIcon size={38} color={COLORS.textInverse} style={{ marginBottom: 12 }} />
                  <Text style={styles.startCardTitle}>Ready for your lift?</Text>
                  <Text style={styles.startCardSub}>Start an empty log session, add exercises, and record progression.</Text>
                  <TouchableOpacity
                    onPress={handleStartWorkout}
                    style={styles.startWorkoutBtn}
                    activeOpacity={0.85}
                  >
                    <Play size={18} color={COLORS.primary} fill={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.startWorkoutText}>Start Workout Session</Text>
                  </TouchableOpacity>
                </View>

                {/* Chronological History logs */}
                <Text style={styles.historySectionTitle}>Gym Logs History</Text>
                {history.length > 0 ? (
                  history.map((item) => (
                    <View key={item.id} style={{ position: 'relative' }}>
                      <TouchableOpacity
                        style={styles.historyCard}
                        onPress={() => {
                          setSelectedWorkoutSession(item);
                          setIsDetailModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.historyHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Clock size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.historyDate}>
                              {new Date(item.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={styles.historyDuration}>{item.duration} mins</Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteSession(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={16} color={COLORS.error || '#FF4A4A'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={styles.historyName}>
                          {item.programDay?.name || 'Strength Session'}
                        </Text>
                        
                        {/* List of exercises performed */}
                        <View style={styles.historyExecsList}>
                          {(() => {
                            const listLogs = item.exerciseLogs || item.logs || [];
                            return (
                              <>
                                {listLogs.slice(0, 3).map((log: any, idx: number) => (
                                  <View key={log.id || idx} style={styles.historyExecItem}>
                                    <Check size={14} color={COLORS.success} style={{ marginRight: 6 }} />
                                    <Text style={styles.historyExecName}>
                                      {log.exercise?.name} ({log.sets?.length} sets)
                                    </Text>
                                  </View>
                                ))}
                                {listLogs.length > 3 && (
                                  <Text style={styles.historyExecMore}>+{listLogs.length - 3} more exercises</Text>
                                )}
                              </>
                            );
                          })()}
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <StateFeedback
                    type="empty"
                    title="No Workouts Logged Yet"
                    description="Your fitness journey starts now! Log your first workout today."
                    icon={<TrophyIcon size={36} color={COLORS.primary} />}
                  />
                )}
              </View>
            ) : activeTab === 'runs' ? (
              <View style={{ flex: 1 }}>
                {renderRunsHistory()}
              </View>
            ) : (
              /* ACTIVE PLAN TAB PANEL */
              <View style={{ flex: 1, paddingBottom: 30 }}>
                {activeWorkoutPlan ? (
                  <View>
                    <View style={styles.planInfoCard}>
                      <View style={styles.planInfoTitleRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planProgramTitle}>{activeWorkoutPlan.name}</Text>
                          <Text style={[styles.planProgramDesc, { marginTop: 4 }]}>
                            Custom active workout plan tailored to your profile
                          </Text>
                        </View>
                        <View style={[styles.planBadgeContainer, { backgroundColor: COLORS.primaryLight }]}>
                          <Text style={[styles.planBadgeText, { color: COLORS.primary }]}>ACTIVE</Text>
                        </View>
                      </View>

                      <View style={styles.planActionRow}>
                        <TouchableOpacity
                          style={[styles.planCardBtn, styles.planCardBtnOutline, { flex: 1, marginRight: 8 }]}
                          onPress={() => setIsCatalogModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <BookOpen size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.planCardBtnOutlineText} numberOfLines={1}>Catalog</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.planCardBtn, styles.planCardBtnSolid, { flex: 1 }]}
                          onPress={() => setIsGenModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <CreationIcon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.planCardBtnSolidText} numberOfLines={1}>Generator</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[styles.planCreateCustomBtn, { borderStyle: 'solid', borderColor: '#DC2626', opacity: 0.95, marginTop: 12 }]}
                        onPress={handleDeleteWorkoutPlan}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={16} color="#DC2626" style={{ marginRight: 6 }} />
                        <Text style={[styles.planCreateCustomBtnText, { color: '#DC2626' }]}>Reset & Delete Plan</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Render split days grouped dynamically */}
                    {(() => {
                      const daysMap: { [key: number]: any[] } = {};
                      (activeWorkoutPlan.workoutExercises || []).forEach((we: any) => {
                        const dNum = we.dayNumber || 1;
                        if (!daysMap[dNum]) {
                          daysMap[dNum] = [];
                        }
                        daysMap[dNum].push(we);
                      });
                      
                      const dayNumbers = Object.keys(daysMap).map(Number).sort((a, b) => a - b);
                      const totalDays = dayNumbers.length || 1;

                      if (dayNumbers.length === 0) {
                        return (
                          <View style={styles.planExEmpty}>
                            <Text style={styles.planExEmptyText}>No exercises in your plan yet. Tap below or use the Catalog/Generator to add some!</Text>
                            <TouchableOpacity
                              style={[styles.planEmptyBtn, { marginTop: 12, backgroundColor: COLORS.primaryLight }]}
                              onPress={() => handleOpenAddPlanEx('1')}
                              activeOpacity={0.8}
                            >
                              <Plus size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                              <Text style={[styles.planEmptyBtnText, { color: COLORS.primary }]}>Add Exercise to Day 1</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      return dayNumbers.map((dayNum) => {
                        let isDayActive = false;
                        const dIdx = dayNum - 1;
                        if (history.length > 0) {
                          const latestSession = history[0];
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const dayVal = String(now.getDate()).padStart(2, '0');
                          const todayStr = `${year}-${month}-${dayVal}`;

                          if (latestSession && latestSession.date === todayStr) {
                            isDayActive = Math.max(0, history.length - 1) % totalDays === dIdx;
                          } else {
                            isDayActive = history.length % totalDays === dIdx;
                          }
                        } else {
                          isDayActive = dIdx === 0;
                        }

                        const dayExList = daysMap[dayNum] || [];

                        return (
                          <View key={dayNum} style={[styles.planDayCard, isDayActive && styles.planDayCardActive]}>
                            <View style={styles.planDayHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.planDayBadge, isDayActive && styles.planDayBadgeActive]}>
                                  <Text style={[styles.planDayBadgeText, isDayActive && styles.planDayBadgeTextActive]}>{dayNum}</Text>
                                </View>
                                <Text style={[styles.planDayTitle, isDayActive && styles.planDayTitleActive]}>
                                  Day {dayNum} {isDayActive && <Text style={styles.activeDayIndicator}>(Active Day)</Text>}
                                </Text>
                              </View>
                              
                              <TouchableOpacity
                                style={styles.planAddExIconBtn}
                                onPress={() => handleOpenAddPlanEx(String(dayNum))}
                                activeOpacity={0.7}
                              >
                                <Plus size={18} color={COLORS.primary} />
                              </TouchableOpacity>
                            </View>

                            {/* Exercise List for this Day */}
                            <View style={styles.planExList}>
                              {dayExList.length > 0 ? (
                                dayExList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((we: any, eIdx: number) => (
                                  <View key={we.id || eIdx} style={styles.planExRow}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                      <Text style={styles.planExName}>{we.exercise?.name || 'Exercise'}</Text>
                                      <Text style={styles.planExDetails}>
                                        {we.sets || 3} sets × {we.reps || '8-12'} reps
                                      </Text>
                                    </View>
                                    
                                    <View style={styles.planExActionsRow}>
                                      <TouchableOpacity
                                        style={styles.planExActionBtn}
                                        onPress={() => handleOpenEditPlanEx(we)}
                                        activeOpacity={0.7}
                                      >
                                        <Edit2 size={16} color={COLORS.textLight} />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={styles.planExActionBtn}
                                        onPress={() => handleRemovePlanEx(we.id)}
                                        activeOpacity={0.7}
                                      >
                                        <Trash2 size={16} color="#DC2626" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ))
                              ) : (
                                <View style={styles.planExEmpty}>
                                  <Text style={styles.planExEmptyText}>No exercises in this split day.</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                ) : currentProgram ? (
                  <View>
                    <View style={styles.planInfoCard}>
                      {/* Header: level pill + days/week chip */}
                      <View style={styles.planCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[
                            styles.planLevelPill,
                            currentProgram.level === 'advanced'     && { backgroundColor: '#FEF2F2' },
                            currentProgram.level === 'intermediate' && { backgroundColor: '#FFF7ED' },
                            (!currentProgram.level || currentProgram.level === 'beginner') && { backgroundColor: '#ECFDF5' },
                          ]}>
                            <Text style={[
                              styles.planLevelText,
                              currentProgram.level === 'advanced'     && { color: '#DC2626' },
                              currentProgram.level === 'intermediate' && { color: '#EA580C' },
                              (!currentProgram.level || currentProgram.level === 'beginner') && { color: '#059669' },
                            ]}>
                              {currentProgram.level?.toUpperCase() || 'BEGINNER'}
                            </Text>
                          </View>
                          <View style={styles.planLocationChip}>
                            {currentProgram.location === 'home'
                              ? <RunIcon size={11} color={COLORS.textLight} />
                              : <DumbbellIcon size={11} color={COLORS.textLight} />
                            }
                            <Text style={styles.planLocationChipText}>
                              {currentProgram.location === 'home' ? 'Home' : 'Gym'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.planDaysChip}>
                          <Text style={styles.planDaysChipText}>
                            {currentProgram.days?.length || 0} days / week
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.planProgramTitle}>{currentProgram.name}</Text>
                      <Text style={styles.planProgramDesc}>{currentProgram.description}</Text>

                      <View style={styles.planDivider} />

                      <View style={styles.planActionRow}>
                        <TouchableOpacity
                          style={[styles.planCardBtn, styles.planCardBtnOutline]}
                          onPress={handleOpenProgramSelector}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.planCardBtnOutlineText}>Choose Plan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.planCardBtn, styles.planCardBtnSolid]}
                          onPress={handleRegenerateProgram}
                          disabled={isRegenerating}
                          activeOpacity={0.8}
                        >
                          {isRegenerating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <RefreshCw size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                              <Text style={styles.planCardBtnSolidText}>Re-generate</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.planCreateCustomBtn}
                        onPress={handleOpenCustomProgramModal}
                        activeOpacity={0.8}
                      >
                        <Plus size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.planCreateCustomBtnText}>Create Custom Plan</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Render split days (sorted by day number) */}
                    {[...(currentProgram.days || [])]
                      .sort((a: any, b: any) => (a.dayNumber || 0) - (b.dayNumber || 0))
                      .map((day: any, dIdx: number) => {
                      const totalDays = currentProgram.days?.length || 1;
                      let isDayActive = false;
                      if (history.length > 0) {
                        const latestSession = history[0];
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const dayVal = String(now.getDate()).padStart(2, '0');
                        const todayStr = `${year}-${month}-${dayVal}`;

                        if (latestSession && latestSession.date === todayStr) {
                          isDayActive = Math.max(0, history.length - 1) % totalDays === dIdx;
                        } else {
                          isDayActive = history.length % totalDays === dIdx;
                        }
                      } else {
                        isDayActive = dIdx === 0;
                      }
                      
                      return (
                        <View key={day.id || dIdx} style={[styles.planDayCard, isDayActive && styles.planDayCardActive]}>
                          <View style={styles.planDayHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[styles.planDayBadge, isDayActive && styles.planDayBadgeActive]}>
                                <Text style={[styles.planDayBadgeText, isDayActive && styles.planDayBadgeTextActive]}>{day.dayNumber}</Text>
                              </View>
                              <Text style={[styles.planDayTitle, isDayActive && styles.planDayTitleActive]}>
                                {day.title} {isDayActive && <Text style={styles.activeDayIndicator}>(Active Day)</Text>}
                              </Text>
                            </View>
                            
                            <TouchableOpacity
                              style={styles.planAddExIconBtn}
                              onPress={() => handleOpenAddPlanEx(day.id)}
                              activeOpacity={0.7}
                            >
                              <Plus size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>

                          {/* Exercise List for this Day */}
                          <View style={styles.planExList}>
                            {day.exercises && day.exercises.length > 0 ? (
                              day.exercises.map((pde: any, eIdx: number) => (
                                <View key={pde.id || eIdx} style={styles.planExRow}>
                                  <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={styles.planExName}>
                                      {pde.exercise?.displayName
                                        || pde.exercise?.name?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                                        || 'Exercise'}
                                    </Text>
                                    <Text style={styles.planExDetails}>
                                      {pde.targetSets || 3} sets × {pde.targetRepsRange || '8-12'} reps
                                    </Text>
                                  </View>
                                  
                                  <View style={styles.planExActionsRow}>
                                    <TouchableOpacity
                                      style={styles.planExActionBtn}
                                      onPress={() => handleOpenEditPlanEx(pde)}
                                      activeOpacity={0.7}
                                    >
                                      <Edit2 size={16} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.planExActionBtn}
                                      onPress={() => handleRemovePlanEx(pde.id)}
                                      activeOpacity={0.7}
                                    >
                                      <Trash2 size={16} color="#DC2626" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <View style={styles.planExEmpty}>
                                <Text style={styles.planExEmptyText}>No exercises in this split day.</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.planEmptyCard}>
                    <CreationIcon size={40} color={COLORS.primary} style={{ marginBottom: 12 }} />
                    <Text style={styles.planEmptyText}>No training plan assigned yet.</Text>
                    <TouchableOpacity
                      style={styles.planEmptyBtn}
                      onPress={() => setIsGenModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.planEmptyBtnText}>Generate Personalized Plan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.planEmptyBtn, { marginTop: 12, backgroundColor: COLORS.surfaceLight }]}
                      onPress={() => setIsCatalogModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <BookOpen size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.planEmptyBtnText, { color: COLORS.primary }]}>Browse Exercise Catalog</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.planEmptyBtn, { marginTop: 12, backgroundColor: COLORS.primaryLight }]}
                      onPress={handleOpenProgramSelector}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.planEmptyBtnText, { color: COLORS.primary }]}>Choose Manual Program</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Active Workout Logger View */
          <View>
            {/* Fixed Timer & Stats Panel */}
            <View style={styles.activeTimerCard}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>DURATION</Text>
                  <Text style={styles.statValueLarge}>{formatDuration(workoutDuration)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>TOTAL VOLUME</Text>
                  <Text style={styles.statValueLarge}>{calculateTotalLoggedVolume()} kg</Text>
                </View>
              </View>

              <View style={styles.activeActionsRow}>
                <TouchableOpacity
                  onPress={handleDiscardWorkout}
                  style={styles.discardBtn}
                  activeOpacity={0.7}
                >
                  <X size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                  <Text style={styles.discardBtnText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsFinishModalVisible(true)}
                  style={styles.completeBtn}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeBtnText}>Finish Workout</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* List of exercises currently added */}
            {activeExercises.length > 0 ? (
              activeExercises.map((ae) => (
                <View key={ae.exerciseId} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => toggleCollapse(ae.exerciseId)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingRight: 8 }}>
                        {collapsedExercises[ae.exerciseId] ? (
                          <ChevronRight size={18} color={COLORS.text} style={{ marginRight: 6 }} />
                        ) : (
                          <ChevronDown size={18} color={COLORS.text} style={{ marginRight: 6 }} />
                        )}
                        <Text style={[styles.exerciseTitle, { flexShrink: 1 }]}>{ae.name}</Text>
                      </View>
                      
                      {collapsedExercises[ae.exerciseId] ? (
                        <Text style={styles.exerciseSummaryText}>
                          {ae.sets.length} {ae.sets.length === 1 ? 'set' : 'sets'} • {ae.sets.filter(s => s.completed).length} completed
                        </Text>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {ae.source === 'exercicedb' && (
                            <View style={styles.badgeExerciseDb}>
                              <LightningIcon size={10} color="#7C3AED" style={{ marginRight: 3 }} />
                              <Text style={styles.badgeTextExerciseDb}>ExerciseDB</Text>
                            </View>
                          )}
                          {ae.source === 'wger' && (
                            <View style={styles.badgeWger}>
                              <BookOpen size={10} color="#069667" style={{ marginRight: 3 }} />
                              <Text style={styles.badgeTextWger}>Wger</Text>
                            </View>
                          )}
                          {ae.gifUrl && (
                            <TouchableOpacity
                              onPress={() => togglePreview(ae.exerciseId)}
                              style={styles.previewBtn}
                              activeOpacity={0.7}
                            >
                              {expandedPreviews[ae.exerciseId] ? (
                                <>
                                  <EyeOff size={10} color={COLORS.primary} style={{ marginRight: 4 }} />
                                  <Text style={styles.previewBtnText}>Hide Animation</Text>
                                </>
                              ) : (
                                <>
                                  <Eye size={10} color={COLORS.primary} style={{ marginRight: 4 }} />
                                  <Text style={styles.previewBtnText}>Show Animation</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      
                      {!collapsedExercises[ae.exerciseId] && !ae.gifUrl && ae.source && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                          <ImageOff size={10} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 10, color: COLORS.textMuted }}>No preview available</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(ae.exerciseId)}
                      style={styles.deleteExBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {!collapsedExercises[ae.exerciseId] && (
                    <>
                      {ae.gifUrl && expandedPreviews[ae.exerciseId] && (
                        <View style={styles.gifContainer}>
                          <Image
                            source={{ uri: ae.gifUrl.startsWith('/') ? `${API_BASE_URL.replace('/api/v1', '')}${ae.gifUrl}` : ae.gifUrl }}
                            style={styles.gifImage}
                            resizeMode="contain"
                          />
                        </View>
                      )}

                      {/* Header Row for set log columns */}
                      <View style={styles.setRowLabels}>
                        <Text style={[styles.setLabelCol, { width: '12%' }]}>Set</Text>
                        <Text style={[styles.setLabelCol, { width: '25%', textAlign: 'center' }]}>Previous</Text>
                        <Text style={[styles.setLabelCol, { width: '25%', textAlign: 'center' }]}>kg</Text>
                        <Text style={[styles.setLabelCol, { width: '25%', textAlign: 'center' }]}>Reps</Text>
                        <Text style={[styles.setLabelCol, { width: '13%', textAlign: 'right' }]}>Tick</Text>
                      </View>

                      {/* Set log inputs rows */}
                      {ae.sets.map((set) => (
                        <View key={set.setNumber} style={[styles.setInputsRow, set.completed && styles.setRowCompleted]}>
                          <Text style={[styles.setNumText, { width: '12%' }, set.completed && styles.setNumTextCompleted]}>
                            {set.setNumber}
                          </Text>
                          
                          <Text style={[styles.setPrevText, { width: '25%', textAlign: 'center' }]}>
                            —
                          </Text>
                          
                          <View style={[styles.setInputWrapper, { width: '25%' }]}>
                            <TextInput
                              style={[
                                styles.setInput,
                                set.completed && styles.setInputCompleted
                              ]}
                              value={set.weight.toString()}
                              keyboardType="numeric"
                              onChangeText={(v) => handleEditSet(ae.exerciseId, set.setNumber, 'weight', v)}
                              editable={!set.completed}
                            />
                          </View>

                          <View style={[styles.setInputWrapper, { width: '25%' }]}>
                            <TextInput
                              style={[
                                styles.setInput,
                                set.completed && styles.setInputCompleted
                              ]}
                              value={set.reps.toString()}
                              keyboardType="numeric"
                              onChangeText={(v) => handleEditSet(ae.exerciseId, set.setNumber, 'reps', v)}
                              editable={!set.completed}
                            />
                          </View>

                          <View style={[{ width: '13%', alignItems: 'flex-end' }]}>
                            <TouchableOpacity
                              style={[styles.checkbox, set.completed && styles.checkboxChecked]}
                              onPress={() => handleToggleSetComplete(ae.exerciseId, set.setNumber)}
                              activeOpacity={0.8}
                            >
                              {set.completed && <Check size={12} color="#FFF" />}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {/* Add/Remove set buttons split */}
                      <View style={styles.splitSetButtonsRow}>
                        <TouchableOpacity
                          onPress={() => handleRemoveSet(ae.exerciseId)}
                          style={[styles.setSplitBtn, styles.setRemoveSplitBtn]}
                          activeOpacity={0.7}
                        >
                          <MinusCircle size={14} color={COLORS.error} style={{ marginRight: 6 }} />
                          <Text style={styles.removeSetBtnText}>Remove Set</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleAddSet(ae.exerciseId)}
                          style={[styles.setSplitBtn, styles.setAddSplitBtn]}
                          activeOpacity={0.7}
                        >
                          <PlusCircle size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.addSetBtnText}>Add Set</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))
            ) : (
              <StateFeedback
                type="empty"
                title="Your active routine is empty"
                description="Tap 'Add Exercise' below to select and log exercises to this workout!"
                icon={<DumbbellIcon size={34} color={COLORS.primary} />}
              />
            )}

            {/* Add Exercise Trigger Button */}
            <TouchableOpacity
              onPress={() => setIsExerciseModalVisible(true)}
              style={styles.generalAddExBtn}
              activeOpacity={0.7}
            >
              <PlusCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.generalAddExText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Exercise Selection Modal */}
      <Modal
        visible={isExerciseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Choose Exercise</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsExerciseModalVisible(false);
                  setSearchQuery('');
                  setExerciseResults([]);
                }}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBarWrapper}>
              <Search size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchExercises}
                placeholder="Search Bench, Squats, Pullups..."
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
            </View>

            {isSearching ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={exerciseResults.length > 0 ? exerciseResults : FALLBACK_EXERCISES}
                keyExtractor={(item) => item.id}
                style={{ marginTop: 16 }}
                ListHeaderComponent={
                  <Text style={styles.searchHeaderTitle}>
                    {exerciseResults.length > 0 ? 'Search Results' : 'Common Exercises'}
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAddExerciseToWorkout(item)}
                    style={styles.exerciseResultRow}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.execResultName}>{item.displayName || item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.execResultMuscle}>
                          {typeof item.muscleGroup === 'object' ? item.muscleGroup?.name : item.muscleGroup}
                        </Text>
                        {(item as any).source === 'exercicedb' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED22', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                            <LightningIcon size={9} color="#7C3AED" style={{ marginRight: 2 }} />
                            <Text style={{ fontSize: 9, color: '#7C3AED', fontWeight: '600' }}>ExerciseDB</Text>
                          </View>
                        )}
                        {(item as any).source === 'wger' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#06966722', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                            <BookOpen size={9} color="#069667" style={{ marginRight: 2 }} />
                            <Text style={{ fontSize: 9, color: '#069667', fontWeight: '600' }}>Wger</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Finish Workout RPE Modal */}
      <Modal
        visible={isFinishModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsFinishModalVisible(false)}
      >
        <View style={styles.finishModalOverlay}>
          <View style={styles.finishModalContent}>
            <TrophyIcon size={36} color={COLORS.primary} style={{ marginBottom: 8, opacity: 0.9 }} />
            <Text style={styles.finishModalTitle}>How was your workout?</Text>
            
            <Text style={styles.finishModalSubText}>
              This will automatically adapt your program plan
            </Text>

            {/* Zone Status Pill */}
            <View style={[styles.rpeZonePill, { backgroundColor: getRpeColor(parseInt(rpe)) + '18' }]}>
              <View style={[styles.rpeZoneDot, { backgroundColor: getRpeColor(parseInt(rpe)) }]} />
              <Text style={[styles.rpeZonePillLabel, { color: getRpeColor(parseInt(rpe)) }]}>
                {getRpeStatusText(parseInt(rpe))}
              </Text>
              <Text style={styles.rpeZonePillNumber}> · {rpe} / 10</Text>
            </View>

            {/* Segmented 3-zone Slider */}
            <View
              ref={sliderRef}
              style={styles.sliderContainer}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setSliderWidth(w);
                sliderWidthRef.current = w;
                sliderRef.current?.measure((_: number, __: number, ___: number, ____: number, px: number) => {
                  sliderPageX.current = px;
                });
              }}
              {...rpeSliderPan.panHandlers}
            >
              {/* 3-zone colored track */}
              <View pointerEvents="none" style={styles.rpeTrackRow}>
                <View style={[styles.rpeTrackSegment, {
                  flex: 3,
                  backgroundColor: '#34C759',
                  opacity: parseInt(rpe) <= 3 ? 1 : 0.32,
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                  marginRight: 3,
                }]} />
                <View style={[styles.rpeTrackSegment, {
                  flex: 3,
                  backgroundColor: '#FF9500',
                  opacity: parseInt(rpe) >= 4 && parseInt(rpe) <= 6 ? 1 : parseInt(rpe) > 6 ? 0.42 : 0.18,
                  marginHorizontal: 1,
                }]} />
                <View style={[styles.rpeTrackSegment, {
                  flex: 4,
                  backgroundColor: '#FF3B30',
                  opacity: parseInt(rpe) >= 7 ? 1 : 0.18,
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                  marginLeft: 3,
                }]} />
              </View>

              {/* Floating thumb with number */}
              <View
                pointerEvents="none"
                style={[styles.rpeThumb, {
                  left: ((parseInt(rpe) - 1) / 9) * (sliderWidth - 36),
                  borderColor: getRpeColor(parseInt(rpe)),
                  shadowColor: getRpeColor(parseInt(rpe)),
                }]}
              >
                <Text style={[styles.rpeThumbText, { color: getRpeColor(parseInt(rpe)) }]}>{rpe}</Text>
              </View>
            </View>

            {/* Zone boundary labels */}
            <View style={styles.rpeLabelRow}>
              <Text style={[styles.rpeLabelText, parseInt(rpe) <= 3 && { color: '#34C759', fontWeight: '800' }]}>Easy</Text>
              <Text style={[styles.rpeLabelText, parseInt(rpe) >= 4 && parseInt(rpe) <= 6 && { color: '#FF9500', fontWeight: '800' }]}>Moderate</Text>
              <Text style={[styles.rpeLabelText, parseInt(rpe) >= 7 && { color: '#FF3B30', fontWeight: '800' }]}>Hard</Text>
            </View>

            {/* Adaptation hint */}
            <View style={[styles.adaptHintRow, { backgroundColor: getRpeColor(parseInt(rpe)) + '12' }]}>
              <LightningIcon size={12} color={getRpeColor(parseInt(rpe))} style={{ marginRight: 6 }} />
              <Text style={[styles.adaptHintText, { color: getRpeColor(parseInt(rpe)) }]}>
                {getRpeAdaptationText(parseInt(rpe))}
              </Text>
            </View>

            <View style={styles.finishActionsRow}>
              <TouchableOpacity
                onPress={() => setIsFinishModalVisible(false)}
                style={styles.cancelFinishBtn}
              >
                <Text style={styles.cancelFinishText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCompleteWorkout}
                style={styles.confirmFinishBtn}
              >
                <Text style={styles.confirmFinishText}>Log Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                        <TrophyIcon size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
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

      {/* Program Selector Modal */}
      <Modal
        visible={isProgramSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsProgramSelectorVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsProgramSelectorVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitleText}>Choose Workout Program</Text>
                <TouchableOpacity onPress={() => setIsProgramSelectorVisible(false)}>
                  <X size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {/* Home / Gym tab toggle */}
              <View style={styles.programSelectorTabs}>
                <TouchableOpacity
                  style={[styles.programSelectorTab, programSelectorTab === 'gym' && styles.programSelectorTabActive]}
                  onPress={() => setProgramSelectorTab('gym')}
                  activeOpacity={0.8}
                >
                  <DumbbellIcon size={14} color={programSelectorTab === 'gym' ? COLORS.primary : COLORS.textLight} />
                  <Text style={[styles.programSelectorTabText, programSelectorTab === 'gym' && styles.programSelectorTabTextActive]}>
                    Gym
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.programSelectorTab, programSelectorTab === 'home' && styles.programSelectorTabActive]}
                  onPress={() => setProgramSelectorTab('home')}
                  activeOpacity={0.8}
                >
                  <RunIcon size={14} color={programSelectorTab === 'home' ? COLORS.primary : COLORS.textLight} />
                  <Text style={[styles.programSelectorTabText, programSelectorTab === 'home' && styles.programSelectorTabTextActive]}>
                    Home
                  </Text>
                </TouchableOpacity>
              </View>

              {fetchingPrograms ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {allPrograms
                    .filter((p) => (p.location || 'gym') === programSelectorTab)
                    .map((program) => {
                      const isActive = currentProgram?.id === program.id;
                      const lvl = (program.level || 'beginner').toLowerCase();
                      const levelColor = lvl === 'advanced' ? '#DC2626' : lvl === 'intermediate' ? '#EA580C' : '#059669';
                      const levelBg   = lvl === 'advanced' ? '#FEF2F2' : lvl === 'intermediate' ? '#FFF7ED' : '#ECFDF5';
                      return (
                        <TouchableOpacity
                          key={program.id}
                          style={[styles.programSelectCard, isActive && styles.programSelectCardActive]}
                          onPress={() => handleSelectProgram(program.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.programSelectHeader}>
                            <Text style={[styles.programSelectName, isActive && { color: COLORS.primary }]} numberOfLines={2}>
                              {program.name}
                            </Text>
                            <View style={[styles.programLevelBadge, { backgroundColor: levelBg }]}>
                              <Text style={[styles.programLevelBadgeText, { color: levelColor }]}>
                                {program.level?.toUpperCase() || 'BEGINNER'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.programSelectDesc} numberOfLines={2}>{program.description}</Text>
                          <Text style={styles.programSelectDaysCount}>
                            {program.days?.length || 0} training days / week
                          </Text>
                          {isActive && (
                            <View style={styles.programSelectActiveBadge}>
                              <Text style={styles.programSelectActiveBadgeText}>Current Plan</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  {allPrograms.filter((p) => (p.location || 'gym') === programSelectorTab).length === 0 && !fetchingPrograms && (
                    <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 32, fontSize: 14 }}>
                      No {programSelectorTab} programs available.
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Create Custom Program Modal */}
      <Modal
        visible={isCustomProgramModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCustomProgramModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsCustomProgramModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitleText}>Create Custom Plan</Text>
                <TouchableOpacity 
                  onPress={() => setIsCustomProgramModalVisible(false)}
                >
                  <X size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Program Name */}
                <Text style={styles.inputLabel}>Plan Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Strength Push-Pull-Legs"
                  placeholderTextColor={COLORS.textMuted}
                  value={customProgramName}
                  onChangeText={setCustomProgramName}
                />

                {/* Program Description */}
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. 3-day split focused on heavy compound movements"
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={2}
                  value={customProgramDesc}
                  onChangeText={setCustomProgramDesc}
                />

                {/* Experience Level */}
                <Text style={styles.inputLabel}>Target Experience Level</Text>
                <View style={styles.levelSelectorContainer}>
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelSelectorBtn,
                        customProgramLevel === lvl && styles.levelSelectorBtnActive
                      ]}
                      onPress={() => setCustomProgramLevel(lvl)}
                    >
                      <Text
                        style={[
                          styles.levelSelectorText,
                          customProgramLevel === lvl && styles.levelSelectorTextActive
                        ]}
                      >
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Split Days List */}
                <View style={styles.daysHeaderRow}>
                  <Text style={styles.inputLabel}>Workout Days / Splits</Text>
                  <TouchableOpacity 
                    style={styles.addDayInlineBtn}
                    onPress={handleAddCustomDay}
                  >
                    <Plus size={14} color={COLORS.primary} style={{ marginRight: 2 }} />
                    <Text style={styles.addDayInlineText}>Add Day</Text>
                  </TouchableOpacity>
                </View>

                {customProgramDays.map((day, idx) => (
                  <View key={day.id} style={styles.customDayInputRow}>
                    <Text style={styles.customDayNumberLabel}>{idx + 1}</Text>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                      placeholder={`e.g. Day ${idx + 1}: Push`}
                      placeholderTextColor={COLORS.textMuted}
                      value={day.title}
                      onChangeText={(txt) => handleUpdateCustomDayTitle(day.id, txt)}
                    />
                    <TouchableOpacity
                      style={styles.removeDayBtn}
                      onPress={() => handleRemoveCustomDay(day.id)}
                    >
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}

                {customProgramDays.length === 0 && (
                  <Text style={styles.noDaysWarningText}>
                    Please add at least one workout day to this plan.
                  </Text>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveCustomProgramBtn}
                  onPress={handleSaveCustomProgram}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveCustomProgramBtnText}>Create & Assign Plan</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Personalized Workout Generator Wizard Modal */}
      <Modal
        visible={isGenModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsGenModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsGenModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CreationIcon size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitleText}>AI Workout Generator</Text>
                </View>
                <TouchableOpacity onPress={() => setIsGenModalVisible(false)}>
                  <X size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>
                  Generate a highly personalized training split tailored to your exact goal, schedule, and equipment.
                </Text>

                {/* Goal Selection */}
                <Text style={styles.inputLabel}>Choose Your Goal</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[
                    { key: 'fat_loss', label: 'Fat Loss' },
                    { key: 'hypertrophy', label: 'Hypertrophy' },
                    { key: 'strength', label: 'Strength' },
                    { key: 'endurance', label: 'Endurance' }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.levelSelectorBtn,
                        { flex: 0, paddingHorizontal: 12 },
                        genGoal === item.key && styles.levelSelectorBtnActive
                      ]}
                      onPress={() => setGenGoal(item.key)}
                    >
                      <Text style={[styles.levelSelectorText, genGoal === item.key && styles.levelSelectorTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Level Selection */}
                <Text style={styles.inputLabel}>Fitness Experience Level</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelSelectorBtn,
                        { flex: 0, paddingHorizontal: 12 },
                        genLevel === lvl && styles.levelSelectorBtnActive
                      ]}
                      onPress={() => setGenLevel(lvl)}
                    >
                      <Text style={[styles.levelSelectorText, genLevel === lvl && styles.levelSelectorTextActive]}>
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Days Selection */}
                <Text style={styles.inputLabel}>Days Available Per Week</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[2, 3, 4, 5, 6].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.levelSelectorBtn,
                        { flex: 0, width: 45, alignItems: 'center' },
                        genDays === days && styles.levelSelectorBtnActive
                      ]}
                      onPress={() => setGenDays(days)}
                    >
                      <Text style={[styles.levelSelectorText, genDays === days && styles.levelSelectorTextActive]}>
                        {days}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Equipment Checklist */}
                <Text style={styles.inputLabel}>Equipment Access</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {['dumbbell', 'barbell', 'machine', 'cable', 'bodyweight', 'kettlebell'].map((eq) => {
                    const hasAccess = genEquipment.includes(eq);
                    return (
                      <TouchableOpacity
                        key={eq}
                        style={[
                          styles.levelSelectorBtn,
                          { flex: 0, paddingHorizontal: 12 },
                          hasAccess && styles.levelSelectorBtnActive
                        ]}
                        onPress={() => {
                          if (hasAccess) {
                            setGenEquipment(genEquipment.filter(item => item !== eq));
                          } else {
                            setGenEquipment([...genEquipment, eq]);
                          }
                        }}
                      >
                        <Text style={[styles.levelSelectorText, hasAccess && styles.levelSelectorTextActive]}>
                          {eq.charAt(0).toUpperCase() + eq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Injuries */}
                <Text style={styles.inputLabel}>Injuries / Physical Limitations</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. Lower back pain, shoulder impingement (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={2}
                  value={genInjuriesText}
                  onChangeText={setGenInjuriesText}
                />

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.saveCustomProgramBtn, { marginTop: 12, backgroundColor: COLORS.primary }]}
                  onPress={handleGenerateWorkoutPlan}
                  disabled={isGenerating}
                  activeOpacity={0.8}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CreationIcon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.saveCustomProgramBtnText}>Generate My Plan Now</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Catalog Modal */}
      <Modal
        visible={isCatalogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCatalogModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsCatalogModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <BookOpen size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitleText}>Exercise Catalog</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCatalogModalVisible(false)}>
                  <X size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {/* Sync Button */}
              <TouchableOpacity
                style={[styles.planCreateCustomBtn, { marginBottom: 12, backgroundColor: COLORS.surfaceLight }]}
                onPress={handleSyncExercises}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RefreshCw size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.planCreateCustomBtnText, { color: COLORS.primary }]}>Sync External Catalog</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Search Box */}
              <View style={styles.searchContainer}>
                <Search size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search catalog..."
                  value={catalogQuery}
                  onChangeText={setCatalogQuery}
                  autoCorrect={false}
                />
              </View>

              {/* Muscle Filters */}
              <Text style={styles.inputLabelSmall}>Muscle Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {['', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'].map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      styles.levelSelectorBtn,
                      { flex: 0, paddingHorizontal: 10, marginRight: 6, paddingVertical: 6 },
                      catalogMuscle === muscle && styles.levelSelectorBtnActive
                    ]}
                    onPress={() => setCatalogMuscle(muscle)}
                  >
                    <Text style={[styles.levelSelectorText, { fontSize: 12 }, catalogMuscle === muscle && styles.levelSelectorTextActive]}>
                      {muscle ? muscle.toUpperCase() : 'ALL'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Equipment Filters */}
              <Text style={styles.inputLabelSmall}>Equipment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['', 'bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'kettlebell'].map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.levelSelectorBtn,
                      { flex: 0, paddingHorizontal: 10, marginRight: 6, paddingVertical: 6 },
                      catalogEquipment === eq && styles.levelSelectorBtnActive
                    ]}
                    onPress={() => setCatalogEquipment(eq)}
                  >
                    <Text style={[styles.levelSelectorText, { fontSize: 12 }, catalogEquipment === eq && styles.levelSelectorTextActive]}>
                      {eq ? eq.toUpperCase() : 'ALL'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Exercises List */}
              {isCatalogLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
              ) : (
                <FlatList
                  data={catalogExercises}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.catalogSearchItem, { paddingVertical: 12 }]}
                      onPress={() => setSelectedCatalogExercise(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogSearchName}>{item.displayName || item.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: COLORS.surfaceLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{typeof item.muscleGroup === 'object' ? item.muscleGroup?.name : item.muscleGroup}</Text>
                          </View>
                          <View style={{ backgroundColor: COLORS.surfaceLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{typeof item.equipment === 'object' ? item.equipment?.name : item.equipment}</Text>
                          </View>
                          <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: COLORS.primary }}>{item.difficulty}</Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginVertical: 30 }}>
                      <Text style={{ color: COLORS.textMuted }}>No catalog exercises match your filters.</Text>
                    </View>
                  }
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Catalog Exercise Details Card Overlay Modal */}
      <Modal
        visible={selectedCatalogExercise !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedCatalogExercise(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedCatalogExercise(null)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              {selectedCatalogExercise && (
                <View style={{ flex: 1 }}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitleText}>{selectedCatalogExercise.displayName || selectedCatalogExercise.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedCatalogExercise(null)}>
                      <X size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {/* Badge details */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                      <View style={{ backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Muscle: {selectedCatalogExercise.muscleGroup}</Text>
                      </View>
                      <View style={{ backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Equipment: {selectedCatalogExercise.equipment}</Text>
                      </View>
                      <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: COLORS.primary }}>Difficulty: {selectedCatalogExercise.difficulty}</Text>
                      </View>
                    </View>

                    {selectedCatalogExercise.description && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.inputLabelSmall}>Description</Text>
                        <Text style={{ color: COLORS.textLight, fontSize: 13, lineHeight: 18 }}>
                          {selectedCatalogExercise.description}
                        </Text>
                      </View>
                    )}

                    {selectedCatalogExercise.instructions && selectedCatalogExercise.instructions.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.inputLabelSmall}>Instructions</Text>
                        {(Array.isArray(selectedCatalogExercise.instructions) 
                          ? selectedCatalogExercise.instructions 
                          : typeof selectedCatalogExercise.instructions === 'string'
                            ? JSON.parse(selectedCatalogExercise.instructions)
                            : []
                        ).map((step: string, idx: number) => (
                          <Text key={idx} style={{ color: COLORS.textLight, fontSize: 13, marginBottom: 6, lineHeight: 18 }}>
                            {idx + 1}. {step}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Add to plan parameters picker */}
                    <View style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 10 }]}>Add to Training Plan Day</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 4 }}>Day (Split)</Text>
                          <TextInput
                            style={[styles.modalInput, { marginBottom: 0 }]}
                            keyboardType="number-pad"
                            defaultValue="1"
                            onChangeText={(val) => {
                              (selectedCatalogExercise as any)._targetDay = Number(val) || 1;
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 4 }}>Sets</Text>
                          <TextInput
                            style={[styles.modalInput, { marginBottom: 0 }]}
                            keyboardType="number-pad"
                            defaultValue="3"
                            onChangeText={(val) => {
                              (selectedCatalogExercise as any)._sets = val;
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 4 }}>Reps Range</Text>
                          <TextInput
                            style={[styles.modalInput, { marginBottom: 0 }]}
                            defaultValue="8-12"
                            onChangeText={(val) => {
                              (selectedCatalogExercise as any)._reps = val;
                            }}
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.saveCustomProgramBtn, { backgroundColor: COLORS.primary, marginTop: 4 }]}
                        onPress={() => {
                          const targetDay = (selectedCatalogExercise as any)._targetDay || 1;
                          const sets = (selectedCatalogExercise as any)._sets || '3';
                          const reps = (selectedCatalogExercise as any)._reps || '8-12';
                          handleAddCatalogExerciseToPlan(selectedCatalogExercise, targetDay, sets, reps);
                        }}
                      >
                        <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveCustomProgramBtnText}>Add Exercise to Plan</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Edit Program Exercise Target Modal */}
      <Modal
        visible={isEditPlanExModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEditPlanExModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editPlanModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Edit Target Parameters</Text>
              <TouchableOpacity onPress={() => setIsEditPlanExModalVisible(false)}>
                <X size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.editModalExName}>{editingPlanEx?.exercise?.name}</Text>

            <Text style={styles.inputLabel}>Target Sets</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={editTargetSets}
              onChangeText={setEditTargetSets}
              placeholder="e.g. 3"
            />

            <Text style={styles.inputLabel}>Target Reps Range / Value</Text>
            <TextInput
              style={styles.modalInput}
              value={editTargetRepsRange}
              onChangeText={setEditTargetRepsRange}
              placeholder="e.g. 8-12 or 15"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => setIsEditPlanExModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePlanExEdit}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveBtnText}>Save Target</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Exercise to Program Day Modal */}
      <Modal
        visible={isAddPlanExModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddPlanExModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addPlanModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Add Exercise to Split</Text>
              <TouchableOpacity onPress={() => setIsAddPlanExModalVisible(false)}>
                <X size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Exercise Catalog Search */}
            <View style={styles.searchContainer}>
              <Search size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercise catalog..."
                value={addPlanExQuery}
                onChangeText={handleSearchAddPlanExercises}
                autoCorrect={false}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.inputLabelSmall}>Sets</Text>
                <TextInput
                  style={styles.modalInputSmall}
                  keyboardType="number-pad"
                  value={addPlanExSets}
                  onChangeText={setAddPlanExSets}
                />
              </View>
              <View style={{ width: '48%' }}>
                <Text style={styles.inputLabelSmall}>Reps</Text>
                <TextInput
                  style={styles.modalInputSmall}
                  value={addPlanExRepsRange}
                  onChangeText={setAddPlanExRepsRange}
                />
              </View>
            </View>

            {isSearchingAddPlanEx ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={addPlanExResults.length > 0 ? addPlanExResults : FALLBACK_EXERCISES}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 200, marginBottom: 15 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.catalogSearchItem}
                    onPress={() => handleConfirmAddExerciseToPlan(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catalogSearchName}>{item.displayName || item.name}</Text>
                      <Text style={styles.catalogSearchGroup}>{typeof item.muscleGroup === 'object' ? item.muscleGroup?.name : item.muscleGroup}</Text>
                    </View>
                    <Plus size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyCatalogText}>No matching exercises found.</Text>
                }
              />
            )}

            <TouchableOpacity
              onPress={() => setIsAddPlanExModalVisible(false)}
              style={styles.addPlanCancelBtn}
            >
              <Text style={styles.addPlanCancelBtnText}>Close</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Charts
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 32,
    padding: 20,
    ...SHADOWS.card,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  periodSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  periodSwitchButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  periodSwitchButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  periodSwitchText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '700',
  },
  periodSwitchTextActive: {
    color: COLORS.primary,
  },
  svgContainer: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Start session
  startSessionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  startCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  startCardSub: {
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 20,
  },
  startWorkoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startWorkoutText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  // History logs list
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 28,
    marginBottom: 14,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  historyDuration: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  historyName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  historyExecsList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    gap: 6,
  },
  historyExecItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyExecName: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  historyExecMore: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyHistoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 24,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  // Active Timer Panel
  activeTimerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  activeActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  discardBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  completeBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyActiveCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 32,
    marginBottom: 16,
  },
  emptyActiveText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  // Active Exercises Cards
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  gifContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  badgeExerciseDb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeTextExerciseDb: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '700',
  },
  badgeWger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeTextWger: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  previewBtnText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
  deleteExBtn: {
    padding: 4,
  },
  setRowLabels: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  setLabelCol: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  setInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginVertical: 3,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  setNumText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  setNumTextCompleted: {
    color: COLORS.success,
  },
  setPrevText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  setInputWrapper: {
    alignItems: 'center',
  },
  setInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    width: 60,
    height: 34,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  setInputCompleted: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: '#64748B',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  exerciseSummaryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  splitSetButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  setSplitBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setRemoveSplitBtn: {
    backgroundColor: '#FEF2F2',
  },
  setAddSplitBtn: {
    backgroundColor: COLORS.primaryLight,
  },
  removeSetBtnText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '700',
  },
  addSetBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  generalAddExBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 40,
    ...SHADOWS.subtle,
  },
  generalAddExText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // Modal standard Layouts
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
    height: '75%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchHeaderTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exerciseResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  execResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  execResultMuscle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  // Finish Modal
  finishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '90%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  finishModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  finishModalDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  finishModalSubText: {
    fontSize: 12,
    color: COLORS.textLight,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 24,
  },
  rpeZonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  rpeZoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  rpeZonePillLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rpeZonePillNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sliderContainer: {
    width: '100%',
    height: 52,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  rpeTrackRow: {
    flexDirection: 'row',
    height: 14,
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  rpeTrackSegment: {
    height: '100%',
  },
  rpeThumb: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  rpeThumbText: {
    fontSize: 15,
    fontWeight: '900',
  },
  rpeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  rpeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  adaptHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 28,
  },
  adaptHintText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  finishActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelFinishBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelFinishText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmFinishBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmFinishText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.subtle,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
  },

  // Plan tab layout styles
  planInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 5,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  planLevelPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
  },
  planLevelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#059669',
  },
  planDaysChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planDaysChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  planLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planLocationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  planInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planProgramTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  planBadgeContainer: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  planDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  planCardBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  planCardBtnSolid: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  planCardBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  planCardBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  planCardBtnOutlineText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  planProgramDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 19,
  },

  // Plan split day cards
  planDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  planDayCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  planDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planDayBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  planDayBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  planDayBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  planDayBadgeTextActive: {
    color: '#FFFFFF',
  },
  planDayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  planDayTitleActive: {
    color: COLORS.primary,
  },
  activeDayIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  planAddExIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Plan day exercises list
  planExList: {
    gap: 8,
  },
  planExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planExName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.1,
  },
  planExDetails: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  planExActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planExActionBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planExEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  planExEmptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  planEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  planEmptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 14,
    fontWeight: '500',
  },
  planEmptyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  planEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Edit / Add Modal Specific Styles
  editPlanModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  editModalExName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 14,
    fontWeight: '600',
  },
  modalInputSmall: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: COLORS.textLight,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },

  // Add Plan Exercise Styles
  addPlanModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    height: '65%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  catalogSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catalogSearchName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  catalogSearchGroup: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyCatalogText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  addPlanCancelBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addPlanCancelBtnText: {
    color: COLORS.textLight,
    fontWeight: '700',
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
  programSelectorTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  programSelectorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  programSelectorTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  programSelectorTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  programSelectorTabTextActive: {
    color: COLORS.primary,
  },
  programSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  programSelectCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight,
  },
  programSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  programSelectName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  programSelectDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  programSelectDaysCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  programSelectActiveBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  programSelectActiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  programLevelBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
  },
  programLevelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  runHistoryCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  runRouteHero: {
    width: '100%',
    height: 130,
    backgroundColor: '#0F1115',
    overflow: 'hidden',
    position: 'relative',
  },
  runRouteHeroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  runRouteHeroPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  runDistanceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  runDistanceBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  runCardInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  runCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  runCardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  runStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  runStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  runStatColumn: {
    flex: 1,
    alignItems: 'center',
  },
  runStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  runStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  runCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  runDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 5,
  },
  runDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
  },
  planCreateCustomBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  planCreateCustomBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  levelSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  levelSelectorBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelSelectorBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  levelSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  levelSelectorTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addDayInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  addDayInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customDayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  customDayNumberLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  removeDayBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  noDaysWarningText: {
    fontSize: 12,
    color: COLORS.error,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  saveCustomProgramBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.subtle,
  },
  saveCustomProgramBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
