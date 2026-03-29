'use client';
import Image from 'next/image';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useEffect, useRef } from 'react';

export const CustomWalletModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { wallets, select } = useWallet();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately from the button click that opened it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const allowedWalletNames = ['Phantom', 'Solflare', 'Backpack'];
  const solanaWallets = wallets.filter(wallet =>
    allowedWalletNames.includes(wallet.adapter.name)
  );

  const installedWallets = solanaWallets.filter(
    wallet => wallet.readyState === WalletReadyState.Installed
  );
  const notInstalledWallets = solanaWallets.filter(
    wallet => wallet.readyState !== WalletReadyState.Installed
  );

  const handleWalletClick = async (walletName: WalletName) => {
    select(walletName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-32">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — compact, clean */}
      <div
        ref={modalRef}
        className="relative z-10 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-2xl shadow-black/50 w-full max-w-sm mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[var(--color-text)] text-base font-semibold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-white/[0.08] text-neutral-500 hover:text-[var(--color-text)] transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet list */}
        <div className="px-3 pb-3">
          {installedWallets.map((wallet) => (
            <button
              key={wallet.adapter.name}
              onClick={() => handleWalletClick(wallet.adapter.name)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition-colors group"
            >
              {wallet.adapter.icon && (
                <Image
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  width={32}
                  height={32}
                  className="rounded-md"
                />
              )}
              <span className="text-[var(--color-text)] text-sm font-medium flex-1 text-left">
                {wallet.adapter.name}
              </span>
              <span className="text-xs text-emerald-400 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                Detected
              </span>
            </button>
          ))}

          {notInstalledWallets.length > 0 && installedWallets.length > 0 && (
            <div className="border-t border-[var(--color-border-light)] my-2" />
          )}

          {notInstalledWallets.map((wallet) => (
            <button
              key={wallet.adapter.name}
              onClick={() => handleWalletClick(wallet.adapter.name)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition-colors group opacity-60 hover:opacity-100"
            >
              {wallet.adapter.icon && (
                <Image
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  width={32}
                  height={32}
                  className="rounded-md"
                />
              )}
              <span className="text-[var(--color-text)] text-sm font-medium flex-1 text-left">
                {wallet.adapter.name}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                Install
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        {installedWallets.length === 0 && (
          <div className="px-5 pb-4 pt-1 border-t border-[var(--color-border-light)]">
            <p className="text-[var(--color-text-secondary)] text-xs mb-2">No wallets detected</p>
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-korus-primary hover:text-korus-secondary transition-colors text-xs font-medium"
            >
              Get Phantom Wallet &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
