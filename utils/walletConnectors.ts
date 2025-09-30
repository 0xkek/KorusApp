import { solanaMobileService } from './solanaMobile';
const bs58 = require('bs58');
import { logger } from './logger';
import { PublicKey } from '@solana/web3.js';
import { Platform } from 'react-native';
import { config } from '../config/environment';
import { getClusterForWallet, debugConnectionParams } from './walletDebug';

import { Transaction } from '@solana/web3.js';

export interface WalletProvider {
  name: 'seedvault' | 'phantom' | 'solflare' | 'backpack';
  displayName: string;
  icon: string;
  isAvailable: () => boolean | Promise<boolean>;
  connect: () => Promise<string>; // Returns public key
  signMessage: (message: string) => Promise<string>; // Returns signature
  signTransaction?: (transaction: Transaction) => Promise<Transaction>; // Returns signed transaction
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
  signTransaction: async (transaction: Transaction) => {
    try {
      const signedTx = await solanaMobileService.signTransaction(transaction);
      if (!signedTx) throw new Error('Failed to sign transaction');
      return signedTx;
    } catch (error: any) {
      logger.error('Seed Vault transaction sign error:', error);
      if (error.message?.includes('declined') || error.message?.includes('cancelled')) {
        throw new Error('User declined to sign transaction');
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
      logger.log('MWA timeout reached after 15 seconds');
      reject(new Error('Wallet connection timed out. Please try again or use a different wallet.'));
    }, 15000); // 15 seconds timeout
  });
  
  try {
    logger.log('Calling transact function...');

    // Test if transact is actually a function
    logger.log('Type of transact:', typeof transact);

    // Add detailed logging before transact
    logger.log('About to invoke MWA transact - this should open wallet selector');
    logger.log('If no wallet selector appears, MWA intent is not being handled');

    // Race between the transaction and timeout
    const result = await Promise.race([
      transact(
        async (wallet) => {
        logger.log('MWA callback started - wallet object received');
        logger.log('Wallet selector was opened and user selected a wallet');
        logger.log('Wallet type:', wallet?.constructor?.name || 'unknown');
      // Authorize in the same session
      logger.log('Authorizing wallet...');

      // MWA 2.0 spec: Use 'solana:mainnet', 'solana:devnet', 'solana:testnet'
      // Legacy: 'mainnet-beta', 'devnet', 'testnet'
      logger.log('🔍 Using cluster:', config.solanaCluster);

      // Try with the full 'solana:mainnet' format (MWA 2.0)
      let authResult;
      try {
        logger.log('🚀 Calling wallet.authorize with:', config.solanaCluster);
        authResult = await wallet.authorize({
          cluster: config.solanaCluster,
          identity: APP_IDENTITY,
        });
      } catch (firstError) {
        logger.log('MWA 2.0 format failed, trying legacy format');
        // Try legacy format: 'mainnet-beta' instead of 'solana:mainnet-beta'
        const legacyCluster = config.solanaCluster.replace('solana:', '');
        logger.log('🚀 Trying legacy cluster:', legacyCluster);
        authResult = await wallet.authorize({
          cluster: legacyCluster,
          identity: APP_IDENTITY,
        });
      }

    logger.log('Authorization successful:', {
      hasAuthToken: !!authResult.auth_token,
      accountsCount: authResult.accounts?.length || 0,
      firstAccount: authResult.accounts?.[0]?.address ? 'present' : 'missing'
    });
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
    // Only log as error if it's not a cancellation
    const errorStr = error.toString();
    const errorMessage = error.message || '';
    
    if (!errorStr.includes('CancellationException')) {
      logger.error('MWA transaction error:', error);
    } else {
      logger.log('User cancelled wallet connection');
    }
    
    // Check if user cancelled the connection
    if (errorStr.includes('CancellationException') || 
        errorMessage.includes('CancellationException') ||
        errorMessage.includes('cancelled') || 
        errorMessage.includes('declined') ||
        error.code === 'EUNSPECIFIED') {
      throw new Error('Connection cancelled');
    } else if (errorMessage.includes('websocket')) {
      throw new Error('Unable to connect to wallet. Please make sure a Solana wallet app is installed and try again.');
    }
    throw new Error('Failed to connect wallet. Please try again.');
  }
};

export const signAndSendTransactionWithMWA = async (transaction: Transaction): Promise<string> => {
  logger.log('Starting MWA sign and send transaction...');

  const transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;

  const result = await transact(async (wallet) => {
    const authResult = await wallet.authorize({
      cluster: config.solanaCluster.replace('solana:', ''),
      identity: APP_IDENTITY,
    });

    const signedTransactions = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });

    return signedTransactions[0].signature;
  });

  return result;
};

export const signTransactionWithMWA = async (transaction: Transaction): Promise<Transaction> => {
  logger.log('Starting MWA sign transaction...');

  const transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;

  const result = await transact(async (wallet) => {
    const authResult = await wallet.authorize({
      cluster: config.solanaCluster.replace('solana:', ''),
      identity: APP_IDENTITY,
    });

    const signedTransactions = await wallet.signTransactions({
      transactions: [transaction],
    });

    return signedTransactions[0];
  });

  return result;
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
  signTransaction: async (transaction: Transaction) => {
    throw new Error('Use signAndSendTransactionWithMWA for mobile');
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
    // On mobile, Solflare works through MWA
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return true; // Available through MWA
    }
    // On web, check for browser extension
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
  signTransaction: async (transaction: Transaction) => {
    throw new Error('Use signAndSendTransactionWithMWA for mobile');
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
    // On mobile, Backpack works through MWA
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return true; // Available through MWA
    }
    // On web, check for browser extension
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
  signTransaction: async (transaction: Transaction) => {
    throw new Error('Use signAndSendTransactionWithMWA for mobile');
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