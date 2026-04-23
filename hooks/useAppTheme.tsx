import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import { AppThemeName, Colors } from '@/constants/Colors';

const THEME_STORAGE_KEY = '@catalogo-inteligente/theme';

type AppThemeContextValue = {
  theme: AppThemeName;
  colors: typeof Colors.light;
  isDark: boolean;
  setTheme: (theme: AppThemeName) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const nativeTheme = useNativeColorScheme();
  const [theme, setThemeState] = useState<AppThemeName>(nativeTheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    let mounted = true;

    async function loadTheme() {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (mounted && (storedTheme === 'light' || storedTheme === 'dark')) {
        setThemeState(storedTheme);
      }
    }

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback(async (nextTheme: AppThemeName) => {
    setThemeState(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const toggleTheme = useCallback(async () => {
    await setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      colors: Colors[theme],
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return <AppThemeContext value={value}>{children}</AppThemeContext>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return value;
}
