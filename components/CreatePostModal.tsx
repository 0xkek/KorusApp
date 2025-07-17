import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface CreatePostModalProps {
  visible: boolean;
  content: string;
  activeTab: string;
  activeSubtopic: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: (category: string, subcategory: string, imageUrl?: string) => void;
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
  const { colors, isDarkMode, gradients } = useTheme();
  
  // Local state for category selection
  const [selectedCategory, setSelectedCategory] = useState(activeTab.toUpperCase());
  const [selectedSubcategory, setSelectedSubcategory] = useState(activeSubtopic);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Categories and subcategories (matching Header component)
  const categories = [
    'CAREER', 'HEALTH', 'RELATIONSHIPS', 'FINANCE', 'TECHNOLOGY', 
    'LIFESTYLE', 'EDUCATION', 'ENTERTAINMENT', 'SPORTS', 'TRAVEL', 
    'BUSINESS', 'POLITICS'
  ];
  
  const subcategories: { [key: string]: string[] } = {
    CAREER: ['Job Search', 'Interviews', 'Networking', 'Salary Negotiations'],
    HEALTH: ['Mental Health', 'Fitness', 'Nutrition', 'Medical'],
    RELATIONSHIPS: ['Dating', 'Marriage', 'Family', 'Friendship'],
    FINANCE: ['Investing', 'Budgeting', 'Crypto', 'Real Estate'],
    TECHNOLOGY: ['AI/ML', 'Web Dev', 'Mobile Apps', 'Blockchain'],
    LIFESTYLE: ['Fashion', 'Home', 'Food', 'Travel'],
    EDUCATION: ['College', 'Online Learning', 'Certifications', 'Skills'],
    ENTERTAINMENT: ['Movies', 'Music', 'Gaming', 'Books'],
    SPORTS: ['Football', 'Basketball', 'Soccer', 'Fitness'],
    TRAVEL: ['Destinations', 'Tips', 'Budget Travel', 'Solo Travel'],
    BUSINESS: ['Startups', 'Marketing', 'Leadership', 'Strategy'],
    POLITICS: ['Elections', 'Policy', 'Local Gov', 'International']
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategories[category][0]); // Default to first subcategory
    setShowCategoryDropdown(false);
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setShowSubcategoryDropdown(false);
  };

  const handleSubmit = () => {
    onSubmit(selectedCategory, selectedSubcategory, selectedImage || undefined);
    setSelectedImage(null); // Reset image after submission
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)' }]}>
        <View style={[styles.modalContent, { borderColor: colors.primary, shadowColor: colors.shadowColor }]}>
          <BlurView intensity={40} style={styles.blurWrapper}>
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

              {/* Category Selection */}
              <View style={styles.categorySelection}>
                <Text style={[styles.selectionLabel, { color: colors.primary }]}>Category:</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.dropdownGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                      {selectedCategory}
                    </Text>
                    <Text style={[styles.dropdownArrow, { color: colors.primary }]}>
                      {showCategoryDropdown ? '▲' : '▼'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <ScrollView style={[styles.dropdownList, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]} nestedScrollEnabled>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={styles.dropdownItem}
                        onPress={() => handleCategorySelect(category)}
                      >
                        <LinearGradient
                          colors={
                            selectedCategory === category
                              ? gradients.primary
                              : gradients.surface
                          }
                          style={styles.dropdownItemGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            { color: selectedCategory === category ? colors.primary : colors.textSecondary },
                            selectedCategory === category && styles.dropdownItemTextSelected
                          ]}>
                            {category}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Subcategory Selection */}
              <View style={styles.categorySelection}>
                <Text style={[styles.selectionLabel, { color: colors.primary }]}>Subcategory:</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]}
                  onPress={() => setShowSubcategoryDropdown(!showSubcategoryDropdown)}
                >
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.dropdownGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                      {selectedSubcategory}
                    </Text>
                    <Text style={[styles.dropdownArrow, { color: colors.primary }]}>
                      {showSubcategoryDropdown ? '▲' : '▼'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {showSubcategoryDropdown && (
                  <ScrollView style={[styles.dropdownList, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]} nestedScrollEnabled>
                    {subcategories[selectedCategory]?.map((subcategory) => (
                      <TouchableOpacity
                        key={subcategory}
                        style={styles.dropdownItem}
                        onPress={() => handleSubcategorySelect(subcategory)}
                      >
                        <LinearGradient
                          colors={
                            selectedSubcategory === subcategory
                              ? gradients.primary
                              : gradients.surface
                          }
                          style={styles.dropdownItemGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            { color: selectedSubcategory === subcategory ? colors.primary : colors.textSecondary },
                            selectedSubcategory === subcategory && styles.dropdownItemTextSelected
                          ]}>
                            {subcategory}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
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

              {/* Image preview */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
                    onPress={removeImage}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Image picker button */}
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={pickImage}
              >
                <LinearGradient
                  colors={[colors.primary + '15', colors.primary + '08']}
                  style={[styles.imagePickerGradient, { borderColor: colors.primary + '50' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={[styles.imagePickerText, { color: colors.primary }]}>
                    {selectedImage ? 'Change Image' : 'Add Image'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

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
                    !content.trim() && styles.postButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!content.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      !content.trim() 
                        ? gradients.surface
                        : gradients.button
                    }
                    style={styles.postButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.postButtonText,
                      { color: !content.trim() ? colors.textSecondary : (isDarkMode ? '#000000' : '#000000') },
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 0,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    letterSpacing: 0.3,
  },
  postButtonTextDisabled: {
  },
  imagePreviewContainer: {
    marginTop: 12,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  imagePickerButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  imagePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  imagePickerText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
});