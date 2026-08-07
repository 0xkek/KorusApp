'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Korus-styled wallet button.
 *
 * Three explicit states, and nothing happens without a click:
 *   1. no wallet          -> "Connect Wallet", opens the official modal
 *   2. wallet, no session -> "Sign in", requests the signature
 *   3. signed in          -> address, with a menu
 *
 * Splitting 2 out is deliberate. A wallet extension that still has this site
 * approved reattaches on load, so treating "connected" as "signed in" both
 * showed a stale address and fired an unprompted signature request.
 */
export const CustomWalletButton = ({ className }: { className?: string }) => {
  const { connected, connecting, publicKey, wallet, connect, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { isAuthenticated, isAuthenticating, authenticate, logout } = useWalletAuth();
  const [showMenu, setShowMenu] = useState(false);

  // With autoConnect off, select() no longer connects, so the connect is driven
  // here — but ONLY after the user opened the picker in this session. The
  // adapter restores the last walletName from localStorage on load, so without
  // this guard the effect would fire on a plain refresh and reintroduce exactly
  // the silent auto-connect we are removing.
  const awaitingPickRef = useRef(false);
  useEffect(() => {
    if (!awaitingPickRef.current) return;
    if (!wallet) return;
    if (connected || connecting) return;
    awaitingPickRef.current = false;
    connect().catch((err) => console.error('[Korus wallet] connect failed:', err));
  }, [wallet, connected, connecting, connect]);

  // Opening the picker must start from a detached state, otherwise select() is
  // a no-op and clicking a wallet does nothing at all.
  const openPicker = async () => {
    awaitingPickRef.current = true;
    if (connected) {
      try {
        await disconnect();
      } catch {
        // Already detached.
      }
    }
    setVisible(true);
  };

  // Wallet state only exists on the client. Rendering it during SSR produces a
  // hydration mismatch (React #418), which aborts hydration and leaves the whole
  // page non-interactive — every click silently doing nothing.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const buttonStyle = {
    background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
    color: '#000000',
  };
  const buttonClass = `px-5 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 ${className || ''}`;

  if (!mounted) {
    return (
      <button className={buttonClass} style={buttonStyle} disabled>
        Connect Wallet
      </button>
    );
  }

  // 1. No wallet attached.
  if (!connected || !publicKey) {
    return (
      <button onClick={openPicker} className={buttonClass} style={buttonStyle}>
        Connect Wallet
      </button>
    );
  }

  // 2. Wallet attached but not signed in.
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => authenticate()}
          disabled={isAuthenticating}
          className={buttonClass}
          style={buttonStyle}
        >
          {isAuthenticating ? 'Check your wallet…' : 'Sign in'}
        </button>
        <button
          onClick={openPicker}
          className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-light)] hover:bg-white/[0.06] transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  // 3. Signed in.
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
              onClick={() => {
                setShowMenu(false);
                logout();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/[0.06] transition-colors"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
};
