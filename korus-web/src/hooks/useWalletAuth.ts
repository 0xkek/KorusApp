/**
 * Wallet Authentication Hook
 * Handles wallet-based authentication with the backend
 * Uses Zustand for state management
 */

import { logger } from '@/utils/logger';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useCallback, useRef } from 'react';
import { authAPI } from '@/lib/api';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';

const isDev = process.env.NODE_ENV === 'development';

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();

  // Ref guard to prevent duplicate authenticate() calls
  const authAttemptedRef = useRef(false);

  // Use Zustand store for state management
  const {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    setToken,
    setAuthenticating,
    setError,
    setLastAuthTime,
    setHasAttemptedAuth,
    clearAuth,
  } = useAuthStore();

  // Authenticate with backend when wallet connects
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || !connected) {
      clearAuth();
      return;
    }

    // Read isAuthenticating synchronously from store to avoid stale closure
    const { isAuthenticating: currentlyAuthenticating } = useAuthStore.getState();

    // Prevent multiple simultaneous authentication attempts
    if (currentlyAuthenticating) {
      logger.log('Authentication already in progress, skipping...');
      return;
    }

    setAuthenticating(true);
    setError(null);

    // Set a timeout to force reset if wallet signature takes too long
    const timeoutId = setTimeout(() => {
      logger.log('Authentication timeout - resetting state');
      setError('Authentication timed out. Please try again.');
      setAuthenticating(false);
      authAttemptedRef.current = false; // Allow retry after timeout
    }, 30000); // 30 second timeout

    try {
      logger.log('Starting wallet authentication...');

      // Create a message to sign
      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      logger.log('Requesting signature from wallet...');
      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      logger.log('Signature received, verifying with backend...');
      // Send to backend for verification
      const response = await authAPI.loginWithWallet({
        walletAddress: publicKey.toBase58(),
        signature: signatureBase58,
        message,
      });

      // Clear timeout on success
      clearTimeout(timeoutId);

      logger.log('Authentication successful!');
      // Store token (Zustand will also persist it)
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token);
      }

      // Update auth state via Zustand
      setToken(response.token);
      setLastAuthTime(Date.now());
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      // Handle wallet rejection gracefully
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      const isUserRejection = errorMessage.includes('closed') ||
                              errorMessage.includes('rejected') ||
                              errorMessage.includes('cancelled') ||
                              errorMessage.includes('Plugin Closed') ||
                              errorMessage.includes('User rejected');

      // Silently fail for user cancellations - don't log errors
      if (!isUserRejection) {
        logger.error('Authentication failed:', error);
      } else {
        logger.log('User cancelled authentication');
      }

      // Update error state (don't show error for user cancellation)
      setError(isUserRejection ? null : errorMessage);
      setAuthenticating(false);
      // Only allow retry for non-user-rejection errors (e.g. network errors)
      // User rejections should NOT reset the ref, or we get an infinite popup loop
      if (!isUserRejection) {
        authAttemptedRef.current = false;
      }
    }
  }, [publicKey, signMessage, connected, setAuthenticating, setError, setToken, setLastAuthTime, clearAuth]);

  // Load token from storage on mount and handle auth when wallet connects
  useEffect(() => {
    if (typeof window !== 'undefined' && connected && publicKey) {
      // Read token and isAuthenticating synchronously from store
      const { token: currentToken, isAuthenticating: currentlyAuthenticating } = useAuthStore.getState();

      const storedToken = localStorage.getItem('authToken');

      if (storedToken && !currentToken) {
        // Token exists in localStorage but not in Zustand store
        if (isDev) logger.log('Found stored auth token, updating store');
        setToken(storedToken);
        setHasAttemptedAuth(true);
        authAttemptedRef.current = true;
      } else if (!storedToken && !currentlyAuthenticating && !currentToken && !authAttemptedRef.current) {
        // No token, not authenticating, not yet attempted — trigger auth
        if (isDev) logger.log('No stored token found, triggering authentication...');
        authAttemptedRef.current = true;
        useAuthStore.getState().setHasAttemptedAuth(true);
        authenticate();
      }
    } else if (!connected) {
      // Reset ref when wallet disconnects so re-connect triggers auth
      authAttemptedRef.current = false;
    }
    // Only re-run when wallet connection state actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Clear auth when wallet disconnects OR changes
  useEffect(() => {
    if (!connected) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      clearAuth();
    }
  }, [connected, clearAuth]);

  // Clear auth when publicKey changes (wallet switch)
  useEffect(() => {
    // Store the current publicKey to detect changes
    const currentWallet = publicKey?.toBase58();
    if (currentWallet && typeof window !== 'undefined') {
      const storedWallet = localStorage.getItem('currentWallet');

      if (storedWallet && storedWallet !== currentWallet) {
        // Wallet changed - clear old auth
        logger.log('Wallet changed, clearing old auth');
        localStorage.removeItem('authToken');
        clearAuth();
        authAttemptedRef.current = false; // Allow auth for new wallet
      }

      // Update stored wallet
      localStorage.setItem('currentWallet', currentWallet);
    }
  }, [publicKey, clearAuth]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    clearAuth();
    authAttemptedRef.current = false;
  }, [clearAuth]);

  return {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate,
    logout,
  };
}
