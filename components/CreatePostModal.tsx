// import { BlurView } from 'expo-blur'; // Removed for performance
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { validatePostContent, sanitizeInput, getCharacterCount } from '../utils/validation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadToCloudinary, validateImage } from '../utils/imageUpload';
import { logger } from '../utils/logger';
import { OptimizedImage } from './OptimizedImage';


interface CreatePostModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: (imageUrl?: string) => void;
}

export default function CreatePostModal({
  visible,
  content,
  onClose,
  onContentChange,
  onSubmit,
}: CreatePostModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Local state
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false); // Twitter-style submission guard

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedMedia(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    // Validate content
    const validation = validatePostContent(content);
    if (!validation.valid) {
      Alert.alert('Invalid Post', validation.error);
      return;
    }
    
    // Twitter-style: Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    let uploadedImageUrl: string | undefined;
    
    try {
      // Upload image to Cloudinary if present
      if (selectedMedia && selectedMedia.type === 'image') {
        setIsUploading(true);
        setUploadProgress(0);
        
        // Validate image
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
          uploadedImageUrl = await uploadPromise;
          setUploadProgress(100);
          logger.info('Image uploaded successfully:', uploadedImageUrl);
        } finally {
          clearInterval(progressInterval);
          setIsUploading(false);
        }
      }
      
      // Submit post with uploaded image URL
      await onSubmit(uploadedImageUrl);
      setSelectedMedia(null); // Reset media after submission
      onContentChange(''); // Clear content
      onClose(); // Close modal on success
    } catch (error) {
      logger.error('Failed to create post:', error);
      Alert.alert(
        'Failed to Create Post', 
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)' }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.modalContent, { borderColor: colors.primary, shadowColor: colors.shadowColor }]}>
                <LinearGradient
                  colors={gradients.surface}
                  style={styles.contentContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <ScrollView 
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <Text style={[styles.headerButtonText, { color: colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        New Post
                      </Text>
                      
                      <TouchableOpacity
                        style={[
                          styles.headerButton,
                          styles.shareButton,
                          (!content.trim() || isUploading || isSubmitting) && styles.shareButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={!content.trim() || isUploading || isSubmitting}
                      >
                        <LinearGradient
                          colors={(!content.trim() || isUploading || isSubmitting) ? [colors.surface, colors.surface] : gradients.primary}
                          style={styles.shareButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.shareButtonText, 
                            { color: (!content.trim() || isUploading || isSubmitting) ? colors.textTertiary : (isDarkMode ? '#000' : '#fff') }
                          ]}>
                            {isSubmitting ? 'Posting...' : 'Share'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.textInputContainer}>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text, shadowColor: colors.shadowColor }]}
                        placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        value={content}
                        onChangeText={(text) => onContentChange(sanitizeInput(text))}
                        maxLength={300}
                      />
                      <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
                        {getCharacterCount(content).current}/{getCharacterCount(content).max}
                      </Text>
                    </View>

                    {/* Media preview */}
                    {selectedMedia && (
                      <View style={styles.imagePreviewContainer}>
                        {selectedMedia.type === 'image' ? (
                          <OptimizedImage source={{ uri: selectedMedia.uri }} style={styles.imagePreview} priority="high" />
                        ) : (
                          <View style={styles.videoPreviewContainer}>
                            <OptimizedImage 
                              source={{ uri: selectedMedia.uri }} 
                              style={styles.imagePreview} 
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
                          style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
                          onPress={removeMedia}
                          disabled={isUploading}
                        >
                          <Ionicons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Media button */}
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity 
                        style={[styles.singleActionButton, { 
                          shadowColor: colors.primary,
                          shadowOpacity: 0.1
                        }]}
                        onPress={pickMedia}
                      >
                        <LinearGradient
                          colors={gradients.surface}
                          style={[styles.actionButtonGradient, { 
                            borderColor: colors.primary + '60',
                            borderWidth: 1.5
                          }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="images-outline" size={20} color={colors.primary} />
                          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                            Add Photo or Video
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </LinearGradient>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: '85%',
    minHeight: 400,
    overflow: 'hidden',
  },
  contentContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  shareButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  shareButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.02,
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputContainer: {
    borderRadius: 20,
    marginBottom: 32,
    position: 'relative',
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 28,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.3,
  },
  postButton: {
    flex: 1,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  postButtonGradient: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  postButtonTextDisabled: {
  },
  imagePreviewContainer: {
    marginTop: 16,
    marginBottom: 16,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  videoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  uploadProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 4,
    backgroundColor: '#43e97b',
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  singleActionButton: {
    width: '100%',
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
});