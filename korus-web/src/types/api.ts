/**
 * API types that match the backend response structure exactly
 * These types represent the raw data received from the backend
 */

/**
 * Author information included in post/reply responses
 */
export interface APIAuthor {
  walletAddress: string;
  tier?: 'free' | 'premium';
  genesisVerified?: boolean;
  snsUsername?: string;
  username?: string;
  nftAvatar?: string;
  themeColor?: string;
  subscriptionStatus?: string;
}

/**
 * Post as returned by the backend API
 */
export interface APIPost {
  id: number | string;
  authorWallet: string;
  content: string;
  topic?: string;
  subtopic?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  tipCount?: number;
  tipAmount?: string | number;
  isHidden?: boolean;
  isLiked?: boolean;
  isRepost?: boolean;
  isShoutout?: boolean;
  shoutoutDuration?: number;
  shoutoutExpiresAt?: string | Date;
  shoutoutPrice?: number;
  originalPostId?: string;
  author?: APIAuthor;
  originalPost?: APIPost;
}

/**
 * Reply as returned by the backend API
 */
export interface APIReply {
  id: string | number;
  postId: string;
  authorWallet: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  parentReplyId?: string | null;
  imageUrl?: string;
  videoUrl?: string;
  isHidden: boolean;
  author: APIAuthor;
  childReplies?: APIReply[];
  _count?: {
    childReplies: number;
  };
}

/**
 * Shoutout queue information
 */
export interface APIShoutoutQueue {
  active: {
    id: string;
    duration: number;
    expiresAt: Date | string;
    content: string;
  } | null;
  queued: Array<{
    id: string;
    duration: number;
    expiresAt: Date | string;
    content: string;
  }>;
  queueLength: number;
}

/**
 * Get posts response
 */
export interface APIPostsResponse {
  success: boolean;
  posts: APIPost[];
  meta?: {
    resultCount: number;
    nextCursor?: string;
    hasMore: boolean;
  };
  pagination?: {
    limit: number;
    cursor?: string;
    hasMore: boolean;
  };
  shoutoutQueue?: APIShoutoutQueue;
  error?: string;
}

/**
 * Get post by ID response
 */
export interface APIPostResponse {
  success: boolean;
  post?: APIPost;
  replies?: APIReply[];
  error?: string;
}

/**
 * Create post request
 */
export interface CreatePostRequest {
  content?: string;
  topic?: string;
  subtopic?: string;
  imageUrl?: string;
  videoUrl?: string;
  isShoutout?: boolean;
  shoutoutDuration?: number;
  transactionSignature?: string;
}

/**
 * Create reply request
 */
export interface CreateReplyRequest {
  content: string;
  parentReplyId?: string;
  imageUrl?: string;
  videoUrl?: string;
}

/**
 * Generic API response
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * User profile from API
 */
export interface APIUserProfile {
  walletAddress: string;
  username?: string;
  snsUsername?: string;
  displayName?: string;
  bio?: string;
  nftAvatar?: string;
  themeColor?: string;
  tier: 'free' | 'premium';
  genesisVerified: boolean;
  createdAt: string;
  _count?: {
    posts: number;
    replies: number;
  };
}
