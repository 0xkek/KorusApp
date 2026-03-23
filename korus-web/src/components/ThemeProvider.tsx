'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';

// Import the theme definitions from mobile app
const themes = {
  mintDark: {
    name: 'Mint Dark',
    isDark: true,
    colors: {
      primary: '#43e97b',
      secondary: '#38f9d7',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(67, 233, 123, 0.3)',
      borderLight: 'rgba(67, 233, 123, 0.15)',
      success: '#43e97b',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#43e97b',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  mintLight: {
    name: 'Mint Light',
    isDark: false,
    colors: {
      primary: '#2DB869',
      secondary: '#26D0A8',
      background: '#fdfffe',
      surface: '#f8faf9',
      surfaceLight: '#f2f6f3',
      text: '#1a2e1f',
      textSecondary: 'rgba(26, 46, 31, 0.75)',
      textTertiary: 'rgba(26, 46, 31, 0.55)',
      border: 'rgba(45, 184, 105, 0.55)',
      borderLight: 'rgba(45, 184, 105, 0.35)',
      success: '#2DB869',
      error: '#dc3545',
      warning: '#f39c12',
      shadowColor: 'rgba(45, 184, 105, 0.25)',
      overlayBackground: 'rgba(248, 250, 249, 0.95)',
    }
  },
  purpleDark: {
    name: 'Purple Dark',
    isDark: true,
    colors: {
      primary: '#9945FF',
      secondary: '#E935C1',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(153, 69, 255, 0.3)',
      borderLight: 'rgba(153, 69, 255, 0.15)',
      success: '#9945FF',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#9945FF',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  purpleLight: {
    name: 'Purple Light',
    isDark: false,
    colors: {
      primary: '#7B3FF2',
      secondary: '#E01FCD',
      background: '#fefaff',
      surface: '#faf6fc',
      surfaceLight: '#f4f0f8',
      text: '#2a1a3a',
      textSecondary: 'rgba(42, 26, 58, 0.75)',
      textTertiary: 'rgba(42, 26, 58, 0.55)',
      border: 'rgba(123, 63, 242, 0.35)',
      borderLight: 'rgba(123, 63, 242, 0.15)',
      success: '#7B3FF2',
      error: '#dc3545',
      warning: '#f39c12',
      shadowColor: 'rgba(123, 63, 242, 0.25)',
      overlayBackground: 'rgba(250, 246, 252, 0.95)',
    }
  },
  blueDark: {
    name: 'Blue Sky Dark',
    isDark: true,
    colors: {
      primary: '#00D4FF',
      secondary: '#5B8DEF',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(0, 212, 255, 0.3)',
      borderLight: 'rgba(0, 212, 255, 0.15)',
      success: '#00D4FF',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#00D4FF',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  blueLight: {
    name: 'Blue Sky Light',
    isDark: false,
    colors: {
      primary: '#00A6CC',
      secondary: '#4A7FDB',
      background: '#fafcff',
      surface: '#f6f9fd',
      surfaceLight: '#f0f5fb',
      text: '#1a2a3a',
      textSecondary: 'rgba(26, 42, 58, 0.75)',
      textTertiary: 'rgba(26, 42, 58, 0.55)',
      border: 'rgba(0, 166, 204, 0.35)',
      borderLight: 'rgba(0, 166, 204, 0.15)',
      success: '#00A6CC',
      error: '#dc3545',
      warning: '#f39c12',
      shadowColor: 'rgba(0, 166, 204, 0.25)',
      overlayBackground: 'rgba(246, 249, 253, 0.95)',
    }
  },
  goldDark: {
    name: 'Gold Dark',
    isDark: true,
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(255, 215, 0, 0.3)',
      borderLight: 'rgba(255, 215, 0, 0.15)',
      success: '#FFD700',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#FFD700',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  goldLight: {
    name: 'Gold Light',
    isDark: false,
    colors: {
      primary: '#DAA520',
      secondary: '#B8860B',
      background: '#fffef5',
      surface: '#faf8f0',
      surfaceLight: '#f5f3e8',
      text: '#1a1a0f',
      textSecondary: 'rgba(26, 26, 15, 0.8)',
      textTertiary: 'rgba(26, 26, 15, 0.6)',
      border: 'rgba(218, 165, 32, 0.4)',
      borderLight: 'rgba(218, 165, 32, 0.15)',
      success: '#DAA520',
      error: '#d32f2f',
      warning: '#B8860B',
      shadowColor: 'rgba(218, 165, 32, 0.5)',
      overlayBackground: 'rgba(255, 255, 255, 0.85)',
    }
  },
  cherryDark: {
    name: 'Cherry Dark',
    isDark: true,
    colors: {
      primary: '#FF6B9D',
      secondary: '#FF8E9E',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(255, 107, 157, 0.3)',
      borderLight: 'rgba(255, 107, 157, 0.15)',
      success: '#43e97b',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#FF6B9D',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  cherryLight: {
    name: 'Cherry Light',
    isDark: false,
    colors: {
      primary: '#FF4F7F',
      secondary: '#FF7A85',
      background: '#fdfffe',
      surface: '#fdf8fa',
      surfaceLight: '#faf2f4',
      text: '#2e1a1f',
      textSecondary: 'rgba(46, 26, 31, 0.75)',
      textTertiary: 'rgba(46, 26, 31, 0.55)',
      border: 'rgba(255, 79, 127, 0.35)',
      borderLight: 'rgba(255, 79, 127, 0.15)',
      success: '#43e97b',
      error: '#dc3545',
      warning: '#f39c12',
      shadowColor: 'rgba(255, 79, 127, 0.25)',
      overlayBackground: 'rgba(253, 248, 250, 0.95)',
    }
  },
  cyberDark: {
    name: 'Cyber Dark',
    isDark: true,
    colors: {
      primary: '#00FFF0',
      secondary: '#FF10F0',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceLight: '#252525',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.85)',
      textTertiary: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(0, 255, 240, 0.3)',
      borderLight: 'rgba(0, 255, 240, 0.15)',
      success: '#00FFF0',
      error: '#ff3b30',
      warning: '#FFD700',
      shadowColor: '#00FFF0',
      overlayBackground: 'rgba(0, 0, 0, 0.85)',
    }
  },
  cyberLight: {
    name: 'Cyber Light',
    isDark: false,
    colors: {
      primary: '#00D4D4',
      secondary: '#E01FCD',
      background: '#fdfffe',
      surface: '#f8faf9',
      surfaceLight: '#f2f6f3',
      text: '#1a1a1a',
      textSecondary: 'rgba(26, 26, 26, 0.75)',
      textTertiary: 'rgba(26, 26, 26, 0.55)',
      border: 'rgba(0, 212, 212, 0.35)',
      borderLight: 'rgba(0, 212, 212, 0.15)',
      success: '#00D4D4',
      error: '#dc3545',
      warning: '#f39c12',
      shadowColor: 'rgba(0, 212, 212, 0.25)',
      overlayBackground: 'rgba(248, 250, 249, 0.95)',
    }
  }
};

// Function to apply theme colors to CSS custom properties
function applyTheme(themeName: string) {
  const theme = themes[themeName as keyof typeof themes];
  if (!theme) return;

  const root = document.documentElement;

  // Apply all theme colors as CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--color-${cssKey}`, value);

    // Also set Korus-specific variables for compatibility
    root.style.setProperty(`--color-korus-${cssKey}`, value);
  });

  // Set main theme variables
  root.style.setProperty('--background', theme.colors.background);
  root.style.setProperty('--foreground', theme.colors.text);
  root.style.setProperty('--korus-primary', theme.colors.primary);
  root.style.setProperty('--korus-secondary', theme.colors.secondary);

  // Set the key variables that the header component needs
  root.style.setProperty('--color-surface', theme.colors.surface);
  root.style.setProperty('--color-text', theme.colors.text);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="mintDark"
      themes={['mintDark', 'mintLight', 'purpleDark', 'purpleLight', 'blueDark', 'blueLight', 'goldDark', 'goldLight', 'cherryDark', 'cherryLight', 'cyberDark', 'cyberLight']}
      enableSystem={false}
      storageKey="korus-theme"
      disableTransitionOnChange={false}
    >
      <ThemeManager>
        {children}
      </ThemeManager>
    </NextThemesProvider>
  );
}

// Component to handle theme changes and apply CSS variables
function ThemeManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Function to update CSS variables based on current theme
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'mintDark';
      applyTheme(currentTheme);
    };

    // Apply theme on mount
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}