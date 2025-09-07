import { NFTAvatar } from '../types/theme';
import { logger } from '../utils/logger';
import * as SecureStore from 'expo-secure-store';

interface WalletAvatarData {
  avatar?: string;  // Emoji avatar
  nftAvatar?: NFTAvatar;  // NFT avatar
  timestamp: number;
  loading?: boolean;
}

class WalletAvatarService {
  private avatarCache: Map<string, WalletAvatarData> = new Map();
  private subscribers: Set<(wallet: string) => void> = new Set();
  private CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  
  /**
   * Get avatar data for a wallet (emoji or NFT)
   * This fetches from backend/cache and returns current avatar
   */
  async getWalletAvatar(walletAddress: string): Promise<WalletAvatarData | null> {
    if (!walletAddress) return null;
    
    // Check cache first
    const cached = this.avatarCache.get(walletAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }
    
    // If already loading, return current state
    if (cached?.loading) {
      return cached;
    }
    
    // Mark as loading
    this.avatarCache.set(walletAddress, { 
      ...cached, 
      loading: true, 
      timestamp: Date.now() 
    });
    
    try {
      // For the current user, get their selected avatar from SecureStore
      // For other users, we don't have their avatar data (would need backend support)
      const storedWallet = await SecureStore.getItemAsync('korus_wallet_address');
      
      let avatarData: WalletAvatarData;
      
      if (storedWallet === walletAddress) {
        // This is the current user - get their selected avatars
        const storedAvatar = await SecureStore.getItemAsync('korus_user_avatar');
        const storedNFTAvatar = await SecureStore.getItemAsync('korus_user_nft_avatar');
        
        avatarData = {
          avatar: storedAvatar || undefined,
          nftAvatar: storedNFTAvatar ? JSON.parse(storedNFTAvatar) : undefined,
          timestamp: Date.now()
        };
      } else {
        // For other wallets, we don't have stored avatar data
        // In a real app, this would come from the backend
        avatarData = {
          timestamp: Date.now()
        };
      }
      
      this.avatarCache.set(walletAddress, avatarData);
      this.notifySubscribers(walletAddress);
      
      return avatarData;
    } catch (error) {
      logger.error('Failed to fetch wallet avatar:', error);
      
      // Cache empty result to prevent repeated failures
      const emptyData: WalletAvatarData = {
        timestamp: Date.now()
      };
      this.avatarCache.set(walletAddress, emptyData);
      
      return emptyData;
    }
  }
  
  /**
   * Set avatar data for a wallet (when user updates their avatar)
   */
  setWalletAvatar(walletAddress: string, avatar?: string, nftAvatar?: NFTAvatar) {
    const avatarData: WalletAvatarData = {
      avatar,
      nftAvatar,
      timestamp: Date.now()
    };
    
    this.avatarCache.set(walletAddress, avatarData);
    this.notifySubscribers(walletAddress);
  }
  
  /**
   * Clear cache for a specific wallet or all wallets
   */
  clearCache(walletAddress?: string) {
    if (walletAddress) {
      this.avatarCache.delete(walletAddress);
    } else {
      this.avatarCache.clear();
    }
  }
  
  /**
   * Subscribe to avatar updates for real-time updates
   */
  subscribe(callback: (wallet: string) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  private notifySubscribers(walletAddress: string) {
    this.subscribers.forEach(callback => callback(walletAddress));
  }
  
  /**
   * Preload avatars for multiple wallets (useful for feed loading)
   */
  async preloadAvatars(walletAddresses: string[]) {
    const uniqueWallets = [...new Set(walletAddresses)];
    await Promise.all(
      uniqueWallets.map(wallet => this.getWalletAvatar(wallet))
    );
  }
}

// Singleton instance
export const walletAvatarService = new WalletAvatarService();