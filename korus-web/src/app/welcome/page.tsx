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
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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

  // Show disclaimer on first connect, then redirect
  useEffect(() => {
    if (connected && isAuthenticated) {
      const accepted = localStorage.getItem('korus_disclaimer_accepted');
      if (accepted) {
        router.push('/');
      } else {
        setShowDisclaimer(true);
      }
    }
  }, [connected, isAuthenticated, router]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('korus_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
    router.push('/');
  };

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
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            {/* Logo/Title */}
            <div className="mb-12">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-8xl font-extrabold shadow-2xl relative z-10 font-sans" style={{
                    background: 'linear-gradient(to bottom right, var(--korus-primary), var(--korus-secondary))',
                    boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--korus-primary) 30%, transparent)',
                    color: '#000000',
                    fontFamily: 'var(--font-poppins), sans-serif'
                  }}>
                    K
                  </div>
                  <div className="absolute inset-0 w-32 h-32 rounded-3xl blur-xl opacity-50 animate-pulse-slow z-0" style={{
                    background: 'linear-gradient(to bottom right, var(--korus-primary), var(--korus-secondary))'
                  }}></div>
                </div>
              </div>
              <h1 className="text-8xl font-extrabold mb-6">
                <span style={{
                  background: 'linear-gradient(to right, var(--korus-primary), var(--korus-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Korus
                </span>
              </h1>
              <p className="text-[var(--color-text-secondary)] text-2xl font-medium mb-4">
                Where community meets crypto
              </p>
              <p className="text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto">
                Join the revolution of radical authenticity. Create, connect, and earn with the power of Solana blockchain.
              </p>
            </div>

            {/* Connect Wallet Card */}
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border-light)] rounded-3xl p-10 backdrop-blur-md mb-12 shadow-2xl shadow-black/50">
              <p className="text-[var(--color-text)] text-2xl mb-8 font-semibold">
                Connect your wallet to get started
              </p>
              <div className="mb-8">
                <CustomWalletButton />
              </div>

              <div className="pt-8 border-t border-[var(--color-border-light)]">
                <p className="text-[var(--color-text-secondary)] text-base mb-6">New to Solana?</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://phantom.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors text-base font-medium hover:underline"
                    style={{ color: 'var(--korus-primary)' }}
                    onMouseOver={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-secondary)'}
                    onMouseOut={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-primary)'}
                  >
                    Download Phantom Wallet →
                  </a>
                  <a
                    href="https://solflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors text-base font-medium hover:underline"
                    style={{ color: 'var(--korus-primary)' }}
                    onMouseOver={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-secondary)'}
                    onMouseOut={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-primary)'}
                  >
                    Download Solflare Wallet →
                  </a>
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-8 backdrop-blur-sm hover:bg-[var(--color-surface)]/50 transition-all">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-[var(--color-text)] text-xl font-bold mb-2">Social Feed</h3>
                <p className="text-[var(--color-text-secondary)] text-base">Share thoughts, engage with community, and build meaningful connections</p>
              </div>
              <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-8 backdrop-blur-sm hover:bg-[var(--color-surface)]/50 transition-all">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-[var(--color-text)] text-xl font-bold mb-2">Play & Earn</h3>
                <p className="text-[var(--color-text-secondary)] text-base">Challenge friends in games with SOL wagering and real rewards</p>
              </div>
              <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border-light)] rounded-2xl p-8 backdrop-blur-sm hover:bg-[var(--color-surface)]/50 transition-all">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-[var(--color-text)] text-xl font-bold mb-2">Tip & Reward</h3>
                <p className="text-[var(--color-text-secondary)] text-base">Support creators directly with SOL tips and participate in weekly rewards</p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="text-center">
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Already have an account? Your wallet is your login.
              </p>
              <Link
                href="/"
                className="transition-colors text-sm font-medium hover:underline"
                style={{ color: 'var(--korus-primary)' }}
                onMouseOver={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-secondary)'}
                onMouseOut={(e) => (e.target as HTMLAnchorElement).style.color = 'var(--korus-primary)'}
              >
                Continue to app →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">&#9888;&#65039;</div>
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">Before you continue</h2>
              <p className="text-[var(--color-text-tertiary)] text-sm">Please read and accept</p>
            </div>

            <div className="space-y-4 mb-8 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <p>Korus is currently in <strong className="text-[var(--color-text)]">active development (beta)</strong>. Features may change, break, or be unavailable without notice.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <p>All SOL transactions (tips, wagers, shoutouts) use <strong className="text-[var(--color-text)]">real SOL on Solana mainnet</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <p>You may <strong className="text-[var(--color-text)]">lose funds</strong> due to bugs, smart contract vulnerabilities, or other issues.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <p>Only use amounts you are willing to lose. This is <strong className="text-[var(--color-text)]">not financial advice</strong>.</p>
              </div>
            </div>

            <button
              onClick={handleAcceptDisclaimer}
              className="w-full py-3 rounded-xl text-base font-bold transition-all duration-150 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))',
                color: '#000',
              }}
            >
              I understand, let me in
            </button>
          </div>
        </div>
      )}
    </main>
  );
}