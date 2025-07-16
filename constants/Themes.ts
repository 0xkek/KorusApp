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
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceLight: '#e8e8e8',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.8)',
    textTertiary: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(45, 184, 105, 0.4)',
    borderLight: 'rgba(45, 184, 105, 0.1)',
    success: '#2DB869',
    error: '#ff3b30',
    warning: '#FF9500',
    shadowColor: 'rgba(45, 184, 105, 0.3)',
    overlayBackground: 'rgba(255, 255, 255, 0.9)',
  },
  gradients: {
    primary: ['#2DB869', '#26D0A8'],
    surface: [
      'rgba(255, 255, 255, 0.95)',
      'rgba(250, 250, 250, 0.98)',
      'rgba(245, 245, 245, 0.99)',
      'rgba(240, 240, 240, 1)',
    ],
    button: ['rgba(250, 250, 250, 0.9)', 'rgba(245, 245, 245, 0.95)'],
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
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceLight: '#e8e8e8',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.8)',
    textTertiary: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(123, 63, 242, 0.4)',
    borderLight: 'rgba(123, 63, 242, 0.1)',
    success: '#7B3FF2',
    error: '#ff3b30',
    warning: '#FF9500',
    shadowColor: 'rgba(123, 63, 242, 0.3)',
    overlayBackground: 'rgba(255, 255, 255, 0.9)',
  },
  gradients: {
    primary: ['#7B3FF2', '#E01FCD'],
    surface: [
      'rgba(255, 255, 255, 0.95)',
      'rgba(250, 250, 250, 0.98)',
      'rgba(245, 245, 245, 0.99)',
      'rgba(240, 240, 240, 1)',
    ],
    button: ['rgba(250, 250, 250, 0.9)', 'rgba(245, 245, 245, 0.95)'],
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
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceLight: '#e8e8e8',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.8)',
    textTertiary: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(0, 166, 204, 0.4)',
    borderLight: 'rgba(0, 166, 204, 0.1)',
    success: '#00A6CC',
    error: '#ff3b30',
    warning: '#FF9500',
    shadowColor: 'rgba(0, 166, 204, 0.3)',
    overlayBackground: 'rgba(255, 255, 255, 0.9)',
  },
  gradients: {
    primary: ['#00A6CC', '#4A7FDB'],
    surface: [
      'rgba(255, 255, 255, 0.95)',
      'rgba(250, 250, 250, 0.98)',
      'rgba(245, 245, 245, 0.99)',
      'rgba(240, 240, 240, 1)',
    ],
    button: ['rgba(250, 250, 250, 0.9)', 'rgba(245, 245, 245, 0.95)'],
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