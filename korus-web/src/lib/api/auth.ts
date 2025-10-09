/**
 * Authentication API Service
 * Handles wallet authentication and user session management
 */

import { api } from './client';

export interface AuthResponse {
  token: string;
  user: {
    walletAddress: string;
    username?: string;
    displayName?: string;
    nftAvatar?: string;
  };
}

export interface WalletAuthData {
  walletAddress: string;
  signature: string;
  message: string;
}

export const authAPI = {
  /**
   * Authenticate with wallet signature
   */
  async loginWithWallet(data: WalletAuthData): Promise<AuthResponse> {
    return api.post<AuthResponse>('/api/auth/connect', data);
  },

  /**
   * Get current user profile
   */
  async getProfile(token: string): Promise<AuthResponse['user']> {
    return api.get<AuthResponse['user']>('/api/auth/profile', token);
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<AuthResponse['user']>, token: string): Promise<AuthResponse['user']> {
    return api.put<AuthResponse['user']>('/api/auth/profile', data, token);
  },
};
