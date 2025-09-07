import { useEffect, useState } from 'react';
import { walletAvatarService } from '../services/walletAvatarService';
import { NFTAvatar } from '../types/theme';

interface WalletAvatarResult {
  avatar?: string;
  nftAvatar?: NFTAvatar;
  isLoading: boolean;
}

/**
 * Hook to get avatar data for any wallet address
 * Automatically updates when avatar changes
 */
export function useWalletAvatar(walletAddress: string | null): WalletAvatarResult {
  const [avatar, setAvatar] = useState<string | undefined>();
  const [nftAvatar, setNftAvatar] = useState<NFTAvatar | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!walletAddress) {
      setAvatar(undefined);
      setNftAvatar(undefined);
      setIsLoading(false);
      return;
    }
    
    let mounted = true;
    
    // Fetch avatar data
    const loadAvatar = async () => {
      setIsLoading(true);
      const data = await walletAvatarService.getWalletAvatar(walletAddress);
      
      if (mounted) {
        setAvatar(data?.avatar);
        setNftAvatar(data?.nftAvatar);
        setIsLoading(false);
      }
    };
    
    loadAvatar();
    
    // Subscribe to updates
    const unsubscribe = walletAvatarService.subscribe((updatedWallet) => {
      if (updatedWallet === walletAddress && mounted) {
        loadAvatar();
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [walletAddress]);
  
  return { avatar, nftAvatar, isLoading };
}