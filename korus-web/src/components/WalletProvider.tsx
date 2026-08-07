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

// Forget the previously selected wallet on every full page load — at module
// scope, so it runs before WalletProvider reads the key during first render.
//
// The adapter persists the chosen wallet under `walletName`, and with
// autoConnect on it silently reattaches an approved extension on refresh: the
// user landed on the site already "connected" to a wallet they never clicked
// this session. Clearing the key here means every page load starts genuinely
// disconnected ("Select Wallet"), while autoConnect stays on for the one thing
// it is needed for: the stock modal only calls select(), and it is autoConnect
// that then runs adapter.connect() and opens the wallet's popup.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('walletName');
  } catch {
    // Storage unavailable (private mode) — nothing persisted anyway.
  }

  // Also detach at the extension level. Wallets keep their own list of approved
  // sites and reconnect silently when the page reloads — clearing `walletName`
  // alone stops OUR adapter reattaching, but the extension can still hand back
  // an already-approved session with no prompt. Disconnecting here makes the
  // next connect a real approval request, so the wallet's popup appears every
  // visit.
  const detachAll = () => {
    const detach = (provider: unknown) => {
      const p = provider as { disconnect?: () => Promise<void> } | undefined;
      if (typeof p?.disconnect === 'function') p.disconnect().catch(() => {});
    };
    const w = window as unknown as {
      phantom?: { solana?: unknown };
      solflare?: unknown;
      backpack?: unknown;
      solana?: unknown;
    };
    detach(w.phantom?.solana);
    detach(w.solflare);
    detach(w.backpack);
    detach(w.solana);
  };

  // Extensions inject their providers after this module evaluates, so sweep a
  // few times over the first second rather than once immediately.
  detachAll();
  let ticks = 0;
  const timer = setInterval(() => {
    detachAll();
    if (++ticks >= 5) clearInterval(timer);
  }, 200);
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
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
