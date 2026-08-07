'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
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
 * A wallet extension can still expose an already-approved adapter during the
 * first React render, even when Korus has removed its saved wallet name. Reset
 * that adapter before rendering the application so a returning visitor never
 * sees an address or sign-in state before choosing a wallet themselves.
 */
function WalletStartupReset({ onComplete }: { onComplete: () => void }) {
  const { select } = useWallet();
  const hasReset = useRef(false);

  useEffect(() => {
    if (hasReset.current) return;
    hasReset.current = true;

    try {
      localStorage.removeItem(WALLET_SELECTION_KEY);
      localStorage.removeItem('walletName');
    } catch {
      // Storage unavailable — select(null) still removes the live adapter.
    }

    // WalletProvider disconnects the previously selected adapter as part of
    // changing the selection. This is intentionally synchronous so no
    // extension can remain connected while the welcome screen is visible.
    select(null);
    onComplete();
  }, [onComplete, select]);

  return null;
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
  const [isSessionReset, setIsSessionReset] = useState(false);
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

  const completeSessionReset = useCallback(() => {
    setIsSessionReset(true);
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
        // Keep connection disabled until WalletStartupReset has removed any
        // adapter inherited from an older page or a previous deployment.
        autoConnect={isSessionReset}
        localStorageKey={WALLET_SELECTION_KEY}
        onError={onError}
      >
        <WalletStartupReset onComplete={completeSessionReset} />
        <WalletModalProvider>
          {/* Do not let a stale adapter flash an address or sign-in state. */}
          {isSessionReset ? children : null}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
