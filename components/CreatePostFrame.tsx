import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CreatePostFrameProps {
  onPress: () => void;
}

export default function CreatePostFrame({ onPress }: CreatePostFrameProps) {
  const { colors, isDarkMode, gradients } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.createPostFrame} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <BlurView intensity={40} style={styles.blurWrapper}>
        <LinearGradient
          colors={gradients.surface}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.createPostContent}>
            <Text style={[styles.createPostText, { color: colors.text }]}>
              Create a new post
            </Text>
            <LinearGradient
              colors={gradients.primary}
              style={styles.createPostButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.createPostButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                ✨
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  createPostFrame: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientContainer: {
    padding: 20,
  },
  createPostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createPostText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    letterSpacing: -0.01,
  },
  createPostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  createPostButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});