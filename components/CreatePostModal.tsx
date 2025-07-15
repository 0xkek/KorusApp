import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface CreatePostModalProps {
  visible: boolean;
  content: string;
  activeTab: string;
  activeSubtopic: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: () => void;
}

export default function CreatePostModal({
  visible,
  content,
  activeTab,
  activeSubtopic,
  onClose,
  onContentChange,
  onSubmit,
}: CreatePostModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Share with the community
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Topic: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} → {activeSubtopic}
              </Text>

              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  value={content}
                  onChangeText={onContentChange}
                  maxLength={500}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
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
                  style={[
                    styles.postButton,
                    !content.trim() && styles.postButtonDisabled
                  ]}
                  onPress={onSubmit}
                  disabled={!content.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      !content.trim() 
                        ? ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']
                        : ['#43e97b', '#38f9d7']
                    }
                    style={styles.postButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.postButtonText,
                      !content.trim() && styles.postButtonTextDisabled
                    ]}>
                      Share
                    </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  blurWrapper: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  contentContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#ffffff',
    letterSpacing: -0.02,
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: 'rgba(67, 233, 123, 0.9)',
    marginBottom: 20,
    letterSpacing: -0.01,
    textTransform: 'uppercase',
  },
  textInputContainer: {
    borderRadius: 20,
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    borderRadius: 20,
    padding: 18,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    color: '#ffffff',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 20,
  },
  cancelButtonGradient: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  postButton: {
    flex: 1,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonGradient: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.3,
  },
  postButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});