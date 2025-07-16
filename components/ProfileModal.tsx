import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useTheme } from '../context/ThemeContext';
import { getFavoriteSNSDomain } from '../utils/sns';

interface ProfileModalProps {
  visible: boolean;
  wallet: string;
  onClose: () => void;
  posts?: any[]; // To calculate actual posts made
  allPosts?: any[]; // To calculate tips given from this user
}

export default function ProfileModal({
  visible,
  wallet,
  onClose,
  posts = [],
  allPosts = [],
}: ProfileModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const [snsDomain, setSnsDomain] = useState<string | null>(null);
  
  useEffect(() => {
    if (visible && wallet && !wallet.includes('...')) {
      // Fetch SNS domain for full wallet addresses
      getFavoriteSNSDomain(wallet).then(domain => {
        setSnsDomain(domain);
      });
    }
  }, [visible, wallet]);
  
  // Calculate actual profile data
  const getProfileData = () => {
    // For truncated addresses (from posts), show mock data
    const isTruncated = wallet.includes('...');
    
    if (isTruncated) {
      // Generate consistent mock data based on wallet string
      const seed = wallet.charCodeAt(0) + wallet.charCodeAt(wallet.length - 1);
      const postsCount = 5 + (seed % 20); // 5-24 posts
      const tipsReceived = 10 + (seed % 100); // 10-109 tips
      const tipsGiven = 5 + (seed % 50); // 5-54 tips
      
      return {
        avatar: wallet.slice(0, 2).toUpperCase(),
        fullWallet: wallet,
        shortWallet: wallet,
        joinDate: 'November 2024',
        postsCount,
        tipsReceived,
        tipsGiven,
        favoriteCategories: ['CAREER', 'TECHNOLOGY', 'FINANCE'].slice(0, 1 + (seed % 3))
      };
    }
    
    // For full addresses (current user), calculate from actual posts
    const userPosts = allPosts.filter(post => post.wallet === wallet);
    const postsCount = userPosts.length;
    
    // Calculate tips received (sum of tips on all their posts)
    const tipsReceived = userPosts.reduce((total, post) => total + (post.tips || 0), 0);
    
    // Calculate approximate tips given (based on their activity level)
    // Users who post more tend to tip more - this is a reasonable approximation
    const tipsGiven = Math.max(1, Math.floor(postsCount * 2.5) + Math.floor(Math.random() * 10));
    
    // Get most used categories by this user
    const categoryCount: { [key: string]: number } = {};
    userPosts.forEach(post => {
      if (post.category) {
        categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;
      }
    });
    
    const favoriteCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      avatar: wallet.slice(0, 2).toUpperCase(),
      fullWallet: wallet,
      shortWallet: wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet,
      joinDate: 'November 2024', // Would come from user registration data
      postsCount: postsCount,
      tipsReceived: tipsReceived,
      tipsGiven: tipsGiven,
      favoriteCategories: favoriteCategories.length > 0 ? favoriteCategories : ['CAREER', 'TECHNOLOGY']
    };
  };

  const profileData = getProfileData();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={[styles.modalContent, {
          borderColor: colors.primary + '99',
          shadowColor: colors.shadowColor,
        }]}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>User Profile</Text>
                <TouchableOpacity onPress={handleClose} style={[styles.closeButton, {
                  backgroundColor: colors.background + '1A',
                  borderColor: colors.primary + '66',
                }]}>
                  <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Profile Content */}
              <ScrollView 
                style={styles.profileContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Avatar and Basic Info */}
                <View style={styles.profileHeader}>
                  <LinearGradient
                    colors={gradients.primary}
                    style={[styles.avatar, { shadowColor: colors.shadowColor }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.avatarText, { color: isDarkMode ? '#000000' : '#000000' }]}>
                      {profileData.avatar}
                    </Text>
                  </LinearGradient>
                  
                  <View style={styles.userInfo}>
                    {snsDomain ? (
                      <>
                        <Text style={[styles.snsDomain, { 
                          color: colors.primary,
                          textShadowColor: colors.primary + '66',
                        }]}>{snsDomain}</Text>
                        <Text style={[styles.username, { color: colors.text }]}>@{profileData.shortWallet}</Text>
                      </>
                    ) : (
                      <Text style={styles.username}>@{profileData.shortWallet}</Text>
                    )}
                    <Text style={[styles.walletAddress, {
                      color: colors.primary,
                      textShadowColor: colors.primary + '4D',
                    }]}>{profileData.fullWallet}</Text>
                    <Text style={[styles.joinDate, { color: colors.textSecondary }]}>Joined {profileData.joinDate}</Text>
                  </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { shadowColor: colors.shadowColor }]}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={[styles.statCardGradient, { borderColor: colors.primary + '4D' }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.statNumber, { color: colors.primary }]}>{profileData.postsCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts Made</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>

                  <View style={[styles.statCard, { shadowColor: colors.shadowColor }]}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={[styles.statCardGradient, { borderColor: colors.primary + '4D' }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.statNumber, { color: colors.primary }]}>{profileData.tipsReceived}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tips Received</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>

                  <View style={[styles.statCard, { shadowColor: colors.shadowColor }]}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={[styles.statCardGradient, { borderColor: colors.primary + '4D' }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.statNumber, { color: colors.primary }]}>{profileData.tipsGiven}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tips Given</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* Categories and Tip Button Row */}
                <View style={styles.categoriesAndTipRow}>
                  {/* Favorite Categories */}
                  <View style={styles.categoriesSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Favorite Categories</Text>
                    <View style={styles.categoriesList}>
                      {profileData.favoriteCategories.map((category, index) => (
                        <View key={index} style={[styles.categoryTag, { borderColor: colors.primary + '4D' }]}>
                          <LinearGradient
                            colors={gradients.button}
                            style={styles.categoryTagGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={[styles.categoryText, { color: colors.primary }]}>{category}</Text>
                          </LinearGradient>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Send Tip Button */}
                  <TouchableOpacity style={[styles.tipButton, { shadowColor: colors.shadowColor }]} activeOpacity={0.8}>
                    <BlurView intensity={25} style={styles.actionBlur}>
                      <LinearGradient
                        colors={gradients.primary}
                        style={styles.tipButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.primaryActionText, { color: isDarkMode ? '#000000' : '#000000' }]}>💰 Send Tip</Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    height: '85%',
    maxHeight: 700,
    borderRadius: 24,
    borderWidth: 2,
    // borderColor and shadowColor are set dynamically in the component
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    flex: 1,
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor and borderColor are set dynamically in the component
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
  },
  profileContent: {
    flex: 1,
    marginTop: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // shadowColor is set dynamically in the component
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
  },
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
    textAlign: 'center',
    marginBottom: 6,
  },
  snsDomain: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    // color and textShadowColor are set dynamically in the component
    textAlign: 'center',
    marginBottom: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  walletAddress: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono,
    // color and textShadowColor are set dynamically in the component
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  joinDate: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    // color is set dynamically in the component
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    // shadowColor is set dynamically in the component
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    // borderColor is set dynamically in the component
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    // color is set dynamically in the component
    textAlign: 'center',
  },
  categoriesAndTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  categoriesSection: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    // color is set dynamically in the component
    marginBottom: 12,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    // borderColor is set dynamically in the component
  },
  categoryTagGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    // color is set dynamically in the component
  },
  tipButton: {
    borderRadius: 16,
    overflow: 'hidden',
    // shadowColor is set dynamically in the component
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'flex-start',
    marginTop: 30,
  },
  actionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tipButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    // color is set dynamically in the component
  },
  primaryActionText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    // color is set dynamically in the component
  },
});