import { 
  transact, 
  Web3MobileWallet,
  AuthorizationResult,
  AuthorizeAPI,
  ReauthorizeAPI,
  SignMessagesAPI,
  SignTransactionsAPI
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey, Transaction } from '@solana/web3.js';
import { logger } from './logger';
import { Platform } from 'react-native';

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
    icon: 'favicon.ico', // Should be a relative path to an icon in your app
  };

  /**
   * Check if Mobile Wallet Adapter is available (only on Android)
   */
  isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Connect to a Solana Mobile wallet (like Seed Vault)
   */
  async connect(): Promise<SolanaMobileWallet | null> {
    if (!this.isAvailable()) {
      logger.log('Solana Mobile only available on Android');
      return null;
    }

    try {
      const authResult = await transact(async (wallet: Web3MobileWallet) => {
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
    wallet: AuthorizeAPI | ReauthorizeAPI
  ): Promise<{ publicKey: PublicKey; authToken: string } | null> {
    try {
      // Try to reauthorize if we have an auth token
      if (this.authToken && 'reauthorize' in wallet) {
        try {
          const reauth = await wallet.reauthorize({
            auth_token: this.authToken,
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
        cluster: 'devnet',
        identity: this.appIdentity,
      });

      return {
        publicKey: new PublicKey(authorizationResult.accounts[0].address),
        authToken: authorizationResult.auth_token,
      };
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
      const result = await transact(async (wallet: Web3MobileWallet) => {
        // Reauthorize if needed
        const auth = await this.authorize(wallet);
        if (!auth) {
          throw new Error('Failed to authorize');
        }

        // Sign the message
        const signedMessages = await wallet.signMessages({
          addresses: [this.currentWallet!.address],
          payloads: [Buffer.from(message, 'utf8')],
        });

        return signedMessages[0];
      });

      return Buffer.from(result).toString('base64');
    } catch (error) {
      logger.error('Failed to sign message:', error);
      return null;
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
      const result = await transact(async (wallet: Web3MobileWallet) => {
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
}

export const solanaMobileService = new SolanaMobileService();