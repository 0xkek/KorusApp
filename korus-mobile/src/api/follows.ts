import { api } from './client';
import type { ListUser } from '../components/UserRow';

/**
 * A user in a follow list. Matches authorSelect in the backend's
 * followController — a deliberate allowlist, so no private fields here.
 */
export interface FollowUser extends ListUser {
  followerCount: number | null;
  followingCount: number | null;
}

/** `count` is the TOTAL, not the length of this page. */
interface FollowersResponse {
  success: boolean;
  followers: FollowUser[];
  count: number;
  hasMore?: boolean;
}

interface FollowingResponse {
  success: boolean;
  following: FollowUser[];
  count: number;
  hasMore?: boolean;
}

export const followsAPI = {
  /**
   * Follow/unfollow toggle — one POST does both. `following` in the response
   * is the resulting state, so use it rather than inverting locally.
   */
  toggleFollow: (wallet: string, token: string) =>
    api.post<{ success: boolean; following: boolean }>(
      `/api/follows/${wallet}/toggle`,
      {},
      token
    ),

  /** Whether the signed-in user follows each of these wallets. */
  checkFollowing: (wallets: string[], token: string) =>
    api.post<{ success: boolean; following: Record<string, boolean> }>(
      '/api/follows/check',
      { wallets },
      token
    ),

  /** Who follows this wallet. Public — no token needed. */
  getFollowers: (wallet: string, params: { limit?: number; offset?: number } = {}) =>
    api.get<FollowersResponse>(
      `/api/follows/${wallet}/followers?limit=${params.limit ?? 30}&offset=${params.offset ?? 0}`
    ),

  /** Who this wallet follows. Public — no token needed. */
  getFollowing: (wallet: string, params: { limit?: number; offset?: number } = {}) =>
    api.get<FollowingResponse>(
      `/api/follows/${wallet}/following?limit=${params.limit ?? 30}&offset=${params.offset ?? 0}`
    ),
};
