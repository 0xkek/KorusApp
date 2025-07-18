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

// Gold theme - Luxury and warmth
const goldDark: Theme = {
  name: 'Gold Dark',
  isDark: true,
  colors: {
    primary: '#FFD700',        // Gold
    secondary: '#FFA500',      // Orange Gold
    background: '#0a0a0a',
    surface: '#141414',
    surfaceLight: '#1f1f1f',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 215, 0, 0.4)',
    borderLight: 'rgba(255, 215, 0, 0.1)',
    success: '#FFD700',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#FFD700',
    overlayBackground: 'rgba(0, 0, 0, 0.7)',
    modalBackground: 'rgba(0, 0, 0, 0.85)',
  },
  gradients: {
    primary: ['#FFD700', '#FFA500'], // Gold to Orange Gold
    secondary: ['#FFA500', '#FF8C00'], // Orange Gold to Dark Orange
    surface: [
      'rgba(30, 30, 30, 0.95)',
      'rgba(20, 20, 20, 0.98)',
      'rgba(15, 15, 15, 0.99)',
      'rgba(10, 10, 10, 1)',
    ],
    button: ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)'],
  },
};

const goldLight: Theme = {
  name: 'Gold Light',
  isDark: false,
  colors: {
    primary: '#DAA520',         // Darker gold for light mode
    secondary: '#B8860B',       // Dark goldenrod
    background: '#fffef5',      // Soft gold-tinted white
    surface: '#faf8f0',
    surfaceLight: '#f5f3e8',
    text: '#1a1a0f',           // Dark brown-black
    textSecondary: 'rgba(26, 26, 15, 0.8)',
    textTertiary: 'rgba(26, 26, 15, 0.6)',
    border: 'rgba(218, 165, 32, 0.4)',
    borderLight: 'rgba(218, 165, 32, 0.15)',
    success: '#DAA520',
    error: '#d32f2f',
    warning: '#B8860B',
    shadowColor: 'rgba(218, 165, 32, 0.5)',
    overlayBackground: 'rgba(255, 255, 255, 0.85)',
    modalBackground: 'rgba(255, 255, 255, 0.95)',
  },
  gradients: {
    primary: ['#DAA520', '#B8860B'], // Goldenrod to Dark Goldenrod
    secondary: ['#B8860B', '#996515'], // Dark Goldenrod to Darker
    surface: [
      'rgba(255, 254, 245, 0.98)',
      'rgba(254, 253, 244, 0.99)',
      'rgba(252, 250, 240, 0.99)',
      'rgba(250, 245, 230, 1)',
    ],
    button: [
      'rgba(255, 254, 245, 0.95)',
      'rgba(254, 253, 244, 0.98)',
      'rgba(252, 250, 240, 0.99)',
    ],
  },
};

// Cherry Blossom theme
const cherryDark: Theme = {
  name: 'Cherry Dark',
  isDark: true,
  colors: {
    primary: '#FF6B9D',
    secondary: '#FF8E9E',
    background: '#1a1a1a',
    surface: '#252525',
    surfaceLight: '#303030',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 107, 157, 0.4)',
    borderLight: 'rgba(255, 107, 157, 0.1)',
    success: '#43e97b',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#FF6B9D',
    overlayBackground: 'rgba(0, 0, 0, 0.8)',
  },
  gradients: {
    primary: ['#FF6B9D', '#FF8E9E'],
    surface: [
      'rgba(30, 20, 25, 0.95)',
      'rgba(20, 15, 18, 0.98)',
      'rgba(15, 10, 13, 0.99)',
      'rgba(10, 5, 8, 1)',
    ],
    button: ['rgba(25, 20, 22, 0.9)', 'rgba(20, 15, 18, 0.95)'],
  },
};

const cherryLight: Theme = {
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
  },
  gradients: {
    primary: ['#FF4F7F', '#FF7A85'],
    surface: [
      'rgba(253, 248, 250, 0.98)',
      'rgba(250, 242, 244, 0.99)',
      'rgba(247, 235, 237, 0.99)',
      'rgba(242, 225, 228, 1)',
    ],
    button: [
      'rgba(255, 254, 254, 0.95)',
      'rgba(254, 252, 252, 0.98)',
      'rgba(252, 248, 249, 0.99)',
    ],
  },
};

// Cyber Neon theme
const cyberDark: Theme = {
  name: 'Cyber Dark',
  isDark: true,
  colors: {
    primary: '#00FFF0',
    secondary: '#FF10F0',
    background: '#0a0a0a',
    surface: '#141414',
    surfaceLight: '#1f1f1f',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(0, 255, 240, 0.4)',
    borderLight: 'rgba(0, 255, 240, 0.1)',
    success: '#00FFF0',
    error: '#ff3b30',
    warning: '#FFD700',
    shadowColor: '#00FFF0',
    overlayBackground: 'rgba(0, 0, 0, 0.8)',
  },
  gradients: {
    primary: ['#00FFF0', '#FF10F0'],
    surface: [
      'rgba(20, 20, 20, 0.95)',
      'rgba(15, 15, 15, 0.98)',
      'rgba(10, 10, 10, 0.99)',
      'rgba(5, 5, 5, 1)',
    ],
    button: ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)'],
  },
};

const cyberLight: Theme = {
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
  },
  gradients: {
    primary: ['#00D4D4', '#E01FCD'],
    surface: [
      'rgba(248, 250, 249, 0.98)',
      'rgba(242, 246, 243, 0.99)',
      'rgba(235, 242, 237, 0.99)',
      'rgba(225, 235, 228, 1)',
    ],
    button: [
      'rgba(255, 254, 254, 0.95)',
      'rgba(254, 252, 252, 0.98)',
      'rgba(252, 248, 249, 0.99)',
    ],
  },
};

export const themes = {
  mintDark,
  mintLight,
  purpleDark,
  purpleLight,
  blueDark,
  blueLight,
  goldDark,
  goldLight,
  cherryDark,
  cherryLight,
  cyberDark,
  cyberLight,
};

export const themeOptions = [
  { label: 'Mint', value: 'mint' },
  { label: 'Purple', value: 'purple' },
  { label: 'Blue Sky', value: 'blue' },
  { label: 'Gold', value: 'gold' },
  { label: 'Cherry Blossom', value: 'cherry' },
  { label: 'Cyber Neon', value: 'cyber' },
];

export const getTheme = (colorScheme: 'mint' | 'purple' | 'blue' | 'gold' | 'cherry' | 'cyber', isDark: boolean): Theme => {
  const themeKey = `${colorScheme}${isDark ? 'Dark' : 'Light'}` as keyof typeof themes;
  return themes[themeKey];
};