import { api } from './client';
import type { Post } from './types';

/**
 * Search.
 *
 * The parameter is `query`, not `q` — an unrecognised parameter is ignored
 * rather than rejected, so `?q=` silently returns unfiltered results.
 *
 * GET /api/search returns posts AND users in one response, so a combined
 * screen needs only this one call.
 */

export interface SearchUser {
  walletAddress: string;
  username: string | null;
  snsUsername: string | null;
  displayName: string | null;
  bio: string | null;
  nftAvatar: string | null;
  themeColor: string | null;
  tier: string | null;
  genesisVerified?: boolean;
  reputationScore: number | null;
  followerCount: number | null;
  followingCount: number | null;
  createdAt: string | null;
  snsDomain?: string | null;
  postCount?: number;
  replyCount?: number;
}

export const searchAPI = {
  search: (query: string, limit = 20) => {
    const q = new URLSearchParams({ query, limit: String(limit) });
    return api.get<{
      success: boolean;
      posts: Post[];
      users: SearchUser[];
      totalPosts?: number;
      hasMore?: boolean;
    }>(`/api/search?${q.toString()}`);
  },
};
