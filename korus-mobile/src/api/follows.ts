import { api } from './client';

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
};
