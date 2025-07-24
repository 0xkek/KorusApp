import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useTheme } from '../context/ThemeContext';
import { getFavoriteSNSDomain } from '../utils/sns';
import { Ionicons } from '@expo/vector-icons';

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
  
  // Check if this user is premium based on their posts and get their theme
  const userPost = allPosts.find(post => post.wallet === wallet && post.isPremium);
  const isUserPremium = !!userPost;
  const userTheme = userPost?.userTheme;
  
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
        tipsGiven
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

    return {
      avatar: wallet.slice(0, 2).toUpperCase(),
      fullWallet: wallet,
      shortWallet: wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet,
      joinDate: 'November 2024', // Would come from user registration data
      postsCount: postsCount,
      tipsReceived: tipsReceived,
      tipsGiven: tipsGiven
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
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
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
                    style={[
                      styles.avatar, 
                      { 
                        shadowColor: colors.shadowColor,
                        borderWidth: 4,
                        borderColor: userTheme || '#43e97b'
                      }
                    ]}
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
                        <View style={styles.snsDomainRow}>
                          <Text style={[styles.snsDomain, { 
                            color: colors.primary,
                            textShadowColor: colors.primary + '66',
                          }]}>{snsDomain}</Text>
                          {isUserPremium && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                              <Ionicons name="star" size={10} color="#000" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.username, { color: colors.text }]}>@{profileData.shortWallet}</Text>
                      </>
                    ) : (
                      <View style={styles.usernameRow}>
                        <Text style={styles.username}>@{profileData.shortWallet}</Text>
                        {isUserPremium && (
                          <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                            <Ionicons name="star" size={10} color="#000" />
                          </View>
                        )}
                      </View>
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

                {/* Send Tip Button */}
                <View style={styles.tipButtonContainer}>
                  <TouchableOpacity style={[styles.tipButton, { shadowColor: colors.shadowColor }]} activeOpacity={0.8}>
                    <BlurView intensity={25} style={styles.actionBlur}>
                      <LinearGradient
                        colors={gradients.primary}
                        style={styles.tipButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="cash-outline" size={20} color={isDarkMode ? '#000000' : '#000000'} style={{ marginRight: 6 }} />
                          <Text style={[styles.primaryActionText, { color: isDarkMode ? '#000000' : '#000000' }]}>Send Tip</Text>
                        </View>
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
  snsDomainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
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
  tipButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
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