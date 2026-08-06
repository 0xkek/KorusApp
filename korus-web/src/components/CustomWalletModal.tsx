'use client';
import Image from 'next/image';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

export const CustomWalletModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { wallets, select, connect, disconnect, wallet, connected, connecting } = useWallet();
  const modalRef = useRef<HTMLDivElement>(null);
  // Set when the user picks a wallet, so the effect below knows to connect once
  // the adapter has actually switched to it.
  const pendingConnectRef = useRef<WalletName | null>(null);
  // Mirrors the pending ref in state so the row can render a "Connecting…" label.
  const [selectedName, setSelectedName] = useState<WalletName | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const justConnectedRef = useRef(false);
  // Keeps runConnect free of an onClose dependency, so it isn't recreated (and
  // the connect effect isn't re-triggered) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
  const runConnect = useCallback(
    async (pending: WalletName) => {
      logger.log('[Wallet] connecting to', pending);
      setConnectError(null);

      // connect() has no timeout of its own: a locked extension can swallow the
      // request without prompting or rejecting, leaving the UI stuck forever.
      const timeout = setTimeout(() => {
        setSelectedName((current) => (current === pending ? null : current));
        setConnectError(`Is ${pending} unlocked? Open the extension, then try again.`);
      }, 5000);

      try {
        await connect();
        // Close on THIS attempt succeeding. Previously an effect closed the
        // modal whenever `connected` was true, but a wallet extension keeps
        // reporting connected from its earlier session — so after dismissing a
        // wallet popup, reopening the modal closed it again instantly.
        justConnectedRef.current = true;
        onCloseRef.current();
      } catch (err) {
        // A silent catch made a failed connect indistinguishable from nothing
        // happening at all.
        logger.error('[Wallet] connect failed:', err);
        setSelectedName(null);
        const name = (err as { name?: string })?.name;
        if (name !== 'WalletNotSelectedError') {
          setConnectError(`Couldn't open ${pending}. Is the extension unlocked?`);
        }
      } finally {
        clearTimeout(timeout);
      }
    },
    [connect]
  );

  // Fires once select() has propagated and `wallet` reflects the user's choice.
  useEffect(() => {
    const pending = pendingConnectRef.current;
    if (!pending) return;
    if (wallet?.adapter.name !== pending) return;
    // Don't fire a second connect() while one is already in flight.
    if (connecting) return;

    pendingConnectRef.current = null;
    void runConnect(pending);
  }, [wallet, connecting, runConnect]);

  // Reset transient state each time the modal opens, so a previous failure
  // doesn't greet the user on their next attempt.
  useEffect(() => {
    if (open) {
      setConnectError(null);
      setSelectedName(null);
      pendingConnectRef.current = null;
      justConnectedRef.current = false;
    }
  }, [open]);

  if (!open) return null;

  const allowedWalletNames = ['Phantom', 'Solflare', 'Backpack', 'Jupiter'];
  // Deduplicate by adapter name, keeping the FIRST Installed entry.
  //
  // The previous version overwrote on every Installed match, so with a wallet
  // registered more than once it kept the last one seen — which is arbitrary
  // and could retain a stale adapter whose connect() never resolves while the
  // working registration was discarded. Wallets registered once (Solflare)
  // were unaffected, which is why only some wallets failed to open.
  const solanaWallets = Array.from(
    wallets
      .filter(wallet => allowedWalletNames.includes(wallet.adapter.name))
      .reduce((acc, wallet) => {
        const existing = acc.get(wallet.adapter.name);
        if (!existing) {
          acc.set(wallet.adapter.name, wallet);
          return acc;
        }
        // Upgrade a non-Installed placeholder to an Installed registration,
        // but never replace one Installed entry with another.
        if (
          existing.readyState !== WalletReadyState.Installed &&
          wallet.readyState === WalletReadyState.Installed
        ) {
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
  const handleWalletClick = async (walletName: WalletName) => {
    setSelectedName(walletName);
    setConnectError(null);

    // Always start from a disconnected state so the wallet prompts every time.
    // Without this, clicking while already connected did nothing visible.
    if (connected) {
      try {
        await disconnect();
      } catch {
        // Already gone — carry on and connect.
      }
    }

    if (wallet?.adapter.name === walletName) {
      // Same wallet already selected: select() is a no-op, so `wallet` never
      // changes and the effect would not re-run. Connect directly, and leave
      // pendingConnectRef unset so the effect doesn't fire a second connect().
      pendingConnectRef.current = null;
      void runConnect(walletName);
    } else {
      pendingConnectRef.current = walletName;
      select(walletName);
    }
    // Deliberately NOT closing here. The connect effect needs this component
    // mounted to observe `wallet` switching to the selection; closing on click
    // unmounted it first and the connect never fired. runConnect closes the
    // modal itself once the connection actually succeeds.
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

        {connectError && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-[13px] text-red-300">{connectError}</p>
          </div>
        )}

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
              {/* Extensions can take a few seconds to raise their prompt —
                  without this the modal just looks frozen after a click. */}
              <span className="text-xs text-emerald-400 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                {connecting && wallet.adapter.name === selectedName ? 'Connecting…' : 'Detected'}
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
