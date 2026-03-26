'use client';

import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToastContext } from '@/components/ToastProvider';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

export default function WalletPage() {
  const { connected, publicKey } = useWallet();
  const { showError, showSuccess } = useToastContext();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !connected) {
      router.push('/welcome');
    }
  }, [mounted, connected, router]);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !mounted) return;

    setLoading(true);
    setHasError(false);
    try {
      // Use the server-side RPC proxy to avoid exposing the API key
      const rpcResponse = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey.toBase58()],
        }),
      });
      const rpcData = await rpcResponse.json();
      if (rpcData.error) throw new Error(rpcData.error.message || 'RPC error');
      const bal = rpcData.result?.value ?? 0;
      setBalance(bal / LAMPORTS_PER_SOL);
      if (hasError) {
        showSuccess('Balance refreshed successfully');
      }
    } catch {
      setHasError(true);
      showError('Unable to fetch wallet balance. Please check your connection and try again.');
      setBalance(null); // Don't show misleading 0.0
    } finally {
      setLoading(false);
    }
  }, [publicKey, mounted, hasError, showSuccess, showError]);

  useEffect(() => {
    if (mounted && connected && publicKey) {
      fetchBalance();
    }
  }, [mounted, connected, publicKey, fetchBalance]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-6">Wallet</h2>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[var(--color-border-light)]">
              <div className="text-[var(--color-text)] text-sm mb-2 font-medium">SOL Balance</div>
              <div className="text-4xl font-bold text-korus-primary animate-pulse mb-4">Loading...</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
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
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)] z-10 p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 bg-white/[0.08] border border-[var(--color-border-light)] rounded-full flex items-center justify-center text-[var(--color-text)] font-bold hover:bg-white/[0.12] transition-all duration-150"
                >
                  ←
                </button>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Wallet</h1>
              </div>
            </div>

            <div className="p-6 pb-24">

          {/* Balance Card */}
          <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[var(--color-border-light)] shadow-lg transition-shadow duration-150">
            <div className="text-[var(--color-text)] text-sm mb-2 font-medium">SOL Balance</div>
            <div className="text-4xl font-bold text-[var(--color-text)] mb-4">
              {loading ? (
                <span className="text-korus-primary animate-pulse">Loading...</span>
              ) : hasError ? (
                <div className="flex flex-col gap-2">
                  <span className="text-red-400">Unable to load balance</span>
                  <span className="text-[var(--color-text-secondary)] text-sm">
                    Check your connection or try again
                  </span>
                </div>
              ) : balance !== null ? (
                <span className="text-[var(--color-text)]">
                  {balance.toFixed(4)} SOL
                </span>
              ) : (
                <span className="text-[var(--color-text-secondary)]">--</span>
              )}
            </div>
            <div className="text-[var(--color-text)] text-xs font-mono bg-white/[0.12] rounded-lg p-2 mb-4">
              {publicKey?.toString().slice(0, 20)}...{publicKey?.toString().slice(-20)}
            </div>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-korus-primary to-korus-secondary font-semibold hover:shadow-[0_0_20px_var(--korus-primary)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#000000' }}
              aria-label={hasError ? 'Retry loading balance' : 'Refresh balance'}
            >
              {hasError ? 'Retry' : 'Refresh Balance'}
            </button>
          </div>

          {/* Activity Tabs */}
          <div className="flex gap-2 mb-6">
            {['All', 'Tips', 'Games', 'Events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-korus-primary to-korus-secondary'
                    : 'bg-white/[0.08] hover:bg-white/[0.12] border border-[var(--color-border-light)]'
                }`}
                style={activeTab === tab ? { color: '#000000' } : { color: 'var(--color-text)' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-[var(--color-border-light)]">
            {activeTab === 'All' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💳</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No transactions yet</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  All your SOL transactions will appear here.<br/>
                  Start by exploring posts, games, and events to build activity.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                  >
                    Explore Posts
                  </button>
                  <button
                    onClick={() => window.location.href = '/games'}
                    className="bg-white/[0.06] border border-[var(--color-border-light)] text-[var(--color-text)] font-semibold px-6 py-3 rounded-xl hover:bg-white/[0.12] transition-all duration-150"
                  >
                    Play Games
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Tips' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💰</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No tips yet</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  Tips you send and receive will appear here.<br/>
                  Start engaging with quality content to earn tips!
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                >
                  Find Great Content
                </button>
              </div>
            )}

            {activeTab === 'Games' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">🎮</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No game activity</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  Your game winnings, losses, and rewards will appear here.<br/>
                  Join games to start earning SOL!
                </p>
                <button
                  onClick={() => window.location.href = '/games'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                >
                  Browse Games
                </button>
              </div>
            )}

            {activeTab === 'Events' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">🎪</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No event activity</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  Event rewards, airdrops, and participation fees will appear here.<br/>
                  Join exclusive events to earn unique rewards!
                </p>
                <button
                  onClick={() => window.location.href = '/events'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
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
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => {
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
