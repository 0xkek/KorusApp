import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

interface TipSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  username: string;
}

export default function TipSuccessModal({ visible, onClose, amount, username }: TipSuccessModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={gradients.surface}
            style={[styles.modal, { borderColor: colors.primary }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Success Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <LinearGradient
                colors={gradients.primary}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="checkmark" 
                  size={32} 
                  color={isDarkMode ? '#000' : '#fff'} 
                />
              </LinearGradient>
            </View>

            {/* Success Message */}
            <Text style={[styles.title, { color: colors.text }]}>
              Tip Sent! 💰
            </Text>
            
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              You sent {amount} $ALLY to
            </Text>
            
            <Text style={[styles.username, { color: colors.primary }]}>
              {username.slice(0, 6)}...{username.slice(-4)}
            </Text>

            {/* Subtle glow effect */}
            <View style={[styles.glow, { backgroundColor: colors.primary }]} />
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: 280,
  },
  modal: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.mono,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    opacity: 0.05,
    borderRadius: 200,
  },
});