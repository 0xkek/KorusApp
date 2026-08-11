/**
 * Follows API Service
 */

import { api } from './client';

export interface FollowUser {
  walletAddress: string;
  username?: string;
  snsUsername?: string;
  nftAvatar?: string;
  tier?: string;
  themeColor?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
}

export const followsAPI = {
  async toggleFollow(wallet: string, token: string): Promise<{ success: boolean; following: boolean }> {
    return api.post(`/api/follows/${wallet}/toggle`, {}, token);
  },

  /** `count` is the total, not the length of this page. */
  async getFollowers(
    wallet: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ success: boolean; followers: FollowUser[]; count: number; hasMore?: boolean }> {
    const { limit = 30, offset = 0 } = params;
    return api.get(`/api/follows/${wallet}/followers?limit=${limit}&offset=${offset}`);
  },

  async getFollowing(
    wallet: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ success: boolean; following: FollowUser[]; count: number; hasMore?: boolean }> {
    const { limit = 30, offset = 0 } = params;
    return api.get(`/api/follows/${wallet}/following?limit=${limit}&offset=${offset}`);
  },

  async checkFollowing(wallets: string[], token: string): Promise<{ success: boolean; following: Record<string, boolean> }> {
    return api.post('/api/follows/check', { wallets }, token);
  },

  /**
   * Accounts to follow, ranked by reputation. Excludes accounts the caller
   * already follows when a token is supplied.
   */
  async getSuggested(token?: string, limit = 10): Promise<{ success: boolean; users: FollowUser[] }> {
    return api.get(`/api/follows/suggested?limit=${limit}`, token);
  },

  async getFollowingFeed(token: string, params?: { limit?: number; cursor?: string }): Promise<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts: any[];
    pagination: { hasMore: boolean; cursor: string | null };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return api.get(`/api/follows/feed${query ? `?${query}` : ''}`, token);
  },
};
