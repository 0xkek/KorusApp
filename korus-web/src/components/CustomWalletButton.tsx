'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/contexts/WalletAuthContext';

/**
 * Wallet connect button.
 *
 * A wallet extension that still trusts this site reconnects itself on page
 * load, before any app code runs — nothing is persisted here, but the adapter
 * still reports a connected wallet. The stock WalletMultiButton renders that
 * as an address, so a visitor who had done nothing saw someone's wallet
 * displayed as if they were signed in.
 *
 * So the address is shown only once the user is actually authenticated. Until
 * then this renders a plain "Select Wallet" that opens the stock modal — the
 * modal itself is still the library's, so selection and connection are
 * untouched.
 *
 * Loaded client-side only: rendering wallet state during SSR caused a React
 * #418 hydration crash that left the page non-interactive.
 */
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export const CustomWalletButton = ({ className }: { className?: string }) => {
  const { connected, disconnect } = useWallet();
  const { isAuthenticated } = useWalletAuth();
  const { setVisible } = useWalletModal();

  // Wallet state only exists on the client; branching on it before mount is
  // the hydration hazard above.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Signed in: the stock button, which owns the address display, the dropdown,
  // copy address, change wallet and disconnect.
  if (mounted && isAuthenticated) {
    return (
      <div className={className}>
        <WalletMultiButton />
      </div>
    );
  }

  const openPicker = async () => {
    // An extension may have reattached itself without the user asking. Detach
    // first so choosing a wallet in the modal actually takes effect — select()
    // is a no-op while an adapter is already connected.
    if (connected) {
      try {
        await disconnect();
      } catch {
        // Already detached.
      }
    }
    setVisible(true);
  };

  return (
    <div className={className}>
      <button
        onClick={openPicker}
        className="wallet-adapter-button wallet-adapter-button-trigger"
        type="button"
      >
        Select Wallet
      </button>
    </div>
  );
};

export default CustomWalletButton;
