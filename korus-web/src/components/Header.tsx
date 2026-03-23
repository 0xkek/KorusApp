'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export default function Header({
  selectedCategory,
  onCategoryChange,
  onProfileClick,
  onSettingsClick
}: HeaderProps) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = ['GENERAL', 'GAMES', 'EVENTS'];

  const handleCategoryClick = (category: string) => {
    if (category === 'GENERAL') {
      router.push('/');
    } else if (category === 'GAMES') {
      router.push('/games');
    } else if (category === 'EVENTS') {
      router.push('/events');
    } else {
      const newCategory = category;
      onCategoryChange?.(newCategory);
    }
  };


  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-korus-primary/20 bg-gradient-to-r from-black/80 via-[#121212]/80 to-black/80 backdrop-blur-md shadow-[0_4px_20px_rgba(67,233,123,0.1)] w-full">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16 max-w-7xl mx-auto gap-6">
          {/* Left: Profile Icon + Logo */}
          <div className="flex items-center gap-4">
            {connected && (
              <button
                onClick={onProfileClick}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-black font-bold border-2 border-korus-primary/40 hover:scale-110 transition-transform flex-shrink-0"
                aria-label="View profile"
              >
                {publicKey?.toString().slice(0, 2).toUpperCase()}
              </button>
            )}

            <h1
              className="text-2xl font-bold bg-gradient-to-r from-korus-primary to-korus-secondary bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(67,233,123,0.5)] flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Korus
            </h1>
          </div>

          {/* Center: Category Tabs */}
          <div className="flex gap-3 flex-1 justify-center max-w-md">
            {categories.map((category) => {
              const isActive = category === 'GENERAL'
                ? !selectedCategory
                : selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-korus-primary to-korus-secondary border-transparent shadow-[0_0_15px_rgba(67,233,123,0.4)]'
                      : 'border-korus-primary/20 hover:border-korus-primary/40'
                  }`}
                  style={isActive ?
                    { color: '#000000' } :
                    {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)'
                    }
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Right: Connected Wallet Display + Settings + Wallet Button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Connected Wallet Address Display */}
            {connected && publicKey && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 border border-korus-primary/30">
                <span className="text-xs text-[#a1a1a1]">Connected:</span>
                <code className="text-xs font-mono text-korus-primary font-semibold">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </code>
              </div>
            )}

            {connected && onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-korus-primary/20 to-korus-secondary/20 flex items-center justify-center hover:scale-110 transition-transform border border-korus-primary/20"
                aria-label="Open settings"
              >
                <svg className="w-5 h-5 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {mounted && (
              <WalletMultiButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
