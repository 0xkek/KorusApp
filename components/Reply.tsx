import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Reply as ReplyType } from '../types';
// import { sendLocalNotification } from '../utils/notifications';

interface ReplyProps {
  reply: ReplyType;
  postId: number;
  currentUserWallet: string;
  onLike: (postId: number, replyId: number) => void;
  onReply: (postId: number, quotedText?: string, quotedUsername?: string) => void;
  onBump: (replyId: number) => void;
  onTip: (postId: number, replyId: number) => void;
}

export default function Reply({
  reply,
  postId,
  currentUserWallet,
  onLike,
  onReply,
  onBump,
  onTip,
}: ReplyProps) {
  const { colors, isDarkMode } = useTheme();

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
    <View style={styles.replyContainer}>
      <LinearGradient
        colors={[
          'rgba(30, 30, 30, 0.9)',
          'rgba(25, 25, 25, 0.95)',
          'rgba(20, 20, 20, 0.98)',
        ]}
        style={styles.replyGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.reply}>
          {/* Green accent border */}
          <View style={styles.leftAccent} />
          
          {reply.tips > 0 && (
            <LinearGradient
              colors={['#43e97b', '#38f9d7']}
              style={styles.replyTipBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.replyTipText}>+{reply.tips} $ALLY</Text>
            </LinearGradient>
          )}

          <View style={styles.replyHeader}>
            <LinearGradient
              colors={['#43e97b', '#38f9d7']}
              style={styles.replyAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.replyAvatarText}>
                {reply.wallet.slice(0, 2)}
              </Text>
            </LinearGradient>
            <View style={styles.replyMeta}>
              <Text style={styles.replyUsername}>
                {reply.wallet}
              </Text>
              <Text style={styles.replyTime}>
                {reply.time}
              </Text>
            </View>
          </View>

          {/* Show quoted content if exists */}
          {quotedText && (
            <LinearGradient
              colors={['rgba(67, 233, 123, 0.08)', 'rgba(56, 249, 215, 0.06)']}
              style={styles.quoteContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.quoteAccent} />
              <Text style={styles.quotedText}>
                &ldquo;{quotedText}&rdquo;
              </Text>
            </LinearGradient>
          )}

          <Text style={styles.replyContent}>
            {replyText}
          </Text>

          <View style={styles.replyActions}>
            <TouchableOpacity
              style={[
                styles.replyActionBtn,
                reply.liked && styles.replyLikedBtn
              ]}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(45, 45, 45, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={[
                  styles.replyActionBtnGradient,
                  reply.liked && styles.replyLikedBtnGradient
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[
                  styles.replyActionText,
                  reply.liked && styles.replyLikedText
                ]}>
                  ❤️ {reply.likes}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replyActionBtn}
              onPress={handleReply}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(45, 45, 45, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.replyActionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.replyActionText}>
                  💬 Quote
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.replyActionBtn,
                bumpActive && styles.replyActiveBtn
              ]}
              onPress={handleBump}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(45, 45, 45, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={[
                  styles.replyActionBtnGradient,
                  bumpActive && styles.replyActiveBtnGradient
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[
                  styles.replyActionText,
                  bumpActive && styles.replyActiveText
                ]}>
                  {bumpActive ? 'Bumped!' : '⬆️ Bump'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.replyActionBtn,
                reply.tips > 0 && styles.replyActiveBtn
              ]}
              onPress={handleTip}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(45, 45, 45, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={[
                  styles.replyActionBtnGradient,
                  reply.tips > 0 && styles.replyActiveBtnGradient
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[
                  styles.replyActionText,
                  reply.tips > 0 && styles.replyActiveText
                ]}>
                  💰 Tip
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  replyContainer: {
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  replyGradient: {
    borderRadius: 16,
    padding: 1,
  },
  reply: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.1)',
    padding: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#43e97b',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  replyTipBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    zIndex: 1,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  replyTipText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#000',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  replyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  replyMeta: {
    flex: 1,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#43e97b',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(67, 233, 123, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: '#e0e0e0',
    fontWeight: '500',
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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