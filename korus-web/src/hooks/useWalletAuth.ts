/**
 * Wallet Authentication Hook
 * Handles wallet-based authentication with the backend
 */

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { authAPI } from '@/lib/api';
import bs58 from 'bs58';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: string | null;
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isAuthenticating: false,
    error: null,
  });
  const authInProgressRef = useRef(false);

  // Authenticate with backend when wallet connects
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || !connected) {
      setAuthState(prev => ({ ...prev, isAuthenticated: false, token: null }));
      return;
    }

    // Prevent multiple simultaneous authentication attempts
    if (authInProgressRef.current) {
      console.log('Authentication already in progress, skipping...');
      return;
    }

    authInProgressRef.current = true;
    setAuthState(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {

      // Create a message to sign
      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Send to backend for verification
      const response = await authAPI.loginWithWallet({
        walletAddress: publicKey.toBase58(),
        signature: signatureBase58,
        message,
      });

      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token);
      }

      setAuthState({
        token: response.token,
        isAuthenticated: true,
        isAuthenticating: false,
        error: null,
      });
      authInProgressRef.current = false;
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthState({
        token: null,
        isAuthenticated: false,
        isAuthenticating: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
      authInProgressRef.current = false;
    }
  }, [publicKey, signMessage, connected]);

  // Load token from storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken && connected) {
        setAuthState(prev => ({
          ...prev,
          token: storedToken,
          isAuthenticated: true,
        }));
      }
    }
  }, [connected]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      setAuthState({
        token: null,
        isAuthenticated: false,
        isAuthenticating: false,
        error: null,
      });
    }
  }, [connected]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    setAuthState({
      token: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,
    });
  }, []);

  return {
    ...authState,
    authenticate,
    logout,
  };
}
