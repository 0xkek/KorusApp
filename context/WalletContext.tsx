import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { generateWalletAddress } from '../utils/wallet';
import { getFavoriteSNSDomain, fetchSNSDomains, SNSDomain } from '../utils/sns';
import { NFTAvatar } from '../types/theme';
import { logger } from '../utils/logger';
import { withErrorHandling, handleError } from '../utils/errorHandler';
import { authAPI } from '../utils/api';

interface WalletContextType {
  walletAddress: string | null;
  balance: number;
  isLoading: boolean;
  hasWallet: boolean;
  selectedAvatar: string | null;
  selectedNFTAvatar: NFTAvatar | null;
  snsDomain: string | null;
  allSNSDomains: SNSDomain[];
  isPremium: boolean;
  timeFunUsername: string | null;
  createNewWallet: () => Promise<void>;
  importFromSeedVault: () => Promise<boolean>;
  getPrivateKey: () => Promise<string | null>;
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number) => void;
  setSelectedAvatar: (avatar: string) => void;
  setSelectedNFTAvatar: (nft: NFTAvatar | null) => void;
  refreshSNSDomain: () => Promise<void>;
  setFavoriteSNSDomain: (domain: string) => Promise<void>;
  setPremiumStatus: (status: boolean) => void;
  setTimeFunUsername: (username: string | null) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

const WALLET_KEY = 'korus_wallet_private_key';
const WALLET_ADDRESS_KEY = 'korus_wallet_address';
const AVATAR_KEY = 'korus_user_avatar';
const NFT_AVATAR_KEY = 'korus_user_nft_avatar';
const FAVORITE_SNS_KEY = 'korus_favorite_sns_domain';
const PREMIUM_STATUS_KEY = 'korus_premium_status';
const TIMEFUN_USERNAME_KEY = 'korus_timefun_username';
const OFFLINE_MODE_KEY = 'korus_offline_mode';

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [selectedAvatar, setSelectedAvatarState] = useState<string | null>(null);
  const [selectedNFTAvatar, setSelectedNFTAvatarState] = useState<NFTAvatar | null>(null);
  const [snsDomain, setSnsDomain] = useState<string | null>(null);
  const [allSNSDomains, setAllSNSDomains] = useState<SNSDomain[]>([]);
  const [timeFunUsername, setTimeFunUsernameState] = useState<string | null>(null);

  // Check for existing wallet on mount
  useEffect(() => {
    checkExistingWallet();
  }, []);

  const checkExistingWallet = async () => {
    await withErrorHandling(async () => {
      setIsLoading(true);
      
      // First check if user has a stored wallet
      const storedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
      const storedAvatar = await SecureStore.getItemAsync(AVATAR_KEY);
      const storedNFTAvatar = await SecureStore.getItemAsync(NFT_AVATAR_KEY);
      const storedFavoriteSNS = await SecureStore.getItemAsync(FAVORITE_SNS_KEY);
      const storedPremiumStatus = await SecureStore.getItemAsync(PREMIUM_STATUS_KEY);
      const storedTimeFunUsername = await SecureStore.getItemAsync(TIMEFUN_USERNAME_KEY);
      
      if (storedAddress) {
        // OFFLINE MODE - Skip API calls
        logger.log('Loading wallet in offline mode');
        
        setWalletAddress(storedAddress);
        setHasWallet(true);
        setBalance(5000);
        
        // Mock premium status for offline mode
        const isPremiumUser = true; // Always premium in offline mode for testing
        setIsPremium(isPremiumUser);
        
        // Mock SNS domains for offline mode
        const mockDomains: SNSDomain[] = [
          { domain: 'korususer.sol', favorite: true },
          { domain: 'coolname.sol', favorite: false },
          { domain: 'web3master.sol', favorite: false }
        ];
        setAllSNSDomains(mockDomains);
        
        if (isPremiumUser) {
          const favoriteDomain = storedFavoriteSNS || 'korususer.sol';
          setSnsDomain(favoriteDomain);
        }
      }
      
      if (storedAvatar) {
        setSelectedAvatarState(storedAvatar);
      }
      
      if (storedNFTAvatar) {
        try {
          setSelectedNFTAvatarState(JSON.parse(storedNFTAvatar));
        } catch (error) {
          logger.error('Error parsing NFT avatar:', error);
        }
      }
      
      if (storedTimeFunUsername) {
        setTimeFunUsernameState(storedTimeFunUsername);
      }
      
      // TODO: Check for Seed Vault wallet
      // This would involve checking if user has Seed Vault app installed
      // and requesting access to their wallet
    }, 'checkExistingWallet', {
      onError: () => setIsLoading(false)
    });
    
    setIsLoading(false);
  };

  const createNewWallet = async () => {
    await withErrorHandling(async () => {
      setIsLoading(true);
      
      // For now, use a mock wallet to test the app
      // TODO: Replace with real Solana keypair generation
      const mockPublicKey = generateWalletAddress();
      const mockSecretKey = 'mock-secret-key-' + Date.now();
      
      // Create a mock signature for authentication
      const mockMessage = `Sign this message to authenticate with Korus\nTimestamp: ${Date.now()}`;
      const mockSignature = 'mock-signature-' + Date.now();
      
      // Authenticate with backend
      logger.log('Creating wallet and authenticating with backend');
      
      try {
        // Import the auth API
        const { authAPI } = await import('../utils/api');
        
        // Authenticate with backend
        const authResult = await authAPI.connectWallet(mockPublicKey, mockSignature, mockMessage);
        logger.log('Authentication successful:', authResult);
        
        // Store wallet info
        await SecureStore.setItemAsync(WALLET_KEY, mockSecretKey);
        await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, mockPublicKey);
        
        // Update state with backend data
        setWalletAddress(mockPublicKey);
        setHasWallet(true);
        setBalance(authResult.user?.allyBalance || 5000);
        setIsPremium(authResult.user?.tier === 'premium');
      } catch (error) {
        logger.error('Backend authentication failed, using offline mode:', error);
        
        // Fallback to offline mode
        await SecureStore.setItemAsync(WALLET_KEY, mockSecretKey);
        await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, mockPublicKey);
        
        setWalletAddress(mockPublicKey);
        setHasWallet(true);
        setBalance(5000);
        setIsPremium(false);
      }
      
      // Fetch SNS domains
      const domains = await fetchSNSDomains(mockPublicKey);
      setAllSNSDomains(domains);
      
      logger.log('Wallet created successfully (offline mode)');
      
    }, 'createNewWallet', {
      onError: () => setIsLoading(false)
    });
    
    setIsLoading(false);
  };

  const importFromSeedVault = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // TODO: Implement Seed Vault integration
      // This would involve:
      // 1. Check if Seed Vault app is installed
      // 2. Request wallet access via deep link
      // 3. Receive public key from Seed Vault
      // 4. Store the public key (no private key access)
      
      // For now, return false to indicate no Seed Vault found
      return false;
      
    } catch (error) {
      logger.error('Error importing from Seed Vault:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getPrivateKey = async (): Promise<string | null> => {
    try {
      const privateKey = await SecureStore.getItemAsync(WALLET_KEY);
      return privateKey || 'mock-private-key';
    } catch (error) {
      logger.error('Error getting private key:', error);
      return null;
    }
  };

  const refreshBalance = async () => {
    try {
      // TODO: Fetch real balance from Solana blockchain
      // For demo, just update with mock balance
      setBalance(5000); // Reset to high balance for testing
    } catch (error) {
      logger.error('Error refreshing balance:', error);
    }
  };

  const deductBalance = (amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  };

  const refreshSNSDomain = async () => {
    if (!walletAddress) return;
    
    try {
      const domains = await fetchSNSDomains(walletAddress);
      setAllSNSDomains(domains);
      const domain = await getFavoriteSNSDomain(walletAddress);
      setSnsDomain(domain);
    } catch (error) {
      logger.error('Error refreshing SNS domain:', error);
    }
  };

  const setFavoriteSNSDomain = async (domain: string) => {
    try {
      // Only allow premium users to set SNS domains
      if (!isPremium) {
        logger.warn('Premium subscription required to set SNS domain as display name');
        return;
      }
      
      await SecureStore.setItemAsync(FAVORITE_SNS_KEY, domain);
      setSnsDomain(domain);
      
      // Update the favorite flag in allSNSDomains
      setAllSNSDomains(prevDomains => 
        prevDomains.map(d => ({
          ...d,
          favorite: d.domain === domain
        }))
      );
    } catch (error) {
      logger.error('Error setting favorite SNS domain:', error);
    }
  };

  const setSelectedAvatar = async (avatar: string) => {
    try {
      await SecureStore.setItemAsync(AVATAR_KEY, avatar);
      setSelectedAvatarState(avatar);
      // Clear NFT avatar when emoji is selected
      await SecureStore.deleteItemAsync(NFT_AVATAR_KEY);
      setSelectedNFTAvatarState(null);
    } catch (error) {
      logger.error('Error saving avatar:', error);
    }
  };

  const setSelectedNFTAvatar = async (nft: NFTAvatar | null) => {
    try {
      if (nft) {
        await SecureStore.setItemAsync(NFT_AVATAR_KEY, JSON.stringify(nft));
        setSelectedNFTAvatarState(nft);
        // Clear emoji avatar when NFT is selected
        await SecureStore.deleteItemAsync(AVATAR_KEY);
        setSelectedAvatarState(null);
      } else {
        await SecureStore.deleteItemAsync(NFT_AVATAR_KEY);
        setSelectedNFTAvatarState(null);
      }
    } catch (error) {
      logger.error('Error saving NFT avatar:', error);
    }
  };

  const setPremiumStatus = async (status: boolean) => {
    try {
      setIsPremium(status);
      await SecureStore.setItemAsync(PREMIUM_STATUS_KEY, status.toString());
      
      // If premium is disabled, clear SNS domain
      if (!status) {
        await SecureStore.deleteItemAsync(FAVORITE_SNS_KEY);
        setSnsDomain(null);
      }
    } catch (error) {
      logger.error('Error saving premium status:', error);
    }
  };

  const setTimeFunUsername = async (username: string | null) => {
    try {
      setTimeFunUsernameState(username);
      if (username) {
        await SecureStore.setItemAsync(TIMEFUN_USERNAME_KEY, username);
      } else {
        await SecureStore.deleteItemAsync(TIMEFUN_USERNAME_KEY);
      }
    } catch (error) {
      logger.error('Error saving time.fun username:', error);
    }
  };

  const contextValue = useMemo(
    () => ({
      walletAddress,
      balance,
      isLoading,
      hasWallet,
      selectedAvatar,
      selectedNFTAvatar,
      snsDomain,
      allSNSDomains,
      isPremium,
      timeFunUsername,
      createNewWallet,
      importFromSeedVault,
      getPrivateKey,
      refreshBalance,
      deductBalance,
      setSelectedAvatar,
      setSelectedNFTAvatar,
      refreshSNSDomain,
      setFavoriteSNSDomain,
      setPremiumStatus,
      setTimeFunUsername,
    }),
    [
      walletAddress,
      balance,
      isLoading,
      hasWallet,
      selectedAvatar,
      selectedNFTAvatar,
      snsDomain,
      allSNSDomains,
      isPremium,
      timeFunUsername,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};