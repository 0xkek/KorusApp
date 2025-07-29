import { solanaMobileService } from './solanaMobile';
import bs58 from 'bs58';
import { logger } from './logger';
import { PublicKey } from '@solana/web3.js';
import { Platform } from 'react-native';

export interface WalletProvider {
  name: 'seedvault' | 'phantom' | 'solflare' | 'backpack';
  displayName: string;
  icon: string;
  isAvailable: () => boolean | Promise<boolean>;
  connect: () => Promise<string>; // Returns public key
  signMessage: (message: string) => Promise<string>; // Returns signature
  disconnect: () => void;
}

// Seed Vault Provider (Solana Mobile)
export const seedVaultProvider: WalletProvider = {
  name: 'seedvault',
  displayName: 'Seed Vault',
  icon: '🔐',
  isAvailable: () => solanaMobileService.isAvailable(),
  connect: async () => {
    const wallet = await solanaMobileService.connect();
    if (!wallet) throw new Error('Failed to connect to Seed Vault');
    return wallet.address;
  },
  signMessage: async (message: string) => {
    try {
      const signature = await solanaMobileService.signMessage(message);
      if (!signature) throw new Error('Failed to sign message');
      return signature;
    } catch (error: any) {
      logger.error('Seed Vault sign error:', error);
      if (error.message?.includes('declined') || error.message?.includes('cancelled')) {
        throw new Error('User declined to sign message');
      }
      throw error;
    }
  },
  disconnect: () => {
    solanaMobileService.disconnect();
  }
};

// Alternative: Connect and sign in one transaction (recommended for MWA)
export const APP_IDENTITY = {
  name: 'Korus',
  uri: 'https://korus-backend.onrender.com',
  icon: 'favicon.ico', // MWA will handle this properly
};

export const connectAndSignWithMWA = async (message: string): Promise<{ address: string; signature: string }> => {
  const { transact, Web3MobileWallet } = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  
  logger.log('Starting MWA transaction...');
  logger.log('Platform:', Platform.OS);
  logger.log('App Identity:', APP_IDENTITY);
  
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('MWA connection timed out after 30 seconds. Please make sure a Solana wallet app is installed.'));
    }, 30000);
  });
  
  try {
    // Race between the transaction and timeout
    const result = await Promise.race([
      transact(async (wallet: Web3MobileWallet) => {
      // Authorize in the same session
      logger.log('Authorizing wallet...');
      const authResult = await wallet.authorize({
        cluster: 'devnet', // Use 'devnet' not 'solana:devnet'
        identity: APP_IDENTITY,
      });
    
    logger.log('Authorization successful:', authResult);
    const base64Address = authResult.accounts[0].address;
    
    // Convert base64 to base58 for our use
    const addressBytes = Buffer.from(base64Address, 'base64');
    const pubKey = new PublicKey(addressBytes);
    const base58Address = pubKey.toBase58();
    
    // Sign message in the same session
    logger.log('Signing message:', message);
    const encodedMessage = Buffer.from(message, 'utf8');
    
    try {
      const signedMessages = await wallet.signMessages({
        addresses: [base64Address], // Use base64 for MWA
        payloads: [encodedMessage],
      });
      
      logger.log('Message signed successfully');
      
      if (!signedMessages || signedMessages.length === 0) {
        throw new Error('No signed message returned');
      }
      
      // Extract signature (last 64 bytes) and convert to base58
      const signedMessage = signedMessages[0];
      const signatureBytes = signedMessage.slice(-64);
      const signature = bs58.encode(signatureBytes);
      
      // Store auth token for future use
      if (authResult.auth_token) {
        await solanaMobileService.storeAuthToken(authResult.auth_token);
      }
      
      return {
        address: base58Address,
        signature,
      };
    } catch (error) {
      logger.error('Error signing message:', error);
      throw error;
    }
    }),
      timeoutPromise
    ]);
    
    return result as { address: string; signature: string };
  } catch (error: any) {
    logger.error('MWA transaction error:', error);
    // Better error handling
    if (error.message?.includes('cancelled')) {
      throw new Error('Wallet connection cancelled by user');
    } else if (error.message?.includes('websocket')) {
      throw new Error('Unable to connect to wallet. Please make sure a Solana wallet app is installed and try again.');
    }
    throw error;
  }
};

// Phantom Provider (Browser/Mobile)
export const phantomProvider: WalletProvider = {
  name: 'phantom',
  displayName: 'Phantom',
  icon: '👻',
  isAvailable: () => {
    // Check for Phantom in browser
    if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
      return true;
    }
    // On mobile, could check for Phantom app via deep linking
    return false;
  },
  connect: async () => {
    const phantom = (window as any).solana;
    if (!phantom?.isPhantom) throw new Error('Phantom not found');
    
    const resp = await phantom.connect();
    return resp.publicKey.toString();
  },
  signMessage: async (message: string) => {
    const phantom = (window as any).solana;
    if (!phantom?.isPhantom) throw new Error('Phantom not found');
    
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await phantom.signMessage(encodedMessage, 'utf8');
    return bs58.encode(signedMessage.signature);
  },
  disconnect: () => {
    const phantom = (window as any).solana;
    phantom?.disconnect();
  }
};

// Solflare Provider
export const solflareProvider: WalletProvider = {
  name: 'solflare',
  displayName: 'Solflare',
  icon: '☀️',
  isAvailable: () => {
    if (typeof window !== 'undefined' && (window as any).solflare?.isSolflare) {
      return true;
    }
    return false;
  },
  connect: async () => {
    const solflare = (window as any).solflare;
    if (!solflare?.isSolflare) throw new Error('Solflare not found');
    
    await solflare.connect();
    return solflare.publicKey.toString();
  },
  signMessage: async (message: string) => {
    const solflare = (window as any).solflare;
    if (!solflare?.isSolflare) throw new Error('Solflare not found');
    
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await solflare.signMessage(encodedMessage, 'utf8');
    return bs58.encode(signedMessage.signature);
  },
  disconnect: () => {
    const solflare = (window as any).solflare;
    solflare?.disconnect();
  }
};

// Backpack Provider
export const backpackProvider: WalletProvider = {
  name: 'backpack',
  displayName: 'Backpack',
  icon: '🎒',
  isAvailable: () => {
    if (typeof window !== 'undefined' && (window as any).backpack?.isBackpack) {
      return true;
    }
    return false;
  },
  connect: async () => {
    const backpack = (window as any).backpack;
    if (!backpack?.isBackpack) throw new Error('Backpack not found');
    
    await backpack.connect();
    return backpack.publicKey.toString();
  },
  signMessage: async (message: string) => {
    const backpack = (window as any).backpack;
    if (!backpack?.isBackpack) throw new Error('Backpack not found');
    
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await backpack.signMessage(encodedMessage);
    return bs58.encode(signedMessage.signature);
  },
  disconnect: () => {
    const backpack = (window as any).backpack;
    backpack?.disconnect();
  }
};

// Get all available wallet providers
export const getAvailableWallets = async (): Promise<WalletProvider[]> => {
  const wallets = [seedVaultProvider, phantomProvider, solflareProvider, backpackProvider];
  const availableWallets: WalletProvider[] = [];
  
  for (const wallet of wallets) {
    try {
      const isAvailable = await wallet.isAvailable();
      if (isAvailable) {
        availableWallets.push(wallet);
      }
    } catch (error) {
      logger.error(`Error checking wallet availability for ${wallet.name}:`, error);
    }
  }
  
  return availableWallets;
};

// Create authentication message
export const createAuthMessage = (): string => {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  const message = {
    domain: 'korus.app',
    statement: 'Sign this message to authenticate with Korus',
    timestamp,
    nonce,
  };
  
  return JSON.stringify(message);
};