'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Wallet connect button.
 *
 * The picker is the stock WalletMultiButton, loaded client-side only (the
 * server cannot see the browser's wallet; rendering that state server-side
 * caused a React #418 hydration crash that left the page non-interactive).
 *
 * autoConnect is off in the provider, so selecting a wallet does not connect
 * it. This component performs the connect, and only for a wallet the user
 * picked in this session — see the ref below.
 */
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export const CustomWalletButton = ({ className }: { className?: string }) => {
  const { wallet, connected, connecting, connect } = useWallet();

  // Only true once the user has interacted with the picker in this session. The
  // adapter can surface a wallet on load without any click; connecting off the
  // back of that is what made a refresh land on a previous session.
  const userPicked = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Any pointer interaction with the button/modal counts as intent to connect.
  useEffect(() => {
    if (!ready) return;
    const mark = () => {
      userPicked.current = true;
    };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, [ready]);

  useEffect(() => {
    if (!userPicked.current) return;
    if (!wallet || connected || connecting) return;
    connect().catch((err) => console.error('[Korus wallet] connect failed:', err));
  }, [wallet, connected, connecting, connect]);

  return (
    <div className={className}>
      <WalletMultiButton />
    </div>
  );
};

export default CustomWalletButton;
