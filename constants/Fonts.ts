import { Platform } from 'react-native';

export const Fonts = {
  // Poppins font family - modern, geometric, excellent readability
  regular: Platform.select({
    ios: 'Poppins-Regular',
    android: 'Poppins-Regular',
    default: 'Poppins-Regular',
  }),
  medium: Platform.select({
    ios: 'Poppins-Medium', 
    android: 'Poppins-Medium',
    default: 'Poppins-Medium',
  }),
  semiBold: Platform.select({
    ios: 'Poppins-SemiBold',
    android: 'Poppins-SemiBold', 
    default: 'Poppins-SemiBold',
  }),
  bold: Platform.select({
    ios: 'Poppins-Bold',
    android: 'Poppins-Bold',
    default: 'Poppins-Bold',
  }),
  extraBold: Platform.select({
    ios: 'Poppins-ExtraBold',
    android: 'Poppins-ExtraBold',
    default: 'Poppins-ExtraBold',
  }),
  // Monospace for wallet addresses and technical text
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'SpaceMono-Regular',
  }),
};

// Typography scale - consistent sizing throughout app
export const FontSizes = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 36,
};

// Line heights for readability
export const LineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
};