import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Reply as ReplyType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSizes } from '../constants/Fonts';
// import { sendLocalNotification } from '../utils/notifications';

interface ReplyProps {
  reply: ReplyType;
  postId: number;
  currentUserWallet: string;
  onLike: (postId: number, replyId: number) => void;
  onReply: (postId: number, quotedText?: string, quotedUsername?: string) => void;
  onBump: (replyId: number) => void;
  onTip: (postId: number, replyId: number) => void;
  depth?: number;
  isLastInThread?: boolean;
  hasMoreSiblings?: boolean;
  parentUsername?: string;
  post?: any; // To check if reply author is OP
  isDetailView?: boolean; // New prop to distinguish between homepage and detail view
}

function Reply({
  reply,
  postId,
  currentUserWallet,
  onLike,
  onReply,
  onBump,
  onTip,
  depth = 0,
  isLastInThread = false,
  hasMoreSiblings = false,
  parentUsername,
  post,
  isDetailView = false,
}: ReplyProps) {
  const { colors, isDarkMode, gradients } = useTheme();

  // Helper function to check if reply's bump is still active
  const isBumpActive = (reply: ReplyType) => {
    if (!reply.bumped || !reply.bumpExpiresAt) return false;
    return Date.now() < reply.bumpExpiresAt;
  };

  // Check if this reply contains a quote
  const parseContent = (content: string) => {
    if (content.includes('> "')) {
      const parts = content.split('\n\n');
      const quotePart = parts.find(part => part.startsWith('> "'));
      const replyPart = parts.find(part => !part.startsWith('> "'));
      if (quotePart && replyPart) {
        const quotedText = quotePart.replace('> "', '').replace('"', '');
        return { quotedText, replyText: replyPart };
      }
    }
    return { quotedText: null, replyText: content };
  };

  const { quotedText, replyText } = parseContent(reply.content);
  const bumpActive = isBumpActive(reply);

  const handleLike = () => {
    onLike(postId, reply.id);
    // Send notification if not liking own reply
    if (reply.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'like',
      //   fromUser: currentUserWallet,
      //   postId: postId,
      //   replyId: reply.id,
      // });
    }
  };

  const handleReply = () => {
    onReply(postId, reply.content, reply.wallet);
    // Send notification if not replying to own reply
    if (reply.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'quote',
      //   fromUser: currentUserWallet,
      //   postId: postId,
      //   replyId: reply.id,
      //   content: reply.content,
      // });
    }
  };

  const handleBump = () => {
    onBump(reply.id);
    // Send notification if not bumping own reply
    if (reply.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'bump',
      //   fromUser: currentUserWallet,
      //   replyId: reply.id,
      // });
    }
  };

  const handleTip = () => {
    onTip(postId, reply.id);
    // Send notification if not tipping own reply
    if (reply.wallet !== currentUserWallet) {
      // sendLocalNotification({
      //   type: 'tip',
      //   fromUser: currentUserWallet,
      //   postId: postId,
      //   replyId: reply.id,
      // });
    }
  };

  return (
    <View style={[styles.replyContainer, { marginHorizontal: isDetailView ? 15 : 0 }]}>
      <View style={[styles.blurContainer, { borderColor: colors.border, backgroundColor: colors.surface + '20' }]}>
        <LinearGradient
          colors={gradients.surface}
          style={styles.replyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.reply}>
          
          {reply.tips > 0 && (
            <LinearGradient
              colors={gradients.primary}
              style={[styles.replyTipBadge, { shadowColor: colors.shadowColor }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.replyTipText, { color: isDarkMode ? '#000' : '#fff' }]}>+{reply.tips} $ALLY</Text>
            </LinearGradient>
          )}

          <View style={styles.replyHeader}>
            <LinearGradient
              colors={gradients.primary}
              style={[
                styles.replyAvatar, 
                { 
                  shadowColor: colors.shadowColor,
                  borderWidth: 3,
                  borderColor: reply.userTheme || '#43e97b'
                }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.replyAvatarText, { color: isDarkMode ? '#000' : '#fff' }]}>
                {reply.wallet.slice(0, 2)}
              </Text>
            </LinearGradient>
            <View style={styles.replyMeta}>
              <View style={styles.usernameRow}>
                <Text style={[styles.replyUsername, { color: colors.primary, textShadowColor: colors.primary + '33' }]}>
                  {reply.wallet}
                </Text>
                {reply.isPremium && (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#FFD700' }]}>
                    <Ionicons name="checkmark" size={8} color="#000" />
                  </View>
                )}
              </View>
              <Text style={[styles.replyTime, { color: colors.textTertiary }]}>
                {reply.time}
              </Text>
            </View>
          </View>

          {/* Twitter-style replying to indicator */}
          {parentUsername && (
            <Text style={[styles.replyingTo, { color: colors.textTertiary }]}>
              Replying to <Text style={{ color: colors.primary }}>@{parentUsername.slice(0, 8)}...</Text>
            </Text>
          )}

          {/* Show quoted content if exists */}
          {quotedText && (
            <LinearGradient
              colors={[
                colors.primary + '14', 
                colors.secondary + '0F'
              ]}
              style={[styles.quoteContainer, { borderColor: colors.borderLight }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.quoteAccent, { backgroundColor: colors.primary }]} />
              <Text style={[styles.quotedText, { color: colors.textTertiary }]}>
                &ldquo;{quotedText}&rdquo;
              </Text>
            </LinearGradient>
          )}

          <Text style={[styles.replyContent, { color: colors.textSecondary }]}>
            {replyText}
          </Text>

          <View style={[styles.replyActions, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[
                styles.replyActionBtn,
                reply.liked && [styles.replyLikedBtn, { shadowColor: colors.primary }]
              ]}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.button}
                style={[
                  styles.replyActionBtnGradient,
                  { borderColor: colors.primary + '50' },
                  reply.liked && [styles.replyLikedBtnGradient, { borderColor: colors.primary }]
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.replyActionContent}>
                  <Ionicons 
                    name={reply.liked ? "heart" : "heart-outline"} 
                    size={14} 
                    color={reply.liked ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.replyActionText,
                    { color: colors.textSecondary },
                    reply.liked && [styles.replyLikedText, { color: colors.primary }]
                  ]}>
                    {reply.likes}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replyActionBtn}
              onPress={handleReply}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.button}
                style={[styles.replyActionBtnGradient, { borderColor: colors.borderLight }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.replyActionContent}>
                  <Ionicons 
                    name="chatbubble-outline" 
                    size={12} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.replyActionText, { color: colors.textSecondary }]}>
                    Quote
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.replyActionBtn,
                reply.tips > 0 && [styles.replyActiveBtn, { shadowColor: colors.shadowColor }]
              ]}
              onPress={handleTip}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.button}
                style={[
                  styles.replyActionBtnGradient,
                  { borderColor: colors.primary + '50' },
                  reply.tips > 0 && [styles.replyActiveBtnGradient, { borderColor: colors.primary }]
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.replyActionContent}>
                  <Ionicons 
                    name="cash-outline" 
                    size={12} 
                    color={reply.tips > 0 ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.replyActionText,
                    { color: colors.textSecondary },
                    reply.tips > 0 && [styles.replyActiveText, { color: colors.primary }]
                  ]}>
                    Tip
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  replyContainer: {
    marginBottom: 16,
    borderRadius: 24,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
  },
  replyGradient: {
    borderRadius: 24,
    padding: 0,
  },
  reply: {
    borderRadius: 24,
    padding: 20,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  replyTipBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 1,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  replyTipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  replyingTo: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: -4,
  },
  replyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  replyAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  replyMeta: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  replyUsername: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#43e97b',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(67, 233, 123, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  replyTime: {
    fontSize: 11,
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  quoteContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.15)',
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#43e97b',
    opacity: 0.6,
  },
  quotedText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingLeft: 8,
  },
  replyContent: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    lineHeight: 24,
    marginBottom: 12,
    color: '#e0e0e0',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(67, 233, 123, 0.08)',
    gap: 6,
  },
  replyActionBtn: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  replyLikedBtn: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  replyActiveBtn: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  replyActionBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  replyLikedBtnGradient: {
    borderColor: '#43e97b',
    borderWidth: 1,
  },
  replyActiveBtnGradient: {
    borderColor: '#43e97b',
    borderWidth: 1,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginLeft: 4,
  },
  replyActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyLikedText: {
    color: '#ff4444',
    fontWeight: '700',
  },
  replyActiveText: {
    color: '#43e97b',
    fontWeight: '700',
  },
});

// Memoize Reply component
export default React.memo(Reply, (prevProps, nextProps) => {
  // Check if reply data changed
  if (prevProps.reply.id !== nextProps.reply.id ||
      prevProps.reply.likes !== nextProps.reply.likes ||
      prevProps.reply.liked !== nextProps.reply.liked ||
      prevProps.reply.bumped !== nextProps.reply.bumped ||
      prevProps.reply.tips !== nextProps.reply.tips) {
    return false;
  }
  
  return true;
});