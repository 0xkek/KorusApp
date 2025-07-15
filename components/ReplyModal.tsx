import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
                      💬 Reply
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
    fontSize: 20,
    fontWeight: '800',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quoteContainer: {
    backgroundColor: 'rgba(67, 233, 123, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#43e97b',
  },
  quoteHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'monospace',
    color: '#43e97b',
    paddingLeft: 8,
  },
  quotedText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    paddingLeft: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(67, 233, 123, 0.9)',
    marginBottom: 20,
    letterSpacing: -0.01,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    minHeight: 100,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.01,
  },
  postButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});