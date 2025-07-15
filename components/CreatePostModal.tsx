import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface CreatePostModalProps {
  visible: boolean;
  content: string;
  activeTab: string;
  activeSubtopic: string;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onSubmit: (category: string, subcategory: string) => void;
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
  
  // Local state for category selection
  const [selectedCategory, setSelectedCategory] = useState(activeTab.toUpperCase());
  const [selectedSubcategory, setSelectedSubcategory] = useState(activeSubtopic);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);

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
    onSubmit(selectedCategory, selectedSubcategory);
  };

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

              {/* Category Selection */}
              <View style={styles.categorySelection}>
                <Text style={styles.selectionLabel}>Category:</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <LinearGradient
                    colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                    style={styles.dropdownGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedCategory}
                    </Text>
                    <Text style={styles.dropdownArrow}>
                      {showCategoryDropdown ? '▲' : '▼'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={styles.dropdownItem}
                        onPress={() => handleCategorySelect(category)}
                      >
                        <LinearGradient
                          colors={
                            selectedCategory === category
                              ? ['rgba(67, 233, 123, 0.2)', 'rgba(56, 249, 215, 0.1)']
                              : ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']
                          }
                          style={styles.dropdownItemGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
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
                <Text style={styles.selectionLabel}>Subcategory:</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowSubcategoryDropdown(!showSubcategoryDropdown)}
                >
                  <LinearGradient
                    colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                    style={styles.dropdownGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedSubcategory}
                    </Text>
                    <Text style={styles.dropdownArrow}>
                      {showSubcategoryDropdown ? '▲' : '▼'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {showSubcategoryDropdown && (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {subcategories[selectedCategory]?.map((subcategory) => (
                      <TouchableOpacity
                        key={subcategory}
                        style={styles.dropdownItem}
                        onPress={() => handleSubcategorySelect(subcategory)}
                      >
                        <LinearGradient
                          colors={
                            selectedSubcategory === subcategory
                              ? ['rgba(67, 233, 123, 0.2)', 'rgba(56, 249, 215, 0.1)']
                              : ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']
                          }
                          style={styles.dropdownItemGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
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
                  onPress={handleSubmit}
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
  categorySelection: {
    marginBottom: 16,
  },
  selectionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
    marginBottom: 8,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
    overflow: 'hidden',
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
    color: '#ffffff',
  },
  dropdownArrow: {
    fontSize: FontSizes.sm,
    color: '#43e97b',
    fontWeight: 'bold',
  },
  dropdownList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
    borderRadius: 12,
    marginTop: 4,
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dropdownItemTextSelected: {
    color: '#43e97b',
    fontFamily: Fonts.bold,
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