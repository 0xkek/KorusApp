'use client';

import { FC, ReactNode, useCallback, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

/**
 * Standard wallet-adapter setup, per the library's own docs.
 *
 * - `wallets` is empty: Phantom, Solflare, Backpack and Jupiter all register
 *   themselves through Wallet Standard and are detected automatically. Passing
 *   a legacy adapter as well creates a second entry for the same wallet that
 *   resolves through window.phantom — which other extensions also inject — so
 *   picking one wallet could open another.
 * - `autoConnect` reattaches a previously approved wallet. It does not sign
 *   anything; authentication is a separate, explicit step.
 * - `WalletModalProvider` supplies the connect modal, so none of it is
 *   hand-rolled.
 */
export const WalletContextProvider: FC<Props> = ({ children }) => {
  const network = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;
  }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(() => [], []);

  // console.error, not the app logger, which is stripped in production — a
  // failed connection is exactly the thing that must stay visible there.
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
