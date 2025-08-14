// import { BlurView } from 'expo-blur'; // Removed for performance
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState, memo, useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View, Linking, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Post as PostType } from '../types';
// import { sendLocalNotification } from '../utils/notifications';
import Reply from './Reply';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useDisplayName } from '../hooks/useSNSDomain';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import LinkPreview from './LinkPreview';
import GamePost from './GamePost';

// Video Player Component
const VideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.volume = 1.0;
  });

  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        allowsFullscreen
        allowsPictureInPicture
      />
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isPlaying ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
        }}
        onPress={() => {
          if (isPlaying) {
            player.pause();
          } else {
            player.play();
          }
          setIsPlaying(!isPlaying);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        {!isPlaying && (
          <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.9)" />
        )}
      </TouchableOpacity>
    </View>
  );
};

interface PostProps {
  post: PostType;
  expandedPosts: Set<number>;
  currentUserWallet: string;
  currentUserAvatar?: string | null;
  currentUserNFTAvatar?: any | null;
  replySortType?: 'best' | 'recent';
  onLike: (postId: number | string) => void;
  onReply: (postId: number, quotedText?: string, quotedUsername?: string) => void;
  onTip: (postId: number, amount: number) => void;
  onShowTipModal: (postId: number) => void;
  onLikeReply: (postId: number, replyId: number) => void;
  onTipReply: (postId: number, replyId: number) => void;
  onToggleReplies: (postId: number) => void;
  onToggleReplySorting?: (postId: number) => void;
  onReport?: (postId: number) => void;
  onShowProfile?: (wallet: string) => void;
  onShowReportModal?: (postId: number) => void;
  onJoinGame?: (postId: number) => void;
  onGameMove?: (postId: number, moveData: any, moveType?: string) => void;
  showAsDetail?: boolean;
}

// Function to detect and render hyperlinks
const renderTextWithLinks = (text: string, textStyle: any, linkColor: string) => {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text
          key={index}
          style={[textStyle, { color: linkColor, textDecorationLine: 'underline' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL(part);
          }}
        >
          {part}
        </Text>
      );
    }
    return <Text key={index} style={textStyle}>{part}</Text>;
  });
};

// Function to extract URLs from text
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

const Post = memo<PostProps>(function Post({
  post,
  expandedPosts,
  currentUserWallet,
  currentUserAvatar,
  currentUserNFTAvatar,
  replySortType = 'best',
  onLike,
  onReply,
  onTip,
  onShowTipModal,
  onLikeReply,
  onTipReply,
  onToggleReplies,
  onToggleReplySorting,
  onReport,
  onShowProfile,
  onShowReportModal,
  onJoinGame,
  onGameMove,
  showAsDetail = false,
}) {
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const { isPremium: currentUserIsPremium } = useWallet();
  
  // If this is the current user's post, use their premium status
  const postIsPremium = post.wallet === currentUserWallet ? currentUserIsPremium : post.isPremium;
  const displayName = useDisplayName(post.wallet, postIsPremium || false);
  
  // Memoize expensive computations
  const isExpanded = useMemo(() => expandedPosts.has(post.id), [expandedPosts, post.id]);
  const urls = useMemo(() => extractUrls(post.content), [post.content]);
  
  // Memoize callbacks
  const handleLike = useCallback(() => {
    onLike(post.id);
  }, [onLike, post.id]);
  
  const handleReply = useCallback(() => {
    onReply(post.id);
  }, [onReply, post.id]);
  
  const handleToggleReplies = useCallback(() => {
    onToggleReplies(post.id);
  }, [onToggleReplies, post.id]);
  
  const handleShowProfile = useCallback(() => {
    if (onShowProfile) {
      onShowProfile(post.wallet);
    } else {
      router.push({
        pathname: '/profile',
        params: { wallet: post.wallet }
      });
    }
  }, [onShowProfile, post.wallet, router]);
  
  // Video player wrapper component
  const VideoPlayerWrapper = ({ videoUrl, colors }: { videoUrl: string; colors: any }) => {
    const player = useVideoPlayer(videoUrl, player => {
      player.loop = false;
    });

    return (
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.videoContainer}
        onPress={(e) => {
          e.stopPropagation();
          // Don't navigate when clicking on video
        }}
      >
        <VideoView 
          style={styles.postVideo} 
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
      </TouchableOpacity>
    );
  };
  
  // Double-tap to like functionality
  const lastTapTime = useRef(0);
  const DOUBLE_TAP_DELAY = 300;

  const handleDoubleTap = (event?: any) => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      // Allow both like and unlike via double-tap
      handleLike(event);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    lastTapTime.current = now;
  };

  // Flatten all replies with depth tracking
  const flattenReplies = (replies: any[], depth = 0, parentId?: number): any[] => {
    let flattened: any[] = [];
    const processReply = (reply: any, currentDepth: number, currentParentId?: number) => {
      flattened.push({ ...reply, depth: currentDepth, parentId: currentParentId });
      if (reply.replies && reply.replies.length > 0) {
        reply.replies.forEach((childReply: any) => 
          processReply(childReply, currentDepth + 1, reply.id)
        );
      }
    };
    replies.forEach(reply => processReply(reply, depth, parentId));
    return flattened;
  };

  const flatReplies = flattenReplies(post.replies);
  
  // Use replyCount from backend if replies haven't been loaded yet
  const displayReplyCount = post.replyCount !== undefined ? post.replyCount : flatReplies.length;
  
  // Check if current user has replied to this post
  const hasUserReplied = flatReplies.some(reply => reply.wallet === currentUserWallet);

  // Calculate interaction score for top reply badge
  const calculateInteractionScore = (reply: any) => {
    const timeBonus = reply.time === 'now' ? 10 : 0;
    return (reply.likes * 3) + (reply.tips * 5) + timeBonus;
  };


  const handleLikeWithEvent = (event?: any) => {
    // Only trigger particle explosion when adding a like, not removing it
    const isAddingLike = !post.liked;
    
    handleLike();
    
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

  const handleReplyWithQuote = (postId: number, quotedText?: string, quotedUsername?: string, event?: any) => {
    // If not in detail view and clicking reply button (not quoting)
    if (!showAsDetail && !quotedText) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // If there are no replies, directly open the reply modal
      if (flatReplies.length === 0) {
        onReply(postId, quotedText, quotedUsername);
        return;
      }
      
      // If there are replies and they're already expanded, open the reply modal
      if (expandedPosts.has(post.id)) {
        onReply(postId, quotedText, quotedUsername);
      } else {
        // First click: expand replies (only if there are replies to show)
        onToggleReplies(post.id);
      }
      return;
    }
    
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

  const handleShowProfileModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowProfile?.(post.wallet);
  };


  return (
    <View style={styles.postContainer}>
      {/* Main glassmorphism card with subtle glow */}
      <View 
        style={[
          styles.blurContainer,
          { 
            borderColor: colors.border + '60', 
            backgroundColor: colors.surface + '20',
            shadowColor: post.sponsored ? colors.primary : colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.1 : 0.05,
            shadowRadius: 8,
            elevation: 3,
          },
          post.sponsored && [styles.sponsoredBlurContainer, { borderColor: colors.primary + '99' }]
        ]}
      >
        <LinearGradient
          colors={gradients.surface}
          style={styles.postGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.post}>

            {/* Top-right badges area */}
            <View style={styles.topRightBadges}>
              {/* Report Button - 3 dots to the left of tip badge */}
              {post.wallet !== currentUserWallet && onShowReportModal && (
                <TouchableOpacity
                  style={[
                    styles.reportBadge, 
                    { 
                      borderColor: post.reportedBy?.includes(currentUserWallet) 
                        ? colors.error 
                        : colors.error + '66',
                      opacity: post.reportedBy?.includes(currentUserWallet) ? 0.5 : 1
                    }
                  ]}
                  onPress={handleReport}
                  activeOpacity={0.7}
                  disabled={post.reportedBy?.includes(currentUserWallet)}
                >
                  <LinearGradient
                    colors={post.reportedBy?.includes(currentUserWallet) 
                      ? [colors.error + '40', colors.error + '20']
                      : gradients.button
                    }
                    style={styles.reportBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[
                      styles.reportBadgeText, 
                      { 
                        color: post.reportedBy?.includes(currentUserWallet) 
                          ? colors.error 
                          : colors.textTertiary 
                      }
                    ]}>
                      {post.reportedBy?.includes(currentUserWallet) ? '✓' : '⋮'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
            </View>

            {/* Clickable content area */}
            <TouchableOpacity
              activeOpacity={0.98}
              onPress={() => {
                if (!showAsDetail) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/post/${post.id}`);
                }
              }}
              style={styles.clickableContent}
              accessible={true}
              accessibilityLabel={`Post by ${displayName}, ${post.time}. ${post.content}`}
              accessibilityHint={showAsDetail ? undefined : "Double tap to view post details"}
              accessibilityRole="button"
            >
              <View style={styles.postHeader}>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShowProfile();
                  }} 
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityLabel={`View ${displayName}'s profile`}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={gradients.primary}
                    style={[
                      styles.avatar, 
                      { 
                        shadowColor: colors.shadowColor,
                        borderWidth: 2,
                        borderColor: post.userTheme || '#43e97b'
                      }
                    ]}
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
                    {postIsPremium && (
                      <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                        <Ionicons name="star" size={10} color="#000" />
                      </View>
                    )}
                    {post.sponsored && (
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={[styles.sponsoredBadge, { shadowColor: '#FFD700' }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.sponsoredText, { color: '#000' }]}>SPONSORED</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.time, { color: colors.textTertiary }]}>{post.time}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleDoubleTap}
                activeOpacity={1}
                style={styles.postContentContainer}
              >
                <Text style={[styles.postContent, { color: colors.textSecondary }]}>
                  {renderTextWithLinks(post.content, [styles.postContent, { color: colors.textSecondary }], colors.primary)}
                </Text>
              </TouchableOpacity>
              
              {/* Display link previews */}
              {(() => {
                const urls = extractUrls(post.content);
                // Only show first URL preview to avoid clutter
                const firstUrl = urls[0];
                return firstUrl ? <LinkPreview url={firstUrl} /> : null;
              })()}
              
              {/* Display media if present */}
              {(post.imageUrl || post.videoUrl) && (
                <View style={styles.imageContainer}>
                  {post.videoUrl ? (
                    <VideoPlayer videoUrl={post.videoUrl} />
                  ) : (
                    <Image 
                      source={{ uri: post.imageUrl }} 
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Display game if present - OUTSIDE the clickable area */}
            {post.gameData && onJoinGame && onGameMove && (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                  // Navigate to full-screen game view
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/game/${post.id}`);
                }}
              >
                <GamePost
                  gameData={post.gameData}
                  postId={post.id}
                  onJoinGame={onJoinGame}
                  onMakeMove={onGameMove}
                />
              </TouchableOpacity>
            )}
            
            {/* Display video if present - outside clickable area */}
            {post.videoUrl && (
              <VideoPlayerWrapper videoUrl={post.videoUrl} colors={colors} />
            )}

          <View style={[styles.postActions, { borderTopColor: colors.borderLight }]}>
            <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.liked && [styles.likedBtn, { shadowColor: colors.error }],
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => handleLikeWithEvent(e)}
                android_disableSound={true}
                accessible={true}
                accessibilityLabel={`${post.liked ? 'Unlike' : 'Like'} post. ${post.likes} likes`}
                accessibilityRole="button"
              >
                <View style={[styles.actionBlur, { backgroundColor: colors.surface + '30' }]}>
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
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  hasUserReplied && [styles.activeBtn, { shadowColor: colors.shadowColor }],
                  pressed && styles.pressedBtn
                ]}
                onPress={(e) => handleReplyWithQuote(post.id, undefined, undefined, e)}
                android_disableSound={true}
                accessible={true}
                accessibilityLabel={`Reply to post. ${displayReplyCount} replies`}
                accessibilityRole="button"
              >
                <View style={[styles.actionBlur, { backgroundColor: colors.surface + '30' }]}>
                  <LinearGradient
                    colors={gradients.button}
                    style={[
                      styles.actionBtnGradient,
                      { borderColor: colors.borderLight },
                      hasUserReplied && [styles.activeBtnGradient, { borderColor: colors.primary }]
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.actionContent}>
                      <Ionicons 
                        name={hasUserReplied ? "chatbubble" : "chatbubble-outline"} 
                        size={16} 
                        color={hasUserReplied ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                        hasUserReplied && [styles.activeText, { color: colors.primary, textShadowColor: colors.primary + '66' }]
                      ]}>
                        {displayReplyCount}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  post.tips > 0 && [styles.activeBtn, { shadowColor: colors.shadowColor }],
                  pressed && styles.pressedBtn
                ]}
                onPress={handleShowTipModal}
                android_disableSound={true}
              >
                <View style={[styles.actionBlur, { backgroundColor: colors.surface + '30' }]}>
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
                </View>
              </Pressable>
            </View>

            {/* Replies Section - Removed "View replies" button, only show expanded replies */}
            {!showAsDetail && expandedPosts.has(post.id) && flatReplies.length > 0 && (
              <View style={styles.repliesContainer}>
                {/* Hide Replies + Sort Controls Row */}
                <View style={styles.repliesControlsRow}>
                  <TouchableOpacity
                    style={styles.hideRepliesBtn}
                    onPress={() => onToggleReplies(post.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.hideRepliesBlur, { backgroundColor: colors.surface + '30' }]}>
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
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sortToggle}
                    onPress={() => onToggleReplySorting(post.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.sortBlur, { backgroundColor: colors.surface + '30' }]}>
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
                    </View>
                  </TouchableOpacity>
                </View>

                {flatReplies.map((reply, index) => (
                  <View key={reply.id} style={styles.flatReplyContainer}>

                    <Reply
                      reply={reply}
                      postId={post.id}
                      currentUserWallet={currentUserWallet}
                      onLike={onLikeReply}
                      onReply={handleReplyWithQuote}
                      onTip={onTipReply}
                      onShowProfile={onShowProfile}
                      depth={reply.depth || 0}
                      isLastInThread={index === flatReplies.length - 1 || 
                        (index < flatReplies.length - 1 && flatReplies[index + 1].depth < reply.depth)}
                      hasMoreSiblings={index < flatReplies.length - 1 && 
                        flatReplies[index + 1].depth >= reply.depth}
                      parentUsername={reply.parentId ? flatReplies.find(r => r.id === reply.parentId)?.wallet : post.wallet}
                      post={post}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  postContainer: {
    marginHorizontal: 15,
    marginBottom: 16,
    borderRadius: 24,
  },
  clickableContent: {
    flex: 1,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2, // Restored color border
  },
  sponsoredBlurContainer: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
  topRightBadges: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  sponsoredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    marginLeft: 2,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    textShadowColor: 'rgba(67, 233, 123, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
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
  videoContainer: {
    position: 'relative',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postVideo: {
    width: '100%',
    height: 200,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnInner: {
    flex: 1,
    borderRadius: 16,
  },
  likedBtn: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    textShadowColor: 'rgba(255, 68, 68, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
  },
  activeText: {
    color: '#43e97b',
    fontFamily: Fonts.bold,
    textShadowColor: 'rgba(67, 233, 123, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
});

export default Post;