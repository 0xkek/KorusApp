'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import WalletButton from '@/components/WalletButton';

export default function WelcomePage() {
  const { connected, disconnect } = useWallet();
  const router = useRouter();
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  // Add hardcoded mint colors for wallet button on welcome page
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .wallet-adapter-button {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
      }
      .wallet-adapter-button-trigger {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
      }
      .wallet-adapter-button-start-icon + * {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      .wallet-adapter-modal-list .wallet-adapter-button .wallet-adapter-button-end-icon {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      .wallet-adapter-modal-list .wallet-adapter-button {
        background-image:
          linear-gradient(#0a0a0a, #0a0a0a),
          linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Add a small delay to prevent immediate redirect during development
    const timer = setTimeout(() => {
      if (connected) {
        router.push('/');
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [connected, router]);

  const handleDisconnect = () => {
    disconnect();
    setShowDeveloperTools(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-korus-dark-100 to-black relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0">
        {/* Primary orb - top right - hardcoded mint green */}
        <div className="absolute -top-40 -right-40 w-[1000px] h-[1000px] rounded-full blur-[140px] animate-float" style={{ backgroundColor: 'rgba(67, 233, 123, 0.15)' }} />

        {/* Secondary orb - bottom left - hardcoded mint secondary */}
        <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] rounded-full blur-[120px] animate-float-delayed" style={{ backgroundColor: 'rgba(56, 249, 215, 0.12)' }} />

        {/* Accent orb - center moving - hardcoded mint accent */}
        <div className="absolute top-1/3 left-1/3 w-[800px] h-[800px] rounded-full blur-[100px] animate-float-slow" style={{ backgroundColor: 'rgba(45, 212, 191, 0.10)' }} />

        {/* Additional accent orbs - hardcoded mint colors */}
        <div className="absolute top-1/2 right-1/3 w-[600px] h-[600px] rounded-full blur-[90px] animate-pulse-slow" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)' }} />

        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[80px] animate-float-delayed" style={{ backgroundColor: 'rgba(67, 233, 123, 0.06)' }} />
      </div>

      {/* Soft gradient overlay for depth - hardcoded mint colors */}
      <div className="fixed inset-0 bg-gradient-to-br animate-gradient" style={{
        backgroundImage: 'linear-gradient(to bottom right, rgba(67, 233, 123, 0.05), transparent, rgba(56, 249, 215, 0.05))'
      }} />

      {/* Animated spotlight effect - hardcoded mint primary */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[100px] animate-spotlight" style={{ backgroundColor: 'rgba(67, 233, 123, 0.30)' }} />
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
            <div className="absolute top-8 right-0 bg-black border border-gray-600 rounded p-3 text-xs text-white font-mono min-w-48">
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
                    background: 'linear-gradient(to bottom right, #43e97b, #38f9d7)',
                    boxShadow: '0 25px 50px -12px rgba(67, 233, 123, 0.30)',
                    color: '#000000',
                    fontFamily: 'var(--font-poppins), sans-serif'
                  }}>
                    K
                  </div>
                  <div className="absolute inset-0 w-32 h-32 rounded-3xl blur-xl opacity-50 animate-pulse-slow z-0" style={{
                    background: 'linear-gradient(to bottom right, #43e97b, #38f9d7)'
                  }}></div>
                </div>
              </div>
              <h1 className="text-8xl font-extrabold mb-6">
                <span style={{
                  background: 'linear-gradient(to right, #43e97b, #38f9d7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Korus
                </span>
              </h1>
              <p className="text-gray-300 text-2xl font-medium mb-4">
                Where community meets crypto
              </p>
              <p className="text-korus-textSecondary text-lg max-w-xl mx-auto">
                Join the revolution of radical authenticity. Create, connect, and earn with the power of Solana blockchain.
              </p>
            </div>

            {/* Connect Wallet Card */}
            <div className="bg-korus-dark-300/50 border border-korus-dark-400 rounded-3xl p-10 backdrop-blur-md mb-12 shadow-2xl shadow-black/50">
              <p className="text-white text-2xl mb-8 font-semibold">
                Connect your wallet to get started
              </p>
              <div className="mb-8">
                <WalletButton />
              </div>

              <div className="pt-8 border-t border-korus-dark-400">
                <p className="text-korus-textSecondary text-base mb-6">New to Solana?</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://phantom.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors text-base font-medium hover:underline"
                    style={{ color: '#43e97b' }}
                    onMouseOver={(e) => e.target.style.color = '#38f9d7'}
                    onMouseOut={(e) => e.target.style.color = '#43e97b'}
                  >
                    Download Phantom Wallet →
                  </a>
                  <a
                    href="https://solflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors text-base font-medium hover:underline"
                    style={{ color: '#43e97b' }}
                    onMouseOver={(e) => e.target.style.color = '#38f9d7'}
                    onMouseOut={(e) => e.target.style.color = '#43e97b'}
                  >
                    Download Solflare Wallet →
                  </a>
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-korus-dark-300/30 border border-korus-dark-400 rounded-2xl p-8 backdrop-blur-sm hover:bg-korus-dark-300/50 transition-all">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-white text-xl font-bold mb-2">Social Feed</h3>
                <p className="text-korus-textSecondary text-base">Share thoughts, engage with community, and build meaningful connections</p>
              </div>
              <div className="bg-korus-dark-300/30 border border-korus-dark-400 rounded-2xl p-8 backdrop-blur-sm hover:bg-korus-dark-300/50 transition-all">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-white text-xl font-bold mb-2">Play & Earn</h3>
                <p className="text-korus-textSecondary text-base">Challenge friends in games with SOL wagering and real rewards</p>
              </div>
              <div className="bg-korus-dark-300/30 border border-korus-dark-400 rounded-2xl p-8 backdrop-blur-sm hover:bg-korus-dark-300/50 transition-all">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-white text-xl font-bold mb-2">Tip & Reward</h3>
                <p className="text-korus-textSecondary text-base">Support creators directly with SOL tips and participate in weekly rewards</p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="text-center">
              <p className="text-korus-textSecondary text-sm mb-4">
                Already have an account? Your wallet is your login.
              </p>
              <Link
                href="/"
                className="transition-colors text-sm font-medium hover:underline"
                style={{ color: '#43e97b' }}
                onMouseOver={(e) => e.target.style.color = '#38f9d7'}
                onMouseOut={(e) => e.target.style.color = '#43e97b'}
              >
                Continue to app →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}