import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';

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
  // Calculate actual profile data
  const getProfileData = () => {
    // Count posts made by this user
    const userPosts = allPosts.filter(post => post.wallet === wallet);
    const postsCount = userPosts.length;
    
    // Calculate tips received (sum of tips on all their posts)
    const tipsReceived = userPosts.reduce((total, post) => total + (post.tips || 0), 0);
    
    // Calculate tips given (mock for now - would need transaction history)
    const tipsGiven = Math.floor(Math.random() * 50) + 5; // Mock data for now
    
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
      avatar: wallet.slice(0, 2),
      fullWallet: wallet,
      joinDate: 'November 2024', // Would come from user registration data
      postsCount,
      tipsReceived,
      tipsGiven,
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
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>User Profile</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Profile Content */}
              <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
                {/* Avatar and Basic Info */}
                <View style={styles.profileHeader}>
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarText}>
                      {profileData.avatar}
                    </Text>
                  </LinearGradient>
                  
                  <View style={styles.userInfo}>
                    <Text style={styles.walletAddress}>{profileData.fullWallet}</Text>
                    <Text style={styles.joinDate}>Joined {profileData.joinDate}</Text>
                  </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                      style={styles.statCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.statNumber}>{profileData.postsCount}</Text>
                      <Text style={styles.statLabel}>Posts Made</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                      style={styles.statCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.statNumber}>{profileData.tipsReceived}</Text>
                      <Text style={styles.statLabel}>Tips Received</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                      style={styles.statCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.statNumber}>{profileData.tipsGiven}</Text>
                      <Text style={styles.statLabel}>Tips Given</Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Favorite Categories */}
                <View style={styles.categoriesSection}>
                  <Text style={styles.sectionTitle}>Favorite Categories</Text>
                  <View style={styles.categoriesList}>
                    {profileData.favoriteCategories.map((category, index) => (
                      <View key={index} style={styles.categoryTag}>
                        <LinearGradient
                          colors={['rgba(67, 233, 123, 0.2)', 'rgba(56, 249, 215, 0.1)']}
                          style={styles.categoryTagGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.categoryText}>{category}</Text>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                    <LinearGradient
                      colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.actionButtonText}>💬 Message</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                    <LinearGradient
                      colors={['#43e97b', '#38f9d7']}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.primaryActionText}>💰 Send Tip</Text>
                    </LinearGradient>
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
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
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  profileContent: {
    flex: 1,
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
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: '#000000',
  },
  userInfo: {
    alignItems: 'center',
  },
  walletAddress: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.mono,
    color: '#43e97b',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(67, 233, 123, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  joinDate: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.6)',
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
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#43e97b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#ffffff',
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
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  categoryTagGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  actionButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  primaryActionText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000000',
  },
});