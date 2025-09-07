import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState, useRef } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, TextInput, Linking, Clipboard, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Post as PostType } from '../types';
import Post from '../components/Post';
import { Fonts, FontSizes } from '../constants/Fonts';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import NFTAvatarModal from '../components/NFTAvatarModal';
import TipModal from '../components/TipModal';
import TipSuccessModal from '../components/TipSuccessModal';
import { useKorusAlert } from '../components/KorusAlertProvider';
import { AuthService } from '../services/auth';
import { logger } from '../utils/logger';
import { userAPI } from '../utils/api';

export default function ProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const debounceTimer = useRef<NodeJS.Timeout>();
  const { 
    walletAddress: currentUserWallet, 
    balance,
    selectedAvatar, 
    setSelectedAvatar, 
    selectedNFTAvatar, 
    setSelectedNFTAvatar,
    snsDomain,
    allSNSDomains,
    setFavoriteSNSDomain,
    isPremium,
    timeFunUsername,
    setTimeFunUsername,
    deductBalance
  } = useWallet();
  const { showAlert } = useKorusAlert();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  
  const profileWallet = params.wallet as string;
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  
  // Additional state for own profile features
  const isOwnProfile = profileWallet === currentUserWallet;
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [showNFTSelection, setShowNFTSelection] = useState(false);
  const [showSNSDropdown, setShowSNSDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [tempUsername, setTempUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showRepDetails, setShowRepDetails] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showTipSuccessModal, setShowTipSuccessModal] = useState(false);
  const [tipSuccessData, setTipSuccessData] = useState<{ amount: number; username: string } | null>(null);
  
  // Extract user info from current user if viewing own profile
  const userInfo = React.useMemo(() => {
    if (profileWallet === currentUserWallet) {
      return {
        wallet: profileWallet,
        username: snsDomain || currentUsername || timeFunUsername,
        avatar: selectedAvatar,
        nftAvatar: selectedNFTAvatar,
        isPremium: isPremium,
        userTheme: colors.primary
      };
    }
    
    return {
      wallet: profileWallet,
      username: undefined,
      avatar: undefined,
      nftAvatar: undefined,
      isPremium: false,
      userTheme: colors.primary
    };
  }, [profileWallet, currentUserWallet, snsDomain, currentUsername, timeFunUsername, selectedAvatar, selectedNFTAvatar, isPremium, colors.primary]);
  
  useEffect(() => {
    // TODO: Fetch user posts from API
    setUserPosts([]);
    
    // Load username if viewing own profile
    if (isOwnProfile) {
      loadUserProfile();
    }
  }, [profileWallet, isOwnProfile]);

  const loadUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response?.user?.username) {
        setCurrentUsername(response.user.username);
      }
    } catch (error) {
      logger.log('Failed to load user profile:', error);
    }
  };

  const validateUsername = (username: string) => {
    // Alphanumeric only, 3-20 chars
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    
    if (!username) {
      return 'Username is required';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username cannot exceed 20 characters';
    }
    if (!regex.test(username)) {
      return 'Username can only contain letters and numbers';
    }
    if (username.toLowerCase().endsWith('sol')) {
      return 'Usernames ending with "sol" are reserved';
    }
    return '';
  };

  const handleUsernameChange = (text: string) => {
    setTempUsername(text);
    
    // Clear any existing checking state when user types
    setCheckingUsername(false);
    
    // Basic validation (don't call setState for error on every keystroke)
    if (text && !validateUsername(text)) {
      // Only set error if there's an actual validation error
      const error = validateUsername(text);
      if (error) {
        setUsernameError(error);
      }
    } else {
      setUsernameError('');
    }
    
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Only check availability for valid usernames
    if (text.length >= 3 && !validateUsername(text)) {
      // Debounce the availability check - wait 1000ms after user stops typing
      debounceTimer.current = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await userAPI.checkUsername(text);
          if (!response.available && text.toLowerCase() !== currentUsername?.toLowerCase()) {
            setUsernameError('Username is already taken');
          }
        } catch (error) {
          logger.log('Failed to check username:', error);
        } finally {
          setCheckingUsername(false);
        }
      }, 1000);
    }
  };

  const handleSaveUsername = async () => {
    const error = validateUsername(tempUsername);
    if (error) {
      setUsernameError(error);
      return;
    }

    setSavingUsername(true);
    try {
      const response = await userAPI.setUsername(tempUsername);
      if (response.success) {
        setCurrentUsername(response.username);
        setEditingUsername(false);
        setTempUsername('');
        Alert.alert('Success', 'Username updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };
  
  
  const stats = React.useMemo(() => {
    const posts = userPosts;
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalTips = posts.reduce((sum, post) => sum + post.tips, 0);
    
    let replyCount = 0;
    let postsWithImages = 0;
    
    posts.forEach(post => {
      replyCount += post.replies?.length || 0;
      
      // Count posts with images
      if (post.imageUrl || post.videoUrl) {
        postsWithImages++;
      }
    });
    
    // Calculate reputation score
    let repScore = 0;
    repScore += posts.length * 10;           // 10 points per post
    repScore += replyCount * 5;              // 5 points per reply
    repScore += postsWithImages * 15;        // 15 extra points for posts with media
    repScore += totalLikes * 2;              // 2 points per like received
    repScore += totalTips * 20;              // 20 points per tip received
    
    // Premium bonus
    if (isOwnProfile ? isPremium : userInfo.isPremium) {
      repScore = Math.floor(repScore * 1.2);  // 20% bonus for premium users
    }
    
    return {
      posts: posts.length,
      replies: replyCount,
      likes: totalLikes,
      tips: totalTips,
      repScore
    };
  }, [profileWallet, isPremium, userInfo.isPremium, isOwnProfile]);
  
  const displayName = userInfo.username || `${profileWallet.slice(0, 4)}...${profileWallet.slice(-4)}`;
  
  const handleCopyWallet = () => {
    if (profileWallet) {
      Clipboard.setString(profileWallet);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNFTSelection(true);
  };

  const renderOwnProfileHeader = () => (
    <ScrollView style={styles.profileScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.ownProfileHeader}>
        {/* Balance Card at top right */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={gradients?.primary || ['#43e97b', '#38f9d7']}
            style={styles.balanceGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.balanceAmount}>{balance.toFixed(2)} $ALLY</Text>
          </LinearGradient>
        </View>
        
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer}>
            <LinearGradient
              colors={gradients?.primary || ['#43e97b', '#38f9d7']}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {selectedNFTAvatar ? (
                <Image 
                  source={{ uri: selectedNFTAvatar.image || selectedNFTAvatar.uri }}
                  style={styles.avatarImage}
                />
              ) : selectedAvatar ? (
                <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
              ) : (
                <Text style={styles.avatarText}>
                  {profileWallet.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={16} color={isDarkMode ? '#000' : '#fff'} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* User Info */}
        <View style={styles.displayNameRow}>
          <Text style={[styles.displayName, snsDomain ? { color: colors.primary } : {}]}>
            {snsDomain || displayName}
          </Text>
          {isPremium && (
            <View style={[styles.premiumBadgeInline, { backgroundColor: '#FFD700' }]}>
              <Ionicons name="star" size={10} color="#000" />
            </View>
          )}
        </View>
        
        {/* Wallet with copy */}
        <View style={styles.walletRow}>
          <Text style={styles.walletAddress} numberOfLines={1}>{profileWallet}</Text>
          <TouchableOpacity onPress={handleCopyWallet} style={styles.copyButton}>
            {copied ? (
              <Ionicons name="checkmark" size={14} color={colors.primary} />
            ) : (
              <Ionicons name="copy-outline" size={14} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* SNS Domains Dropdown */}
        {isOwnProfile && allSNSDomains.length > 0 && (
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
                    Upgrade to Premium to use your SNS domain
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.snsDropdownButton, !isPremium && styles.snsDropdownButtonDisabled]}
              onPress={() => {
                if (!isPremium) return;
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
            
            {showSNSDropdown && (
              <View style={styles.snsDropdownWrapper}>
                <BlurView intensity={25} style={styles.snsDropdownMenuBlur}>
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
                          setFavoriteSNSDomain(snsItem.domain);
                          setShowSNSDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.snsDropdownItemText,
                          snsItem.domain === snsDomain && styles.snsDropdownItemTextActive
                        ]}>
                          {snsItem.domain}
                        </Text>
                        {snsItem.domain === snsDomain && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </LinearGradient>
                </BlurView>
              </View>
            )}
          </View>
        )}
        
        {/* Username */}
        {isOwnProfile && !snsDomain && (
          <View style={styles.usernameSection}>
            <Text style={styles.sectionTitle}>Username</Text>
            
            {!editingUsername ? (
              <TouchableOpacity
                onPress={() => {
                  setEditingUsername(true);
                  setTempUsername(currentUsername || '');
                  setUsernameError('');
                }}
                activeOpacity={0.8}
                style={styles.usernameWrapper}
              >
                <LinearGradient
                  colors={gradients.surface}
                  style={styles.usernameGradientSecondary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.usernameContent}>
                    <Ionicons name="at" size={20} color={colors.primary} />
                    {currentUsername ? (
                      <Text style={styles.usernameText}>@{currentUsername}</Text>
                    ) : (
                      <Text style={styles.usernamePlaceholder}>Set your username</Text>
                    )}
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.usernameEditContainer}>
                <TextInput
                  style={styles.usernameInput}
                  value={tempUsername}
                  onChangeText={handleUsernameChange}
                  placeholder="Enter username (letters and numbers only)"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  maxLength={20}
                  autoCorrect={false}
                  blurOnSubmit={false}
                  keyboardType="default"
                  returnKeyType="done"
                />
                {usernameError ? (
                  <Text style={[styles.usernameError, { color: colors.error || '#ff4444' }]}>{usernameError}</Text>
                ) : checkingUsername ? (
                  <View style={styles.usernameChecking}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.usernameCheckingText, { color: colors.textSecondary }]}>Checking availability...</Text>
                  </View>
                ) : null}
                <View style={styles.usernameEditButtons}>
                  <TouchableOpacity
                    style={styles.usernameCancelButton}
                    onPress={() => {
                      setTempUsername(currentUsername || '');
                      setEditingUsername(false);
                      setUsernameError('');
                    }}
                  >
                    <Text style={styles.usernameCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.usernameSaveButton, (savingUsername || !!usernameError) && styles.saveButtonDisabled]}
                    onPress={handleSaveUsername}
                    disabled={savingUsername || !!usernameError}
                  >
                    <LinearGradient
                      colors={savingUsername || !!usernameError ? [colors.borderLight, colors.borderLight] : gradients.primary}
                      style={styles.usernameSaveGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {savingUsername ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <Text style={styles.usernameSaveText}>Save</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts ({stats.posts})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'replies' && styles.activeTab]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.tabText, activeTab === 'replies' && styles.activeTabText]}>
              Replies ({stats.replies})
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Reputation Score Card */}
        <View style={styles.repScoreCard}>
          <LinearGradient
            colors={gradients?.surface || ['rgba(30, 30, 30, 0.95)', 'rgba(40, 40, 40, 0.85)']}
            style={styles.repScoreCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.repScoreHeader}>
              <View style={styles.repScoreTitleRow}>
                <LinearGradient
                  colors={gradients?.primary || ['#43e97b', '#38f9d7']}
                  style={styles.repScoreBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="diamond" size={20} color={isDarkMode ? '#000' : '#fff'} />
                </LinearGradient>
                <Text style={styles.repScoreTitle}>Reputation Score</Text>
              </View>
              <Text style={styles.repScoreValue}>{stats.repScore}</Text>
            </View>
            
            <View style={styles.repScoreBreakdown}>
              <View style={styles.repScoreItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.repScoreItemLabel}>Posts created</Text>
                </View>
                <Text style={styles.repScoreItemValue}>+{stats.posts * 10}</Text>
              </View>
              <View style={styles.repScoreItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  <Text style={styles.repScoreItemLabel}>Replies made</Text>
                </View>
                <Text style={styles.repScoreItemValue}>+{stats.replies * 5}</Text>
              </View>
              <View style={styles.repScoreItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="heart-outline" size={18} color={colors.primary} />
                  <Text style={styles.repScoreItemLabel}>Likes received</Text>
                </View>
                <Text style={styles.repScoreItemValue}>+{stats.likes * 2}</Text>
              </View>
              <View style={[styles.repScoreItem, { borderBottomWidth: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                  <Text style={styles.repScoreItemLabel}>Tips received</Text>
                </View>
                <Text style={styles.repScoreItemValue}>+{stats.tips * 20}</Text>
              </View>
            </View>
            
            {isPremium && (
              <View style={styles.repScorePremiumBonus}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.repScorePremiumText}>+20% Premium Bonus</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </ScrollView>
  );

  const renderOtherProfileHeader = () => (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={userInfo.userTheme ? [userInfo.userTheme, userInfo.userTheme + 'CC'] : gradients.primary}
          style={styles.avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {userInfo.nftAvatar ? (
            <Image 
              source={{ uri: userInfo.nftAvatar.image || userInfo.nftAvatar.uri }}
              style={styles.avatarImage}
            />
          ) : userInfo.avatar ? (
            <Text style={styles.avatarEmoji}>{userInfo.avatar}</Text>
          ) : (
            <Text style={styles.avatarText}>
              {profileWallet.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </LinearGradient>
      </View>
      
      {/* User Info */}
      <View style={styles.displayNameRow}>
        <Text style={styles.displayName}>{displayName}</Text>
        {userInfo.isPremium && (
          <View style={[styles.premiumBadgeInline, { backgroundColor: '#FFD700' }]}>
            <Ionicons name="star" size={10} color="#000" />
          </View>
        )}
      </View>
      
      <Text style={styles.walletAddress} numberOfLines={1}>{profileWallet}</Text>
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.replies}</Text>
          <Text style={styles.statLabel}>Replies</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.likes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.tips}</Text>
          <Text style={styles.statLabel}>Tips</Text>
        </View>
      </View>
      
      {/* Tip Button */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.tipButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowTipModal(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.tipButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="cash-outline" size={16} color={isDarkMode ? '#000' : '#fff'} />
            <Text style={styles.tipButtonText}>Tip User</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Base dark gradient layer (matches app background) */}
      <LinearGradient
        colors={gradients?.surface || ['rgba(30, 30, 30, 0.95)', 'rgba(40, 40, 40, 0.85)']}
        style={styles.baseBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Green overlay gradient (matches app style) */}
      <LinearGradient
        colors={[
          colors.primary + '14',
          colors.secondary + '0C',
          'transparent',
          colors.primary + '0F',
          colors.secondary + '1A',
        ]}
        style={styles.greenOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Minimal Header - Just back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }} 
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <BlurView intensity={25} style={styles.backButtonBlur}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name="arrow-back" 
                size={20} 
                color={colors.text} 
              />
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <FlatList
        data={isOwnProfile && activeTab === 'posts' ? userPosts : []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Post
            post={item}
            expandedPosts={expandedPosts}
            currentUserWallet={currentUserWallet || ''}
            replySortType="best"
            onLike={() => {}}
            onReply={() => {}}
            onTip={() => {}}
            onShowTipModal={() => {}}
            onLikeReply={() => {}}
            onTipReply={() => {}}
            onToggleReplies={(postId) => {
              setExpandedPosts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(postId)) {
                  newSet.delete(postId);
                } else {
                  newSet.add(postId);
                }
                return newSet;
              });
            }}
            onToggleReplySorting={() => {}}
            onReport={() => {}}
            onShowProfile={() => {}}
            onShowReportModal={() => {}}
          />
        )}
        ListHeaderComponent={isOwnProfile ? renderOwnProfileHeader : () => (
          <>
            {renderOtherProfileHeader()}
            {/* Reputation Score Card - Simplified for others */}
            <View style={styles.repScoreCardSimple}>
              <LinearGradient
                colors={gradients?.surface || ['rgba(30, 30, 30, 0.95)', 'rgba(40, 40, 40, 0.85)']}
                style={styles.repScoreCardSimpleGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.repScoreSimpleContent}>
                  <View style={styles.repScoreSimpleLeft}>
                    <LinearGradient
                      colors={gradients?.primary || ['#43e97b', '#38f9d7']}
                      style={styles.repScoreBadgeSmall}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="diamond" size={20} color={isDarkMode ? '#000' : '#fff'} />
                    </LinearGradient>
                    <Text style={styles.repScoreTitleSmall}>Reputation Score</Text>
                  </View>
                  <Text style={styles.repScoreValueSmall}>{stats.repScore}</Text>
                </View>
                
                <View style={styles.repScoreQuickStats}>
                  <View style={styles.repScoreQuickStat}>
                    <View style={styles.repScoreQuickStatIcon}>
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.repScoreQuickStatValue}>{stats.posts}</Text>
                    <Text style={styles.repScoreQuickStatLabel}>Posts</Text>
                  </View>
                  <View style={styles.repScoreStatDivider} />
                  <View style={styles.repScoreQuickStat}>
                    <View style={styles.repScoreQuickStatIcon}>
                      <Ionicons name="heart-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.repScoreQuickStatValue}>{stats.likes}</Text>
                    <Text style={styles.repScoreQuickStatLabel}>Likes</Text>
                  </View>
                  <View style={styles.repScoreStatDivider} />
                  <View style={styles.repScoreQuickStat}>
                    <View style={styles.repScoreQuickStatIcon}>
                      <Ionicons name="cash-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.repScoreQuickStatValue}>{stats.tips}</Text>
                    <Text style={styles.repScoreQuickStatLabel}>Tips</Text>
                  </View>
                </View>
                
                {userInfo.isPremium && (
                  <View style={styles.repScorePremiumBonusSimple}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.repScorePremiumTextSimple}>Premium member</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>User activity is private</Text>
            </View>
          </>
        )}
        ListEmptyComponent={isOwnProfile ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {activeTab === 'posts' ? 'No posts yet' : 'No replies yet'}
            </Text>
          </View>
        ) : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Avatar Selection Modals - Only for own profile */}
      {isOwnProfile && (
        <>
          <NFTAvatarModal
            visible={showNFTSelection}
            onClose={() => {
              setShowNFTSelection(false);
              // Don't automatically open emoji picker
            }}
            onSelectNFT={async (nft) => {
              const nftAvatarData = {
                id: nft.mint,
                name: nft.name,
                image: nft.image,
                uri: nft.uri,
                collection: nft.collection?.name
              };
              
              // Update local state immediately for responsiveness
              setSelectedNFTAvatar(nftAvatarData);
              setSelectedAvatar(null);
              setShowNFTSelection(false);
              
              // Save to backend (currently not implemented, so just log)
              try {
                // TODO: Implement backend endpoint for profile updates
                // await AuthService.updateProfile({
                //   nftAvatar: nftAvatarData,
                //   avatar: null
                // });
                logger.log('NFT avatar selected (backend save not implemented)');
              } catch (error) {
                logger.error('Failed to save NFT avatar:', error);
                // Don't show error since backend doesn't support this yet
              }
            }}
            onSelectEmoji={() => {
              setShowNFTSelection(false);
              setShowAvatarSelection(true);
            }}
          />
          
          <AvatarSelectionModal
            visible={showAvatarSelection}
            onClose={() => setShowAvatarSelection(false)}
            onSelect={async (avatar) => {
              // Update local state immediately
              setSelectedAvatar(avatar);
              setSelectedNFTAvatar(null);
              setShowAvatarSelection(false);
              
              // Save to backend (currently not implemented, so just log)
              try {
                // TODO: Implement backend endpoint for profile updates
                // await AuthService.updateProfile({
                //   avatar: avatar,
                //   nftAvatar: null
                // });
                logger.log('Avatar selected (backend save not implemented)');
              } catch (error) {
                logger.error('Failed to save avatar:', error);
                // Don't show error since backend doesn't support this yet
              }
            }}
            currentAvatar={selectedAvatar}
          />
        </>
      )}
      
      {/* Tip Modal */}
      <TipModal
        visible={showTipModal}
        onClose={() => setShowTipModal(false)}
        recipientWallet={profileWallet}
        recipientName={userInfo.username || displayName}
        onTipSuccess={(amount) => {
          deductBalance(amount);
          setTipSuccessData({ amount, username: userInfo.username || displayName });
          setShowTipModal(false);
          setShowTipSuccessModal(true);
          
          // Update user stats
          setUserPosts(prevPosts => 
            prevPosts.map(p => ({
              ...p,
              tips: p.tips + amount
            }))
          );
          
          showAlert('success', `Successfully tipped ${amount} $ALLY!`);
        }}
      />
      
      {/* Tip Success Modal */}
      <TipSuccessModal
        visible={showTipSuccessModal}
        onClose={() => {
          setShowTipSuccessModal(false);
          setTipSuccessData(null);
        }}
        amount={tipSuccessData?.amount || 0}
        username={tipSuccessData?.username || ''}
      />
    </View>
  );
}

const createStyles = (colors: any, isDarkMode: boolean, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  header: {
    position: 'absolute',
    top: insets.top + 10,
    left: 20,
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight + '40',
  },
  listContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Add space for the floating back button
    paddingBottom: 24,
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  avatarText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumBadgeInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  displayName: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  walletAddress: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight + '30',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderLight,
  },
  actionButtons: {
    marginBottom: 24,
    width: '100%',
  },
  tipButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tipButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tipButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: isDarkMode ? '#000' : '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface + '40',
    borderRadius: 16,
    padding: 4,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: Fonts.semiBold,
  },
  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
  },
  // Own profile specific styles
  profileScrollView: {
    flex: 1,
  },
  ownProfileHeader: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
  },
  balanceCard: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  balanceGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: isDarkMode ? '#000' : '#fff',
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  username: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.text,
    marginBottom: 12,
  },
  snsSection: {
    marginBottom: 20,
  },
  premiumNotice: {
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
    color: isDarkMode ? '#000' : '#fff',
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
  snsDropdownMenuBlur: {
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
    borderBottomColor: colors.borderLight + '20',
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
  usernameSection: {
    marginBottom: 20,
  },
  usernameBlur: {
    flex: 1,
  },
  usernameDisplay: {
    // No styling needed - BlurView and LinearGradient handle borders
  },
  usernameWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  usernameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  usernameText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    flex: 1,
  },
  usernamePlaceholder: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
    flex: 1,
  },
  usernameEditContainer: {
    marginTop: 8,
  },
  usernameInput: {
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
  usernameEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  usernameCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  usernameCancelText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  usernameSaveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  usernameSaveGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  usernameSaveText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: isDarkMode ? '#000' : '#fff',
  },
  usernameLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  usernameLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.primary,
  },
  usernameError: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  usernameChecking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  usernameCheckingText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  saveButtonDisabled: {
    opacity: 0.5,
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
  },
  statNumberDup: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabelDup: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  repScoreCard: {
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 4,
  },
  repScoreCardGradient: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface + '40',
  },
  repScoreHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  repScoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  repScoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  repScoreTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.text,
  },
  repScoreValue: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.bold,
    color: colors.primary,
    textShadowColor: colors.primary + '30',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  repScoreBreakdown: {
    gap: 12,
  },
  repScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight + '20',
  },
  repScoreItemValue: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: colors.primary,
  },
  repScoreItemLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 8,
  },
  repScorePremiumBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight + '30',
  },
  repScorePremiumText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#FFD700',
    textShadowColor: '#FFD700' + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  repScoreContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  repScoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  repScoreText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  repScoreLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    marginTop: 4,
  },
  repScoreCardSimple: {
    marginTop: 0,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  repScoreCardSimpleGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repScoreSimpleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  repScoreSimpleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repScoreBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  repScoreTitleSmall: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
  },
  repScoreValueSmall: {
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.bold,
    color: colors.primary,
    textShadowColor: colors.primary + '20',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  repScoreQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  repScoreQuickStat: {
    alignItems: 'center',
  },
  repScoreQuickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  repScoreQuickStatValue: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  repScoreQuickStatLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repScoreStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  repScorePremiumBonusSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight + '20',
  },
  repScorePremiumTextSimple: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#FFD700',
  },
  premiumBadge: {
    position: 'absolute',
    top: 0,
    right: -5,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  snsDropdownItemLast: {
    borderBottomWidth: 0,
  },
  usernameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  usernameLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  statCardBlur: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardSecondary: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight + '40',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  snsSelectorWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  snsSelectorGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight + '40',
  },
  snsSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snsSelectorButtonDisabled: {
    opacity: 0.6,
  },
  snsSelectorText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  snsDropdown: {
    marginTop: 8,
    backgroundColor: colors.surface + '60',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  usernameCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  usernameGradientSecondary: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight + '40',
  },
  usernameDisplaySecondary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});