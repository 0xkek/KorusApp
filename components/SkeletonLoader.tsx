import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: SkeletonLoaderProps) {
  const { colors, isDarkMode } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const baseColor = isDarkMode ? '#2a2a2a' : '#e0e0e0';
  const highlightColor = isDarkMode ? '#3a3a3a' : '#f0f0f0';

  return (
    <Animated.View 
      style={[
        {
          width,
          height,
          borderRadius,
          opacity,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style
      ]}
    />
  );
}

export function PostSkeleton() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.postContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonLoader width={120} height={16} />
          <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      <View style={styles.content}>
        <SkeletonLoader width="100%" height={16} />
        <SkeletonLoader width="90%" height={16} style={{ marginTop: 8 }} />
        <SkeletonLoader width="70%" height={16} style={{ marginTop: 8 }} />
      </View>
      
      <View style={styles.footer}>
        <SkeletonLoader width={50} height={24} borderRadius={12} />
        <SkeletonLoader width={50} height={24} borderRadius={12} />
        <SkeletonLoader width={50} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  content: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});