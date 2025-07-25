// Shared types for the backend

// User types
export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  tier: 'standard' | 'premium';
  walletSource: 'app' | 'seeker';
  genesisVerified: boolean;
  allyBalance: bigint;
  createdAt: Date;
  updatedAt: Date;
}

// Post types
export interface Post {
  id: string;
  authorWallet: string;
  content: string;
  topic: string;
  imageUrl?: string;
  videoUrl?: string;
  likeCount: number;
  tipCount: number;
  isGame: boolean;
  gameType?: string;
  gameStatus?: string;
  gameWager?: bigint;
  gameData?: any;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
  replies?: Reply[];
}

// Reply types
export interface Reply {
  id: string;
  postId: string;
  authorWallet: string;
  content: string;
  parentReplyId?: string;
  likeCount: number;
  tipCount: number;
  createdAt: Date;
  updatedAt: Date;
  post?: Post;
  author?: User;
  parentReply?: Reply;
  childReplies?: Reply[];
}

// Interaction types
export interface Interaction {
  id: string;
  userWallet: string;
  targetType: 'post' | 'reply';
  targetId: string;
  interactionType: 'like' | 'tip';
  amount?: bigint;
  createdAt: Date;
  user?: User;
}

// Notification types
export interface Notification {
  id: string;
  userWallet: string;
  type: string;
  content: string;
  isRead: boolean;
  relatedPostId?: string;
  relatedReplyId?: string;
  relatedUserWallet?: string;
  createdAt: Date;
  user?: User;
  relatedPost?: Post;
  relatedReply?: Reply;
  relatedUser?: User;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Request types
export interface CreatePostRequest {
  content: string;
  topic?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CreateReplyRequest {
  content: string;
  parentReplyId?: string;
}

export interface AuthRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface TipRequest {
  amount: number;
}

// JWT payload
export interface JwtPayload {
  walletAddress: string;
  iat: number;
  exp: number;
}