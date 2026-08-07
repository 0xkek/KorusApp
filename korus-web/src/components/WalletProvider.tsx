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

/**
 * Standard wallet-adapter setup, matching the library's documented example.
 *
 * ConnectionProvider > WalletProvider > WalletModalProvider, with an empty
 * `wallets` array because Phantom, Solflare, Backpack and Jupiter all register
 * themselves via Wallet Standard and are detected automatically.
 *
 * This whole tree is loaded with ssr: false by WalletProviderClient, because
 * the server has no access to the browser's wallet and rendering any of it
 * server-side produces a hydration mismatch (React #418) that aborts hydration
 * and leaves the page non-interactive.
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
