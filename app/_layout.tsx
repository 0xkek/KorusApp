import '../polyfills'; // Must be first import
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { errorMonitor } from '../utils/errorMonitoring';

import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { KorusAlertProvider } from '../components/KorusAlertProvider';
import { WalletProvider } from '../context/WalletContext';
import { NotificationProvider } from '../context/NotificationContext';
import { GameProvider } from '../context/GameContext';
import ErrorBoundary from '../components/ErrorBoundary';
import ParticleSystem from '../components/ParticleSystem';

function RootLayoutNav() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="moderation" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
  });

  useEffect(() => {
    // Initialize error monitoring (only if we have a Sentry DSN)
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (sentryDsn) {
      errorMonitor.initialize(sentryDsn);
    }
  }, []);


  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider style={{ flex: 1 }}>
        <ThemeProvider>
          <WalletProvider>
            <NotificationProvider>
              <GameProvider>
                <KorusAlertProvider>
                  <RootLayoutNav />
                  <ParticleSystem />
                </KorusAlertProvider>
              </GameProvider>
            </NotificationProvider>
          </WalletProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
