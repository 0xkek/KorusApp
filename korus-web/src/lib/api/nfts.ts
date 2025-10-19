/**
 * NFTs API Service
 * Handles all NFT-related API calls
 */

import { api } from './client';

export interface NFT {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  mint: string;
  updateAuthority?: string;
  collection?: {
    name: string;
    family?: string;
  };
}

export interface NFTsResponse {
  nfts: NFT[];
  count: number;
}

export const nftsAPI = {
  /**
   * Get all NFTs for a wallet address
   */
  async getNFTsForWallet(walletAddress: string): Promise<NFTsResponse> {
    return api.get<NFTsResponse>(`/api/nfts/wallet/${walletAddress}`);
  },

  /**
   * Get specific NFT by mint address
   */
  async getNFT(mintAddress: string): Promise<{ nft: NFT }> {
    return api.get<{ nft: NFT }>(`/api/nfts/mint/${mintAddress}`);
  },

  /**
   * Get specific NFT by mint address (alias for getNFT)
   */
  async getNFTByMint(mintAddress: string): Promise<NFT | null> {
    try {
      const response = await api.get<{ nft: NFT }>(`/api/nfts/mint/${mintAddress}`);
      return response.nft;
    } catch (error) {
      return null;
    }
  },

  /**
   * Health check for NFT service
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return api.get<{ status: string; message: string }>('/api/nfts/health');
  },
};
