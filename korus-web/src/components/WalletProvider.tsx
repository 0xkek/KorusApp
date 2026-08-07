'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import type { WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
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

  // autoConnect is plain `true`, which already means "prompt on click, never
  // silently reconnect on load".
  //
  // WalletProvider tracks this itself: it keeps a hasUserSelectedAWallet ref
  // that starts false on every page load and is set by select(). When true it
  // calls adapter.connect() (which prompts); when false it calls
  // adapter.autoConnect() (the silent eager path a wallet may decline). So a
  // reload never connects on its own, and a click always prompts.
  //
  // The sessionStorage predicate that used to live here reimplemented that ref
  // and raced it — the flag was cleared in an effect that runs after the first
  // render, so on a hard refresh a click could set it and the effect could wipe
  // it before the adapter read it. That is why Phantom stopped opening after a
  // hard refresh but worked on warm navigations.

  // Adapter errors are otherwise swallowed entirely: WalletProvider logs
  // nothing by default, so a wallet that refuses to connect looks identical to
  // a click that never registered. Always log, and record the last error so the
  // connect UI can show the user why nothing happened.
  const handleError = useCallback((error: WalletError) => {
    // console.error deliberately, not logger: logger is stripped in production,
    // which is why wallet failures have been completely invisible on the live
    // site. A connection failure is exactly the thing that needs to be visible.
    console.error('[Korus wallet]', error?.name, '—', error?.message, error);
    if (typeof window !== 'undefined') {
      (window as unknown as { __korusWalletError?: unknown }).__korusWalletError = {
        name: error?.name,
        message: error?.message,
        at: new Date().toISOString(),
      };
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={handleError}>
        {/* The official modal from @solana/wallet-adapter-react-ui. It handles
            selection, switching wallets while one is already connected, and the
            connect lifecycle — all of which the previous hand-rolled modal had
            to reimplement, and got wrong in ways that took many rounds to find. */}
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
