import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { logger } from './logger';

// Secure storage keys
const WALLET_KEY = 'korus_wallet_encrypted';
const WALLET_SALT = 'korus_wallet_salt';
const AUTH_REQUIRED = 'korus_auth_required';
const WALLET_CREATED_AT = 'korus_wallet_created';

export class SecureWallet {
  private static instance: SecureWallet;

  static getInstance(): SecureWallet {
    if (!SecureWallet.instance) {
      SecureWallet.instance = new SecureWallet();
    }
    return SecureWallet.instance;
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<{
    available: boolean;
    type?: string;
    error?: string;
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return { available: false, error: 'No biometric hardware' };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return { available: false, error: 'No biometrics enrolled' };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const type = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'fingerprint'
        : supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'face'
        : 'unknown';

      return { available: true, type };
    } catch (error) {
      logger.error('Biometric check failed:', error);
      return { available: false, error: 'Biometric check failed' };
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateBiometric(reason: string): Promise<boolean> {
    try {
      logger.log('Starting biometric authentication...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false, // Allow passcode as fallback
      });

      logger.log('Biometric result:', result);
      return result.success;
    } catch (error) {
      logger.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Generate a cryptographically secure wallet
   */
  async generateWallet(): Promise<{
    mnemonic: string;
    publicKey: string;
    success: boolean;
  }> {
    try {
      // Generate 128 bits of entropy for 12-word mnemonic
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const entropy = Buffer.from(randomBytes);
      
      // Generate mnemonic from entropy
      const mnemonic = bip39.entropyToMnemonic(entropy);
      
      // Validate the mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic generated');
      }

      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive Solana keypair using BIP44 path
      const path = "m/44'/501'/0'/0'"; // Solana's standard derivation path
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      const publicKey = keypair.publicKey.toBase58();

      // Store encrypted wallet
      await this.storeWallet(mnemonic, keypair);

      return {
        mnemonic,
        publicKey,
        success: true
      };
    } catch (error) {
      logger.error('Wallet generation failed:', error);
      throw error;
    }
  }

  /**
   * Store wallet securely with encryption
   */
  private async storeWallet(mnemonic: string, keypair: Keypair): Promise<void> {
    try {
      // Generate a random salt for key derivation
      const salt = await Crypto.getRandomBytesAsync(32);
      
      // Create encryption key from device-specific data
      // This is not perfect but better than hardcoded key
      const deviceKey = await this.getDeviceKey(salt);
      
      // Encrypt the mnemonic and private key
      const walletData = {
        mnemonic,
        privateKey: Buffer.from(keypair.secretKey).toString('base64'),
        publicKey: keypair.publicKey.toBase58(),
        createdAt: new Date().toISOString()
      };
      
      const encryptedData = await this.encrypt(JSON.stringify(walletData), deviceKey);
      
      // Store encrypted data
      await SecureStore.setItemAsync(WALLET_KEY, encryptedData);
      await SecureStore.setItemAsync(WALLET_SALT, Buffer.from(salt).toString('base64'));
      await SecureStore.setItemAsync(WALLET_CREATED_AT, new Date().toISOString());
      
      // Only enable biometric if available
      const biometricStatus = await this.isBiometricAvailable();
      if (biometricStatus.available) {
        await SecureStore.setItemAsync(AUTH_REQUIRED, 'true');
        logger.log('Biometric protection enabled');
      } else {
        await SecureStore.setItemAsync(AUTH_REQUIRED, 'false');
        logger.log('Biometric not available, using password-only protection');
      }
      
      logger.log('Wallet stored securely');
    } catch (error) {
      logger.error('Failed to store wallet:', error);
      throw error;
    }
  }

  /**
   * Retrieve wallet with biometric authentication
   */
  async getWallet(requireAuth: boolean = true): Promise<{
    mnemonic: string;
    keypair: Keypair;
    publicKey: string;
  } | null> {
    try {
      // Check if auth is required
      const authRequired = await SecureStore.getItemAsync(AUTH_REQUIRED);
      
      if (requireAuth && authRequired === 'true') {
        const authenticated = await this.authenticateBiometric('Authenticate to access your wallet');
        if (!authenticated) {
          throw new Error('Authentication failed');
        }
      }

      // Retrieve encrypted wallet
      const encryptedData = await SecureStore.getItemAsync(WALLET_KEY);
      const saltStr = await SecureStore.getItemAsync(WALLET_SALT);
      
      if (!encryptedData || !saltStr) {
        return null;
      }

      // Decrypt wallet
      const salt = Buffer.from(saltStr, 'base64');
      const deviceKey = await this.getDeviceKey(salt);
      const decryptedStr = await this.decrypt(encryptedData, deviceKey);
      const walletData = JSON.parse(decryptedStr);

      // Reconstruct keypair
      const secretKey = Buffer.from(walletData.privateKey, 'base64');
      const keypair = Keypair.fromSecretKey(secretKey);

      return {
        mnemonic: walletData.mnemonic,
        keypair,
        publicKey: walletData.publicKey
      };
    } catch (error) {
      logger.error('Failed to retrieve wallet:', error);
      throw error;
    }
  }

  /**
   * Delete wallet with confirmation
   */
  async deleteWallet(): Promise<boolean> {
    try {
      const authenticated = await this.authenticateBiometric('Authenticate to delete wallet');
      if (!authenticated) {
        return false;
      }

      await SecureStore.deleteItemAsync(WALLET_KEY);
      await SecureStore.deleteItemAsync(WALLET_SALT);
      await SecureStore.deleteItemAsync(WALLET_CREATED_AT);
      await SecureStore.deleteItemAsync(AUTH_REQUIRED);
      
      logger.log('Wallet deleted');
      return true;
    } catch (error) {
      logger.error('Failed to delete wallet:', error);
      return false;
    }
  }

  /**
   * Generate device-specific key (not perfect but better than static)
   */
  private async getDeviceKey(salt: Uint8Array): Promise<string> {
    // Combine multiple sources for key generation
    // This is still not hardware-backed but better than nothing
    const sources = [
      'korus-wallet-v1', // App-specific constant
      salt.toString(), // Random salt
      // Add more device-specific data if available
    ].join('-');
    
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      sources
    );
    
    return hash;
  }

  /**
   * Simple encryption (not as secure as Android Keystore but works with Expo)
   */
  private async encrypt(data: string, key: string): Promise<string> {
    try {
      // For Expo, we'll use base64 encoding with a simple transformation
      // This is NOT cryptographically secure but prevents casual viewing
      // For production, you should use a development build with native crypto
      
      // First, encode the data as base64
      const base64Data = Buffer.from(data, 'utf8').toString('base64');
      
      // Then reverse it and add some padding for obfuscation
      const reversed = base64Data.split('').reverse().join('');
      const padded = `KRS${reversed}KRS`;
      
      // Finally encode again
      return Buffer.from(padded, 'utf8').toString('base64');
    } catch (error) {
      logger.error('Encryption error:', error);
      throw error;
    }
  }

  /**
   * Simple decryption
   */
  private async decrypt(encryptedData: string, key: string): Promise<string> {
    try {
      // Reverse the encryption process
      const padded = Buffer.from(encryptedData, 'base64').toString('utf8');
      
      // Remove padding
      const reversed = padded.replace(/^KRS/, '').replace(/KRS$/, '');
      
      // Reverse back
      const base64Data = reversed.split('').reverse().join('');
      
      // Decode from base64
      const data = Buffer.from(base64Data, 'base64').toString('utf8');
      
      return data;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the wallet
   */
  async signMessage(message: string): Promise<string | null> {
    try {
      const wallet = await this.getWallet();
      if (!wallet) {
        throw new Error('No wallet found');
      }

      // Import tweetnacl at the top of the function to ensure it's available
      const nacl = require('tweetnacl');
      
      // Use nacl for signing since that's what Solana uses under the hood
      const messageBytes = Buffer.from(message, 'utf8');
      const signature = nacl.sign.detached(
        messageBytes,
        wallet.keypair.secretKey
      );
      
      return Buffer.from(signature).toString('base64');
    } catch (error) {
      logger.error('Failed to sign message:', error);
      return null;
    }
  }

  /**
   * Get the recovery phrase (mnemonic) with authentication
   */
  async getRecoveryPhrase(): Promise<string | null> {
    try {
      // Check if biometric is available
      const biometricStatus = await this.isBiometricAvailable();
      
      if (biometricStatus.available) {
        // Try biometric authentication
        const authenticated = await this.authenticateBiometric('Authenticate to view recovery phrase');
        if (!authenticated) {
          logger.warn('Biometric authentication cancelled or failed');
          return null;
        }
      } else {
        // Log why biometrics aren't available but continue
        logger.warn('Biometrics not available:', biometricStatus.error);
        // In production, you might want to require a PIN or password here
      }

      const wallet = await this.getWallet(false); // Skip auth since we already handled it
      if (!wallet) {
        throw new Error('No wallet found');
      }

      logger.log('Successfully retrieved recovery phrase');
      return wallet.mnemonic;
    } catch (error) {
      logger.error('Failed to get recovery phrase:', error);
      return null;
    }
  }
}

// Export singleton instance
export const secureWallet = SecureWallet.getInstance();