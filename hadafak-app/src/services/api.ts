import axios from 'axios';
import { storage } from '../utils/storage';

import { Platform } from 'react-native';

// Replace with your development machine's actual LAN IP address so physical devices can connect
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // If running on Android emulator, use 10.0.2.2 to connect to local host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getBaseUrl();
console.log('[API] Base URL configured to:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into all outgoing requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error reading auth token from storage', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refreshing automatically when receiving 401 Unauthorized
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

let logoutCallback: (() => void) | null = null;

export const registerLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for auth endpoints — a 401 there means bad credentials, not expired token
    const url: string = originalRequest?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register') || url.includes('/auth/google');

    // Check if the error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If we are already refreshing the token, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // Call the refresh endpoint using a clean, interceptor-free axios call to avoid loops
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        await storage.setItem('access_token', accessToken);
        if (newRefreshToken) {
          await storage.setItem('refresh_token', newRefreshToken);
        }

        // Update defaults and retry original request
        if (api.defaults.headers.common) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh token failed or is missing, clear credentials and log out
        try {
          await storage.deleteItem('access_token');
          await storage.deleteItem('refresh_token');
        } catch (e) {
          console.warn('Failed to clear tokens', e);
        }

        if (logoutCallback) {
          logoutCallback();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

