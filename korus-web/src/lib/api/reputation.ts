/**
 * Reputation API Service
 * Handles all reputation-related API calls
 */

import { api } from './client';

// --- Response types ---

export interface ReputationTier {
  name: string;
  min: number;
  max: number;
}

export interface RepEvent {
  id: string;
  userWallet: string;
  eventType: string;
  points: number;
  category: string;
  createdAt: string;
}

export interface ReputationData {
  walletAddress: string;
  reputationScore: number;
  contentScore: number;
  engagementScore: number;
  communityScore: number;
  loyaltyScore: number;
  tier: ReputationTier;
  genesisVerified: boolean;
  loginStreak: number;
  createdAt: string;
  recentEvents: RepEvent[];
}

export interface ReputationResponse {
  success: boolean;
  reputation: ReputationData;
}

export interface LeaderboardEntry {
  walletAddress: string;
  username?: string | null;
  reputationScore: number;
  tier?: string;
  genesisVerified?: boolean;
}

export interface LeaderboardResponse {
  success: boolean;
  timeframe: string;
  leaderboard: LeaderboardEntry[];
}

export interface DailyLoginResponse {
  success: boolean;
  loginStreak: number;
  reputationScore: number;
}

// --- API methods ---

export const reputationAPI = {
  /**
   * Get reputation data for a specific wallet address
   */
  async getReputation(walletAddress: string, token?: string): Promise<ReputationResponse> {
    return api.get<ReputationResponse>(`/api/reputation/users/${walletAddress}`, token);
  },

  /**
   * Get the reputation leaderboard
   */
  async getLeaderboard(params?: {
    limit?: number;
    timeframe?: 'all' | 'daily';
  }, token?: string): Promise<LeaderboardResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.timeframe) searchParams.set('timeframe', params.timeframe);

    const query = searchParams.toString();
    return api.get<LeaderboardResponse>(`/api/reputation/leaderboard${query ? `?${query}` : ''}`, token);
  },

  /**
   * Record a daily login (awards streak reputation points)
   */
  async recordDailyLogin(token: string): Promise<DailyLoginResponse> {
    return api.post<DailyLoginResponse>('/api/reputation/daily-login', undefined, token);
  },
};
