import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, TouchableWithoutFeedback, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { validateReplyContent, sanitizeInput, getCharacterCount } from '../utils/validation';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary, validateImage } from '../utils/imageUpload';
import { logger } from '../utils/logger';
import { OptimizedImage } from './OptimizedImage';

interface ReplyModalProps {
  visible: boolean;
  content: string;
  quotedText?: string;
  quotedUsername?: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: (imageUrl?: string, videoUrl?: string) => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      videoMaxDuration: 60, // 60 seconds max for videos
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video' || asset.uri.toLowerCase().includes('.mp4') || asset.uri.toLowerCase().includes('.mov');
      setSelectedMedia({ uri: asset.uri, type: isVideo ? 'video' : 'image' });
    }
  };
  
  const removeMedia = () => {
    setSelectedMedia(null);
    setUploadProgress(0);
  };
  
  const handleSubmit = async () => {
    if (isSubmitting || isUploading) return;
    
    setIsSubmitting(true);
    let uploadedUrl: string | undefined;
    
    try {
      // Upload media if selected
      if (selectedMedia) {
        setIsUploading(true);
        setUploadProgress(0);
        
        if (selectedMedia.type === 'image') {
          // Validate and upload image
          if (!validateImage(selectedMedia.uri)) {
            throw new Error('Invalid image selected');
          }
          
          // Upload to Cloudinary with progress simulation
          const uploadPromise = uploadToCloudinary(selectedMedia.uri);
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 200);
          
          try {
            const uploadedImageUrl = await uploadPromise;
            clearInterval(progressInterval);
            setUploadProgress(100);
            uploadedUrl = uploadedImageUrl;
            logger.info('Image uploaded successfully:', uploadedImageUrl);
          } catch (error) {
            clearInterval(progressInterval);
            throw error;
          }
        } else {
          // For videos, we'd need to implement video upload
          // For now, we'll just show an alert
          throw new Error('Video upload not yet implemented');
        }
        
        setIsUploading(false);
      }
      
      // Submit reply with media URL
      await onSubmit(selectedMedia?.type === 'image' ? uploadedUrl : undefined, 
                     selectedMedia?.type === 'video' ? uploadedUrl : undefined);
      setSelectedMedia(null);
      setUploadProgress(0);
    } catch (error) {
      logger.error('Failed to submit reply:', error);
      Alert.alert(
        'Failed to Submit Reply', 
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
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
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {quotedText && (
                <View style={styles.quoteContainer}>
                  <View style={styles.quoteAccent} />
                  <Text style={styles.quoteHeader}>
                    Replying to {quotedUsername && quotedUsername !== 'anonymous.sol' 
                      ? `@${quotedUsername}` 
                      : quotedUsername?.startsWith('0x') || quotedUsername?.length > 30
                        ? `${quotedUsername?.slice(0, 4)}...${quotedUsername?.slice(-4)}`
                        : `@${quotedUsername}`}:
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
              
              {/* Media preview */}
              {selectedMedia && (
                <View style={styles.mediaPreviewContainer}>
                  {selectedMedia.type === 'image' ? (
                    <OptimizedImage source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} priority="high" />
                  ) : (
                    <View style={styles.videoPreviewContainer}>
                      <OptimizedImage 
                        source={{ uri: selectedMedia.uri }} 
                        style={styles.mediaPreview} 
                        priority="high"
                      />
                      <View style={styles.videoPlayIcon}>
                        <Ionicons name="play-circle" size={48} color="rgba(255, 255, 255, 0.9)" />
                      </View>
                    </View>
                  )}
                  {isUploading && (
                    <View style={styles.uploadProgressContainer}>
                      <View style={[styles.uploadProgressBar, { width: `${uploadProgress}%` }]} />
                      <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.removeMediaButton, { backgroundColor: colors.surface }]}
                    onPress={removeMedia}
                    disabled={isUploading}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Media button */}
              <TouchableOpacity 
                style={[styles.mediaButton, { backgroundColor: colors.surface }]}
                onPress={pickMedia}
                disabled={isUploading || isSubmitting}
              >
                <Ionicons name="image-outline" size={20} color={colors.primary} />
                <Text style={[styles.mediaButtonText, { color: colors.text }]}>Add Photo/Video</Text>
              </TouchableOpacity>

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
                    (!content.trim() || isUploading) && styles.postButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!content.trim() || isSubmitting || isUploading}
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
                        (!content.trim() || isSubmitting) && styles.postButtonTextDisabled
                      ]}>
                        {isUploading ? 'Uploading...' : isSubmitting ? 'Replying...' : 'Reply'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    maxHeight: '90%',
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
    paddingTop: 32,
    paddingBottom: 36,
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
    position: 'relative',
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
    minHeight: 180,
    maxHeight: 300,
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
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mediaButtonText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
  mediaPreviewContainer: {
    marginBottom: 16,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  videoPreviewContainer: {
    position: 'relative',
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  uploadProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
  },
  uploadProgressBar: {
    height: 3,
    backgroundColor: colors.primary,
  },
  uploadProgressText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 4,
  },
});