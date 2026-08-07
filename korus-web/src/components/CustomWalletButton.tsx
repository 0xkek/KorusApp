'use client';

import dynamic from 'next/dynamic';

/**
 * The stock WalletMultiButton, loaded client-side only.
 *
 * This is the component Birdeye and most Solana apps ship. It owns the whole
 * flow — select, connect, switch wallet, disconnect — so none of it is
 * hand-rolled here. Previous custom versions had to reimplement that and got
 * the "switch while already connected" case wrong, which is what made clicking
 * one wallet open another.
 *
 * ssr: false is required: the server cannot see the browser's wallet, and
 * rendering wallet state server-side caused the React #418 hydration crash that
 * left every click dead.
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
