import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { generateWalletAddress } from '../utils/wallet';
import { getFavoriteSNSDomain, fetchSNSDomains, SNSDomain } from '../utils/sns';
import { NFTAvatar } from '../types/theme';
import { logger } from '../utils/logger';
import { withErrorHandling, handleError } from '../utils/errorHandler';
import { authAPI } from '../utils/api';
import { secureWallet } from '../utils/secureWallet';
import { solanaMobileService } from '../utils/solanaMobile';

interface WalletContextType {
  walletAddress: string | null;
  balance: number;
  solBalance: number; // Real SOL balance
  isLoading: boolean;
  hasWallet: boolean;
  selectedAvatar: string | null;
  selectedNFTAvatar: NFTAvatar | null;
  snsDomain: string | null;
  allSNSDomains: SNSDomain[];
  isPremium: boolean;
  timeFunUsername: string | null;
  createNewWallet: () => Promise<boolean>;
  importFromSeedVault: () => Promise<boolean>;
  getPrivateKey: () => Promise<string | null>;
  getRecoveryPhrase: () => Promise<string | null>;
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number) => void;
  setSelectedAvatar: (avatar: string) => void;
  setSelectedNFTAvatar: (nft: NFTAvatar | null) => void;
  refreshSNSDomain: () => Promise<void>;
  setFavoriteSNSDomain: (domain: string) => Promise<void>;
  setPremiumStatus: (status: boolean) => void;
  setTimeFunUsername: (username: string | null) => Promise<void>;
  logout: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
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

// Solana connection - using devnet for hackathon, switch to mainnet-beta for production
const SOLANA_NETWORK = 'devnet'; // 'mainnet-beta' for production
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [solBalance, setSolBalance] = useState(0);
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
      
      // First check if user has a stored wallet address
      const storedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
      const storedAvatar = await SecureStore.getItemAsync(AVATAR_KEY);
      const storedNFTAvatar = await SecureStore.getItemAsync(NFT_AVATAR_KEY);
      const storedFavoriteSNS = await SecureStore.getItemAsync(FAVORITE_SNS_KEY);
      const storedPremiumStatus = await SecureStore.getItemAsync(PREMIUM_STATUS_KEY);
      const storedTimeFunUsername = await SecureStore.getItemAsync(TIMEFUN_USERNAME_KEY);
      
      if (storedAddress) {
        // Check if we have a secure wallet for this address
        try {
          const wallet = await secureWallet.getWallet(false); // Don't require auth on app start
          if (wallet && wallet.publicKey === storedAddress) {
            setWalletAddress(storedAddress);
            setHasWallet(true);
            setBalance(5000); // Default ALLY balance
            
            // Try to fetch real SOL balance
            await updateSolBalance(storedAddress);
            
            // Set premium status
            const isPremiumUser = storedPremiumStatus === 'true';
            setIsPremium(isPremiumUser);
            
            // Fetch SNS domains
            const domains = await fetchSNSDomains(storedAddress);
            setAllSNSDomains(domains);
            
            if (isPremiumUser && storedFavoriteSNS) {
              setSnsDomain(storedFavoriteSNS);
            }
          } else {
            // Wallet mismatch or not found, clear stored address
            logger.warn('Stored wallet address does not match secure wallet');
            await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
          }
        } catch (error) {
          logger.error('Error loading secure wallet:', error);
          // Continue with offline mode
          setWalletAddress(storedAddress);
          setHasWallet(true);
          setBalance(5000);
          setSolBalance(0);
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

  const createNewWallet = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if biometric is available
      const biometricStatus = await secureWallet.isBiometricAvailable();
      if (!biometricStatus.available) {
        logger.warn('Biometric not available:', biometricStatus.error);
        // Continue anyway - wallet will work without biometric
      }
      
      // Generate real Solana wallet
      logger.log('Generating secure Solana wallet...');
      const walletResult = await secureWallet.generateWallet();
      
      if (!walletResult.success) {
        throw new Error('Failed to generate wallet');
      }
      
      const { publicKey, mnemonic } = walletResult;
      
      // Create a signature for backend authentication
      const authMessage = `Sign this message to authenticate with Korus\nTimestamp: ${Date.now()}`;
      const signature = await secureWallet.signMessage(authMessage);
      
      if (!signature) {
        throw new Error('Failed to sign authentication message');
      }
      
      // Authenticate with backend
      logger.log('Creating wallet and authenticating with backend');
      
      try {
        const { authAPI } = await import('../utils/api');
        
        logger.log('Attempting to authenticate with backend...');
        logger.log('Wallet address:', publicKey);
        
        // Authenticate with backend
        const authResult = await authAPI.connectWallet(publicKey, signature, authMessage);
        logger.log('Authentication successful:', authResult);
        logger.log('Token received:', authResult.token ? 'Yes' : 'No');
        
        // Store wallet address for quick access
        await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, publicKey);
        
        // Update state with backend data
        setWalletAddress(publicKey);
        setHasWallet(true);
        const backendBalance = parseFloat(authResult.user?.allyBalance || '5000');
        setBalance(isNaN(backendBalance) ? 5000 : backendBalance);
        setIsPremium(authResult.user?.tier === 'premium');
        
        // Fetch real SOL balance
        await updateSolBalance(publicKey);
        
        logger.log('Wallet created successfully with backend authentication');
        
      } catch (error: any) {
        // If rate limited, wait and try again
        if (error?.response?.status === 429) {
          logger.log('Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const { authAPI } = await import('../utils/api');
            const authResult = await authAPI.connectWallet(publicKey, signature, authMessage);
            
            await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, publicKey);
            
            setWalletAddress(publicKey);
            setHasWallet(true);
            setBalance(5000);
            setIsPremium(authResult.user?.tier === 'premium');
            
            await updateSolBalance(publicKey);
            
            logger.log('Authentication successful after retry');
          } catch (retryError) {
            logger.error('Retry failed, using offline mode:', retryError);
            // Fallback to offline
            await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, publicKey);
            await SecureStore.setItemAsync(OFFLINE_MODE_KEY, 'true');
            
            setWalletAddress(publicKey);
            setHasWallet(true);
            setBalance(5000);
            setIsPremium(false);
            setSolBalance(0);
          }
        } else {
          logger.error('Backend authentication failed:', error);
          // Fallback to offline mode
          await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, publicKey);
          await SecureStore.setItemAsync(OFFLINE_MODE_KEY, 'true');
          
          setWalletAddress(publicKey);
          setHasWallet(true);
          setBalance(5000);
          setIsPremium(false);
          setSolBalance(0);
        }
      }
      
      // Fetch SNS domains
      const domains = await fetchSNSDomains(publicKey);
      setAllSNSDomains(domains);
      
      logger.log('Wallet created successfully');
      setIsLoading(false);
      return true;
      
    } catch (error) {
      logger.error('Error creating wallet:', error);
      setIsLoading(false);
      return false;
    }
  };

  const importFromSeedVault = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if Solana Mobile is available (Android only)
      if (!solanaMobileService.isAvailable()) {
        logger.log('Solana Mobile wallet not available on this platform');
        setIsLoading(false);
        return false;
      }
      
      // Connect to Solana Mobile wallet (Seed Vault or others)
      const mobileWallet = await solanaMobileService.connect();
      if (!mobileWallet) {
        logger.log('User cancelled wallet connection');
        setIsLoading(false);
        return false;
      }
      
      logger.log('Connected to Solana Mobile wallet:', mobileWallet.address);
      
      // Create authentication message
      const authMessage = `Sign this message to authenticate with Korus\nTimestamp: ${Date.now()}`;
      
      // Sign message with mobile wallet
      const signature = await solanaMobileService.signMessage(authMessage);
      if (!signature) {
        throw new Error('Failed to sign authentication message');
      }
      
      // Authenticate with backend
      try {
        const authResult = await authAPI.connectWallet(
          mobileWallet.address, 
          signature, 
          authMessage
        );
        
        // Store wallet address
        await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, mobileWallet.address);
        await SecureStore.setItemAsync('WALLET_TYPE', 'solana_mobile'); // Mark as Solana Mobile wallet
        
        // Update state
        setWalletAddress(mobileWallet.address);
        setHasWallet(true);
        const backendBalance = parseFloat(authResult.user?.allyBalance || '5000');
        setBalance(isNaN(backendBalance) ? 5000 : backendBalance);
        setIsPremium(authResult.user?.tier === 'premium');
        
        // Fetch real SOL balance
        await updateSolBalance(mobileWallet.address);
        
        // Fetch SNS domains
        const domains = await fetchSNSDomains(mobileWallet.address);
        setAllSNSDomains(domains);
        
        logger.log('Successfully imported wallet from Solana Mobile');
        return true;
        
      } catch (error: any) {
        logger.error('Backend authentication failed:', error);
        
        // Disconnect on failure
        solanaMobileService.disconnect();
        
        // If rate limited, show appropriate message
        if (error?.response?.status === 429) {
          throw new Error('Too many attempts. Please wait a moment and try again.');
        }
        
        throw error;
      }
      
    } catch (error) {
      logger.error('Error importing from Solana Mobile:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
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

  const getPrivateKey = async (): Promise<string | null> => {
    try {
      // For security, we don't expose the private key directly
      // Instead, use signMessage for any signing needs
      logger.warn('Private key access requested - use signMessage instead');
      return null;
    } catch (error) {
      logger.error('Error getting private key:', error);
      return null;
    }
  };

  const getRecoveryPhrase = async (): Promise<string | null> => {
    try {
      const phrase = await secureWallet.getRecoveryPhrase();
      return phrase;
    } catch (error) {
      logger.error('Error getting recovery phrase:', error);
      return null;
    }
  };

  const refreshBalance = async () => {
    try {
      if (walletAddress) {
        // Update SOL balance
        await updateSolBalance(walletAddress);
        
        // Also refresh ALLY balance from backend if needed
        // For now keeping the existing balance
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

  const signMessage = async (message: string): Promise<string | null> => {
    try {
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }
      
      // Check if this is a Seed Vault wallet
      const walletType = await SecureStore.getItemAsync('WALLET_TYPE');
      
      if (walletType === 'solana_mobile') {
        // Use Solana Mobile wallet for signing
        const currentWallet = solanaMobileService.getWallet();
        if (!currentWallet) {
          // Try to reconnect
          const connected = await solanaMobileService.connect();
          if (!connected) {
            throw new Error('Failed to reconnect to Solana Mobile wallet');
          }
        }
        
        const signature = await solanaMobileService.signMessage(message);
        return signature;
      } else {
        // Use secure wallet for internal wallets
        const signature = await secureWallet.signMessage(message);
        return signature;
      }
    } catch (error) {
      logger.error('Error signing message:', error);
      return null;
    }
  };

  const logout = async () => {
    try {
      logger.log('Logging out and clearing all wallet data');
      
      // Check if this is a Seed Vault wallet
      const walletType = await SecureStore.getItemAsync('WALLET_TYPE');
      
      if (walletType === 'solana_mobile') {
        // Disconnect Solana Mobile wallet
        solanaMobileService.disconnect();
      } else {
        // Delete the secure wallet
        await secureWallet.deleteWallet();
      }
      
      // Clear all secure storage
      await SecureStore.deleteItemAsync(WALLET_KEY);
      await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
      await SecureStore.deleteItemAsync('WALLET_TYPE');
      await SecureStore.deleteItemAsync(AVATAR_KEY);
      await SecureStore.deleteItemAsync(NFT_AVATAR_KEY);
      await SecureStore.deleteItemAsync(FAVORITE_SNS_KEY);
      await SecureStore.deleteItemAsync(PREMIUM_STATUS_KEY);
      await SecureStore.deleteItemAsync(TIMEFUN_USERNAME_KEY);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      
      // Reset all state
      setWalletAddress(null);
      setBalance(0);
      setSolBalance(0);
      setHasWallet(false);
      setSelectedAvatarState(null);
      setSelectedNFTAvatarState(null);
      setSnsDomain(null);
      setAllSNSDomains([]);
      setIsPremium(false);
      setTimeFunUsernameState(null);
      
      logger.log('Logout complete');
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  };

  const contextValue = useMemo(
    () => ({
      walletAddress,
      balance,
      solBalance,
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
      getRecoveryPhrase,
      refreshBalance,
      deductBalance,
      setSelectedAvatar,
      setSelectedNFTAvatar,
      refreshSNSDomain,
      setFavoriteSNSDomain,
      setPremiumStatus,
      setTimeFunUsername,
      logout,
      signMessage,
    }),
    [
      walletAddress,
      balance,
      solBalance,
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