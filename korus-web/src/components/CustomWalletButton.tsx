'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { USER_INITIATED_CONNECT } from '@/hooks/useWalletAuth';
import { useState } from 'react';
import Image from 'next/image';

/**
 * Korus-styled trigger for the official wallet modal.
 *
 * The modal itself comes from @solana/wallet-adapter-react-ui rather than being
 * hand-rolled. The custom one had to reimplement selection, connect and — the
 * case that kept breaking — switching wallets while another is already
 * connected. Clicking a different wallet there never actually switched, so the
 * signature request went to whichever wallet was already attached.
 */
export const CustomWalletButton = ({ className }: { className?: string }) => {
  const { connected, disconnect, publicKey, wallet } = useWallet();
  const { isAuthenticated } = useWalletAuth();
  const { setVisible } = useWalletModal();
  const [showMenu, setShowMenu] = useState(false);

  const openModal = async () => {
    // The modal's own selection triggers the connect; this flag tells
    // useWalletAuth that any resulting signature request was user-initiated.
    sessionStorage.setItem(USER_INITIATED_CONNECT, '1');

    // If an extension has silently reattached (connected but not signed in),
    // selecting a wallet in the modal is a no-op — the adapter is already on a
    // wallet — so the click produced no popup and no error. Detach first so the
    // selection actually takes effect.
    //
    // Awaiting here is safe: the extension popup is opened by the modal's own
    // click, not by this one, so no user gesture is being consumed.
    if (connected) {
      try {
        await disconnect();
      } catch {
        // Already detached — continue.
      }
    }

    setVisible(true);
  };

  const handleDisconnect = async () => {
    setShowMenu(false);
    await disconnect();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletName');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem(USER_INITIATED_CONNECT);
    }
  };

  // Show the address only once signed in to Korus. `connected` alone reflects
  // the extension's own session, which reattaches on load.
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
                onClick={() => {
                  setShowMenu(false);
                  openModal();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-white/[0.06] transition-colors"
              >
                Change Wallet
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
    <button
      onClick={openModal}
      className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 ${className || ''}`}
      style={{
        background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
        color: '#000000',
      }}
    >
      Connect Wallet
    </button>
  );
};
