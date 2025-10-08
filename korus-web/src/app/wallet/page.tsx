'use client';

import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToastContext } from '@/components/ToastProvider';

export default function WalletPage() {
  const { connected, publicKey } = useWallet();
  const { showError, showSuccess } = useToastContext();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !connected) {
      router.push('/welcome');
    }
  }, [mounted, connected, router]);

  useEffect(() => {
    if (mounted && connected && publicKey) {
      fetchBalance();
    }
  }, [mounted, connected, publicKey]);

  const fetchBalance = async () => {
    if (!publicKey || !mounted) return;

    setLoading(true);
    setHasError(false);
    try {
      // Use RPC endpoint from environment variables
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl);
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
      if (hasError) {
        showSuccess('Balance refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setHasError(true);
      showError('Unable to fetch wallet balance. Please check your connection and try again.');
      setBalance(null); // Don't show misleading 0.0
    } finally {
      setLoading(false);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
            <h2 className="text-3xl font-bold text-korus-text mb-6">Wallet</h2>
            <div className="bg-korus-surface/40 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-korus-borderLight">
              <div className="text-korus-text text-sm mb-2 font-medium">SOL Balance</div>
              <div className="text-4xl font-bold text-korus-primary animate-pulse mb-4">Loading...</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>
      {/* Static gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        {/* Secondary gradient orb */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
        {/* Accent orb for depth */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen">
          <LeftSidebar onNotificationsToggle={() => setShowNotifications(!showNotifications)} />

          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Feed Navigation */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex">
                {/* Mobile menu button */}
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Logo on mobile */}
                <div className="md:hidden flex items-center px-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">K</span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center w-full">
                  <button
                    onClick={() => router.push('/')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Home</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
          <h2 className="text-3xl font-bold text-korus-text mb-6">Wallet</h2>

          {/* Balance Card */}
          <div className="bg-korus-surface/40 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-korus-borderLight shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-korus-text text-sm mb-2 font-medium">SOL Balance</div>
            <div className="text-4xl font-bold text-korus-text mb-4">
              {loading ? (
                <span className="text-korus-primary animate-pulse">Loading...</span>
              ) : hasError ? (
                <span className="text-red-400">Unable to load</span>
              ) : balance !== null ? (
                <span className="text-korus-text">
                  {balance.toFixed(4)} SOL
                </span>
              ) : (
                <span className="text-korus-textSecondary">--</span>
              )}
            </div>
            <div className="text-korus-text text-xs font-mono bg-korus-surface/60 rounded-lg p-2 mb-4">
              {publicKey?.toString().slice(0, 20)}...{publicKey?.toString().slice(-20)}
            </div>
            <button
              onClick={fetchBalance}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-korus-primary to-korus-secondary font-semibold hover:shadow-[0_0_20px_var(--korus-primary)] transition-all duration-300 transform hover:scale-105"
              style={{ color: '#000000' }}
            >
              Refresh Balance
            </button>
          </div>

          {/* Activity Tabs */}
          <div className="flex gap-2 mb-6">
            {['All', 'Tips', 'Games', 'Events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-korus-primary to-korus-secondary'
                    : 'bg-korus-surface/20 hover:bg-korus-surface/40 border border-korus-borderLight'
                }`}
                style={activeTab === tab ? { color: '#000000' } : { color: 'var(--color-text)' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-korus-surface/20 backdrop-blur-sm rounded-2xl border border-korus-borderLight">
            {activeTab === 'All' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💳</div>
                <p className="text-korus-text text-lg font-medium">No transactions yet</p>
                <p className="text-korus-textSecondary text-sm mt-2 mb-6">
                  All your SOL transactions will appear here.<br/>
                  Start by exploring posts, games, and events to build activity.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                  >
                    Explore Posts
                  </button>
                  <button
                    onClick={() => window.location.href = '/games'}
                    className="bg-korus-surface/40 border border-korus-borderLight text-korus-text font-semibold px-6 py-3 rounded-xl hover:bg-korus-surface/60 transition-all duration-200"
                  >
                    Play Games
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Tips' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💰</div>
                <p className="text-korus-text text-lg font-medium">No tips yet</p>
                <p className="text-korus-textSecondary text-sm mt-2 mb-6">
                  Tips you send and receive will appear here.<br/>
                  Start engaging with quality content to earn tips!
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                >
                  Find Great Content
                </button>
              </div>
            )}

            {activeTab === 'Games' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">🎮</div>
                <p className="text-korus-text text-lg font-medium">No game activity</p>
                <p className="text-korus-textSecondary text-sm mt-2 mb-6">
                  Your game winnings, losses, and rewards will appear here.<br/>
                  Join games to start earning SOL!
                </p>
                <button
                  onClick={() => window.location.href = '/games'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                >
                  Browse Games
                </button>
              </div>
            )}

            {activeTab === 'Events' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">🎪</div>
                <p className="text-korus-text text-lg font-medium">No event activity</p>
                <p className="text-korus-textSecondary text-sm mt-2 mb-6">
                  Event rewards, airdrops, and participation fees will appear here.<br/>
                  Join exclusive events to earn unique rewards!
                </p>
                <button
                  onClick={() => window.location.href = '/events'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                >
                  View Events
                </button>
              </div>
            )}
          </div>
            </div>
          </div>

          <RightSidebar
            showNotifications={showNotifications}
            onToggleNotifications={() => setShowNotifications(!showNotifications)}
          />
        </div>
      </div>
    </main>
  );
}
