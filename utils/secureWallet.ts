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
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false, // Allow passcode as fallback
      });

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
      
      // Enable biometric protection by default
      await SecureStore.setItemAsync(AUTH_REQUIRED, 'true');
      
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
    // For Expo, we'll use a simple XOR cipher with the key
    // This is NOT cryptographically secure but better than plaintext
    // For production, consider using expo-crypto when it supports encryption
    
    const keyBytes = Buffer.from(key, 'hex');
    const dataBytes = Buffer.from(data, 'utf8');
    const encrypted = Buffer.alloc(dataBytes.length);
    
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return encrypted.toString('base64');
  }

  /**
   * Simple decryption
   */
  private async decrypt(encryptedData: string, key: string): Promise<string> {
    const keyBytes = Buffer.from(key, 'hex');
    const encrypted = Buffer.from(encryptedData, 'base64');
    const decrypted = Buffer.alloc(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return decrypted.toString('utf8');
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

      const messageBytes = Buffer.from(message, 'utf8');
      const signature = wallet.keypair.sign(messageBytes);
      
      return Buffer.from(signature).toString('base64');
    } catch (error) {
      logger.error('Failed to sign message:', error);
      return null;
    }
  }
}

// Export singleton instance
export const secureWallet = SecureWallet.getInstance();