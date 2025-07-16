import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';

interface AvatarSelectionModalProps {
  visible: boolean;
  currentAvatar: string;
  onClose: () => void;
  onSelect: (avatar: string) => void;
}

export default function AvatarSelectionModal({
  visible,
  currentAvatar,
  onClose,
  onSelect,
}: AvatarSelectionModalProps) {
  
  // Predefined avatar options
  const avatarOptions = [
    '🦊', '🦁', '🐯', '🦒', '🦝', '🐨', '🐼', '🐵',
    '🦉', '🦅', '🦜', '🦩', '🦚', '🦢', '🦆', '🐧',
    '🐙', '🦑', '🦈', '🐬', '🐳', '🐠', '🐡', '🦀',
    '🦋', '🐝', '🐞', '🦗', '🕷️', '🦂', '🐛', '🐜',
    '🌺', '🌸', '🌼', '🌻', '🌷', '🌹', '🏵️', '🌵',
    '🔥', '💫', '⭐', '✨', '💎', '💰', '🎯', '🎨',
    '🎭', '🎪', '🎢', '🎡', '🎮', '🕹️', '🎲', '🎯',
    '🚀', '🛸', '🛰️', '✈️', '🚁', '⛵', '🚂', '🏎️'
  ];

  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  const handleSelect = (avatar: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAvatar(avatar);
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(selectedAvatar);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAvatar(currentAvatar); // Reset to current avatar
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
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
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Avatar</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Current Avatar Preview */}
              <View style={styles.previewContainer}>
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.previewAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.previewAvatarText}>{selectedAvatar}</Text>
                </LinearGradient>
                <Text style={styles.previewLabel}>Preview</Text>
              </View>

              {/* Avatar Grid */}
              <ScrollView 
                style={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContent}
              >
                <View style={styles.avatarGrid}>
                  {avatarOptions.map((avatar, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.avatarOption,
                        selectedAvatar === avatar && styles.avatarOptionSelected
                      ]}
                      onPress={() => handleSelect(avatar)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.avatarOptionInner,
                        selectedAvatar === avatar && styles.avatarOptionInnerSelected
                      ]}>
                        <Text style={styles.avatarOptionText}>{avatar}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Confirm Button */}
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.confirmButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.confirmButtonText}>Save Avatar</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    width: '90%',
    maxWidth: 400,
    height: '75%',
    maxHeight: 600,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    flex: 1,
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  previewAvatarText: {
    fontSize: 40,
  },
  previewLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  gridContainer: {
    flex: 1,
    marginBottom: 16,
  },
  gridContent: {
    paddingBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '22%',
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarOptionSelected: {
    borderWidth: 2,
    borderColor: '#43e97b',
  },
  avatarOptionInner: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionInnerSelected: {
    backgroundColor: 'rgba(67, 233, 123, 0.2)',
  },
  avatarOptionText: {
    fontSize: 28,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 16,
  },
  confirmButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#000000',
  },
});