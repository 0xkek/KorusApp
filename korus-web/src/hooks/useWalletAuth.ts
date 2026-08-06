/**
 * Wallet Authentication Hook
 * Handles wallet-based authentication with the backend
 * Uses Zustand for state management
 */

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useCallback, useRef } from 'react';
import { authAPI } from '@/lib/api';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Is this stored JWT still usable for the given wallet?
 *
 * Decodes the payload only — the signature is verified server-side. This is a
 * client-side sanity check so the UI doesn't present an authenticated session
 * built on a token the backend will reject, which previously happened whenever
 * a 7-day-old token (or one issued to a different wallet) sat in localStorage.
 */
function isTokenValidFor(token: string, walletAddress: string): boolean {
  try {
    const [, payloadPart] = token.split('.');
    if (!payloadPart) return false;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));

    // Treat tokens expiring within a minute as already expired.
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + 60_000) {
      return false;
    }
    if (payload.walletAddress && payload.walletAddress !== walletAddress) {
      return false;
    }
    return true;
  } catch {
    // Malformed token — treat as unusable.
    return false;
  }
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();

  // Ref guard to prevent duplicate authenticate() calls
  const authAttemptedRef = useRef(false);
  // Track publicKey string to detect wallet switches without re-renders
  const lastWalletRef = useRef<string | null>(null);

  // Only subscribe to the fields consumers actually need for rendering.
  // All other fields are read synchronously via getState() inside callbacks/effects.
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const error = useAuthStore((s) => s.error);

  // Authenticate with backend when wallet connects
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || !connected) {
      useAuthStore.getState().clearAuth();
      return;
    }

    const state = useAuthStore.getState();

    // Prevent multiple simultaneous authentication attempts
    if (state.isAuthenticating) {
      if (isDev) console.log('[Auth] Already in progress, skipping');
      return;
    }

    state.setAuthenticating(true);
    state.setError(null);

    // Timeout to force reset if wallet signature takes too long
    const timeoutId = setTimeout(() => {
      if (isDev) console.log('[Auth] Timeout — resetting');
      const s = useAuthStore.getState();
      s.setError('Authentication timed out. Please try again.');
      s.setAuthenticating(false);
      authAttemptedRef.current = false;
    }, 30000);

    try {
      if (isDev) console.log('[Auth] Starting...');

      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      if (isDev) console.log('[Auth] Signature received, verifying...');

      const response = await authAPI.loginWithWallet({
        walletAddress: publicKey.toBase58(),
        signature: signatureBase58,
        message,
      });

      clearTimeout(timeoutId);

      if (isDev) console.log('[Auth] Success');

      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.token);
      }

      // Single batch: setToken sets token + isAuthenticated + clears error
      const s = useAuthStore.getState();
      s.setToken(response.token);
      s.setLastAuthTime(Date.now());
    } catch (err) {
      clearTimeout(timeoutId);

      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      const isUserRejection =
        errorMessage.includes('closed') ||
        errorMessage.includes('rejected') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('Plugin Closed') ||
        errorMessage.includes('User rejected');

      if (!isUserRejection && isDev) {
        console.error('[Auth] Failed:', err);
      }

      const s = useAuthStore.getState();
      s.setError(isUserRejection ? null : errorMessage);
      s.setAuthenticating(false);

      // Only allow retry for non-user-rejection errors
      if (!isUserRejection) {
        authAttemptedRef.current = false;
      }
    }
  }, [publicKey, signMessage, connected]);

  // Main auth effect — runs ONLY when connected/publicKey change
  useEffect(() => {
    if (typeof window === 'undefined' || !connected || !publicKey) {
      if (!connected) {
        authAttemptedRef.current = false;
      }
      return;
    }

    const walletAddress = publicKey.toBase58();

    // Detect wallet switch
    if (lastWalletRef.current && lastWalletRef.current !== walletAddress) {
      if (isDev) console.log('[Auth] Wallet changed, clearing old auth');
      localStorage.removeItem('authToken');
      useAuthStore.getState().clearAuth();
      authAttemptedRef.current = false;
    }
    lastWalletRef.current = walletAddress;

    // Read store synchronously — no re-render from this
    const state = useAuthStore.getState();
    const storedToken = localStorage.getItem('authToken');

    // A stored token is only valid for the wallet it was issued to, and only
    // until it expires. Without these checks a 7-day-old or foreign token was
    // restored verbatim, so the app showed an authenticated session that the
    // backend would reject on the next call.
    const validStoredToken =
      storedToken && isTokenValidFor(storedToken, walletAddress) ? storedToken : null;

    if (storedToken && !validStoredToken) {
      if (isDev) console.log('[Auth] Stored token expired or for another wallet — clearing');
      localStorage.removeItem('authToken');
      useAuthStore.getState().clearAuth();
    }

    if (validStoredToken && !state.token) {
      // Token in localStorage but not in store — restore it
      if (isDev) console.log('[Auth] Restoring stored token');
      state.setToken(validStoredToken);
      state.setHasAttemptedAuth(true);
      authAttemptedRef.current = true;
    } else if (!validStoredToken && !state.isAuthenticating && !state.token && !authAttemptedRef.current) {
      // No token anywhere, not in progress — trigger auth
      if (isDev) console.log('[Auth] No token, triggering authentication');
      authAttemptedRef.current = true;
      state.setHasAttemptedAuth(true);
      authenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Record the daily login once per wallet per day.
  // The backend awards DAILY_LOGIN points and maintains loginStreak, but nothing
  // was calling the endpoint, so streaks never accrued. Covers both fresh auth
  // and restored-token sessions since it keys off the token becoming available.
  useEffect(() => {
    if (typeof window === 'undefined' || !token || !publicKey) return;

    const wallet = publicKey.toBase58();
    const today = new Date().toISOString().slice(0, 10);
    const key = `korus_daily_login:${wallet}`;

    if (localStorage.getItem(key) === today) return;

    let cancelled = false;
    (async () => {
      try {
        const { reputationAPI } = await import('@/lib/api/reputation');
        await reputationAPI.recordDailyLogin(token);
        if (!cancelled) localStorage.setItem(key, today);
      } catch (err) {
        // Non-critical — a missed streak day must never disrupt the session.
        if (isDev) console.warn('[Auth] Daily login record failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, publicKey]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      useAuthStore.getState().clearAuth();
      lastWalletRef.current = null;
    }
  }, [connected]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    useAuthStore.getState().clearAuth();
    authAttemptedRef.current = false;
    lastWalletRef.current = null;
  }, []);

  return {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate,
    logout,
  };
}
