import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

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
  const { colors, gradients, isDarkMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  
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
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackground }]}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={[
          styles.modalContent,
          {
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          }
        ]}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Avatar</Text>
                <TouchableOpacity onPress={handleClose} style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceLight + '1A',
                    borderColor: colors.border,
                  }
                ]}>
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Current Avatar Preview */}
              <View style={styles.previewContainer}>
                <LinearGradient
                  colors={gradients.primary}
                  style={[
                    styles.previewAvatar,
                    { shadowColor: colors.shadowColor }
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.previewAvatarText}>{selectedAvatar}</Text>
                </LinearGradient>
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>Preview</Text>
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
                        selectedAvatar === avatar && [
                          styles.avatarOptionSelected,
                          { borderColor: colors.primary }
                        ]
                      ]}
                      onPress={() => handleSelect(avatar)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.avatarOptionInner,
                        { backgroundColor: colors.surfaceLight + '1A' },
                        selectedAvatar === avatar && [
                          styles.avatarOptionInnerSelected,
                          { backgroundColor: colors.primary + '33' }
                        ]
                      ]}>
                        <Text style={styles.avatarOptionText}>{avatar}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Confirm Button */}
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  { shadowColor: colors.shadowColor }
                ]} 
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.confirmButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.confirmButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>Save Avatar</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  avatarOptionInner: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionInnerSelected: {},
  avatarOptionText: {
    fontSize: 28,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
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
  },
});