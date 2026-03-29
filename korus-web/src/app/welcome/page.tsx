'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomWalletButton } from '@/components/CustomWalletButton';
import { useWalletAuth } from '@/contexts/WalletAuthContext';

export default function WelcomePage() {
  const { connected, disconnect } = useWallet();
  const router = useRouter();
  const { isAuthenticated } = useWalletAuth();
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  // Add hardcoded mint colors for wallet button on welcome page
  useEffect(() => {
    // SSR-safe: only runs on client
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.innerHTML = `
      .wallet-adapter-button {
        background: linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%) !important;
      }
      .wallet-adapter-button-trigger {
        background: linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%) !important;
      }
      .wallet-adapter-button-start-icon + * {
        background: linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      .wallet-adapter-modal-list .wallet-adapter-button .wallet-adapter-button-end-icon {
        background: linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      .wallet-adapter-modal-list .wallet-adapter-button {
        background-image:
          linear-gradient(var(--color-background), var(--color-background)),
          linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Redirect to home only after successful authentication
  useEffect(() => {
    if (connected && isAuthenticated) {
      router.push('/');
    }
  }, [connected, isAuthenticated, router]);

  const handleDisconnect = () => {
    disconnect();
    setShowDeveloperTools(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)] relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0">
        {/* Primary orb - top right - hardcoded mint green */}
        <div className="absolute -top-40 -right-40 w-[1000px] h-[1000px] rounded-full blur-[140px] animate-float" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 15%, transparent)' }} />

        {/* Secondary orb - bottom left - hardcoded mint secondary */}
        <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] rounded-full blur-[120px] animate-float-delayed" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-secondary) 12%, transparent)' }} />

        {/* Accent orb - center moving - hardcoded mint accent */}
        <div className="absolute top-1/3 left-1/3 w-[800px] h-[800px] rounded-full blur-[100px] animate-float-slow" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-secondary) 10%, transparent)' }} />

        {/* Additional accent orbs - hardcoded mint colors */}
        <div className="absolute top-1/2 right-1/3 w-[600px] h-[600px] rounded-full blur-[90px] animate-pulse-slow" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 8%, transparent)' }} />

        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[80px] animate-float-delayed" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 6%, transparent)' }} />
      </div>

      {/* Soft gradient overlay for depth - hardcoded mint colors */}
      <div className="fixed inset-0 bg-gradient-to-br animate-gradient" style={{
        backgroundImage: 'linear-gradient(to bottom right, color-mix(in srgb, var(--korus-primary) 5%, transparent), transparent, color-mix(in srgb, var(--korus-secondary) 5%, transparent))'
      }} />

      {/* Animated spotlight effect - hardcoded mint primary */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[100px] animate-spotlight" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }} />
      </div>

      {/* Developer Tools (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowDeveloperTools(!showDeveloperTools)}
            className="bg-red-600 text-white px-3 py-1 rounded text-xs font-mono"
          >
            DEV
          </button>
          {showDeveloperTools && (
            <div className="absolute top-8 right-0 bg-[var(--color-background)] border border-[var(--color-border-light)] rounded p-3 text-xs text-[var(--color-text)] font-mono min-w-48">
              <div className="mb-2">Status: {connected ? 'Connected' : 'Disconnected'}</div>
              {connected && (
                <button
                  onClick={handleDisconnect}
                  className="bg-red-600 text-white px-2 py-1 rounded text-xs w-full"
                >
                  Disconnect Wallet
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="max-w-[1200px] w-full">
            {/* Three-column layout: features | center | disclaimer */}
            <div className="flex items-center justify-center gap-8">

              {/* Left side — Features (hidden on mobile) */}
              <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-5 backdrop-blur-sm">
                  <div className="text-3xl mb-2">💬</div>
                  <h3 className="text-[var(--color-text)] text-base font-bold mb-1">Social Feed</h3>
                  <p className="text-[var(--color-text-secondary)] text-xs">Share thoughts, engage with community, and build meaningful connections</p>
                </div>
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-5 backdrop-blur-sm">
                  <div className="text-3xl mb-2">🎮</div>
                  <h3 className="text-[var(--color-text)] text-base font-bold mb-1">Play & Earn</h3>
                  <p className="text-[var(--color-text-secondary)] text-xs">Challenge friends in games with SOL wagering and real rewards</p>
                </div>
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-5 backdrop-blur-sm">
                  <div className="text-3xl mb-2">💰</div>
                  <h3 className="text-[var(--color-text)] text-base font-bold mb-1">Tip & Reward</h3>
                  <p className="text-[var(--color-text-secondary)] text-xs">Support creators directly with SOL tips and participate in weekly rewards</p>
                </div>
              </div>

              {/* Center — Logo + Connect */}
              <div className="max-w-md w-full text-center">
                {/* Logo/Title */}
                <div className="mb-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-6xl font-extrabold shadow-2xl relative z-10 font-sans" style={{
                        background: 'linear-gradient(to bottom right, var(--korus-primary), var(--korus-secondary))',
                        boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--korus-primary) 30%, transparent)',
                        color: '#000000',
                        fontFamily: 'var(--font-poppins), sans-serif'
                      }}>
                        K
                      </div>
                      <div className="absolute inset-0 w-24 h-24 rounded-3xl blur-xl opacity-50 animate-pulse-slow z-0" style={{
                        background: 'linear-gradient(to bottom right, var(--korus-primary), var(--korus-secondary))'
                      }}></div>
                    </div>
                  </div>
                  <h1 className="text-6xl font-extrabold mb-4">
                    <span style={{
                      background: 'linear-gradient(to right, var(--korus-primary), var(--korus-secondary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      Korus
                    </span>
                  </h1>
                  <p className="text-[var(--color-text-secondary)] text-xl font-medium mb-2">
                    Where community meets crypto
                  </p>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Create, connect, and earn with the power of Solana.
                  </p>
                </div>

                {/* Connect Wallet Card */}
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border-light)] rounded-3xl p-8 backdrop-blur-md mb-6 shadow-2xl shadow-black/50">
                  <p className="text-[var(--color-text)] text-xl mb-6 font-semibold">
                    Connect your wallet to get started
                  </p>
                  <div className="mb-6">
                    <CustomWalletButton />
                  </div>

                  <div className="pt-6 border-t border-[var(--color-border-light)]">
                    <p className="text-[var(--color-text-secondary)] text-sm mb-4">New to Solana?</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href="https://phantom.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors text-sm font-medium hover:underline"
                        style={{ color: 'var(--korus-primary)' }}
                        onMouseOver={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-secondary)'}
                        onMouseOut={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-primary)'}
                      >
                        Phantom Wallet →
                      </a>
                      <a
                        href="https://solflare.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors text-sm font-medium hover:underline"
                        style={{ color: 'var(--korus-primary)' }}
                        onMouseOver={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-secondary)'}
                        onMouseOut={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-primary)'}
                      >
                        Solflare Wallet →
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <p className="text-[var(--color-text-tertiary)] text-xs">
                  Your wallet is your login. No email or password needed.
                </p>
              </div>

              {/* Right side — Disclaimer + Links (hidden on mobile) */}
              <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
                {/* Disclaimer */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-left">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 text-base mt-0.5">&#9888;</span>
                    <div>
                      <h4 className="text-yellow-400 font-bold text-xs mb-1.5">Beta Disclaimer</h4>
                      <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                        Korus is in active development. Features may change or break without notice.
                        All transactions use <strong className="text-[var(--color-text)]">real SOL on mainnet</strong>.
                        You may lose funds due to bugs or smart contract issues.
                        Only use amounts you can afford to lose. Not financial advice.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-5 backdrop-blur-sm">
                  <h4 className="text-[var(--color-text)] text-xs font-bold mb-3">How it works</h4>
                  <div className="flex flex-col gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
                    <div className="flex items-start gap-2">
                      <span className="text-korus-primary font-bold">1.</span>
                      <span>Connect your Solana wallet</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-korus-primary font-bold">2.</span>
                      <span>Create your profile and start posting</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-korus-primary font-bold">3.</span>
                      <span>Tip creators, play games, and earn reputation</span>
                    </div>
                  </div>
                </div>

                {/* Powered by */}
                <div className="text-center text-[var(--color-text-tertiary)] text-[10px]">
                  Built on Solana
                </div>
              </div>

            </div>

            {/* Mobile-only features + disclaimer (below center content) */}
            <div className="lg:hidden mt-8 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-xl p-4 backdrop-blur-sm text-center">
                  <div className="text-2xl mb-1">💬</div>
                  <h3 className="text-[var(--color-text)] text-xs font-bold">Social</h3>
                </div>
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-xl p-4 backdrop-blur-sm text-center">
                  <div className="text-2xl mb-1">🎮</div>
                  <h3 className="text-[var(--color-text)] text-xs font-bold">Games</h3>
                </div>
                <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-xl p-4 backdrop-blur-sm text-center">
                  <div className="text-2xl mb-1">💰</div>
                  <h3 className="text-[var(--color-text)] text-xs font-bold">Tips</h3>
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left">
                <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                  <span className="text-yellow-400 font-bold">Beta:</span> Korus is in development. All SOL transactions are real. Use at your own risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}