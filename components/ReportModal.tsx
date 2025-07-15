import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  postId?: number;
}

export default function ReportModal({
  visible,
  onClose,
  onConfirm,
  postId,
}: ReportModalProps) {
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleCancel}
        />
        
        <View style={styles.modalContent}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={[
                'rgba(25, 25, 25, 0.95)',
                'rgba(20, 20, 20, 0.98)',
                'rgba(15, 15, 15, 0.99)',
              ]}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Warning Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>Report Post?</Text>
              
              {/* Message */}
              <Text style={styles.message}>
                Are you sure you want to report this post? Our moderation team will review it for violations of community guidelines.
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                    style={styles.cancelButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF5252']}
                    style={styles.reportButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.reportButtonText}>Report</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reportButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  reportButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  reportButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#ffffff',
  },
});