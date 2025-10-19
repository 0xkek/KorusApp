import { api } from './client';

export interface LikeResponse {
  success: boolean;
  liked: boolean;
  message: string;
}

export interface TipResponse {
  success: boolean;
  message: string;
  amount: number;
  transactionSignature: string;
}

export interface PostInteractions {
  likes: Array<{
    userWallet: string;
    createdAt: string;
  }>;
  tips: Array<{
    userWallet: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface InteractionsSummary {
  totalLikes: number;
  totalTips: number;
  totalTipAmount: number;
}

export interface PostInteractionsResponse {
  success: boolean;
  interactions: PostInteractions;
  summary: InteractionsSummary;
}

export interface UserInteractionsResponse {
  success: boolean;
  interactions: Record<string, {
    liked: boolean;
    tipped: boolean;
  }>;
}

export interface RepostResponse {
  success: boolean;
  reposted: boolean;
  message: string;
  repostPost?: unknown; // Full repost post object with original post data
}

export interface UserRepostsResponse {
  success: boolean;
  reposts: Record<string, boolean>;
}

export const interactionsAPI = {
  /**
   * Like or unlike a post
   */
  async likePost(postId: string, token: string): Promise<LikeResponse> {
    return api.post(`/api/interactions/posts/${postId}/like`, {}, token);
  },

  /**
   * Repost or unrepost a post
   */
  async repostPost(postId: string, token: string, comment?: string): Promise<RepostResponse> {
    return api.post(`/api/interactions/posts/${postId}/repost`, comment ? { comment } : {}, token);
  },

  /**
   * Tip a post with SOL
   */
  async tipPost(postId: string, amount: number, transactionSignature: string, token: string): Promise<TipResponse> {
    return api.post(`/api/interactions/posts/${postId}/tip`, {
      amount,
      transactionSignature
    }, token);
  },

  /**
   * Get all interactions for a post
   */
  async getPostInteractions(postId: string): Promise<PostInteractionsResponse> {
    return api.get(`/api/interactions/posts/${postId}`);
  },

  /**
   * Get user's interactions for multiple posts (batch request)
   */
  async getUserInteractions(postIds: string[], token: string): Promise<UserInteractionsResponse> {
    return api.post('/api/interactions/user', { postIds }, token);
  },

  /**
   * Get user's reposts for multiple posts (batch request)
   */
  async getUserReposts(postIds: string[], token: string): Promise<UserRepostsResponse> {
    return api.post('/api/interactions/user/reposts', { postIds }, token);
  }
};
