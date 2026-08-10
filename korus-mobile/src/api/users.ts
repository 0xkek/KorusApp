import { api } from './client';
import type { UserProfile } from './types';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  themeColor?: string;
  themeMode?: string;
  nftAvatar?: string;
  snsUsername?: string | null;
}

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

  /** The signed-in user's own profile, including fields the public view omits. */
  getMyProfile: (token: string) =>
    api.get<{ user: UserProfile & { hasSetUsername?: boolean } }>('/api/auth/profile', token),

  /**
   * Backend applies `value || undefined` per field, so empty strings are
   * ignored rather than clearing a field — values can be set and changed but
   * not blanked. Only snsUsername accepts an explicit null.
   */
  updateProfile: (data: UpdateProfileData, token: string) =>
    api.put<{ success: boolean; user: UserProfile }>('/api/user/profile', data, token),

  /**
   * Username is separate from the rest of the profile and is far stricter:
   * 3-20 alphanumeric characters, and free accounts may set it exactly ONCE
   * (premium can change it freely). Warn before calling this.
   */
  setUsername: (username: string, token: string) =>
    api.post<{ success: boolean; username: string; message: string }>(
      '/api/user/username',
      { username },
      token
    ),

  checkUsername: (username: string) =>
    api.get<{ available: boolean; username: string; error?: string }>(
      `/api/user/check-username?username=${encodeURIComponent(username)}`
    ),
};

/** Mirrors the backend's validateUsername so we fail fast without a round trip. */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 20) return 'Username cannot exceed 20 characters';
  if (!/^[a-zA-Z0-9]{3,20}$/.test(trimmed)) return 'Letters and numbers only';
  return null;
}
