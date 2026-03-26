'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { CustomWalletModal } from './CustomWalletModal';

export const CustomWalletButton = () => {
  const { connected, disconnect, publicKey } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDisconnect = async () => {
    await disconnect();
    // Also clear local storage to prevent auto-reconnect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletName');
    }
  };

  if (connected && publicKey) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-6 py-2 rounded-lg font-semibold transition-all"
        style={{
          background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
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
        className="px-6 py-2 rounded-lg font-semibold transition-all hover:shadow-[0_0_20px_color-mix(in_srgb,var(--korus-primary)_30%,transparent)] hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
          color: '#000000',
        }}
      >
        Select Wallet
      </button>
      <CustomWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
