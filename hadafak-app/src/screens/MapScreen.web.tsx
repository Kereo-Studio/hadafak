import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
  Animated, PanResponder, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { useAlert } from '../components/CustomAlert';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Play, Pause, Square, Navigation,
  Clock, Zap, Flame, Ghost, Eye, Check, Trophy, ChevronUp, ChevronDown,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const CARD_MIN_HEIGHT = 160;
const CARD_MAX_HEIGHT = 440;
const CARD_SWIPE_THRESHOLD = 50;

type MapThemeKey = 'aubergine' | 'dark' | 'standard';

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

export const MapScreen: React.FC = () => {
  const { showAlert } = useAlert();
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

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simLocationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);

  // ── Bottom Card Animation (Draggable Sheet) ──
  const [cardExpanded, setCardExpanded] = useState(false);
  const cardExpandedRef = useRef(false);
  cardExpandedRef.current = cardExpanded;

  const cardTranslateY = useRef(new Animated.Value(280)).current;

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
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        let nextTranslateY = cardExpandedRef.current
          ? gestureState.dy
          : 280 + gestureState.dy;

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
            toggleCard(false);
          } else {
            toggleCard(true);
          }
        } else {
          if (gestureState.dy < -CARD_SWIPE_THRESHOLD) {
            toggleCard(true);
          } else {
            toggleCard(false);
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

  const avgSpeed = trackPoints.length > 0
    ? trackPoints.reduce((s, p) => s + p.speed, 0) / trackPoints.length
    : 0;

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (ghostRun?.routeCoordinates) {
          const pos = interpolateGhost(ghostRun.routeCoordinates, next);
          setGhostPos(pos);
        }
        return next;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Web Simulated Location Updates
  const startLocationWatch = async () => {
    let lastLat = userLocation?.latitude ?? 24.7136;
    let lastLon = userLocation?.longitude ?? 46.6753;

    simLocationInterval.current = setInterval(() => {
      // Simulate run coordinates mapping a winding route path
      const stepIndex = trackPoints.length + 1;
      const angle = stepIndex * 0.15;
      // Simulating a speed of ~12-14 km/h (3.3 - 3.9 m/s)
      const speedMs = 3.6 + Math.sin(angle * 0.5) * 0.4;
      const offsetLat = Math.sin(angle) * 0.00018;
      const offsetLon = Math.cos(angle * 0.7) * 0.00018;

      lastLat += offsetLat;
      lastLon += offsetLon;

      setCurrentSpeed(speedMs);
      setUserLocation({ latitude: lastLat, longitude: lastLon });

      const now = new Date();
      const elapsedSec = startTimeRef.current ? Math.round((now.getTime() - startTimeRef.current.getTime()) / 1000) : 0;
      const newPoint: TrackPoint = {
        latitude: lastLat,
        longitude: lastLon,
        timestamp: now.toISOString(),
        speed: speedMs,
        elapsedTime: elapsedSec,
      };

      if (lastPointRef.current) {
        const dist = haversineDistance(lastPointRef.current, newPoint);
        setDistanceM(prev => prev + dist);
      }
      lastPointRef.current = newPoint;
      setTrackPoints(prev => [...prev, newPoint]);
    }, 2000);

    return true;
  };

  const stopLocationWatch = () => {
    if (simLocationInterval.current) {
      clearInterval(simLocationInterval.current);
      simLocationInterval.current = null;
    }
  };

  const handleStart = async () => {
    startTimeRef.current = new Date();
    setStatus('running');
    startTimer();
    await startLocationWatch();
  };

  const handlePause = () => {
    setStatus('paused');
    stopTimer();
    stopLocationWatch();
  };

  const handleResume = async () => {
    setStatus('running');
    startTimer();
    await startLocationWatch();
  };

  const handleStop = () => {
    showAlert({
      title: 'Save Workout',
      message: 'Are you finished with your run?',
      why: 'This will end your simulated run tracking session.',
      actionGuide: 'Choose "Save Run" to record your progress, "Discard" to delete the simulated path, or "Cancel" to continue tracking.',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: resetRun },
        {
          text: 'Save Run',
          onPress: () => {
            stopTimer();
            stopLocationWatch();
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

  const resetRun = () => {
    stopTimer();
    stopLocationWatch();
    setStatus('idle');
    setElapsed(0);
    setDistanceM(0);
    setCurrentSpeed(0);
    setTrackPoints([]);
    lastPointRef.current = null;
    startTimeRef.current = null;
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
        why: 'The details and simulated route track points have been synced to the database.',
        actionGuide: 'Tap OK to view your activity details in the dashboard history.',
        type: 'success',
      });
    } catch {
      showAlert({
        title: 'Saved Locally',
        message: 'Saved offline. It will sync automatically.',
        why: 'A temporary network interruption prevented database sync.',
        actionGuide: 'The local activity data will be synced as soon as internet connection returns.',
        type: 'info',
      });
    } finally {
      setSavingRun(false);
      setShowSummaryModal(false);
      resetRun();
    }
  };

  useEffect(() => {
    // Initial static browser position setup
    Location.requestForegroundPermissionsAsync().then(({ status: perm }) => {
      if (perm === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }).catch(() => {});
      }
    });
    return () => { stopTimer(); stopLocationWatch(); };
  }, []);

  const distKm = distanceM / 1000;
  const calories = Math.round(elapsed / 3600 * 8.0 * 70);

  // SVG dimensions for simulated route map
  const svgWidth = 320;
  const svgHeight = 280;

  // Render simulated map path lines inside SVG
  const renderSimulatedPath = () => {
    if (trackPoints.length < 2) {
      return (
        <Circle cx={svgWidth / 2} cy={svgHeight / 2} r={8} fill={COLORS.primary} />
      );
    }
    const lats = trackPoints.map(p => p.latitude);
    const lons = trackPoints.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latRange = maxLat - minLat || 0.0001;
    const lonRange = maxLon - minLon || 0.0001;

    // Convert track points to scaled SVG space coordinates
    const points = trackPoints.map(p => {
      const x = ((p.longitude - minLon) / lonRange) * (svgWidth - 60) + 30;
      const y = (1 - (p.latitude - minLat) / latRange) * (svgHeight - 60) + 30;
      return { x, y };
    });

    const dStr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const lastP = points[points.length - 1];

    return (
      <>
        <Path d={dStr} fill="none" stroke={COLORS.primary} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={points[0].x} cy={points[0].y} r={6} fill={COLORS.success} />
        <Circle cx={lastP.x} cy={lastP.y} r={7} fill={COLORS.primary} />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Simulated Map Canvas View ── */}
      <View style={[styles.mapCanvas, { backgroundColor: selectedTheme === 'standard' ? '#FFFFFF' : '#111827' }]}>
        <View style={styles.topographicOverlay}>
          {/* Decorative radar rings representing a radar tracking look */}
          <View style={styles.radarRingLarge} />
          <View style={styles.radarRingMedium} />
          <View style={styles.radarRingSmall} />
        </View>

        <View style={styles.gpsGridCanvas}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {renderSimulatedPath()}
          </Svg>
        </View>

        {status === 'running' && (
          <View style={styles.simulatingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.simulatingText}>Simulating GPS run track...</Text>
          </View>
        )}
      </View>

      {/* ── Floating Map Controls ── */}
      <SafeAreaView style={styles.floatingTop} edges={['top']}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.floatingActionBtn}
            onPress={() => setShowThemeSelector(!showThemeSelector)}
          >
            <Eye size={20} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.statusPill}>
            <View style={[styles.gpsDot, { backgroundColor: status === 'running' ? COLORS.success : COLORS.error }]} />
            <Text style={styles.statusText}>
              {status === 'idle' ? 'Ready' : status === 'running' ? 'Tracking' : 'Paused'}
            </Text>
          </View>

          <TouchableOpacity style={styles.floatingActionBtn} onPress={() => {}}>
            <Navigation size={20} color={COLORS.text} style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
        </View>

        {showThemeSelector && (
          <View style={styles.themePanel}>
            {(['aubergine', 'dark', 'standard'] as MapThemeKey[]).map(theme => (
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

      {/* ── Bottom Details Card ── */}
      <Animated.View style={[styles.detailsCard, { transform: [{ translateY: cardTranslateY }] }]} {...panResponder.panHandlers}>
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

          {cardExpanded && (
            <View style={styles.expandableContent}>
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
            </View>
          )}

          <View style={styles.buttonContainer}>
            {status === 'idle' && (
              <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                <Play size={20} color="#fff" fill="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>START RUN</Text>
              </TouchableOpacity>
            )}

            {status === 'running' && (
              <View style={styles.buttonActionGroup}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePause}>
                  <Pause size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.buttonText, { color: COLORS.primary }]}>PAUSE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopActionBtn} onPress={handleStop}>
                  <Square size={20} color="#fff" fill="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>STOP</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'paused' && (
              <View style={styles.buttonActionGroup}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleResume}>
                  <Play size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.buttonText, { color: COLORS.primary }]}>RESUME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopActionBtn} onPress={handleStop}>
                  <Square size={20} color="#fff" fill="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>STOP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Ghost Picker Modal */}
      <Modal visible={showGhostPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose Ghost Runner</Text>
            <Text style={styles.modalMeta}>Race against your own historical personal record</Text>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.ghostOption, !ghostRun && styles.ghostOptionSelected]}
                onPress={() => {
                  setGhostRun(null);
                  setShowGhostPicker(false);
                }}
              >
                <Text style={styles.ghostOptionTitle}>Disable Ghost Runner</Text>
                <Text style={styles.ghostOptionMeta}>Run solo without competition tracker</Text>
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
                    Distance: {Number(run.distanceKm).toFixed(2)} km | Time: {formatTime(run.durationSeconds)}
                  </Text>
                </TouchableOpacity>
              ))}

              {pastRuns.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '600' }}>
                    No prior runs found. Complete your first run to unlock ghost tracking!
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowGhostPicker(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Run Summary Modal */}
      <Modal visible={showSummaryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Workout Summary</Text>
            <Text style={styles.modalMeta}>Review and name your outdoor running session</Text>

            {summaryData && (
              <View style={styles.summaryStatsGrid}>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Distance</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.distanceKm.toFixed(2)}</Text>
                  <Text style={styles.summaryStatUnit}>KM</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Time</Text>
                  <Text style={styles.summaryStatVal}>{formatTime(summaryData.durationSeconds)}</Text>
                  <Text style={styles.summaryStatUnit}>ELAPSED</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Avg Pace</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.avgPace}</Text>
                  <Text style={styles.summaryStatUnit}>MIN/KM</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatLabel}>Calories</Text>
                  <Text style={styles.summaryStatVal}>{summaryData.calories}</Text>
                  <Text style={styles.summaryStatUnit}>KCAL</Text>
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>Activity Name</Text>
            <TextInput
              style={styles.summaryTitleInput}
              value={customRunTitle}
              onChangeText={setCustomRunTitle}
              placeholder="Name your run"
            />

            <View style={styles.summaryActionRow}>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryBtnCancel]}
                onPress={() => setShowSummaryModal(false)}
                disabled={savingRun}
              >
                <Text style={styles.summaryBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryBtnSave]}
                onPress={handleConfirmSave}
                disabled={savingRun}
              >
                {savingRun ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.summaryBtnSaveText}>Save Session</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gpsGridCanvas: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topographicOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.1,
  },
  radarRingLarge: {
    width: 600,
    height: 600,
    borderRadius: 300,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    position: 'absolute',
  },
  radarRingMedium: {
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    position: 'absolute',
  },
  radarRingSmall: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    position: 'absolute',
  },
  simulatingBanner: {
    position: 'absolute',
    bottom: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  simulatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  floatingTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  floatingActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  themePanel: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    marginTop: 10,
    gap: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  themeChipTextActive: {
    color: '#FFFFFF',
  },
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
    height: CARD_MAX_HEIGHT,
  },
  dragHandleContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValLarge: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E5E7EB',
  },
  expandableContent: {
    marginTop: 4,
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
    padding: 12,
    width: (width - 52) / 2,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ghostCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  statCardMeta: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  statCardLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 1,
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
    fontSize: 15,
    fontWeight: '800',
  },
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
    paddingBottom: 24,
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
