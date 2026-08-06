'use client';
import Image from 'next/image';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useEffect, useRef } from 'react';

export const CustomWalletModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { wallets, select, connect, wallet } = useWallet();
  const modalRef = useRef<HTMLDivElement>(null);
  // Set when the user picks a wallet, so the effect below knows to connect once
  // the adapter has actually switched to it.
  const pendingConnectRef = useRef<WalletName | null>(null);

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

  // Runs after select() has propagated and `wallet` reflects the user's choice.
  // Declared before the early return below so it still fires once the modal has
  // closed itself on click.
  useEffect(() => {
    const pending = pendingConnectRef.current;
    if (!pending || wallet?.adapter.name !== pending) return;

    pendingConnectRef.current = null;
    connect().catch(() => {
      // User dismissed the extension prompt, or it is locked — the adapter
      // surfaces this through its own error state; nothing to do here.
    });
  }, [wallet, connect]);

  if (!open) return null;

  const allowedWalletNames = ['Phantom', 'Solflare', 'Backpack', 'Jupiter'];
  // Deduplicate by adapter name. If the same wallet is ever registered twice
  // (e.g. a legacy adapter alongside its Wallet Standard registration), two
  // identical rows appear and selecting one can hand off to the other
  // extension. Prefer the entry reporting Installed.
  const solanaWallets = Array.from(
    wallets
      .filter(wallet => allowedWalletNames.includes(wallet.adapter.name))
      .reduce((acc, wallet) => {
        const existing = acc.get(wallet.adapter.name);
        if (!existing || wallet.readyState === WalletReadyState.Installed) {
          acc.set(wallet.adapter.name, wallet);
        }
        return acc;
      }, new Map<string, (typeof wallets)[number]>())
      .values()
  );

  const installedWallets = solanaWallets.filter(
    wallet => wallet.readyState === WalletReadyState.Installed
  );
  const notInstalledWallets = solanaWallets.filter(
    wallet => wallet.readyState !== WalletReadyState.Installed
  );

  // select() only tells the adapter which wallet to use — it does not open the
  // extension. autoConnect used to perform the actual connect(); with it off
  // (so nothing connects without user approval) the click must call connect()
  // itself, once the adapter has switched to the chosen wallet.
  const handleWalletClick = (walletName: WalletName) => {
    pendingConnectRef.current = walletName;
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
