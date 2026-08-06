'use client';

import { FC, ReactNode, useEffect, useMemo } from 'react';
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

  // One-time cleanup of the wallet name persisted before the adapter fix.
  // The adapter stores the last selected wallet under `walletName` and
  // autoConnect replays it on load — so a selection made while the buggy
  // legacy Phantom adapter was registered kept reconnecting to the wrong
  // extension (picking Phantom, opening Backpack) even after the fix shipped.
  // Clearing it once forces a fresh, correct choice.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const MIGRATION_KEY = 'korus_wallet_adapter_reset_v1';
    if (localStorage.getItem(MIGRATION_KEY)) return;
    try {
      localStorage.removeItem('walletName');
    } catch {
      // Storage unavailable (private mode) — nothing to migrate.
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/*
        autoConnect reconnects the previously selected wallet silently. That is
        the desired behaviour once a user has deliberately chosen one, and the
        migration above ensures the stored choice is not a stale bad value.
      */}
      <WalletProvider wallets={wallets} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
