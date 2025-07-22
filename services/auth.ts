import * as SecureStore from 'expo-secure-store';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { ApiService } from './api';
import { logger } from '../utils/logger';
import { withErrorHandling, ValidationError } from '../utils/errorHandler';

const AUTH_TOKEN_KEY = 'korus_auth_token';
const AUTH_USER_KEY = 'korus_auth_user';

export interface AuthUser {
  id: string;
  walletAddress: string;
  username?: string;
  bio?: string;
  avatar?: string;
  nftAvatar?: any;
  isPremium: boolean;
  createdAt: string;
}

export class AuthService {
  private static currentUser: AuthUser | null = null;
  private static authToken: string | null = null;

  // Initialize auth from stored credentials
  static async initialize(): Promise<boolean> {
    return await withErrorHandling(async () => {
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        this.authToken = storedToken;
        this.currentUser = JSON.parse(storedUser);
        ApiService.setAuthToken(storedToken);

        // Verify token is still valid
        try {
          const response = await ApiService.auth.verify();
          this.currentUser = response.user;
          await this.saveAuthData(storedToken, response.user);
          return true;
        } catch (error) {
          // Token invalid, clear auth
          await this.clearAuth();
          return false;
        }
      }

      return false;
    }, 'AuthService.initialize', { fallbackValue: false }) || false;
  }

  // Generate message for wallet signature
  static generateSignatureMessage(): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    return `Sign this message to authenticate with Korus\n\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
  }

  // Verify wallet signature
  static verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }

  // Sign in with wallet
  static async signIn(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ): Promise<AuthUser> {
    return await withErrorHandling(async () => {
      // Validate wallet address
      if (!walletAddress || walletAddress.length < 32) {
        throw new ValidationError('Invalid wallet address');
      }

      // Generate and sign message
      const message = this.generateSignatureMessage();
      const signature = await signMessage(message);

      if (!signature) {
        throw new ValidationError('Signature required');
      }

      // For development, skip signature verification
      // In production, enable this:
      // if (!this.verifySignature(message, signature, walletAddress)) {
      //   throw new ValidationError('Invalid signature');
      // }

      // Attempt login
      try {
        const response = await ApiService.auth.login(walletAddress, signature);
        await this.saveAuthData(response.token, response.user);
        return response.user;
      } catch (error: any) {
        // If user doesn't exist, register them
        if (error.statusCode === 404) {
          const response = await ApiService.auth.register(walletAddress, signature);
          await this.saveAuthData(response.token, response.user);
          return response.user;
        }
        throw error;
      }
    }, 'AuthService.signIn') as AuthUser;
  }

  // Sign out
  static async signOut(): Promise<void> {
    await withErrorHandling(async () => {
      // Call logout endpoint
      try {
        await ApiService.auth.logout();
      } catch (error) {
        // Ignore logout errors
        logger.error('Logout error:', error);
      }

      // Clear local auth
      await this.clearAuth();
    }, 'AuthService.signOut');
  }

  // Update user profile
  static async updateProfile(data: {
    username?: string;
    bio?: string;
    avatar?: string;
    nftAvatar?: any;
  }): Promise<AuthUser> {
    return await withErrorHandling(async () => {
      const response = await ApiService.users.updateProfile(data);
      this.currentUser = response.user;
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(response.user));
      return response.user;
    }, 'AuthService.updateProfile') as AuthUser;
  }

  // Get current user
  static getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Get auth token
  static getAuthToken(): string | null {
    return this.authToken;
  }

  // Check if authenticated
  static isAuthenticated(): boolean {
    return !!this.authToken && !!this.currentUser;
  }

  // Private methods
  private static async saveAuthData(token: string, user: AuthUser): Promise<void> {
    this.authToken = token;
    this.currentUser = user;
    ApiService.setAuthToken(token);

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  }

  private static async clearAuth(): Promise<void> {
    this.authToken = null;
    this.currentUser = null;
    ApiService.setAuthToken(null);

    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
  }
}

// Hook for React components
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(AuthService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AuthService.initialize().then(() => {
      setUser(AuthService.getCurrentUser());
      setIsLoading(false);
    });
  }, []);

  const signIn = async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    const authUser = await AuthService.signIn(walletAddress, signMessage);
    setUser(authUser);
    return authUser;
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  const updateProfile = async (data: Parameters<typeof AuthService.updateProfile>[0]) => {
    const updatedUser = await AuthService.updateProfile(data);
    setUser(updatedUser);
    return updatedUser;
  };

  return {
    user,
    isLoading,
    isAuthenticated: AuthService.isAuthenticated(),
    signIn,
    signOut,
    updateProfile,
  };
}