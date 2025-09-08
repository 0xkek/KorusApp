// import { BlurView } from 'expo-blur'; // Removed for performance
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Keyboard, FlatList } from 'react-native';
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
  onSubmit: (imageUrl?: string, shoutoutDuration?: number) => void;
}

// Shoutout duration options and pricing
const SHOUTOUT_OPTIONS = [
  { label: 'Select duration', value: null, price: 0 },
  { label: '10 minutes', value: 10, price: 0.05 },
  { label: '20 minutes', value: 20, price: 0.10 },
  { label: '30 minutes', value: 30, price: 0.18 },
  { label: '1 hour', value: 60, price: 0.35 },
  { label: '2 hours', value: 120, price: 0.70 },
  { label: '3 hours', value: 180, price: 1.30 },
  { label: '4 hours', value: 240, price: 2.00 },
];

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
  const [showShoutout, setShowShoutout] = useState(false);
  const [shoutoutDuration, setShoutoutDuration] = useState<number | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedMedia(null);
      setShowShoutout(false);
      setShoutoutDuration(null);
      setShowDurationPicker(false);
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
      
      // Submit post with uploaded image URL and shoutout duration if selected
      await onSubmit(uploadedImageUrl, shoutoutDuration || undefined);
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

                    {/* Shoutout Section */}
                    <TouchableOpacity
                      style={[styles.shoutoutBanner, { 
                        backgroundColor: colors.surface,
                        borderColor: showShoutout ? '#FFD700' : colors.borderLight,
                        borderWidth: showShoutout ? 2 : 1
                      }]}
                      onPress={() => setShowShoutout(!showShoutout)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={showShoutout ? ['#FFD700', '#FFA500'] : [colors.surface, colors.surface]}
                        style={styles.shoutoutGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.shoutoutHeader}>
                          <View style={styles.shoutoutIconText}>
                            <Text style={styles.shoutoutEmoji}>📢</Text>
                            <Text style={[styles.shoutoutTitle, { color: showShoutout ? '#000' : '#FFD700' }]}>
                              Make it a Shoutout!
                            </Text>
                          </View>
                          <Ionicons 
                            name={showShoutout ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color={showShoutout ? '#000' : '#FFD700'} 
                          />
                        </View>
                        {!showShoutout && (
                          <Text style={[styles.shoutoutSubtitle, { color: colors.textSecondary }]}>
                            Get guaranteed visibility at the top of feeds
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Expanded Shoutout Options */}
                    {showShoutout && (
                      <View style={[styles.shoutoutOptions, { backgroundColor: colors.surface, borderColor: 'rgba(255, 215, 0, 0.3)' }]}>
                        <Text style={[styles.shoutoutLabel, { color: colors.text }]}>Duration:</Text>
                        <TouchableOpacity
                          style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: 'rgba(255, 215, 0, 0.5)' }]}
                          onPress={() => setShowDurationPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.pickerText, { color: colors.text }]}>
                            {SHOUTOUT_OPTIONS.find(opt => opt.value === shoutoutDuration)?.label || 'Select duration'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        
                        {shoutoutDuration && (
                          <View style={styles.shoutoutPricing}>
                            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Cost:</Text>
                            <Text style={[styles.priceAmount, { color: '#FFD700' }]}>
                              {SHOUTOUT_OPTIONS.find(opt => opt.value === shoutoutDuration)?.price.toFixed(3)} SOL
                            </Text>
                            <Text style={[styles.priceNote, { color: colors.textTertiary }]}>
                              (~${((SHOUTOUT_OPTIONS.find(opt => opt.value === shoutoutDuration)?.price || 0) * 200).toFixed(0)})
                            </Text>
                          </View>
                        )}
                        
                        <Text style={[styles.shoutoutInfo, { color: colors.textSecondary }]}>
                          ✨ Your post will be pinned at the top of all feeds for the selected duration
                        </Text>
                      </View>
                    )}

                    {/* Duration Picker Modal */}
                    <Modal
                      visible={showDurationPicker}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowDurationPicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.pickerModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowDurationPicker(false)}
                      >
                        <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.pickerModalTitle, { color: colors.text, fontFamily: Fonts.bold }]}>Select Duration</Text>
                          <FlatList
                            data={SHOUTOUT_OPTIONS}
                            keyExtractor={(item) => item.label}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[
                                  styles.pickerOption,
                                  { borderBottomColor: colors.borderLight },
                                  item.value === shoutoutDuration && { backgroundColor: 'rgba(255, 215, 0, 0.1)' }
                                ]}
                                onPress={() => {
                                  setShoutoutDuration(item.value);
                                  setShowDurationPicker(false);
                                }}
                              >
                                <Text style={[
                                  styles.pickerOptionText,
                                  { color: colors.text, fontFamily: Fonts.regular },
                                  item.value === shoutoutDuration && { fontFamily: Fonts.bold }
                                ]}>
                                  {item.label}
                                </Text>
                                {item.value && (
                                  <Text style={[styles.pickerOptionPrice, { color: '#FFD700', fontFamily: Fonts.medium }]}>
                                    {item.price.toFixed(3)} SOL
                                  </Text>
                                )}
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      </TouchableOpacity>
                    </Modal>

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
    maxHeight: '90%',
    minHeight: 500,
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
  // Shoutout styles
  shoutoutBanner: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shoutoutGradient: {
    padding: 10,
  },
  shoutoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shoutoutIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shoutoutEmoji: {
    fontSize: 18,
  },
  shoutoutTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  shoutoutSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 2,
    marginLeft: 24,
  },
  shoutoutOptions: {
    marginTop: -6,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  shoutoutLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  pickerContainer: {
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pickerModalTitle: {
    fontSize: FontSizes.xl,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: FontSizes.base,
  },
  pickerOptionPrice: {
    fontSize: FontSizes.sm,
  },
  shoutoutPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  priceAmount: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  priceNote: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  shoutoutInfo: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});