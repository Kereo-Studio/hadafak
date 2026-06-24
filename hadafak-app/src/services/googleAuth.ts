import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { api } from './api';
import { storage } from '../utils/storage';

// Web client ID drives the ID-token audience the backend verifies against.
const WEB_CLIENT_ID = '492137671227-1196sapnej7hsbmbc7hh2jpe3i8ijd9h.apps.googleusercontent.com';
const IOS_CLIENT_ID = '492137671227-qbjvbdd18fi7sq5tsm519ehbk6sh4fp9.apps.googleusercontent.com';

let configured = false;

export const configureGoogleSignIn = () => {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
};

export type GoogleAuthResult = 'success' | 'cancelled';

/**
 * Runs the native Google sign-in, exchanges the ID token for our own JWTs
 * via POST /auth/google, and persists them. Returns 'cancelled' if the user
 * dismisses the Google sheet; throws on any real failure.
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return 'cancelled';
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token');
  }

  const res = await api.post('/auth/google', { idToken });
  const { accessToken, refreshToken } = res.data;
  await storage.setItem('access_token', accessToken);
  if (refreshToken) {
    await storage.setItem('refresh_token', refreshToken);
  }
  return 'success';
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch {
    // not signed in via Google — nothing to do
  }
};
