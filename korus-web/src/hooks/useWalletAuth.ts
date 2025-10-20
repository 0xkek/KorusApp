/**
 * Wallet Authentication Hook
 * Handles wallet-based authentication with the backend
 * Uses Zustand for state management
 */

import { logger } from '@/utils/logger';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();

  // Use Zustand store for state management
  const {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    hasAttemptedAuth,
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

    setAuthenticating(true);
    setError(null);

    // Set a timeout to force reset if wallet signature takes too long
    const timeoutId = setTimeout(() => {
      logger.log('⏱️ Authentication timeout - resetting state');
      setError('Authentication timed out. Please try again.');
      setAuthenticating(false);
    }, 30000); // 30 second timeout

    try {
      logger.log('🔐 Starting wallet authentication...');

      // Create a message to sign
      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      logger.log('📝 Requesting signature from wallet...');
      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      logger.log('✅ Signature received, verifying with backend...');
      // Send to backend for verification
      const response = await authAPI.loginWithWallet({
        walletAddress: publicKey.toBase58(),
        signature: signatureBase58,
        message,
      });

      // Clear timeout on success
      clearTimeout(timeoutId);

      logger.log('✅ Authentication successful!');
      // Store token (Zustand will also persist it)
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token);
      }

      // Update auth state via Zustand
      setToken(response.token);
      setLastAuthTime(Date.now());
      logger.log('✅ Auth state updated in Zustand store');
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
        logger.error('❌ Authentication failed:', error);
      } else {
        logger.log('🚫 User cancelled authentication');
      }

      // Update error state (don't show error for user cancellation)
      setError(isUserRejection ? null : errorMessage);
      setAuthenticating(false);
    }
  }, [publicKey, signMessage, connected, setAuthenticating, setError, setToken, setLastAuthTime, clearAuth]);

  // Load token from storage on mount and check if still valid
  useEffect(() => {
    logger.log('🔍 Auth effect running:', {
      hasWindow: typeof window !== 'undefined',
      connected,
      hasPublicKey: !!publicKey,
      publicKey: publicKey?.toBase58(),
      hasAttemptedAuth
    });

    if (typeof window !== 'undefined' && connected && publicKey) {
      const storedToken = localStorage.getItem('authToken');
      logger.log('🔑 Checking for stored token:', { hasToken: !!storedToken, hasAttemptedAuth });

      if (storedToken && !token) {
        // Token exists in localStorage but not in Zustand store
        logger.log('📦 Found stored auth token, updating store');
        setToken(storedToken);
        setHasAttemptedAuth(true);
      } else if (!storedToken && !isAuthenticating && !token) {
        // Check if we can attempt auth - use getState() for synchronous access
        const currentState = useAuthStore.getState();
        if (currentState.canAttemptAuth()) {
          // No token exists, trigger authentication only once
          logger.log('🔓 No stored token found, triggering authentication...');
          // Set flag synchronously BEFORE calling authenticate to prevent race conditions
          useAuthStore.getState().setHasAttemptedAuth(true);
          authenticate();
        } else {
          logger.log('⏸️ Already attempted auth or in cooldown');
        }
      }
    } else {
      logger.log('⚠️ Auth conditions not met');
      if (!connected) {
        // Reset when disconnected
        setHasAttemptedAuth(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, token, isAuthenticating, setToken]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      clearAuth();
    }
  }, [connected, clearAuth]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    clearAuth();
  }, [clearAuth]);

  // Log state changes
  useEffect(() => {
    logger.log('🔐 useWalletAuth state changed:', {
      hasToken: !!token,
      isAuthenticated,
      isAuthenticating,
      tokenLength: token?.length || 0
    });
  }, [token, isAuthenticated, isAuthenticating]);

  return {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate,
    logout,
  };
}
