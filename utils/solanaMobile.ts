import { PublicKey, Transaction } from '@solana/web3.js';
import { logger } from './logger';
import { Platform } from 'react-native';

// Solana Mobile Wallet Adapter requires native modules
// Will only work in production build, not Expo Go
let transact: any = null;
let Web3MobileWallet: any = null;
let AuthorizeAPI: any = null;
let ReauthorizeAPI: any = null;

// Wrap the require in a try-catch to handle Expo Go environment
try {
  const mobileAdapter = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  transact = mobileAdapter.transact;
  Web3MobileWallet = mobileAdapter.Web3MobileWallet;
} catch (error) {
  console.log('Solana Mobile Wallet Adapter not available in Expo Go');
}

export interface SolanaMobileWallet {
  publicKey: PublicKey;
  address: string;
  authToken: string;
}

class SolanaMobileService {
  private currentWallet: SolanaMobileWallet | null = null;
  private authToken: string | null = null;
  private appIdentity = {
    name: 'Korus',
    uri: 'https://korus.app',
    icon: 'favicon.ico', // Relative path to icon
  };

  /**
   * Check if Mobile Wallet Adapter is available (only on Android)
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && transact !== null;
  }

  /**
   * Connect to a Solana Mobile wallet (like Seed Vault)
   */
  async connect(): Promise<SolanaMobileWallet | null> {
    if (!this.isAvailable()) {
      logger.log('Solana Mobile only available on Android with native modules');
      return null;
    }

    try {
      logger.log('Starting Solana Mobile wallet connection...');
      
      const authResult = await transact(async (wallet: any) => {
        logger.log('Inside transact, wallet object available');
        
        const authorizationResult = await this.authorize(wallet);
        
        if (!authorizationResult) {
          throw new Error('Authorization failed');
        }

        const { publicKey, authToken } = authorizationResult;
        
        return {
          publicKey,
          authToken,
        };
      });

      if (authResult) {
        this.currentWallet = {
          publicKey: authResult.publicKey,
          address: authResult.publicKey.toBase58(),
          authToken: authResult.authToken,
        };
        this.authToken = authResult.authToken;
        
        logger.log('Connected to Solana Mobile wallet:', this.currentWallet.address);
        return this.currentWallet;
      }

      logger.log('No auth result returned');
      return null;
    } catch (error) {
      logger.error('Failed to connect to Solana Mobile wallet:', error);
      return null;
    }
  }

  /**
   * Authorize the app with the wallet
   */
  private async authorize(
    wallet: any
  ): Promise<{ publicKey: PublicKey; authToken: string } | null> {
    try {
      // Try to reauthorize if we have an auth token
      if (this.authToken && 'reauthorize' in wallet) {
        try {
          const reauth = await wallet.reauthorize({
            auth_token: this.authToken,
            identity: this.appIdentity,
          });

          if (reauth) {
            logger.log('Reauthorized with existing token');
            return {
              publicKey: new PublicKey(reauth.accounts[0].address),
              authToken: this.authToken,
            };
          }
        } catch (error) {
          logger.log('Reauthorization failed, requesting new authorization');
        }
      }

      // Request new authorization
      const authorizationResult = await wallet.authorize({
        cluster: 'solana:devnet', // Correct format per MWA spec
        identity: this.appIdentity,
      });

      logger.log('Authorization result:', authorizationResult);
      
      if (!authorizationResult.accounts || authorizationResult.accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }
      
      let address = authorizationResult.accounts[0].address;
      logger.log('Wallet address received:', address);
      
      // Check if address is base64 encoded (contains +, /, or = characters)
      if (address.includes('+') || address.includes('/') || address.includes('=')) {
        logger.log('Address appears to be base64 encoded, converting...');
        try {
          // Convert base64 to bytes, then to PublicKey
          const addressBytes = Buffer.from(address, 'base64');
          const pubKey = new PublicKey(addressBytes);
          logger.log('Converted to base58:', pubKey.toBase58());
          return {
            publicKey: pubKey,
            authToken: authorizationResult.auth_token,
          };
        } catch (error) {
          logger.error('Failed to convert base64 address:', error);
          throw new Error(`Failed to convert wallet address: ${error}`);
        }
      } else {
        // Address is already in base58 format
        try {
          const pubKey = new PublicKey(address);
          return {
            publicKey: pubKey,
            authToken: authorizationResult.auth_token,
          };
        } catch (error) {
          logger.error('Invalid wallet address format:', address);
          throw new Error(`Invalid wallet address: ${error}`);
        }
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      return null;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string | null> {
    if (!this.currentWallet) {
      logger.error('No wallet connected');
      return null;
    }

    try {
      logger.log('Signing message with Solana Mobile wallet...');
      
      const result = await transact(async (wallet: any) => {
        // Reauthorize with existing token if available
        let authResult;
        if (this.authToken) {
          logger.log('Reauthorizing with existing auth token');
          try {
            authResult = await wallet.authorize({
              cluster: 'solana:devnet',
              identity: this.appIdentity,
              auth_token: this.authToken,
            });
          } catch (error) {
            logger.log('Reauthorization failed, requesting new authorization');
            authResult = await wallet.authorize({
              cluster: 'solana:devnet',
              identity: this.appIdentity,
            });
          }
        } else {
          authResult = await wallet.authorize({
            cluster: 'solana:devnet',
            identity: this.appIdentity,
          });
        }
        
        // Sign the message
        const encodedMessage = Buffer.from(message, 'utf8');
        logger.log('Requesting signature for message');
        
        // Use the base64 address from auth result
        const base64Address = authResult.accounts[0].address;
        
        const signedMessages = await wallet.signMessages({
          addresses: [base64Address],
          payloads: [encodedMessage],
        });

        return signedMessages[0];
      });

      // Convert to base58 for backend compatibility
      const signatureBytes = new Uint8Array(result);
      const bs58 = await import('bs58');
      const signature = bs58.default.encode(signatureBytes);
      logger.log('Message signed successfully, signature:', signature);
      return signature;
    } catch (error) {
      logger.error('Failed to sign message:', error);
      throw error; // Propagate error instead of returning null
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: Transaction): Promise<Transaction | null> {
    if (!this.currentWallet) {
      logger.error('No wallet connected');
      return null;
    }

    try {
      const result = await transact(async (wallet: any) => {
        // Reauthorize if needed
        const auth = await this.authorize(wallet);
        if (!auth) {
          throw new Error('Failed to authorize');
        }

        // Sign the transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      return result;
    } catch (error) {
      logger.error('Failed to sign transaction:', error);
      return null;
    }
  }

  /**
   * Get current wallet
   */
  getWallet(): SolanaMobileWallet | null {
    return this.currentWallet;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.currentWallet = null;
    this.authToken = null;
    logger.log('Disconnected from Solana Mobile wallet');
  }

  /**
   * Store auth token for future use
   */
  async storeAuthToken(token: string): Promise<void> {
    this.authToken = token;
  }
}

export const solanaMobileService = new SolanaMobileService();