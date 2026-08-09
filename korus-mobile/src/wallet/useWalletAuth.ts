/**
 * Wallet authentication via Mobile Wallet Adapter.
 *
 * Same handshake as the web app — sign a message, POST it to
 * /api/auth/connect, receive a JWT — but the signer is an installed Android
 * wallet reached over MWA rather than a browser extension.
 *
 * Everything happens inside a single transact() session: MWA opens the wallet
 * app, and the session ends when the callback returns. Authorize and sign must
 * both occur within it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
// Imported explicitly rather than relying on the global the polyfill installs,
// so this file typechecks without pulling in Node types.
import { Buffer } from 'buffer';
import { api } from '../api/client';
import { usersAPI } from '../api/users';
import type { UserProfile } from '../api/types';

// Shown in the wallet's approval sheet.
const APP_IDENTITY = {
  name: 'Korus',
  uri: 'https://korus.fun',
  icon: 'favicon.ico', // resolved relative to uri
};

// Must match the network the backend verifies against.
const CHAIN = 'solana:mainnet';

interface AuthResponse {
  token: string;
  user: {
    walletAddress: string;
    username?: string;
    snsUsername?: string;
    nftAvatar?: string;
  };
}

export interface WalletAuthState {
  walletAddress: string | null;
  token: string | null;
  user: AuthResponse['user'] | null;
  /** Full profile, fetched after sign-in and refetched after profile edits. */
  profile: UserProfile | null;
  isBusy: boolean;
  error: string | null;
}

export function useWalletAuth() {
  const [state, setState] = useState<WalletAuthState>({
    walletAddress: null,
    token: null,
    user: null,
    profile: null,
    isBusy: false,
    error: null,
  });

  const connectAndSignIn = useCallback(async () => {
    setState((s) => ({ ...s, isBusy: true, error: null }));

    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: CHAIN,
          identity: APP_IDENTITY,
        });

        const account = authorization.accounts[0];
        // MWA returns the address base64-encoded, not base58.
        const walletAddress = new PublicKey(
          Buffer.from(account.address, 'base64')
        ).toBase58();

        // Message format must match what the backend parses — it extracts and
        // validates the timestamp to reject replays.
        const message = `Sign this message to authenticate with Korus.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;

        const signedMessages = await wallet.signMessages({
          addresses: [account.address],
          payloads: [Buffer.from(message, 'utf8')],
        });

        // signMessages returns the message with the 64-byte signature appended.
        const signed = signedMessages[0];
        const signature = signed.slice(signed.length - 64);

        return {
          walletAddress,
          message,
          signature: bs58.encode(signature),
        };
      });

      const response = await api.post<AuthResponse>('/api/auth/connect', {
        walletAddress: result.walletAddress,
        signature: result.signature,
        message: result.message,
      });

      setState({
        walletAddress: result.walletAddress,
        token: response.token,
        user: response.user,
        profile: null,
        isBusy: false,
        error: null,
      });

      // Non-blocking: the feed is usable before this lands, and it only feeds
      // the profile/edit screens.
      usersAPI
        .getMyProfile(response.token)
        .then((res) => setState((s) => (s.token ? { ...s, profile: res.user } : s)))
        .catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Dismissing the wallet sheet is a normal action, not an error worth
      // shouting about.
      const declined = /decline|reject|cancel|dismiss/i.test(message);
      setState((s) => ({
        ...s,
        isBusy: false,
        error: declined ? null : message,
      }));
    }
  }, []);

  /**
   * The token lives in memory only — by design, there is no persistence, so
   * opening the app fresh always requires connecting and signing again.
   *
   * React state does survive backgrounding while Android keeps the process
   * alive (verified on a Seeker: switching to Phantom and back keeps the same
   * pid), so an app switch to approve something does not cost a re-sign. What
   * it does not survive is Android reclaiming the process under memory
   * pressure. That is indistinguishable from a fresh launch, so note it and
   * let the UI explain rather than silently showing a signed-out header.
   */
  const wasSignedIn = useRef(false);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = state.token;
    if (state.token) wasSignedIn.current = true;
  }, [state.token]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      // Returning to the foreground with the token gone means the process was
      // restarted while we were away.
      setState((s) =>
        wasSignedIn.current && !s.token
          ? { ...s, error: 'Signed out — Korus was closed in the background. Connect again.' }
          : s
      );
    });
    return () => sub.remove();
  }, []);

  const signOut = useCallback(() => {
    wasSignedIn.current = false;
    setState({
      walletAddress: null,
      token: null,
      user: null,
      profile: null,
      isBusy: false,
      error: null,
    });
  }, []);

  /** Refetch after a profile edit so the UI reflects what was saved. */
  const refreshProfile = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await usersAPI.getMyProfile(token);
      setState((cur) => (cur.token ? { ...cur, profile: res.user } : cur));
    } catch {
      // Non-fatal — the save already succeeded.
    }
  }, []);

  return { ...state, connectAndSignIn, signOut, refreshProfile };
}
