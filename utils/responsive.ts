import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Detect if it's a small device
export const isSmallDevice = screenWidth < 375;
export const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
export const isLargeDevice = screenWidth >= 414;

// Safe area considerations
export const hasNotch = Platform.OS === 'ios' && (screenHeight >= 812 || screenWidth >= 812);
export const statusBarHeight = Platform.OS === 'ios' ? (hasNotch ? 44 : 20) : 0;
export const bottomSafeArea = hasNotch ? 34 : 0;

// Responsive scaling functions
export const scale = (size: number): number => {
  const baseWidth = 375; // iPhone SE/8 width as base
  const scaleFactor = screenWidth / baseWidth;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const verticalScale = (size: number): number => {
  const baseHeight = 667; // iPhone SE/8 height as base
  const scaleFactor = screenHeight / baseHeight;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// Font size scaling
export const scaleFontSize = (size: number): number => {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  
  // Limit scaling to prevent text from being too large or too small
  if (scale < 0.95) return Math.round(newSize * 0.98);
  if (scale > 1.2) return Math.round(size * 1.1);
  return Math.round(newSize);
};

// Responsive dimensions
export const responsiveDimensions = {
  // Padding and margins
  paddingSmall: scale(8),
  paddingMedium: scale(16),
  paddingLarge: scale(24),
  paddingXLarge: scale(32),
  
  // Border radius
  borderRadiusSmall: scale(8),
  borderRadiusMedium: scale(12),
  borderRadiusLarge: scale(16),
  borderRadiusXLarge: scale(24),
  
  // Common component sizes
  buttonHeight: verticalScale(48),
  inputHeight: verticalScale(52),
  iconSize: scale(24),
  avatarSize: scale(44),
  
  // Modal dimensions
  modalWidth: screenWidth * 0.9,
  modalMaxWidth: Math.min(screenWidth * 0.9, 400),
  modalPadding: scale(24),
  
  // Screen dimensions
  screenWidth,
  screenHeight,
  safeAreaTop: statusBarHeight,
  safeAreaBottom: bottomSafeArea,
};

// Helper to get responsive styles
export const getResponsiveStyles = () => {
  return {
    container: {
      paddingHorizontal: responsiveDimensions.paddingMedium,
      paddingTop: responsiveDimensions.safeAreaTop,
      paddingBottom: responsiveDimensions.safeAreaBottom,
    },
    modalContainer: {
      width: responsiveDimensions.modalWidth,
      maxWidth: responsiveDimensions.modalMaxWidth,
      borderRadius: responsiveDimensions.borderRadiusXLarge,
      padding: responsiveDimensions.modalPadding,
    },
  };
};