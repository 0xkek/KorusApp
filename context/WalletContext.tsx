import React, { createContext, useContext, useEffect, useState } from 'react';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { generateWalletAddress } from '../utils/wallet';

interface WalletContextType {
  walletAddress: string | null;
  balance: number;
  isLoading: boolean;
  hasWallet: boolean;
  createNewWallet: () => Promise<void>;
  importFromSeedVault: () => Promise<boolean>;
  getPrivateKey: () => Promise<string | null>;
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number) => void;
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

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);

  // Check for existing wallet on mount
  useEffect(() => {
    checkExistingWallet();
  }, []);

  const checkExistingWallet = async () => {
    try {
      setIsLoading(true);
      
      // First check if user has a stored wallet
      const storedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
      if (storedAddress) {
        setWalletAddress(storedAddress);
        setHasWallet(true);
        // In real app, fetch balance from blockchain
        setBalance(150.75); // Mock balance for demo
      }
      
      // TODO: Check for Seed Vault wallet
      // This would involve checking if user has Seed Vault app installed
      // and requesting access to their wallet
      
    } catch (error) {
      console.error('Error checking wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewWallet = async () => {
    try {
      setIsLoading(true);
      
      // For now, use a mock wallet to test the app
      // TODO: Replace with real Solana keypair generation
      const mockPublicKey = generateWalletAddress();
      const mockSecretKey = 'mock-secret-key-' + Date.now();
      
      // Store securely
      await SecureStore.setItemAsync(WALLET_KEY, mockSecretKey);
      await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, mockPublicKey);
      
      setWalletAddress(mockPublicKey);
      setHasWallet(true);
      setBalance(150.75); // Start with demo balance
      
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
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
      console.error('Error importing from Seed Vault:', error);
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
      console.error('Error getting private key:', error);
      return null;
    }
  };

  const refreshBalance = async () => {
    try {
      // TODO: Fetch real balance from Solana blockchain
      // For demo, just update with mock balance
      setBalance(prev => prev + Math.random() * 10);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const deductBalance = (amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        balance,
        isLoading,
        hasWallet,
        createNewWallet,
        importFromSeedVault,
        getPrivateKey,
        refreshBalance,
        deductBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};