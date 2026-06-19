import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { storage } from '../utils/storage';
import { lightColors, darkColors, ThemeColors } from './colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'theme_mode';

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Restore the persisted preference on launch.
  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      storage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      isDark: mode === 'dark',
      setMode,
      toggle,
    }),
    [mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// Convenience hook for screens that only need the active palette.
export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}
