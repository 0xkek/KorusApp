// import { BlurView } from 'expo-blur'; // Removed for performance
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import SettingsModal from './SettingsModal';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onCategoryChange?: (category: string | null) => void;
  isCollapsed?: boolean; // New prop to control collapsed state
  onProfileClick?: () => void; // New prop for profile click
  selectedCategory?: string | null; // New prop to receive selected category from parent
}

export default function Header({ onCategoryChange, isCollapsed = false, onProfileClick, selectedCategory: parentSelectedCategory }: HeaderProps) {
  const { colors, isDarkMode, gradients, theme } = useTheme();
  const { walletAddress, selectedAvatar, selectedNFTAvatar, snsDomain, isPremium } = useWallet();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(parentSelectedCategory || null);
  const [showSettings, setShowSettings] = useState(false);
  
  
  // Header slide-up animation
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  
  // Create dynamic styles based on theme and safe area
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  
  useEffect(() => {
    // Slide the entire header up/down
    Animated.timing(headerTranslateY, {
      toValue: isCollapsed ? -200 : 0, // Slide up 200px when collapsed
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isCollapsed, headerTranslateY]);

  // Sync with parent selected category
  useEffect(() => {
    if (parentSelectedCategory !== undefined) {
      setSelectedCategory(parentSelectedCategory);
    }
  }, [parentSelectedCategory]);

  
  const categories = [
    'GENERAL', 'GAMES', 'EVENTS'
  ];

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      onCategoryChange?.(null);
    } else {
      setSelectedCategory(category);
      onCategoryChange?.(category);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };



  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
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
    categoriesArea: {
      ...styles.categoriesArea,
      borderTopColor: colors.borderLight,
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

        {/* Combined Header + Categories Frame */}
        <View style={dynamicStyles.mainFrame}>
          <View style={styles.blurWrapper}>
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
                      style={[
                        styles.profileIcon,
                        {
                          borderWidth: 1,
                          borderColor: colors.primary
                        }
                      ]}
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
                      router.push('/settings');
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
                <View style={styles.categoriesContainer}>
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
                        <Text style={[
                          dynamicStyles.categoryBtnTxt,
                          selectedCategory === category && dynamicStyles.categoryBtnTxtSelected
                        ]}>
                          {category}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </LinearGradient>
          </View>
        </View>
      </Animated.View>
      
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

const createStyles = (colors: any, isDarkMode: boolean, insets: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Math.max(insets.top, 20) + 10, // Reduced extra padding to use more space
    paddingHorizontal: 15,
    paddingBottom: 8,
    zIndex: 1000,
  },
  containerCollapsed: {
    paddingBottom: 4,
  },
  mainFrame: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary + '99' || 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
    zIndex: 2,
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientWrapper: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    height: 50, // Increased height
    paddingHorizontal: 15,
  },
  mainTitle: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.extraBold,
    color: '#ffffff',
    letterSpacing: -1,
  },
  profileIconContainer: {
    width: 48,
    height: 48,
    marginLeft: -20,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  categoryBtn: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
  },
  categoryBtnSelected: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryBtnGrad: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border || 'rgba(67, 233, 123, 0.4)',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
});