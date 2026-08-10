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

export type ThemeMode = 'system' | 'light' | 'dim' | 'dark';

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

/** Which palette a resolved mode uses. 'system' is resolved before this. */
type Palette = 'light' | 'dim' | 'dark';

function buildTheme(accent: string, palette: Palette): Theme {
  if (palette === 'light') {
    return {
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

  if (palette === 'dim') {
    // Lifted and slightly blue-tinted, in the spirit of X's dim mode. Easier
    // over long sessions than near-black, and cards separate from the
    // background more clearly.
    return {
      mint: accent,
      mintSecondary: accent,
      background: '#15202b',
      surface: '#1c2732',
      border: withAlpha(accent, 0.2),
      text: '#f7f9f9',
      textSecondary: 'rgba(247,249,249,0.85)',
      textTertiary: 'rgba(247,249,249,0.55)',
      error: '#fca5a5',
      isDark: true,
    };
  }

  // Dark: near-black, matching korus.fun.
  return {
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
  theme: buildTheme(DEFAULT_ACCENT, 'dark'),
  mode: 'system',
  accent: DEFAULT_ACCENT,
  setMode: () => {},
  setAccent: () => {},
});

export function ThemeProvider({
  children,
  accent: accentProp,
  mode: modeProp,
}: {
  children: React.ReactNode;
  /** From the signed-in profile's themeColor. */
  accent?: string | null;
  /**
   * From the signed-in profile's themeMode. Stored per account rather than on
   * the device, so the preference follows the user — and because the app
   * deliberately persists nothing locally.
   */
  mode?: string | null;
}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [accent, setAccent] = useState(accentProp || DEFAULT_ACCENT);

  // Follow the profile when it loads or changes, unless a local pick is newer.
  useEffect(() => {
    if (accentProp) setAccent(accentProp);
  }, [accentProp]);

  useEffect(() => {
    if (
      modeProp === 'system' ||
      modeProp === 'light' ||
      modeProp === 'dim' ||
      modeProp === 'dark'
    ) {
      setMode(modeProp);
    }
  }, [modeProp]);

  const value = useMemo(() => {
    // 'system' follows the OS, which only distinguishes light from dark — it
    // has no notion of dim, so that resolves to the near-black dark.
    const palette: Palette =
      mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
    return {
      theme: buildTheme(accent, palette),
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
export const theme = buildTheme(DEFAULT_ACCENT, 'dark');
