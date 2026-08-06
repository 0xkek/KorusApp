'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useState } from 'react';
import Image from 'next/image';
import { CustomWalletModal } from './CustomWalletModal';

export const CustomWalletButton = ({ className }: { className?: string }) => {
  const { connected, disconnect, publicKey, wallet } = useWallet();
  const { isAuthenticated } = useWalletAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDisconnect = async () => {
    setShowMenu(false);
    await disconnect();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletName');
      localStorage.removeItem('authToken');
    }
  };

  // Show the address only once the user is actually signed in to Korus.
  // `connected` alone reflects the extension's own session — an extension that
  // still has this site approved reports connected on load, so the button
  // showed a remembered address before the user had done anything.
  if (connected && publicKey && isAuthenticated) {
    const addr = publicKey.toBase58();
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-[var(--color-border-light)] hover:bg-white/[0.1] transition-colors ${className || ''}`}
        >
          {wallet?.adapter.icon && (
            <Image
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              width={20}
              height={20}
              className="rounded-sm"
            />
          )}
          <span className="text-[var(--color-text)] text-sm font-medium">
            {addr.slice(0, 4)}...{addr.slice(-4)}
          </span>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-lg shadow-xl shadow-black/40 overflow-hidden min-w-[160px]">
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigator.clipboard.writeText(addr);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-white/[0.06] transition-colors"
              >
                Copy Address
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/[0.06] transition-colors"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 ${className || ''}`}
        style={{
          background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
          color: '#000000',
        }}
      >
        Connect Wallet
      </button>
      <CustomWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
