'use client';

import { FC, ReactNode, useMemo } from 'react';
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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
