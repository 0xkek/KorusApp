import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

interface ReplyModalProps {
  visible: boolean;
  content: string;
  quotedText?: string;
  quotedUsername?: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: () => void;
}

export default function ReplyModal({
  visible,
  content,
  quotedText,
  quotedUsername,
  onClose,
  onContentChange,
  onSubmit,
}: ReplyModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

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
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {quotedText ? 'Reply with quote' : 'Reply to post'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {quotedText && (
                <View style={styles.quoteContainer}>
                  <View style={styles.quoteAccent} />
                  <Text style={styles.quoteHeader}>
                    Replying to @{quotedUsername}:
                  </Text>
                  <Text style={styles.quotedText}>
                    &ldquo;{quotedText}&rdquo;
                  </Text>
                </View>
              )}

              <Text style={styles.modalSubtitle}>
                Your voice matters. Share your perspective.
              </Text>

              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={quotedText ? "Share your response to this comment..." : "Share your thoughts, advice, or support..."}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  value={content}
                  onChangeText={onContentChange}
                  maxLength={300}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.button}
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
                        ? gradients.button
                        : gradients.primary
                    }
                    style={styles.postButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={18} 
                        color={!content.trim() ? colors.textSecondary : (isDarkMode ? '#000000' : '#ffffff')} 
                      />
                      <Text style={[
                        styles.postButtonText,
                        !content.trim() && styles.postButtonTextDisabled
                      ]}>
                        Reply
                      </Text>
                    </View>
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

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalBackground,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary + '99',
    shadowColor: colors.shadowColor,
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
    color: colors.text,
    letterSpacing: -0.02,
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.textSecondary,
  },
  quoteContainer: {
    backgroundColor: colors.primary + '14',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  quoteHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'monospace',
    color: colors.primary,
    paddingLeft: 8,
  },
  quotedText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    color: colors.text,
    paddingLeft: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 20,
    letterSpacing: -0.01,
  },
  textInputContainer: {
    borderRadius: 20,
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 18,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 24,
    shadowColor: colors.shadowColor,
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
    borderColor: colors.borderLight,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: colors.text,
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
    color: isDarkMode ? '#000000' : '#ffffff',
    letterSpacing: 0.3,
  },
  postButtonTextDisabled: {
    color: colors.textSecondary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});