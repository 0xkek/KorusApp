/**
 * Users API Service
 * Handles all user-related API calls
 */

import { api } from './client';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  hasSetUsername?: boolean;
  snsUsername?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  nftAvatar?: string;
  themeColor?: string;
  tier?: string;
  reputationScore?: number;
  createdAt?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  themeColor?: string;
  nftAvatar?: string;
  snsUsername?: string;
}

export interface SetUsernameData {
  username: string;
}

export interface CheckUsernameResponse {
  available: boolean;
  username: string;
  error?: string;
}

export const usersAPI = {
  /**
   * Get current user's profile
   */
  async getProfile(token: string): Promise<{ user: UserProfile }> {
    return api.get<{ user: UserProfile }>('/api/auth/profile', token);
  },

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<{ user: UserProfile }> {
    return api.get<{ user: UserProfile }>(`/api/user/by-username/${username}`);
  },

  /**
   * Set or update username
   */
  async setUsername(data: SetUsernameData, token: string): Promise<{ success: boolean; username: string; message: string }> {
    return api.post<{ success: boolean; username: string; message: string }>('/api/user/username', data, token);
  },

  /**
   * Check if username is available
   */
  async checkUsername(username: string): Promise<CheckUsernameResponse> {
    const params = new URLSearchParams({ username });
    return api.get<CheckUsernameResponse>(`/api/user/check-username?${params.toString()}`);
  },

  /**
   * Update user profile
   * Note: This endpoint doesn't exist in the backend yet, but we're adding it for future use
   */
  async updateProfile(data: UpdateProfileData, token: string): Promise<{ success: boolean; user: UserProfile }> {
    return api.put<{ success: boolean; user: UserProfile }>('/api/user/profile', data, token);
  },
};
