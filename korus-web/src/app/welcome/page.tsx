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
        {/* Primary orb - top right */}
        <div className="absolute -top-40 -right-40 w-[1000px] h-[1000px] bg-korus-primary/15 rounded-full blur-[140px] animate-float" />

        {/* Secondary orb - bottom left */}
        <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] bg-korus-secondary/12 rounded-full blur-[120px] animate-float-delayed" />

        {/* Accent orb - center moving */}
        <div className="absolute top-1/3 left-1/3 w-[800px] h-[800px] bg-korus-accent/10 rounded-full blur-[100px] animate-float-slow" />

        {/* Additional accent orbs */}
        <div className="absolute top-1/2 right-1/3 w-[600px] h-[600px] bg-korus-glow/8 rounded-full blur-[90px] animate-pulse-slow" />

        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-korus-primary/6 rounded-full blur-[80px] animate-float-delayed" />
      </div>

      {/* Soft gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-primary/5 via-transparent to-korus-secondary/5 animate-gradient" />

      {/* Animated spotlight effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-korus-primary/30 rounded-full blur-[100px] animate-spotlight" />
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
                  <div className="w-32 h-32 bg-gradient-to-br from-korus-primary to-korus-secondary rounded-3xl flex items-center justify-center text-6xl font-extrabold text-black shadow-2xl shadow-korus-primary/30">
                    K
                  </div>
                  <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-korus-primary to-korus-secondary rounded-3xl blur-xl opacity-50 animate-pulse-slow"></div>
                </div>
              </div>
              <h1 className="text-8xl font-extrabold mb-6">
                <span className="bg-gradient-to-r from-korus-primary to-korus-secondary bg-clip-text text-transparent">
                  Korus
                </span>
              </h1>
              <p className="text-gray-300 text-2xl font-medium mb-4">
                Where community meets crypto
              </p>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
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
                <p className="text-gray-500 text-base mb-6">New to Solana?</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://phantom.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-korus-primary hover:text-korus-secondary transition-colors text-base font-medium hover:underline"
                  >
                    Download Phantom Wallet →
                  </a>
                  <a
                    href="https://solflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-korus-primary hover:text-korus-secondary transition-colors text-base font-medium hover:underline"
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
                <p className="text-gray-400 text-base">Share thoughts, engage with community, and build meaningful connections</p>
              </div>
              <div className="bg-korus-dark-300/30 border border-korus-dark-400 rounded-2xl p-8 backdrop-blur-sm hover:bg-korus-dark-300/50 transition-all">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-white text-xl font-bold mb-2">Play & Earn</h3>
                <p className="text-gray-400 text-base">Challenge friends in games with SOL wagering and real rewards</p>
              </div>
              <div className="bg-korus-dark-300/30 border border-korus-dark-400 rounded-2xl p-8 backdrop-blur-sm hover:bg-korus-dark-300/50 transition-all">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-white text-xl font-bold mb-2">Tip & Reward</h3>
                <p className="text-gray-400 text-base">Support creators directly with SOL tips and participate in weekly rewards</p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">
                Already have an account? Your wallet is your login.
              </p>
              <Link
                href="/"
                className="text-korus-primary hover:text-korus-secondary transition-colors text-sm font-medium hover:underline"
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