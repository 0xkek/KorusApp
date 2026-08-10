import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Theming.
 *
 * Two independent axes, which is why this is a context rather than a constant:
 *   - accent: the premium theme colour, driving buttons, links and highlights
 *   - mode:   light or dark surfaces
 *
 * Previously `theme` was a frozen object, so the premium colour picker saved a
 * value that changed nothing except avatar fallbacks — invisible to anyone
 * with an NFT avatar.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export const DEFAULT_ACCENT = '#43e97b';

export interface Theme {
  mint: string; // accent — named `mint` so existing call sites keep working
  mintSecondary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  error: string;
  isDark: boolean;
}

function buildTheme(accent: string, dark: boolean): Theme {
  return dark
    ? {
        mint: accent,
        mintSecondary: accent,
        background: '#0a0a0a',
        surface: '#141414',
        border: withAlpha(accent, 0.15),
        text: '#ffffff',
        textSecondary: 'rgba(255,255,255,0.85)',
        textTertiary: 'rgba(255,255,255,0.55)',
        error: '#fca5a5',
        isDark: true,
      }
    : {
        mint: accent,
        mintSecondary: accent,
        background: '#ffffff',
        surface: '#f5f5f5',
        border: withAlpha(accent, 0.28),
        text: '#0a0a0a',
        textSecondary: 'rgba(0,0,0,0.75)',
        textTertiary: 'rgba(0,0,0,0.5)',
        error: '#b91c1c',
        isDark: false,
      };
}

/** #rrggbb -> rgba(), so borders can tint with the accent. */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(127,127,127,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  accent: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme(DEFAULT_ACCENT, true),
  mode: 'system',
  accent: DEFAULT_ACCENT,
  setMode: () => {},
  setAccent: () => {},
});

export function ThemeProvider({
  children,
  accent: accentProp,
}: {
  children: React.ReactNode;
  /** From the signed-in profile's themeColor. */
  accent?: string | null;
}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [accent, setAccent] = useState(accentProp || DEFAULT_ACCENT);

  // Follow the profile when it loads or changes, unless a local pick is newer.
  useEffect(() => {
    if (accentProp) setAccent(accentProp);
  }, [accentProp]);

  const value = useMemo(() => {
    const dark = mode === 'system' ? system !== 'light' : mode === 'dark';
    return {
      theme: buildTheme(accent, dark),
      mode,
      accent,
      setMode,
      setAccent,
    };
  }, [accent, mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeControls(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Static fallback for module-scope StyleSheet.create calls, which cannot read
 * context. Dynamic colours are applied inline at the call site.
 */
export const theme = buildTheme(DEFAULT_ACCENT, true);
