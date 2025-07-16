export interface ThemeColors {
  // Gradient colors
  primary: string;
  secondary: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceLight: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Action colors
  success: string;
  error: string;
  warning: string;
  
  // Special colors
  shadowColor: string;
  overlayBackground: string;
}

export interface Theme {
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  gradients: {
    primary: string[];
    surface: string[];
    button: string[];
  };
}

// Mint theme (current green theme)
const mintDark: Theme = {
  name: 'Mint Dark',
  isDark: true,
  colors: {
    primary: '#43e97b',
    secondary: '#38f9d7',
    background: '#1a1a1a',
    surface: '#252525',
    surfaceLight: '#303030',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(67, 233, 123, 0.4)',
    borderLight: 'rgba(67, 233, 123, 0.1)',
    success: '#43e97b',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#43e97b',
    overlayBackground: 'rgba(0, 0, 0, 0.8)',
  },
  gradients: {
    primary: ['#43e97b', '#38f9d7'],
    surface: [
      'rgba(30, 30, 30, 0.95)',
      'rgba(20, 20, 20, 0.98)',
      'rgba(15, 15, 15, 0.99)',
      'rgba(10, 10, 10, 1)',
    ],
    button: ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)'],
  },
};

const mintLight: Theme = {
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
    border: 'rgba(45, 184, 105, 0.35)',
    borderLight: 'rgba(45, 184, 105, 0.15)',
    success: '#2DB869',
    error: '#dc3545',
    warning: '#f39c12',
    shadowColor: 'rgba(45, 184, 105, 0.25)',
    overlayBackground: 'rgba(248, 250, 249, 0.95)',
  },
  gradients: {
    primary: ['#2DB869', '#26D0A8'],
    surface: [
      'rgba(248, 250, 249, 0.98)',
      'rgba(242, 246, 243, 0.99)',
      'rgba(235, 242, 237, 0.99)',
      'rgba(225, 235, 228, 1)',
    ],
    button: ['rgba(242, 246, 243, 0.95)', 'rgba(235, 242, 237, 0.98)'],
  },
};

// Purple/Magenta theme
const purpleDark: Theme = {
  name: 'Purple Dark',
  isDark: true,
  colors: {
    primary: '#9945FF',
    secondary: '#E935C1',
    background: '#1a1a1a',
    surface: '#252525',
    surfaceLight: '#303030',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(153, 69, 255, 0.4)',
    borderLight: 'rgba(153, 69, 255, 0.1)',
    success: '#9945FF',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#9945FF',
    overlayBackground: 'rgba(0, 0, 0, 0.8)',
  },
  gradients: {
    primary: ['#9945FF', '#E935C1'],
    surface: [
      'rgba(30, 30, 30, 0.95)',
      'rgba(20, 20, 20, 0.98)',
      'rgba(15, 15, 15, 0.99)',
      'rgba(10, 10, 10, 1)',
    ],
    button: ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)'],
  },
};

const purpleLight: Theme = {
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
  },
  gradients: {
    primary: ['#7B3FF2', '#E01FCD'],
    surface: [
      'rgba(250, 246, 252, 0.98)',
      'rgba(244, 240, 248, 0.99)',
      'rgba(238, 232, 245, 0.99)',
      'rgba(228, 220, 238, 1)',
    ],
    button: ['rgba(244, 240, 248, 0.95)', 'rgba(238, 232, 245, 0.98)'],
  },
};

// Blue Sky theme
const blueDark: Theme = {
  name: 'Blue Sky Dark',
  isDark: true,
  colors: {
    primary: '#00D4FF',
    secondary: '#5B8DEF',
    background: '#1a1a1a',
    surface: '#252525',
    surfaceLight: '#303030',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(0, 212, 255, 0.4)',
    borderLight: 'rgba(0, 212, 255, 0.1)',
    success: '#00D4FF',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#00D4FF',
    overlayBackground: 'rgba(0, 0, 0, 0.8)',
  },
  gradients: {
    primary: ['#00D4FF', '#5B8DEF'],
    surface: [
      'rgba(30, 30, 30, 0.95)',
      'rgba(20, 20, 20, 0.98)',
      'rgba(15, 15, 15, 0.99)',
      'rgba(10, 10, 10, 1)',
    ],
    button: ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)'],
  },
};

const blueLight: Theme = {
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
  },
  gradients: {
    primary: ['#00A6CC', '#4A7FDB'],
    surface: [
      'rgba(246, 249, 253, 0.98)',
      'rgba(240, 245, 251, 0.99)',
      'rgba(232, 240, 248, 0.99)',
      'rgba(220, 232, 245, 1)',
    ],
    button: ['rgba(240, 245, 251, 0.95)', 'rgba(232, 240, 248, 0.98)'],
  },
};

export const themes = {
  mintDark,
  mintLight,
  purpleDark,
  purpleLight,
  blueDark,
  blueLight,
};

export const themeOptions = [
  { label: 'Mint', value: 'mint' },
  { label: 'Purple', value: 'purple' },
  { label: 'Blue Sky', value: 'blue' },
];

export const getTheme = (colorScheme: 'mint' | 'purple' | 'blue', isDark: boolean): Theme => {
  const themeKey = `${colorScheme}${isDark ? 'Dark' : 'Light'}` as keyof typeof themes;
  return themes[themeKey];
};