'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo } from 'react';

/**
 * Set immediately before select() when the user picks a wallet, and cleared on
 * page load. The autoConnect predicate reads it to tell a deliberate choice
 * apart from an eager reconnect.
 */
export const USER_SELECTED_KEY = 'korus_user_selected_wallet';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';


interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Get network from environment variable (mainnet-beta or devnet)
  const network = useMemo(() => {
    const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    return envNetwork === 'mainnet-beta'
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;
  }, []);

  // Use custom RPC endpoint from env or fallback to default
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  // Deliberately empty: every wallet we support (Phantom, Solflare, Backpack,
  // Jupiter) registers itself through Wallet Standard, which
  // @solana/wallet-adapter-react auto-detects.
  //
  // Registering PhantomWalletAdapter explicitly caused a real bug: the legacy
  // adapter resolves through `window.phantom`, which other extensions —
  // Backpack among them — also inject. With both a legacy "Phantom" entry and
  // the Standard one present, selecting Phantom could open Backpack instead.
  // Letting Standard detection own the list means each entry maps to the
  // extension that actually registered it.
  const wallets = useMemo(() => [], []);

  // Clear any wallet name persisted by the previous autoConnect behaviour, so
  // sessions that were silently reconnected start from a clean state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const MIGRATION_KEY = 'korus_wallet_autoconnect_off_v1';
    if (localStorage.getItem(MIGRATION_KEY)) return;
    try {
      localStorage.removeItem('walletName');
    } catch {
      // Storage unavailable (private mode) — nothing to migrate.
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  }, []);

  // autoConnect accepts a predicate, which is how you get "prompt on click, but
  // never reconnect on page load" without hand-rolling anything.
  //
  // WalletProvider distinguishes the two internally: when the user has just
  // picked a wallet it calls adapter.connect() (which prompts), and otherwise
  // adapter.autoConnect() (the silent eager path). Returning true here only
  // after a deliberate selection therefore blocks the silent path while leaving
  // the normal select() -> connect flow intact.
  //
  // Setting autoConnect={false} instead disabled BOTH, which meant select()
  // no longer connected at all and the click had to be reimplemented by hand.
  const autoConnect = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(USER_SELECTED_KEY) === '1';
  }, []);

  // Drop the flag on unload so a fresh page load never counts as a selection.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clear = () => sessionStorage.removeItem(USER_SELECTED_KEY);
    clear();
    window.addEventListener('beforeunload', clear);
    return () => window.removeEventListener('beforeunload', clear);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
