'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the wallet button styling during SSR
    return (
      <button
        className="wallet-adapter-button wallet-adapter-button-trigger"
        disabled
      >
        Loading...
      </button>
    );
  }

  return <WalletMultiButton />;
}