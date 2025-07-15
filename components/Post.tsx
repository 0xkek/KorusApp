import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Post as PostType } from '../types';
// import { sendLocalNotification } from '../utils/notifications';
import Reply from './Reply';

interface PostProps {
  post: PostType;
  expandedPosts: Set<number>;
  currentUserWallet: string;
  replySortType: 'best' | 'recent';
  onLike: (postId: number) => void;
  onReply: (postId: number, quotedText?: string, quotedUsername?: string) => void;
  onBump: (postId: number) => void;
  onTip: (postId: number) => void;
  onLikeReply: (postId: number, replyId: number) => void;
  onTipReply: (postId: number, replyId: number) => void;
  onBumpReply: (replyId: number) => void;
  onToggleReplies: (postId: number) => void;
  onToggleReplySorting: (postId: number) => void;
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
  onLikeReply,
  onTipReply,
  onBumpReply,
  onToggleReplies,
  onToggleReplySorting,
}: PostProps) {
  const { colors, isDarkMode } = useTheme();

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

  const handleLike = () => {
    onLike(post.id);
    // Send notification if not liking own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'like',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
  };

  const handleReply = (postId: number, quotedText?: string, quotedUsername?: string) => {
    onReply(postId, quotedText, quotedUsername);
    // Send notification if not replying to own post
    if (post.wallet !== currentUserWallet && !quotedText) {
      // sendLocalNotification({
      //   type: 'reply',
      //   fromUser: currentUserWallet,
      //   postId: postId,
      // });
    }
  };

  const handleBump = () => {
    onBump(post.id);
    // Send notification if not bumping own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'bump',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
  };

  const handleTip = () => {
    onTip(post.id);
    // Send notification if not tipping own post
    if (post.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'tip',
      //   fromUser: currentUserWallet,
      //   postId: post.id,
      // });
    }
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

            <View style={styles.postHeader}>
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
              <View style={styles.postMeta}>
                <Text style={styles.username}>{post.wallet}</Text>
                <Text style={styles.time}>{post.time}</Text>
              </View>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.postActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.liked && styles.likedBtn,
                  pressed && styles.pressedBtn
                ]}
                onPress={handleLike}
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
                onPress={() => flatReplies.length > 0 ? onToggleReplies(post.id) : handleReply(post.id)}
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
                onPress={handleBump}
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
                      {currentlyBumped ? 'Bumped!' : '⬆️ Bump'}
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
                onPress={handleTip}
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
  tipBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 3,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  postMeta: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#43e97b',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  time: {
    fontSize: 12,
    marginTop: 3,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    color: '#e0e0e0',
    fontWeight: '500',
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
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  likedText: {
    color: '#ff4444',
    fontWeight: '700',
    textShadowColor: 'rgba(255, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  activeText: {
    color: '#43e97b',
    fontWeight: '700',
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  showRepliesBtn: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  showRepliesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#43e97b',
    textShadowColor: 'rgba(67, 233, 123, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  hideRepliesBtn: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  hideRepliesText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
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
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 10,
    fontWeight: '500',
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
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
  },
});