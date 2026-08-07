'use client';

import { FC, ReactNode, useCallback, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// WalletProvider normally persists the last wallet name in localStorage. Korus
// intentionally starts every page load as a fresh sign-in, so use an app-owned
// key and erase it before the provider reads it. Removing the legacy default
// key once also prevents earlier releases from restoring a previous adapter.
const WALLET_SELECTION_KEY = 'korus-wallet-selection';

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(WALLET_SELECTION_KEY);
    localStorage.removeItem('walletName');
  } catch {
    // Storage unavailable (private mode) — nothing persisted anyway.
  }
}

/**
 * Standard wallet-adapter setup, matching the library's documented example.
 *
 * ConnectionProvider > WalletProvider > WalletModalProvider, with an empty
 * `wallets` array because Phantom, Solflare, Backpack and Jupiter all register
 * themselves via Wallet Standard and are detected automatically.
 *
 * The providers render with normal SSR (they emit no wallet-dependent DOM);
 * only WalletMultiButton is loaded with ssr: false, since it renders wallet
 * state the server cannot know.
 */
export const WalletContextProvider: FC<Props> = ({ children }) => {
  const network = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
        ? WalletAdapterNetwork.Mainnet
        : WalletAdapterNetwork.Devnet,
    []
  );

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(() => [], []);

  // console.error rather than the app logger, which is stripped in production —
  // a failed connection has to stay visible there.
  const onError = useCallback((error: WalletError) => {
    console.error('[Korus wallet]', error?.name, '—', error?.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/*
        This is the library's documented select -> connect flow. A page starts
        with no selected adapter because WALLET_SELECTION_KEY was just erased.
        When—and only when—the user selects a wallet in WalletMultiButton, the
        provider records that user selection and calls adapter.connect().

        Do not replace this with an effect that watches `wallet`: that loses
        the identity of the wallet the person clicked and is what previously
        made Phantom open Backpack. With no persisted selection, autoConnect
        cannot reconnect a wallet on page load.
      */}
      <WalletProvider
        wallets={wallets}
        autoConnect
        localStorageKey={WALLET_SELECTION_KEY}
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
