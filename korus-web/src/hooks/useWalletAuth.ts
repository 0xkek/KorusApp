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

// Global flag to prevent multiple simultaneous auth attempts across all instances
// This persists across React StrictMode re-renders
let globalAuthInProgress = false;

// Track last successful auth to avoid re-prompting too quickly
let lastAuthTime: number | null = null;
const AUTH_COOLDOWN_MS = 5000; // Don't re-auth within 5 seconds

// Generate unique instance ID for debugging
let instanceCounter = 0;

// Global auth state that persists across all hook instances
let globalAuthState: AuthState = {
  token: null,
  isAuthenticated: false,
  isAuthenticating: false,
  error: null,
};

// Listeners for state changes
type StateListener = (state: AuthState) => void;
const stateListeners = new Set<StateListener>();

function notifyStateChange(newState: AuthState) {
  globalAuthState = newState;
  stateListeners.forEach(listener => listener(newState));
}

function subscribeToStateChanges(listener: StateListener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [authState, setAuthState] = useState<AuthState>(globalAuthState);
  const authInProgressRef = useRef(false);
  const instanceIdRef = useRef<number>(0);

  // Initialize instance ID only once
  if (instanceIdRef.current === 0) {
    instanceIdRef.current = ++instanceCounter;
  }

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = subscribeToStateChanges((newState) => {
      console.log(`📥 Instance #${instanceIdRef.current} received global state update:`, {
        hasToken: !!newState.token,
        isAuthenticated: newState.isAuthenticated,
      });
      setAuthState(newState);
    });
    return unsubscribe;
  }, []);

  // Authenticate with backend when wallet connects
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || !connected) {
      notifyStateChange({ ...globalAuthState, isAuthenticated: false, token: null });
      return;
    }

    // Prevent multiple simultaneous authentication attempts using global flag
    if (globalAuthInProgress || authInProgressRef.current) {
      console.log('Authentication already in progress, skipping...');
      return;
    }

    // Check if we recently authenticated (cooldown period)
    if (lastAuthTime && (Date.now() - lastAuthTime) < AUTH_COOLDOWN_MS) {
      console.log('⏸️ Recently authenticated, skipping to prevent popup spam');
      return;
    }

    globalAuthInProgress = true;
    authInProgressRef.current = true;
    notifyStateChange({ ...globalAuthState, isAuthenticating: true, error: null });

    // Set a timeout to force reset if wallet signature takes too long
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Authentication timeout - resetting state');
      globalAuthInProgress = false;
      authInProgressRef.current = false;
      notifyStateChange({
        token: null,
        isAuthenticated: false,
        isAuthenticating: false,
        error: 'Authentication timed out. Please try again.',
      });
    }, 30000); // 30 second timeout

    try {
      console.log('🔐 Starting wallet authentication...');

      // Create a message to sign
      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      console.log('📝 Requesting signature from wallet...');
      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      console.log('✅ Signature received, verifying with backend...');
      // Send to backend for verification
      const response = await authAPI.loginWithWallet({
        walletAddress: publicKey.toBase58(),
        signature: signatureBase58,
        message,
      });

      // Clear timeout on success
      clearTimeout(timeoutId);

      console.log('✅ Authentication successful!');
      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token);
      }

      // Record successful auth time
      lastAuthTime = Date.now();

      const newAuthState = {
        token: response.token,
        isAuthenticated: true,
        isAuthenticating: false,
        error: null,
      };
      console.log('🔄 Setting global auth state:', newAuthState);
      notifyStateChange(newAuthState);
      globalAuthInProgress = false;
      authInProgressRef.current = false;
      console.log('✅ Auth state updated and broadcasted to all instances');
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
        console.error('❌ Authentication failed:', error);
      } else {
        console.log('🚫 User cancelled authentication');
      }

      notifyStateChange({
        token: null,
        isAuthenticated: false,
        isAuthenticating: false,
        error: isUserRejection ? null : errorMessage, // Don't show error for user cancellation
      });
      globalAuthInProgress = false;
      authInProgressRef.current = false;
    }
  }, [publicKey, signMessage, connected]);

  // Load token from storage on mount and check if still valid
  useEffect(() => {
    if (typeof window !== 'undefined' && connected && publicKey) {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        // Token exists, mark as authenticated
        console.log('📦 Found stored auth token');
        notifyStateChange({
          ...globalAuthState,
          token: storedToken,
          isAuthenticated: true,
        });
      } else if (!globalAuthInProgress && !authInProgressRef.current && !globalAuthState.isAuthenticating) {
        // No token exists, trigger authentication only once
        console.log('🔓 No stored token found, triggering authentication...');
        authenticate();
      }
    }
  }, [connected, publicKey]); // Removed authenticate from deps to prevent multiple triggers

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      notifyStateChange({
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
    notifyStateChange({
      token: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,
    });
  }, []);

  // Log state changes
  useEffect(() => {
    console.log(`🔐 useWalletAuth instance #${instanceIdRef.current} state changed:`, {
      hasToken: !!authState.token,
      isAuthenticated: authState.isAuthenticated,
      isAuthenticating: authState.isAuthenticating,
      tokenLength: authState.token?.length || 0
    });
  }, [authState]);

  return {
    ...authState,
    authenticate,
    logout,
  };
}
