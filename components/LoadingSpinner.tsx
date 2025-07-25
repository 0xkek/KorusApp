import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  size = 'large', 
  color,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const { colors } = useTheme();
  
  const spinner = (
    <ActivityIndicator 
      size={size} 
      color={color || colors.primary}
    />
  );

  if (!fullScreen) {
    return spinner;
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      {spinner}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});