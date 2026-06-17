import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, LIGHT_COLORS, ThemeMode } from '../constants/theme';

interface ThemeContextValue {
  mode:       ThemeMode;
  colors:     typeof COLORS;
  isDark:     boolean;
  toggleTheme: () => void;
  setTheme:   (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'medha_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      }
    });
  }, []);

  const setTheme = async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  };

  const toggleTheme = () => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  };

  const colors = mode === 'dark' ? COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{
      mode,
      colors,
      isDark: mode === 'dark',
      toggleTheme,
      setTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}