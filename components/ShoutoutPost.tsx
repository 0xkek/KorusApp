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
      {/* Pass through to Post with the shoutout flag - banner will be inside */}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    gap: 8,
    alignSelf: 'flex-start',
    marginLeft: 15,
    marginBottom: -1,
    zIndex: 10,
    elevation: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  shoutoutText: {
    color: '#FFF',
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
});

export default ShoutoutPost;