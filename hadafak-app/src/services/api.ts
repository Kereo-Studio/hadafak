import axios from 'axios';
import { storage } from '../utils/storage';

import { Platform } from 'react-native';

// Replace with your development machine's actual LAN IP address so physical devices can connect
const getBaseUrl = () => {
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getBaseUrl();

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

