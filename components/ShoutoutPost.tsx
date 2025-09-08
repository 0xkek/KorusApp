import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/Fonts';
import Post from './Post';
import { Post as PostType } from '../types';

interface ShoutoutPostProps {
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
}

const ShoutoutPost: React.FC<ShoutoutPostProps> = (props) => {
  // Mark the post as a shoutout so Post component can style it gold
  const shoutoutPost = {
    ...props.post,
    isShoutout: true
  };

  return (
    <View style={styles.container}>
      {/* Shoutout header badge */}
      <LinearGradient
        colors={['#FFD700', '#FFA500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shoutoutBadge}
      >
        <Ionicons name="megaphone" size={14} color="#FFF" />
        <Text style={[styles.shoutoutText, { fontFamily: Fonts.bold }]}>
          SHOUTOUT
        </Text>
        <View style={styles.starContainer}>
          <Ionicons name="star" size={10} color="#FFD700" />
          <Ionicons name="star" size={10} color="#FFD700" />
          <Ionicons name="star" size={10} color="#FFD700" />
        </View>
      </LinearGradient>

      {/* Pass through to Post with the shoutout flag */}
      <Post {...props} post={shoutoutPost} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  shoutoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 15,
    marginBottom: -1,
    zIndex: 10,
    elevation: 5,
  },
  shoutoutText: {
    color: '#FFF',
    fontSize: 12,
    letterSpacing: 1,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
});

export default ShoutoutPost;