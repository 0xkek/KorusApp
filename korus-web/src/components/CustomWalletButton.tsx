'use client';

import dynamic from 'next/dynamic';

/**
 * Wallet connect button.
 *
 * The picker is the stock WalletMultiButton, loaded client-side only (the
 * server cannot see the browser's wallet; rendering that state server-side
 * caused a React #418 hydration crash that left the page non-interactive).
 *
 * The provider owns the complete selection -> connect sequence. Keeping this
 * component presentation-only is essential: a document-level click listener
 * previously treated the opening click as a wallet choice, then connected a
 * stale adapter (for example opening Backpack after choosing Phantom).
 */
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export const CustomWalletButton = ({ className }: { className?: string }) => {
  return (
    <div className={className}>
      <WalletMultiButton />
    </div>
  );
};

export default CustomWalletButton;
