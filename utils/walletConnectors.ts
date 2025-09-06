import { solanaMobileService } from './solanaMobile';
const bs58 = require('bs58');
import { logger } from './logger';
import { PublicKey } from '@solana/web3.js';
import { Platform } from 'react-native';
import { config } from '../config/environment';
import { getClusterForWallet, debugConnectionParams } from './walletDebug';

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
  name: config.appName,
  uri: config.appUrl,
  icon: 'favicon.ico', // MWA will handle this properly
};

export const connectAndSignWithMWA = async (message: string): Promise<{ address: string; signature: string }> => {
  try {
    logger.log('Starting MWA transaction...');
    logger.log('Platform:', Platform.OS);
    logger.log('App Identity:', APP_IDENTITY);
    
    // Import MWA dynamically for mobile
    let transact: any;
    try {
      const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
      transact = mwaModule.transact;
    } catch (requireError) {
      logger.error('Failed to require MWA module:', requireError);
      throw new Error('Mobile wallet adapter not available. Please ensure you have a compatible Solana wallet installed.');
    }
    
    if (!transact) {
      throw new Error('MWA transact function not found in module');
    }
    
    logger.log('MWA library loaded successfully');
  
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('MWA connection timed out. Please make sure Phantom is updated to the latest version.'));
    }, 20000); // Reduced to 20 seconds
  });
  
  try {
    logger.log('Calling transact function...');
    
    // Test if transact is actually a function
    logger.log('Type of transact:', typeof transact);
    
    // Race between the transaction and timeout
    const result = await Promise.race([
      transact(
        async (wallet) => {
        logger.log('MWA callback started - wallet object received');
      // Authorize in the same session
      logger.log('Authorizing wallet...');
      const authResult = await wallet.authorize({
        cluster: 'mainnet-beta',
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
      
      // Extract signature from signed message
      const signedMessage = signedMessages[0];
      // The signature should be 64 bytes
      let signature: string;
      if (signedMessage.length === 64) {
        // Just the signature
        signature = bs58.encode(signedMessage);
      } else if (signedMessage.length > 64) {
        // Signature is the last 64 bytes
        const signatureBytes = signedMessage.slice(-64);
        signature = bs58.encode(signatureBytes);
      } else {
        throw new Error(`Invalid signature length: ${signedMessage.length}`);
      }
      
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
  } catch (importError: any) {
    logger.error('Failed to import MWA libraries:', importError);
    throw new Error('Mobile wallet adapter not available. Please ensure you have a compatible Solana wallet installed.');
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
    // On mobile, Phantom will work through MWA
    // We return true to show it as an option - MWA will handle the actual connection
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return true;
    }
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
  const nonce = Math.random().toString(36).substring(2, 15);
  
  // Simple message format that works with nacl signature verification
  const message = `Sign this message to authenticate with Korus\n\nNonce: ${nonce}`;
  
  logger.log('Creating auth message:', message);
  
  return message;
};