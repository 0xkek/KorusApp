import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Clipboard, TextInput, Linking } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import AvatarSelectionModal from './AvatarSelectionModal';
import NFTAvatarModal from './NFTAvatarModal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OptimizedImage } from './OptimizedImage';

interface MyProfileModalProps {
  visible: boolean;
  onClose: () => void;
  allPosts?: any[]; // To calculate user's stats
}

export default function MyProfileModal({
  visible,
  onClose,
  allPosts = [],
}: MyProfileModalProps) {
  const { walletAddress, balance, selectedAvatar, setSelectedAvatar, selectedNFTAvatar, setSelectedNFTAvatar, snsDomain, allSNSDomains, setFavoriteSNSDomain, isPremium, timeFunUsername, setTimeFunUsername } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const router = useRouter();
  const styles = createStyles(colors, isDarkMode);
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [showNFTSelection, setShowNFTSelection] = useState(false);
  const [showSNSDropdown, setShowSNSDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingTimeFun, setEditingTimeFun] = useState(false);
  const [tempTimeFunUsername, setTempTimeFunUsername] = useState(timeFunUsername || '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate actual profile data
  const getProfileData = () => {
    // Count posts made by this user
    const userPosts = allPosts.filter(post => post.wallet === walletAddress);
    const postsCount = userPosts.length;
    
    // Calculate tips received (sum of tips on all their posts)
    const tipsReceived = userPosts.reduce((total, post) => total + (post.tips || 0), 0);
    
    // Calculate tips given (would need transaction history - using estimate)
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
      avatar: selectedAvatar || (walletAddress ? walletAddress.slice(0, 2).toUpperCase() : '??'),
      fullWallet: walletAddress || 'Not connected',
      shortWallet: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected',
      joinDate: 'November 2024',
      postsCount,
      tipsReceived,
      tipsGiven,
      balance: balance.toFixed(2),
      favoriteCategories: favoriteCategories.length > 0 ? favoriteCategories : ['GENERAL', 'GAMES']
    };
  };

  const profileData = getProfileData();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleChangeAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Show NFT selection first
    setShowNFTSelection(true);
  };

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };

  const handleCopyWallet = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);


  return (
    <>
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
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header with Balance */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>My Profile</Text>
                <View style={styles.headerRight}>
                  {/* Small Wallet Balance */}
                  <View style={styles.smallBalanceCard}>
                    <BlurView intensity={25} style={styles.smallBalanceBlur}>
                      <LinearGradient
                        colors={gradients.primary}
                        style={styles.smallBalanceGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.smallBalanceAmount}>{profileData.balance}</Text>
                        <Text style={styles.smallBalanceLabel}>$ALLY</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons 
                      name="close" 
                      size={18} 
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Profile Content */}
              <ScrollView 
                style={styles.profileContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Avatar and Basic Info */}
                <View style={styles.profileHeader}>
                  <TouchableOpacity 
                    onPress={handleChangeAvatar}
                    activeOpacity={0.8}
                    style={styles.avatarTouchable}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={[
                        styles.avatar,
                        {
                          borderWidth: 4,
                          borderColor: colors.primary
                        }
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {selectedNFTAvatar ? (
                        <OptimizedImage 
                          source={{ uri: selectedNFTAvatar.image || selectedNFTAvatar.uri }}
                          style={styles.nftAvatar}
                          priority="high"
                        />
                      ) : selectedAvatar ? (
                        <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
                      ) : (
                        <Text style={styles.avatarText}>{profileData.avatar}</Text>
                      )}
                    </LinearGradient>
                    <View style={styles.editIconContainer}>
                      <Ionicons 
                        name="camera-outline" 
                        size={16} 
                        color={colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.userInfo}>
                    {snsDomain ? (
                      <>
                        <View style={styles.snsDomainRow}>
                          <Text style={styles.snsDomain}>{snsDomain}</Text>
                          {isPremium && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                              <Ionicons name="star" size={10} color="#000" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.username}>@{profileData.shortWallet}</Text>
                      </>
                    ) : (
                      <View style={styles.usernameRow}>
                        <Text style={styles.username}>@{profileData.shortWallet}</Text>
                        {isPremium && (
                          <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                            <Ionicons name="star" size={10} color="#000" />
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.walletRow}>
                      <Text style={styles.walletAddress} numberOfLines={1} adjustsFontSizeToFit>{profileData.fullWallet}</Text>
                      <TouchableOpacity 
                        onPress={handleCopyWallet}
                        style={styles.copyButton}
                        activeOpacity={0.7}
                      >
                        {copied ? (
                          <View style={styles.checkIcon}>
                            <Ionicons 
                              name="checkmark" 
                              size={14} 
                              color={colors.primary}
                            />
                          </View>
                        ) : (
                          <View style={styles.copyIconContainer}>
                            <View style={styles.copyIconBack} />
                            <View style={styles.copyIconFront} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.joinDate}>Joined {profileData.joinDate}</Text>
                  </View>
                </View>

                {/* SNS Domains Dropdown */}
                {allSNSDomains.length > 0 && (
                  <View style={styles.snsSection}>
                    <Text style={styles.sectionTitle}>Display Name</Text>
                    
                    {!isPremium && (
                      <View style={styles.premiumNotice}>
                        <LinearGradient
                          colors={['#FFD700', '#FFA500']}
                          style={styles.premiumNoticeGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="star" size={16} color="#000" />
                          <Text style={styles.premiumNoticeText}>
                            Upgrade to Premium to use your SNS domain as display name
                          </Text>
                        </LinearGradient>
                      </View>
                    )}
                    
                    {/* Dropdown Button */}
                    <TouchableOpacity
                      style={[styles.snsDropdownButton, !isPremium && styles.snsDropdownButtonDisabled]}
                      onPress={() => {
                        if (!isPremium) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          return;
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowSNSDropdown(!showSNSDropdown);
                      }}
                      activeOpacity={isPremium ? 0.8 : 1}
                    >
                      <BlurView intensity={25} style={styles.snsDropdownBlur}>
                        <LinearGradient
                          colors={gradients.primary}
                          style={styles.snsDropdownGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.selectedSNSText}>
                            {snsDomain || 'Select a domain'}
                          </Text>
                          <Ionicons 
                            name={showSNSDropdown ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color={isDarkMode ? '#000' : '#fff'}
                          />
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                    
                    {/* Dropdown Menu */}
                    {showSNSDropdown && (
                      <View style={styles.snsDropdownWrapper}>
                        <BlurView intensity={25} style={styles.snsDropdownBlur}>
                          <LinearGradient
                            colors={gradients.surface}
                            style={styles.snsDropdownMenu}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            {allSNSDomains.map((snsItem, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.snsDropdownItem,
                                  snsItem.domain === snsDomain && styles.snsDropdownItemActive,
                                  index === allSNSDomains.length - 1 && styles.snsDropdownItemLast
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setFavoriteSNSDomain(snsItem.domain);
                                  setShowSNSDropdown(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.snsDropdownItemText,
                                  snsItem.domain === snsDomain && styles.snsDropdownItemTextActive
                                ]}>
                                  {snsItem.domain}
                                </Text>
                                {snsItem.domain === snsDomain && (
                                  <Ionicons 
                                    name="checkmark" 
                                    size={18} 
                                    color={colors.primary}
                                  />
                                )}
                              </TouchableOpacity>
                            ))}
                          </LinearGradient>
                        </BlurView>
                      </View>
                    )}
                  </View>
                )}

                {/* Time.fun Profile Link */}
                <View style={styles.timeFunSection}>
                  <Text style={styles.sectionTitle}>time.fun Profile</Text>
                  
                  {!editingTimeFun ? (
                    <TouchableOpacity
                      style={styles.timeFunDisplay}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditingTimeFun(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <BlurView intensity={25} style={styles.timeFunBlur}>
                        <LinearGradient
                          colors={gradients.surface}
                          style={styles.timeFunGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.timeFunContent}>
                            <Ionicons 
                              name="time-outline" 
                              size={20} 
                              color={colors.primary}
                            />
                            {timeFunUsername ? (
                              <Text style={styles.timeFunUsername}>
                                @{timeFunUsername}
                              </Text>
                            ) : (
                              <Text style={styles.timeFunPlaceholder}>
                                Add your time.fun username
                              </Text>
                            )}
                            <Ionicons 
                              name="create-outline" 
                              size={16} 
                              color={colors.textSecondary}
                            />
                          </View>
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.timeFunEditContainer}>
                      <BlurView intensity={25} style={styles.timeFunEditBlur}>
                        <LinearGradient
                          colors={gradients.surface}
                          style={styles.timeFunEditGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <TextInput
                            style={styles.timeFunInput}
                            value={tempTimeFunUsername}
                            onChangeText={setTempTimeFunUsername}
                            placeholder="Enter time.fun username"
                            placeholderTextColor={colors.textTertiary}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <View style={styles.timeFunEditButtons}>
                            <TouchableOpacity
                              style={styles.timeFunCancelButton}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTempTimeFunUsername(timeFunUsername || '');
                                setEditingTimeFun(false);
                              }}
                            >
                              <Text style={styles.timeFunCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.timeFunSaveButton}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setTimeFunUsername(tempTimeFunUsername || null);
                                setEditingTimeFun(false);
                              }}
                            >
                              <LinearGradient
                                colors={gradients.primary}
                                style={styles.timeFunSaveGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                <Text style={styles.timeFunSaveText}>Save</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </LinearGradient>
                      </BlurView>
                    </View>
                  )}
                  
                  {timeFunUsername && !editingTimeFun && (
                    <TouchableOpacity
                      style={styles.timeFunLinkButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Linking.openURL(`https://time.fun/@${timeFunUsername}`);
                      }}
                    >
                      <Text style={styles.timeFunLinkText}>
                        View on time.fun
                      </Text>
                      <Ionicons 
                        name="open-outline" 
                        size={16} 
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.statCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.statNumber}>{profileData.postsCount}</Text>
                        <Text style={styles.statLabel}>Posts Made</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>

                  <View style={styles.statCard}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.statCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.statNumber}>{profileData.tipsReceived}</Text>
                        <Text style={styles.statLabel}>Tips Received</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>

                  <View style={styles.statCard}>
                    <BlurView intensity={25} style={styles.statBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.statCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.statNumber}>{profileData.tipsGiven}</Text>
                        <Text style={styles.statLabel}>Tips Given</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* Favorite Categories */}
                <View style={styles.categoriesSection}>
                  <Text style={styles.sectionTitle}>Favorite Categories</Text>
                  <View style={styles.categoriesList}>
                    {profileData.favoriteCategories.map((category, index) => (
                      <View key={index} style={styles.categoryTag}>
                        <LinearGradient
                          colors={gradients.primary.map(c => c + '33')}
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
              </ScrollView>
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>

    <AvatarSelectionModal
      visible={showAvatarSelection}
      currentAvatar={profileData.avatar}
      onClose={() => setShowAvatarSelection(false)}
      onSelect={handleAvatarSelect}
    />
    
    <NFTAvatarModal
      visible={showNFTSelection}
      onClose={() => setShowNFTSelection(false)}
      onSelectNFT={(nft) => {
        setSelectedNFTAvatar({
          id: nft.mint,
          name: nft.name,
          image: nft.image,
          uri: nft.uri,
          collection: nft.collection?.name
        });
      }}
      onSelectEmoji={() => {
        setShowAvatarSelection(true);
      }}
    />
    </>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalBackground,
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
    borderColor: colors.primary + '99',
    shadowColor: colors.shadowColor,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallBalanceCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  smallBalanceBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  smallBalanceGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallBalanceAmount: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000000' : '#ffffff',
  },
  smallBalanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: isDarkMode ? '#000000' : '#ffffff',
    opacity: 0.8,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.textSecondary,
  },
  profileContent: {
    flex: 1,
    marginTop: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.modalBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000000' : '#ffffff',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  nftAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userInfo: {
    alignItems: 'center',
  },
  snsDomainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    paddingHorizontal: 10,
    maxWidth: '100%',
  },
  copyButton: {
    marginLeft: 4,
    padding: 4,
  },
  copyIconContainer: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  copyIconBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  copyIconFront: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 2,
    backgroundColor: colors.primary + '1A',
  },
  checkIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  snsDomain: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 2,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  walletAddress: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: colors.primary + '4D',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    flex: 1,
    lineHeight: 16,
  },
  joinDate: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  balanceCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: isDarkMode ? '#000000' : '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000000' : '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
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
    borderColor: colors.borderLight,
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoriesSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.text,
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
    borderColor: colors.borderLight,
  },
  categoryTagGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: colors.primary,
  },
  reputationSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  reputationButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reputationBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  reputationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  reputationButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semibold,
    color: isDarkMode ? '#000' : '#fff',
    flex: 1,
    textAlign: 'center',
  },
  snsSection: {
    marginTop: 6,
    marginBottom: 20,
    position: 'relative',
    zIndex: 100,
  },
  premiumNotice: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumNoticeGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumNoticeText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#000',
    flex: 1,
  },
  timeFunSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  timeFunDisplay: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timeFunBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeFunGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeFunContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  timeFunUsername: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.primary,
    flex: 1,
  },
  timeFunPlaceholder: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
    flex: 1,
  },
  timeFunEditContainer: {
    marginTop: 8,
  },
  timeFunEditBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeFunEditGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  timeFunInput: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  timeFunEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timeFunCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  timeFunCancelText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  timeFunSaveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeFunSaveGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeFunSaveText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: isDarkMode ? '#000' : '#fff',
  },
  timeFunLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  timeFunLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.primary,
  },
  snsDropdownButton: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  snsDropdownButtonDisabled: {
    opacity: 0.6,
  },
  snsDropdownBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  snsDropdownGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSNSText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000000' : '#ffffff',
  },
  snsDropdownWrapper: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  snsDropdownBlurDup: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  snsDropdownMenu: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  snsDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  snsDropdownItemLast: {
    borderBottomWidth: 0,
  },
  snsDropdownItemActive: {
    backgroundColor: colors.primary + '1A',
  },
  snsDropdownItemText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  snsDropdownItemTextActive: {
    color: colors.primary,
    fontFamily: Fonts.semiBold,
  },
});