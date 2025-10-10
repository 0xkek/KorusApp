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

export const interactionsAPI = {
  /**
   * Like or unlike a post
   */
  async likePost(postId: string, token: string): Promise<LikeResponse> {
    return api.post(`/interactions/posts/${postId}/like`, {}, token);
  },

  /**
   * Tip a post with SOL
   */
  async tipPost(postId: string, amount: number, transactionSignature: string, token: string): Promise<TipResponse> {
    return api.post(`/interactions/posts/${postId}/tip`, {
      amount,
      transactionSignature
    }, token);
  },

  /**
   * Get all interactions for a post
   */
  async getPostInteractions(postId: string): Promise<PostInteractionsResponse> {
    return api.get(`/interactions/posts/${postId}`);
  },

  /**
   * Get user's interactions for multiple posts (batch request)
   */
  async getUserInteractions(postIds: string[], token: string): Promise<UserInteractionsResponse> {
    return api.post('/interactions/user', { postIds }, token);
  }
};
