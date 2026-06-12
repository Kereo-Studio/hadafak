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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../theme/colors';
import {
  Dumbbell,
  Play,
  Check,
  Trash2,
  Search,
  X,
  PlusCircle,
  Timer,
  Award,
  Clock,
  ChevronRight,
  TrendingUp,
  Edit2,
  Plus,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExercise {
  exerciseId: string;
  name: string;
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
  const [rpe, setRpe] = useState('7');

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

  const renderMiniRoutePath = (coords: { latitude: number; longitude: number }[]) => {
    if (!coords || coords.length < 2) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    coords.forEach(pt => {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    });
    
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);
    
    if (maxSpan === 0) return null;
    
    const size = 50;
    const padding = 4;
    const innerSize = size - padding * 2;
    
    const points = coords.map(pt => {
      const x = padding + ((pt.longitude - minLng) / maxSpan) * innerSize;
      const y = padding + (1 - (pt.latitude - minLat) / maxSpan) * innerSize;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    const pathData = `M ${points.join(' L ')}`;
    
    return (
      <Svg width={size} height={size} style={styles.miniRouteSvg}>
        <Path
          d={pathData}
          fill="none"
          stroke={COLORS.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  };

  const handleDeleteRun = (id: string) => {
    Alert.alert('Delete Run', 'Are you sure you want to delete this run session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(`/runs/${id}`);
            await fetchWorkoutData();
          } catch (err) {
            Alert.alert('Error', 'Unable to delete run session.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderRunsHistory = () => {
    if (runsHistory.length === 0) {
      return (
        <View style={styles.emptyHistoryCard}>
          <Award size={36} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyHistoryText}>No runs completed yet. Get outside and track your first route!</Text>
        </View>
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

          return (
            <View key={run.id} style={styles.runHistoryCard}>
              <View style={styles.runCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runCardTitle} numberOfLines={1}>{run.title || 'Outdoor Run'}</Text>
                  <Text style={styles.runCardDate}>{formatRunDate(run.startTime)}</Text>
                </View>
                <View style={styles.miniRouteContainer}>
                  {renderMiniRoutePath(run.routeCoordinates) || (
                    <View style={styles.miniRoutePlaceholder}>
                      <Award size={16} color={COLORS.textMuted} />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.runStatsRow}>
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{distanceKm.toFixed(2)}</Text>
                  <Text style={styles.runStatLabel}>Dist (km)</Text>
                </View>
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{formatRunDuration(durationSeconds)}</Text>
                  <Text style={styles.runStatLabel}>Time</Text>
                </View>
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{paceStr}</Text>
                  <Text style={styles.runStatLabel}>Pace (/km)</Text>
                </View>
                <View style={styles.runStatColumn}>
                  <Text style={styles.runStatValue}>{calories}</Text>
                  <Text style={styles.runStatLabel}>kcal</Text>
                </View>
              </View>

              <View style={styles.runCardFooter}>
                <TouchableOpacity
                  style={styles.runDeleteBtn}
                  onPress={() => handleDeleteRun(run.id)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={COLORS.error} />
                  <Text style={styles.runDeleteText}>Delete</Text>
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

  const FALLBACK_EXERCISES: Exercise[] = [
    { id: 'e1', name: 'Barbell Bench Press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Dumbbell Incline Press', muscleGroup: 'Chest' },
    { id: 'e3', name: 'Barbell Squat', muscleGroup: 'Quadriceps' },
    { id: 'e4', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
    { id: 'e5', name: 'Pull-Ups', muscleGroup: 'Lats' },
    { id: 'e6', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders' },
    { id: 'e7', name: 'Bicep Dumbbell Curl', muscleGroup: 'Biceps' },
    { id: 'e8', name: 'Cable Tricep Pushdown', muscleGroup: 'Triceps' },
  ];

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
              name: log.exercise?.name || 'Exercise',
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
                    name: pde.exercise?.name || 'Exercise',
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
    setIsRegenerating(true);
    try {
      await api.post('/programs/generate');
      await fetchWorkoutData();
      Alert.alert('Success', 'Your personalized training program has been re-generated!');
    } catch (err) {
      Alert.alert('Error', 'Could not re-generate program.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenProgramSelector = async () => {
    setIsProgramSelectorVisible(true);
    setFetchingPrograms(true);
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
      Alert.alert('Success', 'Workout program updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Unable to change workout program.');
    } finally {
      setLoading(false);
    }
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
      await api.put(`/programs/exercises/${editingPlanEx.id}`, {
        targetSets: parseInt(editTargetSets, 10),
        targetRepsRange: editTargetRepsRange,
      });
      Alert.alert('Success', 'Exercise target parameters updated successfully.');
      setIsEditPlanExModalVisible(false);
      fetchWorkoutData();
    } catch (err) {
      Alert.alert('Error', 'Unable to save modifications.');
    }
  };

  const handleRemovePlanEx = async (pdeId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this exercise from your training split day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/programs/exercises/${pdeId}`);
              Alert.alert('Success', 'Exercise removed from plan day.');
              fetchWorkoutData();
            } catch (err) {
              Alert.alert('Error', 'Unable to remove exercise.');
            }
          },
        },
      ]
    );
  };

  const handleOpenAddPlanEx = (dayId: string) => {
    setSelectedDayIdForAdd(dayId);
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
      if (res.data && res.data.length > 0) {
        setAddPlanExResults(res.data);
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
      await api.post(`/programs/days/${selectedDayIdForAdd}/exercises`, {
        exerciseId: exercise.id,
        targetSets: parseInt(addPlanExSets, 10),
        targetRepsRange: addPlanExRepsRange,
      });
      Alert.alert('Success', 'Exercise added to training plan!');
      setIsAddPlanExModalVisible(false);
      setAddPlanExQuery('');
      setAddPlanExResults([]);
      fetchWorkoutData();
    } catch (err) {
      Alert.alert('Error', 'Unable to add exercise to plan day.');
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
                    name: pde.exercise?.name || 'Exercise',
                    sets,
                  };
                });
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
      Alert.alert('Offline Mode', 'Workout started locally.');
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
      if (res.data && res.data.length > 0) {
        setExerciseResults(res.data);
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
      Alert.alert('Notice', 'Exercise is already added to this session.');
      return;
    }

    const newActiveEx: ActiveExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
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
      Alert.alert('Success', 'Gym workout session logged successfully!');
      fetchWorkoutData();
    } catch (e) {
      Alert.alert('Error', 'Unable to complete workout log.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel/Discard active workout
  const handleDiscardWorkout = () => {
    Alert.alert('Discard Session', 'Are you sure you want to discard this workout logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setIsWorkoutActive(false);
          setActiveSession(null);
          stopTimer();
          setWorkoutDuration(0);
          setActiveExercises([]);
        },
      },
    ]);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>
          {activeTab === 'gym' ? 'Gym History' : activeTab === 'runs' ? 'Runs History' : 'Training Plan'}
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
                <TrendingUp size={16} color={activeTab === 'runs' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'runs' && styles.tabButtonTextActive]}>
                  Runs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'plan' && styles.tabButtonActive]}
                onPress={() => setActiveTab('plan')}
                activeOpacity={0.8}
              >
                <Dumbbell size={16} color={activeTab === 'plan' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
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
                      <TrendingUp size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
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
                  <Dumbbell size={38} color={COLORS.textInverse} style={{ marginBottom: 12 }} />
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
                    <TouchableOpacity
                      key={item.id}
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
                        <Text style={styles.historyDuration}>{item.duration} mins</Text>
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
                  ))
                ) : (
                  <View style={styles.emptyHistoryCard}>
                    <Award size={36} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
                    <Text style={styles.emptyHistoryText}>No workouts logged yet. Your fitness journey starts now!</Text>
                  </View>
                )}
              </View>
            ) : activeTab === 'runs' ? (
              <View style={{ flex: 1 }}>
                {renderRunsHistory()}
              </View>
            ) : (
              /* ACTIVE PLAN TAB PANEL */
              <View style={{ flex: 1, paddingBottom: 30 }}>
                {currentProgram ? (
                  <View>
                    <View style={styles.planInfoCard}>
                      <View style={styles.planInfoTitleRow}>
                        <Text style={styles.planProgramTitle}>{currentProgram.name}</Text>
                        <View style={styles.planBadgeContainer}>
                          <Text style={styles.planBadgeText}>
                            {currentProgram.level?.toUpperCase() || 'BEGINNER'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.planProgramDesc}>{currentProgram.description}</Text>

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
                            <Text style={styles.planCardBtnSolidText}>Re-generate</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Render split days */}
                    {currentProgram.days?.map((day: any, dIdx: number) => {
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
                                    <Text style={styles.planExName}>{pde.exercise?.name || 'Exercise'}</Text>
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
                                      style={[styles.planExActionBtn, { marginLeft: 12 }]}
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
                    <Text style={styles.planEmptyText}>No training plan assigned yet.</Text>
                    <TouchableOpacity
                      style={styles.planEmptyBtn}
                      onPress={handleRegenerateProgram}
                      disabled={isRegenerating}
                      activeOpacity={0.8}
                    >
                      {isRegenerating ? (
                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                      ) : (
                        <Text style={styles.planEmptyBtnText}>Generate Personalized Program</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.planEmptyBtn, { marginTop: 12, backgroundColor: COLORS.surfaceLight }]}
                      onPress={handleOpenProgramSelector}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.planEmptyBtnText, { color: COLORS.primary }]}>Choose Program Manually</Text>
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
              <View style={styles.timerHeaderRow}>
                <View style={styles.timerBadge}>
                  <Timer size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.timerText}>{formatDuration(workoutDuration)}</Text>
                </View>
                <View style={styles.volumeBadge}>
                  <TrendingUp size={16} color={COLORS.success} style={{ marginRight: 4 }} />
                  <Text style={styles.volumeText}>{calculateTotalLoggedVolume()} kg Volume</Text>
                </View>
              </View>

              <View style={styles.activeActionsRow}>
                <TouchableOpacity
                  onPress={() => setIsFinishModalVisible(true)}
                  style={styles.completeBtn}
                >
                  <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeBtnText}>Finish Workout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDiscardWorkout}
                  style={styles.discardBtn}
                >
                  <X size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* List of exercises currently added */}
            {activeExercises.length > 0 ? (
              activeExercises.map((ae) => (
                <View key={ae.exerciseId} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseTitle}>{ae.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(ae.exerciseId)}
                      style={styles.deleteExBtn}
                    >
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Header Row for set log columns */}
                  <View style={styles.setRowLabels}>
                    <Text style={[styles.setLabelCol, { width: '15%' }]}>Set</Text>
                    <Text style={[styles.setLabelCol, { width: '30%', textAlign: 'center' }]}>kg</Text>
                    <Text style={[styles.setLabelCol, { width: '30%', textAlign: 'center' }]}>Reps</Text>
                    <Text style={[styles.setLabelCol, { width: '25%', textAlign: 'right' }]}>Tick</Text>
                  </View>

                  {/* Set log inputs rows */}
                  {ae.sets.map((set) => (
                    <View key={set.setNumber} style={[styles.setInputsRow, set.completed && styles.setRowCompleted]}>
                      <Text style={[styles.setNumText, { width: '15%' }]}>{set.setNumber}</Text>
                      
                      <View style={[styles.setInputWrapper, { width: '30%' }]}>
                        <TextInput
                          style={styles.setInput}
                          value={set.weight.toString()}
                          keyboardType="numeric"
                          onChangeText={(v) => handleEditSet(ae.exerciseId, set.setNumber, 'weight', v)}
                          editable={!set.completed}
                        />
                      </View>

                      <View style={[styles.setInputWrapper, { width: '30%' }]}>
                        <TextInput
                          style={styles.setInput}
                          value={set.reps.toString()}
                          keyboardType="numeric"
                          onChangeText={(v) => handleEditSet(ae.exerciseId, set.setNumber, 'reps', v)}
                          editable={!set.completed}
                        />
                      </View>

                      <View style={[{ width: '25%', alignItems: 'flex-end' }]}>
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

                  {/* Add set button */}
                  <TouchableOpacity
                    onPress={() => handleAddSet(ae.exerciseId)}
                    style={styles.addSetBtn}
                  >
                    <PlusCircle size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.addSetBtnText}>Add Set</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyActiveCard}>
                <Dumbbell size={34} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyActiveText}>
                  Your active routine is empty. Tap below to search and add exercises to log!
                </Text>
              </View>
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
                    <View>
                      <Text style={styles.execResultName}>{item.name}</Text>
                      <Text style={styles.execResultMuscle}>{item.muscleGroup}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.finishModalContent}>
            <Award size={38} color={COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.finishModalTitle}>Workout Completed!</Text>
            <Text style={styles.finishModalDesc}>Rate your Rating of Perceived Exertion (RPE) from 1 to 10:</Text>
            
            <View style={styles.rpeSliderRow}>
              {[5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.rpeCell, rpe === num.toString() && styles.rpeCellSelected]}
                  onPress={() => setRpe(num.toString())}
                >
                  <Text style={[styles.rpeCellText, rpe === num.toString() && styles.rpeCellTextSelected]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
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
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitleText}>Choose Workout Program</Text>
                <TouchableOpacity 
                  onPress={() => setIsProgramSelectorVisible(false)}
                >
                  <X size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {fetchingPrograms ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {allPrograms.map((program) => (
                    <TouchableOpacity
                      key={program.id}
                      style={[
                        styles.programSelectCard,
                        currentProgram?.id === program.id && styles.programSelectCardActive
                      ]}
                      onPress={() => handleSelectProgram(program.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.programSelectHeader}>
                        <Text style={styles.programSelectName}>{program.name}</Text>
                        <View style={styles.programLevelBadge}>
                          <Text style={styles.programLevelBadgeText}>
                            {program.level || 'Beginner'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.programSelectDesc}>{program.description}</Text>
                      <Text style={styles.programSelectDaysCount}>
                        Schedule: {program.days?.length || 0} training days
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {allPrograms.length === 0 && (
                    <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 20 }}>
                      No programs available.
                    </Text>
                  )}
                </ScrollView>
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
                      <Text style={styles.catalogSearchName}>{item.name}</Text>
                      <Text style={styles.catalogSearchGroup}>{item.muscleGroup}</Text>
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  volumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  volumeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  activeActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  completeBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  discardBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  deleteExBtn: {
    padding: 4,
  },
  setRowLabels: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  setRowCompleted: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  setNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  setInputWrapper: {
    alignItems: 'center',
  },
  setInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: 60,
    height: 32,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  addSetBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
  },
  generalAddExBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
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
  finishModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    marginHorizontal: 30,
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
  rpeSliderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  rpeCell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeCellSelected: {
    backgroundColor: COLORS.primary,
  },
  rpeCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rpeCellTextSelected: {
    color: '#FFFFFF',
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
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  planInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planProgramTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
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
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  planCardBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  planCardBtnSolid: {
    backgroundColor: COLORS.primary,
  },
  planCardBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planCardBtnOutline: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  planCardBtnOutlineText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  planProgramDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 16,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  planDayBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  planDayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  planDayBadgeTextActive: {
    color: '#FFFFFF',
  },
  planDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planExName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  planExDetails: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '500',
  },
  planExActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planExActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
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
  programSelectCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  programSelectCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  programSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  programSelectName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
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
  programLevelBadge: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  programLevelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  runHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    ...SHADOWS.card,
  },
  runCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  runCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  runCardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  miniRouteContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  miniRouteSvg: {
    backgroundColor: '#F5ECF4',
  },
  miniRoutePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  runStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  runStatColumn: {
    flex: 1,
    alignItems: 'center',
  },
  runStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  runStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  runCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  runDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  runDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
    marginLeft: 6,
  },
});
