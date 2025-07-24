// import { BlurView } from 'expo-blur'; // Removed for performance
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';


interface CreatePostModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: (category: string, imageUrl?: string) => void;
}

export default function CreatePostModal({
  visible,
  content,
  onClose,
  onContentChange,
  onSubmit,
}: CreatePostModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  
  // Local state
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async () => {
    if (selectedMedia && !isUploading) {
      // Simulate upload
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      // Wait for "upload" to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsUploading(false);
      setUploadProgress(0);
    }
    
    onSubmit('GENERAL', selectedMedia?.uri);
    setSelectedMedia(null); // Reset media after submission
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { borderColor: colors.primary, shadowColor: colors.shadowColor }]}>
          <View style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Share with the community
                </Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeButtonContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>



              <View style={styles.textInputContainer}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text, shadowColor: colors.shadowColor }]}
                  placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={content}
                  onChangeText={onContentChange}
                  maxLength={500}
                />
              </View>

              {/* Media preview */}
              {selectedMedia && (
                <View style={styles.imagePreviewContainer}>
                  {selectedMedia.type === 'image' ? (
                    <Image source={{ uri: selectedMedia.uri }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.videoPreviewContainer}>
                      <Image 
                        source={{ uri: selectedMedia.uri }} 
                        style={styles.imagePreview} 
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


              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.surface}
                    style={[styles.cancelButtonGradient, { borderColor: colors.borderLight, shadowColor: colors.shadowColor }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.postButton,
                    (!content.trim() || isUploading) && styles.postButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!content.trim() || isUploading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      !content.trim() || isUploading
                        ? [colors.surface, colors.surface] // Use theme surface color when disabled
                        : gradients.primary // Use primary gradient for vibrant enabled state
                    }
                    style={styles.postButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.postButtonText,
                      { color: (!content.trim() || isUploading) ? colors.textTertiary : '#000000' }, // Always black text on bright gradient
                      (!content.trim() || isUploading) && styles.postButtonTextDisabled
                    ]}>
                      {isUploading ? 'Uploading...' : 'Share'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

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
    minHeight: '65%',
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
    padding: 32,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: FontSizes['2xl'],
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
  closeButton: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  categorySelection: {
    marginBottom: 16,
  },
  selectionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  dropdownArrow: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  dropdownList: {
    maxHeight: 150,
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownItem: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 1,
  },
  dropdownItemGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  dropdownItemTextSelected: {
    fontFamily: Fonts.bold,
  },
  textInputContainer: {
    borderRadius: 20,
    marginBottom: 32,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    minHeight: 225,
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
  actionButton: {
    flex: 1,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
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
});