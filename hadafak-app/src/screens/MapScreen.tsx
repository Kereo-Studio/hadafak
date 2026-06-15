import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Dimensions,
  Animated, PanResponder, TextInput, ActivityIndicator, KeyboardAvoidingView, Modal,
  DeviceEventEmitter,
} from 'react-native';
import { useAlert } from '../components/CustomAlert';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Play, Pause, Square, Navigation,
  Clock, Zap, Flame, Ghost, Eye, Check, Trophy, ChevronUp, ChevronDown,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { storage } from '../utils/storage';
import { BACKGROUND_LOCATION_TASK } from '../utils/backgroundTasks';

const { width, height: WINDOW_HEIGHT } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CARD_MIN_HEIGHT = 160;
const CARD_MAX_HEIGHT = 440;
const CARD_SWIPE_THRESHOLD = 50;

// ─── Map Styles ──────────────────────────────────────────────────────────────
const MAP_THEMES = {
  aubergine: [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b687a' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c456b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] }
  ],
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
  ],
  standard: [] // Default Map Style
};

type MapThemeKey = 'aubergine' | 'dark' | 'standard';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  elapsedTime: number;
}

interface PastRun {
  id: string;
  title: string;
  distanceKm: number;
  durationSeconds: number;
  routeCoordinates: TrackPoint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const haversineDistance = (a: TrackPoint, b: TrackPoint): number => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatPace = (distKm: number, secs: number): string => {
  if (distKm <= 0) return '--:--';
  const paceDecimal = secs / 60 / distKm;
  const mins = Math.floor(paceDecimal);
  const secsPart = Math.round((paceDecimal - mins) * 60);
  return `${mins}:${secsPart < 10 ? '0' : ''}${secsPart}`;
};

const getPaceColor = (speed: number, avgSpeed: number): string => {
  if (avgSpeed === 0) return '#A78BFA';
  const ratio = speed / avgSpeed;
  if (ratio < 0.75) return '#EF4444';   // Slow
  if (ratio < 1.10) return '#F59E0B';   // Average
  return '#10B981';                      // Fast
};

const interpolateGhost = (
  route: TrackPoint[],
  elapsedSec: number,
): { latitude: number; longitude: number } | null => {
  if (!route || route.length < 2) return null;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    if (elapsedSec >= a.elapsedTime && elapsedSec <= b.elapsedTime) {
      const t = (elapsedSec - a.elapsedTime) / (b.elapsedTime - a.elapsedTime);
      return {
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      };
    }
  }
  const last = route[route.length - 1];
  return { latitude: last.latitude, longitude: last.longitude };
};

const getGhostDistanceAtTime = (
  route: TrackPoint[],
  elapsedSec: number,
): number => {
  if (!route || route.length === 0) return 0;
  
  const lastPoint = route[route.length - 1];
  if (elapsedSec >= lastPoint.elapsedTime) {
    let totalDist = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDist += haversineDistance(route[i], route[i + 1]);
    }
    return totalDist;
  }
  
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segmentDist = haversineDistance(a, b);
    
    if (elapsedSec >= b.elapsedTime) {
      dist += segmentDist;
    } else if (elapsedSec >= a.elapsedTime && elapsedSec < b.elapsedTime) {
      const t = (elapsedSec - a.elapsedTime) / (b.elapsedTime - a.elapsedTime);
      dist += segmentDist * t;
      break;
    }
  }
  return dist;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const MapScreen: React.FC = () => {
  const { showAlert } = useAlert();
  // Map Styling Theme State
  const [selectedTheme, setSelectedTheme] = useState<MapThemeKey>('aubergine');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Run Tracking State
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

  // Ghost Runner
  const [pastRuns, setPastRuns] = useState<PastRun[]>([]);
  const [ghostRun, setGhostRun] = useState<PastRun | null>(null);
  const [ghostPos, setGhostPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showGhostPicker, setShowGhostPicker] = useState(false);

  // Post-Run Summary Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    distanceKm: number;
    durationSeconds: number;
    avgPace: string;
    calories: number;
    routeCoordinates: TrackPoint[];
  } | null>(null);
  const [customRunTitle, setCustomRunTitle] = useState('Outdoor Run');
  const [savingRun, setSavingRun] = useState(false);

  // Map Controls
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pausedTimeRef = useRef<Date | null>(null);
  const statusRef = useRef<'idle' | 'running' | 'paused'>('idle');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── Bottom Card Animation (Draggable Sheet) ──
  const [cardExpanded, setCardExpanded] = useState(false);
  const cardExpandedRef = useRef(false);
  cardExpandedRef.current = cardExpanded;

  const cardTranslateY = useRef(new Animated.Value(280)).current; // Default collapsed translation

  const toggleCard = (expand: boolean) => {
    setCardExpanded(expand);
    Animated.spring(cardTranslateY, {
      toValue: expand ? 0 : 280,
      useNativeDriver: true,
      damping: 24,
      stiffness: 150,
      mass: 0.8,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger responder if gesture is majorly vertical
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        let nextTranslateY = cardExpandedRef.current
          ? gestureState.dy
          : 280 + gestureState.dy;

        // Apply clamping boundary bounds to prevent exposing the map underneath
        if (nextTranslateY < 0) {
          nextTranslateY = 0;
        } else if (nextTranslateY > 280) {
          nextTranslateY = 280;
        }
        cardTranslateY.setValue(nextTranslateY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (cardExpandedRef.current) {
          if (gestureState.dy > CARD_SWIPE_THRESHOLD) {
            toggleCard(false); // Collapse
          } else {
            toggleCard(true); // Maintain Expand
          }
        } else {
          if (gestureState.dy < -CARD_SWIPE_THRESHOLD) {
            toggleCard(true); // Expand
          } else {
            toggleCard(false); // Maintain Collapse
          }
        }
      },
    })
  ).current;

  // ── Fetch Past Runs for Ghost Selection ──
  useFocusEffect(
    useCallback(() => {
      api.get('/runs').then(res => {
        const withRoutes = (res.data || []).filter((r: any) => r.routeCoordinates && r.routeCoordinates.length > 1);
        setPastRuns(withRoutes);
      }).catch(() => {});
      return () => {};
    }, [])
  );

  // ── Live statistics calculations ──
  const avgSpeed = trackPoints.length > 0
    ? trackPoints.reduce((s, p) => s + p.speed, 0) / trackPoints.length
    : 0;

  const heatmapSegments = trackPoints.length >= 2
    ? trackPoints.slice(0, -1).map((pt, i) => ({
        coords: [
          { latitude: pt.latitude, longitude: pt.longitude },
          { latitude: trackPoints[i + 1].latitude, longitude: trackPoints[i + 1].longitude },
        ],
        color: getPaceColor(pt.speed, avgSpeed),
      }))
    : [];

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date();
        const start = startTimeRef.current.getTime();
        const pausedMs = pausedDurationRef.current || 0;
        
        let elapsedMs = 0;
        if (statusRef.current === 'paused' && pausedTimeRef.current) {
          elapsedMs = pausedTimeRef.current.getTime() - start - pausedMs;
        } else {
          elapsedMs = now.getTime() - start - pausedMs;
        }
        
        const elapsedSec = Math.max(0, Math.round(elapsedMs / 1000));
        setElapsed(elapsedSec);

        if (ghostRun?.routeCoordinates) {
          const pos = interpolateGhost(ghostRun.routeCoordinates, elapsedSec);
          setGhostPos(pos);
        }
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const updateForegroundPoint = async (loc: Location.LocationObject) => {
    try {
      const rawSession = await storage.getItem('active_workout_session');
      if (!rawSession) return;

      const session = JSON.parse(rawSession);
      if (session.status !== 'running') return;

      let points = session.trackPoints || [];
      let distanceM = Number(session.distanceM) || 0;
      const startTime = new Date(session.startTime);

      const { latitude, longitude, speed } = loc.coords;
      const speedMs = Math.max(0, speed ?? 0);
      const timestamp = loc.timestamp ? new Date(loc.timestamp) : new Date();
      const elapsedSec = Math.round((timestamp.getTime() - startTime.getTime()) / 1000);

      const newPoint = {
        latitude,
        longitude,
        timestamp: timestamp.toISOString(),
        speed: speedMs,
        elapsedTime: elapsedSec,
      };

      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const dist = haversineDistance(lastPoint, newPoint);
        distanceM += dist;
      }

      points.push(newPoint);

      const updatedSession = {
        ...session,
        trackPoints: points,
        distanceM,
        lastUpdated: new Date().toISOString(),
      };

      await storage.setItem('active_workout_session', JSON.stringify(updatedSession));

      setDistanceM(distanceM);
      setTrackPoints(points);
    } catch (err) {
      console.warn('Failed to update foreground point:', err);
    }
  };

  const startLocationWatch = async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        showAlert({
          title: 'Location Services Disabled',
          message: 'Please enable GPS/Location services on your device to start tracking.',
          why: 'GPS is required to track your run distance, speed, and mapping path in real time.',
          actionGuide: 'Go to your device quick-settings or Privacy settings to turn on Location Services/GPS.',
          type: 'warning',
        });
        return false;
      }
    } catch (err) {
      console.warn('Failed to check if location services are enabled:', err);
    }

    let fgPermStatus = 'denied';
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      fgPermStatus = status;
    } catch (err) {
      console.warn('Failed to request foreground location permission:', err);
    }

    if (fgPermStatus !== 'granted') {
      showAlert({
        title: 'Permission Denied',
        message: 'GPS tracking requires location authorization.',
        why: 'The operating system blocks coordinates retrieval without permission.',
        actionGuide: 'Please allow Location permissions for Hadafak in your phone system settings.',
        type: 'warning',
      });
      return false;
    }

    let isBackgroundGranted = false;
    try {
      const { status: bgPerm } = await Location.requestBackgroundPermissionsAsync();
      isBackgroundGranted = bgPerm === 'granted';
    } catch (bgError) {
      console.warn('Failed to request background location permission:', bgError);
    }

    if (!isBackgroundGranted) {
      showAlert({
        title: 'Foreground-Only Tracking',
        message: 'Hadafak is not allowed to access location in the background.',
        why: 'Without background permissions, location tracking pauses when the screen turns off or another app is opened.',
        actionGuide: 'To track continuously, go to settings and select "Allow all the time" for location permissions.',
        type: 'warning',
        buttons: [{ text: 'Continue' }],
      });
    }

    try {
      if (isBackgroundGranted) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 4,
          foregroundService: {
            notificationTitle: 'Hadef Running/Walking Tracker',
            notificationBody: 'Your workout is currently being tracked in the background.',
            notificationColor: COLORS.primary,
          },
        });
      } else {
        if (locationSub.current) {
          locationSub.current.remove();
        }
        locationSub.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 4,
          },
          (loc) => {
            const { latitude, longitude, speed } = loc.coords;
            const speedMs = Math.max(0, speed ?? 0);
            setCurrentSpeed(speedMs);
            setUserLocation({ latitude, longitude });

            if (mapRef.current) {
              mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 500);
            }

            updateForegroundPoint(loc);
          }
        );
      }
      return true;
    } catch (err) {
      console.error('Failed to start location updates:', err);
      showAlert({
        title: 'Tracking Error',
        message: 'Unable to start location tracking.',
        why: 'A failure occurred in the GPS listener or background location worker.',
        actionGuide: 'Please toggle your location permissions off and on again or restart the application.',
        type: 'error',
      });
      return false;
    }
  };

  const stopLocationWatch = async () => {
    try {
      if (locationSub.current) {
        locationSub.current.remove();
        locationSub.current = null;
      }
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (err) {
      console.warn('Error stopping location updates:', err);
    }
  };

  const handleStart = async () => {
    pausedDurationRef.current = 0;
    pausedTimeRef.current = null;
    const ok = await startLocationWatch();
    if (!ok) return;
    const now = new Date();
    startTimeRef.current = now;
    setStatus('running');

    const session = {
      status: 'running',
      startTime: now.toISOString(),
      distanceM: 0,
      trackPoints: [],
      ghostRun: ghostRun,
      pausedDurationMs: 0,
      pausedTime: null,
    };
    await storage.setItem('active_workout_session', JSON.stringify(session));

    startTimer();
  };

  const handlePause = async () => {
    setStatus('paused');
    stopTimer();
    await stopLocationWatch();

    const now = new Date();
    pausedTimeRef.current = now;

    try {
      const raw = await storage.getItem('active_workout_session');
      if (raw) {
        const session = JSON.parse(raw);
        const updated = { 
          ...session, 
          status: 'paused',
          pausedTime: now.toISOString(),
        };
        await storage.setItem('active_workout_session', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Failed to update pause state in storage:', err);
    }
  };

  const handleResume = async () => {
    const ok = await startLocationWatch();
    if (!ok) return;
    setStatus('running');

    const now = new Date();
    if (pausedTimeRef.current) {
      const diff = now.getTime() - pausedTimeRef.current.getTime();
      pausedDurationRef.current += diff;
    }
    pausedTimeRef.current = null;

    startTimer();

    try {
      const raw = await storage.getItem('active_workout_session');
      if (raw) {
        const session = JSON.parse(raw);
        const updated = { 
          ...session, 
          status: 'running',
          pausedTime: null,
          pausedDurationMs: pausedDurationRef.current,
        };
        await storage.setItem('active_workout_session', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Failed to update resume state in storage:', err);
    }
  };

  const handleStop = () => {
    showAlert({
      title: 'Save Workout',
      message: 'Are you finished with your run?',
      why: 'This will end your location tracking session.',
      actionGuide: 'Choose "Save Run" to record your progress, "Discard" to delete the path, or "Cancel" to continue tracking.',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: resetRun },
        {
          text: 'Save Run',
          onPress: async () => {
            stopTimer();
            await stopLocationWatch();
            setStatus('idle');

            const distKm = Math.round((distanceM / 1000) * 100) / 100;
            const avgP = formatPace(distKm, elapsed);
            const cal = Math.round(distKm * 70);

            const hour = new Date().getHours();
            let defaultTitle = 'Morning Jog 🏃‍♂️';
            if (hour >= 12 && hour < 17) defaultTitle = 'Afternoon Run 🏃‍♀️';
            else if (hour >= 17 && hour < 21) defaultTitle = 'Evening Run 🌆';
            else if (hour >= 21 || hour < 6) defaultTitle = 'Night Run 🌙';

            setCustomRunTitle(defaultTitle);
            setSummaryData({
              distanceKm: distKm,
              durationSeconds: elapsed,
              avgPace: avgP,
              calories: cal,
              routeCoordinates: [...trackPoints],
            });
            setShowSummaryModal(true);
          },
        },
      ],
    });
  };

  const resetRun = async () => {
    stopTimer();
    await stopLocationWatch();
    await storage.deleteItem('active_workout_session');
    setStatus('idle');
    setElapsed(0);
    setDistanceM(0);
    setCurrentSpeed(0);
    setTrackPoints([]);
    lastPointRef.current = null;
    startTimeRef.current = null;
    pausedDurationRef.current = 0;
    pausedTimeRef.current = null;
    setGhostPos(null);
    setSummaryData(null);
    setShowSummaryModal(false);
  };

  const handleConfirmSave = async () => {
    if (!summaryData) return;
    setSavingRun(true);

    const startTime = startTimeRef.current?.toISOString() ?? new Date().toISOString();
    const endTime = new Date().toISOString();

    try {
      await api.post('/runs', {
        title: customRunTitle,
        activityType: 'run',
        startTime,
        endTime,
        durationSeconds: summaryData.durationSeconds,
        distanceKm: summaryData.distanceKm,
        routeCoordinates: summaryData.routeCoordinates,
      });
      showAlert({
        title: 'Run Saved',
        message: 'Your run has been recorded in your history.',
        why: 'The details and GPS track points have been synced to the server database.',
        actionGuide: 'Tap OK to view your refreshed activity profile.',
        type: 'success',
      });
    } catch {
      showAlert({
        title: 'Saved Locally',
        message: 'Saved offline. It will sync automatically.',
        why: 'A temporary loss of network connectivity prevented instant upload.',
        actionGuide: 'The run will be uploaded automatically once connection is restored.',
        type: 'info',
      });
    } finally {
      setSavingRun(false);
      setShowSummaryModal(false);
      resetRun();
    }
  };

  // Center user camera location
  const centerUserCamera = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(pos);
      mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 600);
    } catch (err) {
      console.warn('GPS location request timed out', err);
    }
  };

  // Initialize initial region, active sessions, and listen to background changes
  useEffect(() => {
    // 1. Request initial permissions and location
    Location.requestForegroundPermissionsAsync().then(({ status: perm }) => {
      if (perm === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(pos);
          mapRef.current?.animateToRegion({
            ...pos,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 600);
        }).catch(() => {});
      }
    });

    // 2. Restore active session if any exists in background storage
    const restoreSession = async () => {
      try {
        const raw = await storage.getItem('active_workout_session');
        if (raw) {
          const session = JSON.parse(raw);
          if (session.status === 'running' || session.status === 'paused') {
            setStatus(session.status);
            setDistanceM(Number(session.distanceM) || 0);
            setTrackPoints(session.trackPoints || []);
            if (session.trackPoints && session.trackPoints.length > 0) {
              lastPointRef.current = session.trackPoints[session.trackPoints.length - 1];
            }
            if (session.startTime) {
              startTimeRef.current = new Date(session.startTime);
            }
            pausedDurationRef.current = Number(session.pausedDurationMs) || 0;
            if (session.pausedTime) {
              pausedTimeRef.current = new Date(session.pausedTime);
            }

            // Calculate correct dynamic elapsed time immediately
            if (startTimeRef.current) {
              const now = new Date();
              const start = startTimeRef.current.getTime();
              const pausedMs = pausedDurationRef.current;
              
              let elapsedMs = 0;
              if (session.status === 'paused' && pausedTimeRef.current) {
                elapsedMs = pausedTimeRef.current.getTime() - start - pausedMs;
              } else {
                elapsedMs = now.getTime() - start - pausedMs;
              }
              setElapsed(Math.max(0, Math.round(elapsedMs / 1000)));
            }

            if (session.ghostRun) {
              setGhostRun(session.ghostRun);
            }

            if (session.status === 'running') {
              startTimer();
              try {
                const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                if (!hasStarted) {
                  let isBgGranted = false;
                  try {
                    const { status: bgPerm } = await Location.getBackgroundPermissionsAsync();
                    isBgGranted = bgPerm === 'granted';
                  } catch (err) {
                    console.warn('Failed to get background permission status:', err);
                  }

                  if (isBgGranted) {
                    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                      accuracy: Location.Accuracy.BestForNavigation,
                      timeInterval: 2000,
                      distanceInterval: 4,
                      foregroundService: {
                        notificationTitle: 'Hadef Running/Walking Tracker',
                        notificationBody: 'Your workout is currently being tracked in the background.',
                        notificationColor: COLORS.primary,
                      },
                    });
                  } else {
                    if (locationSub.current) {
                      locationSub.current.remove();
                    }
                    locationSub.current = await Location.watchPositionAsync(
                      {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 2000,
                        distanceInterval: 4,
                      },
                      (loc) => {
                        const { latitude, longitude, speed } = loc.coords;
                        setCurrentSpeed(Math.max(0, speed ?? 0));
                        setUserLocation({ latitude, longitude });
                        if (mapRef.current) {
                          mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 500);
                        }
                        updateForegroundPoint(loc);
                      }
                    );
                  }
                }
              } catch (err) {
                console.warn('Failed to restore location tracking:', err);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore active workout session:', err);
      }
    };

    restoreSession();

    // 3. Listen to real-time events from background location task
    const subscription = DeviceEventEmitter.addListener('BACKGROUND_LOCATION_UPDATE', (updatedSession) => {
      setDistanceM(updatedSession.distanceM);
      setTrackPoints(updatedSession.trackPoints);
      if (updatedSession.trackPoints && updatedSession.trackPoints.length > 0) {
        const last = updatedSession.trackPoints[updatedSession.trackPoints.length - 1];
        lastPointRef.current = last;
        setUserLocation({ latitude: last.latitude, longitude: last.longitude });
        setCurrentSpeed(last.speed);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: last.latitude,
            longitude: last.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003
          }, 500);
        }
      }
    });

    return () => {
      stopTimer();
      stopLocationWatch();
      subscription.remove();
    };
  }, []);

  const distKm = distanceM / 1000;
  const calories = Math.round(elapsed / 3600 * 8.0 * 70);

  return (
    <View style={styles.container}>
      {/* ── Map View ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_THEMES[selectedTheme]}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 }
            : { latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Heatmapped Path Polylines */}
        {heatmapSegments.map((seg, i) => (
          <Polyline
            key={i}
            coordinates={seg.coords}
            strokeColor={seg.color}
            strokeWidth={6}
            lineCap="round"
          />
        ))}

        {/* Ghost runner marker */}
        {ghostPos && (
          <Marker coordinate={ghostPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.ghostMarker}>
              <Ghost size={16} color={COLORS.primary} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Floating Map Controls ── */}
      <SafeAreaView style={styles.floatingTop} edges={['top']}>
        <View style={styles.topRow}>
          {/* Theme Selector Button */}
          <TouchableOpacity
            style={styles.floatingActionBtn}
            onPress={() => setShowThemeSelector(!showThemeSelector)}
          >
            <Eye size={20} color={COLORS.text} />
          </TouchableOpacity>

          {/* Current GPS Status HUD */}
          <View style={styles.statusPill}>
            <View style={[styles.gpsDot, { backgroundColor: status === 'running' ? COLORS.success : COLORS.error }]} />
            <Text style={styles.statusText}>
              {status === 'idle' ? 'Ready' : status === 'running' ? 'Tracking' : 'Paused'}
            </Text>
          </View>

          {/* Recenter Button */}
          <TouchableOpacity style={styles.floatingActionBtn} onPress={centerUserCamera}>
            <Navigation size={20} color={COLORS.text} style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Expandable Theme Selection Panel */}
        {showThemeSelector && (
          <View style={styles.themePanel}>
            {(Object.keys(MAP_THEMES) as MapThemeKey[]).map(theme => (
              <TouchableOpacity
                key={theme}
                style={[styles.themeChip, selectedTheme === theme && styles.themeChipActive]}
                onPress={() => {
                  setSelectedTheme(theme);
                  setShowThemeSelector(false);
                }}
              >
                {selectedTheme === theme && <Check size={14} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={[styles.themeChipText, selectedTheme === theme && styles.themeChipTextActive]}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>

      {/* ── Draggable Details Card ── */}
      <Animated.View style={[styles.detailsCard, { transform: [{ translateY: cardTranslateY }] }]} {...panResponder.panHandlers}>
        {/* Touch Handle Line */}
        <TouchableOpacity
          style={styles.dragHandleContainer}
          onPress={() => toggleCard(!cardExpanded)}
          activeOpacity={0.6}
        >
          {cardExpanded ? (
            <ChevronDown size={22} color={COLORS.textMuted} />
          ) : (
            <ChevronUp size={22} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        <ScrollView scrollEnabled={cardExpanded} contentContainerStyle={styles.scrollContent}>
          {/* Main Primary Metrics Summary (Always Visible) */}
          <View style={styles.mainMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValLarge}>{distKm.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Distance (km)</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValLarge}>{formatTime(elapsed)}</Text>
              <Text style={styles.metricLabel}>Time Elapsed</Text>
            </View>
          </View>

          {/* Detailed Statistics Grid (Visible on Drag Up) */}
          {cardExpanded && (
            <Animated.View style={styles.expandableContent}>
              <View style={styles.secondaryStatsGrid}>
                <View style={styles.statCard}>
                  <Zap size={18} color={COLORS.primary} />
                  <View style={styles.statCardMeta}>
                    <Text style={styles.statCardValue}>{formatPace(distKm, elapsed)}</Text>
                    <Text style={styles.statCardLabel}>Current Pace</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <Flame size={18} color="#FF6B6B" />
                  <View style={styles.statCardMeta}>
                    <Text style={styles.statCardValue}>{calories}</Text>
                    <Text style={styles.statCardLabel}>Calories Burned</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <Clock size={18} color="#4D96FF" />
                  <View style={styles.statCardMeta}>
                    <Text style={styles.statCardValue}>
                      {currentSpeed > 0 ? (currentSpeed * 3.6).toFixed(1) : '0.0'}
                    </Text>
                    <Text style={styles.statCardLabel}>Speed (km/h)</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statCard, ghostRun && styles.ghostCardActive]}
                  onPress={() => setShowGhostPicker(true)}
                  disabled={status !== 'idle'}
                >
                  <Ghost size={18} color={ghostRun ? COLORS.primary : COLORS.textLight} />
                  <View style={styles.statCardMeta}>
                    <Text style={[styles.statCardValue, ghostRun && { color: COLORS.primary }]}>
                      {ghostRun ? 'Active' : 'Off'}
                    </Text>
                    <Text style={styles.statCardLabel}>Ghost Runner</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Ghost Gap Info Panel */}
              {ghostRun && (
                <View style={styles.ghostStatusAlert}>
                  <Ghost size={16} color={COLORS.primary} />
                  <Text style={styles.ghostStatusText}>
                    {(() => {
                      if (status === 'idle') {
                        return `Competing vs PR: ${Number(ghostRun.distanceKm).toFixed(2)}km in ${formatTime(ghostRun.durationSeconds)}`;
                      }
                      const ghostDist = getGhostDistanceAtTime(ghostRun.routeCoordinates, elapsed);
                      const diffM = distanceM - ghostDist;
                      const diffAbs = Math.abs(diffM);
                      if (diffM >= 0) {
                        return `Ahead of ghost by ${diffAbs.toFixed(0)}m`;
                      } else {
                        return `Behind ghost by ${diffAbs.toFixed(0)}m`;
                      }
                    })()}
                  </Text>
                </View>
              )}

              {/* Heatmap Legend */}
              {trackPoints.length > 3 && (
                <View style={styles.legendWrapper}>
                  <Text style={styles.legendTitle}>Pace Heatmap Legend</Text>
                  <View style={styles.legendRow}>
                    <View style={styles.legendChip}>
                      <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.legendLabelText}>Slow Pace</Text>
                    </View>
                    <View style={styles.legendChip}>
                      <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendLabelText}>Average Pace</Text>
                    </View>
                    <View style={styles.legendChip}>
                      <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.legendLabelText}>Fast Pace</Text>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Command buttons ── */}
          <View style={styles.buttonContainer}>
            {status === 'idle' && (
              <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                <Play size={22} color="#fff" fill="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.buttonText}>Start Run</Text>
              </TouchableOpacity>
            )}
            {status === 'running' && (
              <View style={styles.buttonActionGroup}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePause}>
                  <Pause size={20} color={COLORS.primary} />
                  <Text style={[styles.buttonText, { color: COLORS.primary, marginLeft: 4 }]}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopActionBtn} onPress={handleStop}>
                  <Square size={18} color="#fff" fill="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            )}
            {status === 'paused' && (
              <View style={styles.buttonActionGroup}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleResume}>
                  <Play size={20} color={COLORS.primary} fill={COLORS.primary} />
                  <Text style={[styles.buttonText, { color: COLORS.primary, marginLeft: 4 }]}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopActionBtn} onPress={handleStop}>
                  <Square size={18} color="#fff" fill="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── Ghost Selection Modal overlay ── */}
      <Modal
        visible={showGhostPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGhostPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>👻 Select Ghost Run</Text>
            <Text style={styles.modalMeta}>Beat your previous record time on this route.</Text>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.ghostOption, !ghostRun && styles.ghostOptionSelected]}
                onPress={() => {
                  setGhostRun(null);
                  setShowGhostPicker(false);
                }}
              >
                <Text style={styles.ghostOptionTitle}>Disable Ghost Runner</Text>
                <Text style={styles.ghostOptionMeta}>Run solo without target pace tracking.</Text>
              </TouchableOpacity>

              {pastRuns.map(run => (
                <TouchableOpacity
                  key={run.id}
                  style={[styles.ghostOption, ghostRun?.id === run.id && styles.ghostOptionSelected]}
                  onPress={() => {
                    setGhostRun(run);
                    setShowGhostPicker(false);
                  }}
                >
                  <Text style={styles.ghostOptionTitle}>{run.title}</Text>
                  <Text style={styles.ghostOptionMeta}>
                    {Number(run.distanceKm).toFixed(2)} km  •  {formatTime(run.durationSeconds)}
                    {'\n'}Target Pace: {formatPace(Number(run.distanceKm), run.durationSeconds)} min/km
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowGhostPicker(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Post-Run Summary Modal overlay ── */}
      {showSummaryModal && summaryData && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowSummaryModal(false);
            resetRun();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              {/* Header Icon + Title */}
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Trophy size={42} color={COLORS.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.modalTitle, { color: COLORS.primary, textAlign: 'center', fontSize: 20, marginBottom: 2 }]}>
                  AWESOME RUN!
                </Text>
                <Text style={[styles.modalMeta, { textAlign: 'center', marginBottom: 10 }]}>
                  Your workout stats have been compiled.
                </Text>
              </View>

              {/* Stats Grid - Single Row */}
              <View style={styles.summaryStatsGrid}>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Distance</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.distanceKm.toFixed(2)}</Text>
                  <Text style={styles.summaryStatUnit}>km</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Duration</Text>
                  <Text style={styles.summaryStatVal}>{formatTime(summaryData.durationSeconds)}</Text>
                  <Text style={styles.summaryStatUnit}>Time</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Avg Pace</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.avgPace}</Text>
                  <Text style={styles.summaryStatUnit}>min/km</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Calories</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.calories}</Text>
                  <Text style={styles.summaryStatUnit}>kcal</Text>
                </View>
              </View>

              {/* Title Input field */}
              <Text style={styles.inputLabel}>Name your workout</Text>
              <TextInput
                style={styles.summaryTitleInput}
                value={customRunTitle}
                onChangeText={setCustomRunTitle}
                placeholder="Give your workout a name..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={40}
              />

              <View style={styles.summaryActionRow}>
                <TouchableOpacity
                  style={[styles.summaryBtn, styles.summaryBtnCancel]}
                  onPress={() => {
                    setShowSummaryModal(false);
                    resetRun();
                  }}
                >
                  <Text style={styles.summaryBtnCancelText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.summaryBtn, styles.summaryBtnSave]}
                  onPress={handleConfirmSave}
                  disabled={savingRun}
                >
                  {savingRun ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.summaryBtnSaveText}>Save Run</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
    width: width,
    height: WINDOW_HEIGHT,
  },

  // Floating controls
  floatingTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },

  // Theme Panel
  themePanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 8,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  themeChipActive: {
    backgroundColor: COLORS.primary,
  },
  themeChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  themeChipTextActive: {
    color: '#FFFFFF',
  },

  // Draggable Details Card
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 520,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 200,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },

  // Main metrics
  mainMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValLarge: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
  },

  // Expandable content
  expandableContent: {
    marginTop: 8,
  },
  secondaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    width: (width - 52) / 2,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ghostCardActive: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.primaryLight,
  },
  statCardMeta: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  statCardLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },

  ghostStatusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECF4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  ghostStatusText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Legend
  legendWrapper: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  legendTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabelText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '600',
  },

  // Start & Stop buttons
  buttonContainer: {
    marginTop: 8,
  },
  startBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonActionGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  stopActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  ghostMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  ghostOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ghostOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  ghostOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  ghostOptionMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  summaryStatVal: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  summaryStatUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  summaryTitleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  summaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  summaryBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  summaryBtnCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryBtnSave: {
    backgroundColor: COLORS.primary,
  },
  summaryBtnSaveText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
