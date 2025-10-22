/**
 * Shared type definitions for posts and replies
 */

export interface Reply {
  id: number | string;
  postId?: string; // The original post ID this reply belongs to
  user: string;
  wallet?: string;
  content: string;
  likes: number;
  replies: Reply[]; // Nested replies (threaded conversations)
  time: string;
  isPremium?: boolean;
  isExpanded?: boolean;
  image?: string;
  videoUrl?: string;
  avatar?: string | null; // NFT avatar URL
}

export interface Post {
  id: number | string;
  user: string;
  wallet?: string;
  content: string;
  likes: number;
  replies: number; // Count of replies, NOT the actual reply objects
  comments?: number; // Alias for replies count
  reposts?: number; // Count of reposts
  tips: number;
  tipCount?: number; // Count of tips received
  time: string;
  createdAt?: string | Date; // Raw timestamp for sorting
  isPremium?: boolean;
  isShoutout?: boolean;
  isSponsored?: boolean;
  isRepost?: boolean;
  repostedPost?: Post;
  repostedBy?: string;
  image?: string;
  imageUrl?: string;
  video?: string;
  videoUrl?: string;
  shoutoutDuration?: number;
  shoutoutStartTime?: number;
  shoutoutExpiresAt?: Date | string;
  category?: string;
  subcategory?: string;
  avatar?: string; // User's avatar/NFT
  userTheme?: string; // User's theme color
  // Complete author object from backend (includes premium status, SNS, NFT avatar)
  author?: {
    walletAddress: string;
    tier?: string;
    genesisVerified?: boolean;
    snsUsername?: string | null;
    username?: string | null;
    nftAvatar?: string | null;
    themeColor?: string | null;
  };
}

export interface UserStats {
  posts: number;
  replies: number;
  tipsReceived: number;
  tipsGiven: number;
  repScore: number;
}

export interface UserInfo {
  wallet: string;
  username: string | null;
  avatar: string;
  isPremium: boolean;
  bio?: string;
  snsDomains?: string[];
  favoriteDomain?: string | null;
}
