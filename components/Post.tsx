import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Post as PostType } from '../types';
// import { sendLocalNotification } from '../utils/notifications';
import Reply from './Reply';
import { Fonts, FontSizes } from '../constants/Fonts';

interface PostProps {
  post: PostType;
  expandedPosts: Set<number>;
  currentUserWallet: string;
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
  const { colors, isDarkMode } = useTheme();
  
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
          currentlyBumped && styles.bumpedBlurContainer
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(30, 30, 30, 0.95)',
            'rgba(20, 20, 20, 0.98)',
            'rgba(15, 15, 15, 0.99)',
            'rgba(10, 10, 10, 1)',
          ]}
          style={styles.postGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.post}
            activeOpacity={0.98}
          >
            {/* Sponsored Tag */}
            {post.sponsored && (
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.sponsoredBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.sponsoredText}>SPONSORED</Text>
              </LinearGradient>
            )}

            {/* Top-right badges area */}
            <View style={styles.topRightBadges}>
              {/* Report Button - 3 dots to the left of tip badge */}
              {post.wallet !== currentUserWallet && onShowReportModal && (
                <TouchableOpacity
                  style={styles.reportBadge}
                  onPress={handleReport}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                    style={styles.reportBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.reportBadgeText}>⋮</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {post.tips > 0 && (
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.tipBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.tipText}>+{post.tips} $ALLY</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.postHeader}>
              <TouchableOpacity onPress={handleShowProfile} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarText}>
                    {post.wallet.slice(0, 2)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.postMeta}>
                <Text style={styles.username}>{post.wallet}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.time}>{post.time}</Text>
                  <Text style={styles.subcategoryDot}>•</Text>
                  <Text style={styles.subcategory}>{post.subcategory}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDoubleTap}
              activeOpacity={1}
              style={styles.postContentContainer}
            >
              <Text style={styles.postContent}>{post.content}</Text>
            </TouchableOpacity>


            <View style={styles.postActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.liked && styles.likedBtn,
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => handleLike(e)}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                    style={[
                      styles.actionBtnGradient,
                      post.liked && styles.likedBtnGradient
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.actionText,
                      post.liked && styles.likedText
                    ]}>
                      ❤️ {post.likes}
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  flatReplies.length > 0 && styles.activeBtn,
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => flatReplies.length > 0 ? onToggleReplies(post.id) : handleReply(post.id, undefined, undefined, e)}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                    style={[
                      styles.actionBtnGradient,
                      flatReplies.length > 0 && styles.activeBtnGradient
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.actionText,
                      flatReplies.length > 0 && styles.activeText
                    ]}>
                      💬 {flatReplies.length}
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  currentlyBumped && styles.activeBtn,
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => handleBump(e)}
                disabled={currentlyBumped}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                    style={[
                      styles.actionBtnGradient,
                      currentlyBumped && styles.activeBtnGradient
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.actionText,
                      currentlyBumped && styles.activeText
                    ]}>
                      {currentlyBumped ? 'Bumped!' : 'Bump'}
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.tips > 0 && styles.activeBtn,
                  pressed && styles.pressedBtn
                ]}
                onPress={handleShowTipModal}
                android_disableSound={true}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                    style={[
                      styles.actionBtnGradient,
                      post.tips > 0 && styles.activeBtnGradient
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.actionText,
                      post.tips > 0 && styles.activeText
                    ]}>
                      💰 Tip
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>
            </View>

            {/* Replies Section */}
            {flatReplies.length > 0 && !expandedPosts.has(post.id) && (
              <TouchableOpacity
                style={styles.showRepliesBtn}
                onPress={() => onToggleReplies(post.id)}
                activeOpacity={1}
              >
                <Text style={styles.showRepliesText}>
                  View {flatReplies.length} {flatReplies.length === 1 ? 'reply' : 'replies'} ↓
                </Text>
              </TouchableOpacity>
            )}

            {expandedPosts.has(post.id) && flatReplies.length > 0 && (
              <View style={styles.repliesContainer}>
                <TouchableOpacity
                  style={styles.hideRepliesBtn}
                  onPress={() => onToggleReplies(post.id)}
                  activeOpacity={1}
                >
                  <Text style={styles.hideRepliesText}>
                    Hide replies ↑
                  </Text>
                </TouchableOpacity>

                {/* Enhanced Sort Controls */}
                <View style={styles.sortControls}>
                  <TouchableOpacity
                    style={styles.sortToggle}
                    onPress={() => onToggleReplySorting(post.id)}
                    activeOpacity={1}
                  >
                    <BlurView intensity={20} style={styles.sortBlur}>
                      <LinearGradient
                        colors={['rgba(25, 25, 25, 0.8)', 'rgba(20, 20, 20, 0.9)']}
                        style={styles.sortToggleGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.sortToggleText}>
                          Sort: {replySortType === 'best' ? '🏆 Best' : '🕐 Recent'}
                        </Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>

                  <View style={styles.sortIndicator}>
                    <Text style={styles.sortText}>
                      {replySortType === 'best' 
                        ? '🔥 Showing most appreciated replies' 
                        : '⏰ Showing newest replies first'
                      }
                    </Text>
                  </View>
                </View>

                {flatReplies.map((reply, index) =>
                  <View key={reply.id} style={styles.flatReplyContainer}>
                    {/* Top reply badge - only show for "best" sort and when there's a clear winner */}
                    {index === 0 && 
                     replySortType === 'best' && 
                     flatReplies.length > 1 && 
                     calculateInteractionScore(reply) > 0 && (
                      <LinearGradient
                        colors={['#43e97b', '#38f9d7']}
                        style={styles.topReplyBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.topReplyText}>⭐ Top Reply</Text>
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
  postGradient: {
    borderRadius: 24,
    padding: 0,
  },
  post: {
    borderRadius: 24,
    padding: 20,
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
  sponsoredBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 3,
    shadowColor: '#FFD700',
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
    marginBottom: 20,
    color: '#e0e0e0',
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
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
  showRepliesBtn: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  showRepliesText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
    textShadowColor: 'rgba(67, 233, 123, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 0.3,
  },
  hideRepliesBtn: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  hideRepliesText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  repliesContainer: {
    marginTop: 15,
  },
  sortControls: {
    marginBottom: 15,
    gap: 6,
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
  },
  sortToggleText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sortIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.6)',
  },
  sortText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.5)',
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
  },
});