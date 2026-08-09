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

import { useCallback, useState } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
// Imported explicitly rather than relying on the global the polyfill installs,
// so this file typechecks without pulling in Node types.
import { Buffer } from 'buffer';
import { api } from '../api/client';

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
  isBusy: boolean;
  error: string | null;
}

export function useWalletAuth() {
  const [state, setState] = useState<WalletAuthState>({
    walletAddress: null,
    token: null,
    user: null,
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
        isBusy: false,
        error: null,
      });
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

  const signOut = useCallback(() => {
    setState({
      walletAddress: null,
      token: null,
      user: null,
      isBusy: false,
      error: null,
    });
  }, []);

  return { ...state, connectAndSignIn, signOut };
}
