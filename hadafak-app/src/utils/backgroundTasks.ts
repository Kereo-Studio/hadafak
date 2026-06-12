import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as BackgroundFetch from 'expo-background-fetch';
import { DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import { storage } from './storage';
import { pedometerService } from './pedometerService';
import { API_BASE_URL } from '../services/api';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TRACKING';
export const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_SYNC';

// Helper to calculate haversine distance in meters
function haversineDistance(
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 1. Background Location updates task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error(`[Background Location Task] Error:`, error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      try {
        const rawSession = await storage.getItem('active_workout_session');
        if (!rawSession) {
          // No active workout is currently being tracked
          return;
        }

        const session = JSON.parse(rawSession);
        if (session.status !== 'running') return;

        let points = session.trackPoints || [];
        let distanceM = Number(session.distanceM) || 0;
        const startTime = new Date(session.startTime);

        for (const loc of locations) {
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
        }

        const updatedSession = {
          ...session,
          trackPoints: points,
          distanceM,
          lastUpdated: new Date().toISOString(),
        };

        await storage.setItem('active_workout_session', JSON.stringify(updatedSession));

        // Emit updates to the UI in case the app is currently in the foreground
        DeviceEventEmitter.emit('BACKGROUND_LOCATION_UPDATE', updatedSession);
      } catch (err) {
        console.error('[Background Location Task] Failed to update session:', err);
      }
    }
  }
});

// 2. Background periodic step sync task
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  console.log('[Background Step Sync] Task triggered');
  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      console.log('[Background Step Sync] No user auth token found. Skipping sync.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const apiInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const success = await pedometerService.syncSteps(apiInstance);
    return success 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (err) {
    console.error('[Background Step Sync] Execution failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
