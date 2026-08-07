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
if (typeof window !== 'undefined') {
  try {
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
      {/* autoConnect MUST stay false. With it on, the adapter reconnects
          whatever session the extension still offers, so a reload landed on a
          wallet the user never picked. The button drives connect() from the
          click instead. */}
      <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
