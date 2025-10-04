'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { CustomWalletModal } from './CustomWalletModal';

export const CustomWalletButton = () => {
  const { connected, disconnect, publicKey } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  if (connected && publicKey) {
    return (
      <button
        onClick={disconnect}
        className="px-6 py-2 rounded-lg font-semibold transition-all"
        style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          color: '#000000',
        }}
      >
        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="px-6 py-2 rounded-lg font-semibold transition-all hover:shadow-[0_0_20px_rgba(67,233,123,0.3)] hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          color: '#000000',
        }}
      >
        Select Wallet
      </button>
      <CustomWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
