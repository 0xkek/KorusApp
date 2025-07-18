import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Theme, getTheme } from '../constants/Themes';

type ColorScheme = 'mint' | 'purple' | 'blue' | 'gold' | 'cherry' | 'cyber';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  isDark: boolean;
  isDarkMode: boolean;
  colors: Theme['colors'];
  gradients: Theme['gradients'];
  setColorScheme: (scheme: ColorScheme, isPremium?: boolean) => void;
  toggleDarkMode: () => void;
  toggleTheme: () => void; // For backward compatibility
  isColorSchemeLocked: (scheme: ColorScheme) => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'korus_theme_preference';
const DARK_MODE_STORAGE_KEY = 'korus_dark_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('mint');
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const loadSavedPreferences = async () => {
    try {
      const [savedScheme, savedDarkMode] = await Promise.all([
        SecureStore.getItemAsync(THEME_STORAGE_KEY),
        SecureStore.getItemAsync(DARK_MODE_STORAGE_KEY),
      ]);

      if (savedScheme) {
        setColorSchemeState(savedScheme as ColorScheme);
      }
      if (savedDarkMode !== null) {
        setIsDark(savedDarkMode === 'true');
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setColorScheme = async (scheme: ColorScheme, isPremium: boolean = false) => {
    try {
      // Check if the scheme is premium-only
      if (!isPremium && (scheme === 'purple' || scheme === 'blue' || scheme === 'gold' || scheme === 'cherry' || scheme === 'cyber')) {
        console.warn('Premium subscription required for this color scheme');
        return;
      }
      
      setColorSchemeState(scheme);
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, scheme);
    } catch (error) {
      console.error('Error saving color scheme:', error);
    }
  };
  
  const isColorSchemeLocked = (scheme: ColorScheme): boolean => {
    // Mint (green) is available to all users
    // Purple, blue, gold, cherry, and cyber are premium-only
    return scheme === 'purple' || scheme === 'blue' || scheme === 'gold' || scheme === 'cherry' || scheme === 'cyber';
  };

  const toggleDarkMode = async () => {
    try {
      const newDarkMode = !isDark;
      setIsDark(newDarkMode);
      await SecureStore.setItemAsync(DARK_MODE_STORAGE_KEY, String(newDarkMode));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const theme = getTheme(colorScheme, isDark);

  const value: ThemeContextType = {
    theme,
    colorScheme,
    isDark,
    isDarkMode: isDark,
    colors: theme.colors,
    gradients: theme.gradients,
    setColorScheme,
    toggleDarkMode,
    toggleTheme: toggleDarkMode, // For backward compatibility
    isColorSchemeLocked,
  };

  // Don't render until preferences are loaded to avoid flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}