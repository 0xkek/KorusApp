/**
 * Wallet authentication.
 *
 * Deliberately minimal. Sign-in happens when the user asks for it and at no
 * other time: nothing here reacts to a wallet becoming connected, because a
 * wallet extension that still has this site approved reattaches on page load,
 * and signing off the back of that put a signature prompt in front of people
 * who had clicked nothing.
 *
 * The only entry point is authenticate(), called from the connect button.
 */

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';

const TOKEN_KEY = 'authToken';

/** Is a stored JWT still usable for this wallet? Signature is verified server-side. */
function isTokenValidFor(token: string, walletAddress: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    // Treat a token expiring within a minute as already expired.
    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now() + 60_000) return false;
    if (claims.walletAddress && claims.walletAddress !== walletAddress) return false;
    return true;
  } catch {
    return false;
  }
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();

  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const error = useAuthStore((s) => s.error);

  // Restore a stored session, or drop it if it is expired or for another wallet.
  // This never signs anything — it only reuses a signature already given.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const store = useAuthStore.getState();

    if (!connected || !publicKey) {
      if (localStorage.getItem(TOKEN_KEY)) {
        localStorage.removeItem(TOKEN_KEY);
        store.clearAuth();
      }
      return;
    }

    const wallet = publicKey.toBase58();
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;

    if (!isTokenValidFor(stored, wallet)) {
      localStorage.removeItem(TOKEN_KEY);
      store.clearAuth();
      return;
    }

    if (!store.token) store.setToken(stored);
  }, [connected, publicKey]);

  const authenticate = useCallback(async () => {
    const store = useAuthStore.getState();

    if (!publicKey || !signMessage || !connected) {
      store.setError('Connect a wallet first.');
      return;
    }
    if (store.isAuthenticating) return;

    store.setAuthenticating(true);
    store.setError(null);

    try {
      const wallet = publicKey.toBase58();
      const message = `Sign this message to authenticate with Korus.\n\nWallet: ${wallet}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(new TextEncoder().encode(message));

      const response = await authAPI.loginWithWallet({
        walletAddress: wallet,
        signature: bs58.encode(signature),
        message,
      });

      localStorage.setItem(TOKEN_KEY, response.token);
      useAuthStore.getState().setToken(response.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      // Dismissing the wallet prompt is a normal action, not an error to shout about.
      const userDeclined = /reject|denied|cancel|closed|plugin closed/i.test(message);
      console.error('[Korus auth]', message);
      useAuthStore.getState().setError(userDeclined ? null : message);
    } finally {
      useAuthStore.getState().setAuthenticating(false);
    }
  }, [publicKey, signMessage, connected]);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('walletName');
    }
    useAuthStore.getState().clearAuth();
    try {
      await disconnect();
    } catch {
      // Already disconnected.
    }
  }, [disconnect]);

  return { token, isAuthenticated, isAuthenticating, error, authenticate, logout };
}
