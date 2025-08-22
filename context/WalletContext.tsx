import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getFavoriteSNSDomain, fetchSNSDomains, SNSDomain } from '../utils/sns';
import { NFTAvatar } from '../types/theme';
import { logger } from '../utils/logger';
import { withErrorHandling, handleError } from '../utils/errorHandler';
import { authAPI } from '../utils/api';
import { 
  WalletProvider as WalletProviderInterface, 
  getAvailableWallets, 
  createAuthMessage 
} from '../utils/walletConnectors';

interface WalletContextType {
  walletAddress: string | null;
  balance: number;
  solBalance: number;
  isLoading: boolean;
  isConnected: boolean;
  selectedAvatar: string | null;
  selectedNFTAvatar: NFTAvatar | null;
  snsDomain: string | null;
  allSNSDomains: SNSDomain[];
  isPremium: boolean;
  timeFunUsername: string | null;
  currentProvider: WalletProviderInterface | null;
  availableWallets: WalletProviderInterface[];
  
  // Wallet connection methods
  connectWallet: (provider: WalletProviderInterface) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  logout: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  
  // App-specific methods
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number) => void;
  setSelectedAvatar: (avatar: string | null) => void;
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

// Storage keys
const WALLET_ADDRESS_KEY = 'korus_wallet_address';
const WALLET_PROVIDER_KEY = 'korus_wallet_provider';
const AUTH_TOKEN_KEY = 'korus_auth_token';
const AVATAR_KEY = 'korus_user_avatar';
const NFT_AVATAR_KEY = 'korus_user_nft_avatar';
const FAVORITE_SNS_KEY = 'korus_favorite_sns_domain';
const PREMIUM_STATUS_KEY = 'korus_premium_status';
const TIMEFUN_USERNAME_KEY = 'korus_timefun_username';

// Solana connection
const SOLANA_NETWORK = process.env.EXPO_PUBLIC_SOLANA_NETWORK || 'devnet';
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK as any), 'confirmed');

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [solBalance, setSolBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedAvatar, setSelectedAvatarState] = useState<string | null>(null);
  const [selectedNFTAvatar, setSelectedNFTAvatarState] = useState<NFTAvatar | null>(null);
  const [snsDomain, setSnsDomain] = useState<string | null>(null);
  const [allSNSDomains, setAllSNSDomains] = useState<SNSDomain[]>([]);
  const [timeFunUsername, setTimeFunUsernameState] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<WalletProviderInterface | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletProviderInterface[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    logger.log('WalletProvider mounted - checking existing session');
    checkExistingSession();
    loadAvailableWallets();
  }, []);

  const loadAvailableWallets = async () => {
    const wallets = await getAvailableWallets();
    setAvailableWallets(wallets);
  };

  const checkExistingSession = async () => {
    await withErrorHandling(async () => {
      setIsLoading(true);
      
      logger.log('checkExistingSession - Starting...');
      
      // Check for stored session
      const storedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const storedProvider = await SecureStore.getItemAsync(WALLET_PROVIDER_KEY);
      
      logger.log('checkExistingSession - Found stored values:', {
        hasAddress: !!storedAddress,
        hasToken: !!storedToken,
        hasProvider: !!storedProvider
      });
      
      if (storedAddress && storedToken) {
        // Verify token is still valid
        try {
          const profile = await authAPI.getProfile();
          
          if (profile.user?.walletAddress === storedAddress) {
            // Session is valid
            logger.log('checkExistingSession - Session is valid, loading preferences...');
            setWalletAddress(storedAddress);
            setIsConnected(true);
            setBalance(parseFloat(profile.user.allyBalance || '0'));
            setIsPremium(profile.user.tier === 'premium');
            
            // Load user preferences
            await loadUserPreferences();
            
            // Update SOL balance
            await updateSolBalance(storedAddress);
            
            // Load SNS domains
            const domains = await fetchSNSDomains(storedAddress);
            setAllSNSDomains(domains);
            
            logger.log('Restored valid session for wallet:', storedAddress);
          } else {
            // Invalid session, clear it
            logger.log('checkExistingSession - Session invalid, clearing...');
            await clearSession();
          }
        } catch (error) {
          logger.error('Session validation failed:', error);
          await clearSession();
        }
      } else {
        logger.log('checkExistingSession - No stored session found');
      }
    }, 'checkExistingSession', {
      onError: () => setIsLoading(false)
    });
    
    setIsLoading(false);
  };

  const connectWallet = async (provider: WalletProviderInterface): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      let publicKey: string;
      let signature: string;
      let authMessage: string;
      
      // On mobile, ALL wallets must use MWA
      if (Platform.OS !== 'web') {
        logger.log(`Using MWA flow for ${provider.name} on mobile...`);
        authMessage = createAuthMessage();
        
        // Use the combined connect and sign flow
        const { connectAndSignWithMWA } = await import('../utils/walletConnectors');
        const result = await connectAndSignWithMWA(authMessage);
        publicKey = result.address;
        signature = result.signature;
        
        logger.log('MWA flow completed, address:', publicKey);
      } else {
        // Web browser flow
        logger.log(`Connecting to ${provider.name} wallet on web...`);
        publicKey = await provider.connect();
        logger.log('Connected wallet address:', publicKey);
        
        // Create and sign authentication message
        authMessage = createAuthMessage();
        signature = await provider.signMessage(authMessage);
        
        if (!signature) {
          throw new Error('Failed to sign authentication message');
        }
      }
      
      // Authenticate with backend
      logger.log('Authenticating with backend...');
      
      let authResult;
      try {
        authResult = await authAPI.connectWallet(publicKey, signature, authMessage);
      } catch (error: any) {
        // If backend is unavailable, use mock authentication for testing
        if (error.response?.status === 500 || error.code === 'ECONNREFUSED') {
          logger.warn('Backend unavailable, using mock authentication');
          
          // Generate a mock JWT token
          const mockToken = btoa(JSON.stringify({ walletAddress: publicKey, exp: Date.now() + 86400000 }));
          
          authResult = {
            token: mockToken,
            user: {
              walletAddress: publicKey,
              tier: 'standard',
              allyBalance: '5000',
            }
          };
        } else {
          throw error;
        }
      }
      
      if (!authResult.token) {
        throw new Error('Authentication failed');
      }
      
      // Store session
      await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, publicKey);
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, authResult.token);
      await SecureStore.setItemAsync(WALLET_PROVIDER_KEY, provider.name);
      
      // Update state
      setWalletAddress(publicKey);
      setIsConnected(true);
      setCurrentProvider(provider);
      const backendBalance = parseFloat(authResult.user?.allyBalance || '0');
      setBalance(isNaN(backendBalance) ? 0 : backendBalance);
      setIsPremium(authResult.user?.tier === 'premium');
      
      // Load user preferences
      await loadUserPreferences();
      
      // Fetch real SOL balance
      await updateSolBalance(publicKey);
      
      // Fetch SNS domains
      const domains = await fetchSNSDomains(publicKey);
      setAllSNSDomains(domains);
      
      logger.log('Wallet connected successfully');
      setIsLoading(false);
      return true;
      
    } catch (error) {
      logger.error('Error connecting wallet:', error);
      setIsLoading(false);
      return false;
    }
  };

  const disconnectWallet = async () => {
    try {
      logger.log('Disconnecting wallet...');
      
      // Disconnect from current provider
      if (currentProvider) {
        currentProvider.disconnect();
      }
      
      // Clear session
      await clearSession();
      
      // Reset state
      setWalletAddress(null);
      setIsConnected(false);
      setCurrentProvider(null);
      setBalance(0);
      setSolBalance(0);
      setIsPremium(false);
      setSelectedAvatarState(null);
      setSelectedNFTAvatarState(null);
      setSnsDomain(null);
      setAllSNSDomains([]);
      setTimeFunUsernameState(null);
      
      logger.log('Wallet disconnected');
    } catch (error) {
      logger.error('Error during disconnect:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string | null> => {
    try {
      if (!currentProvider || !isConnected) {
        throw new Error('No wallet connected');
      }
      
      const signature = await currentProvider.signMessage(message);
      return signature;
    } catch (error) {
      logger.error('Error signing message:', error);
      return null;
    }
  };

  const clearSession = async () => {
    await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(WALLET_PROVIDER_KEY);
  };

  const loadUserPreferences = async () => {
    logger.log('Loading user preferences - Starting...');
    
    const storedAvatar = await SecureStore.getItemAsync(AVATAR_KEY);
    const storedNFTAvatar = await SecureStore.getItemAsync(NFT_AVATAR_KEY);
    const storedFavoriteSNS = await SecureStore.getItemAsync(FAVORITE_SNS_KEY);
    const storedTimeFunUsername = await SecureStore.getItemAsync(TIMEFUN_USERNAME_KEY);
    
    logger.log('Raw stored values:', {
      avatarKey: AVATAR_KEY,
      nftAvatarKey: NFT_AVATAR_KEY,
      hasAvatar: !!storedAvatar,
      hasNFTAvatar: !!storedNFTAvatar,
      nftAvatarValue: storedNFTAvatar ? storedNFTAvatar.substring(0, 100) + '...' : null,
      nftAvatarLength: storedNFTAvatar?.length
    });
    
    if (storedAvatar) {
      logger.log('Setting regular avatar:', storedAvatar);
      setSelectedAvatarState(storedAvatar);
    }
    
    if (storedNFTAvatar) {
      try {
        logger.log('Attempting to parse NFT avatar JSON...');
        const parsedNFT = JSON.parse(storedNFTAvatar);
        logger.log('Successfully parsed NFT avatar:', {
          id: parsedNFT.id,
          name: parsedNFT.name,
          hasImage: !!parsedNFT.image,
          imageLength: parsedNFT.image?.length
        });
        setSelectedNFTAvatarState(parsedNFT);
      } catch (error) {
        logger.error('Error parsing NFT avatar:', error);
        logger.error('Invalid JSON:', storedNFTAvatar);
      }
    } else {
      logger.log('No NFT avatar found in storage');
    }
    
    if (storedFavoriteSNS && isPremium) {
      setSnsDomain(storedFavoriteSNS);
    }
    
    if (storedTimeFunUsername) {
      setTimeFunUsernameState(storedTimeFunUsername);
    }
    
    logger.log('User preferences loaded - Complete');
  };

  const updateSolBalance = async (address: string) => {
    try {
      const pubkey = new PublicKey(address);
      const lamports = await connection.getBalance(pubkey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setSolBalance(sol);
    } catch (error) {
      logger.error('Error fetching SOL balance:', error);
      setSolBalance(0);
    }
  };

  const refreshBalance = async () => {
    try {
      if (walletAddress) {
        await updateSolBalance(walletAddress);
        
        // Also refresh balance from backend
        const profile = await authAPI.getProfile();
        if (profile.user) {
          setBalance(parseFloat(profile.user.allyBalance || '0'));
        }
      }
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
      if (!isPremium) {
        logger.warn('Premium subscription required to set SNS domain as display name');
        return;
      }
      
      await SecureStore.setItemAsync(FAVORITE_SNS_KEY, domain);
      setSnsDomain(domain);
      
      // Update backend with SNS username
      try {
        await authAPI.updateProfile({ snsUsername: domain });
        logger.log('SNS domain updated in backend');
      } catch (error) {
        logger.error('Failed to update SNS domain in backend:', error);
      }
      
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

  const setSelectedAvatar = async (avatar: string | null) => {
    try {
      if (avatar === null) {
        await SecureStore.deleteItemAsync(AVATAR_KEY);
        setSelectedAvatarState(null);
        // Don't clear NFT avatar when just clearing regular avatar
      } else {
        // Only clear NFT avatar when setting a new regular avatar
        await SecureStore.setItemAsync(AVATAR_KEY, avatar);
        setSelectedAvatarState(avatar);
        await SecureStore.deleteItemAsync(NFT_AVATAR_KEY);
        setSelectedNFTAvatarState(null);
      }
    } catch (error) {
      logger.error('Error saving avatar:', error);
    }
  };

  const setSelectedNFTAvatar = async (nft: NFTAvatar | null) => {
    try {
      logger.log('Setting NFT avatar:', nft);
      if (nft) {
        const nftString = JSON.stringify(nft);
        await SecureStore.setItemAsync(NFT_AVATAR_KEY, nftString);
        setSelectedNFTAvatarState(nft);
        logger.log('NFT avatar saved to SecureStore');
        
        // Update backend with NFT avatar
        try {
          const nftAvatarUrl = nft.image || nft.uri || null;
          await authAPI.updateProfile({ nftAvatar: nftAvatarUrl });
          logger.log('NFT avatar updated in backend');
        } catch (error) {
          logger.error('Failed to update NFT avatar in backend:', error);
        }
        
        // Verify it was saved
        const verification = await SecureStore.getItemAsync(NFT_AVATAR_KEY);
        logger.log('Verification - NFT avatar in storage:', !!verification, 'length:', verification?.length);
        
        await SecureStore.deleteItemAsync(AVATAR_KEY);
        setSelectedAvatarState(null);
      } else {
        await SecureStore.deleteItemAsync(NFT_AVATAR_KEY);
        setSelectedNFTAvatarState(null);
        
        // Clear in backend
        try {
          await authAPI.updateProfile({ nftAvatar: null });
          logger.log('NFT avatar cleared in backend');
        } catch (error) {
          logger.error('Failed to clear NFT avatar in backend:', error);
        }
      }
    } catch (error) {
      logger.error('Error saving NFT avatar:', error);
    }
  };

  const setPremiumStatus = async (status: boolean) => {
    try {
      setIsPremium(status);
      await SecureStore.setItemAsync(PREMIUM_STATUS_KEY, status.toString());
      
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
      solBalance,
      isLoading,
      isConnected,
      selectedAvatar,
      selectedNFTAvatar,
      snsDomain,
      allSNSDomains,
      isPremium,
      timeFunUsername,
      currentProvider,
      availableWallets,
      connectWallet,
      disconnectWallet,
      logout: disconnectWallet, // logout is an alias for disconnectWallet
      signMessage,
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
      solBalance,
      isLoading,
      isConnected,
      selectedAvatar,
      selectedNFTAvatar,
      snsDomain,
      allSNSDomains,
      isPremium,
      timeFunUsername,
      currentProvider,
      availableWallets,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};