// Seed Vault requires ejecting from Expo - commenting out for now
// import { 
//   SeedVault,
//   Purpose,
//   SeedVaultEvent,
//   AuthorizeParams
// } from '@solana-mobile/seed-vault-lib';
import { PublicKey, Transaction } from '@solana/web3.js';
import { logger } from './logger';
import { Platform } from 'react-native';

export interface SeedVaultWallet {
  publicKey: PublicKey;
  address: string;
  authToken: string;
}

class SeedVaultService {
  private seedVault: any = null; // SeedVault type
  private currentWallet: SeedVaultWallet | null = null;
  private authToken: string | null = null;

  constructor() {
    // Seed Vault requires native modules - not available in Expo
    logger.log('Seed Vault requires ejecting from Expo');
  }

  /**
   * Check if Seed Vault is available (only on Solana Saga phones)
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !this.seedVault) {
      return false;
    }

    try {
      // Seed Vault is only available on Solana Mobile devices
      return await this.seedVault.isAvailable();
    } catch (error) {
      logger.log('Seed Vault not available:', error);
      return false;
    }
  }

  /**
   * Check if user has already authorized the app
   */
  async hasExistingSeed(): Promise<boolean> {
    if (!this.seedVault) return false;

    try {
      const seeds = await this.seedVault.getAuthorizedSeeds();
      return seeds.length > 0;
    } catch (error) {
      logger.error('Error checking existing seeds:', error);
      return false;
    }
  }

  /**
   * Import wallet from Seed Vault (creates or retrieves existing)
   */
  async importFromSeedVault(): Promise<SeedVaultWallet | null> {
    if (!this.seedVault) {
      throw new Error('Seed Vault not initialized');
    }

    try {
      logger.log('Requesting Seed Vault authorization...');

      // Check if we already have authorization
      const existingSeeds = await this.seedVault.getAuthorizedSeeds();
      
      let authToken: string;
      let publicKey: PublicKey;

      if (existingSeeds.length > 0) {
        // Use existing seed
        logger.log('Using existing Seed Vault authorization');
        authToken = existingSeeds[0].authToken;
        publicKey = existingSeeds[0].publicKey;
      } else {
        // Request new authorization
        const authParams: AuthorizeParams = {
          appIdentity: {
            name: 'Korus',
            uri: 'https://korus.app',
            icon: 'https://korus.app/icon.png',
          },
          purpose: Purpose.SIGN_SOLANA_TRANSACTIONS,
        };

        const authorization = await this.seedVault.authorize(authParams);
        
        if (!authorization) {
          throw new Error('User denied Seed Vault access');
        }

        authToken = authorization.authToken;
        publicKey = authorization.publicKey;
      }

      this.authToken = authToken;
      this.currentWallet = {
        publicKey,
        address: publicKey.toBase58(),
        authToken,
      };

      logger.log('Successfully connected to Seed Vault:', this.currentWallet.address);
      return this.currentWallet;

    } catch (error: any) {
      logger.error('Failed to import from Seed Vault:', error);
      
      if (error.code === 'USER_CANCELLED') {
        logger.log('User cancelled Seed Vault authorization');
        return null;
      }

      throw error;
    }
  }

  /**
   * Sign a message using Seed Vault
   */
  async signMessage(message: string): Promise<string | null> {
    if (!this.seedVault || !this.authToken) {
      throw new Error('Not connected to Seed Vault');
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      
      const signature = await this.seedVault.signMessage(
        messageBytes,
        this.authToken
      );

      return Buffer.from(signature).toString('base64');
    } catch (error) {
      logger.error('Failed to sign message with Seed Vault:', error);
      return null;
    }
  }

  /**
   * Sign a transaction using Seed Vault
   */
  async signTransaction(transaction: Transaction): Promise<Transaction | null> {
    if (!this.seedVault || !this.authToken || !this.currentWallet) {
      throw new Error('Not connected to Seed Vault');
    }

    try {
      // Set fee payer
      transaction.feePayer = this.currentWallet.publicKey;

      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const signature = await this.seedVault.signTransaction(
        serializedTx,
        this.authToken
      );

      // Add signature to transaction
      transaction.addSignature(
        this.currentWallet.publicKey,
        Buffer.from(signature)
      );

      return transaction;
    } catch (error) {
      logger.error('Failed to sign transaction with Seed Vault:', error);
      return null;
    }
  }

  /**
   * Deauthorize the app from Seed Vault
   */
  async disconnect(): Promise<void> {
    if (!this.seedVault || !this.authToken) {
      return;
    }

    try {
      await this.seedVault.deauthorize(this.authToken);
      this.authToken = null;
      this.currentWallet = null;
      logger.log('Disconnected from Seed Vault');
    } catch (error) {
      logger.error('Error disconnecting from Seed Vault:', error);
    }
  }

  /**
   * Get the current connected wallet
   */
  getCurrentWallet(): SeedVaultWallet | null {
    return this.currentWallet;
  }

  /**
   * Check if currently connected to Seed Vault
   */
  isConnected(): boolean {
    return this.currentWallet !== null && this.authToken !== null;
  }
}

// Export singleton instance
export const seedVaultService = new SeedVaultService();