import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface KorusAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'bump' | 'info';
  onClose: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export default function KorusAlert({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  autoDismiss = false,
  autoDismissDelay = 2000,
}: KorusAlertProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = createStyles(colors, isDarkMode);

  // Auto-dismiss functionality
  useEffect(() => {
    if (visible && autoDismiss) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, autoDismiss, autoDismissDelay, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertContainer}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {!autoDismiss && (
                <TouchableOpacity
                  style={styles.okButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.primary}
                    style={styles.okButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.okButtonText}>OK</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    minHeight: 200,
    borderWidth: 2,
    borderColor: colors.primary + '99',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    flex: 1,
  },
  contentContainer: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.02,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  okButton: {
    width: '100%',
    borderRadius: 16,
  },
  okButtonGradient: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? '#000000' : '#ffffff',
    letterSpacing: -0.01,
  },
});