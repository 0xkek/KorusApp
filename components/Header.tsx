import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import SettingsModal from './SettingsModal';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onCategoryChange?: (category: string | null, subcategory: string | null) => void;
  isCollapsed?: boolean; // New prop to control collapsed state
  onProfileClick?: () => void; // New prop for profile click
}

export default function Header({ onCategoryChange, isCollapsed = false, onProfileClick }: HeaderProps) {
  const { colors, isDarkMode, gradients, theme } = useTheme();
  const { walletAddress, selectedAvatar, selectedNFTAvatar, snsDomain } = useWallet();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // ScrollView refs for programmatic scrolling
  const categoryScrollRef = useRef<ScrollView>(null);
  const subScrollRef = useRef<ScrollView>(null);
  
  // Header slide-up animation
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  
  // Create dynamic styles based on theme
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  useEffect(() => {
    // Slide the entire header up/down
    Animated.timing(headerTranslateY, {
      toValue: isCollapsed ? -200 : 0, // Slide up 200px when collapsed
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isCollapsed]);
  
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

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      onCategoryChange?.(null, null);
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
      onCategoryChange?.(category, null);
      // Reset subcategory scroll to the left when changing categories
      setSubScrollX(0);
      setTimeout(() => {
        subScrollRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
    }
  };

  const handleSubcategoryPress = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    onCategoryChange?.(selectedCategory, subcategory);
    // Collapse subcategories after selection
    setTimeout(() => {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    }, 100); // Small delay to allow navigation to happen first
  };

  // Scroll functions with dynamic positioning
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [subScrollX, setSubScrollX] = useState(0);

  const scrollCategoriesRight = () => {
    const newX = categoryScrollX + 250;
    setCategoryScrollX(newX);
    categoryScrollRef.current?.scrollTo({ x: newX, animated: true });
  };

  const scrollSubcategoriesRight = () => {
    const newX = subScrollX + 250;
    setSubScrollX(newX);
    subScrollRef.current?.scrollTo({ x: newX, animated: true });
  };


  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    mainFrame: {
      ...styles.mainFrame,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
    },
    mainTitle: {
      ...styles.mainTitle,
      color: colors.text,
    },
    profileIconText: {
      ...styles.profileIconText,
      color: isDarkMode ? '#000000' : '#ffffff',
    },
    settingsIconText: {
      ...styles.settingsIconText,
      color: isDarkMode ? '#000000' : '#ffffff',
    },
    categoryBtnTxt: {
      ...styles.categoryBtnTxt,
      color: colors.text,
    },
    categoryBtnTxtSelected: {
      ...styles.categoryBtnTxtSelected,
      color: isDarkMode ? '#000000' : '#ffffff',
    },
    arrowContainer: {
      ...styles.arrowContainer,
      backgroundColor: colors.primary,
      shadowColor: colors.shadowColor,
    },
    scrollArrow: {
      ...styles.scrollArrow,
      color: isDarkMode ? '#000000' : '#ffffff',
    },
    categoriesArea: {
      ...styles.categoriesArea,
      borderTopColor: colors.borderLight,
    },
    subBtnTxt: {
      ...styles.subBtnTxt,
      color: colors.text,
    },
  });

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Animated.View 
        style={[
          dynamicStyles.container, 
          isCollapsed && styles.containerCollapsed,
          {
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        {/* Background gradient system matching main app */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.headerBaseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Color overlay gradient */}
        <LinearGradient
          colors={[
            colors.primary + '14',
            colors.secondary + '0C',
            'transparent',
            colors.primary + '0F',
            colors.secondary + '1A',
          ]}
          style={styles.headerColorOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Combined Header + Categories Frame */}
        <View style={dynamicStyles.mainFrame}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.gradientWrapper}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header Content */}
              {!isCollapsed && (
                <View style={styles.headerRow}>
                  {/* Profile Icon */}
                  <TouchableOpacity 
                    style={styles.profileIconContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onProfileClick?.();
                    }}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={styles.profileIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {selectedNFTAvatar ? (
                        <Image 
                          source={{ uri: selectedNFTAvatar.image || selectedNFTAvatar.uri }}
                          style={styles.profileIconNFT}
                        />
                      ) : selectedAvatar ? (
                        <Text style={styles.profileIconEmoji}>{selectedAvatar}</Text>
                      ) : (
                        <Text style={styles.profileIconText}>
                          {walletAddress ? walletAddress.slice(0, 2).toUpperCase() : '??'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <Text style={dynamicStyles.mainTitle}>KORUS</Text>
                  
                  {/* Settings Icon */}
                  <TouchableOpacity 
                    style={styles.settingsIconContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSettings(true);
                    }}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={styles.settingsIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons 
                        name="settings-outline" 
                        size={20} 
                        color={isDarkMode ? '#000' : '#fff'} 
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* Categories Section - Always visible */}
              <View style={[styles.categoriesArea, { borderTopColor: colors.borderLight }, isCollapsed && styles.categoriesAreaCollapsed]}>
                <View style={styles.categoryScrollContainer}>
                  <ScrollView 
                    ref={categoryScrollRef}
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryScrollContent}
                  >
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryBtn,
                          selectedCategory === category && styles.categoryBtnSelected
                        ]}
                        onPress={() => handleCategoryPress(category)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={
                            selectedCategory === category
                              ? gradients.primary
                              : gradients.button
                          }
                          style={styles.categoryBtnGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.categoryBtnContent}>
                            <Text style={[
                              dynamicStyles.categoryBtnTxt,
                              selectedCategory === category && dynamicStyles.categoryBtnTxtSelected
                            ]}>
                              {category}
                            </Text>
                            <Ionicons 
                              name={selectedCategory === category ? "chevron-down" : "chevron-down-outline"} 
                              size={14} 
                              color={selectedCategory === category ? (isDarkMode ? '#000' : '#fff') : colors.text}
                              style={{ marginLeft: 4 }}
                            />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Clickable scroll indicator arrow for categories */}
                  <TouchableOpacity 
                    style={styles.categoryScrollIndicator}
                    onPress={scrollCategoriesRight}
                    activeOpacity={0.7}
                  >
                    <View style={styles.arrowContainer}>
                      <Text style={styles.scrollArrow}>{'>'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Subcategories Frame */}
        {selectedCategory && (
          <View style={styles.subContainer}>
            <View style={[styles.subFrame, { borderColor: colors.borderLight, shadowColor: colors.shadowColor }]}>
              <BlurView intensity={25} style={styles.subBlur}>
                <LinearGradient
                  colors={gradients.surface}
                  style={styles.subGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.subScrollContainer}>
                    <ScrollView 
                      ref={subScrollRef}
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.subScroll}
                      contentContainerStyle={styles.subScrollContent}
                    >
                      {subcategories[selectedCategory]?.map((subcategory) => (
                        <TouchableOpacity
                          key={subcategory}
                          style={styles.subBtn}
                          onPress={() => handleSubcategoryPress(subcategory)}
                          activeOpacity={0.8}
                        >
                          <BlurView intensity={20} style={styles.subBtnBlur}>
                            <LinearGradient
                              colors={selectedSubcategory === subcategory ? gradients.primary : gradients.button}
                              style={[
                                styles.subBtnGrad,
                                selectedSubcategory === subcategory && styles.subBtnGradSelected
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={[
                                dynamicStyles.subBtnTxt,
                                { color: selectedSubcategory === subcategory ? (isDarkMode ? '#000' : '#fff') : colors.text }
                              ]}>
                                {subcategory}
                              </Text>
                            </LinearGradient>
                          </BlurView>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {/* Clickable scroll indicator arrow */}
                    <TouchableOpacity 
                      style={styles.scrollIndicator}
                      onPress={scrollSubcategoriesRight}
                      activeOpacity={0.7}
                    >
                      <View style={styles.arrowContainer}>
                        <Text style={styles.scrollArrow}>{'>'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </BlurView>
            </View>
          </View>
        )}
      </Animated.View>
      
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 35,
    paddingHorizontal: 15,
    paddingBottom: 8,
    zIndex: 1000,
  },
  headerBaseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerColorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  containerCollapsed: {
    paddingBottom: 4,
  },
  mainFrame: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary + '99' || 'rgba(67, 233, 123, 0.6)',
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    marginBottom: 10,
    zIndex: 2,
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientWrapper: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    height: 40, // Fixed height, no animation
    paddingHorizontal: 15,
  },
  mainTitle: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.extraBold,
    color: '#ffffff',
    letterSpacing: -1,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    marginLeft: -20,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIconText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000000',
  },
  profileIconEmoji: {
    fontSize: 20,
  },
  profileIconNFT: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    marginRight: -20,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsIconText: {
    fontSize: 24,
    color: '#000000',
    fontWeight: 'bold',
  },
  categoriesArea: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(67, 233, 123, 0.1)',
  },
  categoriesAreaCollapsed: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  categoryScrollContainer: {
    position: 'relative',
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    paddingRight: 50,
  },
  categoryBtn: {
    marginRight: 12,
    borderRadius: 16,
  },
  categoryBtnSelected: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1.0,
    shadowRadius: 20,
    elevation: 10,
  },
  categoryBtnGrad: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border || 'rgba(67, 233, 123, 0.4)',
    minWidth: 100,
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBtnTxt: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryBtnTxtSelected: {
    color: '#000000',
  },
  categoryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScrollIndicator: {
    position: 'absolute',
    right: -15,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  subContainer: {
    marginBottom: 10,
    zIndex: 2,
  },
  subFrame: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight || 'rgba(67, 233, 123, 0.15)',
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  subBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  subGradient: {
    padding: 15,
  },
  subScrollContainer: {
    position: 'relative',
  },
  subScroll: {
    flexGrow: 0,
  },
  subScrollContent: {
    paddingRight: 30,
  },
  subBtn: {
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  subBtnBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  subBtnGrad: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border || 'rgba(67, 233, 123, 0.4)',
    minWidth: 100,
    alignItems: 'center',
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  subBtnGradSelected: {
    borderColor: colors.primary || 'rgba(67, 233, 123, 0.9)',
    borderWidth: 2,
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  subBtnTxt: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scrollIndicator: {
    position: 'absolute',
    right: -15,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scrollIndicatorGradient: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary || '#43e97b',
    borderRadius: 12,
    shadowColor: colors.shadowColor || '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  scrollArrow: {
    fontSize: 14,
    color: isDarkMode ? '#000000' : '#ffffff',
    fontWeight: 'bold',
  },
});