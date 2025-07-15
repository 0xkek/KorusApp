import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider } from '../context/ThemeContext';
import { KorusAlertProvider } from '../components/KorusAlertProvider';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_Regular: require('../assets/fonts/Inter_Regular.ttf'),
    Inter_Medium: require('../assets/fonts/Inter_Medium.ttf'),
    Inter_SemiBold: require('../assets/fonts/Inter_SemiBold.ttf'),
    Inter_Bold: require('../assets/fonts/Inter_Bold.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider>
      <KorusAlertProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="subcategory-feed" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </KorusAlertProvider>
    </ThemeProvider>
  );
}
