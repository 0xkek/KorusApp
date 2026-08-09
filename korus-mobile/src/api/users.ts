import { api } from './client';
import type { UserProfile } from './types';

export const usersAPI = {
  /**
   * Public profile — no auth required.
   *
   * Note this endpoint returns `nftAvatar` as the raw NFT *mint address*,
   * whereas the posts endpoints return it already resolved to an image URL.
   * Verified against production. Never pass this value straight to <Image>;
   * see resolveAvatarUrl in ./types.
   */
  getUserByWallet: (wallet: string) =>
    api.get<{ user: UserProfile }>(`/api/user/by-wallet/${wallet}`),
};
