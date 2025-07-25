// API response types for frontend

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  posts: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    walletAddress: string;
    tier: 'standard' | 'premium';
    genesisVerified: boolean;
    allyBalance: string;
    createdAt: string;
  };
}

export interface InteractionResponse {
  success: boolean;
  liked: boolean;
  likeCount?: number;
}

export interface TipResponse {
  success: boolean;
  newBalance: string;
  tipAmount: string;
}

export interface CreatePostRequest {
  content: string;
  topic?: string;
  subtopic?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CreateReplyRequest {
  content: string;
  parentReplyId?: string;
}

export interface UserInteractionsResponse {
  success: boolean;
  interactions: {
    [postId: string]: {
      liked: boolean;
      tipped: boolean;
      tipAmount?: string;
    };
  };
}