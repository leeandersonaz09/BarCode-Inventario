import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@/services/i18n';

import { AppThemeProvider, useAppTheme } from '@/hooks/useAppTheme';
import { initDatabase } from '@/database/db';
import { SplashScreenProvider } from '@/components/SplashScreenProvider';
import { Onboarding } from '@/components/Onboarding';
import { LanguageSelection } from '@/components/LanguageSelection';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean | null>(null);
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        setIsDbReady(true);
        
        // Check onboarding status
        const onboardingValue = await AsyncStorage.getItem('@has_seen_onboarding');
        setHasSeenOnboarding(onboardingValue === 'true');

        // Check language selection
        const languageValue = await AsyncStorage.getItem('@app_language');
        setHasSelectedLanguage(languageValue !== null);
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, []);

  if (!loaded || !isDbReady || hasSeenOnboarding === null || hasSelectedLanguage === null) {
    return null;
  }

  return (
    <AppThemeProvider>
      <SplashScreenProvider>
        {!hasSelectedLanguage ? (
          <LanguageSelection onFinished={() => setHasSelectedLanguage(true)} />
        ) : !hasSeenOnboarding ? (
          <Onboarding onFinished={() => setHasSeenOnboarding(true)} />
        ) : (
          <RootNavigator />
        )}
      </SplashScreenProvider>
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="manual" options={{ presentation: 'modal', title: 'Cadastro Manual' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
