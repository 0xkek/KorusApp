/**
 * Shared type definitions for posts and replies
 */

export interface Reply {
  id: number;
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
}

export interface Post {
  id: number;
  user: string;
  wallet?: string;
  content: string;
  likes: number;
  replies: number; // Count of replies, NOT the actual reply objects
  tips: number;
  time: string;
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
  category?: string;
  subcategory?: string;
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
