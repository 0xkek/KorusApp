import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Post as PostType } from '../types';
// import { sendLocalNotification } from '../utils/notifications';
import Reply from './Reply';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useDisplayName } from '../hooks/useSNSDomain';
import { Ionicons } from '@expo/vector-icons';

interface PostProps {
  post: PostType;
  expandedPosts: Set<number>;
  currentUserWallet: string;
  currentUserAvatar?: string | null;
  currentUserNFTAvatar?: any | null;
  replySortType: 'best' | 'recent';
  onLike: (postId: number) => void;
  onReply: (postId: number, quotedText?: string, quotedUsername?: string) => void;
  onBump: (postId: number) => void;
  onTip: (postId: number, amount: number) => void;
  onShowTipModal: (postId: number) => void;
  onLikeReply: (postId: number, replyId: number) => void;
  onTipReply: (postId: number, replyId: number) => void;
  onBumpReply: (replyId: number) => void;
  onToggleReplies: (postId: number) => void;
  onToggleReplySorting: (postId: number) => void;
  onReport?: (postId: number) => void;
  onShowProfile?: (wallet: string) => void;
  onShowReportModal?: (postId: number) => void;
}

export default function Post({
  post,
  expandedPosts,
  currentUserWallet,
  currentUserAvatar,
  currentUserNFTAvatar,
  replySortType,
  onLike,
  onReply,
  onBump,
  onTip,
  onShowTipModal,
  onLikeReply,
  onTipReply,
  onBumpReply,
  onToggleReplies,
  onToggleReplySorting,
  onReport,
  onShowProfile,
  onShowReportModal,
}: PostProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const displayName = useDisplayName(post.wallet);
  
  // Double-tap to like functionality
  const lastTapTime = useRef(0);
  const DOUBLE_TAP_DELAY = 300;

  const handleDoubleTap = (event?: any) => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - trigger like only if not already liked
      if (!post.liked) {
        onLike(post.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Trigger particle explosion for double-tap like
        if (event && global.createParticleExplosion) {
          const touch = event.nativeEvent;
          global.createParticleExplosion('like', touch.pageX || 200, touch.pageY || 300);
        }
      }
    }
    lastTapTime.current = now;
  };

  // Flatten all replies (replies are already sorted in HomeScreen)
  const flattenReplies = (replies: any[]): any[] => {
    let flattened: any[] = [];
    const processReply = (reply: any) => {
      flattened.push(reply);
      if (reply.replies && reply.replies.length > 0) {
        reply.replies.forEach(processReply);
      }
    };
    replies.forEach(processReply);
    return flattened;
  };

  const flatReplies = flattenReplies(post.replies);

  // Calculate interaction score for top reply badge
  const calculateInteractionScore = (reply: any) => {
    const timeBonus = reply.time === 'now' ? 10 : 0;
    return (reply.likes * 3) + (reply.tips * 5) + timeBonus;
  };

  // Check if bump is still active (5-minute duration)
  const isBumpActive = (): boolean => {
    if (!post.bumped || !post.bumpedAt || !post.bumpExpiresAt) return false;
    return Date.now() < post.bumpExpiresAt;
  };

  const handleLike = (event?: any) => {
    // Only trigger particle explosion when adding a like, not removing it
    const isAddingLike = !post.liked;
    
    onLike(post.id);
    
    // Trigger particle explosion only when giving a like
    if (isAddingLike && event && global.createParticleExplosion) {
      const touch = event.nativeEvent;
      global.createParticleExplosion('like', touch.pageX || 200, touch.pageY || 300);
    }
    
    // Send notification if not liking own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'like',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
  };

  const handleReply = (postId: number, quotedText?: string, quotedUsername?: string, event?: any) => {
    onReply(postId, quotedText, quotedUsername);
    
    // Trigger particle explosion
    if (event && global.createParticleExplosion) {
      const touch = event.nativeEvent;
      global.createParticleExplosion('reply', touch.pageX || 200, touch.pageY || 300);
    }
    
    // Send notification if not replying to own post
    if (post.wallet !== currentUserWallet && !quotedText) {
      // sendLocalNotification({
      //   type: 'reply',
      //   fromUser: currentUserWallet,
      //   postId: postId,
      // });
    }
  };

  const handleBump = (event?: any) => {
    onBump(post.id);
    
    // Trigger particle explosion
    if (event && global.createParticleExplosion) {
      const touch = event.nativeEvent;
      global.createParticleExplosion('bump', touch.pageX || 200, touch.pageY || 300);
    }
    
    // Send notification if not bumping own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'bump',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
  };

  const handleTip = (amount: number, event?: any) => {
    onTip(post.id, amount);
    
    // Send notification if not tipping own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'tip',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
  };

  const handleShowTipModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowTipModal(post.id);
  };

  const handleReport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShowReportModal?.(post.id);
  };

  const handleShowProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowProfile?.(post.wallet);
  };

  const currentlyBumped = isBumpActive();

  return (
    <View style={styles.postContainer}>
      {/* Main glassmorphism card with subtle glow */}
      <BlurView 
        intensity={40} 
        style={[
          styles.blurContainer,
          { borderColor: colors.border },
          currentlyBumped && [styles.bumpedBlurContainer, { borderColor: colors.border }],
          post.sponsored && [styles.sponsoredBlurContainer, { borderColor: colors.primary + '99', shadowColor: colors.primary }]
        ]}
      >
        <LinearGradient
          colors={gradients.surface}
          style={styles.postGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.post}
            activeOpacity={0.98}
          >

            {/* Top-right badges area */}
            <View style={styles.topRightBadges}>
              {/* Report Button - 3 dots to the left of tip badge */}
              {post.wallet !== currentUserWallet && onShowReportModal && (
                <TouchableOpacity
                  style={[styles.reportBadge, { borderColor: colors.error + '66' }]}
                  onPress={handleReport}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={gradients.button}
                    style={styles.reportBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.reportBadgeText, { color: colors.textTertiary }]}>⋮</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {post.tips > 0 && (
                <LinearGradient
                  colors={gradients.primary}
                  style={[styles.tipBadge, { shadowColor: colors.shadowColor }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.tipText, { color: isDarkMode ? '#000' : '#fff' }]}>+{post.tips} $ALLY</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.postHeader}>
              <TouchableOpacity onPress={handleShowProfile} activeOpacity={0.8}>
                <LinearGradient
                  colors={gradients.primary}
                  style={[styles.avatar, { shadowColor: colors.shadowColor }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {post.wallet === currentUserWallet && currentUserNFTAvatar ? (
                    <Image 
                      source={{ uri: currentUserNFTAvatar.image || currentUserNFTAvatar.uri }}
                      style={styles.nftAvatar}
                    />
                  ) : post.wallet === currentUserWallet && currentUserAvatar ? (
                    <Text style={styles.avatarEmoji}>{currentUserAvatar}</Text>
                  ) : (
                    <Text style={[styles.avatarText, { color: isDarkMode ? '#000' : '#fff' }]}>
                      {post.wallet.slice(0, 2)}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.postMeta}>
                <View style={styles.usernameRow}>
                  <Text style={[styles.username, { color: colors.primary, textShadowColor: colors.primary + '66' }]}>{displayName}</Text>
                  {post.sponsored && (
                    <LinearGradient
                      colors={gradients.primary}
                      style={[styles.sponsoredBadge, { shadowColor: colors.primary }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.sponsoredText, { color: isDarkMode ? '#000' : '#fff' }]}>SPONSORED</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.time, { color: colors.textTertiary }]}>{post.time}</Text>
                  <Text style={[styles.subcategoryDot, { color: colors.textTertiary }]}>•</Text>
                  <Text style={[styles.subcategory, { color: colors.primary + 'CC' }]}>{post.subcategory}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDoubleTap}
              activeOpacity={1}
              style={styles.postContentContainer}
            >
              <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>
            </TouchableOpacity>
            
            {/* Display image if present */}
            {post.imageUrl && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: post.imageUrl }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </View>
            )}


            <View style={[styles.postActions, { borderTopColor: colors.borderLight }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.liked && [styles.likedBtn, { shadowColor: colors.error }],
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => handleLike(e)}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={gradients.button}
                    style={[
                      styles.actionBtnGradient,
                      { borderColor: colors.borderLight },
                      post.liked && [styles.likedBtnGradient, { borderColor: colors.primary }]
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.actionContent}>
                      <Ionicons 
                        name={post.liked ? "heart" : "heart-outline"} 
                        size={16} 
                        color={post.liked ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                        post.liked && [styles.likedText, { color: colors.primary, textShadowColor: colors.primary + '66' }]
                      ]}>
                        {post.likes}
                      </Text>
                    </View>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  flatReplies.length > 0 && [styles.activeBtn, { shadowColor: colors.shadowColor }],
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => flatReplies.length > 0 ? onToggleReplies(post.id) : handleReply(post.id, undefined, undefined, e)}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={gradients.button}
                    style={[
                      styles.actionBtnGradient,
                      { borderColor: colors.borderLight },
                      flatReplies.length > 0 && [styles.activeBtnGradient, { borderColor: colors.primary }]
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.actionContent}>
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={16} 
                        color={flatReplies.length > 0 ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                        flatReplies.length > 0 && [styles.activeText, { color: colors.primary, textShadowColor: colors.primary + '66' }]
                      ]}>
                        {flatReplies.length}
                      </Text>
                    </View>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              <View style={[styles.actionBtn, currentlyBumped && [styles.activeBtn, { shadowColor: colors.shadowColor }]]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtnInner,
                    pressed && styles.pressedBtn
                  ]}
                  onPress={(e) => handleBump(e)}
                  android_disableSound={true}
                >
                  <BlurView intensity={25} style={styles.actionBlur}>
                    <LinearGradient
                      colors={gradients.button}
                      style={[
                        styles.actionBtnGradient,
                        { borderColor: colors.borderLight },
                        currentlyBumped && [styles.activeBtnGradient, { borderColor: colors.primary }]
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                        currentlyBumped && [styles.activeText, { color: colors.primary, textShadowColor: colors.primary + '66' }]
                      ]}>
                        Bump
                      </Text>
                    </LinearGradient>
                  </BlurView>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.tips > 0 && [styles.activeBtn, { shadowColor: colors.shadowColor }],
                  pressed && styles.pressedBtn
                ]}
                onPress={handleShowTipModal}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={gradients.button}
                    style={[
                      styles.actionBtnGradient,
                      { borderColor: colors.borderLight },
                      post.tips > 0 && [styles.activeBtnGradient, { borderColor: colors.primary }]
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.actionContent}>
                      <Ionicons 
                        name="cash-outline" 
                        size={16} 
                        color={post.tips > 0 ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                        post.tips > 0 && [styles.activeText, { color: colors.primary, textShadowColor: colors.primary + '66' }]
                      ]}>
                        Tip
                      </Text>
                    </View>
                  </LinearGradient>
                </BlurView>
              </Pressable>
            </View>

            {/* Replies Section */}
            {flatReplies.length > 0 && !expandedPosts.has(post.id) && (
              <View style={[styles.showRepliesSection, { borderTopColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={styles.showRepliesBtn}
                  onPress={() => onToggleReplies(post.id)}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={25} style={styles.showRepliesBlur}>
                    <LinearGradient
                      colors={gradients.button}
                      style={[styles.showRepliesBtnGradient, { borderColor: colors.borderLight }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.showRepliesContent}>
                        <Ionicons 
                          name="chatbubbles-outline" 
                          size={16} 
                          color={colors.primary} 
                        />
                        <Text style={[styles.showRepliesText, { color: colors.primary }]}>
                          View {flatReplies.length} {flatReplies.length === 1 ? 'reply' : 'replies'}
                        </Text>
                        <Ionicons 
                          name="chevron-down" 
                          size={14} 
                          color={colors.primary} 
                        />
                      </View>
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}

            {expandedPosts.has(post.id) && flatReplies.length > 0 && (
              <View style={styles.repliesContainer}>
                {/* Hide Replies + Sort Controls Row */}
                <View style={styles.repliesControlsRow}>
                  <TouchableOpacity
                    style={styles.hideRepliesBtn}
                    onPress={() => onToggleReplies(post.id)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={20} style={styles.hideRepliesBlur}>
                      <LinearGradient
                        colors={gradients.button}
                        style={[styles.hideRepliesBtnGradient, { borderColor: colors.border }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.hideRepliesContent}>
                          <Ionicons 
                            name="chevron-up" 
                            size={14} 
                            color={colors.textSecondary} 
                          />
                          <Text style={[styles.hideRepliesText, { color: colors.textSecondary }]}>
                            Hide replies
                          </Text>
                        </View>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sortToggle}
                    onPress={() => onToggleReplySorting(post.id)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={20} style={styles.sortBlur}>
                      <LinearGradient
                        colors={gradients.button}
                        style={[styles.sortToggleGradient, { borderColor: colors.border }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.sortToggleContent}>
                          <Ionicons 
                            name={replySortType === 'best' ? "trophy-outline" : "time-outline"} 
                            size={14} 
                            color={colors.textSecondary} 
                          />
                          <Text style={[styles.sortToggleText, { color: colors.textSecondary }]}>
                            Sort: {replySortType === 'best' ? 'Best' : 'Recent'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>

                {flatReplies.map((reply, index) =>
                  <View key={reply.id} style={styles.flatReplyContainer}>
                    {/* Top reply badge - only show for "best" sort and when there's a clear winner */}
                    {index === 0 && 
                     replySortType === 'best' && 
                     flatReplies.length > 1 && 
                     calculateInteractionScore(reply) > 0 && (
                      <LinearGradient
                        colors={gradients.primary}
                        style={[styles.topReplyBadge, { shadowColor: colors.shadowColor }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.topReplyContent}>
                          <Ionicons 
                            name="star" 
                            size={14} 
                            color={isDarkMode ? '#000' : '#fff'} 
                          />
                          <Text style={[styles.topReplyText, { color: isDarkMode ? '#000' : '#fff' }]}>Top Reply</Text>
                        </View>
                      </LinearGradient>
                    )}

                    <Reply
                      reply={reply}
                      postId={post.id}
                      currentUserWallet={currentUserWallet}
                      onLike={onLikeReply}
                      onReply={handleReply}
                      onBump={onBumpReply}
                      onTip={onTipReply}
                    />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    marginHorizontal: 15,
    marginBottom: 16,
    borderRadius: 24,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  sponsoredBlurContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  postGradient: {
    borderRadius: 24,
    padding: 0,
  },
  post: {
    borderRadius: 24,
    padding: 20,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  bumpedBlurContainer: {
    borderColor: 'rgba(67, 233, 123, 0.6)',
  },
  topRightBadges: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  tipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tipText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 60,
  },
  sponsoredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  sponsoredText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000000',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  nftAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  postMeta: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.mono,
    color: '#43e97b',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  time: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  subcategoryDot: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
  },
  subcategory: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(67, 233, 123, 0.8)',
  },
  postContentContainer: {
    position: 'relative',
  },
  postContent: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    lineHeight: 24,
    marginBottom: 12,
    color: '#e0e0e0',
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(67, 233, 123, 0.1)',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnInner: {
    flex: 1,
    borderRadius: 16,
  },
  likedBtn: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  activeBtn: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  pressedBtn: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  actionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  likedBtnGradient: {
    borderColor: '#43e97b',
    borderWidth: 1,
  },
  activeBtnGradient: {
    borderColor: '#43e97b',
    borderWidth: 1,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedText: {
    color: '#ff4444',
    fontFamily: Fonts.bold,
    textShadowColor: 'rgba(255, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 0.2,
  },
  activeText: {
    color: '#43e97b',
    fontFamily: Fonts.bold,
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 0.2,
  },
  reportBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  reportBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBadgeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: -2,
  },
  showRepliesSection: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(67, 233, 123, 0.1)',
    alignItems: 'center',
  },
  showRepliesBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  showRepliesBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  showRepliesBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  showRepliesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  showRepliesText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.3,
  },
  hideRepliesBtn: {
    alignItems: 'center',
  },
  hideRepliesBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  hideRepliesBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  hideRepliesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hideRepliesText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  repliesContainer: {
    marginTop: 15,
  },
  repliesControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  sortToggle: {
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sortBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sortToggleGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  sortToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sortToggleText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  flatReplyContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  topReplyBadge: {
    position: 'absolute',
    top: -5,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 3,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  topReplyText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#000',
    marginLeft: 4,
  },
  topReplyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});