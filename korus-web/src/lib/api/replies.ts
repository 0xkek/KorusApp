import { api } from './client';

export interface Reply {
  id: string;
  postId: string;
  authorWallet: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  parentReplyId?: string;
  imageUrl?: string;
  videoUrl?: string;
  isHidden: boolean;
  author: {
    walletAddress: string;
    tier: string;
    genesisVerified: boolean;
    snsUsername?: string;
    username?: string;
    nftAvatar?: string;
    subscriptionStatus?: string;
  };
  childReplies?: Reply[];
  _count?: {
    childReplies: number;
  };
}

export interface CreateReplyRequest {
  content: string;
  parentReplyId?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CreateReplyResponse {
  success: boolean;
  reply: Reply;
}

export interface GetRepliesResponse {
  success: boolean;
  replies: Reply[];
  meta: {
    resultCount: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  pagination: {
    limit: number;
    cursor?: string;
    hasMore: boolean;
  };
}

export interface LikeReplyResponse {
  success: boolean;
  liked: boolean;
  message: string;
}

export interface UserReply extends Reply {
  post?: {
    id: string;
    content: string;
    authorWallet: string;
    author?: {
      username?: string;
      snsUsername?: string;
    };
  };
}

export interface GetUserRepliesResponse {
  success: boolean;
  replies: UserReply[];
  meta: {
    resultCount: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export const repliesAPI = {
  /**
   * Create a reply to a post
   */
  async createReply(postId: string, data: CreateReplyRequest, token: string): Promise<CreateReplyResponse> {
    return api.post(`/api/posts/${postId}/replies`, data, token);
  },

  /**
   * Get all replies for a post
   */
  async getReplies(postId: string, cursor?: string): Promise<GetRepliesResponse> {
    const params = cursor ? `?cursor=${cursor}` : '';
    return api.get(`/api/posts/${postId}/replies${params}`);
  },

  /**
   * Like or unlike a reply
   */
  async likeReply(replyId: string, token: string): Promise<LikeReplyResponse> {
    return api.post(`/api/replies/${replyId}/like`, {}, token);
  },

  /**
   * Get all replies by a specific user
   */
  async getUserReplies(walletAddress: string, params?: {
    limit?: number;
  }): Promise<GetUserRepliesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return api.get(`/api/replies/user/${walletAddress}${query ? `?${query}` : ''}`);
  }
};
